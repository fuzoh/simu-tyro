import { describe, expect, test } from "vitest";

import type { EngineRefusal } from "@/lib/app/refusals.ts";
import type { GateReport, SaisieEnCours } from "@/lib/rail/gates.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";

import { deduceValues } from "@/lib/rail/deduced.ts";
import { committedValue, evaluateGates, saisieEnCours } from "@/lib/rail/gates.ts";
import { NO_REGIME_BANNER } from "@/lib/rail/results.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";

import { banner, CHOOSE_REGIME_LABEL, JUMP_LABEL, noResultCause } from "./banner.ts";

/**
 * The banner — « v1 build spec » § 7 (*Le bandeau : un occupant, quatre rangs*, *Le résumé
 * bloquant nomme la pire grille franchie*, *« Aucun résultat »*), and invariant 4: **the slot has
 * exactly one occupant**.
 *
 * The reducer is the ticket's own gate, so the cases below are the precedence table read one rank
 * at a time, plus the two structural claims the ranks rest on: rank 1 pre-empts rank 4, and rank 3
 * is reachable at all.
 */

function scenario(patch: (draft: ScenarioDraft) => void = () => {}): ScenarioDraft {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  return draft;
}

const REFUSAL: EngineRefusal = {
  id: "tension-impossible",
  message: "⛔ Tension impossible — la ligne casserait avant d'atteindre cette tension.",
  diagnostic: false,
};

/** The shipped screen: no error, no refusal, no régime — the one rank-4b state § 9 opens on. */
const FIRST_RUN: GateReport = evaluateGates({ scenario: scenario(), trace: null });

/** A Verdict Gate breach that is a real error: `daf=-1` is a value a link can carry. */
const BAD_DAF: GateReport = evaluateGates({
  scenario: scenario((draft) => {
    draft.regime = "en15567";
    draft.rider.DAF = -1;
  }),
  trace: null,
});

/** A Solve Gate breach: `?L=-5` restores faithfully, including invalid state. */
const BAD_SPAN: GateReport = evaluateGates({
  scenario: scenario((draft) => {
    draft.regime = "en15567";
    draft.geometry = { source: "manual", L: -5, h: -18 };
  }),
  trace: null,
});

describe("rank 1 — blocking errors, count and jump link only", () => {
  test("the summary names the **worst gate breached**, and the jump targets the first culprit", () => {
    expect(banner({ report: BAD_SPAN, refusal: null, saisie: null, verdict: null })).toEqual({
      rank: 1,
      kind: "blocking",
      text: "⛔ 1 erreur bloquante — aucun résultat",
      target: "L",
      action: JUMP_LABEL,
    });
  });

  test("a Verdict Gate breach says « aucun verdict », not « aucun résultat »", () => {
    // Under the three-gate split a bad `DAF` blocks the verdict while `T max` and `Garde min` are
    // printed on screen, and « aucun résultat » beside a printed clearance is the app
    // contradicting itself.
    const slot = banner({ report: BAD_DAF, refusal: null, saisie: null, verdict: null });
    expect(slot).toMatchObject({ rank: 1, text: "⛔ 1 erreur bloquante — aucun verdict" });
  });

  test("it pre-empts a refusal, « Saisie en cours » and the verdict alike", () => {
    const slot = banner({
      report: BAD_SPAN,
      refusal: REFUSAL,
      saisie: { field: "D_target", message: "Saisie en cours — …" },
      verdict: { state: "dans-les-limites", text: "Dans les limites — EN 15567-1 (k = 3,0)" },
    });
    expect(slot?.rank).toBe(1);
  });

  test("the slot carries no Fix Action — that lives inline on the culpable field", () => {
    const slot = banner({ report: BAD_SPAN, refusal: null, saisie: null, verdict: null });
    expect(slot).not.toHaveProperty("fixes");
  });
});

