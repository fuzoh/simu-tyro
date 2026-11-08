import { describe, expect, it } from "vitest";

import { kmhToMs, windComponents } from "./wind.ts";

describe("kmhToMs", () => {
  it("is exactly 1/3,6", () => {
    expect(kmhToMs(36)).toBe(10);
    expect(kmhToMs(3.6)).toBe(1);
    expect(kmhToMs(0)).toBe(0);
    expect(kmhToMs(50)).toBeCloseTo(13.888888888888889, 12);
  });
});

describe("windComponents — the wind projected on the line A → B", () => {
  const v = 13.5;

  it("0° is a head wind: along −v, across 0", () => {
    expect(windComponents(v, 0)).toEqual({ along: -v, across: 0 });
  });

  it("180° is a tail wind: along +v, across 0", () => {
    expect(windComponents(v, 180)).toEqual({ along: v, across: 0 });
  });

  it("90° and 270° have no component along the line and opposite crosswinds", () => {
    const right = windComponents(v, 90);
    const left = windComponents(v, 270);
    expect(right.along).toBe(0);
    expect(left.along).toBe(0);
    expect(Math.abs(right.across)).toBe(v);
    expect(left.across).toBe(-right.across);
  });

  it("a wind from the right is positive across, a wind from the left negative", () => {
    expect(windComponents(v, 90).across).toBeGreaterThan(0);
    expect(windComponents(v, 270).across).toBeLessThan(0);
  });

  it("reads the field trial's « de face, 45 à 55° à droite » as a head wind with a right-hand side", () => {
    const { along, across } = windComponents(kmhToMs(50), 50);
    expect(along).toBeLessThan(0);
    expect(across).toBeGreaterThan(0);
    expect(Math.hypot(along, across)).toBeCloseTo(kmhToMs(50), 12);
  });

  it("splits an oblique wind by cosine and sine", () => {
    const { along, across } = windComponents(10, 60);
    expect(along).toBeCloseTo(-5, 12);
    expect(across).toBeCloseTo(10 * Math.sin(Math.PI / 3), 12);
  });

  it("reads any angle modulo 360°", () => {
    expect(windComponents(v, 360)).toEqual(windComponents(v, 0));
    expect(windComponents(v, -90)).toEqual(windComponents(v, 270));
    expect(windComponents(v, 450)).toEqual(windComponents(v, 90));
  });

  it("no wind has no components, whatever the direction", () => {
    expect(windComponents(0, 123)).toEqual({ along: 0, across: 0 });
  });
});
