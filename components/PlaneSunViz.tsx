"use client";

import { useState } from "react";
import type { Sample } from "@/lib/types";
import { sunPlaneRelation } from "@/lib/plane";

interface Props {
  samples: Sample[] | null;
}

export default function PlaneSunViz({ samples }: Props) {
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
          viewBox="0 0 200 80"
          className="absolute left-1/2 top-1/2 h-20 w-40 -translate-x-1/2 -translate-y-1/2 fill-zinc-600 dark:fill-zinc-300"
        >
          <polygon points="100,0 120,20 80,20" />
          <rect x="80" y="20" width="40" height="40" />
          <polygon points="100,80 120,60 80,60" />
          <rect x="40" y="30" width="40" height="20" />
          <rect x="120" y="30" width="40" height="20" />
        </svg>

        {/* sun position */}
        <div
          className="absolute h-6 w-6 rounded-full bg-yellow-400 border border-yellow-500 shadow"
          style={{
            left: `calc(50% + ${sunX}px - 12px)`,
            top: `calc(50% + ${sunY}px - 12px)`,
          }}
        />
      </div>
      {samples.length > 1 && (
        <input
          type="range"
          min={0}
          max={samples.length - 1}
          value={idx}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="mt-2 w-full"
        />
      )}
    </div>
  );
}
