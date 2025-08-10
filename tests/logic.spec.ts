import { describe, it, expect } from "vitest";
import { extendSamples } from "@/lib/logic";
import type { Sample } from "@/lib/types";

describe("extendSamples", () => {
  it("computes relativeAzDeg and glare01 with altitude threshold", () => {
    const samples: Sample[] = [
      { lat: 0, lon: 0, alt: 10, az: 90, course: 90, side: "F", utc: "2020-01-01T00:00:00Z" },
      { lat: 0, lon: 0, alt: 10, az: 180, course: 90, side: "F", utc: "2020-01-01T00:05:00Z" },
      { lat: 0, lon: 0, alt: 3, az: 90, course: 90, side: "F", utc: "2020-01-01T00:10:00Z" },
    ];
    const out = extendSamples(samples);
    expect(out[0].relativeAzDeg).toBe(0);
    expect(out[0].glare01).toBeCloseTo(1, 5);
    expect(out[1].relativeAzDeg).toBe(90);
    expect(out[1].glare01).toBeCloseTo(0, 5);
    expect(out[2].glare01).toBe(0);
  });
});
