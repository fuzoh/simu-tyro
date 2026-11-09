import { describe, expect, test } from "vitest";

import type { ScenarioDraft, TextileDraft } from "@/lib/scenario/types.ts";

import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";

import type { FieldId, GateId } from "./fields.ts";

import { deduceValues } from "./deduced.ts";
import {
  blockingSummary,
  committedValue,
  culprits,
  evaluateGates,
  GATE_CONSEQUENCE,
  isFieldActive,
  regimeUnavailableNote,
  saisieEnCours,
  terminationOptions,
} from "./gates.ts";
import { applyRopeClass, applyShippedTerminations } from "./values.ts";

/**
 * The gates — « v1 build spec » § 7 (*Les trois grilles de validation*, *Le résumé bloquant*,
 * *« Saisie en cours »*, *La table des champs responsables*) and § 3 (*The three validation
 * gates*).
 *
 * The ticket's gate, as predicates over a Scenario:
 *
 * | Grille | Entrées |
 * | --- | --- |
 * | Solve | `L`, `h`, le champ de tension directeur, famille + Material Spec, famille × usage (§10.4), `m_p` |
 * | Clearance | hauteurs d'ancrage A / B, terrain, `h_rider` |
 * | Verdict | régime, les deux terminaisons, `DAF` |
 *
 * The Wind and Ride gates were added after § 7 (#87, #89 and the ride-gates fix).
 */

function scenario(patch: (draft: ScenarioDraft) => void = () => {}): ScenarioDraft {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  return draft;
}

/** A textile line as a family flip lands on it: the rope, and the retained textile ends with it. */
function onRope(draft: ScenarioDraft, material: TextileDraft) {
  draft.material = material;
  draft.terminations = structuredClone(FIRST_RUN_RETAINED_TEXTILE.terminations);
}

/** The gate a given field's breach was filed under, or `undefined` when nothing was raised. */
function gateFor(report: ReturnType<typeof evaluateGates>, field: FieldId): GateId | undefined {
  return report.errors.find((error) => error.field === field)?.gate;
}

describe("the first screen — verdict-less, and it still computes", () => {
  const report = evaluateGates({ scenario: scenario() });

  test("Solve and Clearance pass; only the Verdict Gate is breached", () => {
    // « Régime choisi » is **struck** from the Solve Gate: as ticket 04 wrote it, first run blocked
    // the engine and showed an empty chart, destroying manual-mode ground's own reason for
    // existing. Garde min is geometric fact and the tension envelope is physics.
    expect(report.passed).toEqual({
      solve: true,
      clearance: true,
      verdict: false,
      wind: true,
      ride: true,
    });
  });

  test("**nothing fails on first contact** — « — choisir — » is not an empty required field", () => {
    // § 9: « `Régime de sécurité` at « — choisir — » is **not** an empty required field. » So the
    // picker carries no message, the blocking list is empty, and there is no worst gate.
    expect(report.errors).toEqual([]);
    expect(report.worst).toBeNull();
  });

  test("what suppressed the Verdict Gate is `noRegime`, not an error", () => {
    // The banner verdict and the criteria × ends grid go together; the blocking list stays empty,
    // which is what keeps § 8's rank 4 — the neutral no-regime prompt — reachable at all. A
    // rank-1 occupant would pre-empt it on the shipped scenario, forever.
    expect(report.noRegime).toBe(true);
    expect(report.passed.verdict).toBe(false);
    const chosen = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "acct10";
      }),
    });
    expect(chosen.noRegime).toBe(false);
    expect(chosen.passed).toEqual({
      solve: true,
      clearance: true,
      verdict: true,
      wind: true,
      ride: true,
    });
  });

  test("no banner line at all on the shipped scenario", () => {
    // ELECTIONS §0.4's copy is true only for a Solve breach, and here there is no breach to count:
    // the opening screen prints the neutral prompt, never « ⛔ 1 erreur bloquante ».
    expect(blockingSummary(report)).toBeNull();
  });
});

