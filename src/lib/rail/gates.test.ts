import { describe, expect, test } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { firstRunDefaults } from "@/lib/scenario/first-run.ts";

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
} from "./gates.ts";

/**
 * The three gates — « v1 build spec » § 7 (*Les trois grilles de validation*, *Le résumé bloquant*,
 * *« Saisie en cours »*, *La table des champs responsables*) and § 3 (*The three validation
 * gates*).
 *
 * The ticket's gate, as predicates over a Scenario:
 *
 * | Grille | Entrées |
 * | --- | --- |
 * | Solve | `L`, `h`, le champ de tension directeur, famille + Material Spec, famille × usage (§10.4), `m_p` |
 * | Clearance | hauteurs d'ancrage A / B, terrain (stations), `h_rider` |
 * | Verdict | régime, les deux terminaisons, `DAF` |
 */

/** A 224 m profile, the length of `example-profile-trace2.csv`, at a metre-per-100 m slope. */
const TRACE: Trace = {
  d: Float64Array.from([0, 112, 224]),
  z: Float64Array.from([540, 520, 500]),
  dev: 0,
  fileName: "profil-2.csv",
};

function scenario(patch: (draft: ScenarioDraft) => void = () => {}): ScenarioDraft {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  return draft;
}

/** The gate a given field's breach was filed under, or `undefined` when nothing was raised. */
function gateFor(report: ReturnType<typeof evaluateGates>, field: FieldId): GateId | undefined {
  return report.errors.find((error) => error.field === field)?.gate;
}

describe("the first screen — verdict-less, and it still computes", () => {
  const report = evaluateGates({ scenario: scenario(), trace: null });

  test("Solve and Clearance pass; only the Verdict Gate is breached", () => {
    // « Régime choisi » is **struck** from the Solve Gate: as ticket 04 wrote it, first run blocked
    // the engine and showed an empty chart, destroying manual-mode ground's own reason for
    // existing. Garde min is geometric fact and the tension envelope is physics.
    expect(report.passed).toEqual({ solve: true, clearance: true, verdict: false });
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
      trace: null,
    });
    expect(chosen.noRegime).toBe(false);
    expect(chosen.passed).toEqual({ solve: true, clearance: true, verdict: true });
  });

  test("no banner line at all on the shipped scenario", () => {
    // ELECTIONS §0.4's copy is true only for a Solve breach, and here there is no breach to count:
    // the opening screen prints the neutral prompt, never « ⛔ 1 erreur bloquante ».
    expect(blockingSummary(report)).toBeNull();
  });
});

describe("§10.4 — the use-class gate, family first, two Fix Actions", () => {
  const textileUnderPermanente = scenario((draft) => {
    draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
    draft.regime = "secours10";
  });
  const report = evaluateGates({ scenario: textileUnderPermanente, trace: null });

  test("textile in a permanent installation is a Solve breach on `Famille de ligne`", () => {
    expect(report.errors[0]).toMatchObject({
      gate: "solve",
      field: "family",
      message: "⛔ Corde textile impossible en installation permanente (§10.4).",
    });
    expect(report.passed.solve).toBe(false);
  });

  test("two Fix Actions, `Passer à l'acier` first — neither repair is privileged on a link", () => {
    // Withholding the second forces a recipient to discard the Material Spec the link was sent to
    // show them; an auto-switch would discard it without asking.
    expect(report.errors[0].fixes.map((fix) => fix.label)).toEqual([
      "Passer à l'acier",
      "Passer en usage temporaire",
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
        draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
        draft.regime = "secours10";
      }),
      trace: null,
    });
    expect(ok.errors).toEqual([]);
    expect(blockingSummary(ok)).toBeNull();
  });
});

