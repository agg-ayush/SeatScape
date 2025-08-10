export type Airport = {
  iata: string;
  name: string;
  lat: number;
  lon: number;
  tz: string; // IANA timezone
};

export type Preference = "see" | "avoid";

export type Sample = {
  lat: number;
  lon: number;
  utc: string; // ISO string in UTC
  az: number; // sun azimuth (deg, 0..360 from North, clockwise)
  alt: number; // sun altitude (deg)
  course: number; // aircraft course/bearing (deg, 0..360)
  side: "A" | "F" | "none";
};

export type Recommendation = {
  side: "A (left)" | "F (right)";
  leftMinutes: number;
  rightMinutes: number;
  peakAltitudeDeg: number;
  sunriseUTC?: string;
  sunriseSide?: "A" | "F";
  sunriseSampleIndex?: number;
  sunriseCity?: string;
  sunsetUTC?: string;
  sunsetSide?: "A" | "F";
  sunsetSampleIndex?: number;
  sunsetCity?: string;
  confidence: number; // 0..1
  samples: Sample[];
};
