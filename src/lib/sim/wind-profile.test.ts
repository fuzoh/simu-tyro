import { describe, expect, it, test } from "vitest";

import type { WindField } from "./wind-profile.ts";

import { WIND_PROFILE, windAt, windProfileShape, windProfileSpeed } from "./wind-profile.ts";
import { kmhToMs, windComponents } from "./wind.ts";

/**
 * Every expected value below is derived from `docs/simulation-theory.md` §8.4's four lines by hand
 * — an identity of the shape, a closed form, or a bound proved from it — and none is read off the
 * function under test. A `cos` the machine evaluates is held to 1e-12; what §8.4 states as exact is
 * asserted exact.
 */
const TRIG = 1e-12;

/** Every width a field can hold: the domain at its 1-point step. */
const WIDTHS = Array.from(
  { length: WIND_PROFILE.width.max - WIND_PROFILE.width.min + 1 },
  (_, i) => WIND_PROFILE.width.min + i,
);

/** The ends and the middle of the width domain. */
const EDGE_WIDTHS = [10, 50, 90] as const;

describe("WIND_PROFILE — §8.4's domains and what ships", () => {
  it("is a width of 10–90 % shipped at 50, and an attenuation of 0–100 % shipped at 0", () => {
    expect(WIND_PROFILE).toEqual({
      width: { min: 10, max: 90, shipped: 50 },
      attenuation: { min: 0, max: 100, shipped: 0 },
    });
    expect(WIDTHS).toHaveLength(81);
  });
});