describe("the Verdict Gate's régime × famille rule", () => {
  test("« Secours textile 10:1 » on a steel cable is a Verdict breach with a focus action", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "secours10";
      }),
      trace: null,
    });
    expect(report.errors[0]).toMatchObject({
      gate: "verdict",
      field: "regime",
      fixes: [{ id: "choisir-un-autre-regime", label: "Choisir un autre régime" }],
    });
    // The shipped line is steel **and** `PERMANENTE`: it misses both of the régime's clauses, and
    // the message names both, family first.
    expect(report.errors[0].message).toBe(
      "⛔ Régime « Secours textile — 10:1 » indisponible avec un câble acier et en installation permanente.",
    );
    // A bad régime never blocks the solve: `T max` and `Garde min` stay on screen.
    expect(report.passed.solve).toBe(true);
    expect(report.passed.clearance).toBe(true);
  });

  test("under `PERMANENTE` the clause names the **use class**, never the régime's own rope", () => {
    // § 10.1 disables this entry « sous acier, **ou** sous `PERMANENTE` », and ticket 34 found the
    // second condition printing the first condition's shape: on `textile` + `PERMANENTE` the app
    // read « indisponible avec une corde textile », blaming the family this régime *requires*. The
    // rope is never the cause here — § 10.4's own breach, filed alongside, is the one that names it.
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
        draft.regime = "secours10";
      }),
      trace: null,
    });
    const regimeError = report.errors.find((error) => error.field === "regime");
    expect(regimeError?.message).toBe(
      "⛔ Régime « Secours textile — 10:1 » indisponible en installation permanente.",
    );
    expect(regimeError?.message).not.toContain("corde textile");
  });

  test("the same régime under textile + `TEMPORAIRE` raises no cause clause at all", () => {
    // Availability and its explanation read the same `requires`, so the sentence exists exactly
    // when the predicate rejects — never on the pair the régime was written for.
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.usage = "TEMPORAIRE";
        draft.material = { family: "textile", ropeClass: "hmpe", MBL: 1e5, mu: 0.1, k: 22 };
        draft.regime = "secours10";
      }),
      trace: null,
    });
    expect(report.errors.filter((error) => error.field === "regime")).toEqual([]);
  });
});

describe("§ 10.1 — the régime select's note shows the reason", () => {
  test("steel under `TEMPORAIRE` names the family alone, and the gate agrees", () => {
    expect(regimeUnavailableNote("secours10", "steel", "TEMPORAIRE")).toBe(
      "Indisponible — ce régime suppose une corde textile ; la famille active est l'acier.",
    );
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.usage = "TEMPORAIRE";
        draft.regime = "secours10";
      }),
      trace: null,
    });
    expect(report.errors.find((error) => error.field === "regime")?.message).toBe(
      "⛔ Régime « Secours textile — 10:1 » indisponible avec un câble acier.",
    );
  });

  test("textile under `PERMANENTE` names the use class that blocks it", () => {
    expect(regimeUnavailableNote("secours10", "textile", "PERMANENTE")).toBe(
      "Indisponible — ce régime ne couvre pas un usage permanent.",
    );
  });

  test("both clauses failing is **one** sentence naming both, not two notes", () => {
    expect(regimeUnavailableNote("secours10", "steel", "PERMANENTE")).toBe(
      "Indisponible — ce régime suppose une corde textile et un usage temporaire.",
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
      draft.material = { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 };
      draft.regime = "secours10";
    }),
    trace: null,
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
        draft.material = {
          family: "textile",
          ropeClass: "polyester",
          MBL: null,
          mu: null,
          k: null,
        };
        draft.regime = "secours10";
      }),
      trace: null,
    });
    expect(polyester.errors.find((error) => error.field === "k")?.message).toBe(
      "valeur requise — aucune valeur publiée pour le polyester",
    );
  });
});

describe("imported placement — the hard checks run on **derived** values", () => {
  const imported = (sa: number, sb: number) =>
    scenario((draft) => {
      draft.geometry = { source: "trace", trace: "p1.x", sa, sb };
      draft.regime = "en15567";
    });

  test("`station B ≤ station A` blames Station A, outlines Station B, and offers one repair", () => {
    // Otherwise `L = 0` reaches `solveSpan` and returns `invalid-input{field:"L"}` pointing at a
    // field the user cannot edit — the invariant the culprit table exists for.
    const report = evaluateGates({ scenario: imported(120, 120), trace: TRACE });
    expect(report.errors[0]).toEqual({
      gate: "solve",
      kind: "invalid",
      field: "sa",
      alsoOutlined: ["sb"],
      message: "⛔ Portée nulle ou négative — l'ancrage B est avant l'ancrage A.",
      fixes: [{ id: "inverser-a-b", label: "Inverser A et B" }],
    });
  });

  test("`[ Inverser A et B ]` rather than a silent auto-swap, which would flip the sign of `h`", () => {
    const report = evaluateGates({ scenario: imported(120, 120), trace: TRACE });
    expect(report.errors[0].fixes[0].label).toBe("Inverser A et B");
  });

  test("a station off the trace names the file's own bound", () => {
    const report = evaluateGates({ scenario: imported(0, 260), trace: TRACE });
    expect(report.errors[0]).toMatchObject({
      gate: "solve",
      field: "sb",
      message: "⛔ Station hors du tracé (0,0 – 224,0 m). Valeur : 260,0 m.",
    });
  });

  test("a valid placement passes, and `Portée` / `Dénivelé` are not fields there at all", () => {
    const report = evaluateGates({ scenario: imported(0, 224), trace: TRACE });
    expect(report.errors).toEqual([]);
    const draft = imported(0, 224);
    expect(isFieldActive("L", draft)).toBe(false);
    expect(isFieldActive("sa", draft)).toBe(true);
  });
});

