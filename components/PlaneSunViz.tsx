"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import type { Sample } from "@/lib/types";
import { sunPlaneRelation } from "@/lib/plane";
import SunEventMarker from "@/components/SunEventMarker";
import sliderStyles from "./ui/slider.module.css";

interface Props {
  samples: Sample[] | null;
  sunriseIndex?: number;
  sunsetIndex?: number;
}

export default function PlaneSunViz({ samples, sunriseIndex, sunsetIndex }: Props) {
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
          {/* Path handcrafted in Figma; cubic Beziers outline fuselage, wings, tail */}
          <path d="M100 5 C112 12 122 24 122 38 C155 40 175 55 175 60 C175 65 155 80 122 82 C132 86 142 90 150 95 C140 98 120 100 100 99 C80 100 60 98 50 95 C58 90 68 86 78 82 C45 80 25 65 25 60 C25 55 45 40 78 38 C78 24 88 12 100 5 Z" />
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
            className={`w-full cursor-pointer ${sliderStyles.range}`}
            style={{ "--progress": `${(idx / (samples.length - 1)) * 100}%` } as CSSProperties}
          />
        </div>
      )}
    </div>
  );
}
