import { describe, expect, test } from "vitest";

import type { FieldId, FieldIssue } from "@/lib/rail/fields.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { buildSceneBase, buildSceneFrame } from "@/lib/chart/scene.ts";
import { deducedFrom } from "@/lib/rail/deduced.ts";
import { committedValue, evaluateGates } from "@/lib/rail/gates.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { sweepRiderOf, traverseInputs, traverseScenario } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";

import { errorSurfaces } from "./surfaces.ts";

/**
 * The error surfaces as one composition (« v1 build spec » § 7): what each standing state leaves
 * on screen, read off the surfaces every consumer shares — the banner's occupant, the cause
 * sentence, the two halves of the picture and the `Résultats`.
 */
function surfacesOf(
  patch: (draft: ScenarioDraft) => void,
  form: { focused?: FieldId | null; issues?: readonly FieldIssue[] } = {},
) {
  const scenario = firstRunDefaults() as ScenarioDraft;
  scenario.regime = "en15567";
  patch(scenario);
  const { focused = null, issues = [] } = form;
  const unloaded = deriveUnloaded(unloadedInputs(scenario, null));
  const frame = buildSceneFrame(unloaded.span);
  const solved = buildSceneBase(frame, unloaded, sweepRiderOf(scenario));
  const deduced = deducedFrom(scenario, unloaded);
  const traverse = traverseScenario(traverseInputs(scenario));
  const surfaces = errorSurfaces({
    failure: deduced.failure,
    focused,
    committed: focused === null ? null : committedValue(scenario, focused, deduced),
    frame,
    register: "exact",
    report: evaluateGates({ scenario: traverse, issues }),
    solved,
    traverse,
  });
  return { frame, solved, surfaces };
}

describe("what each standing state leaves on screen", () => {
  test("a sound line keeps both halves, its results, and the verdict in the slot", () => {
    const { frame, solved, surfaces } = surfacesOf(() => {});
    expect(surfaces.frame).toBe(frame);
    expect(surfaces.solved).toBe(solved);
    expect(surfaces.results).not.toBeNull();
    expect(surfaces.cause).toBeNull();
    expect(surfaces.occupant).toMatchObject({ rank: 4, kind: "verdict" });
  });

  test("an invalid portée collapses both plots and every result, with one cause", () => {
    const { surfaces } = surfacesOf((draft) => {
      draft.geometry = { source: "manual", L: -5, h: -18 };
    });
    expect(surfaces).toMatchObject({ frame: null, solved: null, results: null });
    expect(surfaces.cause).toMatch(/^Aucun résultat — /);
    expect(surfaces.occupant).toMatchObject({ rank: 1, target: "L" });
  });

  test("a Clearance breach removes the garde alone: the cable and the results stand", () => {
    const { solved, surfaces } = surfacesOf((draft) => {
      draft.anchors.zA = -2;
    });
    expect(surfaces.clearance).toBe(false);
    expect(surfaces.solved).toBe(solved);
    expect(surfaces.results).not.toBeNull();
  });

  describe("a required field emptied in the form", () => {
    const emptied: FieldIssue = { field: "D_target", kind: "empty", message: "valeur requise" };

    test("under the caret it freezes the picture — « Saisie en cours », nothing suppressed", () => {
      const { solved, surfaces } = surfacesOf(() => {}, {
        focused: "D_target",
        issues: [emptied],
      });
      expect(surfaces.saisie?.field).toBe("D_target");
      expect(surfaces.solved).toBe(solved);
      expect(surfaces.results).not.toBeNull();
      expect(surfaces.cause).toBeNull();
      expect(surfaces.occupant).toMatchObject({ rank: 3, kind: "saisie" });
    });

    test("left blank it blocks, as the same blank arriving in a link would", () => {
      const { surfaces } = surfacesOf(() => {}, { issues: [emptied] });
      expect(surfaces).toMatchObject({ saisie: null, solved: null, results: null });
      expect(surfaces.cause).toMatch(/^Aucun résultat — /);
    });
  });
});