describe("a link restores state faithfully, including invalid state", () => {
  test("`?L=-5` lights up on the first frame, with nobody having typed", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.geometry = { source: "manual", L: -5, h: -18 };
      }),
      trace: null,
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
      trace: null,
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
  ];

  test.each(cases)("%s breaches the %s gate", (_label, gate, patch) => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
        patch(draft);
      }),
      trace: null,
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
      trace: null,
    });
    expect(report.passed).toEqual({ solve: true, clearance: false, verdict: true });
    expect(blockingSummary(report)).toBe("⛔ 1 erreur bloquante — garde au sol indisponible");
  });

  test("`x_D` sits in no gate: an out-of-span viewpoint blocks nothing", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
        draft.rider.xD = 4000;
      }),
      trace: null,
    });
    expect(report.errors).toEqual([]);
  });

  test("the three consequences are § 7's own third column", () => {
    expect(GATE_CONSEQUENCE).toEqual({
      solve: "aucun résultat",
      clearance: "garde au sol indisponible",
      verdict: "aucun verdict",
    });
  });
});

describe("tier one arrives from the form for the text the Scenario cannot hold", () => {
  test("an emptied required field breaches its own gate", () => {
    const report = evaluateGates({
      scenario: scenario((draft) => {
        draft.regime = "en15567";
      }),
      trace: null,
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
      trace: null,
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
      trace: null,
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
    trace: null,
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
      message: "Saisie en cours — ces valeurs correspondent à Flèche à vide cible 6,00 m.",
    });
  });

  test("on « Rapport V cible » it names the ratio the Scenario still holds", () => {
    const state = scenario((draft) => {
      draft.tightness = { mode: "ratio", ratio: 0.46 };
    });
    const midEdit = evaluateGates({
      scenario: state,
      trace: null,
      issues: [{ field: "vRatio", kind: "empty", message: "valeur requise" }],
    });
    const committed = committedValue(state, "vRatio", deduceValues(state, null));
    expect(saisieEnCours(midEdit, "vRatio", committed)).toEqual({
      field: "vRatio",
      message: "Saisie en cours — ces valeurs correspondent à Rapport V cible 0,46.",
    });
  });

  test("on an unset Override it names the formula value the row shows", () => {
    // No override ships on first run, so « Charge de rupture » shows §13.1's formula:
    // K·d²·R₀ = 0,356 × 12² mm² × 1770 N/mm² = 90 737 N, which reads 9074 daN.
    const state = scenario();
    const midEdit = evaluateGates({
      scenario: state,
      trace: null,
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
      trace: null,
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
    expect(culprits("L", "importé")).toEqual(["sa", "sb"]);
    expect(culprits("h", "manuel")).toEqual(["h"]);
    expect(culprits("h", "importé")).toEqual(["sa", "sb", "zA", "zB"]);
    expect(culprits("L0", "mode Longueur")).toEqual(["L0"]);
    expect(culprits("L0", "mode Flèche")).toEqual(["D_target"]);
    expect(culprits("L0", "mode Tension")).toEqual(["H_target"]);
  });

  test("the steel rows follow §13.1's formulas, not the field group", () => {
    // `MBF` depends on all three inputs; `EA` and `μ` depend on **`d` alone**, because `E_app`, `C`
    // and `W` are pinned midpoints and not construction-indexed. Listing Grade and Construction as
    // culprits for `EA` would send a user to two fields that cannot move the number.
    expect(culprits("MBF", "acier")).toEqual(["d", "R0", "cst"]);
    expect(culprits("EA", "acier")).toEqual(["d"]);
    expect(culprits("mu", "acier")).toEqual(["d"]);
  });

  test("an overridden derived value is its own culprit", () => {
    expect(culprits("MBF", "acier surchargé")).toEqual(["mbfOverride"]);
    expect(culprits("EA", "acier surchargé")).toEqual(["eaOverride"]);
    expect(culprits("mu", "acier surchargé")).toEqual(["muOverride"]);
  });

  test("textile's two rows", () => {
    expect(culprits("EA", "textile")).toEqual(["k", "MBL"]);
    expect(culprits("mu", "textile")).toEqual(["muTextile"]);
  });

  test("no row exists for a quantity with no hard check", () => {
    // `flèche à vide`, `H à vide`, `tension permanente`, `corde` and `FS effectif` are solve
    // outputs judged by warnings and by the verdict, so they never need a culprit.
    expect(culprits("L", "acier")).toEqual([]);
  });
});
