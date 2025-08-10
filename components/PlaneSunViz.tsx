'use client';
import React, { useCallback, useMemo, useState } from 'react';

type SeatSide = 'A' | 'F' | 'none'; // <-- include 'none'

export interface Sample {
  utc?: string;           // ISO string in UTC
  date?: Date;            // optional Date already parsed
  alt?: number;           // sun altitude deg
  az?: number;            // sun azimuth deg (0..360, 0 = north)
  course?: number;        // aircraft course deg (0..360)
  side?: SeatSide;        // window side for this sample
  glare01?: number;       // optional precomputed glare [0,1]
}

/** clamp to [0,1] */
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** wrap angle to [-180,180) */
const wrapTo180 = (x: number) => ((x + 180) % 360 + 360) % 360 - 180;

function formatHm(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

function inferDate(s: Sample, fallbackUTC?: string): Date {
  if (s.date instanceof Date) return s.date;
  if (s.utc) return new Date(s.utc);
  if (fallbackUTC) return new Date(fallbackUTC);
  return new Date();
}

function relativeAzDeg(s: Sample): number | undefined {
  if (typeof s.az === 'number' && typeof s.course === 'number') {
    return wrapTo180(s.az - s.course);
  }
  return undefined;
}

function glareFromSample(s: Sample): number {
  const rel = (typeof s.glare01 === 'number')
    ? clamp01(s.glare01)
    : (() => {
        const r = relativeAzDeg(s);
        if (typeof r !== 'number') return 0;
        const off = Math.abs(Math.abs(r) - 90); // 0 at ±90°
        return clamp01(1 - off / 90);
      })();

  const altFactor = (typeof s.alt === 'number') ? clamp01(1 - Math.abs(s.alt) / 50) : 1;
  return clamp01(rel * altFactor);
}

export interface PlaneSunVizProps {
  samples: Sample[];
  progress?: number;                // 0..1
  onProgressCommit?: (p01: number) => void;
  title?: string;
}

export default function PlaneSunViz({
  samples,
  progress = 0,
  onProgressCommit,
  title = 'Sun vs plane',
}: PlaneSunVizProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const p01 = drag ?? progress;

  const idx = useMemo(() => {
    if (!samples.length) return 0;
    return Math.min(samples.length - 1, Math.max(0, Math.round(p01 * (samples.length - 1))));
  }, [p01, samples.length]);

  const s = samples[idx] ?? {};
  const rel = relativeAzDeg(s) ?? 0;
  const glare = glareFromSample(s);
  const timeLabel = formatHm(inferDate(s, samples[0]?.utc));

  // layout numbers
  const pad = 24;
  const W = 760;
  const H = 220;
  const trackYTop = 90;
  const trackYBot = 130;
  const sunX = pad + p01 * (W - pad * 2);
  const sunY = (trackYTop + trackYBot) / 2 + (rel / 90) * 26;

  const leftActive = Math.sign(rel) < 0;
  const rightActive = Math.sign(rel) > 0;

  const commit = useCallback((n: number) => {
    onProgressCommit?.(clamp01(n));
    setDrag(null);
  }, [onProgressCommit]);

  return (
    <div className="rounded-2xl border border-zinc-700/40 p-6 bg-zinc-900/30">
      <div className="flex items-start justify-between mb-4">
        <div className="text-zinc-200">{title}</div>
        <div className="text-zinc-300/80 tabular-nums">{timeLabel}</div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b"/>
            <feMerge>
              <feMergeNode in="b"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <rect x="12" y="30" width={W - 24} height={H - 60} rx={100} className="fill-zinc-800/50 stroke-zinc-700/50" />
        <rect x={60} y={trackYTop - 6} width={W - 120} height={12} rx={6} className="fill-zinc-700/60" />
        <rect x={60} y={trackYBot - 6} width={W - 120} height={12} rx={6} className="fill-zinc-700/60" />
        <polygon points={`${W-60},110 ${W-74},100 ${W-74},120`} className="fill-zinc-500/50" />

        <rect x={60} y={trackYTop - 6} width={W - 120} height={12} rx={6}
              className={leftActive ? 'fill-yellow-500/50' : 'fill-transparent'} opacity={leftActive ? 0.25 : 0} />
        <rect x={60} y={trackYBot - 6} width={W - 120} height={12} rx={6}
              className={rightActive ? 'fill-yellow-500/50' : 'fill-transparent'} opacity={rightActive ? 0.25 : 0} />

        <circle cx={sunX} cy={sunY} r={10} className="fill-yellow-400 stroke-yellow-600" filter="url(#glow)" />

        <line x1={sunX - 70} y1={sunY} x2={sunX + 70} y2={sunY}
              stroke="currentColor"
              className="text-yellow-300"
              strokeOpacity={0.15 + 0.6 * glare}
              strokeWidth={6}
              strokeLinecap="round" />
      </svg>

      <input
        type="range"
        value={Math.round(p01 * 1000)}
        min={0}
        max={1000}
        step={1}
        onChange={(e) => setDrag(Number(e.target.value) / 1000)}
        onPointerUp={(e) => commit(Number((e.target as HTMLInputElement).value) / 1000)}
        onMouseUp={(e) => commit(Number((e.target as HTMLInputElement).value) / 1000)}
        className="w-full mt-3"
        aria-label="Time scrubber"
      />
    </div>
  );
}
