/**
 * §19.4's line description under wind. The oracles are #127 Q37's rule (a textile line without a
 * diameter has no result under wind) and the unit conversion mm → m, by hand.
 */

import { describe, expect, it } from "vitest";

import type { MaterialSpec } from "./types.ts";
import type { WindField } from "./wind-profile.ts";

import { AERO } from "./aero.ts";
import { isAeroNil, lineAeroOf, windVectorAt } from "./spatial-load.ts";
import { windAt } from "./wind-profile.ts";

const FIELD: WindField = { speed: 10, from: 90, profile: { width: 50, attenuation: 0 } };
const STEEL: MaterialSpec = { family: "steel", d: 12, R0: 1770, construction: "fibre-core" };
const TEXTILE: MaterialSpec = {
  family: "textile",
  ropeClass: "polyester",
  MBL: 30000,
  mu: 0.08,
  k: 20,
};

describe("lineAeroOf — §19.4's diameter and C_D⊥, per family", () => {
  it("reads the steel diameter in metres with the steel C_D⊥", () => {
    const aero = lineAeroOf(STEEL, FIELD, 30, 1.2);
    expect(aero).toEqual({
      ok: true,
      value: { field: FIELD, bearing: 30, rho: 1.2, d: 0.012, CDn: AERO.lineNormalDrag.steel },
    });
  });

  it("reads a declared textile diameter with the textile C_D⊥", () => {
    const aero = lineAeroOf({ ...TEXTILE, d: 11 }, FIELD, 0, 1.1);
    expect(aero.ok && aero.value?.d).toBeCloseTo(0.011, 15);
    expect(aero.ok && aero.value?.CDn).toBe(AERO.lineNormalDrag.textile);
  });

  it("refuses a textile line without a diameter under wind, naming the field (Q37)", () => {
    const aero = lineAeroOf(TEXTILE, FIELD, 0, 1.2);
    expect(aero.ok).toBe(false);
    expect(!aero.ok && aero.error).toMatchObject({ kind: "invalid-input", field: "d", bound: 0 });
  });

  it("applies no wind without a bearing or at a nil speed — and then reads no diameter", () => {
    expect(lineAeroOf(TEXTILE, FIELD, null, 1.2)).toEqual({ ok: true, value: null });
    expect(lineAeroOf(TEXTILE, { ...FIELD, speed: 0 }, 0, 1.2)).toEqual({ ok: true, value: null });
  });
});

describe("isAeroNil — §19.8's plane case", () => {
  it("is null or a nil speed, and nothing else", () => {
    const aero = { field: FIELD, bearing: 0, rho: 1.2, d: 0.012, CDn: 1.2 };
    expect(isAeroNil(null)).toBe(true);
    expect(isAeroNil({ ...aero, field: { ...FIELD, speed: 0 } })).toBe(true);
    expect(isAeroNil(aero)).toBe(false);
  });
});

describe("windVectorAt — windAt in §19.2's (u_x, u_y)", () => {
  it("is windAt's along and across", () => {
    const field: WindField = { speed: 12, from: 37, profile: { width: 40, attenuation: 60 } };
    const aero = { field, bearing: 15, rho: 1.2, d: 0.012, CDn: 1.2 };
    for (const x of [0, 13.7, 75, 149.9, 150]) {
      const u = windAt(field, x, 150, 15);
      expect(windVectorAt(aero, x, 150)).toEqual({ ux: u.along, uy: u.across });
    }
  });
});
