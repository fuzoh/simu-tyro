import { readFileSync } from "node:fs";
import { describe, expect, it, test } from "vitest";

import type { Trace } from "@/lib/terrain/trace.ts";

import { TRIAL_ENDS } from "@/lib/terrain/__fixtures__/geoadmin-2026-11-08.ts";
import { parseProfileCsv } from "@/lib/terrain/csv.ts";

import { clampX, lineBearing, placeSpan, spanOfGeometry } from "./geometry.ts";

/**
 * The trial profil of 2026-11-08 — `[MEASURED]` geoadmin export, 200 points over 435,2 m, ground
 * 1453,7 m under A and 1438,7 m under B, lowest at 1368,1 m at 242,7 m.
 */
function trialProfil(): Trace {
  const text = readFileSync(
    new URL("../../../docs/mesures dynamometre/trace-geoadmin-2026-11-08.csv", import.meta.url),
    "utf8",
  );
  const parsed = parseProfileCsv(text, "trace-geoadmin-2026-11-08.csv");
  if (!parsed.ok) throw new Error("the trial profil must import");
  return parsed.trace;
}

const IMPORTED = { source: "trace", trace: "p1.unused-by-placeSpan" } as const;

describe("placeSpan — an imported profil is taken whole (#88)", () => {
  it("spans the trial profil end to end with the anchor heights it is given", () => {
    const trace = trialProfil();
    expect(trace.d).toHaveLength(200);

    const placed = placeSpan({ geometry: IMPORTED, anchors: { zA: 1.5, zB: 1 } }, trace);
    if (placed === null) throw new Error("the trial profil must place");

    expect(placed.L).toBeCloseTo(435.2, 9);
    expect(placed.h).toBeCloseTo(-15.5, 9);
    expect(placed.bases).toEqual({ zBaseA: 1453.7, zBaseB: 1438.7 });
    expect(placed.terrain.xs[0]).toBe(0);
    expect(placed.terrain.xs[placed.terrain.xs.length - 1]).toBe(placed.L);

    const lowest = placed.terrain.zs.indexOf(Math.min(...placed.terrain.zs));
    expect(placed.terrain.xs[lowest]).toBeCloseTo(242.7, 9);
    expect(placed.terrain.zs[lowest]).toBeCloseTo(1368.1 - (1453.7 + 1.5), 9);
  });

  it("reads the same span spanOfGeometry reports for the Rail's clamp", () => {
    const trace = trialProfil();
    const placed = placeSpan({ geometry: IMPORTED, anchors: { zA: 1.5, zB: 1 } }, trace);
    expect(placed?.L).toBe(spanOfGeometry(IMPORTED, trace));
  });

  it("has no span without a loaded profil, or with a one-sample one", () => {
    const anchors = { zA: 1, zB: 1 };
    expect(placeSpan({ geometry: IMPORTED, anchors }, null)).toBeNull();
    const lone: Trace = {
      d: Float64Array.of(0),
      z: Float64Array.of(500),
      dev: null,
      origin: { kind: "lien" },
    };
    expect(placeSpan({ geometry: IMPORTED, anchors }, lone)).toBeNull();
  });

  it("keeps manual geometry's straight ground between the two bases", () => {
    const placed = placeSpan(
      { geometry: { source: "manual", L: 150, h: -10 }, anchors: { zA: 12, zB: 12 } },
      null,
    );
    expect(placed?.bases).toBeNull();
    expect(Array.from(placed?.terrain.xs ?? [])).toEqual([0, 150]);
    expect(Array.from(placed?.terrain.zs ?? [])).toEqual([-12, -22]);
  });
});

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

describe("lineBearing — the bearing the Vent is projected on", () => {
  const NORTH_LINE = { A: { lat: 46.8, lon: 7.4 }, B: { lat: 46.81, lon: 7.4 } };

  test("the trial's line runs at about 312°, north-west", () => {
    // Δλ = −0,004252° = −7,4211e-5 rad east; Δ(Mercator y) ≈ Δφ / cos φ = 4,5553e-5 / 0,68395 =
    // 6,6603e-5 north; atan2(−7,4211, 6,6603) = −48,09°, so 311,9°.
    expect(lineBearing(TRIAL_ENDS)).toBeCloseTo(311.9, 1);
  });

  test("a line due north is 0°, due east 90°, due south 180°", () => {
    expect(lineBearing(NORTH_LINE)).toBeCloseTo(0, 6);
    expect(lineBearing({ A: NORTH_LINE.A, B: { lat: 46.8, lon: 7.41 } })).toBeCloseTo(90, 6);
    expect(lineBearing({ A: NORTH_LINE.B, B: NORTH_LINE.A })).toBeCloseTo(180, 6);
  });

  test("is unknown while a Position is missing or both name one point", () => {
    expect(lineBearing({ A: NORTH_LINE.A, B: null })).toBeNull();
    expect(lineBearing({ A: null, B: null })).toBeNull();
    expect(lineBearing({ A: NORTH_LINE.A, B: NORTH_LINE.A })).toBeNull();
  });
});
