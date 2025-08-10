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

  function nearestCityName(lat: number, lon: number): strihttps://github.com/agg-ayush/SeatScape/pull/12/conflict?name=tests%252Flogic.test.ts&ancestor_oid=5a1bf7c5760c0aba3cb454ffa3feb34704b7069c&base_oid=590fd1fcc71e6a2697c17c04e4a5f3a6a53fc997&head_oid=f20fdd513e072ebef486cb8c360605dda8900fe0ng | undefined {
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
  let sunriseSide: "A" | "F" | undefined;
  let sunsetUTC: string | undefined;
  let sunriseSide: "A" | "F" | undefined;
  let sunsetSide: "A" | "F" | undefined;
  const samples: Sample[] = [];
  let prevSample: Sample | undefined;

  let wasEffective = false;
  let currentSide: "A" | "F" | undefined;

  for (let elapsed = 0; elapsed <= totalMinutes; elapsed += sampleMinutes) {
    const frac = elapsed / totalMinutes;
    const pos = intermediatePoint(origin, dest, frac);
    const course = trackAt(origin, dest, frac);
    const ts = addMinutes(depUTC, elapsed);

    const { azimuthDeg, altitudeDeg } = sunAt(ts, pos.lat, pos.lon);
    const isEffective = isSunEffective(altitudeDeg);

    let side: "A" | "F" | "none" = "none";
    if (isEffective) {
      const rel = wrapTo180(azimuthDeg - course);
      side = rel > 0 ? "F" : "A"; // right = F, left = A
    }

    if (!wasEffective && isEffective) {
      sunriseUTC = ts.toISOString();
      sunriseSide = side === "A" || side === "F" ? side : undefined;
    }

    if (wasEffective && !isEffective) {
      sunsetUTC = ts.toISOString();
      sunsetSide = prevSide === "A" || prevSide === "F" ? prevSide : undefined;
    }

    if (wasEffective && isEffective) {
      if (side === "A") leftMinutes += sampleMinutes;
      if (side === "F") rightMinutes += sampleMinutes;
      if (altitudeDeg > peakAltitudeDeg) peakAltitudeDeg = altitudeDeg;

      if (!wasEffective) {
        sunriseUTC = ts.toISOString();
        sunriseSide = side;
        wasEffective = true;
      }
      currentSide = side;
    } else {
      if (wasEffective) {
        sunsetUTC = ts.toISOString();
        sunsetSide = currentSide;
        wasEffective = false;
      }
    }

    if (isEffective && altitudeDeg > peakAltitudeDeg) peakAltitudeDeg = altitudeDeg;

    samples.push({
      lat: pos.lat,
      lon: pos.lon,
      utc: ts.toISOString(),
      az: azimuthDeg,
      alt: altitudeDeg,
      course,
      side,
    });

    wasEffective = isEffective;
    prevSide = side;
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
    sunsetUTC,
    sunsetSide,
    confidence: Math.round(confidence * 100) / 100,
    samples,
  };
}
