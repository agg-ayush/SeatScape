import { test, expect } from "vitest";
import { gcDistanceKm, initialBearing, intermediatePoint } from "../lib/geo";

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
