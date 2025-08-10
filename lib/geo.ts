/** Great-circle helpers on a sphere (WGS84 mean radius). */
const R = 6371_008.8; // meters -> km baseline, but we return km

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Normalize angle to (-180, 180] */
export const wrapTo180 = (x: number) => {
  const a = (((x + 180) % 360) + 360) % 360; // 0..360
  return a > 180 ? a - 360 : a;
};

/** Normalize angle to [0, 360) */
const wrap360 = (x: number) => {
  let a = x % 360;
  if (a < 0) a += 360;
  return a;
};

type P = { lat: number; lon: number };

/** Haversine distance in km */
export function gcDistanceKm(a: P, b: P): number {
  const φ1 = toRad(a.lat),
    φ2 = toRad(b.lat);
  const Δφ = toRad(b.lat - a.lat);
  const Δλ = toRad(b.lon - a.lon);
  const s =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const d = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return (R * d) / 1000; // km
}

/** Initial bearing from a to b (deg, 0..360 from North, clockwise) */
export function initialBearing(a: P, b: P): number {
  const φ1 = toRad(a.lat),
    φ2 = toRad(b.lat);
  const λ1 = toRad(a.lon),
    λ2 = toRad(b.lon);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  return wrap360(toDeg(Math.atan2(y, x)));
}

/** Great-circle intermediate point for fraction f∈[0,1] using slerp */
export function intermediatePoint(a: P, b: P, f: number): P {
  const φ1 = toRad(a.lat),
    λ1 = toRad(a.lon);
  const φ2 = toRad(b.lat),
    λ2 = toRad(b.lon);

  const Δ =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
      )
    );

  if (Δ === 0) return { lat: a.lat, lon: a.lon };

  const A = Math.sin((1 - f) * Δ) / Math.sin(Δ);
  const B = Math.sin(f * Δ) / Math.sin(Δ);

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λ = Math.atan2(y, x);

  return { lat: toDeg(φ), lon: toDeg(λ) };
}

/** Course (bearing) along the great-circle at fraction f.
 *  Implemented as the bearing from p(f) to p(f+ε) with a tiny ε.
 */
export function trackAt(a: P, b: P, f: number): number {
  const eps = 1e-6;
  const f1 = Math.max(0, Math.min(1, f - eps));
  const f2 = Math.max(0, Math.min(1, f + eps));
  const p1 = intermediatePoint(a, b, f1);
  const p2 = intermediatePoint(a, b, f2);
  return initialBearing(p1, p2);
}

// Keep lon in [-180, 180]
export function normalizeLon(lon: number): number {
  let x = lon;
  while (x <= -180) x += 360;
  while (x > 180) x -= 360;
  return x;
}

const WEB_MERCATOR_MAX_LAT = 85.05112878;

export function clampWebMercatorLat(lat: number): number {
  return Math.max(-WEB_MERCATOR_MAX_LAT, Math.min(WEB_MERCATOR_MAX_LAT, lat));
}

/**
 * Given a dense list of [lon,lat] points (already on the great-circle),
 * split into segments so no segment crosses the anti-meridian abruptly.
 * Returns an array of segments; each segment is an array of [lon,lat].
 */
export function splitAtAntimeridian(points: [number, number][]): [number, number][][] {
  if (points.length < 2) return [points];

  const out: [number, number][][] = [];
  let seg: [number, number][] = [];
  seg.push([normalizeLon(points[0][0]), clampWebMercatorLat(points[0][1])]);

  for (let i = 1; i < points.length; i++) {
    const [lon0, lat0] = seg[seg.length - 1];
    let [lon1, lat1] = points[i];
    lon1 = normalizeLon(lon1);
    lat1 = clampWebMercatorLat(lat1);

    let d = lon1 - lon0;
    // Choose the shorter wrap direction
    if (d > 180) d -= 360;
    if (d < -180) d += 360;

    // If still too big, we cross the anti-meridian. Interpolate a cut.
    if (Math.abs(d) > 180 - 1e-6) {
      // Theoretically shouldn’t happen after shortest-wrap; keep as safety.
      d = d > 0 ? 180 : -180;
    }

    // Simple and effective approach:
    if (Math.abs(lon1 - lon0) > 180) {
      // Compute where the segment hits ±180 in normalized space
      const target = lon0 < 0 ? -180 : 180;
      const t = (target - lon0) / (lon1 - lon0);
      const latAtCut = clampWebMercatorLat(lat0 + t * (lat1 - lat0));
      // Close current segment at the cut
      seg.push([target, latAtCut]);
      out.push(seg);
      // Start a new segment on the other side
      const wrappedTarget = target === 180 ? -180 : 180;
      seg = [[wrappedTarget, latAtCut], [lon1, lat1]];
    } else {
      seg.push([lon1, lat1]);
    }
  }

  if (seg.length) out.push(seg);
  return out;
}