describe("the optional textile diameter", () => {
  const rope = (d?: number) =>
    scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.regime = "secours10";
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
      if (d !== undefined) draft.material.d = d;
      draft.terminations = structuredClone(FIRST_RUN_RETAINED_TEXTILE.terminations);
    });

  test("an absent `d` pushes no `empty` error", () => {
    const { errors } = evaluateGates({ scenario: rope() });
    expect(errors.filter((error) => error.field === "dTextile")).toEqual([]);
  });

  test("`d: 0` from a link is an `invalid` Solve breach", () => {
    const { errors } = evaluateGates({ scenario: rope(0) });
    expect(errors.find((error) => error.field === "dTextile")).toMatchObject({
      gate: "solve",
      kind: "invalid",
    });
  });
});

describe("§10.4 — the use-class gate, family first, two Fix Actions", () => {
  const textileUnderPermanente = scenario((draft) => {
    onRope(draft, { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 });
    draft.regime = "secours10";
  });
  const report = evaluateGates({ scenario: textileUnderPermanente });

  test("textile in a permanent installation is a Solve breach on `Famille de ligne`", () => {
    expect(report.errors[0]).toMatchObject({
      gate: "solve",
      field: "family",
      message: "⛔ Corde impossible en installation permanente (§10.4).",
    });
    expect(report.passed.solve).toBe(false);
  });

  test("two Fix Actions, `Passer au câble` first — neither repair is privileged on a link", () => {
    // Withholding the second forces a recipient to discard the Material Spec the link was sent to
    // show them; an auto-switch would discard it without asking.
    expect(report.errors[0].fixes.map((fix) => fix.label)).toEqual([
      "Passer au câble",
      "Passer à l'installation temporaire",
    ]);
  });

  test("blocking errors are a list, not a singleton — **family first**", () => {
    // `use=perm & fam=tx & reg=secours10` raises two at once, and applying one Fix Action leaves
    // the other standing rather than cascading a silent second repair.
    expect(report.errors.map((error) => error.field)).toEqual(["family", "regime"]);
    expect(blockingSummary(report)).toBe("⛔ 2 erreurs bloquantes — aucun résultat");
  });

  test("the same rope under TEMPORAIRE passes every gate", () => {
    const ok = evaluateGates({
      scenario: scenario((draft) => {
        draft.usage = "TEMPORAIRE";
        onRope(draft, { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 });
        draft.regime = "secours10";
      }),
    });
    expect(ok.errors).toEqual([]);
    expect(blockingSummary(ok)).toBeNull();
  });
});

describe("the Verdict Gate's régime × famille rule", () => {
  test("« Secours sur corde 10:1 » on a steel cable is a Verdict breach with a focus action", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "secours10";
      }),
    });
    expect(report.errors[0]).toMatchObject({
      gate: "verdict",
      field: "regime",
      fixes: [{ id: "choisir-un-autre-regime", label: "Choisir un autre régime" }],
    });
    // The shipped line is steel **and** `PERMANENTE`: it misses both of the régime's clauses, and
    // the message names both, family first.
    expect(report.errors[0].message).toBe(
      "⛔ Régime « Secours sur corde — 10:1 » indisponible avec un câble et en installation permanente.",
    );
    // A bad régime never blocks the solve: `T max` and `Garde min` stay on screen.
    expect(report.passed.solve).toBe(true);
    expect(report.passed.clearance).toBe(true);
  });

  test("under `PERMANENTE` the clause names the **use class**, never the régime's own rope", () => {
    // § 10.1 disables this entry « sous acier, **ou** sous `PERMANENTE` », and ticket 34 found the
    // second condition printing the first condition's shape: on `textile` + `PERMANENTE` the app
    // read « indisponible avec une corde », blaming the family this régime *requires*. The
    // rope is never the cause here — § 10.4's own breach, filed alongside, is the one that names it.
    const report = evaluateGates({
      scenario: scenario((draft) => {
        onRope(draft, { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 });
        draft.regime = "secours10";
      }),
    });
    const regimeError = report.errors.find((error) => error.field === "regime");
    expect(regimeError?.message).toBe(
      "⛔ Régime « Secours sur corde — 10:1 » indisponible en installation permanente.",
    );
    expect(regimeError?.message).not.toContain("corde textile");
  });

  test("the same régime under textile + `TEMPORAIRE` raises no cause clause at all", () => {
    // Availability and its explanation read the same `requires`, so the sentence exists exactly
    // when the predicate rejects — never on the pair the régime was written for.
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.usage = "TEMPORAIRE";
        onRope(draft, { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 });
        draft.regime = "secours10";
      }),
    });
    expect(report.errors.filter((error) => error.field === "regime")).toEqual([]);
  });
});

