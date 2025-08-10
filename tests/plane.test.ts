import { describe, expect, it } from "vitest";
import { sunPlaneRelation } from "../lib/plane";

describe("sunPlaneRelation", () => {
  it("identifies sun on right (F)", () => {
    const r = sunPlaneRelation(270, 0, 10); // sun west relative to northbound plane
    expect(r.side).toBe("F");
  });

  it("identifies sun on left (A)", () => {
    const r = sunPlaneRelation(90, 0, 10); // sun east relative to northbound plane
    expect(r.side).toBe("A");
  });

  it("returns none when sun below horizon", () => {
    const r = sunPlaneRelation(90, 0, 0);
    expect(r.side).toBe("none");
    expect(r.intensity).toBe(0);
  });
});
