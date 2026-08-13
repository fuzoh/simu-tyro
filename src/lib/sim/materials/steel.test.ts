import { describe, expect, test } from "vitest";

import type { SteelSpec } from "./steel.ts";

import { STEEL_12MM_IWRC_1770, TOLERANCE } from "../__fixtures__/theory-15.ts";
import { STEEL, deriveSteel, resolveSteelValues, steelFormula } from "./steel.ts";

/**
 * §13.1's steel chain. **No §15 fixture covers this module** — inventing one is forbidden — so
 * the shipped line is a `[MEASURED]` row from ticket 14 §3, asserted at the loosest tier;
 * everything else is a structural property of the formulas, which is where the scaling cases earn
 * their place.
 *
 * Three things this file exists to pin down:
 *
 * - **The shipped 12 mm line, all four numbers at once**: `MBF` 9074 daN, `EA` 6,90 MN, `μ`
 *   0,5465 kg/m, `w` 0,536 daN/m. Every other measured row in the suite rides on that `w` and
 *   `EA`, and 9 074 daN is what « Prétension maximale atteignable » quotes.
 * - **The un-rounded 9073,98 daN**, separately from the displayed 9074. The stale-Override badge
 *   compares an override against the formula *at display precision*; on floats a freshly
 *   prefilled override would badge on every load, so the two values are one case, not two.
 * - **Which input moves which output.** `EA` and `μ` depend on `d` alone while `MBF` depends on
 *   all three — the pinned midpoints are not construction-indexed — and that split is what § 3's
 *   culprit table encodes. A fixture value alone would let it drift.
 *
 * Attested §13.1 examples that are **not** asserted here: the 6 mm 6×19 pairs (12,9 / 14,4 /
 * 21,0 kN). §13.1 itself records that a per-diameter MBL table and these `K`-factors disagree,
 * and `K` is what the spec ships — porting the pairs would assert the contradiction.
 */

/**
 * How far a value sits from its `[MEASURED]` row, **counted in bars**: `≤ 1` passes. The bar is
 * `TOLERANCE.measured` floored at the half-ulp of the recorded value's own last digit — voir
 * `docs/conventions/testing.md`, *Tolerance*.
 *
 * @param decimals the decimals the ticket recorded, in the unit the assertion is written in.
 */
function measuredOffBy(actual: number, expected: number, decimals: number): number {
  const bar = Math.max(TOLERANCE.measured * Math.abs(expected), 0.5 * 10 ** -decimals);
  return Math.abs(actual - expected) / bar;
}

const CASE = STEEL_12MM_IWRC_1770;

/** The shipped spec, rebuilt from the fixture's stated inputs — fixtures stay engine-type-free. */
const SHIPPED: SteelSpec = {
  family: "steel",
  d: CASE.in.d,
  R0: CASE.in.R0,
  construction: CASE.construction,
};

describe("§13.1's factors are transcribed once", () => {
  test("the K-factors are EN 12385-4's two 6×19 classes", () => {
    expect(STEEL.K.iwrc).toBe(CASE.in.K);
    expect(STEEL.K["fibre-core"]).toBe(CASE.in.KFibreCore);
  });

  test("E_app, C and W are the pinned midpoints, not fields", () => {
    expect(STEEL.EApp).toBe(CASE.in.EApp);
    expect(STEEL.C).toBe(CASE.in.C);
    expect(STEEL.W).toBe(CASE.in.W);
  });

  test("g is 9,81 and unexposed", () => {
    expect(STEEL.g).toBe(CASE.in.g);
  });
});

describe("the shipped line — 12 mm, R₀ 1770, 6×19 âme métallique", () => {
  const values = steelFormula(SHIPPED.d, SHIPPED.R0, SHIPPED.construction);

  test("MBF is 9074 daN", () => {
    // Recorded in daN to 0 decimals, so the assertion is written in daN.
    expect(measuredOffBy(values.MBF / 10, CASE.out.MBFDisplayed / 10, 0)).toBeLessThanOrEqual(1);
  });

  test("EA is 6,897 MN — displayed 6,90 MN", () => {
    expect(measuredOffBy(values.EA / 1e6, CASE.out.EA / 1e6, 3)).toBeLessThanOrEqual(1);
    expect(measuredOffBy(values.EA / 1e6, CASE.out.EADisplayed / 1e6, 2)).toBeLessThanOrEqual(1);
  });

  test("μ is 0,5465 kg/m", () => {
    expect(measuredOffBy(values.mu, CASE.out.mu, 4)).toBeLessThanOrEqual(1);
  });

  test("w = μ·g is 5,361 N/m — the weight every downstream measured row rides on", () => {
    expect(measuredOffBy(deriveSteel(SHIPPED).w, CASE.out.w, 3)).toBeLessThanOrEqual(1);
  });

  test("strength is MBF, the one number the verdict and §5.4's bound share", () => {
    expect(deriveSteel(SHIPPED).strength).toBe(values.MBF);
    expect(deriveSteel(SHIPPED).EA).toBe(values.EA);
  });
});

