import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

import type { TextileSpec } from "./textile.ts";

import { TEXTILE_STIFFNESS, TOLERANCE } from "../__fixtures__/theory-15.ts";
import { TEXTILE, deriveTextile } from "./textile.ts";

/**
 * §13.2's textile chain — one multiplication and one convention, which is the whole point: this
 * family transcribes a datasheet where steel derives from geometry. **No §15 fixture covers it**,
 * so the numbers are `[MEASURED]`/`[DATASHEET]` rows asserted at the loosest tier.
 *
 * Three things this file exists to pin down:
 *
 * - **`EA = k·MBL`**, at the HMPE default `k` 22 — never a fibre modulus, and never back-solved
 *   from a writable `EA`.
 * - **Polyester ships `k` blank**, `null` rather than an interpolated number. §13.2 places it
 *   only « between the two » and R1's `k = 25–35` is refuted; a filled hole here would be the
 *   invented constant the conventions forbid.
 * - **Steel and textile share no helper.** That is the A/B separation, and it lives in the file
 *   layout, so the check has to read the layout. A `materials/index.ts` barrel is the specific
 *   « tidying » that undoes it — hence a case that fails the day someone adds one.
 */

/** How far a value sits from its `[MEASURED]` row, counted in bars: `≤ 1` passes. */
function measuredOffBy(actual: number, expected: number, decimals: number): number {
  const bar = Math.max(TOLERANCE.measured * Math.abs(expected), 0.5 * 10 ** -decimals);
  return Math.abs(actual - expected) / bar;
}

const CASE = TEXTILE_STIFFNESS;

/** An illustrative linear mass. §13.2 publishes no `μ(d)`, so no shipped value exists to use. */
const MU = 0.08;

const SPEC: TextileSpec = {
  family: "textile",
  ropeClass: CASE.ropeClass,
  MBL: CASE.in.MBL,
  mu: MU,
  k: CASE.in.k,
};

describe("§13.2's class data", () => {
  test("HMPE and polyamide carry their datasheet k", () => {
    expect(TEXTILE.kDefault.hmpe).toBe(CASE.out.kHmpe);
    expect(TEXTILE.kDefault["pa-en1891a"]).toBe(CASE.out.kPaEn1891a);
  });

  test("polyester ships k blank — null, never a number", () => {
    expect(TEXTILE.kDefault.polyester).toBeNull();
  });

  test("the attested band is 10–30 % MBL, an order above where a zip line sits", () => {
    // Measured 0,6 % MBL standing and 6,3 % loaded, which is why the warning fires always.
    expect(TEXTILE.attestedBandPercentMBL).toEqual({ min: 10, max: 30 });
    expect(6.3).toBeLessThan(TEXTILE.attestedBandPercentMBL.min);
  });

  test("g is 9,81 and unexposed", () => {
    expect(TEXTILE.g).toBe(CASE.in.g);
  });
});

describe("EA = k·MBL", () => {
  test("k 22 on a 100 kN rope gives 2200 kN", () => {
    expect(measuredOffBy(deriveTextile(SPEC).EA / 1e3, CASE.out.EA / 1e3, 0)).toBeLessThanOrEqual(
      1,
    );
  });

  test("it is linear in both factors, which is why EA stays a read-out", () => {
    expect(deriveTextile({ ...SPEC, MBL: 60000 }).EA).toBe(60000 * CASE.in.k);
    expect(deriveTextile({ ...SPEC, k: 31 }).EA).toBe(CASE.in.MBL * 31);
    // PA at the CE band is ≈15× softer than HMPE on the same MBL — the sensitivity §13.2 warns of.
    expect(deriveTextile({ ...SPEC, k: TEXTILE.kDefault["pa-en1891a"] }).EA).toBeLessThan(
      deriveTextile(SPEC).EA,
    );
  });

  test("strength is the transcribed MBL, untouched — no derivation, no override", () => {
    expect(deriveTextile(SPEC).strength).toBe(CASE.in.MBL);
  });

  test("w = μ·g, the family's only other derived number", () => {
    expect(deriveTextile(SPEC).w).toBeCloseTo(MU * TEXTILE.g, 12);
  });
});

describe("the A/B separation — steel and textile share no helper", () => {
  const here = dirname(fileURLToPath(import.meta.url));

  test("materials/ holds exactly the two modules and their tests — no index.ts barrel", () => {
    expect(existsSync(join(here, "index.ts"))).toBe(false);
    expect(readdirSync(here).sort()).toEqual([
      "steel.test.ts",
      "steel.ts",
      "textile.test.ts",
      "textile.ts",
    ]);
  });

  test("neither module imports the other, nor any third module but the frozen types", () => {
    for (const file of ["steel.ts", "textile.ts"]) {
      const source = readFileSync(join(here, file), "utf8");
      const specifiers = [...source.matchAll(/(?:from|import)\s+"([^"]+)"/g)].map(
        (match) => match[1],
      );
      expect(specifiers).toEqual(["../types.ts"]);
    }
  });
});
