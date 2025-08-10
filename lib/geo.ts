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
  const f2 = Math.min(1, Math.max(0, f + eps));
  const p1 = intermediatePoint(a, b, f);
  const p2 = intermediatePoint(a, b, f2);
  return initialBearing(p1, p2);
}
