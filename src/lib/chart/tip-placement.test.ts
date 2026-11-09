import { describe, expect, test } from "vitest";

import { placeTip, tipRows } from "./tip-placement.ts";

const WIDTH = 800;
const PLOT = { top: 20, height: 300 };
const BASE = { width: WIDTH, plot: PLOT, lines: 2, tipWidth: 150 };

/** A symmetric V of half-slope `slope` (px of y per px of x) with its bottom at `(cx, cy)`. */
function vee(cx: number, cy: number, slope: number) {
  const xs = [0, cx, WIDTH];
  return { xs, ys: [cy - slope * cx, cy, cy - slope * (WIDTH - cx)] };
}

/** A straight line through `(x, y)` with a y-per-x `slope`. */
function straight(x: number, y: number, slope: number) {
  return { xs: [0, WIDTH], ys: [y - slope * x, y + slope * (WIDTH - x)] };
}

describe("the rider tip's placement", () => {
  test("stays right and above on a gentle slope", () => {
    const cable = straight(400, 200, 0.05);
    expect(placeTip({ ...BASE, x: 400, y: 200, cable })).toEqual({ left: false, below: false });
  });

  test("leaves the right-hand branch of a V's bottom: goes below the handle", () => {
    const cable = vee(400, 250, 0.8);
    const { left, below } = placeTip({ ...BASE, x: 400, y: 250, cable });
    // Both branches rise, so beneath the V's bottom is the only free side; the text never sits on a stroke.
    expect(below).toBe(true);
    const { top, bottom } = tipRows(250, 2, below);
    const from = left ? 400 - 14 - 150 : 414;
    for (const at of [from, from + 75, from + 150]) {
      const y = at < 400 ? 250 - 0.8 * (400 - at) : 250 - 0.8 * (at - 400);
      expect(y < top || y > bottom).toBe(true);
    }
  });

  test("avoids the second Brin's stroke too", () => {
    // A line rising to the right blocks right-above; one stroke leaves right-below free.
    const cable = straight(400, 200, -0.5);
    expect(placeTip({ ...BASE, x: 400, y: 200, cable })).toEqual({ left: false, below: true });
    // A second stroke 60 px lower crosses right-below: left-above is the free quadrant.
    expect(placeTip({ ...BASE, x: 400, y: 200, cable, offsets: [0, 60] })).toEqual({
      left: true,
      below: false,
    });
  });

  test("goes left of a rider on a descending-to-the-right line near B, inside the plot", () => {
    const cable = straight(760, 150, 0.05);
    const placed = placeTip({ ...BASE, x: 760, y: 150, cable });
    expect(placed.left).toBe(true);
  });

  test("near anchor A on a V, stays inside the plot", () => {
    const cable = vee(10, 250, 0.8);
    const placed = placeTip({ ...BASE, x: 10, y: 250, cable });
    expect(placed.left).toBe(false);
    expect(10 + 14 + 150).toBeLessThan(WIDTH);
  });

  test("near anchor B on a V, stays left and inside the plot", () => {
    const cable = vee(790, 250, 0.8);
    const placed = placeTip({ ...BASE, x: 790, y: 250, cable });
    expect(placed.left).toBe(true);
    expect(790 - 14 - 150).toBeGreaterThan(0);
  });

  test("goes below near the frame's top", () => {
    const cable = straight(400, 30, 0);
    expect(placeTip({ ...BASE, x: 400, y: 30, cable }).below).toBe(true);
  });

  test("stays above the ground when below would sink into it", () => {
    const cable = vee(400, 250, 0.1);
    const ground = { xs: [0, WIDTH], ys: [280, 280] };
    const placed = placeTip({ ...BASE, x: 400, y: 250, cable, ground });
    expect(placed.below).toBe(false);
  });

  test("avoids another drawn line, the A–B chord for one", () => {
    const cable = straight(400, 200, 0.05);
    const chord = straight(400, 185, 0);
    expect(placeTip({ ...BASE, x: 400, y: 200, cable, others: [chord] }).below).toBe(true);
  });

  test("with no line it keeps the default", () => {
    expect(placeTip({ ...BASE, x: 400, y: 200, cable: null })).toEqual({
      left: false,
      below: false,
    });
  });
});
