import { describe, expect, it } from "vitest";

import { clampX } from "./geometry.ts";

describe("clampX", () => {
  it("leaves a viewpoint inside the span untouched", () => {
    expect(clampX(74.8, 150)).toBe(74.8);
  });

  it("brings a viewpoint outside the span back to the nearer end", () => {
    expect(clampX(400, 150)).toBe(150);
    expect(clampX(-12, 150)).toBe(0);
  });

  it("sends a non-finite viewpoint to 0, whatever the span", () => {
    expect(clampX(Number.NaN, 150)).toBe(0);
    expect(clampX(Number.POSITIVE_INFINITY, 150)).toBe(0);
    expect(clampX(Number.NEGATIVE_INFINITY, 150)).toBe(0);
    expect(clampX(Number.NaN, -5)).toBe(0);
  });

  it("does not clamp against a span that is not a span", () => {
    expect(clampX(74.8, -5)).toBe(74.8);
    expect(clampX(74.8, Number.NaN)).toBe(74.8);
  });
});
