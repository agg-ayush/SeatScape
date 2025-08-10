"use client";
import React, { useMemo } from "react";

type Sample = {
  utc?: string;
  date?: Date;
  glare01?: number;
  alt?: number;
  az?: number;
  course?: number;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const wrapTo180 = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;

function relativeAzDeg(s: Sample): number | undefined {
  if (typeof s.az === "number" && typeof s.course === "number") {
    return wrapTo180(s.az - s.course);
  }
  return undefined;
}

function glareFromSample(s: Sample): number {
  if (typeof s.glare01 === "number") return clamp01(s.glare01);
  const r = relativeAzDeg(s);
  if (typeof r !== "number") return 0;
  const off = Math.abs(Math.abs(r) - 90); // 0 at ±90°
  const rel = clamp01(1 - off / 90);
  const altFactor =
    typeof s.alt === "number" ? clamp01(1 - Math.abs(s.alt) / 50) : 1;
  return clamp01(rel * altFactor);
}

export interface SunSparklineProps {
  samples: Sample[];
  width?: number;
  height?: number;
  progress?: number; // 0..1
}

export default function SunSparkline({
  samples,
  width = 320,
  height = 30,
  progress = 0,
}: SunSparklineProps) {
  const values = useMemo(() => samples.map(glareFromSample), [samples]);

  const path = useMemo(() => {
    if (!values.length) return "";
    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const pts = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * w;
      const y = pad + (1 - v) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return pts.join(" ");
  }, [values, width, height]);

  const cx = 2 + progress * (width - 4);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="6"
        className="fill-zinc-800/60"
      />
      <path
        d={path}
        className="stroke-yellow-400"
        strokeOpacity="0.8"
        strokeWidth="2"
        fill="none"
      />
      <circle cx={cx} cy={height / 2} r="3" className="fill-white" />
    </svg>
  );
}
