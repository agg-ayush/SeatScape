"use client";

import { useRef, useEffect, useState, type CSSProperties } from "react";
import type { Sample } from "@/lib/types";
import { sunPlaneRelation } from "@/lib/plane";
import { formatLocal } from "@/lib/time";
import SunEventMarker from "@/components/SunEventMarker";
import sliderStyles from "./ui/slider.module.css";

interface Props {
  samples: Sample[] | null;
  sunriseIndex?: number;
  sunsetIndex?: number;
  index: number;
  onIndexChange: (i: number) => void;
  sunriseTz?: string;
  sunsetTz?: string;
}

export default function PlaneSunViz({
  samples,
  sunriseIndex,
  sunsetIndex,
  index,
  onIndexChange,
  sunriseTz,
  sunsetTz,
}: Props) {
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
  const planeSize = width * (80 / 224);
  const sunSize = width * (24 / 224);

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
    sunriseIndex !== undefined && sunriseTz
      ? formatLocal(new Date(samples[sunriseIndex].utc), sunriseTz, "HH:mm")
      : null;
  const sunsetTime =
    sunsetIndex !== undefined && sunsetTz
      ? formatLocal(new Date(samples[sunsetIndex].utc), sunsetTz, "HH:mm")
      : null;

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
            onChange={(e) => onIndexChange(Number(e.target.value))}
            aria-label="Time along flight"
            className={`w-full cursor-pointer ${sliderStyles.range}`}
            style={{ "--progress": `${(idx / (samples.length - 1)) * 100}%` } as CSSProperties}
          />
        </div>
      )}
    </div>
  );
}