describe("rank 2 — the three refusal states", () => {
  test("a refusal takes the slot when nothing is blocking", () => {
    expect(banner({ report: FIRST_RUN, refusal: REFUSAL, saisie: null, verdict: null })).toEqual({
      rank: 2,
      kind: "refusal",
      text: REFUSAL.message,
      refusal: REFUSAL,
    });
  });

  test("it pre-empts « Saisie en cours » and the verdict", () => {
    const slot = banner({
      report: FIRST_RUN,
      refusal: REFUSAL,
      saisie: { field: "D_target", message: "Saisie en cours — …" },
      verdict: { state: "dans-les-limites", text: "Dans les limites" },
    });
    expect(slot?.rank).toBe(2);
  });

  test("a blocking error beside a refusal keeps rank 1, but may not promise results", () => {
    // `?fl=0.05&daf=0`. Precedence is unchanged — rank 1 above rank 2 — but the refusal has already
    // removed « tout l'aval », so « aucun verdict » beside five cells reading « Aucun résultat —
    // tension impossible. » is exactly the contradiction the per-gate summaries exist to prevent.
    const slot = banner({ report: BAD_DAF, refusal: REFUSAL, saisie: null, verdict: null });
    expect(slot).toMatchObject({ rank: 1, text: "⛔ 1 erreur bloquante — aucun résultat" });
  });
});

describe("rank 3 — « Saisie en cours », and it has to be reachable", () => {
  /** A required field emptied **while the caret is in it**: the form's issue, not the Scenario's. */
  const state = scenario((draft) => {
    draft.regime = "en15567";
  });
  const report = evaluateGates({
    scenario: state,
    trace: null,
    issues: [{ field: "D_target", kind: "empty", message: "valeur requise" }],
  });
  const saisie = saisieEnCours(
    report,
    "D_target",
    committedValue(state, "D_target", deduceValues(state, null)),
  );

  test("the mid-edit field is **not** an error, so rank 1 cannot pre-empt rank 3", () => {
    // « Firing rule: a required field is empty *and holds focus*. Mid-edit, not an error. » Filed
    // as an error it would put rank 1 in the slot and make this state structurally unreachable —
    // the same correction A9 made one gate over for an absent régime.
    expect(report.errors.map((error) => error.field)).toEqual(["D_target"]);
    const slot = banner({ report, refusal: null, saisie, verdict: null });
    expect(slot).toEqual({
      rank: 3,
      kind: "saisie",
      field: "D_target",
      text: "Saisie en cours — ces valeurs correspondent à Flèche à vide 6,00 m.",
    });
  });

  test("a **second** field breaching for real still wins the slot", () => {
    const withInvalid = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
        draft.rider.mp = -1;
      }),
      trace: null,
      issues: [{ field: "D_target", kind: "empty", message: "valeur requise" }],
    });
    const midEdit = saisieEnCours(withInvalid, "D_target", "6,00 m");
    const slot = banner({ report: withInvalid, refusal: null, saisie: midEdit, verdict: null });
    expect(slot).toMatchObject({ rank: 1, target: "mp" });
    // …and the mid-edit field is not counted among the errors the summary reports.
    expect(slot?.text).toBe("⛔ 1 erreur bloquante — aucun résultat");
  });

  test("the same field blurred falls back to rank 4 with the numbers it still has", () => {
    const blurred: SaisieEnCours | null = saisieEnCours(report, null, "6,00 m");
    expect(blurred).toBeNull();
    const slot = banner({
      report,
      refusal: null,
      saisie: blurred,
      verdict: { state: "dans-les-limites", text: "Dans les limites" },
    });
    expect(slot?.rank).toBe(1);
  });
});

describe("rank 4 — the verdict, or the no-régime prompt", () => {
  test("the verdict sentence, in its own state", () => {
    expect(
      banner({
        report: evaluateGates({
          scenario: scenario((draft) => {
            draft.regime = "en15567";
          }),
          trace: null,
        }),
        refusal: null,
        saisie: null,
        verdict: { state: "dans-les-limites", text: "Dans les limites — EN 15567-1 (k = 3,0)" },
      }),
    ).toEqual({
      rank: 4,
      kind: "verdict",
      state: "dans-les-limites",
      text: "Dans les limites — EN 15567-1 (k = 3,0)",
    });
  });

  test("the shipped screen opens on the neutral no-régime strip", () => {
    // No colour and no icon: colouring the absence of a judgement would be a judgement, and the
    // button in the strip is the discovery path.
    expect(banner({ report: FIRST_RUN, refusal: null, saisie: null, verdict: null })).toEqual({
      rank: 4,
      kind: "no-regime",
      text: NO_REGIME_BANNER,
      action: CHOOSE_REGIME_LABEL,
    });
  });

  test("a régime **is** chosen and the verdict is suppressed: no prompt, and no slot", () => {
    // A Verdict Gate breach is not « rien n'a été tenté ». That state raises its own rank-1
    // summary; with the breach spent, nothing may put « choisissez un régime » in front of a user
    // who has chosen one.
    const chosen = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
      }),
      trace: null,
    });
    expect(banner({ report: chosen, refusal: null, saisie: null, verdict: null })).toBeNull();
  });
});

