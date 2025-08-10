import { Airport, Preference, Recommendation, Sample } from "./types";
import { gcDistanceKm, intermediatePoint, trackAt, wrapTo180 } from "./geo";
import { addMinutes, localISOToUTCDate, formatLocal } from "./time";
import { sunAt, isSunEffective } from "./sun";
import cities from "./cities.json";
import type { City } from "./cities";

/** Estimate flight duration in whole minutes based on great-circle distance. */
export function estimateDurationMinutes(origin: Airport, dest: Airport): number {
  const distanceKm = gcDistanceKm(origin, dest);
  const durationHrs = Math.max(0.67, Math.min(18, distanceKm / 850)); // min 40min, max 18h
  return Math.round(durationHrs * 60);
}

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
  const { origin, dest, preference, sampleMinutes = 5 } = params;

  function nearestCity(lat: number, lon: number): { name: string; tz?: string } | undefined {
    let best: City | undefined;
    let bestDist = Infinity;
    for (const c of cities as City[]) {
      const d = gcDistanceKm({ lat, lon }, { lat: c.lat, lon: c.lon });
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best ? { name: best.name, tz: best.tz } : undefined;
  }

  // Convert departure local time to UTC Date
  const depUTC = localISOToUTCDate(params.departLocalISO, params.origin.tz);

  // Distance and duration
  const totalMinutes = estimateDurationMinutes(origin, dest);

  // Sampling
  let leftMinutes = 0;
  let rightMinutes = 0;
  let peakAltitudeDeg = -90;
  let sunriseUTC: string | undefined;
  let sunsetUTC: string | undefined;
  let sunriseSide: "A" | "F" | undefined;
  let sunsetSide: "A" | "F" | undefined;
  let sunriseSampleIndex: number | undefined;
  let sunsetSampleIndex: number | undefined;
  let sunriseCity: string | undefined;
  let sunriseTz: string | undefined;
  let sunsetCity: string | undefined;
  let sunsetTz: string | undefined;

  const samples: Sample[] = [];
  let wasEffective = false;
  let currentSide: "A" | "F" | undefined;

  for (let elapsed = 0, idx = 0; elapsed <= totalMinutes; elapsed += sampleMinutes, idx++) {
    const frac = elapsed / totalMinutes;
    const pos = intermediatePoint(origin, dest, frac);
    const course = trackAt(origin, dest, frac);
    const ts = addMinutes(depUTC, elapsed);

    const { azimuthDeg, altitudeDeg } = sunAt(ts, pos.lat, pos.lon);
    const effective = isSunEffective(altitudeDeg);

    let side: "A" | "F" | "none" = "none";
    if (effective) {
      const rel = wrapTo180(azimuthDeg - course);
      side = rel > 0 ? "F" : "A"; // right = F, left = A
    }

    if (!wasEffective && effective) {
      sunriseSide = side === "A" || side === "F" ? side : undefined;
      const city = nearestCity(pos.lat, pos.lon);
      sunriseCity = city?.name;
      sunriseTz = city?.tz;
      if (idx === 0) {
        // Sun already above horizon at departure – record synthetic time before takeoff
        sunriseUTC = addMinutes(ts, -sampleMinutes).toISOString();
        sunriseSampleIndex = undefined;
      } else {
        sunriseUTC = ts.toISOString();
        sunriseSampleIndex = idx;
      }
    }

    if (wasEffective && !effective) {
      sunsetUTC = ts.toISOString();
      sunsetSide = currentSide;
      sunsetSampleIndex = idx;
      const city = nearestCity(pos.lat, pos.lon);
      sunsetCity = city?.name;
      sunsetTz = city?.tz;
    }

    if (effective) {
      if (side === "A") leftMinutes += sampleMinutes;
      if (side === "F") rightMinutes += sampleMinutes;
      if (altitudeDeg > peakAltitudeDeg) peakAltitudeDeg = altitudeDeg;
      currentSide = side === "A" || side === "F" ? side : currentSide;
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

    wasEffective = effective;
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
    sunriseSide,
    sunriseSampleIndex,
    sunriseCity,
    sunriseTz,
    sunsetUTC,
    sunsetSide,
    sunsetSampleIndex,
    sunsetCity,
    sunsetTz,
    confidence: Math.round(confidence * 100) / 100,
    samples,
  };
}

/** Index of the first sample where the sun is above the horizon. */
export function firstSunIndex(samples: Sample[]): number | null {
  for (let i = 0; i < samples.length; i++) if (samples[i].alt > 0) return i;
  return null;
}

/** Index of the last sample where the sun is above the horizon. */
export function lastSunIndex(samples: Sample[]): number | null {
  for (let i = samples.length - 1; i >= 0; i--) if (samples[i].alt > 0) return i;
  return null;
}

/**
 * Format a sample's UTC time into local time of a reference zone.
 * Returns null when index is out of bounds.
 */
export function sampleLocalHM(samples: Sample[], idx: number, tz: string): string | null {
  if (idx == null || idx < 0 || idx >= samples.length) return null;
  return formatLocal(new Date(samples[idx].utc), tz, "HH:mm");
}

