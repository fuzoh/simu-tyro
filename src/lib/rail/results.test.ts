import { describe, expect, test, vi } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { RegimeId, SweepStep, VerdictInput } from "@/lib/sim";

import { formatQuantity } from "@/lib/format/quantity.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { sweepRider, sweepRiderOf } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";
import { evaluateVerdict } from "@/lib/sim";
import { exactTermsIn, label, proscribedIn } from "@/lib/vocabulary/labels.ts";

import type { ResultRowId, Results, SolvedTraverse } from "./results.ts";

import {
  clearanceBreached,
  deriveResults,
  NO_REGIME_ASIDE,
  PER_LINE_SCOPE,
  REGIME_PROMPT,
  refusalReason,
  TRAVERSE_SCOPE,
  verdictSentence,
} from "./results.ts";

/**
 * The Rail's output half — « v1 build spec » § 6 and § 9 (*« Résultats sans régime »*).
 *
 * The shipped line is the worked example, so most rows below are the **first-run lock's own
 * strings** arriving through a second path: `src/lib/scenario/first-run.test.ts` freezes them from
 * the engine chain, and this file freezes what the Rail prints from them. A regression in either
 * the engine or § 3's precision table breaks both, on purpose.
 *
 * Five things this file exists to pin down:
 *
 * - **The gate: « Résultats sans régime » makes five things absent, not dashed.** The four
 *   `k`-dependent rows *and* the criteria × ends grid, because one gate suppresses both. No string
 *   this module emits ever contains « — »: that glyph is `Indéterminé`'s alone.
 * - **The headline `T max` is the amplified envelope**, 928,0 daN and not 817,2 — the quantity
 *   `FS effectif` divides by. The static envelope is a detail row with its amplification beside it.
 * - **The app's own envelope agrees with `evaluateVerdict`'s**, which is the check that earns
 *   `amplifiedTension` its place in the barrel: the reduced row set prints `T max` in a state where
 *   the engine's verdict is by contract never called.
 * - **The five verdict states, each naming the régime where the sentence is a claim about limits**
 *   — and never « conforme » / « non conforme ».
 * - **The suspended-load criterion is one cell with its numerator written out.** Read as `MBF/P` it
 *   scores 77 and can never bind; read as § 6 repairs it, it scores 12,29 against total tension's
 *   8,80, so total tension governs on the shipped line.
 */

const SHIPPED = firstRunDefaults();

/**
 * The fields of the chart's `SceneBase` that `deriveResults` reads, built from the same two
 * `lib/scenario` calls `buildSceneBase` makes — `lib/rail` may not import `lib/chart`.
 */
function solvedTraverseOf(scenario: ScenarioDraft): SolvedTraverse {
  const unloaded = deriveUnloaded(unloadedInputs(scenario, null));
  if (!unloaded.ok) throw new Error("the shipped scenario solves");
  const swept = sweepRider(unloaded, sweepRiderOf(scenario));
  if (swept === null) throw new Error("the shipped traverse solves");
  const { span, state, material } = unloaded;
  const { P, traverse, clearance, soleCarrier } = swept;
  return { L: span.L, h: span.h, unloaded: state, material, P, traverse, clearance, soleCarrier };
}

function resultsOf(patch: Partial<ScenarioDraft> = {}): Results {
  const scenario: ScenarioDraft = { ...SHIPPED, ...patch };
  const results = deriveResults({ scenario, base: solvedTraverseOf(scenario) });
  if (results === null) throw new Error("expected the shipped line to report results");
  return results;
}

function rowIds(results: Results): ResultRowId[] {
  return results.rows.map((row) => row.id);
}

function valueOf(results: Results, id: ResultRowId): string {
  const row = results.rows.find((candidate) => candidate.id === id);
  if (row === undefined) throw new Error(`no row ${id}`);
  return row.value;
}

describe("« Résultats sans régime » — the reduced row set", () => {
  const results = resultsOf();

  test("the four k-dependent rows and the grid are absent — the ticket's gate", () => {
    // Five things absent, not four: the criteria × ends grid goes with the rows, because the
    // Verdict Gate suppresses both.
    expect(rowIds(results)).toEqual([
      "Tmax",
      "clearance",
      "clearanceWhole",
      "TmaxA",
      "TmaxB",
      "Tstatic",
      "amplification",
      "loadedSag",
      "coverage",
    ]);
    expect(results.grid).toEqual([]);
    expect(results.banner).toBeNull();
    expect(results.verdict).toBeNull();
  });

  test("absent, never dashed — no row and no qualifier carries « — »", () => {
    // « — » is *tenté, indisponible*. Reusing it for *nothing attempted* collides with the
    // distinction five verdict states were bought to preserve, and a first screen full of dashes
    // on a line that solved 260/260 reads as a failed computation.
    for (const row of results.rows) {
      expect(row.value).not.toContain("—");
      expect(row.qualifier ?? "").not.toContain("—");
    }
  });

  test("the header carries both the scope and the reduction", () => {
    expect(results.scope).toBe(TRAVERSE_SCOPE);
    expect(results.aside).toBe(NO_REGIME_ASIDE);
  });

  test("one plain-text line replaces the four rows, and it emphasises the picker's name", () => {
    expect(results.prompt).toEqual(REGIME_PROMPT);
    expect(results.prompt?.emphasis).toBe("régime de sécurité");
    // No second button: `[ Choisir un régime ]` already lives in the banner.
    expect(REGIME_PROMPT.before).toContain("FS effectif, réserve de tension et T admissible");
  });

  test("the two numbers the app exists to produce are both live", () => {
    // Garde min is geometric fact — no `k` appears anywhere in §11 — and the tension envelope is
    // physics. All a régime adds is a divisor.
    expect(valueOf(results, "clearance")).toBe("2,42 m");
    expect(valueOf(results, "Tmax")).toBe("928,0 daN");
  });
});

