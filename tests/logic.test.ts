import { test, expect } from "vitest";
import { computeRecommendation, estimateDurationMinutes } from "../lib/logic";
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

const EQ0: Airport = {
  iata: "EQ0",
  name: "Equator",
  lat: 0,
  lon: 0,
  tz: "Etc/UTC",
};

const N20: Airport = {
  iata: "N20",
  name: "20N",
  lat: 20,
  lon: 0,
  tz: "Etc/UTC",
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

test("flight duration estimation", () => {
  const mins = estimateDurationMinutes(DEL, DXB);
  expect(mins).toBeGreaterThan(100);
  expect(mins).toBeLessThan(200);
});

test("sunrise side determination", () => {
  const north = computeRecommendation({
    origin: EQ0,
    dest: N20,
    departLocalISO: "2025-08-10T04:50",
    preference: "see",
  });
  expect(north.sunriseSide).toBe("A");

  const south = computeRecommendation({
    origin: N20,
    dest: EQ0,
    departLocalISO: "2025-08-10T04:50",
    preference: "see",
  });
  expect(south.sunriseSide).toBe("F");
});

test("sunset side determination", () => {
  const north = computeRecommendation({
    origin: EQ0,
    dest: N20,
    departLocalISO: "2025-08-10T17:10",
    preference: "see",
  });
  expect(north.sunsetSide).toBe("F");

  const south = computeRecommendation({
    origin: N20,
    dest: EQ0,
    departLocalISO: "2025-08-10T17:10",
    preference: "see",
  });
  expect(south.sunsetSide).toBe("A");
});

test("custom arrival overrides duration", () => {
  const rec = computeRecommendation({
    origin: DEL,
    dest: DXB,
    departLocalISO: "2025-08-10T18:30",
    arriveLocalISO: "2025-08-10T19:00",
    preference: "see",
    sampleMinutes: 5,
  });
  expect(rec.samples.length).toBe(25);
});
