"use client";

import type { Sample } from "@/lib/types";
import { useMemo, useRef, useState, useEffect } from "react";
import { formatLocal } from "@/lib/time";
import SunEventMarker from "@/components/SunEventMarker";
import { clamp } from "@/lib/util";

type Props = {
  samples: Sample[];
  height?: number;
  tz?: string;
  sunriseIndex?: number;
  sunsetIndex?: number;
  sunriseTz?: string;
  sunsetTz?: string;
  index?: number;
};

export default function SunSparkline({
  samples,
  height = 80,
  tz,
  sunriseIndex,
  sunsetIndex,
  sunriseTz,
  sunsetTz,
  index,
}: Props) {
  // Reserve space on top for the legend so the path never overlaps it
  const LEGEND_SPACE = 34;
  const paddingX = 12;
  const paddingBottom = 10;
  const paddingTop = 10 + LEGEND_SPACE; // ← extra top room

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => setWidth(el.clientWidth);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => {
    if (!samples.length || width === 0) return null;

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
  }, [samples, height, paddingTop, width]);

  const tickTimes = useMemo(() => {
    if (!samples.length) return [];
    const start = new Date(samples[0].utc);
    const end = new Date(samples[samples.length - 1].utc);
    const ticks: string[] = [];
    // Always include start time
    ticks.push(formatLocal(start, tz ?? "UTC", "HH:mm"));
    // Next whole hour after start
    const cur = new Date(start);
    cur.setMinutes(0, 0, 0);
    cur.setHours(cur.getHours() + 1);
    while (cur < end) {
      ticks.push(formatLocal(cur, tz ?? "UTC", "HH:mm"));
      cur.setHours(cur.getHours() + 1);
    }
    // Include end time
    if (end.getTime() !== start.getTime()) {
      ticks.push(formatLocal(end, tz ?? "UTC", "HH:mm"));
    }
    return ticks;
  }, [samples, tz]);

  if (!model)
    return (
      <div
        ref={containerRef}
        style={{ height }}
        className="relative mt-3 overflow-hidden rounded-lg"
      />
    );

  const {
    width: W,
    height: H,
    yZero,
    pts,
    firstIdx,
    lastIdx,
    fullPath,
    sunPath,
    xScale,
  } = model;

  const activeIdx =
    index !== undefined
      ? clamp(Math.round(index), 0, samples.length - 1)
      : undefined;
  const activePt = activeIdx !== undefined ? pts[activeIdx] : null;

  const sunriseX =
    sunriseIndex !== undefined ? xScale(sunriseIndex) : null;
  const sunrisePct = sunriseX !== null ? (sunriseX / W) * 100 : null;
  const sunriseTime =
    sunriseIndex !== undefined && sunriseTz
      ? formatLocal(new Date(samples[sunriseIndex].utc), sunriseTz, "HH:mm")
      : null;
  const sunsetX =
    sunsetIndex !== undefined ? xScale(sunsetIndex) : null;
  const sunsetPct = sunsetX !== null ? (sunsetX / W) * 100 : null;
  const sunsetTime =
    sunsetIndex !== undefined && sunsetTz
      ? formatLocal(new Date(samples[sunsetIndex].utc), sunsetTz, "HH:mm")
      : null;

  return (
    <div ref={containerRef} className="relative mt-3 overflow-hidden rounded-lg">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label="Sun altitude over flight time"
        className="block"
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

      {/* Active marker */}
      {activePt && (
        <circle
          cx={activePt.x}
          cy={activePt.y}
          r="5"
          fill="#fbbf24"
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
      {sunrisePct !== null && sunriseTime && (
        <SunEventMarker
          type="sunrise"
          time={sunriseTime}
          style={{
            left: `${sunrisePct}%`,
            top: H,
            transform: "translate(-50%, -100%)",
          }}
        />
      )}
      {sunsetPct !== null && sunsetTime && (
        <SunEventMarker
          type="sunset"
          time={sunsetTime}
          style={{
            left: `${sunsetPct}%`,
            top: H,
            transform: "translate(-50%, -100%)",
          }}
        />
      )}
      <div className="mt-1 flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 overflow-hidden">
        {tickTimes.map((t, i) => (
          <span key={i} className="tabular-nums">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
