import { describe, expect, it } from "vitest";

import { kmhToMs, msToKmh, windComponents } from "./wind.ts";

describe("kmhToMs", () => {
  it("is exactly 1/3,6", () => {
    expect(kmhToMs(36)).toBe(10);
    expect(kmhToMs(3.6)).toBe(1);
    expect(kmhToMs(0)).toBe(0);
    expect(kmhToMs(50)).toBeCloseTo(13.888888888888889, 12);
  });
});

describe("msToKmh", () => {
  it("is the inverse of kmhToMs", () => {
    expect(msToKmh(10)).toBeCloseTo(36, 12);
    expect(msToKmh(kmhToMs(50))).toBeCloseTo(50, 12);
  });
});

describe("windComponents — the wind projected on the line A → B", () => {
  const v = 13.5;
  // On a line running due north the azimuth the wind comes from is its angle from head-on.
  const NORTH = 0;

  it("a wind from the line's own bearing is a head wind: along −v, across 0", () => {
    expect(windComponents(v, 0, NORTH)).toEqual({ along: -v, across: 0 });
    expect(windComponents(v, 312, 312)).toEqual({ along: -v, across: 0 });
  });

  it("a wind from behind the line is a tail wind: along +v, across 0", () => {
    expect(windComponents(v, 180, NORTH)).toEqual({ along: v, across: 0 });
    expect(windComponents(v, 132, 312)).toEqual({ along: v, across: 0 });
  });

  it("a wind square to the line has no component along it, and the two sides are opposite", () => {
    const right = windComponents(v, 90, NORTH);
    const left = windComponents(v, 270, NORTH);
    expect(right.along).toBe(0);
    expect(left.along).toBe(0);
    expect(Math.abs(right.across)).toBe(v);
    expect(left.across).toBe(-right.across);
  });

  it("a wind from the right is positive across, a wind from the left negative", () => {
    // Travelling east, a south wind comes from the right and a north wind from the left.
    expect(windComponents(v, 180, 90).across).toBeGreaterThan(0);
    expect(windComponents(v, 0, 90).across).toBeLessThan(0);
  });

  it("reads the trial's west wind on its line at 312° as a head wind from the left", () => {
    // 264° − 312° = −48°, so 312° from head-on: along = −10·cos 48° = −6,691306,
    // across = 10·sin 312° = −10·sin 48° = −7,431448 (cos 48° = 0,6691306, sin 48° = 0,7431448).
    const { along, across } = windComponents(10, 264, 312);
    expect(along).toBeCloseTo(-6.691306, 6);
    expect(across).toBeCloseTo(-7.431448, 6);
  });

  it("splits an oblique wind by cosine and sine", () => {
    const { along, across } = windComponents(10, 60, NORTH);
    expect(along).toBeCloseTo(-5, 12);
    expect(across).toBeCloseTo(10 * Math.sin(Math.PI / 3), 12);
  });

  it("turning the line under a fixed wind changes the components; turning both does not", () => {
    const before = windComponents(v, 264, 312);
    const moved = windComponents(v, 264, 315);
    expect(moved.along).not.toBeCloseTo(before.along, 6);
    expect(moved.across).not.toBeCloseTo(before.across, 6);
    const both = windComponents(v, 264 + 3, 315);
    expect(both.along).toBeCloseTo(before.along, 12);
    expect(both.across).toBeCloseTo(before.across, 12);
    expect(Math.hypot(moved.along, moved.across)).toBeCloseTo(v, 12);
  });

  it("reads both angles modulo 360°", () => {
    expect(windComponents(v, 360, NORTH)).toEqual(windComponents(v, 0, NORTH));
    expect(windComponents(v, -90, NORTH)).toEqual(windComponents(v, 270, NORTH));
    expect(windComponents(v, 450, NORTH)).toEqual(windComponents(v, 90, NORTH));
    expect(windComponents(v, 30, 390)).toEqual(windComponents(v, 0, NORTH));
  });

  it("no wind has no components, whatever the directions", () => {
    expect(windComponents(0, 123, 45)).toEqual({ along: 0, across: 0 });
  });
});
