"use client";

import type { Sample } from "@/lib/types";
import { useMemo } from "react";
import { formatLocal } from "@/lib/time";

type Props = { samples: Sample[]; height?: number; tz?: string };

export default function SunSparkline({ samples, height = 80, tz }: Props) {
  // Reserve space on top for the legend so the path never overlaps it
  const LEGEND_SPACE = 34;
  const width = 560;
  const paddingX = 12;
  const paddingBottom = 10;
  const paddingTop = 10 + LEGEND_SPACE; // ← extra top room

  const model = useMemo(() => {
    if (!samples.length) return null;

    const xs = samples.map((_, i) => i);
    const ys = samples.map((s) => s.alt);

    const xMax = Math.max(1, samples.length - 1);
    // pad y-range a bit to avoid clipping at edges
    const yMin = Math.min(-10, Math.min(...ys)) - 1;
    const yMax = Math.max(50, Math.max(...ys)) + 1;

    const innerW = width - paddingX * 2;
    const innerH = height - paddingTop - paddingBottom;

    const xScale = (i: number) => paddingX + (i / xMax) * innerW;

    // y grows downward → invert for altitude
    const yScale = (v: number) =>
      paddingTop + (1 - (v - yMin) / Math.max(1e-6, yMax - yMin)) * innerH;

    // Build polyline points
    const pts = xs.map((i, idx) => ({
      x: xScale(i),
      y: yScale(ys[idx]),
    }));

    // Horizon baseline y
    const yZero = yScale(0);

    // Indices for first/last sun (alt >= 5°)
    const firstIdx = samples.findIndex((s) => s.alt >= 5);
    const lastFromEnd = [...samples].reverse().findIndex((s) => s.alt >= 5);
    const lastIdx = lastFromEnd >= 0 ? samples.length - 1 - lastFromEnd : -1;

    // Build two paths:
    //  A) full path muted
    //  B) sun-visible segment (from firstIdx to lastIdx) highlighted
    const toPath = (arr: { x: number; y: number }[]) =>
      arr.map((p, i) => (i ? `L ${p.x},${p.y}` : `M ${p.x},${p.y}`)).join(" ");

    const fullPath = toPath(pts);

    let sunPath = "";
    if (firstIdx >= 0 && lastIdx >= 0 && lastIdx >= firstIdx) {
      sunPath = toPath(pts.slice(firstIdx, lastIdx + 1));
    }

    return {
      width,
      height,
      pts,
      yZero,
      xScale,
      yScale,
      firstIdx,
      lastIdx,
      fullPath,
      sunPath,
    };
  }, [samples, height, paddingTop]);

  if (!model) return null;

  const {
    width: W,
    height: H,
    yZero,
    pts,
    firstIdx,
    lastIdx,
    fullPath,
    sunPath,
  } = model;

  return (
    <>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      role="img"
      aria-label="Sun altitude over flight time"
      className="mt-3"
    >
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Below-horizon tint & baseline */}
      <rect
        x={0}
        y={yZero}
        width={W}
        height={H - yZero}
        fill="currentColor"
        opacity="0.06"
      />
      <line
        x1={0}
        y1={yZero}
        x2={W}
        y2={yZero}
        stroke="currentColor"
        opacity="0.35"
      />

      {/* Full path (muted) */}
      <path
        d={fullPath}
        fill="none"
        stroke="currentColor"
        opacity="0.35"
        strokeWidth={2}
      />

      {/* Sun-visible segment (highlighted) */}
      {sunPath && (
        <path d={sunPath} fill="none" stroke="url(#spark)" strokeWidth={2} />
      )}

      {/* Markers */}
      {firstIdx >= 0 && (
        <circle
          cx={pts[firstIdx].x}
          cy={pts[firstIdx].y}
          r="5"
          fill="#22c55e"
          stroke="#fff"
          strokeWidth="1.5"
        />
      )}
      {lastIdx >= 0 && lastIdx !== firstIdx && (
        <circle
          cx={pts[lastIdx].x}
          cy={pts[lastIdx].y}
          r="5"
          fill="#ef4444"
          stroke="#fff"
          strokeWidth="1.5"
        />
      )}

      {/* Legend pill in the reserved top space (tighter width) */}
      <g transform="translate(10,8)">
        {/* light bg */}
        <rect
          width="150"
          height="26"
          rx="8"
          ry="8"
          fill="rgba(255,255,255,0.9)"
          className="dark:hidden"
        />
        {/* dark bg */}
        <rect
          width="150"
          height="26"
          rx="8"
          ry="8"
          fill="rgba(24,24,27,0.85)"
          className="hidden dark:block"
        />

        {/* first sun */}
        <circle cx="12" cy="13" r="4" fill="#22c55e" />
        <text
          x="20"
          y="17"
          fontSize="12"
          className="dark:hidden"
          fill="#e5e7eb00"
        >
          .
        </text>
        <text
          x="20"
          y="17"
          fontSize="12"
          fill="#374151"
          className="dark:hidden"
        >
          first sun
        </text>
        <text
          x="20"
          y="17"
          fontSize="12"
          fill="#e5e7eb"
          className="hidden dark:block"
        >
          first sun
        </text>

        {/* last sun (shifted left to reduce empty right space) */}
        <circle cx="88" cy="13" r="4" fill="#ef4444" />
        <text
          x="96"
          y="17"
          fontSize="12"
          fill="#374151"
          className="dark:hidden"
        >
          last sun
        </text>
        <text
          x="96"
          y="17"
          fontSize="12"
          fill="#e5e7eb"
          className="hidden dark:block"
        >
          last sun
        </text>
      </g>
    </svg>
    <div className="mt-1 flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
      <span>{formatLocal(new Date(samples[0].utc), tz ?? "UTC", "HH:mm")}</span>
      <span>{formatLocal(new Date(samples[samples.length - 1].utc), tz ?? "UTC", "HH:mm")}</span>
    </div>
    </>
  );
}