describe("§ 10.1 — the régime select's note shows the reason", () => {
  test("steel under `TEMPORAIRE` names the family alone, and the gate agrees", () => {
    expect(regimeUnavailableNote("secours10", "steel", "TEMPORAIRE")).toBe(
      "Indisponible — ce régime suppose une corde ; la famille active est le câble.",
    );
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.usage = "TEMPORAIRE";
        draft.regime = "secours10";
      }),
    });
    expect(report.errors.find((error) => error.field === "regime")?.message).toBe(
      "⛔ Régime « Secours sur corde — 10:1 » indisponible avec un câble.",
    );
  });

  test("textile under `PERMANENTE` names the use class that blocks it", () => {
    expect(regimeUnavailableNote("secours10", "textile", "PERMANENTE")).toBe(
      "Indisponible — ce régime ne couvre pas une installation permanente.",
    );
  });

  test("both clauses failing is **one** sentence naming both, not two notes", () => {
    expect(regimeUnavailableNote("secours10", "steel", "PERMANENTE")).toBe(
      "Indisponible — ce régime suppose une corde et une installation temporaire.",
    );
  });

  test("a choosable régime has no note, in every combination", () => {
    // The note exists exactly where the gate would file the régime: one mismatch read, both
    // surfaces worded from it.
    for (const regime of ["en15567", "wsqld", "acct10", "ansi5"] as const) {
      for (const family of ["steel", "textile"] as const) {
        for (const usage of ["PERMANENTE", "TEMPORAIRE"] as const) {
          expect(regimeUnavailableNote(regime, family, usage)).toBeNull();
        }
      }
    }
    expect(regimeUnavailableNote("secours10", "textile", "TEMPORAIRE")).toBeNull();
  });
});

describe("« No rope ships » — the two blanks a family flip lands on", () => {
  const report = evaluateGates({
    scenario: scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      onRope(draft, { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 });
      draft.regime = "secours10";
    }),
  });

  test("`MBL` and `μ` raise blocking errors, **not** « Saisie en cours »", () => {
    // A field the user never filled is not mid-edit, so it blocks and keeps no stale picture.
    expect(report.errors.map((error) => error.field)).toEqual(["MBL", "muTextile"]);
    expect(report.passed.solve).toBe(false);
    expect(blockingSummary(report)).toBe("⛔ 2 erreurs bloquantes — aucun résultat");
  });

  test("their copy is the neutral one — the consequence is rendered on the output half", () => {
    for (const error of report.errors) {
      expect(error.kind).toBe("empty");
      expect(error.message).toBe("valeur requise");
    }
  });

  test("polyester adds a third, and its message carries the reason instead of the hole", () => {
    const polyester = evaluateGates({
      scenario: scenario((draft) => {
        draft.usage = "TEMPORAIRE";
        onRope(draft, {
          family: "textile",
          ropeClass: "polyester",
          MBL: null,
          mu: null,
          k: null,
        });
        draft.regime = "secours10";
      }),
    });
    expect(polyester.errors.find((error) => error.field === "k")?.message).toBe(
      "valeur requise — aucune valeur publiée pour le polyester",
    );
  });
});

