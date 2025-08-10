import { Airport, Preference, Recommendation, Sample } from "./types";
import { gcDistanceKm, intermediatePoint, trackAt, wrapTo180 } from "./geo";
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
  let sunriseSide: "A" | "F" | undefined;
  let sunsetUTC: string | undefined;
  let sunsetSide: "A" | "F" | undefined;
  const samples: Sample[] = [];

  // Determine initial sun state at departure
  const initialSun = sunAt(depUTC, origin.lat, origin.lon);
  const initialCourse = trackAt(origin, dest, 0);
  let wasEffective = isSunEffective(initialSun.altitudeDeg);
  let prevSide: "A" | "F" | "none" = "none";
  if (wasEffective) {
    const rel0 = wrapTo180(initialSun.azimuthDeg - initialCourse);
    prevSide = rel0 > 0 ? "F" : "A";
  }

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
