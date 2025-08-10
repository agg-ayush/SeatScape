
"use client";

import { useState, useEffect } from "react";
import type { Recommendation, Airport, Preference } from "@/lib/types";
import { firstSunIndex, lastSunIndex, sampleLocalHM } from "@/lib/logic";
import SunSparkline from "@/components/SunSparkline";
import PlaneSunViz from "@/components/PlaneSunViz";

type Props = {
  rec: Recommendation | null;
  origin?: Airport;
  dest?: Airport;
  preference: Preference;
  sampleIndex: number;
  onSampleIndexChange: (i: number) => void;
};

export default function ResultCard({ rec, origin, dest, preference, sampleIndex, onSampleIndexChange }: Props) {
  const [copied, setCopied] = useState(false);
  const [localIdx, setLocalIdx] = useState(sampleIndex);

  useEffect(() => {
    setLocalIdx(sampleIndex);
  }, [sampleIndex]);

  if (!rec) return null;

  const total = rec.leftMinutes + rec.rightMinutes;
  const sunPct =
    total > 0
      ? Math.round((Math.max(rec.leftMinutes, rec.rightMinutes) / total) * 100)
      : 0;

  const sunriseIdx = firstSunIndex(rec.samples);
  const sunsetIdx = lastSunIndex(rec.samples);
  const sunriseLocal =
    sunriseIdx !== null && origin?.tz ? sampleLocalHM(rec.samples, sunriseIdx, origin.tz) : null;
  const sunsetLocal =
    sunsetIdx !== null && origin?.tz ? sampleLocalHM(rec.samples, sunsetIdx, origin.tz) : null;
  const sunriseSide = sunriseIdx !== null ? rec.samples[sunriseIdx].side : "none";
  const sunsetSide = sunsetIdx !== null ? rec.samples[sunsetIdx].side : "none";
  const sunriseSideTxt =
    sunriseSide === "A" ? " on A (left)" : sunriseSide === "F" ? " on F (right)" : "";
  const sunsetSideTxt =
    sunsetSide === "A" ? " on A (left)" : sunsetSide === "F" ? " on F (right)" : "";

  const rationale =
    preference === "avoid"
      ? `keeps direct sun away for about ${100 - sunPct}% of the flight`
      : `sun graces that side for roughly ${sunPct}% of the flight`;

  const sideRaw = String(rec.side ?? "").trim();
  const sideLetter = sideRaw.startsWith("A")
    ? "A"
    : sideRaw.startsWith("F")
    ? "F"
    : (null as "A" | "F" | null);

  const headline = sideLetter
    ? `Pick ${sideLetter} (${sideLetter === "A" ? "left" : "right"})`
    : `Pick ${sideRaw}`;

  const textToCopy = `${headline} — ${rationale}${
    sunriseLocal || sunsetLocal
      ? ` ${
          sunriseLocal
            ? `Sunrise ~${sunriseLocal}${sunriseSideTxt}${
                rec.sunriseCity ? ` near ${rec.sunriseCity}` : origin ? ` at ${origin.iata}` : ""
              } (${origin?.tz || ""}).`
            : ""
        }${
          sunsetLocal
            ? ` Sunset ~${sunsetLocal}${sunsetSideTxt}${
                rec.sunsetCity ? ` near ${rec.sunsetCity}` : dest ? ` at ${dest.iata}` : ""
              } (${origin?.tz || ""}).`
            : ""
        }`
      : ""
  }`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy recommendation:", textToCopy);
    }
  }

  return (
    <div className="relative p-5 bg-white dark:bg-zinc-800 rounded-2xl shadow border border-zinc-200 dark:border-zinc-700">
      <div className="mb-2">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
          Seat recommendation
        </span>
      </div>

      <h2 className="text-2xl font-extrabold tracking-tight">{headline}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Peak sun altitude around {rec.peakAltitudeDeg}° above the horizon. Confidence {Math.round(rec.confidence * 100)}%.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700">
          {preference === "avoid" ? "Avoid glare" : "See the sun"}
        </span>
        <span className="px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700">
          {rationale}
        </span>
        {sunriseLocal && (
          <span className="px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700">
            Sunrise ~{sunriseLocal}
            {sunriseSideTxt}
          </span>
        )}
        {sunsetLocal && (
          <span className="px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700">
            Sunset ~{sunsetLocal}
            {sunsetSideTxt}
          </span>
        )}
      </div>

      {rec.samples && rec.samples.length > 1 && (
        <div className="text-zinc-700 dark:text-zinc-200">
          <SunSparkline
            samples={rec.samples}
            tz={origin?.tz}
            sunriseIndex={rec.sunriseSampleIndex}
            sunsetIndex={rec.sunsetSampleIndex}
            sunriseTz={rec.sunriseTz || origin?.tz}
            sunsetTz={rec.sunsetTz || dest?.tz}
            index={localIdx}
          />
        </div>
      )}

      {rec.samples && rec.samples.length > 0 && (
        <PlaneSunViz
          samples={rec.samples}
          index={localIdx}
          onScrub={setLocalIdx}
          onIndexChange={(v) => {
            setLocalIdx(v);
            onSampleIndexChange(v);
          }}
        />
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={copy}
          className="text-sm underline"
          aria-live="polite"
          aria-label="Copy recommendation"
        >
          {copied ? "Copied!" : "Copy recommendation"}
        </button>
        <span
          className={`text-xs rounded-full px-2 py-1 transition-opacity duration-200 ${
            copied
              ? "opacity-100 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
              : "opacity-0"
          }`}
          role="status"
          aria-hidden={!copied}
        >
          Copied
        </span>
      </div>
    </div>
  );
}
