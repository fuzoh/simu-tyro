import { describe, expect, test } from "vitest";

import { topView } from "./top-view.ts";

/** Points near Bern, well inside the LV95 domain; 0,01° is about 1,1 km north and 0,76 km east. */
const BOX = { width: 320, height: 200, pad: 24 };
const HERE = { lat: 46.95, lon: 7.44 };

describe("topView", () => {
  test("without both Positions the line is level, A on the left, and north is not claimed", () => {
    const view = topView({ A: HERE, B: null }, BOX);
    expect(view).toEqual({ A: { x: 24, y: 100 }, B: { x: 296, y: 100 }, unoriented: "absent" });
    expect(topView({ A: null, B: null }, BOX).unoriented).toBe("absent");
  });

  test("outside the domain the approximate grid holds for, north is not claimed either", () => {
    const view = topView({ A: { lat: 0, lon: 0 }, B: { lat: 0.01, lon: 0 } }, BOX);
    expect(view.unoriented).toBe("outside");
    expect(topView({ A: HERE, B: { lat: 0, lon: 0 } }, BOX).unoriented).toBe("outside");
  });

  test("B due east of A is drawn to the right, at the same height, across the whole width", () => {
    const view = topView({ A: HERE, B: { lat: HERE.lat, lon: HERE.lon + 0.01 } }, BOX);
    expect(view.unoriented).toBeNull();
    expect(view.A.x).toBeCloseTo(24, 6);
    expect(view.B.x).toBeCloseTo(296, 6);
    // The approximate grid's east axis tilts by a few metres over a kilometre: far under a pixel.
    expect(Math.abs(view.A.y - view.B.y)).toBeLessThan(1);
  });

  test("B due north of A is drawn above it, across the whole height", () => {
    const view = topView({ A: HERE, B: { lat: HERE.lat + 0.01, lon: HERE.lon } }, BOX);
    expect(view.unoriented).toBeNull();
    expect(view.A.y).toBeCloseTo(176, 6);
    expect(view.B.y).toBeCloseTo(24, 6);
    expect(Math.abs(view.A.x - view.B.x)).toBeLessThan(1);
  });

  test("one scale on both axes keeps the bearing: a north-east line stays inside the box", () => {
    const view = topView({ A: HERE, B: { lat: HERE.lat + 0.01, lon: HERE.lon + 0.01 } }, BOX);
    for (const point of [view.A, view.B]) {
      expect(point.x).toBeGreaterThanOrEqual(24 - 1e-9);
      expect(point.x).toBeLessThanOrEqual(296 + 1e-9);
      expect(point.y).toBeGreaterThanOrEqual(24 - 1e-9);
      expect(point.y).toBeLessThanOrEqual(176 + 1e-9);
    }
    expect(view.B.x).toBeGreaterThan(view.A.x);
    expect(view.B.y).toBeLessThan(view.A.y);
  });

  test("two Positions on one point give no bearing, so the line is drawn level", () => {
    expect(topView({ A: HERE, B: HERE }, BOX).unoriented).toBe("coincident");
  });
});
