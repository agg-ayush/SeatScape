
"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Inputs, { InputsSnapshot } from "@/components/Inputs";
import ResultCard from "@/components/ResultCard";
import ThemeToggle from "@/components/ThemeToggle";
import CompareCard from "@/components/CompareCard";

import { computeRecommendation } from "@/lib/logic";
import { detectCityPassBysFromSamples, type PassBy } from "@/lib/cities";
import type { Airport, Recommendation, Preference } from "@/lib/types";
import cities from "@/lib/cities.json";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const search = useSearchParams();

  // Build defaults from the URL (?from=...&to=...&depart=...); otherwise empty
  const defaults = useMemo(() => {
    const from = (search.get("from") || "").toUpperCase();
    const to = (search.get("to") || "").toUpperCase();
    const depart = search.get("depart") || "";
    return { from, to, depart };
  }, [search]);

  // App state
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [origin, setOrigin] = useState<Airport | undefined>(undefined);
  const [dest, setDest] = useState<Airport | undefined>(undefined);
  const [pref, setPref] = useState<Preference>("see");

  // Comparison controls
  const [thresholdKm, setThresholdKm] = useState<number>(75);
  const [progress, setProgress] = useState<number>(0);

  const cityPassBys: PassBy[] = useMemo(() => {
    if (!rec?.samples?.length) return [];
    try {
      return detectCityPassBysFromSamples(rec.samples as any, cities as any, {
        thresholdKm,
      });
    } catch {
      return [];
    }
  }, [rec?.samples, thresholdKm]);

  function updateUrl(s: InputsSnapshot) {
    const params = new URLSearchParams();
    params.set("from", s.from);
    params.set("to", s.to);
    params.set("depart", s.departLocalISO);
    router.replace(`/?${params.toString()}`);
  }

  async function handleSubmit(s: InputsSnapshot) {
    setLoading(true);
    setPref(s.preference);
    await new Promise((r) => setTimeout(r, 120));

    const r = computeRecommendation({
      origin: s.origin,
      dest: s.dest,
      departLocalISO: s.departLocalISO,
      preference: s.preference,
      sampleMinutes: 5,
    });

    setRec(r);
    setOrigin(s.origin);
    setDest(s.dest);
    updateUrl(s);
    setLoading(false);
  }

  function clearAll() {
    setRec(null);
    setOrigin(undefined);
    setDest(undefined);
    setProgress(0);
    setThresholdKm(75);
    router.replace("/");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              SeatScape
            </h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-300">
              Pick the perfect window seat (A=left / F=right) using the sun’s
              path and scenic views.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <Inputs defaults={defaults} loading={loading} onSubmit={handleSubmit} onClearAll={clearAll} />

        {rec && (
          <CompareCard
            rec={rec}
            origin={origin}
            dest={dest}
            thresholdKm={thresholdKm}
            onThresholdChange={(v) => setThresholdKm(v)}
            progress={progress}
            onProgressChange={(p) => setProgress(p)}
            passBys={cityPassBys}
          />
        )}

        <ResultCard rec={rec} origin={origin} dest={dest} preference={pref} />

        <MapView samples={rec?.samples ?? null} cities={cityPassBys} thresholdKm={thresholdKm} originTZ={origin?.tz} />

        <footer className="text-xs text-zinc-500 dark:text-zinc-400 pt-2">
          Assumes great-circle routing and fair weather. Window seats: A (left),
          F (right) in typical 3–3 configs.
        </footer>
      </div>
    </main>
  );
}
