"use client";

import { useEffect, useRef, useState } from "react";
import type { Sample } from "@/lib/types";
import { sunPlaneRelation } from "@/lib/plane";

interface Props {
  samples: Sample[] | null;
}

export default function PlaneSunViz({ samples }: Props) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!samples || samples.length === 0) return null;

  const idx = Math.min(index, samples.length - 1);
  const s = samples[idx];
  const rel = sunPlaneRelation(s.az, s.course, s.alt);

  const angleRad = (rel.relAz * Math.PI) / 180;
  const radius = width * (45 / 224);
  const sunX = Math.sin(angleRad) * radius;
  const sunY = -Math.cos(angleRad) * radius;
  const glareWidth = width * (160 / 224);
  const glareHeight = width * (48 / 224);
  const planeWidth = width * (160 / 224);
  const planeHeight = width * (80 / 224);
  const sunSize = width * (24 / 224);

  const leftOpacity = rel.side === "A" ? rel.intensity : 0;
  const rightOpacity = rel.side === "F" ? rel.intensity : 0;

  return (
    <div className="mt-4 mx-auto w-full max-w-sm">
      <div ref={containerRef} className="relative w-full aspect-[2/1]">
        {/* glare overlays */}
        <div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2"
          style={{ width: glareWidth, height: glareHeight }}
        >
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
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 fill-zinc-600 dark:fill-zinc-300"
          style={{ width: planeWidth, height: planeHeight }}
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
          className="absolute rounded-full bg-yellow-400 border border-yellow-500 shadow"
          style={{
            width: sunSize,
            height: sunSize,
            left: `calc(50% + ${sunX}px - ${sunSize / 2}px)`,
            top: `calc(50% + ${sunY}px - ${sunSize / 2}px)`,
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
          className="mt-2 w-full cursor-pointer appearance-none accent-zinc-600 dark:accent-zinc-300 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-zinc-200 dark:[&::-webkit-slider-runnable-track]:bg-zinc-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-600 dark:[&::-webkit-slider-thumb]:bg-zinc-300"
        />
      )}
    </div>
  );
}