describe("the un-rounded MBF — the stale-Override badge's input", () => {
  const { MBF } = steelFormula(SHIPPED.d, SHIPPED.R0, SHIPPED.construction);

  test("the formula returns 9073,98 daN, not the displayed 9074", () => {
    expect(measuredOffBy(MBF / 10, CASE.out.MBFFormula / 10, 2)).toBeLessThanOrEqual(1);
    expect(MBF).not.toBe(CASE.out.MBFDisplayed);
  });

  test("at the field's display precision it *is* 9074 daN, so a fresh override does not badge", () => {
    // « Charge de rupture » displays daN at 0 decimals; the badge compares there, never on floats.
    expect(Math.round(MBF / 10)).toBe(CASE.out.MBFDisplayed / 10);
  });
});

describe("which input moves which output — § 3's culprit table", () => {
  test("MBF depends on all three inputs", () => {
    const base = steelFormula(12, 1770, "iwrc").MBF;
    // K is a discrete pick: âme textile is 0,330 against 0,356.
    expect(steelFormula(12, 1770, "fibre-core").MBF / base).toBeCloseTo(
      STEEL.K["fibre-core"] / STEEL.K.iwrc,
      12,
    );
    // Linear in the grade, quadratic in the diameter.
    expect(steelFormula(12, 1960, "iwrc").MBF / base).toBeCloseTo(1960 / 1770, 12);
    expect(steelFormula(24, 1770, "iwrc").MBF / base).toBeCloseTo(4, 12);
  });

  test("EA and μ depend on d alone — the midpoints are not construction-indexed", () => {
    const base = steelFormula(12, 1770, "iwrc");
    for (const other of [
      steelFormula(12, 1960, "iwrc"),
      steelFormula(12, 1770, "fibre-core"),
      steelFormula(12, 1960, "fibre-core"),
    ]) {
      expect(other.EA).toBe(base.EA);
      expect(other.mu).toBe(base.mu);
    }
    expect(steelFormula(24, 1770, "iwrc").EA / base.EA).toBeCloseTo(4, 12);
    expect(steelFormula(24, 1770, "iwrc").mu / base.mu).toBeCloseTo(4, 12);
  });
});

describe("overrides — steel-only, per value, and never cleared", () => {
  const formula = steelFormula(SHIPPED.d, SHIPPED.R0, SHIPPED.construction);

  test("each of the three overrides independently, leaving the others on the formula", () => {
    const overridden = resolveSteelValues({ ...SHIPPED, overrides: { MBF: 120000 } });
    expect(overridden.MBF).toBe(120000);
    expect(overridden.EA).toBe(formula.EA);
    expect(overridden.mu).toBe(formula.mu);

    expect(resolveSteelValues({ ...SHIPPED, overrides: { EA: 8.41e6 } }).EA).toBe(8.41e6);
    expect(resolveSteelValues({ ...SHIPPED, overrides: { mu: 0.62 } }).mu).toBe(0.62);
  });

  test("an override reaches the solver — strength, EA and w all follow it", () => {
    const derived = deriveSteel({
      ...SHIPPED,
      overrides: { MBF: 120000, EA: 8.41e6, mu: 0.62 },
    });
    expect(derived.strength).toBe(120000);
    expect(derived.EA).toBe(8.41e6);
    expect(derived.w).toBeCloseTo(0.62 * STEEL.g, 12);
  });

  test("an override survives a d change rather than being cleared", () => {
    // 12 → 16 mm: the formula moves to 16 129 daN and the typed 9074 stays, badged as stale.
    const stale = resolveSteelValues({ ...SHIPPED, d: 16, overrides: { MBF: 90740 } });
    expect(stale.MBF).toBe(90740);
    expect(steelFormula(16, 1770, "iwrc").MBF).toBeGreaterThan(stale.MBF);
  });

  test("steelFormula is override-blind — it is what the badge compares against", () => {
    const spec: SteelSpec = { ...SHIPPED, overrides: { MBF: 1, EA: 1, mu: 1 } };
    expect(steelFormula(spec.d, spec.R0, spec.construction)).toEqual(formula);
  });
});
