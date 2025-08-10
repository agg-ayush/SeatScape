"use client";

import { useEffect, useState } from "react";
import type { Airport, Recommendation, Sample } from "@/lib/types";
import type { PassBy } from "@/lib/cities";
import PlaneSunViz from "@/components/PlaneSunViz";
import Slider from "@/components/ui/Slider";

type Props = {
  rec: Recommendation;
  origin?: Airport;
  dest?: Airport;
  thresholdKm: number;
  onThresholdChange: (v: number) => void;
  progress: number; // 0..1
  onProgressChange: (p: number) => void;
  passBys?: PassBy[];
};


export default function CompareCard({
  rec,
  thresholdKm,
  onThresholdChange,
  progress,
  onProgressChange,
}: Props) {
  const [localP, setLocalP] = useState<number>(progress ?? 0);

  useEffect(() => {
    if (typeof progress === "number") setLocalP(progress);
      }, [progress]);

  const samples = (rec?.samples ?? []) as Sample[];

  return (
    <section className="mt-6">
      {samples.length > 1 ? (
        <div className="mt-5">
          <PlaneSunViz
            samples={samples}
            progress={localP}
            onProgressCommit={(p) => {
              setLocalP(p);
              onProgressChange(p);
            }}
          />
        </div>
      ) : null}

      <div className="mt-5">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">City threshold (km)</label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            className="w-24 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={thresholdKm}
            onChange={(e) => onThresholdChange(Number(e.target.value || 0))}
          />
          <div className="flex-1">
            <Slider
              value={Math.max(0, Math.min(500, thresholdKm))}
              min={0}
              max={500}
              step={10}
              onChange={(n: number) => {
                onThresholdChange(n);
              }}
              onCommit={(n: number) => {
                onThresholdChange(n);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}