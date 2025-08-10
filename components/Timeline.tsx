"use client";

import type { PassBy } from "@/lib/cities";
import { formatLocal } from "@/lib/time";

type Props = {
  items: PassBy[];
  // If provided, we'll show local times for this zone; otherwise show UTC HH:mm or T+mm fallback
  zone?: string;
};

export default function Timeline({ items, zone }: Props) {
  if (!items?.length) return null;

  return (
    <div className="mt-4 border-t border-zinc-200 dark:border-zinc-700 pt-3">
      <div className="mb-2">
        <span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
          Pass-bys (≈ within 75 km)
        </span>
      </div>

      <ul className="space-y-1.5 text-sm text-zinc-700 dark:text-zinc-200">
        {items.map((p, i) => {
          let timeLabel = "T+";
          if (p.timeUTC) {
            const d = new Date(p.timeUTC);
            timeLabel = zone
              ? formatLocal(d, zone, "HH:mm")
              : d.toISOString().slice(11, 16) + "Z";
          } else {
            const minutes = p.sampleIndex * 5; // default stepMinutes
            const hh = Math.floor(minutes / 60)
              .toString()
              .padStart(2, "0");
            const mm = (minutes % 60).toString().padStart(2, "0");
            timeLabel = `${hh}:${mm}`;
          }

          return (
            <li key={`${p.name}-${i}`} className="flex items-center gap-2">
              <span className="inline-block w-14 tabular-nums text-zinc-500 dark:text-zinc-400">
                {timeLabel}
              </span>
              <span className="font-medium">{p.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700">
                {p.side === "A" ? "left" : "right"}
              </span>
              {typeof p.distanceKm === "number" && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  ~{p.distanceKm} km
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