describe("the thirteen reported values, on the shipped line under EN 15567-1", () => {
  const results = resultsOf({ regime: "en15567" });

  test("four headline rows, ten detail rows, no accordion", () => {
    expect(rowIds(results)).toEqual([
      "verdict",
      "FS",
      "Tmax",
      "clearance",
      "clearanceWhole",
      "reserve",
      "TadmA",
      "TadmB",
      "TmaxA",
      "TmaxB",
      "Tstatic",
      "amplification",
      "loadedSag",
      "coverage",
    ]);
    expect(results.rows.filter((row) => row.rank === "headline")).toHaveLength(4);
    // Ten with the Zones d'ancrage's unjudged garde (#106), which the shipped 10 m switches on.
    expect(results.rows.filter((row) => row.rank === "detail")).toHaveLength(10);
  });

  test("§ 9's canonical sketch, row by row", () => {
    expect(valueOf(results, "verdict")).toBe("Dans les limites — EN 15567-1 (k = 3,0)");
    expect(valueOf(results, "FS")).toBe("8,80");
    expect(valueOf(results, "Tmax")).toBe("928,0 daN");
    expect(valueOf(results, "clearance")).toBe("2,42 m");
    expect(valueOf(results, "reserve")).toBe("+1794 daN");
    expect(valueOf(results, "TadmA")).toBe("2722 daN");
    expect(valueOf(results, "TadmB")).toBe("2722 daN");
    expect(valueOf(results, "TmaxA")).toBe("928,0 daN");
    expect(valueOf(results, "TmaxB")).toBe("901,6 daN");
    expect(valueOf(results, "Tstatic")).toBe("817,2 daN");
    expect(valueOf(results, "amplification")).toBe("+110,8 daN");
    expect(valueOf(results, "loadedSag")).toBe("7,48 m");
    // `résolus / grid.length`, and the denominator is **260**: 240 uniform steps plus 10
    // geometric tail steps per end. Against 240 a fully solved traverse would read 260/240.
    expect(valueOf(results, "coverage")).toBe("260 / 260 pas");
  });

  test("the headline is the amplified envelope, and the static one is a detail row", () => {
    // A headline of 817,2 lets a reader compute 0,9·9074/817 = 10,00 against a printed 8,80 — a
    // reconciliation failure invisible in exactly the state that ships.
    expect(valueOf(results, "Tmax")).not.toBe(valueOf(results, "Tstatic"));
    const headline = results.rows.find((row) => row.id === "Tmax");
    expect(headline?.rank).toBe("headline");
    expect(results.rows.find((row) => row.id === "Tstatic")?.rank).toBe("detail");
    expect(results.rows.find((row) => row.id === "amplification")?.indent).toBe(true);
    expect(results.rows.find((row) => row.id === "amplification")?.label).toBe(
      "↳ majoration au départ",
    );
    expect(results.rows.find((row) => row.id === "amplification")?.qualifier).toBe("(× 1,2)");
  });

  test("the margin is a safety factor against the required k, never a percentage", () => {
    const fs = results.rows.find((row) => row.id === "FS");
    expect(fs?.qualifier).toBe("exigé 3,0");
    for (const row of results.rows) expect(row.value).not.toContain("%");
  });

  test("the « exigé k » is total tension's, because the printed FS is a total-tension ratio", () => {
    // `EndEnvelope.FS` is `η·MBF/T_DAF`. Reading the divisor off the *governing* cell instead pairs
    // it with whichever criterion scores worst, and under WorkSafe QLD the suspended-load cell can
    // govern while total tension passes: at `d` 6 mm the grid reads A 3,15 · B 3,24 against k = 3
    // and 3,50 against k = 5, so the headline would print « 3,15 · exigé 5,0 » — a passing margin
    // beside a divisor from another basis. A reader who divides finds the app contradicting its own
    // grid, which is the reconciliation failure § 6 spends a page preventing on `T max`.
    const thin = resultsOf({
      regime: "wsqld",
      material: { family: "steel", d: 6, R0: 1770, construction: "iwrc" },
      // The grid quoted here was measured with the 6 m flèche holding; under the tension de pose
      // first run now drives, a lighter cable hangs a different line.
      tightness: { mode: "sag", D_target: 6 },
    });
    expect(thin.verdict?.governing?.criterion).toBe("charge-suspendue");
    const fs = thin.rows.find((row) => row.id === "FS");
    expect(fs?.value).toBe("3,15");
    expect(fs?.qualifier).toBe("exigé 3,0");
    // The banner still names the governing cell: the two answer different questions, and only the
    // headline is a ratio the reader can re-derive.
    expect(thin.banner?.text).toBe("Hors limites — WorkSafe QLD 2019, critère charge suspendue");
  });

  test("the requirement survives a refusal, where `governing` is null but a régime is chosen", () => {
    // § 6 defines the row as « `FS effectif` …, affiché contre le `k` exigé par le régime », and a
    // bare safety factor beside a refusal invites the reader to supply their own `k`. `governing`
    // is `null` here by contract — the banner names the prohibition — but the régime is not.
    const refused = resultsOf({
      usage: "TEMPORAIRE",
      regime: "acct10",
      terminations: {
        A: { id: "serre-cables-etrier", eta: 0.8 },
        B: SHIPPED.terminations.B,
      },
    });
    expect(refused.verdict?.state).toBe("refuse-usage-interdit");
    expect(refused.verdict?.governing).toBeNull();
    const fs = refused.rows.find((row) => row.id === "FS");
    expect(fs?.value).toBe("7,82");
    expect(fs?.qualifier).toBe("exigé 10,0");
  });

  test("the aggregates name the rider position that produced them", () => {
    // The cheap addition that carries the scope discipline. Since ticket 37 put §11's scan on the
    // rider's own node the two *round* to the same 2,42 m on the opening screen — the qualifier is
    // what still says which question each answered, and away from `x_D` 75 the gap is metres.
    expect(results.rows.find((row) => row.id === "clearance")?.qualifier).toBe(
      "passager à x 74,4 m",
    );
    expect(results.rows.find((row) => row.id === "Tmax")?.qualifier).toBe(
      "ancrage A, passager à x 74,4 m",
    );
  });

  test("both traverse-scope labels carry their parenthesis", () => {
    const labels = results.rows.map((row) => row.label);
    expect(labels).toContain("T max (traversée)");
    expect(labels).toContain("Garde min (traversée)");
    expect(results.scope).toBe(TRAVERSE_SCOPE);
    expect(results.aside).toBeNull();
  });

  test("`T adm` names its decomposition, because MBF and a tension differ by two orders", () => {
    expect(results.rows.find((row) => row.id === "TadmA")?.qualifier).toBe("(η 0,90 · MBF / k)");
  });

  test("the force selector moves every force row and touches no other", () => {
    const kN = resultsOf({ regime: "en15567", unit: "kN" });
    expect(valueOf(kN, "Tmax")).toBe("9,280 kN");
    expect(valueOf(kN, "TadmA")).toBe("27,22 kN");
    // Lengths, percentages and the dimensionless `FS` are not forces.
    expect(valueOf(kN, "clearance")).toBe("2,42 m");
    expect(valueOf(kN, "FS")).toBe("8,80");
  });
});

