import { DateTime } from "luxon";

/** Format a JS Date into a specific zone */
export function formatLocal(d: Date, zone: string, fmt = "yyyy-LL-dd HH:mm") {
  return DateTime.fromJSDate(d).setZone(zone).toFormat(fmt);
}

/** Convert a local ISO (yyyy-MM-ddTHH:mm) in `fromZone` to a local ISO in `toZone` */
export function convertLocalISO(
  localIso: string,
  fromZone: string,
  toZone: string
): string {
  const dt = DateTime.fromISO(localIso, { zone: fromZone });
  return dt.setZone(toZone).toFormat("yyyy-LL-dd'T'HH:mm");
}

/** Convert a local ISO in `fromZone` to a UTC JS Date */
export function localISOToUTCDate(localIso: string, fromZone: string): Date {
  return DateTime.fromISO(localIso, { zone: fromZone }).toUTC().toJSDate();
}

/** Parse a UTC/local ISO (with or w/out zone) and return a JS Date in UTC */
export function toUTC(dateLike: string | Date) {
  if (dateLike instanceof Date)
    return DateTime.fromJSDate(dateLike).toUTC().toJSDate();
  return DateTime.fromISO(dateLike).toUTC().toJSDate();
}

/** Add minutes to a JS Date (returns a new Date) */
export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

/** Optional/helper: difference in whole minutes (b - a) */
export function diffMinutes(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}
