import SunCalc from "suncalc";

const toDeg = (r: number) => (r * 180) / Math.PI;

/** SunCalc azimuth is measured from South, positive West.
 *  We convert to compass bearing from North, clockwise: bearing = (azimuthDeg + 180) mod 360
 */
export function sunAt(d: Date, lat: number, lon: number) {
  const pos = SunCalc.getPosition(d, lat, lon);
  let azimuthDeg = (toDeg(pos.azimuth) + 180) % 360; // 0..360 from North
  if (azimuthDeg < 0) azimuthDeg += 360;
  const altitudeDeg = toDeg(pos.altitude);
  return { azimuthDeg, altitudeDeg };
}

/** Consider sun “effective” for seat decision only if altitude >= 5° */
export function isSunEffective(altDeg: number) {
  return altDeg >= 5;
}