describe("the app's envelope against the engine's", () => {
  test("`amplifiedTension` and `evaluateVerdict` agree, to the printed digit", () => {
    // The reduced row set prints `T max` with **no régime chosen**, where `evaluateVerdict` is by
    // contract not called — which is why the app owns a second caller of §8.2's formula. Since
    // ticket 38 the **scan** behind both is one function (`scanTensionEnvelope`), so what is left
    // to watch here is the formula's second caller and the arguments it feeds: the envelope the
    // app prints and the one the verdict scores are the same envelope, to the printed digit.
    const results = resultsOf({ regime: "en15567" });
    const verdict = results.verdict;
    if (verdict === null) throw new Error("expected a verdict");
    expect(valueOf(results, "TmaxA")).toBe(formatQuantity("Tdaf", verdict.ends.A.Tdaf));
    expect(valueOf(results, "TmaxB")).toBe(formatQuantity("Tdaf", verdict.ends.B.Tdaf));
    expect(valueOf(results, "Tstatic")).toBe(formatQuantity("Tstatic", verdict.ends.A.Tstatic));
    expect(verdict.headline.end).toBe("A");
  });

  test("the amplified rows go with the banner when the DAF itself is refused", () => {
    // `daf=-1` is a value a link can carry. Multiplying it into a printed envelope reads *below*
    // the standing tension — optimistic in the one direction that kills — so the amplified rows
    // are absent while « T max statique » and the garde, which need no DAF, stay.
    const results = resultsOf({ rider: { ...SHIPPED.rider, DAF: -1 } });
    expect(rowIds(results)).toEqual([
      "clearance",
      "clearanceWhole",
      "Tstatic",
      "loadedSag",
      "coverage",
    ]);
  });

  test("the surviving static row is picked by the static ordering, not by a DAF-derived one", () => {
    // At `DAF ≤ 0` the amplified ordering inverts — `T_DAF,A` −290,3 against `T_DAF,B` −286,1 — so
    // an envelope headline chosen on `Tdaf` would make the **one tension number left on screen**
    // report the lesser anchor under the other one's name: 793,5 daN « ancrage B » where the true
    // static envelope is 817,2 at A, as every other state prints it.
    const results = resultsOf({ rider: { ...SHIPPED.rider, DAF: -1 } });
    const Tstatic = results.rows.find((row) => row.id === "Tstatic");
    expect(Tstatic?.value).toBe("817,2 daN");
    expect(Tstatic?.qualifier).toBe("ancrage A");
  });
});