describe("an imported profil is taken whole (#88)", () => {
  const imported = scenario((draft) => {
    draft.geometry = { source: "trace", trace: "p1.x" };
    draft.regime = "en15567";
  });

  test("there is no placement to check, so the gates pass on the profil alone", () => {
    expect(evaluateGates({ scenario: imported }).errors).toEqual([]);
  });

  test("`Portée` and `Dénivelé` are not fields there, and the anchor heights still are", () => {
    expect(isFieldActive("L", imported)).toBe(false);
    expect(isFieldActive("h", imported)).toBe(false);
    expect(isFieldActive("zA", imported)).toBe(true);
    expect(isFieldActive("zB", imported)).toBe(true);
  });
});

describe("a link restores state faithfully, including invalid state", () => {
  test("`?L=-5` lights up on the first frame, with nobody having typed", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.geometry = { source: "manual", L: -5, h: -18 };
      }),
    });
    expect(report.errors[0]).toMatchObject({
      gate: "solve",
      field: "L",
      message: "⛔ Portée — une longueur strictement positive est requise. Valeur : −5,0 m.",
    });
  });

  test("an arrived force echoes in daN, not in the newtons state holds", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.tightness = { mode: "tension", H_target: -1000 };
      }),
    });
    expect(gateFor(report, "H_target")).toBe("solve");
    expect(report.errors.find((error) => error.field === "H_target")?.message).toContain(
      "Valeur : −100,0 daN.",
    );
  });

  test("only the **driving** tightness field is judged — the other two are read-outs", () => {
    const draft = scenario((draft) => {
      draft.tightness = { mode: "length", L0: 151.64 };
    });
    expect(isFieldActive("L0", draft)).toBe(true);
    expect(isFieldActive("D_target", draft)).toBe(false);
    expect(isFieldActive("H_target", draft)).toBe(false);
  });
});

describe("the gate matrix, one input at a time", () => {
  const cases: readonly [string, GateId, (draft: ScenarioDraft) => void][] = [
    ["L", "solve", (d) => void (d.geometry = { source: "manual", L: -1, h: 0 })],
    ["m_p", "solve", (d) => void (d.rider.mp = 0)],
    [
      "le champ de tension directeur",
      "solve",
      (d) => void (d.tightness = { mode: "sag", D_target: 0 }),
    ],
    [
      "Material Spec",
      "solve",
      (d) => void (d.material = { family: "steel", d: 0, R0: 1770, construction: "iwrc" }),
    ],
    ["hauteur d'ancrage A", "clearance", (d) => void (d.anchors.zA = -1)],
    ["hauteur d'ancrage B", "clearance", (d) => void (d.anchors.zB = -1)],
    ["h_rider", "clearance", (d) => void (d.rider.hRider = 0)],
    ["DAF", "verdict", (d) => void (d.rider.DAF = 0)],
    ["terminaison A", "verdict", (d) => void (d.terminations.A = { ...d.terminations.A, eta: 0 })],
    ["terminaison B", "verdict", (d) => void (d.terminations.B = { ...d.terminations.B, eta: 0 })],
    ["vitesse du vent", "wind", (d) => void (d.wind = { speedKmh: -60, directionDeg: 0 })],
    ["C_dA", "ride", (d) => void (d.dynamics = { ...d.dynamics, CdA: -0.45 })],
    ["ρ", "ride", (d) => void (d.dynamics = { ...d.dynamics, rho: -1.2 })],
  ];

  test.each(cases)("%s breaches the %s gate", (_label, gate, patch) => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
        patch(draft);
      }),
    });
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].gate).toBe(gate);
    expect(report.passed[gate]).toBe(false);
  });

  test("a Clearance breach leaves Solve standing — the cable still draws", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
        draft.rider.hRider = 0;
      }),
    });
    expect(report.passed).toEqual({
      solve: true,
      clearance: false,
      verdict: true,
      wind: true,
      ride: true,
    });
    expect(blockingSummary(report)).toBe("⛔ 1 erreur bloquante — garde au sol indisponible");
  });

  test("a negative wind speed is kept and gated: statics, garde and Verdict stand (ADR-0001)", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
        draft.wind = { speedKmh: -60, directionDeg: 0 };
      }),
    });
    expect(report.passed).toEqual({
      solve: true,
      clearance: true,
      verdict: true,
      wind: false,
      ride: true,
    });
    expect(report.errors[0]).toMatchObject({
      field: "windSpeed",
      kind: "invalid",
      message: "⛔ Vitesse du vent — une vitesse négative n'existe pas. Valeur : −60 km/h.",
    });
    expect(blockingSummary(report)).toBe("⛔ 1 erreur bloquante — vent indisponible");
  });

  test("the other family's trolley constant is not on screen, so it blocks nothing", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.material = { family: "steel", d: 12, R0: 1770, construction: "iwrc" };
        draft.dynamics = { ...draft.dynamics, F0: -1, kv: -1 };
      }),
    });
    expect(report.errors).toEqual([]);
  });

  test("`x_D` sits in no gate: an out-of-span viewpoint blocks nothing", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
        draft.rider.xD = 4000;
      }),
    });
    expect(report.errors).toEqual([]);
  });

  test("the consequences are § 7's own third column, then what the passager's ride loses", () => {
    expect(GATE_CONSEQUENCE).toEqual({
      solve: "aucun résultat",
      clearance: "garde au sol indisponible",
      verdict: "aucun verdict",
      wind: "vent indisponible",
      ride: "aucune estimation",
    });
  });
});