describe("windProfileShape — φ(ξ)", () => {
  it("is 1 at mid-span and 0 at both anchors, exactly, at every width", () => {
    for (const width of WIDTHS) {
      expect(windProfileShape(0.5, width)).toBe(1);
      expect(windProfileShape(0, width)).toBe(0);
      expect(windProfileShape(1, width)).toBe(0);
    }
  });

  it("is 1/2 a quarter of the span from each anchor at a width of 50 %", () => {
    // λ = 1/2: the half-gap points are ξ = (1 ± 1/2)/2.
    expect(windProfileShape(0.25, 50)).toBeCloseTo(0.5, 12);
    expect(windProfileShape(0.75, 50)).toBeCloseTo(0.5, 12);
  });

  test.each(WIDTHS)("width %d: is 1/2 at the two points that share of the span apart", (width) => {
    // χ = λ ⇒ χ^p = 1/2 ⇒ h = 1/2 ⇒ φ = cos²(π/4).
    const lambda = width / 100;
    expect(Math.abs(windProfileShape((1 - lambda) / 2, width) - 0.5)).toBeLessThan(TRIG);
    expect(Math.abs(windProfileShape((1 + lambda) / 2, width) - 0.5)).toBeLessThan(TRIG);
  });

  it("is cos²(π(2 − √2)/8) at ξ = 3/8 and 50 % — not the bare cosine power's (2 + √2)/4", () => {
    // p = 1 and χ = 1/4: h(1/4) = sin²(π/8) = (2 − √2)/4, so the angle is (π/2)·(2 − √2)/4.
    const expected = Math.cos((Math.PI * (2 - Math.SQRT2)) / 8) ** 2;
    expect(Math.abs(windProfileShape(3 / 8, 50) - expected)).toBeLessThan(TRIG);
    expect(Math.abs(windProfileShape(5 / 8, 50) - expected)).toBeLessThan(TRIG);
    // `cos²((π/2)·χ^p)` agrees at mid-span, at the half-gap and at the anchors, and nowhere else.
    expect(Math.abs(windProfileShape(3 / 8, 50) - (2 + Math.SQRT2) / 4)).toBeGreaterThan(0.05);
  });

  it("is symmetric about mid-span", () => {
    // Dyadic ξ, so `|2ξ − 1|` is the same float on both sides and the equality is exact.
    for (const width of EDGE_WIDTHS) {
      for (const xi of [0, 1 / 8, 1 / 4, 3 / 8, 1 / 2]) {
        expect(windProfileShape(1 - xi, width)).toBe(windProfileShape(xi, width));
      }
    }
  });

  it("falls strictly from mid-span to an anchor, with no plateau at its top", () => {
    for (const width of EDGE_WIDTHS) {
      const falling = [1 / 2, 5 / 8, 3 / 4, 7 / 8, 1].map((xi) => windProfileShape(xi, width));
      for (let i = 1; i < falling.length; i++) {
        expect(falling[i]).toBeLessThan(falling[i - 1]);
      }
    }
  });

  it("never rises toward an anchor on a fine grid, and stays within [0, 1]", () => {
    // Not strict: far up the bell the fall is below a double's last bit.
    for (const width of EDGE_WIDTHS) {
      let previous = 1;
      for (let step = 0; step <= 512; step++) {
        const value = windProfileShape(0.5 + step / 1024, width);
        expect(value).toBeLessThanOrEqual(previous);
        expect(value).toBeGreaterThanOrEqual(0);
        previous = value;
      }
    }
  });

  it("is level at mid-span at the narrowest width, under §8.4's bound", () => {
    // 1 − φ ≤ (π/2)⁶·χ^(4p) with χ = 2·step, so the quotient is ≤ (π/2)⁶·2^(4p)·step^(4p − 1).
    const p = Math.LN2 / Math.LN10;
    const quotient = (step: number) => Math.abs((windProfileShape(0.5 + step, 10) - 1) / step);
    for (const step of [1e-3, 1e-4, 1e-5]) {
      const bound = (Math.PI / 2) ** 6 * 2 ** (4 * p) * step ** (4 * p - 1);
      expect(quotient(step)).toBeLessThanOrEqual(bound);
    }
  });

  test.each(EDGE_WIDTHS)("width %d: the slope never grows toward mid-span", (width) => {
    // Absolute quotients, as the step shrinks — the bare cosine power's grow at 10 %.
    const quotient = (step: number) => Math.abs((windProfileShape(0.5 + step, width) - 1) / step);
    expect(quotient(1e-4)).toBeLessThanOrEqual(quotient(1e-3));
    expect(quotient(1e-5)).toBeLessThanOrEqual(quotient(1e-4));
  });

  test.each([10, 50])("width %d: the slope vanishes toward mid-span", (width) => {
    // Strictly. At 90 % the fall this close to mid-span is below a double's last bit, and the
    // quotients are all zero: nothing to compare there.
    const quotient = (step: number) => Math.abs((windProfileShape(0.5 + step, width) - 1) / step);
    expect(quotient(1e-5)).toBeLessThan(quotient(1e-3));
  });

  test.each(EDGE_WIDTHS)("width %d: level at both anchors", (width) => {
    // φ ≤ (π/2)⁶·(p·δ)⁴ near an anchor: at 90 % and a step of 1e-3 that is 4,5e-4 per unit of ξ.
    const step = 1e-3;
    const atB = Math.abs((windProfileShape(1, width) - windProfileShape(1 - step, width)) / step);
    const atA = Math.abs((windProfileShape(step, width) - windProfileShape(0, width)) / step);
    expect(atB).toBeLessThan(1e-3);
    expect(atA).toBeLessThan(1e-3);
  });

  it("rises point by point between the anchors as the width grows", () => {
    for (const xi of [1 / 8, 1 / 4, 3 / 8]) {
      expect(windProfileShape(xi, 60)).toBeGreaterThan(windProfileShape(xi, 40));
      expect(windProfileShape(xi, 90)).toBeGreaterThan(windProfileShape(xi, 60));
    }
  });

  it("refuses a share outside the span and a width outside its domain", () => {
    for (const xi of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => windProfileShape(xi, 50)).toThrow(RangeError);
    }
    for (const width of [9, 9.99, 90.01, 91, 100, 0, -1, Number.NaN]) {
      expect(() => windProfileShape(0.25, width)).toThrow(RangeError);
    }
  });
});

