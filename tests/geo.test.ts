import { test, expect } from "vitest";
import {
  gcDistanceKm,
  initialBearing,
  intermediatePoint,
  splitAtAntimeridian,
} from "../lib/geo";
import { computeRecommendation } from "../lib/logic";
import type { Airport } from "../lib/types";

test("DEL–DXB distance is roughly in expected range", () => {
  const del = { lat: 28.556, lon: 77.1 };
  const dxb = { lat: 25.253, lon: 55.365 };
  const d = gcDistanceKm(del, dxb);
  expect(d).toBeGreaterThan(2000);
  expect(d).toBeLessThan(2500);
});

test("Initial bearing sanity", () => {
  const del = { lat: 28.556, lon: 77.1 };
  const dxb = { lat: 25.253, lon: 55.365 };
  const b = initialBearing(del, dxb);
  expect(b).toBeGreaterThanOrEqual(0);
  expect(b).toBeLessThan(360);
});

test("Intermediate point returns valid lat/lon", () => {
  const a = { lat: 0, lon: 0 };
  const b = { lat: 10, lon: 10 };
  const mid = intermediatePoint(a, b, 0.5);
  expect(mid.lat).toBeGreaterThan(-90);
  expect(mid.lat).toBeLessThan(90);
  expect(mid.lon).toBeGreaterThanOrEqual(-180);
  expect(mid.lon).toBeLessThanOrEqual(180);
});

test("splitAtAntimeridian handles polar-crossing routes", () => {
  const SFO: Airport = {
    iata: "SFO",
    name: "San Francisco International",
    lat: 37.618805,
    lon: -122.375416,
    tz: "America/Los_Angeles",
  };
  const DEL: Airport = {
    iata: "DEL",
    name: "Indira Gandhi International",
    lat: 28.556507,
    lon: 77.100281,
    tz: "Asia/Kolkata",
  };

  const rec = computeRecommendation({
    origin: SFO,
    dest: DEL,
    departLocalISO: "2025-01-01T00:00",
    preference: "see",
  });
  const segs = splitAtAntimeridian(rec.samples.map(s => [s.lon, s.lat]));
  expect(segs.length).toBeGreaterThan(1);
  for (const seg of segs) {
    for (let i = 1; i < seg.length; i++) {
      const diff = Math.abs(seg[i][0] - seg[i - 1][0]);
      expect(diff).toBeLessThanOrEqual(180);
    }
  }
});
