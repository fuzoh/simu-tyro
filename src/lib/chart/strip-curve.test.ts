import { describe, expect, test } from "vitest";

import type { StripSample } from "./strip-curve.ts";

import { onDeficitStroke, onPlainStroke, stripCurve } from "./strip-curve.ts";

/** A sampled point, judged unless said otherwise. */
const at = (x: number, y: number | null, judged = true): StripSample => ({
  x,
  y,
  envelope: null,
  judged,
});

/**
 * The segments a stroke draws: d3's `line().defined()` joins two **consecutive** points only when
 * both are defined, so a segment is a pair of neighbours `[x₀, x₁]` the predicate keeps.
 */
function segments(points: readonly StripSample[], defined: (point: StripSample) => boolean) {
  const out: [number, number][] = [];
  for (let i = 1; i < points.length; i++) {
    if (defined(points[i - 1]) && defined(points[i])) out.push([points[i - 1].x, points[i].x]);
  }
  return out;
}

/** Every pair of solved neighbours is drawn by one stroke at least: the curve has no break. */
function unbroken(points: readonly StripSample[]): boolean {
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    if (a.y === null || b.y === null) continue;
    const drawn =
      (onPlainStroke(a) && onPlainStroke(b)) || (onDeficitStroke(a) && onDeficitStroke(b));
    if (!drawn) return false;
  }
  return true;
}

describe("the strip's two strokes — zero crossings", () => {
  test("a judged crossing is inserted on the zero line and shared, as before the zones", () => {
    const curve = stripCurve([at(0, 1), at(2, -1)]);
    expect(curve.map((point) => [point.x, point.y])).toEqual([
      [0, 1],
      [1, 0],
      [2, -1],
    ]);
    expect(segments(curve, onPlainStroke)).toEqual([[0, 1]]);
    expect(segments(curve, onDeficitStroke)).toEqual([[1, 2]]);
  });

  test("a hole on either side is not a crossing, and stays a break", () => {
    const curve = stripCurve([at(0, 1), at(1, null), at(2, -1)]);
    expect(curve).toHaveLength(3);
    expect(segments(curve, onPlainStroke)).toEqual([]);
    expect(segments(curve, onDeficitStroke)).toEqual([]);
  });
});

describe("the strip's two strokes at a Zone d'ancrage's edge (#106)", () => {
  test("negative on both sides of A's edge: the `foreground` stroke reaches the first judged point", () => {
    // x 9 is on A's platform (z = 10), x 11 is the first judged position: both are in the ground.
    const curve = stripCurve([at(8, -1, false), at(9, -1, false), at(11, -1), at(12, -2)]);
    expect(unbroken(curve)).toBe(true);
    expect(segments(curve, onPlainStroke)).toEqual([
      [8, 9],
      [9, 11],
    ]);
    // The red starts at the first judged point and never reaches into the zone.
    expect(segments(curve, onDeficitStroke)).toEqual([[11, 12]]);
  });

  test("negative on both sides of B's edge: the same, mirrored", () => {
    const curve = stripCurve([at(138, -2), at(139, -1), at(141, -1, false), at(142, -1, false)]);
    expect(unbroken(curve)).toBe(true);
    expect(segments(curve, onDeficitStroke)).toEqual([[138, 139]]);
    expect(segments(curve, onPlainStroke)).toEqual([
      [139, 141],
      [141, 142],
    ]);
  });

  test("a crossing between a zone and a judged deficit starts the red on the zero line", () => {
    // Above the ground on the platform, in it just past the edge: the garde trop faible juste hors
    // zone. The crossing at x 10 is the red's first point, not the judged sample at x 11.
    const curve = stripCurve([at(9, 1, false), at(11, -1)]);
    expect(curve.map((point) => [point.x, point.y])).toEqual([
      [9, 1],
      [10, 0],
      [11, -1],
    ]);
    expect(segments(curve, onPlainStroke)).toEqual([[9, 10]]);
    expect(segments(curve, onDeficitStroke)).toEqual([[10, 11]]);
  });

  test("leaving a judged deficit for a zone above the ground ends the red on the zero line", () => {
    const curve = stripCurve([at(139, -1), at(141, 1, false)]);
    expect(segments(curve, onDeficitStroke)).toEqual([[139, 140]]);
    expect(segments(curve, onPlainStroke)).toEqual([[140, 141]]);
  });

  test("in the ground inside a zone alone, nothing is red", () => {
    const curve = stripCurve([at(2, -1, false), at(4, -2, false), at(11, 1)]);
    expect(unbroken(curve)).toBe(true);
    expect(segments(curve, onDeficitStroke)).toEqual([]);
    expect(curve.some(onDeficitStroke)).toBe(false);
  });

  test("away from any edge, no point is bridged", () => {
    const curve = stripCurve([at(20, -1), at(21, -2), at(22, 1), at(30, 2)]);
    expect(curve.some((point) => point.bridge === true)).toBe(false);
  });
});
