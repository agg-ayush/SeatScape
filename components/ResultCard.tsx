
"use client";

import { useState } from "react";
import type { Recommendation, Airport, Preference } from "@/lib/types";
import { formatLocal } from "@/lib/time";
import SunSparkline from "@/components/SunSparkline";

type Props = {
  progress?: number;
  rec: Recommendation | null;
  origin?: Airport;
  dest?: Airport;
  preference: Preference;
};

export default function ResultCard({ rec, origin, dest, preference, progress }: Props) {
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

  const rationale =
    preference === "avoid"
      ? `minimizes direct sun (~${100 - sunPct}%)`
      : `sun on that side for ~${sunPct}% of the flight`;

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
      ? ` ${sunriseLocal ? `Sunrise ~${sunriseLocal} at ${origin?.iata ?? ""} (${origin?.tz ?? ""}).` : ""}${sunsetLocal ? ` Sunset ~${sunsetLocal} at ${dest?.iata ?? ""} (${dest?.tz ?? ""}).` : ""}`
      : ""
  }`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy result:", textToCopy);
    }
  }

  return (
    <div className="relative p-5 bg-white dark:bg-zinc-800 rounded-2xl shadow border border-zinc-200 dark:border-zinc-700">
      <div className="mb-2">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
          Recommendation
        </span>
      </div>

      <h2 className="text-2xl font-extrabold tracking-tight">{headline}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Peak sun altitude ~{rec.peakAltitudeDeg}° above horizon. Confidence{" "}
        {Math.round(rec.confidence * 100)}%.
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
            Sunrise ~{sunriseLocal} at {origin?.iata} ({origin?.tz})
          </span>
        )}
        {sunsetLocal && (
          <span className="px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700">
            Sunset ~{sunsetLocal} at {dest?.iata} ({dest?.tz})
          </span>
        )}
      </div>

      {rec.samples && rec.samples.length > 1 && (
        <div className="text-zinc-700 dark:text-zinc-200">
          {/* Sparkline with cursor sync */}
          <SunSparkline samples={rec.samples} cursorIndex={typeof progress === "number" ? Math.round(progress * Math.max(0, (rec.samples?.length ?? 1) - 1)) : undefined} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <button
          onClick={copy}
          className="text-sm underline"
          aria-live="polite"
          aria-label="Copy result"
        >
          {copied ? "Copied!" : "Copy result"}
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
