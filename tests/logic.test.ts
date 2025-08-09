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
