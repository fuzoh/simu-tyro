import { describe, expect, test } from "vitest";

import type { TraverseInputs } from "./traverse.ts";
import type { ScenarioDraft } from "./types.ts";

import { firstRunDefaults } from "./first-run.ts";
import { traverseInputs, traverseScenario } from "./traverse.ts";

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

  test("the Scenario's twelve Traverse-scope fields, and no `x_D`", () => {
    expect(Object.keys(inputs).sort()).toEqual([...KEYS].sort());
  });

  test("a scrub of `x_D` leaves every field reference-identical", () => {
    // The store merges a rider patch shallowly, which is what this reproduces.
    const scrubbed = traverseInputs({ ...before, rider: { ...before.rider, xD: 12.5 } });
    for (const key of KEYS) expect(scrubbed[key]).toBe(inputs[key]);
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
