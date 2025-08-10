"use client";

import { useRef, useEffect, useState } from "react";
import type { Sample } from "@/lib/types";
import { sunPlaneRelation } from "@/lib/plane";
import Slider from "@/components/ui/Slider";
import { clamp } from "@/lib/util";

interface Props {
  samples: Sample[] | null;
  index: number;
  onScrub: (i: number) => void; // fires during drag
  onIndexChange: (i: number) => void; // commit
}

export default function PlaneSunViz({
  samples,
  index,
  onScrub,
  onIndexChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [localIdx, setLocalIdx] = useState(index);
  const prevIdxRef = useRef(index);

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

  useEffect(() => {
    setLocalIdx(index);
    prevIdxRef.current = index;
  }, [index]);

  // Track the previously rendered sample index so we can
  // compute time deltas for smooth sun transitions.
  const prevSampleIdxRef = useRef(0);

  const hasSamples = !!samples && samples.length > 0;
  const safeLen = hasSamples ? samples.length : 1;
  const idx = clamp(localIdx, 0, safeLen - 1);

  useEffect(() => {
    prevSampleIdxRef.current = idx;
  }, [idx]);

  if (!hasSamples) return null;

  const s = samples[idx];
  const rel = sunPlaneRelation(s.az, s.course, s.alt);
  const showSun = s.alt > 0;

  // Animate the sun between samples at a speed proportional to the
  // elapsed time between the current and previous sample. This keeps the
  // sun movement in sync with real time, regardless of slider speed.
  const prevIdx = prevSampleIdxRef.current;
  const prevUtc = samples[prevIdx]?.utc;
  const currUtc = s.utc;
  let transitionSec = 0;
  if (prevUtc) {
    const diffSec =
      (new Date(currUtc).getTime() - new Date(prevUtc).getTime()) / 1000;
    // Cap the transition so large jumps don't take excessively long.
    transitionSec = Math.max(0, Math.min(diffSec, 5));
  }

  const angleRad = (rel.relAz * Math.PI) / 180;
  const radius = width * (45 / 224);
  const sunX = Math.sin(angleRad) * radius;
  const sunY = -Math.cos(angleRad) * radius;
  const glareWidth = width * (160 / 224);
  const glareHeight = width * (48 / 224);
  const planeSize = width * (80 / 224);
  const sunSize = width * (24 / 224);

  const leftOpacity = showSun && rel.side === "A" ? rel.intensity : 0;
  const rightOpacity = showSun && rel.side === "F" ? rel.intensity : 0;


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
          viewBox="0 0 1200 1200"
          preserveAspectRatio="xMidYMid meet"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 fill-zinc-600 dark:fill-zinc-300"
          style={{ width: planeSize, height: planeSize }}
        >
          <path d="m623.22 10.668c-5.8203-6.7695-14.289-10.668-23.219-10.668s-17.41 3.8984-23.23 10.668c-32.426 37.754-50.258 85.859-50.258 135.62v270.04l-514.27 404.07v122.45l514.29-195.91v183.67c0 17.09 4.2109 33.91 12.254 48.984l-183.67 122.45v97.957l244.89-97.957 244.89 97.957v-97.957l-183.67-122.45c8.0391-15.07 12.254-31.895 12.254-48.984v-183.67l514.29 195.91v-122.45l-514.29-404.07v-270.04c0-49.766-17.832-97.871-50.258-135.62" />
        </svg>

        {/* sun position */}
        {showSun && (
          <div
            className="absolute rounded-full bg-yellow-400 border border-yellow-500 shadow"
            style={{
              width: sunSize,
              height: sunSize,
              left: `calc(50% + ${sunX}px - ${sunSize / 2}px)`,
              top: `calc(50% + ${sunY}px - ${sunSize / 2}px)`,
              transition: `left ${transitionSec}s linear, top ${transitionSec}s linear`,
            }}
          />
        )}
      </div>
      {samples.length > 1 && (
        <div className="relative mt-2">
          <Slider
            min={0}
            max={samples.length - 1}
            value={localIdx}
            onChange={(v) => {
              setLocalIdx(v);
              onScrub(v);
            }}
            onCommit={(v) => {
              const c = clamp(v, 0, samples.length - 1);
              setLocalIdx(c);
              onIndexChange(c);
            }}
            ariaLabel="Time along flight"
            className="w-full cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