describe("tier one arrives from the form for the text the Scenario cannot hold", () => {
  test("an emptied required field breaches its own gate", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
      }),
      issues: [{ field: "mp", kind: "empty", message: "valeur requise" }],
    });
    expect(report.errors).toEqual([
      {
        gate: "solve",
        kind: "empty",
        field: "mp",
        alsoOutlined: [],
        message: "valeur requise",
        fixes: [],
      },
    ]);
  });

  test("an issue on a field the current family does not render is ignored", () => {
    // A stale `MBL` issue under `fam=ac` would block a steel line on a rope nobody can see.
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
      }),
      issues: [{ field: "MBL", kind: "empty", message: "valeur requise" }],
    });
    expect(report.errors).toEqual([]);
  });

  test("one breach per field: a scenario check never doubles a standing form issue", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
        draft.rider.mp = -1;
      }),
      issues: [
        {
          field: "mp",
          kind: "unreadable",
          message: "⛔ Masse du passager — nombre illisible. Saisie : « x ».",
        },
      ],
    });
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].kind).toBe("unreadable");
  });
});

describe("« Saisie en cours » — a required field empty **and holding focus**", () => {
  const report = evaluateGates({
    scenario: scenario((draft) => {
      draft.regime = "en15567";
    }),
    issues: [{ field: "D_target", kind: "empty", message: "valeur requise" }],
  });

  test("it names the field and its last committed value", () => {
    const state = scenario();
    expect(
      saisieEnCours(
        report,
        "D_target",
        committedValue(state, "D_target", deduceValues(state, null)),
      ),
    ).toEqual({
      field: "D_target",
      message: "Saisie en cours — ces valeurs correspondent à Flèche à vide 6,00 m.",
    });
  });

  test("on « Rapport V » it names the ratio the Scenario still holds", () => {
    const state = scenario((draft) => {
      draft.tightness = { mode: "ratio", ratio: 0.46 };
    });
    const midEdit = evaluateGates({
      scenario: state,
      issues: [{ field: "vRatio", kind: "empty", message: "valeur requise" }],
    });
    const committed = committedValue(state, "vRatio", deduceValues(state, null));
    expect(saisieEnCours(midEdit, "vRatio", committed)).toEqual({
      field: "vRatio",
      message: "Saisie en cours — ces valeurs correspondent à Rapport V 0,46.",
    });
  });

  test("on an unset Override it names the formula value the row shows", () => {
    // No override ships on first run, so « Charge de rupture » shows §13.1's formula:
    // K·d²·R₀ = 0,356 × 12² mm² × 1770 N/mm² = 90 737 N, which reads 9074 daN.
    const state = scenario();
    const midEdit = evaluateGates({
      scenario: state,
      issues: [{ field: "mbfOverride", kind: "empty", message: "valeur requise" }],
    });
    const committed = committedValue(state, "mbfOverride", deduceValues(state, null));
    expect(saisieEnCours(midEdit, "mbfOverride", committed)).toEqual({
      field: "mbfOverride",
      message: "Saisie en cours — ces valeurs correspondent à Charge de rupture 9074 daN.",
    });
  });

  test("the same field **blurred** is not mid-edit — it falls to « Aucun résultat »", () => {
    // Without the focus clause, walking away from a half-typed form leaves a stale Sweep on screen
    // indefinitely, which is the one thing the split exists to prevent.
    expect(saisieEnCours(report, null, "6,00 m")).toBeNull();
  });

  test("a focused field with a ⛔ value is not mid-edit either", () => {
    const invalid = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
        draft.rider.mp = -1;
      }),
    });
    expect(saisieEnCours(invalid, "mp", "120 kg")).toBeNull();
  });

  test("it needs no `isTouched`, because this app has no submit to set it", () => {
    // TanStack Form marks every field touched on submit; nothing here may depend on that
    // transition. Focus is the property § 7 names, and it is the only one read.
    expect(saisieEnCours(report, "mp", "120 kg")).toBeNull();
  });
});