describe("the criteria × ends grid", () => {
  test("one row per criterion, two cells where η_t is per end", () => {
    const { grid } = resultsOf({ regime: "en15567" });
    expect(grid).toHaveLength(1);
    expect(grid[0].id).toBe("tension-totale");
    expect(grid[0].label).toBe("Tension totale — k = 3,0");
    expect(grid[0].cells.map((cell) => cell.end)).toEqual(["A", "B"]);
    expect(grid[0].cells.map((cell) => cell.Tadm)).toEqual(["2722 daN", "2722 daN"]);
    expect(grid[0].cells.map((cell) => cell.FS)).toEqual(["8,80", "9,06"]);
  });

  test("WorkSafe QLD's suspended-load criterion is one cell, with its numerator written out", () => {
    const { grid } = resultsOf({ regime: "wsqld" });
    expect(grid.map((row) => row.id)).toEqual([
      "tension-totale",
      "charge-suspendue",
      "essai-de-charge-2x",
    ]);

    const suspended = grid[1];
    expect(suspended.label).toBe("Charge suspendue — FS ≥ 5,0");
    // Stated, because « FS ≥ 5 sur charge suspendue » alone yields `MBF/P` — 77 on this line, a
    // criterion that can never bind, which silently deletes the two-criterion régime.
    expect(suspended.formula).toBe("min(η_A, η_B) · MBF / max[ DAF · (T chargé − T à vide) ]");
    expect(suspended.detail).toBe("8166 daN / 665 daN — une seule cellule, pas par extrémité");
    expect(suspended.cells).toHaveLength(1);
    // `end: null` **is** the not-per-end cell, and it has no per-end allowable at all.
    expect(suspended.cells[0].end).toBeNull();
    expect(suspended.cells[0].Tadm).toBeNull();
    expect(suspended.cells[0].FS).toBe("12,29");
  });

  test("total tension governs on the shipped line, although its k is the smaller", () => {
    // 8,80 against the suspended load's 12,29 — a taut line is governed by total tension, a slack
    // one by the suspended load, and *which* binds is information the user wants.
    const { grid, banner } = resultsOf({ regime: "wsqld" });
    const governing = grid.flatMap((row) => row.cells).filter((cell) => cell.governing);
    expect(governing).toHaveLength(1);
    expect(governing[0].end).toBe("A");
    expect(governing[0].FS).toBe("8,80");
    expect(banner?.text).toBe("Dans les limites — WorkSafe QLD 2019 (k = 3,0)");
  });

  test("the 2× proof test is a row with no cells — and it is why nothing can claim conformity", () => {
    const { grid } = resultsOf({ regime: "wsqld" });
    expect(grid[2]).toMatchObject({ label: "Essai de charge 2×", cells: [], note: "non évalué" });
  });
});

/**
 * The five states, driven through `evaluateVerdict` on synthetic traverses rather than through the
 * scene: `Indéterminé` needs a sweep that lost steps, and § 11's own rule is that those states are
 * **injected, never hunted**.
 */
