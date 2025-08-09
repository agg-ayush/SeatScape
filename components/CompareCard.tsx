"use client";

import React, { memo, useEffect, useMemo, useRef } from "react";
import type { Recommendation, Airport } from "@/lib/types";
import {
  detectCityPassBysFromSamples,
  sortPassBys,
  type PassBy,
  type SortMode,
} from "@/lib/cities";
import cities from "@/lib/cities.json";
import Slider from "@/components/ui/Slider";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-700">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold">{value}</div>
      {sub && (
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {sub}
        </div>
      )}
    </div>
  );
}

const Body = memo(function Body({
  rec,
  passBys,
  sortMode,
  thresholdKmCommitted,
}: {
  rec: Recommendation;
  passBys: PassBy[];
  sortMode: SortMode;
  thresholdKmCommitted: number;
}) {
  const leftCities = useMemo(
    () =>
      sortPassBys(
        passBys.filter((p) => p.side === "A"),
        sortMode
      ),
    [passBys, sortMode]
  );
  const rightCities = useMemo(
    () =>
      sortPassBys(
        passBys.filter((p) => p.side === "F"),
        sortMode
      ),
    [passBys, sortMode]
  );

  const totalEff = rec.leftMinutes + rec.rightMinutes;
  const leftPct = totalEff ? Math.round((rec.leftMinutes / totalEff) * 100) : 0;
  const rightPct = totalEff
    ? Math.round((rec.rightMinutes / totalEff) * 100)
    : 0;

  function CityList({ items }: { items: PassBy[] }) {
    return (
      <ul className="mt-3 space-y-1.5 text-sm max-h-48 overflow-auto pr-1">
        {items.length > 0 ? (
          items.map((p, i) => (
            <li
              key={`${p.name}-${p.sampleIndex}-${i}`}
              className="flex items-center justify-between"
            >
              <span className="truncate">{p.name}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                ~{p.distanceKm} km
              </span>
            </li>
          ))
        ) : (
          <li className="text-zinc-500 dark:text-zinc-400">
            No nearby cities.
          </li>
        )}
      </ul>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-bold mb-2">A (left)</h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Sun exposure"
              value={`${leftPct}%`}
              sub={`${rec.leftMinutes} min`}
            />
            <Stat
              label="Cities within threshold"
              value={`${leftCities.length}`}
              sub={`≤ ${thresholdKmCommitted} km`}
            />
          </div>
          <CityList items={leftCities} />
        </div>

        <div className="rounded-xl p-4 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-bold mb-2">F (right)</h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Sun exposure"
              value={`${rightPct}%`}
              sub={`${rec.rightMinutes} min`}
            />
            <Stat
              label="Cities within threshold"
              value={`${rightCities.length}`}
              sub={`≤ ${thresholdKmCommitted} km`}
            />
          </div>
          <CityList items={rightCities} />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          Overall sun exposure balance
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <div
            className="h-full bg-zinc-900 dark:bg-zinc-100 transition-[width] duration-300"
            style={{ width: `${leftPct}%` }}
            aria-label="Left exposure share"
          />
        </div>
        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
          Left {leftPct}% • Right {rightPct}%
        </div>
      </div>
    </>
  );
});

type Props = {
  rec: Recommendation;
  origin?: Airport;
  dest?: Airport;
  thresholdKm: number; // committed value from parent
  onThresholdChange?: (v: number) => void; // called only on release
  progress: number; // committed value 0..1
  onProgressChange?: (p: number) => void; // called only on release
};

/**
 * No re-renders while dragging:
 *  - We do NOT keep UI values in React state.
 *  - Slider onChange updates the number input and label via refs (imperatively).
 *  - onCommit triggers the heavy recompute by calling parent handlers.
 */
export default function CompareCard({
  rec,
  origin,
  dest,
  thresholdKm,
  onThresholdChange,
  progress,
  onProgressChange,
}: Props) {
  const [sortMode, setSortMode] = React.useState<SortMode>("time");

  // Refs for imperatively updated readouts
  const thresholdInputRef = useRef<HTMLInputElement | null>(null);
  const pctLabelRef = useRef<HTMLSpanElement | null>(null);

  // Keep the input and label in sync with committed props from parent
  useEffect(() => {
    if (thresholdInputRef.current)
      thresholdInputRef.current.value = String(thresholdKm);
  }, [thresholdKm]);
  useEffect(() => {
    if (pctLabelRef.current)
      pctLabelRef.current.textContent = `${Math.round(progress * 100)}%`;
  }, [progress]);

  // Pass-by computation only uses COMMITTED thresholdKm
  const passBys = useMemo(() => {
    try {
      if (!rec?.samples?.length) return [];
      return detectCityPassBysFromSamples(rec.samples as any, cities as any, {
        thresholdKm,
      });
    } catch {
      return [];
    }
  }, [rec?.samples, thresholdKm]);

  function ThresholdControl() {
    return (
      <div className="flex items-center gap-3">
        <label className="text-xs text-zinc-500 dark:text-zinc-400">
          City threshold (km)
        </label>
        <div className="w-48">
          <Slider
            min={10}
            max={300}
            step={5}
            value={thresholdKm}
            onChange={(v: number) => {
              if (thresholdInputRef.current)
                thresholdInputRef.current.value = String(v);
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            // only mirror locally; commit on blur/Enter
            // value already bound, no re-render needed
          }}
          onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
            onThresholdChange?.(Number(e.currentTarget.value))
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter")
              onThresholdChange?.(
                Number((e.currentTarget as HTMLInputElement).value)
              );
          }}
          className="w-20 px-2 py-1 text-sm rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent"
          aria-label="City threshold input (km)"
        />
      </div>
    );
  }

  function Scrubber() {
    const committedPct = Math.round(progress * 100);
    return (
      <div className="flex items-center gap-3">
        <label className="text-xs text-zinc-500 dark:text-zinc-400">
          Time scrubber
        </label>
        <div className="w-60">
          <Slider
            min={0}
            max={100}
            step={1}
            value={committedPct}
            onChange={(v: number) => {
              if (pctLabelRef.current)
                pctLabelRef.current.textContent = `${v}%`;
            }}
            onCommit={(v: number) => onProgressChange?.(v / 100)}
            ariaLabel="Time scrubber"
          />
        </div>
        <span ref={pctLabelRef} className="text-xs tabular-nums">
          {committedPct}%
        </span>
      </div>
    );
  }

  function SortControl() {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 dark:text-zinc-400">
          Sort cities
        </label>
        <div className="inline-flex rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setSortMode("time")}
            className={`px-3 py-1.5 text-xs ${
              sortMode === "time"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-transparent"
            }`}
          >
            Time
          </button>
          <button
            type="button"
            onClick={() => setSortMode("distance")}
            className={`px-3 py-1.5 text-xs ${
              sortMode === "distance"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-transparent"
            }`}
          >
            Distance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-5 bg-white dark:bg-zinc-800 rounded-2xl shadow border border-zinc-200 dark:border-zinc-700">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
          Side-by-side comparison
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <SortControl />
          <ThresholdControl />
          <Scrubber />
        </div>
      </div>

      <Body
        rec={rec}
        passBys={passBys}
        sortMode={sortMode}
        thresholdKmCommitted={thresholdKm}
      />
    </div>
  );
}