describe("the culprit table — static, indexed by (grandeur × mode), never inference", () => {
  test("§ 7's rows, verbatim", () => {
    expect(culprits("L", "manuel")).toEqual(["L"]);
    expect(culprits("h", "manuel")).toEqual(["h"]);
    expect(culprits("L0", "mode Longueur")).toEqual(["L0"]);
    expect(culprits("L0", "mode Flèche")).toEqual(["D_target"]);
    expect(culprits("L0", "mode Prétension")).toEqual(["T_target"]);
    expect(culprits("L0", "mode Tension horizontale")).toEqual(["H_target"]);
  });

  test("an imported `L` has no culprit and an imported `h` names the two heights (#88)", () => {
    // The anchors stand on the profil's two ends: no field moves `L`, and `h` moves with A and B.
    expect(culprits("L", "importé")).toEqual([]);
    expect(culprits("h", "importé")).toEqual(["zA", "zB"]);
  });

  test("the steel rows follow §13.1's formulas, not the field group", () => {
    // `MBF` depends on all three inputs; `EA` and `μ` depend on **`d` alone**, because `E_app`, `C`
    // and `W` are pinned midpoints and not construction-indexed. Listing Grade and Construction as
    // culprits for `EA` would send a user to two fields that cannot move the number.
    expect(culprits("MBF", "câble")).toEqual(["d", "R0", "cst"]);
    expect(culprits("EA", "câble")).toEqual(["d"]);
    expect(culprits("mu", "câble")).toEqual(["d"]);
  });

  test("an overridden derived value is its own culprit", () => {
    expect(culprits("MBF", "câble surchargé")).toEqual(["mbfOverride"]);
    expect(culprits("EA", "câble surchargé")).toEqual(["eaOverride"]);
    expect(culprits("mu", "câble surchargé")).toEqual(["muOverride"]);
  });

  test("textile's two rows", () => {
    expect(culprits("EA", "corde")).toEqual(["k", "MBL"]);
    expect(culprits("mu", "corde")).toEqual(["muTextile"]);
  });

  test("no row exists for a quantity with no hard check", () => {
    // `flèche à vide`, `H à vide`, `tension permanente`, `corde` and `FS effectif` are solve
    // outputs judged by warnings and by the verdict, so they never need a culprit.
    expect(culprits("L", "câble")).toEqual([]);
  });
});

const KNOT_ON_HMPE =
  "⛔ Nœud impossible sur HMPE — il y glisse, sans rendement défendable (§10.3).";
const TO_SPLICED_EYE = {
  id: "passer-a-la-terminaison-de-depart",
  label: "Passer à « Œil cousu / épissuré »",
};