describe("the five verdict states and their grammar", () => {
  const step = (TA: number, TB: number): SweepStep => ({
    sD: 0,
    xD: 75,
    zD: -6,
    H: 2500,
    V0: 0,
    TA,
    TB,
    theta: 0,
  });

  function verdictOf(patch: Partial<VerdictInput>) {
    return evaluateVerdict({
      steps: [step(8171, 8000)],
      coverage: 1,
      Tvide: { TA: 2534, TB: 2534 },
      DAF: 1.2,
      regime: "en15567",
      eta: { A: 0.9, B: 0.9 },
      strength: 90740,
      usage: "TEMPORAIRE",
      terminations: { A: "cosse-oeil-flamand", B: "cosse-oeil-flamand" },
      family: "steel",
      ...patch,
    });
  }

  test("Dans les limites — the régime is named inside the sentence", () => {
    const verdict = verdictOf({ steps: [step(3000, 2900)] });
    expect(verdict.state).toBe("dans-les-limites");
    expect(verdictSentence(verdict)).toBe("Dans les limites — EN 15567-1 (k = 3,0)");
  });

  test("Marge faible — FS effectif against k, and the régime still named", () => {
    // `FS_eff < 1,1·k`: not green with a note. A line at 3,05 against 3,0 has no margin left for
    // the coefficients this tool admits it does not know.
    const verdict = verdictOf({ steps: [step(22735, 22000)] });
    expect(verdict.state).toBe("marge-faible");
    expect(verdictSentence(verdict)).toMatch(
      /^Marge faible — EN 15567-1 : FS effectif \d,\d\d pour k = 3,0$/,
    );
  });

  test("Hors limites — the banner names the governing cell", () => {
    const verdict = verdictOf({ steps: [step(40000, 39000)] });
    expect(verdict.state).toBe("hors-limites");
    expect(verdictSentence(verdict)).toBe(
      "Hors limites — EN 15567-1, critère tension totale (ancrage A)",
    );
  });

  test("Hors limites names the suspended-load criterion when that is what binds", () => {
    // WorkSafe's two criteria bite on different quantities: on a slack line the suspended load
    // governs. Here `T_vide` is low, so the suspended term is the whole tension.
    const verdict = verdictOf({
      regime: "wsqld",
      Tvide: { TA: 100, TB: 100 },
      steps: [step(20000, 19000)],
    });
    expect(verdictSentence(verdict)).toBe(
      "Hors limites — WorkSafe QLD 2019, critère charge suspendue",
    );
  });

  test("Interdit — a prohibition survives an ample margin, and names no régime", () => {
    const verdict = verdictOf({
      steps: [step(3000, 2900)],
      terminations: { A: "serre-cables-etrier", B: "cosse-oeil-flamand" },
    });
    expect(verdict.state).toBe("refuse-usage-interdit");
    // The margin is comfortable and the line is still refused: this is §10.2's `[REGULATOR]`
    // prohibition, not advice, and folding it into « Hors limites » would claim the limits are
    // what is wrong.
    expect(verdict.ends.A.FS).toBeGreaterThan(3);
    expect(verdictSentence(verdict)).toBe(
      "Interdit — serre-câbles sur une ligne portant des passagers",
    );
  });

  test("no printed row, qualifier or banner says a word the interface never says", () => {
    const results = resultsOf({ regime: "en15567" });
    const printed = [
      ...results.rows.flatMap((row) => [row.label, row.value, row.qualifier ?? ""]),
      results.banner?.text ?? "",
    ];
    expect(printed.flatMap((text) => proscribedIn(text))).toEqual([]);
  });

  test("Indéterminé — the verdict is suppressed, and the count is against 260", () => {
    const verdict = verdictOf({ steps: [step(3000, 2900)], coverage: 209 / 260 });
    expect(verdict.state).toBe("indetermine");
    expect(verdict.governing).toBeNull();
    expect(verdictSentence(evaluateVerdict({ ...synthetic(209, 260) }))).toBe(
      "Indéterminé — 209 des 260 pas résolus",
    );
  });

  test("on a terrain Page, « Marge faible » spells out the facteur de sécurité (#91)", () => {
    const verdict = verdictOf({ steps: [step(22735, 22000)] });
    expect(verdictSentence(verdict, "terrain")).toMatch(
      /^Marge faible — EN 15567-1 : facteur de sécurité \d,\d\d pour k = 3,0$/,
    );
  });

  test("refusalReason gives « Interdit »'s prohibition, and nothing for any other state", () => {
    const refused = verdictOf({
      steps: [step(3000, 2900)],
      terminations: { A: "serre-cables-etrier", B: "cosse-oeil-flamand" },
    });
    expect(refusalReason(refused, "terrain")).toBe(
      "serre-câbles sur une ligne portant des passagers",
    );
    expect(refusalReason(verdictOf({ steps: [step(3000, 2900)] }), "terrain")).toBeNull();
  });

  test("a terrain Page words the banner in its register; the state and the rows are Avancé's", () => {
    const results = resultsOf({ regime: "en15567" });
    const terrain = deriveResults({
      scenario: { ...SHIPPED, regime: "en15567" },
      base: solvedTraverseOf({ ...SHIPPED, regime: "en15567" }),
      register: "terrain",
    });
    const state = results.banner?.state ?? "indetermine";
    const text = terrain?.banner?.text ?? "";
    expect(text.startsWith(`${label(state, "terrain")} — `)).toBe(true);
    expect(exactTermsIn(text)).toEqual([]);
    expect(proscribedIn(text)).toEqual([]);
    // The `Résultats` verdict row is Avancé's own, so it stays in the exact register.
    expect(terrain?.banner?.state).toBe(state);
    expect(terrain?.rows).toEqual(results.rows);
  });

  test("the grammar never says « conforme » nor « non conforme »", () => {
    const regimes: RegimeId[] = ["en15567", "wsqld", "acct10", "ansi5"];
    for (const regime of regimes) {
      for (const steps of [[step(3000, 2900)], [step(40000, 39000)]]) {
        const sentence = verdictSentence(verdictOf({ regime, steps }));
        expect(sentence.toLowerCase()).not.toContain("conforme");
      }
    }
  });

  /** A traverse that lost steps, for the one state a healthy line cannot reach. */
  function synthetic(solved: number, total: number): VerdictInput {
    const steps: SweepStep[] = [];
    for (let i = 0; i < solved; i++) steps.push(step(3000 + i, 2900 + i));
    return {
      steps,
      coverage: solved / total,
      Tvide: { TA: 2534, TB: 2534 },
      DAF: 1.2,
      regime: "en15567",
      eta: { A: 0.9, B: 0.9 },
      strength: 90740,
      usage: "TEMPORAIRE",
      terminations: { A: "cosse-oeil-flamand", B: "cosse-oeil-flamand" },
      family: "steel",
    };
  }
});

