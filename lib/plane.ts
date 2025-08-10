import { wrapTo180 } from "./geo";

export type SunPlaneRelation = {
  /** relative azimuth of sun from aircraft nose, degrees (-180..180) */
  relAz: number;
  /** which side of aircraft receives sun */
  side: "A" | "F" | "none";
  /** glare intensity 0..1 based on altitude */
  intensity: number;
};

/**
 * Determine sun side and glare intensity relative to aircraft course.
 * @param az Sun azimuth in degrees (0..360 from north)
 * @param course Aircraft course/bearing in degrees (0..360 from north)
 * @param alt Sun altitude in degrees
 */
export function sunPlaneRelation(
  az: number,
  course: number,
  alt: number
): SunPlaneRelation {
  const rel = wrapTo180(az - course);
  const intensity = Math.max(0, Math.min(1, alt / 90));
  let side: "A" | "F" | "none" = "none";
  if (alt >= 5) {
    const absRel = Math.abs(rel);
    if (absRel >= 20 && absRel <= 160) {
      side = rel > 0 ? "F" : "A";
    }
  }
  return { relAz: rel, side, intensity };
}

