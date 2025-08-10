"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import type { Recommendation, Airport } from "@/lib/types";
import { sortPassBys, type PassBy, type SortMode } from "@/lib/cities";
import Slider from "@/components/ui/Slider";
import { formatLocal } from "@/lib/time";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-700">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sub}</div>}
    </div>
  );
}

function PassByList({ items, origin }: { items: PassBy[]; origin?: Airport }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm max-h-48 overflow-auto pr-1">
      {items.length > 0 ? (
        items.map((p, i) => {
          const local = p.timeUTC && origin
            ? formatLocal(new Date(p.timeUTC), origin.tz, "HH:mm")
            : "—";
          return (
            <li key={`${p.name}-${p.sampleIndex}-${i}`} className="flex items-center justify-between gap-2">
              <div className="min-w-14 font-mono text-xs text-zinc-500">{local}</div>
              <div className="flex-1 truncate">{p.name}</div>
              <span className="text-xs text-zinc-500">~{p.distanceKm} km</span>
            </li>
          );
        })
      ) : (
        <li className="text-zinc-500 dark:text-zinc-400">No nearby cities.</li>
      )}
    </ul>
  );
}

type Props = {
  rec: Recommendation;
  origin?: Airport;
  dest?: Airport;
  thresholdKm: number;
  onThresholdChange?: (v: number) => void;
  /** kept for API compatibility but currently unused/hidden */
  progress?: number; // 0..1
  onProgressChange?: (p: number) => void;
  passBys: PassBy[];
};

export default function CompareCard({
  rec,
  origin,
  thresholdKm,
  onThresholdChange,
  // progress,
  // onProgressChange,
  passBys
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("time");

  const thresholdInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (thresholdInputRef.current)
      thresholdInputRef.current.value = String(thresholdKm);
  }, [thresholdKm]);

  const leftCities = useMemo(
    () => sortPassBys(passBys.filter((p) => p.side === "A"), sortMode),
    [passBys, sortMode]
  );
  const rightCities = useMemo(
    () => sortPassBys(passBys.filter((p) => p.side === "F"), sortMode),
    [passBys, sortMode]
  );

  const totalEff = rec.leftMinutes + rec.rightMinutes;
  const leftPct = totalEff ? Math.round((rec.leftMinutes / totalEff) * 100) : 0;
  const rightPct = totalEff ? Math.round((rec.rightMinutes / totalEff) * 100) : 0;

  return (
    <div className="relative p-5 bg-white dark:bg-zinc-800 rounded-2xl shadow border border-zinc-200 dark:border-zinc-700">
      {/* Header row: left (pill + sort), right (threshold only) */}
      <div className="mb-3 grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-zinc-200/50 dark:bg-zinc-700 whitespace-nowrap">
            Side-by-side comparison
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Sort cities</span>
            <div className="inline-flex rounded-full border border-zinc-400/50 dark:border-zinc-600 overflow-hidden">
              <button
                type="button"
                onClick={() => setSortMode("time")}
                className={`px-4 py-1.5 text-xs ${sortMode === "time"
                  ? "bg-white text-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-transparent text-zinc-200 dark:text-zinc-300"}`}
              >
                Time
              </button>
              <button
                type="button"
                onClick={() => setSortMode("distance")}
                className={`px-4 py-1.5 text-xs ${sortMode === "distance"
                  ? "bg-white text-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-transparent text-zinc-200 dark:text-zinc-300"}`}
              >
                Distance
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end items-center gap-5">
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">City threshold (km)</label>
            <div className="w-48">
              <Slider
                min={10}
                max={300}
                step={5}
                value={thresholdKm}
                onChange={(v: number) => {
                  if (thresholdInputRef.current) thresholdInputRef.current.value = String(v);
                }}
                onCommit={(v: number) => onThresholdChange?.(v)}
                ariaLabel="City threshold (km)"
              />
            </div>
            <input
              ref={thresholdInputRef}
              type="number"
              min={10}
              max={300}
              step={5}
              defaultValue={thresholdKm}
              onBlur={(e) => onThresholdChange?.(Number(e.currentTarget.value))}
              onKeyDown={(e) => { if (e.key === "Enter") onThresholdChange?.(Number((e.currentTarget as HTMLInputElement).value)); }}
              className="w-16 px-2 py-1 text-sm rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent"
            />
          </div>
          {/* Time scrubber hidden for now to keep the map uncluttered */}
        </div>
      </div>

      {((!rec.sunriseSide && rec.sunriseUTC) || (!rec.sunsetSide && rec.sunsetUTC)) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {!rec.sunriseSide && rec.sunriseUTC && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-3 py-1 text-xs">
              🌅 Sunrise visible both sides
            </span>
          )}
          {!rec.sunsetSide && rec.sunsetUTC && (
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200 px-3 py-1 text-xs">
              🌇 Sunset visible both sides
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-bold mb-2">A (left)</h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Sun exposure" value={`${leftPct}%`} sub={`${rec.leftMinutes} min`} />
            <Stat label="Cities within threshold" value={`${leftCities.length}`} sub={`≤ ${thresholdKm} km`} />
          </div>
          <PassByList items={leftCities} origin={origin} />
        </div>

        <div className="rounded-xl p-4 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-bold mb-2">F (right)</h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Sun exposure" value={`${rightPct}%`} sub={`${rec.rightMinutes} min`} />
            <Stat label="Cities within threshold" value={`${rightCities.length}`} sub={`≤ ${thresholdKm} km`} />
          </div>
          <PassByList items={rightCities} origin={origin} />
        </div>
      </div>
    </div>
  );
}