describe("what suppresses what — Solve, Clearance, Verdict: three consequences", () => {
  test("a Solve Gate breach is « Aucun résultat »: no rows at all, and no dashes", () => {
    // A textile draft with § 9's two blanks. The cause line that replaces the block is A11's, and
    // it is a sentence — never a set of dashed rows.
    const results = deriveResults({
      scenario: {
        ...SHIPPED,
        usage: "TEMPORAIRE",
        material: { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 },
      },
      base: null,
    });
    expect(results).toBeNull();
  });

  test("a Clearance Gate breach removes the garde alone — every tension row stands", () => {
    const results = resultsOf({ regime: "en15567", anchors: { zA: -1, zB: 12 } });
    expect(rowIds(results)).not.toContain("clearance");
    expect(rowIds(results)).toContain("Tmax");
    expect(rowIds(results)).toContain("verdict");
  });

  test("a Verdict Gate breach removes the banner and the grid together", () => {
    // « Secours sur corde — 10:1 » presupposes family B: unavailable on steel, and the régime row
    // breaches the Verdict Gate rather than the solve.
    const results = resultsOf({ regime: "secours10" });
    expect(results.banner).toBeNull();
    expect(results.grid).toEqual([]);
    expect(rowIds(results)).toContain("Tmax");
    expect(rowIds(results)).toContain("clearance");
  });

  test("a Verdict Gate breach is not « Résultats sans régime » — a régime *was* chosen", () => {
    // § 6: « Une sixième situation n'est pas un état : avec aucun régime choisi … rien n'a été
    // tenté. » A breach is not that situation, and printing « aucun régime choisi » above an
    // invitation to choose one contradicts the picker beside it and the régime the aggregate has
    // pinned first 100 px below.
    for (const patch of [
      { regime: "secours10" } as const,
      { regime: "en15567", rider: { ...SHIPPED.rider, DAF: -1 } } as const,
    ]) {
      const results = resultsOf(patch);
      expect(results.verdict).toBeNull();
      expect(results.aside).toBeNull();
      expect(results.prompt).toBeNull();
    }
  });
});

