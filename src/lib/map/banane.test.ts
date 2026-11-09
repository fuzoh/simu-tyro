/**
 * The Banane (#96): a shape drawn from the wind's cross component, never a distance. The tests read
 * it as the reader does — which side the belly is on, how much it grows with the wind, where it
 * vanishes — on a line due east, where « left of the travel » is north and a wind from the south
 * comes from the right.
 */

import { describe, expect, test } from "vitest";

import { BANANE_FACTOR } from "@/lib/layout/contract.ts";
import { lineBearing } from "@/lib/scenario/geometry.ts";
import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";

import { bananeAcross, bananeBow, bananeOnDrawing, bananePath, BANANE_STEPS } from "./banane.ts";

const EAST = { A: { lat: 46, lon: 7 }, B: { lat: 46, lon: 7.01 } };
/** Travelling east: a wind from the east is a head wind, from the south comes from the right. */
const EAST_BEARING = 90;

/** The point farthest from the line A–B, as a north offset in degrees of latitude. */
function belly(path: readonly { lat: number }[], lat: number): number {
  const offsets = path.map((point) => point.lat - lat);
  return offsets.reduce((far, offset) => (Math.abs(offset) > Math.abs(far) ? offset : far), 0);
}

/** The cross component of a Vent from `directionDeg` — an azimuth — on a line at `bearing`. */
function crossWind(speedKmh: number, directionDeg: number, bearing: number = EAST_BEARING) {
  return bananeAcross({ speedKmh, directionDeg }, bearing);
}

describe("the Banane on the earth", () => {
  test("without wind it is the line A–B", () => {
    const path = bananePath(EAST, crossWind(0, 90));
    expect(path).not.toBeNull();
    for (const [i, point] of (path ?? []).entries()) {
      const t = i / BANANE_STEPS;
      expect(point.lon).toBeCloseTo(EAST.A.lon + t * 0.01, 12);
      expect(point.lat).toBeCloseTo(46, 12);
    }
  });

  test("a pure head wind or tail wind draws no bow", () => {
    for (const direction of [90, 270]) {
      const path = bananePath(EAST, crossWind(40, direction)) ?? [];
      expect(belly(path, 46)).toBeCloseTo(0, 12);
    }
  });

  test("a wind from the right bows the line to the left of the travel, the lee side", () => {
    // Travelling east, a south wind comes from the right, and left is north.
    const path = bananePath(EAST, crossWind(30, 180)) ?? [];
    expect(belly(path, 46)).toBeGreaterThan(0);
    // The belly is mid-span, and both anchors stay where they are.
    expect(path[BANANE_STEPS / 2]?.lat).toBeCloseTo(46 + belly(path, 46), 12);
    expect(path[0]).toEqual(EAST.A);
    expect(path.at(-1)?.lat).toBeCloseTo(EAST.B.lat, 12);
    expect(path.at(-1)?.lon).toBeCloseTo(EAST.B.lon, 12);
  });

  test("a wind from the left bows it the other way", () => {
    const path = bananePath(EAST, crossWind(30, 0)) ?? [];
    expect(belly(path, 46)).toBeLessThan(0);
  });

  test("on any bearing the lee side is the left of the travel", () => {
    // The trial's line runs at ≈ 312°: a wind from 42°, 90° clockwise of it, comes from the right.
    const bearing = lineBearing(TRIAL_ENDS) ?? Number.NaN;
    const path = bananePath(TRIAL_ENDS, crossWind(30, bearing + 90, bearing)) ?? [];
    const { A, B } = TRIAL_ENDS;
    const cos = Math.cos((((A.lat + B.lat) / 2) * Math.PI) / 180);
    const travel = { east: (B.lon - A.lon) * cos, north: B.lat - A.lat };
    const middle = path[BANANE_STEPS / 2];
    if (middle === undefined) throw new Error("the Banane has a middle");
    const off = {
      east: (middle.lon - (A.lon + B.lon) / 2) * cos,
      north: middle.lat - (A.lat + B.lat) / 2,
    };
    // Left of the travel: the cross product travel × offset is positive.
    expect(travel.east * off.north - travel.north * off.east).toBeGreaterThan(0);
    // And square to the line.
    expect(travel.east * off.east + travel.north * off.north).toBeCloseTo(0, 12);
  });

  test("twice the wind draws twice the bow", () => {
    const once = belly(bananePath(EAST, crossWind(20, 180)) ?? [], 46);
    const twice = belly(bananePath(EAST, crossWind(40, 180)) ?? [], 46);
    expect(twice / once).toBeCloseTo(2, 9);
  });

  test("only the cross component counts: a wind at 45° bows less than one square on", () => {
    const square = belly(bananePath(EAST, crossWind(30, 180)) ?? [], 46);
    const slant = belly(bananePath(EAST, crossWind(30, 135)) ?? [], 46);
    expect(slant / square).toBeCloseTo(Math.sin(Math.PI / 4), 9);
  });

  test("the same Vent bows a line that turns by the sine of its new angle", () => {
    // A south wind is square to a line running east, and 45° off one running north-east.
    const square = crossWind(30, 180, 90);
    expect(crossWind(30, 180, 45) / square).toBeCloseTo(Math.sin(Math.PI / 4), 9);
    // Running north, the same south wind is a tail wind: no bow.
    expect(crossWind(30, 180, 0)).toBeCloseTo(0, 12);
  });

  test("without a bearing — no Positions — no Vent bows the line", () => {
    expect(bananeAcross({ speedKmh: 30, directionDeg: 180 }, null)).toBe(0);
  });

  test("is nothing while a Position is missing", () => {
    expect(bananePath({ A: EAST.A, B: null }, 5)).toBeNull();
    expect(bananePath({ A: null, B: null }, 5)).toBeNull();
  });
});

describe("the bow's size", () => {
  test("is a share of the line per m/s of cross wind, the [CONVENTION] factor", () => {
    expect(bananeBow(0.5, 10)).toBeCloseTo(BANANE_FACTOR * 10, 12);
    expect(bananeBow(0, 10)).toBe(0);
    expect(bananeBow(1, 10)).toBe(0);
  });

  test("km/h are turned into m/s before it is read", () => {
    expect(crossWind(36, 180)).toBeCloseTo(10, 12);
  });
});

describe("the Banane on the plain drawing, y downward", () => {
  const A = { x: 28, y: 110 };
  const B = { x: 302, y: 110 };

  test("a wind from the right bows a level line upward, to the left of the travel", () => {
    const path = bananeOnDrawing(A, B, crossWind(30, 180));
    const middle = path[BANANE_STEPS / 2];
    expect(middle?.x).toBeCloseTo(165, 9);
    expect(middle?.y).toBeLessThan(110);
    expect(110 - (middle?.y ?? 110)).toBeCloseTo(BANANE_FACTOR * crossWind(30, 180) * 274, 9);
  });

  test("without wind it lies on the line", () => {
    for (const point of bananeOnDrawing(A, B, 0)) expect(point.y).toBeCloseTo(110, 12);
  });
});
