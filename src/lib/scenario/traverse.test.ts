import { describe, expect, test } from "vitest";

import { sweepStep } from "@/lib/sim";

import type { TraverseInputs } from "./traverse.ts";
import type { ScenarioDraft } from "./types.ts";

import { firstRunDefaults } from "./first-run.ts";
import { sweepRider, traverseInputs, traverseScenario } from "./traverse.ts";
import { deriveUnloaded, unloadedInputs } from "./unloaded.ts";

/**
 * The Traverse-scope selector — issue #32. It is the memo key of the gate report and the
 * `Résultats`, so a scrub must leave it identical and every field they read must move it. That the
 * memo then runs `evaluateVerdict` once per scrub is `rail/results.test.ts`'s.
 */

const KEYS: readonly (keyof TraverseInputs)[] = [
  "unit",
  "usage",
  "regime",
  "geometry",
  "anchors",
  "carryingLines",
  "tensioningSide",
  "tightness",
  "material",
  "terminations",
  "mp",
  "hRider",
  "hClearMin",
  "DAF",
];

describe("`traverseInputs` — the fields a memo keys on", () => {
  const before = firstRunDefaults() as ScenarioDraft;
  const inputs = traverseInputs(before);

  test("the Scenario's fourteen Traverse-scope fields, and no `x_D`", () => {
    expect(Object.keys(inputs).sort()).toEqual([...KEYS].sort());
  });

  test("a scrub of `x_D` leaves every field reference-identical", () => {
    // The store merges a rider patch shallowly, which is what this reproduces.
    const scrubbed = traverseInputs({ ...before, rider: { ...before.rider, xD: 12.5 } });
    for (const key of KEYS) expect(scrubbed[key]).toBe(inputs[key]);
  });

  test("a wind edit changes no Traverse-scope field, so it cannot re-run the Sweep (#87)", () => {
    const windy = traverseInputs({ ...before, wind: { speedKmh: 50, directionDeg: 45 } });
    for (const key of KEYS) expect(windy[key]).toBe(inputs[key]);
  });

  test("a « Garde min. admise » edit changes `hClearMin`, and nothing else", () => {
    const stricter = traverseInputs({ ...before, rider: { ...before.rider, hClearMin: 3 } });
    expect(stricter.hClearMin).toBe(3);
    for (const key of KEYS.filter((key) => key !== "hClearMin")) {
      expect(stricter[key]).toBe(inputs[key]);
    }
  });
});

describe("`traverseScenario` — the Scenario the gates and the results read", () => {
  test("the passenger keeps its four Traverse-scope fields and loses `x_D`", () => {
    const shipped = firstRunDefaults() as ScenarioDraft;
    const { rider } = traverseScenario(traverseInputs(shipped));
    expect(rider).toEqual({
      mp: shipped.rider.mp,
      hRider: shipped.rider.hRider,
      hClearMin: shipped.rider.hClearMin,
      DAF: shipped.rider.DAF,
    });
  });
});

/**
 * Brins porteurs (#4, #84). Two identical members share the passager 50/50, so each one is the
 * same §6.1 line under half the point load — and the « cas défavorable » #69 asks for is the same
 * line under the whole of it.
 */
describe("`sweepRider` — two Brins porteurs, each solved under P/2", () => {
  /** §15's own bar for global force balance on point-load cases, absolute, N. */
  const FORCE_BALANCE = 1e-10;
  /** 120 kg · 9,81 m/s² = 1177,2 N on the shipped passager; half of it on each of two members. */
  const P_WHOLE = 1177.2;
  const P_HALF = 588.6;

  const unloaded = deriveUnloaded(unloadedInputs(firstRunDefaults(), null));
  if (!unloaded.ok) throw new Error("the shipped line solves");
  const one = sweepRider(unloaded, { mp: 120, hRider: 2.1, carryingLines: 1 });
  const two = sweepRider(unloaded, { mp: 120, hRider: 2.1, carryingLines: 2 });
  if (one === null || two === null) throw new Error("the shipped traverse solves");

  test("each member is loaded with half the passager", () => {
    expect(one.P).toBeCloseTo(P_WHOLE, 9);
    expect(two.P).toBeCloseTo(P_HALF, 9);
  });

  test("every member step closes the global force balance with P/2: V_B − V₀ = w·L₀ + P/2", () => {
    const { w, L0 } = unloaded.input;
    expect(two.traverse.coverage).toBe(1);
    for (const step of two.traverse.steps) {
      // The member re-solved at the step's own trolley position, from the step's own iterate: it
      // has to land on the recorded step, and its reactions have to carry P/2 and nothing more.
      const member = sweepStep(unloaded.input, P_HALF, step.sD, { H: step.H, V0: step.V0 });
      if (!member.ok) throw new Error(`step at s_D ${step.sD} did not re-solve`);
      expect(Math.abs(member.step.TA - step.TA) / step.TA).toBeLessThan(4e-6);
      expect(Math.abs(member.step.TB - step.TB) / step.TB).toBeLessThan(4e-6);
      const { VB, V0 } = member.state;
      expect(Math.abs(VB - V0 - (w * L0 + P_HALF))).toBeLessThan(FORCE_BALANCE);
    }
  });

  test("a member's loaded tension at P/2 is strictly below one member carrying P whole", () => {
    const sole = two.soleCarrier;
    if (sole === null) throw new Error("two members carry a « cas défavorable »");
    // Same `L₀`, same grid: step `i` is the trolley at the same material point in both.
    expect(sole.steps.length).toBe(two.traverse.steps.length);
    two.traverse.steps.forEach((step, i) => {
      expect(step.TA).toBeLessThan(sole.steps[i].TA);
      expect(step.TB).toBeLessThan(sole.steps[i].TB);
    });
  });

  test("the « cas défavorable » is the single line: same pose, the whole passager on one member", () => {
    expect(two.soleCarrier).toEqual(one.traverse);
    // One member already carries everything; there is no second case to report.
    expect(one.soleCarrier).toBeNull();
  });

  test("half the load hangs the member higher, so the garde over the traverse grows", () => {
    expect(two.clearance.hMin).toBeGreaterThan(one.clearance.hMin);
  });
});