describe("two Brins porteurs — values per line, the pair, and the « cas défavorable » (#84)", () => {
  const PAIR: Partial<ScenarioDraft> = { regime: "en15567", carryingLines: 2 };
  const single = resultsOf({ regime: "en15567" });
  const pair = resultsOf(PAIR);

  test("the header says once that every row is one line's", () => {
    expect(pair.scope).toBe(PER_LINE_SCOPE);
    expect(pair.scope).toBe("sur toute la traversée, par ligne");
    // One line is the shipped screen, and it does not move.
    expect(single.scope).toBe(TRAVERSE_SCOPE);
  });

  test("three detail rows join the thirteen, and only with two lines", () => {
    expect(rowIds(pair)).toEqual([
      "verdict",
      "FS",
      "Tmax",
      "clearance",
      "clearanceWhole",
      "reserve",
      "TadmA",
      "TadmB",
      "TmaxA",
      "TmaxB",
      "memberLoad",
      "pairTotal",
      "soleCarrier",
      "Tstatic",
      "amplification",
      "loadedSag",
      "coverage",
    ]);
    for (const id of ["memberLoad", "pairTotal", "soleCarrier"] as const) {
      expect(rowIds(single)).not.toContain(id);
    }
  });

  test("each line carries half the passager: 120 kg · 9,81 / 2 = 588,6 N", () => {
    expect(valueOf(pair, "memberLoad")).toBe("58,9 daN");
  });

  test("the tensions printed are one line's under P/2, below the single line's", () => {
    const perLine = pair.verdict?.headline.Tdaf ?? Number.NaN;
    const whole = single.verdict?.headline.Tdaf ?? Number.NaN;
    expect(perLine).toBeLessThan(whole);
    expect(valueOf(pair, "Tmax")).toBe(formatQuantity("Tdaf", perLine));
  });

  test("the pair total is both lines at the anchor: twice the envelope the verdict judges", () => {
    const headline = pair.verdict?.headline;
    if (headline === undefined) throw new Error("a régime is chosen");
    expect(valueOf(pair, "pairTotal")).toBe(formatQuantity("Tdaf", 2 * headline.Tdaf));
  });

  test("the « cas défavorable » is one line carrying P whole — the single line's own T max", () => {
    const row = pair.rows.find((candidate) => candidate.id === "soleCarrier");
    expect(row?.label).toBe("Cas défavorable : une seule ligne porte tout");
    expect(row?.qualifier).toBe("ancrage A, hors verdict");
    // Same pose, the whole passager on one member: exactly the line a single member is.
    expect(row?.value).toBe(valueOf(single, "Tmax"));
    expect(row?.value).toBe("928,0 daN");
  });

  test("the « cas défavorable » changes neither the Verdict's state nor its cells", () => {
    const base = solvedTraverseOf({ ...SHIPPED, ...PAIR });
    const scenario: ScenarioDraft = { ...SHIPPED, ...PAIR };
    const without = deriveResults({ scenario, base: { ...base, soleCarrier: null } });
    expect(pair.verdict).toEqual(without?.verdict);
    expect(pair.grid).toEqual(without?.grid);
    expect(pair.banner).toEqual(without?.banner);
    // And the verdict is the per-line one: a line under P/2 has more margin than one under P.
    const FS = (results: Results) => results.verdict?.ends.A.FS ?? Number.NaN;
    expect(FS(pair)).toBeGreaterThan(FS(single));
  });

  test("a refused DAF takes the pair total and the « cas défavorable » with T max", () => {
    const refused = resultsOf({ ...PAIR, rider: { ...SHIPPED.rider, DAF: -1 } });
    expect(rowIds(refused)).toContain("memberLoad");
    for (const id of ["Tmax", "pairTotal", "soleCarrier"] as const) {
      expect(rowIds(refused)).not.toContain(id);
    }
  });

  test("no new row says a word the interface never says", () => {
    const printed = pair.rows.flatMap((row) => [row.label, row.value, row.qualifier ?? ""]);
    expect(printed.flatMap((text) => proscribedIn(text))).toEqual([]);
  });
});

describe("« Garde exigée » — the clearance row judges itself (2026-09-23)", () => {
  test("clearanceBreached: under the threshold only, and a threshold of 0 disables the check", () => {
    expect(clearanceBreached(2.42, 1)).toBe(false);
    expect(clearanceBreached(0.8, 1)).toBe(true);
    expect(clearanceBreached(-0.5, 1)).toBe(true);
    expect(clearanceBreached(0.8, 0)).toBe(false);
    expect(clearanceBreached(0.8, -1)).toBe(false);
    expect(clearanceBreached(Number.POSITIVE_INFINITY, 1)).toBe(false);
  });
});

describe("a scrub re-derives nothing — `vi.mock` on the engine barrel", () => {
  /**
   * React's `useMemo`, as far as the app root goes: recompute when any key moved under
   * `Object.is`. Vitest renders no hook, so the chain `useTraverse` → `useRailForm`'s report →
   * the results `useErrorSurfaces` memoises is rebuilt here from the same calls. That memo's other
   * keys — the failure, the caret, the frame, the register — stand still through a scrub.
   */
  function memo<T>(): (compute: () => T, keys: readonly unknown[]) => T {
    let held: { keys: readonly unknown[]; value: T } | null = null;
    return (compute, keys) => {
      if (held === null || keys.some((key, i) => !Object.is(key, held?.keys[i]))) {
        held = { keys, value: compute() };
      }
      return held.value;
    };
  }

  test("ten `x_D` patches run `evaluateVerdict` once; a garde edit runs it again", async () => {
    vi.resetModules();
    const spies: { evaluateVerdict?: ReturnType<typeof vi.fn> } = {};
    vi.doMock("@/lib/sim", async () => {
      const sim = await vi.importActual<typeof import("@/lib/sim")>("@/lib/sim");
      spies.evaluateVerdict = vi.fn<typeof sim.evaluateVerdict>(sim.evaluateVerdict);
      return { ...sim, evaluateVerdict: spies.evaluateVerdict };
    });
    const { deriveResults: derive } = await import("./results.ts");
    const { evaluateGates } = await import("./gates.ts");
    const { traverseInputs, traverseScenario } = await import("@/lib/scenario/traverse.ts");

    let scenario: ScenarioDraft = { ...SHIPPED, regime: "en15567" };
    // The scene's memo keys on `mp` and `hRider` alone, so neither patch below moves it.
    const base = solvedTraverseOf(scenario);
    const traverseMemo = memo<ReturnType<typeof traverseScenario>>();
    const reportMemo = memo<ReturnType<typeof evaluateGates>>();
    const resultsMemo = memo<Results | null>();
    const render = () => {
      const inputs = traverseInputs(scenario);
      const traverse = traverseMemo(() => traverseScenario(inputs), Object.values(inputs));
      const report = reportMemo(() => evaluateGates({ scenario: traverse }), [traverse, null]);
      return resultsMemo(
        () => derive({ scenario: traverse, base, report }),
        [traverse, null, base, report],
      );
    };

    const first = render();
    expect(first?.verdict).not.toBeNull();
    for (let step = 1; step <= 10; step++) {
      scenario = { ...scenario, rider: { ...scenario.rider, xD: step * 13.5 } };
      expect(render()).toBe(first);
    }
    expect(spies.evaluateVerdict).toHaveBeenCalledTimes(1);

    scenario = { ...scenario, rider: { ...scenario.rider, hClearMin: 3 } };
    expect(render()).not.toBe(first);
    expect(spies.evaluateVerdict).toHaveBeenCalledTimes(2);

    vi.doUnmock("@/lib/sim");
    vi.resetModules();
  });
});

