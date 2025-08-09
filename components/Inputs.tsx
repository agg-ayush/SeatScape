"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import airportsData from "@/lib/airports.json";
import type { Airport, Preference } from "@/lib/types";
import IataCombo from "@/components/IataCombo";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { convertLocalISO } from "@/lib/time";
import TimezoneSelect, { type ZoneOption } from "@/components/TimezoneSelect";
import TimeField from "@/components/ui/TimeField";

export type InputsSnapshot = {
  origin: Airport;
  dest: Airport;
  departLocalISO: string; // origin-local "YYYY-MM-DDTHH:mm"
  preference: Preference; // fixed to "see"
  from: string;
  to: string;
};

type Defaults = { from?: string; to?: string; depart?: string };
type Props = {
  onSubmit: (data: InputsSnapshot) => void;
  onClear?: () => void;
  defaults?: Defaults;
  loading?: boolean;
};
type TZMode = "source" | "dest" | "custom"; // removed UTC option
type Recent = { from: string; to: string; depart: string };

function friendlyName(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      timeZoneName: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date());
    const piece = parts.find((p) => p.type === "timeZoneName")?.value;
    if (piece) return piece;
  } catch {}
  if (tz === "UTC") return "Coordinated Universal Time";
  return tz;
}

export default function Inputs({
  onSubmit,
  onClear,
  defaults,
  loading = false,
}: Props) {
  const [from, setFrom] = useState(defaults?.from ?? "");
  const [to, setTo] = useState(defaults?.to ?? "");

  const [dateStr, setDateStr] = useState<string>("");
  const [timeStr, setTimeStr] = useState<string>("");
  useEffect(() => {
    if (defaults?.depart) {
      const [d, t] = defaults.depart.split("T");
      if (d) setDateStr(d);
      if (t) setTimeStr(t.slice(0, 5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tzMode, setTzMode] = useState<TZMode>("source");
  const [customTz, setCustomTz] = useState<string>(""); // empty allowed
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const fromRef = useRef<HTMLInputElement | null>(null);

  const airports = airportsData as unknown as Array<Airport>;
  const lookup = (code: string): Airport | undefined =>
    airports.find((a) => a.iata.toUpperCase() === code.toUpperCase());

  const tzOptions: ZoneOption[] = useMemo(() => {
    const ids = new Set<string>(["UTC"]);
    try {
      (airportsData as any[]).forEach((a) => a?.tz && ids.add(String(a.tz)));
    } catch {}
    const arr = Array.from(ids);
    const asOptions = arr.map<ZoneOption>((tz) => ({
      tz,
      label: friendlyName(tz),
      abbr: [],
    }));
    const byLabel = new Map<string, ZoneOption>();
    for (const o of asOptions)
      if (!byLabel.has(o.label)) byLabel.set(o.label, o);
    const list = Array.from(byLabel.values());
    list.sort((a, b) => {
      if (a.tz === "UTC") return -1;
      if (b.tz === "UTC") return 1;
      return a.label.localeCompare(b.label);
    });
    return list;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/") {
        e.preventDefault();
        fromRef.current?.focus();
      }
      if (e.key === "Enter")
        (
          document.getElementById("seatscape-form") as HTMLFormElement | null
        )?.requestSubmit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Dev: clear recents on first boot
  useEffect(() => {
    try {
      if (process.env.NODE_ENV === "development") {
        const boot = localStorage.getItem("ss_dev_boot");
        if (!boot) {
          localStorage.removeItem("ss_recent");
          localStorage.setItem("ss_dev_boot", "1");
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ss_recent");
      if (raw) setRecent(JSON.parse(raw).slice(0, 3));
    } catch {}
  }, []);
  function pushRecent(item: Recent) {
    try {
      const next = [
        item,
        ...recent.filter((r) => r.from !== item.from || r.to !== item.to),
      ].slice(0, 3);
      setRecent(next);
      localStorage.setItem("ss_recent", JSON.stringify(next));
    } catch {}
  }

  const originAirport = lookup(from);
  const destAirport = lookup(to);

  const currentTz =
    tzMode === "source"
      ? originAirport?.tz || ""
      : tzMode === "dest"
      ? destAirport?.tz || ""
      : customTz;

  const tzLabel = currentTz ? friendlyName(currentTz) : "Custom time zone";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const o = originAirport,
      d = destAirport;
    if (!o) return setError("Enter a valid From IATA (e.g., DEL, JFK).");
    if (!d) return setError("Enter a valid To IATA (e.g., DXB, LHR).");
    if (!dateStr || !timeStr)
      return setError("Choose a departure date and time.");

    const depart = `${dateStr}T${timeStr}`;
    let departLocalAtOrigin = depart;
    if (tzMode === "dest")
      departLocalAtOrigin = convertLocalISO(depart, d.tz, o.tz);
    else if (tzMode === "custom") {
      const z = customTz || "UTC";
      departLocalAtOrigin = convertLocalISO(depart, z, o.tz);
    }
    // tzMode === "source" means depart already in origin local

    onSubmit({
      origin: o,
      dest: d,
      departLocalISO: departLocalAtOrigin,
      preference: "see",
      from,
      to,
    });
    pushRecent({ from, to, depart });
  }

  function clearAll() {
    setFrom("");
    setTo("");
    setDateStr("");
    setTimeStr("");
    setError(null);
    setTzMode("source");
    setCustomTz("");
    fromRef.current?.focus();
    onClear?.();
  }
  function swap() {
    const old = from;
    setFrom(to);
    setTo(old);
    setTzMode((m) => (m === "source" ? "dest" : m === "dest" ? "source" : m));
  }

  function applyPreset(a: string, b: string, h = 7, m = 0) {
    setFrom(a);
    setTo(b);
    setTzMode("source");
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const dLocal = new Date(
      d.getTime() - d.getTimezoneOffset() * 60000
    ).toISOString();
    setDateStr(dLocal.slice(0, 10));
    setTimeStr(dLocal.slice(11, 16));
  }

  return (
    <form
      id="seatscape-form"
      onSubmit={handleSubmit}
      className="grid gap-4 p-5 bg-white dark:bg-zinc-800 rounded-2xl shadow border border-zinc-200 dark:border-zinc-700"
    >
      <div className="grid gap-3 items-end md:grid-cols-[1fr_auto_1fr]">
        <IataCombo
          label="From (IATA)"
          placeholder="e.g., JFK"
          value={from}
          onChange={(v) => setFrom(v.toUpperCase())}
          airports={airports}
          inputRef={fromRef}
        />
        <button
          type="button"
          onClick={swap}
          className="self-end justify-self-center rounded-full p-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          title="Swap Source/Destination"
          aria-label="Swap Source and Destination"
        >
          <ArrowsRightLeftIcon className="h-5 w-5" />
        </button>
        <IataCombo
          label="To (IATA)"
          placeholder="e.g., LHR"
          value={to}
          onChange={(v) => setTo(v.toUpperCase())}
          airports={airports}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Date + explicit 24h time with arrow keys and tab progression */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Departure{" "}
            <span className="text-zinc-500 dark:text-zinc-400">
              ({tzLabel})
            </span>
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-1/2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
            />
            <TimeField
              value={timeStr}
              onChange={setTimeStr}
              className="w-1/2"
            />
          </div>
        </div>

        {/* Always-visible searchable selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Time zone</label>
          <TimezoneSelect
            options={tzOptions}
            value={currentTz}
            onChange={(tz) => {
              // If in custom mode and user picks source/dest zone, switch mode.
              if (tzMode === "custom") {
                if (originAirport?.tz && tz === originAirport.tz)
                  setTzMode("source");
                else if (destAirport?.tz && tz === destAirport.tz)
                  setTzMode("dest");
                else setCustomTz(tz);
              } else {
                // Selecting from the list in source/dest → switch to custom with that tz
                setCustomTz(tz);
                setTzMode("custom");
              }
            }}
            onClearToEmptyCustom={() => {
              setTzMode("custom");
              setCustomTz(""); // empty, not UTC
            }}
          />
          {/* Radio options moved BELOW the selector; no UTC */}
          <div className="flex gap-3 flex-wrap mt-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="tz"
                checked={tzMode === "source"}
                onChange={() => setTzMode("source")}
              />
              <span>Source</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="tz"
                checked={tzMode === "dest"}
                onChange={() => setTzMode("dest")}
              />
              <span>Destination</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="tz"
                checked={tzMode === "custom"}
                onChange={() => setTzMode("custom")}
              />
              <span>Custom</span>
            </label>
          </div>
        </div>

        {/* Presets: add a 4th for symmetry */}
        <div>
          <label className="block text-sm font-medium mb-1">Shortcuts</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("DEL", "DXB", 18, 30)}
              className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              DEL→DXB 18:30
            </button>
            <button
              type="button"
              onClick={() => applyPreset("SFO", "JFK", 7, 0)}
              className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              SFO→JFK 07:00
            </button>
            <button
              type="button"
              onClick={() => applyPreset("LHR", "CDG", 16, 0)}
              className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              LHR→CDG 16:00
            </button>
            <button
              type="button"
              onClick={() => applyPreset("SIN", "NRT", 9, 15)}
              className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              SIN→NRT 09:15
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {recent.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Recent:
          </span>
          {recent.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setFrom(r.from);
                setTo(r.to);
                const [d, t] = r.depart.split("T");
                setDateStr(d || "");
                const tt = (t || "").slice(0, 5);
                setTimeStr(tt);
              }}
              className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {r.from}→{r.to}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Calculating…" : "Calculate"}
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          onClick={clearAll}
        >
          Clear
        </button>
      </div>
    </form>
  );
}
