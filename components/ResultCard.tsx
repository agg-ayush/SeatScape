
"use client";

import { useState } from "react";
import type { Recommendation, Airport, Preference } from "@/lib/types";
import SunSparkline from "@/components/SunSparkline";
import PlaneSunViz from "@/components/PlaneSunViz";

type Props = {
  rec: Recommendation | null;
  origin?: Airport;
  dest?: Airport;
  preference: Preference;
};

export default function ResultCard({ rec, origin, dest, preference }: Props) {
  const [copied, setCopied] = useState(false);
  if (!rec) return null;

  const total = rec.leftMinutes + rec.rightMinutes;
  const sunPct =
    total > 0
      ? Math.round((Math.max(rec.leftMinutes, rec.rightMinutes) / total) * 100)
      : 0;

  const sunriseLocal =
    rec.sunriseUTC && origin
      ? formatLocal(new Date(rec.sunriseUTC), origin.tz, "HH:mm")
      : null;
  const sunsetLocal =
    rec.sunsetUTC && dest
      ? formatLocal(new Date(rec.sunsetUTC), dest.tz, "HH:mm")
      : null;
  const sunriseSideTxt = rec.sunriseSide
    ? ` on ${rec.sunriseSide === "A" ? "A (left)" : "F (right)"}`
    : "";
  const sunsetSideTxt = rec.sunsetSide
    ? ` on ${rec.sunsetSide === "A" ? "A (left)" : "F (right)"}`
    : "";

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
            ? `Sunrise ~${sunriseLocal}${rec.sunriseSide ? ` on ${rec.sunriseSide}` : ""} at ${origin?.iata ?? ""} (${origin?.tz ?? ""}).`
            : ""
        }${
          sunsetLocal
            ? ` Sunset ~${sunsetLocal}${rec.sunsetSide ? ` on ${rec.sunsetSide}` : ""} at ${dest?.iata ?? ""} (${dest?.tz ?? ""}).`
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
            {sunriseSideTxt} at {origin?.iata} ({origin?.tz})
          </span>
        )}
        {sunsetLocal && (
          <span className="px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700">
            Sunset ~{sunsetLocal}
            {sunsetSideTxt} at {dest?.iata} ({dest?.tz})
          </span>
        )}
      </div>

      {rec.samples && rec.samples.length > 1 && (
        <div className="text-zinc-700 dark:text-zinc-200">
          <SunSparkline samples={rec.samples} />
        </div>
      )}

      {rec.samples && rec.samples.length > 0 && (
        <PlaneSunViz
          samples={rec.samples}
          sunriseIndex={rec.sunriseSampleIndex}
          sunsetIndex={rec.sunsetSampleIndex}
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
