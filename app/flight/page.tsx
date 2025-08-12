"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import ResultCard from "@/components/ResultCard";
import ThemeToggle from "@/components/ThemeToggle";
import { computeRecommendation } from "@/lib/logic";
import { buildInputsFromFlight } from "@/lib/flight";
import type { Recommendation, Airport, Preference } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function FlightPage() {
  const [flight, setFlight] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [origin, setOrigin] = useState<Airport | undefined>();
  const [dest, setDest] = useState<Airport | undefined>();
  const [pref, setPref] = useState<Preference>("see");
  const [sampleIndex, setSampleIndex] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const inputs = await buildInputsFromFlight(flight, date);
      const r = computeRecommendation({
        origin: inputs.origin,
        dest: inputs.dest,
        departLocalISO: inputs.departLocalISO,
        arriveLocalISO: inputs.arriveLocalISO,
        preference: inputs.preference,
        sampleMinutes: 5,
      });
      setRec(r);
      setOrigin(inputs.origin);
      setDest(inputs.dest);
      setPref(inputs.preference);
      setSampleIndex(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch flight details"
      );
      setRec(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">SeatScape</h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-300">
              Lookup by flight number
            </p>
          </div>
          <ThemeToggle />
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 p-5 bg-white dark:bg-zinc-800 rounded-2xl shadow border border-zinc-200 dark:border-zinc-700"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Flight number (IATA)
            </label>
            <input
              type="text"
              value={flight}
              onChange={(e) => setFlight(e.target.value.toUpperCase())}
              placeholder="e.g., AA100"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Loading…" : "Submit"}
          </button>
        </form>

        <ResultCard
          rec={rec}
          origin={origin}
          dest={dest}
          preference={pref}
          sampleIndex={sampleIndex}
          onSampleIndexChange={setSampleIndex}
        />

        <MapView
          samples={rec?.samples ?? null}
          sunriseIndex={rec?.sunriseSampleIndex}
          sunsetIndex={rec?.sunsetSampleIndex}
          sunriseCity={rec?.sunriseCity}
          sunsetCity={rec?.sunsetCity}
          planeIndex={sampleIndex}
        />
      </div>
    </main>
  );
}