describe("windProfileSpeed — U(ξ) = V·[(1 − α) + α·φ(ξ)]", () => {
  it("reads 40 at mid-span, 10 at the anchors and 25 at the half-gap for 40 km/h at 75 %", () => {
    const profile = { width: 50, attenuation: 75 };
    expect(windProfileSpeed(40, profile, 0.5)).toBe(40);
    expect(windProfileSpeed(40, profile, 0)).toBe(10);
    expect(windProfileSpeed(40, profile, 1)).toBe(10);
    // Halfway between 10 and 40.
    expect(Math.abs(windProfileSpeed(40, profile, 0.25) - 25)).toBeLessThan(TRIG);
    expect(Math.abs(windProfileSpeed(40, profile, 0.75) - 25)).toBeLessThan(TRIG);
  });

  test.each(WIDTHS)("width %d: reads V·(1 − α/2) at the half-gap", (width) => {
    const lambda = width / 100;
    // 40 km/h at 60 %: the anchors read 16, and halfway to 40 is 28.
    const profile = { width, attenuation: 60 };
    expect(Math.abs(windProfileSpeed(40, profile, (1 - lambda) / 2) - 28)).toBeLessThan(TRIG);
    expect(Math.abs(windProfileSpeed(40, profile, (1 + lambda) / 2) - 28)).toBeLessThan(TRIG);
  });

  it("is exactly the entered speed everywhere without attenuation, whatever the width", () => {
    for (const width of EDGE_WIDTHS) {
      for (const xi of [0, 1 / 4, 1 / 3, 1 / 2, 0.7, 1]) {
        expect(windProfileSpeed(40, { width, attenuation: 0 }, xi)).toBe(40);
        expect(windProfileSpeed(13.9, { width, attenuation: 0 }, xi)).toBe(13.9);
      }
    }
  });

  it("is nil at the anchors and whole at mid-span at 100 %", () => {
    const profile = { width: 10, attenuation: 100 };
    expect(windProfileSpeed(40, profile, 0)).toBe(0);
    expect(windProfileSpeed(40, profile, 1)).toBe(0);
    expect(windProfileSpeed(40, profile, 0.5)).toBe(40);
    // The half-gap of a 10 % width: ξ = (1 ± 0,1)/2, halfway between 0 and 40.
    expect(Math.abs(windProfileSpeed(40, profile, 0.45) - 20)).toBeLessThan(TRIG);
  });

  it("is zero everywhere without wind, and never a negative zero", () => {
    for (const xi of [0, 1 / 4, 3 / 8, 1 / 2, 1]) {
      expect(windProfileSpeed(0, { width: 90, attenuation: 100 }, xi)).toBe(0);
    }
  });

  it("lowers the speed everywhere but at mid-span as the attenuation grows", () => {
    for (const xi of [0, 1 / 8, 1 / 4, 3 / 8]) {
      const light = windProfileSpeed(40, { width: 50, attenuation: 25 }, xi);
      const strong = windProfileSpeed(40, { width: 50, attenuation: 75 }, xi);
      expect(strong).toBeLessThan(light);
      expect(light).toBeLessThan(40);
    }
    expect(windProfileSpeed(40, { width: 50, attenuation: 25 }, 0.5)).toBe(40);
  });

  it("scales with the entered speed, so the unit is the caller's", () => {
    const profile = { width: 30, attenuation: 40 };
    for (const xi of [1 / 8, 1 / 4, 3 / 8]) {
      const kmh = windProfileSpeed(40, profile, xi);
      expect(windProfileSpeed(kmhToMs(40), profile, xi)).toBeCloseTo(kmhToMs(kmh), 12);
    }
  });

  it("leaves the profile it is given as it was", () => {
    const profile = Object.freeze({ width: 90, attenuation: 100 });
    windProfileSpeed(0, profile, 0.25);
    expect(profile).toEqual({ width: 90, attenuation: 100 });
  });

  it("refuses a parameter outside its domain rather than reading a uniform wind", () => {
    for (const width of [9, 91, -1, 100]) {
      // Not 40: a width outside its domain is not « no effect », even without attenuation.
      expect(() => windProfileSpeed(40, { width, attenuation: 0 }, 0.25)).toThrow(RangeError);
      expect(() => windProfileSpeed(40, { width, attenuation: 50 }, 0.25)).toThrow(RangeError);
    }
    for (const attenuation of [-1, 100.5, 101, Number.NaN]) {
      expect(() => windProfileSpeed(40, { width: 50, attenuation }, 0.5)).toThrow(RangeError);
    }
    for (const speed of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => windProfileSpeed(speed, { width: 50, attenuation: 0 }, 0.5)).toThrow(RangeError);
    }
    expect(() => windProfileSpeed(40, { width: 50, attenuation: 50 }, 1.5)).toThrow(RangeError);
  });
});