describe("invariant 4 — one occupant, and four ranks that are total", () => {
  test("every combination of claimants yields exactly one occupant", () => {
    const claims = [true, false];
    for (const blocking of claims) {
      for (const refused of claims) {
        for (const midEdit of claims) {
          for (const judged of claims) {
            const slot = banner({
              report: blocking ? BAD_SPAN : FIRST_RUN,
              refusal: refused ? REFUSAL : null,
              saisie: midEdit ? { field: "D_target", message: "Saisie en cours — …" } : null,
              verdict: judged ? { state: "dans-les-limites", text: "Dans les limites" } : null,
            });
            // One object or none — never a list, and never a stack.
            expect(Array.isArray(slot)).toBe(false);
            const expected = blocking ? 1 : refused ? 2 : midEdit ? 3 : 4;
            expect(slot?.rank).toBe(expected);
          }
        }
      }
    }
  });
});

describe("« Aucun résultat » — one cause, written once", () => {
  test("a committed invalid `L` reads « portée invalide »", () => {
    expect(noResultCause({ report: BAD_SPAN, refusal: null })).toBe(
      "Aucun résultat — portée invalide.",
    );
  });

  test("a refusal names its own surface", () => {
    expect(noResultCause({ report: FIRST_RUN, refusal: REFUSAL })).toBe(
      "Aucun résultat — tension impossible.",
    );
    expect(
      noResultCause({
        report: FIRST_RUN,
        refusal: { id: "calcul-impossible", message: "…", diagnostic: true },
      }),
    ).toBe("Aucun résultat — calcul impossible.");
  });

  test("a never-filled required field echoes its own neutral message", () => {
    // « valeur requise » rather than « … invalide »: nothing was typed, so nothing is invalid —
    // the split § 7 makes between the neutral empty state and the ⛔ committed-invalid one.
    const blanks = evaluateGates({
      scenario: scenario((draft) => {
        draft.usage = "TEMPORAIRE";
        draft.material = { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 };
      }),
      trace: null,
    });
    expect(noResultCause({ report: blanks, refusal: null })).toBe(
      "Aucun résultat — charge de rupture : valeur requise.",
    );
  });

  test("a Verdict or Clearance breach is **not** « Aucun résultat »", () => {
    // Those remove the banner and the grid, or the garde alone. The numbers that survive are
    // printed, and a cause line beside them would be the app contradicting its own screen.
    expect(noResultCause({ report: BAD_DAF, refusal: null })).toBeNull();
    expect(noResultCause({ report: FIRST_RUN, refusal: null })).toBeNull();
  });

  test("mid-edit suppresses nothing — the output half freezes instead", () => {
    const state = scenario();
    const report = evaluateGates({
      scenario: state,
      trace: null,
      issues: [{ field: "D_target", kind: "empty", message: "valeur requise" }],
    });
    const saisie = saisieEnCours(
      report,
      "D_target",
      committedValue(state, "D_target", deduceValues(state, null)),
    );
    expect(noResultCause({ report, refusal: null, saisie })).toBeNull();
  });

  test("it is a **sentence**, never a set of dashes", () => {
    // « — » is spent on `Indéterminé` — *tenté, indisponible* — and reusing it for *nothing
    // attempted* collides with the distinction § 6 bought five verdict states to preserve.
    expect(noResultCause({ report: BAD_SPAN, refusal: null })).toMatch(/^Aucun résultat — .+\.$/);
  });
});
