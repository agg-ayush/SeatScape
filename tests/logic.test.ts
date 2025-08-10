import { test, expect } from "vitest";
import { computeRecommendation } from "../lib/logic";
import type { Airport } from "../lib/types";

const DEL: Airport = {
  iata: "DEL",
  name: "Indira Gandhi International",
  lat: 28.556,
  lon: 77.1,
  tz: "Asia/Kolkata",
};
const DXB: Airport = {
  iata: "DXB",
  name: "Dubai International",
  lat: 25.253,
  lon: 55.365,
  tz: "Asia/Dubai",
};

test("DEL to DXB evening — should produce a side and not crash", () => {
  const rec = computeRecommendation({
    origin: DEL,
    dest: DXB,
    departLocalISO: "2025-08-10T18:30",
    preference: "see",
  });
  // sanity checks
  expect(rec.side === "A (left)" || rec.side === "F (right)").toBe(true);
  expect(rec.leftMinutes).toBeTypeOf("number");
  expect(rec.rightMinutes).toBeTypeOf("number");
  expect(rec.samples.length).toBeGreaterThan(0);
});

test("Sun already up at departure — no sunrise and sunset side captured", () => {
  const rec = computeRecommendation({
    origin: DEL,
    dest: DXB,
    departLocalISO: "2025-08-10T18:30",
    preference: "see",
  });
  expect(rec.sunriseUTC).toBeUndefined();
  expect(rec.sunriseSide).toBeUndefined();
  expect(rec.sunsetUTC).toBeDefined();
  expect(rec.sunsetSide).toBe("A");
});

test("DXB to DEL dawn flight — sunrise side and minutes after sunrise", () => {
  const rec = computeRecommendation({
    origin: DXB,
    dest: DEL,
    departLocalISO: "2025-08-10T06:00",
    preference: "see",
    sampleMinutes: 20,
  });
  expect(rec.sunriseUTC).toBeDefined();
  expect(rec.sunriseSide).toBe("F");
  expect(rec.rightMinutes).toBe(0);
  expect(rec.sunsetUTC).toBeUndefined();
  expect(rec.sunsetSide).toBeUndefined();
});