describe("windAt — the local wind projected on the line", () => {
  const L = 240;
  /** A north wind of 10 m/s at mid-span, on a line running due north: all of it head-on. */
  const NORTH = 0;
  const field: WindField = { speed: 10, from: 0, profile: { width: 50, attenuation: 75 } };

  it("reads the profile at the point asked: whole at mid-span, the residual at the anchors", () => {
    expect(windAt(field, L / 2, L, NORTH)).toEqual({ along: -10, across: 0 });
    expect(windAt(field, 0, L, NORTH)).toEqual({ along: -2.5, across: 0 });
    expect(windAt(field, L, L, NORTH)).toEqual({ along: -2.5, across: 0 });
    // The half-gap, a quarter of the span in: halfway between 2,5 and 10.
    expect(windAt(field, L / 4, L, NORTH).along).toBeCloseTo(-6.25, 12);
    expect(windAt(field, (3 * L) / 4, L, NORTH).along).toBeCloseTo(-6.25, 12);
  });

  it("is not one speed for the span: two points of a modulated wind read two winds", () => {
    const quarter = windAt(field, L / 4, L, NORTH).along;
    const eighth = windAt(field, L / 8, L, NORTH).along;
    expect(Math.abs(eighth)).toBeLessThan(Math.abs(quarter));
    expect(Math.abs(quarter)).toBeLessThan(10);
  });

  it("keeps one direction along the line: the two components scale together", () => {
    // 264° on a line at 312°: cos 48° = 0,6691306 along, sin 48° = 0,7431448 across.
    const oblique: WindField = { ...field, from: 264 };
    const mid = windAt(oblique, L / 2, L, 312);
    const anchor = windAt(oblique, 0, L, 312);
    expect(mid.along).toBeCloseTo(-6.691306, 6);
    expect(mid.across).toBeCloseTo(-7.431448, 6);
    expect(anchor.along).toBeCloseTo(mid.along / 4, 12);
    expect(anchor.across).toBeCloseTo(mid.across / 4, 12);
  });

  it("is the uniform wind's projection, bit for bit, without attenuation", () => {
    const uniform: WindField = { speed: 8.3, from: 264, profile: { width: 30, attenuation: 0 } };
    for (const x of [0, 17, L / 3, L / 2, 199.9, L]) {
      expect(windAt(uniform, x, L, 312)).toEqual(windComponents(8.3, 264, 312));
    }
  });

  it("is no wind at all where the profile is nil, with no direction left behind", () => {
    const sheltered: WindField = { speed: 10, from: 264, profile: { width: 50, attenuation: 100 } };
    expect(windAt(sheltered, 0, L, 312)).toEqual({ along: 0, across: 0 });
    expect(windAt(sheltered, L, L, 312)).toEqual({ along: 0, across: 0 });
    expect(windAt({ ...sheltered, speed: 0 }, L / 3, L, 312)).toEqual({ along: 0, across: 0 });
  });

  it("has no value outside the span, and none on a span that is not one", () => {
    for (const x of [-0.001, L + 0.001, Number.NaN]) {
      expect(() => windAt(field, x, L, NORTH)).toThrow(RangeError);
    }
    for (const span of [0, -L, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => windAt(field, 0, span, NORTH)).toThrow(RangeError);
    }
  });
});
