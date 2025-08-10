
import type { Sample } from "@/lib/types";

export type City = { name: string; lat: number; lon: number; tz?: string };

export type PassBy = {
  name: string;
  lat: number;
  lon: number;
  side: "A" | "F";
  sampleIndex: number;
  timeUTC?: string;
  distanceKm: number;
  probability: number; // hidden background score 0..1 by distance
};

export type SortMode = "time" | "distance";

export function sortPassBys(items: PassBy[], mode: SortMode): PassBy[] {
  const copy = [...items];
  if (mode === "time") {
    copy.sort((a, b) =>
      a.sampleIndex === b.sampleIndex
        ? a.distanceKm - b.distanceKm
        : a.sampleIndex - b.sampleIndex
    );
  } else {
    copy.sort((a, b) =>
      a.distanceKm === b.distanceKm
        ? a.sampleIndex - b.sampleIndex
        : a.distanceKm - b.distanceKm
    );
  }
  return copy;
}

/** Haversine distance (km) */
function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

function bearingDeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const toDeg = (x: number) => (x * 180) / Math.PI;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

function wrapTo180(deg: number): number {
  let d = ((deg + 180) % 360 + 360) % 360 - 180;
  if (d === -180) d = 180;
  return d;
}

/** Probability 0..1 where 1 is on-path and 0 at threshold */
function probabilityFromDistance(distKm: number, thresholdKm: number): number {
  const x = Math.min(1, Math.max(0, distKm / Math.max(1, thresholdKm)));
  const p = 1 - x * x; // smooth invert
  return Math.round(p * 1000) / 1000;
}

function dedupeAdjacent(events: PassBy[], windowSamples = 2): PassBy[] {
  const byCity: Record<string, PassBy[]> = {};
  for (const e of events) (byCity[e.name] ||= []).push(e);
  const result: PassBy[] = [];
  for (const name of Object.keys(byCity)) {
    const arr = byCity[name].sort((a, b) => a.sampleIndex - b.sampleIndex);
    let i = 0;
    while (i < arr.length) {
      let best = arr[i];
      let j = i + 1;
      while (j < arr.length && arr[j].sampleIndex - arr[i].sampleIndex <= windowSamples) {
        if (arr[j].distanceKm < best.distanceKm) best = arr[j];
        j++;
      }
      result.push(best);
      i = j;
    }
  }
  return result.sort((a, b) => a.sampleIndex - b.sampleIndex);
}

export function detectCityPassBysFromSamples(
  samples: Sample[],
  cities: City[],
  opts: { thresholdKm: number }
): PassBy[] {
  const { thresholdKm } = opts;
  if (!Array.isArray(samples) || !samples.length) return [];
  const events: PassBy[] = [];

  for (const c of cities) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const d = distanceKm({ lat: s.lat, lon: s.lon }, c);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx >= 0 && bestDist <= thresholdKm) {
      const s = samples[bestIdx];
      const cityBrg = bearingDeg({ lat: s.lat, lon: s.lon }, c);
      const rel = wrapTo180(cityBrg - (s.course ?? 0));
      const side: "A" | "F" = rel < 0 ? "A" : "F";
      events.push({
        name: c.name,
        lat: c.lat,
        lon: c.lon,
        side,
        sampleIndex: bestIdx,
        timeUTC: s.utc,
        distanceKm: Math.round(bestDist),
        probability: probabilityFromDistance(bestDist, thresholdKm),
      });
    }
  }
  return dedupeAdjacent(events, 2);
}