describe("the Zones d'ancrage on Avancé's `Résultats` (#106)", () => {
  /**
   * A low anchor A, its top 2,5 m over its foot, and a high B: the passager touches the ground a
   * few metres from A only — on the platform — and clears it everywhere else.
   */
  const lowAtA = (anchorZone: number, hClearMin: number) =>
    resultsOf({
      anchors: { zA: 2.5, zB: 50 },
      rider: { ...SHIPPED.rider, anchorZone, hClearMin },
    });
  const clearanceRow = (results: Results) => results.rows.find((row) => row.id === "clearance");

  test("without zones there is one garde row, over the whole traverse", () => {
    const results = resultsOf({ rider: { ...SHIPPED.rider, anchorZone: 0 } });
    expect(rowIds(results)).toContain("clearance");
    expect(rowIds(results)).not.toContain("clearanceWhole");
    expect(results.clearanceScope).toBe(TRAVERSE_SCOPE);
  });

  test("zones that leave no swept passager between them remove both garde rows, as a breach", () => {
    // 2z = 149,9 m < L, but no sweep step falls in ]74,95 ; 75,05[: the judged minimum is empty.
    // The gates read the solved garde, so the Clearance Gate fails and takes both rows with it —
    // the unjudged one does not stay behind to stand in for a garde nobody may read (#106).
    const results = resultsOf({ rider: { ...SHIPPED.rider, anchorZone: 74.95 } });
    expect(rowIds(results)).not.toContain("clearance");
    expect(rowIds(results)).not.toContain("clearanceWhole");
    expect(rowIds(results)).toContain("Tmax");
  });

  test("on the shipped line the zones change nothing: both rows read the 2,42 m at x 74,4", () => {
    // § 9's minimum is at mid-span, sixty metres from either zone.
    const results = resultsOf();
    expect(valueOf(results, "clearance")).toBe("2,42 m");
    expect(valueOf(results, "clearanceWhole")).toBe("2,42 m");
    expect(results.rows.find((row) => row.id === "clearanceWhole")).toMatchObject({
      label: "Garde min (traversée), zones d'ancrage comprises",
      qualifier: "non jugée, passager à x 74,4 m",
      state: null,
      rank: "detail",
    });
    expect(results.clearanceScope).toBe("sur la traversée, hors zones d'ancrage");
  });

  test("a contact on the platform alone is no « Hors limites », and the unjudged row shows it", () => {
    // 0,30 m exigés, under the garde the line keeps outside its zones.
    expect(clearanceRow(lowAtA(0, 0.3))?.state).toBe("hors-limites");
    const zoned = lowAtA(10, 0.3);
    expect(clearanceRow(zoned)?.state).toBeNull();
    // The contact is still printed — negative, the bare line's own garde, on the row judged by
    // nothing.
    expect(valueOf(zoned, "clearanceWhole")).toMatch(/^-/);
    expect(valueOf(zoned, "clearanceWhole")).toBe(valueOf(lowAtA(0, 0.3), "clearance"));
    expect(zoned.rows.find((row) => row.id === "clearanceWhole")?.state).toBeNull();
  });

  test("the same line, with too little garde just past A's zone, stays « Hors limites »", () => {
    const zoned = lowAtA(10, 1);
    expect(clearanceRow(zoned)?.state).toBe("hors-limites");
    // The first sweep step past x = 10 m: the minimum sits right at the zone's edge.
    expect(clearanceRow(zoned)?.qualifier).toBe("sous la garde exigée 1,0 m, passager à x 10,4 m");
  });
});
