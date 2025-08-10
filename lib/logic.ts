import { Airport, Preference, Recommendation, Sample } from "./types";
import { gcDistanceKm, intermediatePoint, trackAt,  } from "./geo";
import { addMinutes, localISOToUTCDate } from "./time";
import { sunAt, isSunEffective } from "./sun";

/**
 * Compute seat recommendation for a flight.
 */
export function computeRecommendation(params: {
  origin: Airport;
  dest: Airport;
  departLocalISO: string; // e.g. "2025-08-10T18:30"
  preference: Preference;
  sampleMinutes?: number;
}): Recommendation {
  const {
    origin,
    dest,
    departLocalISO,
    preference,
    sampleMinutes = 5,
  } = params;

  // Convert departure local time to UTC Date
  const depUTC = localISOToUTCDate(params.departLocalISO, params.origin.tz);

  // Distance and duration
  const distanceKm = gcDistanceKm(origin, dest);
  const durationHrs = Math.max(0.67, Math.min(18, distanceKm / 850)); // min 40min, max 18h
  const totalMinutes = Math.round(durationHrs * 60);

  // Sampling
  let leftMinutes = 0;
  let rightMinutes = 0;
  let peakAltitudeDeg = -90;
  let sunriseUTC: string | undefined;
  let sunsetUTC: string | undefined;
  const samples: Sample[] = [];

  let wasEffective = false;

  for (let elapsed = 0; elapsed <= totalMinutes; elapsed += sampleMinutes) {
    const frac = elapsed / totalMinutes;
    const pos = intermediatePoint(origin, dest, frac);
    const course = trackAt(origin, dest, frac);
    const ts = addMinutes(depUTC, elapsed);

    const { azimuthDeg, altitudeDeg } = sunAt(ts, pos.lat, pos.lon);

    let side: "A" | "F" | "none" = "none";
    if (isSunEffective(altitudeDeg)) {
      const rel = (azimuthDeg - course);
      side = rel > 0 ? "F" : "A"; // right = F, left = A
      if (side === "A") leftMinutes += sampleMinutes;
      if (side === "F") rightMinutes += sampleMinutes;
      if (altitudeDeg > peakAltitudeDeg) peakAltitudeDeg = altitudeDeg;

      if (!wasEffective) {
        sunriseUTC = ts.toISOString();
        wasEffective = true;
      }
    } else {
      if (wasEffective) {
        sunsetUTC = ts.toISOString();
        wasEffective = false;
      }
    }

    samples.push({
      lat: pos.lat,
      lon: pos.lon,
      utc: ts.toISOString(),
      az: azimuthDeg,
      alt: altitudeDeg,
      course,
      side,
    });
  }

  // Decide side based on preference
  let side: "A (left)" | "F (right)";
  if (preference === "see") {
    if (leftMinutes > rightMinutes) side = "A (left)";
    else if (rightMinutes > leftMinutes) side = "F (right)";
    else side = peakAltitudeDeg >= 0 ? "F (right)" : "A (left)"; // tie-breaker
  } else {
    if (leftMinutes < rightMinutes) side = "A (left)";
    else if (rightMinutes < leftMinutes) side = "F (right)";
    else side = peakAltitudeDeg >= 0 ? "A (left)" : "F (right)"; // tie-breaker
  }

  const totalEffective = leftMinutes + rightMinutes;
  const maxSide = Math.max(leftMinutes, rightMinutes);
  const confidence = totalEffective > 0 ? maxSide / totalEffective : 0;

  return {
    side,
    leftMinutes,
    rightMinutes,
    peakAltitudeDeg: Math.round(peakAltitudeDeg * 10) / 10,
    sunriseUTC,
    sunsetUTC,
    confidence: Math.round(confidence * 100) / 100,
    samples,
  };
}

// ---- Extended sun/relative helpers (non-breaking) ----
export const ALTITUDE_THRESHOLD_DEG = 5;
export const DEAD_BAND_DEG = 10;
export type ExtendedSample = Sample & {
  relativeAzDeg: number;
  glare01: number;
  effective?: boolean;
};
function wrapTo180(x: number): number {
  let a = ((x + 180) % 360 + 360) % 360 - 180;
  if (a == -180) a = 180;
  return a;
}
function deg2rad(d: number) { return (d * Math.PI) / 180; }
export function extendSamples(samples: Sample[]): ExtendedSample[] {
  return samples.map((s) => {
    const relativeAzDeg = ((s.az ?? 0) - (s.course ?? 0));
    const above = (s.alt ?? 0) >= ALTITUDE_THRESHOLD_DEG;
    const glare01 = above ? Math.max(0, Math.cos(Math.abs(deg2rad(relativeAzDeg)))) : 0;
    const effective = above && Math.abs(relativeAzDeg) > DEAD_BAND_DEG;
    return { ...s, relativeAzDeg, glare01, effective } as ExtendedSample;
  });
}
