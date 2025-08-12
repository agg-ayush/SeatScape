"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import airportsData from "@/lib/airports.json";
import type { Airport, Preference } from "@/lib/types";
import IataCombo from "@/components/IataCombo";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { convertLocalISO } from "@/lib/time";
import { DateTime } from "luxon";
import TimezoneSelect from "@/components/TimezoneSelect";
import PreferenceToggle from "@/components/PreferenceToggle";
import DateTime24 from "@/components/DateTime24";
import { fetchFlights, type Flight } from "@/lib/flights";

export type InputsSnapshot = {
  origin: Airport;
  dest: Airport;
  departLocalISO: string; // origin-local "YYYY-MM-DDTHH:mm"
  arriveLocalISO: string; // destination-local "YYYY-MM-DDTHH:mm"
  preference: Preference;
  from: string;
  to: string;
};

type Defaults = { from?: string; to?: string; depart?: string; arrive?: string };
type Props = {
  onSubmit: (data: InputsSnapshot) => void;
  defaults?: Defaults;
  loading?: boolean;
  onClearAll?: () => void;
};
type TZMode = "origin" | "dest" | "custom";
type Recent = { from: string; to: string; depart: string; arrive?: string };

export default function Inputs({ onSubmit, defaults, loading = false, onClearAll }: Props) {
  const [from, setFrom] = useState(defaults?.from ?? "");
  const [to, setTo] = useState(defaults?.to ?? "");
  const [depart, setDepart] = useState(defaults?.depart ?? "");
  const [arrive, setArrive] = useState(defaults?.arrive ?? "");
  const [tzMode, setTzMode] = useState<TZMode>("origin");
  const [customTZ, setCustomTZ] = useState<string | null>(null);
  const [pref, setPref] = useState<Preference>("see");
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const fromRef = useRef<HTMLInputElement | null>(null);
  const [flightResults, setFlightResults] = useState<Flight[] | null>(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState<string | null>(null);

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
  useEffect(() => {
    setFlightResults(null);
    setFlightError(null);
  }, [from, to]);


  const originAirport = lookup(from);
  const destAirport = lookup(to);

  const zoneForMode = useCallback(
    (m: TZMode) =>
      m === "origin"
        ? originAirport?.tz
        : m === "dest"
        ? destAirport?.tz
        : customTZ || undefined,
    [originAirport?.tz, destAirport?.tz, customTZ]
  );

  const tzLabel = zoneForMode(tzMode) ?? "—";

  const departZoneRef = useRef<string | undefined>(zoneForMode(tzMode));
  const arriveZoneRef = useRef<string | undefined>(destAirport?.tz);

  useEffect(() => {
    const nextZone = zoneForMode(tzMode);
    if (depart && departZoneRef.current && nextZone && departZoneRef.current !== nextZone) {
      setDepart(convertLocalISO(depart, departZoneRef.current, nextZone));
    }
    departZoneRef.current = nextZone;
    if (arrive && arriveZoneRef.current && nextZone && arriveZoneRef.current !== nextZone) {
      setArrive(convertLocalISO(arrive, arriveZoneRef.current, nextZone));
    }
    arriveZoneRef.current = nextZone;
  }, [tzMode, customTZ, originAirport?.tz, destAirport?.tz, depart, arrive, zoneForMode]);


  async function searchFlights() {
    if (!originAirport || !destAirport) return;
    setFlightLoading(true);
    setFlightError(null);
    try {
      const list = await fetchFlights(originAirport.iata, destAirport.iata);
      setFlightResults(list);
    } catch {
      setFlightError("Failed to load flights.");
      setFlightResults([]);
    } finally {
      setFlightLoading(false);
    }
  }

  function handleFlightSelect(f: Flight) {
    if (!originAirport || !destAirport) return;
    const departLocal = DateTime.fromISO(f.scheduledDeparture, { zone: f.depTz }).toFormat("yyyy-LL-dd'T'HH:mm");
    const arriveLocal = DateTime.fromISO(f.scheduledArrival, { zone: f.arrTz }).toFormat("yyyy-LL-dd'T'HH:mm");
    setDepart(departLocal);
    setArrive(arriveLocal);
    setTzMode("origin");
    departZoneRef.current = f.depTz;
    arriveZoneRef.current = f.arrTz;
    onSubmit({
      origin: originAirport,
      dest: destAirport,
      departLocalISO: departLocal,
      arriveLocalISO: arriveLocal,
      preference: pref,
      from,
      to,
    });
    pushRecent({ from, to, depart: departLocal, arrive: arriveLocal });
    setFlightResults(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const o = originAirport,
      d = destAirport;
    if (!o) return setError("Enter a valid From IATA (e.g., DEL, JFK).");
    if (!d) return setError("Enter a valid To IATA (e.g., DXB, LHR).");
    if (!depart) return setError("Choose a departure date & time.");
    if (!arrive) return setError("Arrival time unavailable.");

    const zone = zoneForMode(tzMode);
    const departDt = DateTime.fromISO(depart, { zone });
    const arriveDt = DateTime.fromISO(arrive, { zone });
    if (arriveDt < departDt)
      return setError("Arrival time must be after departure time.");

    let departLocalAtOrigin = depart;
    let arriveLocalAtDest = arrive;
    if (tzMode === "dest") {
      departLocalAtOrigin = convertLocalISO(depart, d.tz, o.tz);
    } else if (tzMode === "custom" && customTZ) {
      departLocalAtOrigin = convertLocalISO(depart, customTZ, o.tz);
      arriveLocalAtDest = convertLocalISO(arrive, customTZ, d.tz);
    } else if (tzMode === "origin") {
      arriveLocalAtDest = convertLocalISO(arrive, o.tz, d.tz);
    }

    onSubmit({
      origin: o,
      dest: d,
      departLocalISO: departLocalAtOrigin,
      arriveLocalISO: arriveLocalAtDest,
      preference: pref,
      from,
      to,
    });
    pushRecent({ from, to, depart, arrive });
  }

  function clearAll() {
    setFrom("");
    setTo("");
    setDepart("");
    setArrive("");
    departZoneRef.current = zoneForMode(tzMode);
    arriveZoneRef.current = zoneForMode(tzMode);
    setError(null);
    try { localStorage.removeItem("ss_recent"); } catch {}
    setRecent([]);
    fromRef.current?.focus();
    onClearAll?.();
  }
  function swap() {
    const old = from;
    setFrom(to);
    setTo(old);
    setTzMode((m) => (m === "origin" ? "dest" : m === "dest" ? "origin" : "custom"));
  }

  function applyPreset(
    a: string,
    b: string,
    h = 7,
    m = 0,
    durMin?: number
  ) {
    setFrom(a);
    setTo(b);
    setTzMode("origin");
    setPref("see");
    const o = lookup(a);
    const d = lookup(b);
    const now = DateTime.now().setZone(o?.tz || "UTC");
    const departDt = now.set({ hour: h, minute: m, second: 0, millisecond: 0 });
    setDepart(departDt.toFormat("yyyy-LL-dd'T'HH:mm"));
    if (o && d && durMin !== undefined) {
      const arriveDt = departDt.plus({ minutes: durMin }).setZone(d.tz);
      setArrive(arriveDt.toFormat("yyyy-LL-dd'T'HH:mm"));
    } else {
      setArrive("");
    }
  }

  const chipKey = (onActivate: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };

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
            onChange={(v) => {
              setFrom(v ? v.toUpperCase() : "");
              
            }}
            airports={airports}
            inputRef={fromRef}
          />
        <button
          type="button"
          onClick={swap}
          className="self-end justify-self-center rounded-full p-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          title="Swap From/To"
          aria-label="Swap From and To"
        >
          <ArrowsRightLeftIcon className="h-5 w-5" />
        </button>
          <IataCombo
            label="To (IATA)"
            placeholder="e.g., LHR"
            value={to}
            onChange={(v) => {
              setTo(v ? v.toUpperCase() : "");
              
            }}
            airports={airports}
          />
      </div>
        {originAirport && destAirport && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={searchFlights}
              disabled={flightLoading}
              className="rounded-lg px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {flightLoading ? "Searching…" : "Search flights"}
            </button>
            {flightError && <p className="text-red-600">{flightError}</p>}
            {flightResults && (
              flightResults.length > 0 ? (
                <ul className="max-h-60 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-700 rounded-md border border-zinc-200 dark:border-zinc-700">
                  {flightResults.map((f) => (
                    <li key={f.flightCode + f.scheduledDeparture}>
                      <button
                        type="button"
                        onClick={() => handleFlightSelect(f)}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
                      >
                        <div className="font-medium">{f.airline} {f.flightCode}</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {DateTime.fromISO(f.scheduledDeparture, { zone: f.depTz }).toFormat("LLL d HH:mm")} → {DateTime.fromISO(f.scheduledArrival, { zone: f.arrTz }).toFormat("LLL d HH:mm")}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No flights found.</p>
              )
            )}
          </div>
        )}


      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Departure{" "}
              <span className="text-zinc-500 dark:text-zinc-400">
                ({tzLabel})
              </span>
            </label>
            <DateTime24
              value={depart}
              onChange={(v) => {
                setDepart(v);
                departZoneRef.current = zoneForMode(tzMode);
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Arrival{" "}
              <span className="text-zinc-500 dark:text-zinc-400">
                ({tzLabel})
              </span>
            </label>
            <DateTime24
              value={arrive}
              onChange={(v) => {
                setArrive(v);
                arriveZoneRef.current = zoneForMode(tzMode);
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Time zone</label>
          <div className="flex gap-2">
            <div className="inline-flex rounded-full border border-zinc-300 dark:border-zinc-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setTzMode("origin")}
                className={`px-3 py-1.5 text-sm ${
                  tzMode === "origin"
                    ? "bg-white dark:bg-zinc-100 text-zinc-900"
                    : "bg-transparent text-zinc-300"
                }`}
              >
                Source
              </button>
              <button
                type="button"
                onClick={() => setTzMode("dest")}
                className={`px-3 py-1.5 text-sm ${
                  tzMode === "dest"
                    ? "bg-white dark:bg-zinc-100 text-zinc-900"
                    : "bg-transparent text-zinc-300"
                }`}
              >
                Destination
              </button>
              <button
                type="button"
                onClick={() => setTzMode("custom")}
                className={`px-3 py-1.5 text-sm ${
                  tzMode === "custom"
                    ? "bg-white dark:bg-zinc-100 text-zinc-900"
                    : "bg-transparent text-zinc-300"
                }`}
              >
                Custom
              </button>
            </div>
          </div>
          <div className="mt-2">
            <TimezoneSelect
              value={
                tzMode === "custom"
                  ? customTZ ?? ""
                  : tzMode === "origin"
                  ? originAirport?.tz ?? ""
                  : destAirport?.tz ?? ""
              }
              onChange={(tz) => {
                setCustomTZ(tz);
                setTzMode("custom");
              }}
              onClearToCustom={() => {
                setCustomTZ("");
                setTzMode("custom");
              }}
              fullWidth
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Preference</label>
          <PreferenceToggle value={pref} onChange={setPref} />
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Examples:
        </span>
        <button
          type="button"
          onClick={() => applyPreset("DEL", "DXB", 18, 30, 210)}
          onKeyDown={chipKey(() => applyPreset("DEL", "DXB", 18, 30, 210))}
          className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          role="button"
        >
          DEL→DXB 18:30
        </button>
        <button
          type="button"
          onClick={() => applyPreset("SFO", "JFK", 7, 0, 330)}
          onKeyDown={chipKey(() => applyPreset("SFO", "JFK", 7, 0, 330))}
          className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          role="button"
        >
          SFO→JFK 07:00
        </button>
        <button
          type="button"
          onClick={() => applyPreset("LHR", "CDG", 16, 0, 75)}
          onKeyDown={chipKey(() => applyPreset("LHR", "CDG", 16, 0, 75))}
          className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          role="button"
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
                  setArrive(r.arrive ?? "");
                  const z = zoneForMode(tzMode);
                  departZoneRef.current = z;
                  arriveZoneRef.current = z;
                }}
                onKeyDown={chipKey(() => {
                  setFrom(r.from);
                  setTo(r.to);
                  setDepart(r.depart);
                  setArrive(r.arrive ?? "");
                  const z = zoneForMode(tzMode);
                  departZoneRef.current = z;
                  arriveZoneRef.current = z;
                })}
                className="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                role="button"
              >
                {r.from}→{r.to}
              </button>
            ))}
          </>
        )}
      </div>

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