describe("ADR-0001 — a knot on HMPE is kept as given and blocks the verdict", () => {
  const knotted = scenario((draft) => {
    draft.usage = "TEMPORAIRE";
    draft.regime = "secours10";
    draft.material = { family: "textile", ropeClass: "hmpe", MBL: 2e5, mu: 0.07, k: 22 };
    draft.terminations = {
      A: { id: "noeud-de-huit", eta: 0.6 },
      B: { id: "noeud-de-chaise", eta: 0.55 },
    };
  });
  const report = evaluateGates({ scenario: knotted });

  test("one Verdict-gate error on Terminaison A, B outlined", () => {
    expect(report.errors).toEqual([
      {
        gate: "verdict",
        kind: "invalid",
        field: "ta",
        alsoOutlined: ["tb"],
        message: KNOT_ON_HMPE,
        fixes: [TO_SPLICED_EYE],
      },
    ]);
  });

  test("geometry and clearance still solve; only the verdict goes", () => {
    expect(report.passed).toEqual({
      solve: true,
      clearance: true,
      verdict: false,
      wind: true,
      ride: true,
    });
    expect(blockingSummary(report)).toBe("⛔ 1 erreur bloquante — aucun verdict");
  });

  test("the Fix Action puts the spliced eye on both ends and clears the list", () => {
    const fixed = applyShippedTerminations(knotted, report.errors[0]);
    expect(fixed.terminations).toEqual({
      A: { id: "oeil-cousu-epissure", eta: 0.9 },
      B: { id: "oeil-cousu-epissure", eta: 0.9 },
    });
    expect(evaluateGates({ scenario: fixed }).errors).toEqual([]);
  });

  test("switching a knotted PA rope to HMPE keeps the knots and raises the error", () => {
    const pa = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      draft.material = { family: "textile", ropeClass: "pa-en1891a", MBL: 3e5, mu: 0.08, k: 1.5 };
      draft.terminations = {
        A: { id: "noeud-de-huit", eta: 0.6 },
        B: { id: "noeud-de-chaise", eta: 0.55 },
      };
    });
    expect(evaluateGates({ scenario: pa }).errors).toEqual([]);
    const hmpe = evaluateGates({ scenario: applyRopeClass(pa, "hmpe") });
    expect(hmpe.errors.map((error) => [error.field, error.message])).toEqual([
      ["ta", KNOT_ON_HMPE],
    ]);
  });
});

describe("ADR-0001 — an end of the other family is kept as given and blocks the verdict", () => {
  test("a textile knot on a steel line, repaired with the steel cosse", () => {
    const steel = scenario((draft) => {
      draft.terminations.A = { id: "noeud-de-huit", eta: 0.6 };
    });
    const report = evaluateGates({ scenario: steel });
    expect(report.errors).toEqual([
      {
        gate: "verdict",
        kind: "invalid",
        field: "ta",
        alsoOutlined: [],
        message: "⛔ Terminaison de corde impossible sur un câble (§10.2).",
        fixes: [
          {
            id: "passer-a-la-terminaison-de-depart",
            label: "Passer à « Cosse à sertir / œil Flamand (EN 13411-3) »",
          },
        ],
      },
    ]);
    const fixed = applyShippedTerminations(steel, report.errors[0]);
    expect(fixed.terminations.A).toEqual({ id: "cosse-oeil-flamand", eta: 0.9 });
    expect(evaluateGates({ scenario: fixed }).errors).toEqual([]);
  });

  test("a steel termination on a rope, repaired with the spliced eye", () => {
    const rope = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      onRope(draft, { family: "textile", ropeClass: "pa-en1891a", MBL: 3e5, mu: 0.08, k: 1.5 });
      draft.terminations.B = { id: "cosse-oeil-flamand", eta: 0.9 };
    });
    const report = evaluateGates({ scenario: rope });
    expect(report.errors).toEqual([
      {
        gate: "verdict",
        kind: "invalid",
        field: "tb",
        alsoOutlined: [],
        message: "⛔ Terminaison de câble impossible sur une corde (§10.3).",
        fixes: [TO_SPLICED_EYE],
      },
    ]);
    const fixed = applyShippedTerminations(rope, report.errors[0]);
    expect(evaluateGates({ scenario: fixed }).errors).toEqual([]);
  });

  test("two causes are two errors, and repairing one leaves the other standing", () => {
    const mixed = scenario((draft) => {
      draft.usage = "TEMPORAIRE";
      onRope(draft, { family: "textile", ropeClass: "hmpe", MBL: 2e5, mu: 0.07, k: 22 });
      draft.terminations = {
        A: { id: "noeud-de-huit", eta: 0.6 },
        B: { id: "cosse-oeil-flamand", eta: 0.9 },
      };
    });
    const report = evaluateGates({ scenario: mixed });
    expect(report.errors.map((error) => [error.field, error.alsoOutlined])).toEqual([
      ["ta", []],
      ["tb", []],
    ]);
    const once = evaluateGates({
      scenario: applyShippedTerminations(mixed, report.errors[0]),
    });
    expect(once.errors.map((error) => error.field)).toEqual(["tb"]);
  });
});

