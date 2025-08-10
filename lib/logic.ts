import { Airport, Preference, Recommendation, Sample } from "./types";
import { gcDistanceKm, intermediatePoint, trackAt, wrapTo180 } from "./geo";
import { addMinutes, localISOToUTCDate } from "./time";
import { sunAt, isSunEffective } from "./sun";
import cities from "./cities.json";
import type { City } from "./cities";

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
    preference,
    sampleMinutes = 5,
  } = params;

  function nearestCityName(lat: number, lon: number): string | undefined {
    let best: string | undefined;
    let bestDist = Infinity;
    for (const c of cities as City[]) {
      const d = gcDistanceKm({ lat, lon }, { lat: c.lat, lon: c.lon });
      if (d < bestDist) {
        bestDist = d;
        best = c.name;
      }
    }
    return best;
  }

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
  let sunriseSampleIndex: number | undefined;
  let sunsetSampleIndex: number | undefined;
  let sunriseSide: "A" | "F" | undefined;
  let sunsetSide: "A" | "F" | undefined;
  let sunriseCity: string | undefined;
  let sunsetCity: string | undefined;
  const samples: Sample[] = [];
  let prevSample: Sample | undefined;

  let wasEffective = false;

  for (let elapsed = 0; elapsed <= totalMinutes; elapsed += sampleMinutes) {
    const frac = elapsed / totalMinutes;
    const pos = intermediatePoint(origin, dest, frac);
    const course = trackAt(origin, dest, frac);
    const ts = addMinutes(depUTC, elapsed);

    const { azimuthDeg, altitudeDeg } = sunAt(ts, pos.lat, pos.lon);

    let side: "A" | "F" | "none" = "none";
    if (isSunEffective(altitudeDeg)) {
      const rel = wrapTo180(azimuthDeg - course);
      side = rel > 0 ? "F" : "A"; // right = F, left = A
      if (side === "A") leftMinutes += sampleMinutes;
      if (side === "F") rightMinutes += sampleMinutes;
      if (altitudeDeg > peakAltitudeDeg) peakAltitudeDeg = altitudeDeg;

      if (!wasEffective) {
        sunriseUTC = ts.toISOString();
        sunriseSampleIndex = samples.length;
        sunriseSide = side === "A" ? "A" : "F";
        sunriseCity = nearestCityName(pos.lat, pos.lon);
        wasEffective = true;
      }
    } else {
      if (wasEffective) {
        sunsetUTC = ts.toISOString();
        sunsetSampleIndex = samples.length - 1;
        sunsetSide = prevSample?.side === "A" ? "A" : prevSample?.side === "F" ? "F" : undefined;
        if (prevSample) {
          sunsetCity = nearestCityName(prevSample.lat, prevSample.lon);
        }
        wasEffective = false;
      }
    }

    const sample: Sample = {
      lat: pos.lat,
      lon: pos.lon,
      utc: ts.toISOString(),
      az: azimuthDeg,
      alt: altitudeDeg,
      course,
      side,
    };
    samples.push(sample);
    prevSample = sample;
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
    sunriseSampleIndex,
    sunsetSampleIndex,
    sunriseSide,
    sunsetSide,
    sunriseCity,
    sunsetCity,
    confidence: Math.round(confidence * 100) / 100,
    samples,
  };
}
