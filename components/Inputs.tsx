"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import airportsData from "@/lib/airports.json";
import type { Airport, Preference } from "@/lib/types";
import IataCombo from "@/components/IataCombo";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { convertLocalISO } from "@/lib/time";

export type InputsSnapshot = {
  origin: Airport;
  dest: Airport;
  departLocalISO: string; // origin-local "YYYY-MM-DDTHH:mm"
  preference: Preference;
  from: string;
  to: string;
};

type Defaults = { from?: string; to?: string; depart?: string };
type Props = {
  onSubmit: (data: InputsSnapshot) => void;
  defaults?: Defaults;
  loading?: boolean;
};
type TZMode = "origin" | "dest" | "utc";
type Recent = { from: string; to: string; depart: string };

export default function Inputs({ onSubmit, defaults, loading = false }: Props) {
  const [from, setFrom] = useState(defaults?.from ?? "");
  const [to, setTo] = useState(defaults?.to ?? "");
  const [depart, setDepart] = useState(defaults?.depart ?? "");
  const [tzMode, setTzMode] = useState<TZMode>("origin");
  const [pref, setPref] = useState<Preference>("see");
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const fromRef = useRef<HTMLInputElement | null>(null);

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

  const airports = airportsData as unknown as Array<Airport>;
  const lookup = (code: string): Airport | undefined =>
    airports.find((a) => a.iata.toUpperCase() === code.toUpperCase());

  useEffect(() => {
    if (!defaults) {
      if (!from && lookup("DEL")) setFrom("DEL");
      if (!to && lookup("DXB")) setTo("DXB");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const tzLabel =
    tzMode === "origin"
      ? originAirport?.tz ?? "—"
      : tzMode === "dest"
      ? destAirport?.tz ?? "—"
      : "UTC";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const o = originAirport,
      d = destAirport;
    if (!o) return setError("Enter a valid From IATA (e.g., DEL, JFK).");
    if (!d) return setError("Enter a valid To IATA (e.g., DXB, LHR).");
    if (!depart) return setError("Choose a departure date & time.");

    let departLocalAtOrigin = depart;
    if (tzMode === "dest")
      departLocalAtOrigin = convertLocalISO(depart, d.tz, o.tz);
    else if (tzMode === "utc")
      departLocalAtOrigin = convertLocalISO(depart, "UTC", o.tz);

    onSubmit({
      origin: o,
      dest: d,
      departLocalISO: departLocalAtOrigin,
      preference: pref,
      from,
      to,
    });
    pushRecent({ from, to, depart });
  }

  function clearAll() {
    setFrom("");
    setTo("");
    setDepart("");
    setError(null);
    fromRef.current?.focus();
  }
  function swap() {
    const old = from;
    setFrom(to);
    setTo(old);
    setTzMode((m) =>
      m === "origin" ? "dest" : m === "dest" ? "origin" : "utc"
    );
  }

  // helper to set a preset quickly
  function applyPreset(a: string, b: string, h = 7, m = 0) {
    setFrom(a);
    setTo(b);
    setTzMode("origin");
    setPref("see");
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDepart(iso);
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
          title="Swap From/To"
          aria-label="Swap From and To"
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

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Departure{" "}
            <span className="text-zinc-500 dark:text-zinc-400">
              ({tzMode === "utc" ? "UTC" : tzLabel})
            </span>
          </label>
          <input
            type="datetime-local"
            value={depart}
            onChange={(e) => setDepart(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Time zone</label>
          <div className="flex gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="tz"
                checked={tzMode === "origin"}
                onChange={() => setTzMode("origin")}
              />
              <span>Origin</span>
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
                checked={tzMode === "utc"}
                onChange={() => setTzMode("utc")}
              />
              <span>UTC</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Preference</label>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="pref"
                checked={pref === "see"}
                onChange={() => setPref("see")}
              />
              <span>See the sun</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="pref"
                checked={pref === "avoid"}
                onChange={() => setPref("avoid")}
              />
              <span>Avoid glare</span>
            </label>
          </div>
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {/* Example presets + recent */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Examples:
        </span>
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

        {recent.length > 0 && (
          <>
            <span className="mx-2 h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
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
                  setDepart(r.depart);
                }}
                className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                {r.from}→{r.to}
              </button>
            ))}
          </>
        )}
      </div>

      {/* actions */}
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
