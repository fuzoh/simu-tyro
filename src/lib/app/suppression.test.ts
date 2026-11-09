import { describe, expect, test } from "vitest";

import type { EngineRefusal } from "@/lib/app/refusals.ts";
import type { GateReport } from "@/lib/rail/gates.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { standingReport } from "@/lib/app/banner.ts";
import { evaluateGates, saisieEnCours } from "@/lib/rail/gates.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";

import { suppression } from "./suppression.ts";

/**
 * « Ce que l'échec supprime » — « v1 build spec » § 7's third column, and the fix that made the
 * typed path and the arrived path one state.
 *
 * The cases below are that column read one gate at a time, plus the two structural claims the
 * whole thing rests on: a *form* issue suppresses exactly as a *Scenario* value does, and mid-edit
 * suppresses nothing at all.
 */

function scenario(patch: (draft: ScenarioDraft) => void = () => {}): ScenarioDraft {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  return draft;
}

function report(patch: (draft: ScenarioDraft) => void = () => {}): GateReport {
  return evaluateGates({ scenario: scenario(patch) });
}

const REFUSAL: EngineRefusal = {
  id: "tension-impossible",
  message: "⛔ Tension impossible — la ligne casserait avant d'atteindre cette tension.",
  diagnostic: false,
};

/** The shipped screen: nothing breached, nothing refused, and nothing suppressed. */
const CLEAN = report((draft) => {
  draft.regime = "en15567";
});

describe("the gates, each removing exactly what § 7 says it does", () => {
  test("a clean line suppresses nothing", () => {
    expect(suppression({ report: CLEAN, refusal: null })).toEqual({
      geometry: false,
      solve: false,
      clearance: false,
      verdict: false,
    });
  });

  test("a Solve breach removes **tout l'aval**, the garde and the verdict with it", () => {
    // `?mp=0` — a value a link can carry. With no rider there is no loaded `SpanState`.
    const removed = suppression({
      report: report((draft) => {
        draft.regime = "en15567";
        draft.rider.mp = 0;
      }),
      refusal: null,
    });
    expect(removed).toEqual({ geometry: false, solve: true, clearance: true, verdict: true });
  });

  test("a Clearance breach removes the garde **alone** — the cable still draws", () => {
    // `?za=-2`. A printed `Garde min` under « garde au sol indisponible » is one copy
    // contradicting the screen, and the tension rows are untouched by the anchor height.
    const removed = suppression({
      report: report((draft) => {
        draft.regime = "en15567";
        draft.anchors.zA = -2;
      }),
      refusal: null,
    });
    expect(removed).toEqual({ geometry: false, solve: false, clearance: true, verdict: false });
  });

  test("a Verdict breach removes the verdict **alone** — `T max` and `Garde min` stand", () => {
    const removed = suppression({
      report: report((draft) => {
        draft.regime = "en15567";
        draft.rider.DAF = -1;
      }),
      refusal: null,
    });
    expect(removed).toEqual({ geometry: false, solve: false, clearance: false, verdict: true });
  });

  test("an absent régime is not an error and suppresses only the verdict", () => {
    // § 9: « — choisir — » is **not** an empty required field, and the first screen opens on it.
    expect(suppression({ report: report(), refusal: null })).toEqual({
      geometry: false,
      solve: false,
      clearance: false,
      verdict: true,
    });
  });
});

describe("l'exception géométrique — scoped to `L` / `h` failures", () => {
  test.each([
    [
      "une portée invalide",
      (draft: ScenarioDraft) => (draft.geometry = { source: "manual", L: -5, h: -18 }),
    ],
    [
      "un dénivelé illisible",
      (draft: ScenarioDraft) => (draft.geometry = { source: "manual", L: 150, h: Number.NaN }),
    ],
  ])("%s collapses both plots", (_label, patch) => {
    const removed = suppression({ report: report(patch), refusal: null });
    expect(removed.geometry).toBe(true);
    // It implies the Solve breach rather than being a fourth, independent state.
    expect(removed.solve).toBe(true);
  });

  test("every other Solve breach keeps its frame — « les entrées se dessinent toujours »", () => {
    const removed = suppression({
      report: report((draft) => {
        draft.rider.mp = 0;
      }),
      refusal: null,
    });
    expect(removed).toMatchObject({ geometry: false, solve: true });
  });
});

describe("a refusal suppresses like a Solve breach, and never the frame", () => {
  test("« Tension impossible » leaves no `SpanState` to draw, and the terrain still draws", () => {
    expect(suppression({ report: CLEAN, refusal: REFUSAL })).toEqual({
      geometry: false,
      solve: true,
      clearance: true,
      verdict: true,
    });
  });
});

describe("the two structural claims the whole fix rests on", () => {
  test("a **form** issue suppresses exactly as the same value arriving in a link does", () => {
    // The one defect A11 shipped: « −5 » typed into `Portée` never reaches the Scenario, so the
    // screen kept the last valid Sweep while the banner announced « aucun résultat ».
    const typed = evaluateGates({
      scenario: scenario(),
      issues: [
        {
          field: "L",
          kind: "invalid",
          message: "⛔ Portée — une longueur strictement positive est requise. Valeur : −5,0 m.",
        },
      ],
    });
    const arrived = report((draft) => (draft.geometry = { source: "manual", L: -5, h: -18 }));
    expect(suppression({ report: typed, refusal: null })).toEqual(
      suppression({ report: arrived, refusal: null }),
    );
  });

  test("mid-edit suppresses nothing: the output half **freezes** on the last valid Sweep", () => {
    const draft = scenario();
    const mid = evaluateGates({
      scenario: draft,
      issues: [{ field: "mp", kind: "empty", message: "valeur requise" }],
    });
    const saisie = saisieEnCours(mid, "mp", "120 kg");
    expect(saisie).not.toBeNull();
    expect(suppression({ report: standingReport(mid, saisie), refusal: null })).toMatchObject({
      solve: false,
      clearance: false,
    });
    // Blurred, the very same emptiness is « Aucun résultat » with no stale picture.
    expect(suppression({ report: standingReport(mid, null), refusal: null })).toMatchObject({
      solve: true,
    });
  });
});
