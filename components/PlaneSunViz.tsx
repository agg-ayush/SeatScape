"use client";

import { useState } from "react";
import type { Sample } from "@/lib/types";
import { sunPlaneRelation } from "@/lib/plane";
import SunEventMarker from "@/components/SunEventMarker";

interface Props {
  samples: Sample[] | null;
  sunriseIndex?: number;
  sunsetIndex?: number;
}

export default function PlaneSunViz({ samples, sunriseIndex, sunsetIndex }: Props) {
  const [index, setIndex] = useState(0);
  if (!samples || samples.length === 0) return null;

  const idx = Math.min(index, samples.length - 1);
  const s = samples[idx];
  const rel = sunPlaneRelation(s.az, s.course, s.alt);

  const angleRad = (rel.relAz * Math.PI) / 180;
  const radius = 45;
  const sunX = Math.sin(angleRad) * radius;
  const sunY = -Math.cos(angleRad) * radius;

  const leftOpacity = rel.side === "A" ? rel.intensity : 0;
  const rightOpacity = rel.side === "F" ? rel.intensity : 0;

  const sunrisePct =
    sunriseIndex !== undefined && samples.length > 1
      ? (sunriseIndex / (samples.length - 1)) * 100
      : null;
  const sunsetPct =
    sunsetIndex !== undefined && samples.length > 1
      ? (sunsetIndex / (samples.length - 1)) * 100
      : null;
  const sunriseTime =
    sunriseIndex !== undefined ?
      new Date(samples[sunriseIndex].utc).toISOString().slice(11, 16) : null;
  const sunsetTime =
    sunsetIndex !== undefined ?
      new Date(samples[sunsetIndex].utc).toISOString().slice(11, 16) : null;

  return (
    <div className="mt-4">
      <div className="relative mx-auto h-32 w-56">
        {/* glare overlays */}
        <div className="absolute left-1/2 top-1/2 h-12 w-40 -translate-x-1/2 -translate-y-1/2 flex">
          <div
            className="h-full w-1/2 bg-yellow-300/60 transition-opacity"
            style={{ opacity: leftOpacity }}
          />
          <div
            className="h-full w-1/2 bg-yellow-300/60 transition-opacity"
            style={{ opacity: rightOpacity }}
          />
        </div>

        {/* plane silhouette */}
        <svg
          viewBox="0 0 200 100"
          className="absolute left-1/2 top-1/2 h-20 w-40 -translate-x-1/2 -translate-y-1/2 fill-zinc-600 dark:fill-zinc-300"
        >
          {/* nose */}
          <polygon points="100,0 120,20 80,20" />
          {/* fuselage */}
          <rect x="80" y="20" width="40" height="50" />
          {/* tail */}
          <polygon points="100,100 120,70 80,70" />
          {/* wings */}
          <polygon points="100,35 180,55 180,65 100,45" />
          <polygon points="100,35 20,55 20,65 100,45" />
          {/* horizontal stabilizers */}
          <polygon points="100,70 160,80 160,86 100,75" />
          <polygon points="100,70 40,80 40,86 100,75" />
        </svg>

        {/* sun position */}
        <div
          className="absolute h-6 w-6 rounded-full bg-yellow-400 border border-yellow-500 shadow"
          style={{
            left: `calc(50% + ${sunX}px - 12px)`,
            top: `calc(50% + ${sunY}px - 12px)`,
          }}
        />
        {sunrisePct !== null && sunriseTime && (
          <SunEventMarker
            type="sunrise"
            time={sunriseTime}
            style={{ left: `${sunrisePct}%`, top: 0, transform: "translate(-50%, -100%)" }}
          />
        )}
        {sunsetPct !== null && sunsetTime && (
          <SunEventMarker
            type="sunset"
            time={sunsetTime}
            style={{ left: `${sunsetPct}%`, top: 0, transform: "translate(-50%, -100%)" }}
          />
        )}
      </div>
      {samples.length > 1 && (
        <div className="relative mt-2">
          {sunrisePct !== null && sunriseTime && (
            <SunEventMarker
              type="sunrise"
              time={sunriseTime}
              style={{ left: `${sunrisePct}%`, top: -20, transform: "translate(-50%, -100%)" }}
            />
          )}
          {sunsetPct !== null && sunsetTime && (
            <SunEventMarker
              type="sunset"
              time={sunsetTime}
              style={{ left: `${sunsetPct}%`, top: -20, transform: "translate(-50%, -100%)" }}
            />
          )}
          <input
            type="range"
            min={0}
            max={samples.length - 1}
            value={idx}
            onChange={(e) => setIndex(Number(e.target.value))}
            aria-label="Time along flight"
            className="w-full cursor-pointer appearance-none accent-zinc-600 dark:accent-zinc-300 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-zinc-200 dark:[&::-webkit-slider-runnable-track]:bg-zinc-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-600 dark:[&::-webkit-slider-thumb]:bg-zinc-300"
          />
        </div>
      )}
    </div>
  );
}
