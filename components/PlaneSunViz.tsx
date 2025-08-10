"use client";

import { useState, type CSSProperties } from "react";
import type { Sample } from "@/lib/types";
import { sunPlaneRelation } from "@/lib/plane";
import sliderStyles from "./ui/slider.module.css";

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
      </div>
      {samples.length > 1 && (
        <input
          type="range"
          min={0}
          max={samples.length - 1}
          value={idx}
          onChange={(e) => setIndex(Number(e.target.value))}
          aria-label="Time along flight"
          className={`mt-2 w-full cursor-pointer ${sliderStyles.range}`}
          style={{ "--progress": `${(idx / (samples.length - 1)) * 100}%` } as CSSProperties}
        />
      )}
    </div>
  );
}
