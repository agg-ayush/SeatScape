// lib/cities.ts
// City/landmark helpers: cross-track distance to route GC, de-duped pass-bys,
// probability proxy (background-only), and sorting utilities. No paid APIs.

import type { Sample } from "@/lib/types";

export type City = {
  name: string;
  lat: number;
  lon: number;
  tz?: string;
};

export type PassBy = {
  name: string;
  lat: number;
  lon: number;
  side: "A" | "F";
  distanceKm: number; // cross-track magnitude (km)
  when?: Date; // nearest sampled time (if available)
  sampleIndex: number; // nearest sampled index
  // Background-only (NOT shown in UI unless you opt-in):
  probability: number; // 0..1 likelihood proxy from distance vs threshold
};

export type DistanceInfo = {
  name: string;
  lat: number;
  lon: number;
  side: "A" | "F";
  distanceKm: number;
  probability: number; // 0..1 (not shown)
};

export type DetectOptions = {
  thresholdKm?: number; // default 75
};

// ---- math utils (spherical) ----
const R = 6371; // km
const toRad = (d: number) => (d * Math.PI) / 180;

function angularDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRad(lat1),
    λ1 = toRad(lon1);
  const φ2 = toRad(lat2),
    λ2 = toRad(lon2);
  const Δφ = φ2 - φ1;
  const Δλ = λ2 - λ1;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a))); // radians
}

function initialBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = toRad(lat1),
    φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (θ + 2 * Math.PI) % (2 * Math.PI); // 0..2π
}

/** Signed cross-track distance (km) from C to GC(A->B). Sign>0: RIGHT ("F"), Sign<0: LEFT ("A"). */
function crossTrackSignedKm(
  A: { lat: number; lon: number },
  B: { lat: number; lon: number },
  C: { lat: number; lon: number }
): number {
  const δ13 = angularDistance(A.lat, A.lon, C.lat, C.lon);
  const θ13 = initialBearing(A.lat, A.lon, C.lat, C.lon);
  const θ12 = initialBearing(A.lat, A.lon, B.lat, B.lon);
  const xtd = Math.asin(Math.sin(δ13) * Math.sin(θ13 - θ12)); // radians
  return xtd * R;
}

/** Background-only: convert distance to a 0..1 probability proxy. Not displayed. */
export function probabilityFromDistance(
  distanceKm: number,
  thresholdKm: number
): number {
  if (thresholdKm <= 0) return 0;
  if (distanceKm <= 0) return 1;
  // Smooth decay: p = exp(-(d/σ)^2), with σ = threshold/2 so p(threshold)≈0.135
  const sigma = thresholdKm / 2;
  const p = Math.exp(-Math.pow(distanceKm / sigma, 2));
  return Math.max(0, Math.min(1, p));
}

/** Compute distance & side for ALL cities w.r.t. route GC (first/last sample). */
export function distancesToGreatCircle(
  samples: Sample[],
  cities: City[],
  thresholdKm: number
): DistanceInfo[] {
  if (!samples || samples.length < 2 || !cities?.length) return [];
  const A = { lat: samples[0].lat, lon: samples[0].lon };
  const B = {
    lat: samples[samples.length - 1].lat,
    lon: samples[samples.length - 1].lon,
  };

  return cities.map((c) => {
    const xtd = crossTrackSignedKm(A, B, { lat: c.lat, lon: c.lon });
    const d = Math.abs(xtd);
    const side: "A" | "F" = xtd < 0 ? "A" : "F";
    return {
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      side,
      distanceKm: d,
      probability: probabilityFromDistance(d, thresholdKm),
    };
  });
}

/**
 * De-duped pass-bys:
 * - One entry per city (if within threshold).
 * - Time/sampleIndex assigned by the nearest sampled point (min great-circle distance to sample).
 * - Side determined by sign of cross-track (relative to whole-route GC).
 */
export function detectCityPassBysFromSamples(
  samples: Sample[],
  cities: City[],
  opts: DetectOptions = {}
): PassBy[] {
  if (!samples || samples.length < 2 || !cities?.length) return [];

  const thresholdKm = opts.thresholdKm ?? 75;
  const A = { lat: samples[0].lat, lon: samples[0].lon };
  const B = {
    lat: samples[samples.length - 1].lat,
    lon: samples[samples.length - 1].lon,
  };

  // Precompute sample coords in radians for nearest-sample search
  const samp = samples.map((s) => ({ lat: s.lat, lon: s.lon }));

  const out: PassBy[] = [];

  for (const c of cities) {
    const xtd = crossTrackSignedKm(A, B, { lat: c.lat, lon: c.lon });
    const dKm = Math.abs(xtd);
    if (dKm > thresholdKm) continue; // skip far cities

    // Find nearest sampled point to this city (gives us time index)
    let bestIdx = 0;
    let bestAng = Infinity;
    for (let i = 0; i < samp.length; i++) {
      const s = samp[i];
      const ang = angularDistance(c.lat, c.lon, s.lat, s.lon); // radians
      if (ang < bestAng) {
        bestAng = ang;
        bestIdx = i;
      }
    }

    const whenISO = (samples[bestIdx] as any).utc;
    out.push({
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      side: xtd < 0 ? "A" : "F",
      distanceKm: Number(dKm.toFixed(1)),
      when: whenISO ? new Date(whenISO as string) : undefined,
      sampleIndex: bestIdx,
      probability: probabilityFromDistance(dKm, thresholdKm),
    });
  }

  // Sort by time along route
  out.sort(
    (a, b) => a.sampleIndex - b.sampleIndex || a.name.localeCompare(b.name)
  );
  return out;
}

/** Helper for marker visuals: radius & opacity vs distance (closer → larger/brighter). */
export function markerVisuals(
  distanceKm: number,
  thresholdKm: number
): { radius: number; opacity: number } {
  const d = Math.max(0, Math.min(thresholdKm, distanceKm));
  const t = thresholdKm > 0 ? 1 - d / thresholdKm : 0; // 1 at d=0, 0 at d=threshold
  const radius = 4 + 6 * Math.pow(t, 0.7); // 4..10
  const opacity = 0.35 + 0.65 * Math.pow(t, 0.9); // 0.35..1
  return { radius, opacity };
}

// ---- sorting utilities for UI lists ----
export type SortMode = "time" | "distance";

export function sortPassBys(arr: PassBy[], mode: SortMode): PassBy[] {
  const a = [...arr];
  if (mode === "distance") {
    a.sort(
      (x, y) => x.distanceKm - y.distanceKm || x.name.localeCompare(y.name)
    );
  } else {
    a.sort(
      (x, y) => x.sampleIndex - y.sampleIndex || x.name.localeCompare(y.name)
    );
  }
  return a;
}
