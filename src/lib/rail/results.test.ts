import { describe, expect, test } from "vitest";

import type { SceneBase } from "@/lib/chart/scene.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { RegimeId, SweepStep, VerdictInput } from "@/lib/sim";

import { buildSceneBase, sceneInputs } from "@/lib/chart/scene.ts";
import { formatQuantity } from "@/lib/format/quantity.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { evaluateVerdict } from "@/lib/sim";

import type { ResultRowId, Results } from "./results.ts";

import {
  clearanceBreached,
  deriveResults,
  NO_REGIME_ASIDE,
  REGIME_PROMPT,
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
 * - **The headline `T max` is the amplified envelope**, 927,9 daN and not 817,1 — the quantity
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

function sceneOf(scenario: ScenarioDraft): SceneBase {
  const base = buildSceneBase(sceneInputs(scenario, null));
  if (base === null) throw new Error("the shipped scenario builds a scene");
  return base;
}

function resultsOf(patch: Partial<ScenarioDraft> = {}): Results {
  const scenario: ScenarioDraft = { ...SHIPPED, ...patch };
  const results = deriveResults({ scenario, trace: null, base: sceneOf(scenario) });
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
    expect(valueOf(results, "Tmax")).toBe("927,9 daN");
  });
});

describe("the thirteen reported values, on the shipped line under EN 15567-1", () => {
  const results = resultsOf({ regime: "en15567" });

  test("four headline rows, nine detail rows, no accordion", () => {
    expect(rowIds(results)).toEqual([
      "verdict",
      "FS",
      "Tmax",
      "clearance",
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
    expect(results.rows.filter((row) => row.rank === "detail")).toHaveLength(9);
  });

  test("§ 9's canonical sketch, row by row", () => {
    expect(valueOf(results, "verdict")).toBe("Dans les limites — EN 15567-1 (k = 3,0)");
    expect(valueOf(results, "FS")).toBe("8,80");
    expect(valueOf(results, "Tmax")).toBe("927,9 daN");
    expect(valueOf(results, "clearance")).toBe("2,42 m");
    expect(valueOf(results, "reserve")).toBe("+1794 daN");
    expect(valueOf(results, "TadmA")).toBe("2722 daN");
    expect(valueOf(results, "TadmB")).toBe("2722 daN");
    expect(valueOf(results, "TmaxA")).toBe("927,9 daN");
    expect(valueOf(results, "TmaxB")).toBe("901,5 daN");
    expect(valueOf(results, "Tstatic")).toBe("817,1 daN");
    expect(valueOf(results, "amplification")).toBe("+110,8 daN");
    expect(valueOf(results, "loadedSag")).toBe("7,48 m");
    // `résolus / grid.length`, and the denominator is **260**: 240 uniform steps plus 10
    // geometric tail steps per end. Against 240 a fully solved traverse would read 260/240.
    expect(valueOf(results, "coverage")).toBe("260 / 260 pas");
  });

  test("the headline is the amplified envelope, and the static one is a detail row", () => {
    // A headline of 817,1 lets a reader compute 0,9·9074/817 = 10,00 against a printed 8,80 — a
    // reconciliation failure invisible in exactly the state that ships.
    expect(valueOf(results, "Tmax")).not.toBe(valueOf(results, "Tstatic"));
    const headline = results.rows.find((row) => row.id === "Tmax");
    expect(headline?.rank).toBe("headline");
    expect(results.rows.find((row) => row.id === "Tstatic")?.rank).toBe("detail");
    expect(results.rows.find((row) => row.id === "amplification")?.indent).toBe(true);
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
    expect(valueOf(kN, "Tmax")).toBe("9,279 kN");
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
    expect(rowIds(results)).toEqual(["clearance", "Tstatic", "loadedSag", "coverage"]);
  });

  test("the surviving static row is picked by the static ordering, not by a DAF-derived one", () => {
    // At `DAF ≤ 0` the amplified ordering inverts — `T_DAF,A` −290,3 against `T_DAF,B` −286,1 — so
    // an envelope headline chosen on `Tdaf` would make the **one tension number left on screen**
    // report the lesser anchor under the other one's name: 793,5 daN « ancrage B » where the true
    // static envelope is 817,1 at A, as every other state prints it.
    const results = resultsOf({ rider: { ...SHIPPED.rider, DAF: -1 } });
    const Tstatic = results.rows.find((row) => row.id === "Tstatic");
    expect(Tstatic?.value).toBe("817,1 daN");
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

  test("Refusé — a prohibition survives an ample margin, and names no régime", () => {
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
      "Refusé — serre-câbles sur une ligne portant des personnes",
    );
  });

  test("Indéterminé — the verdict is suppressed, and the count is against 260", () => {
    const verdict = verdictOf({ steps: [step(3000, 2900)], coverage: 209 / 260 });
    expect(verdict.state).toBe("indetermine");
    expect(verdict.governing).toBeNull();
    expect(verdictSentence(evaluateVerdict({ ...synthetic(209, 260) }))).toBe(
      "Indéterminé — 209 des 260 pas résolus",
    );
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

describe("what suppresses what — three gates, three different consequences", () => {
  test("a Solve Gate breach is « Aucun résultat »: no rows at all, and no dashes", () => {
    // A textile draft with § 9's two blanks. The cause line that replaces the block is A11's, and
    // it is a sentence — never a set of dashed rows.
    const results = deriveResults({
      scenario: {
        ...SHIPPED,
        usage: "TEMPORAIRE",
        material: { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 },
      },
      trace: null,
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
    // « Secours textile — 10:1 » presupposes family B: unavailable on steel, and the régime row
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

describe("« Garde min. admise » — the clearance row judges itself (2026-09-23)", () => {
  test("clearanceBreached: under the threshold only, and a threshold of 0 disables the check", () => {
    expect(clearanceBreached(2.42, 1)).toBe(false);
    expect(clearanceBreached(0.8, 1)).toBe(true);
    expect(clearanceBreached(-0.5, 1)).toBe(true);
    expect(clearanceBreached(0.8, 0)).toBe(false);
    expect(clearanceBreached(0.8, -1)).toBe(false);
    expect(clearanceBreached(Number.POSITIVE_INFINITY, 1)).toBe(false);
  });
});