describe("terminationOptions — the picker's entries and its one reason", () => {
  const ids = (options: readonly { value: string; disabled: boolean }[]) =>
    options.map((option) => [option.value, option.disabled]);

  test("steel lists §10.2's five ends and the hitch, none disabled", () => {
    const { options, reason } = terminationOptions("steel", null, "cosse-oeil-flamand");
    expect(ids(options)).toEqual([
      ["manchon-metal-resine", false],
      ["cosse-oeil-flamand", false],
      ["epissure", false],
      ["manchon-a-coin", false],
      ["serre-cables-etrier", false],
      ["attelage-sans-tension", false],
    ]);
    expect(reason).toBeNull();
  });

  test("HMPE disables both knots, with §10.3's reason once", () => {
    const { options, reason } = terminationOptions("textile", "hmpe", "oeil-cousu-epissure");
    expect(ids(options)).toEqual([
      ["oeil-cousu-epissure", false],
      ["epissure-longue-hmpe", false],
      ["noeud-de-huit", true],
      ["noeud-de-chaise", true],
      ["attelage-sans-tension", false],
    ]);
    expect(reason).toBe(
      "§10.3 : sur HMPE le nœud glisse (0,25–0,50). Aucun rendement défendable ⇒ épissure obligatoire.",
    );
  });

  test("PA keeps the knots choosable", () => {
    const { options, reason } = terminationOptions("textile", "pa-en1891a", "noeud-de-huit");
    expect(options.some((option) => option.disabled)).toBe(false);
    expect(reason).toBeNull();
  });

  test("a held end of the other family is listed last, disabled, and adds no knot reason", () => {
    const { options, reason } = terminationOptions("steel", null, "noeud-de-huit");
    expect(ids(options).at(-1)).toEqual(["noeud-de-huit", true]);
    expect(options.filter((option) => option.value === "noeud-de-huit")).toHaveLength(1);
    expect(reason).toBeNull();
  });
});

describe("the terrain register (#91)", () => {
  test("an unavailable régime is « marge exigée » in the message and in its Fix Action", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "secours10";
      }),
      register: "terrain",
    });
    expect(report.errors.map(({ field, message, fixes }) => ({ field, message, fixes }))).toEqual([
      {
        field: "regime",
        message:
          "⛔ Marge exigée « Secours sur corde — 10:1 » indisponible avec un câble et en installation permanente.",
        fixes: [{ id: "choisir-un-autre-regime", label: "Choisir une autre marge exigée" }],
      },
    ]);
  });

  test("a value only Avancé shows is refused without its exact name", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.rider.DAF = -1;
      }),
      register: "terrain",
    });
    expect(report.errors.map((error) => error.message)).toEqual([
      "⛔ Réglage de la Page Avancé — une valeur strictement positive est requise. Valeur : −1,0.",
    ]);
  });
});
