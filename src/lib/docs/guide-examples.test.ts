/**
 * The guide's worked example (`docs/guide/`, #125) against the engine. The guide follows the
 * First-Run Scenario — « la ligne d'ouverture » — from chapter 1 to chapter 4 and quotes its
 * figures; this file recomputes each one through the same chain the app runs and checks that the
 * guide prints it, so a solver or default change that moves the opening screen cannot leave the
 * guide teaching yesterday's numbers.
 *
 * Not a physics fixture: `src/lib/scenario/first-run.test.ts` locks the opening screen, and
 * `src/lib/sim/__fixtures__` the §15 cases the guide also quotes.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { SpanInput, Terrain } from "@/lib/sim";

import { FIRST_RUN_SCENARIO } from "@/lib/scenario/first-run.ts";
import { engineTightness } from "@/lib/scenario/tightness.ts";
import {
  deriveSteel,
  DYNAMICS,
  evaluateClearance,
  evaluateVerdict,
  quasiStaticRatio,
  resolveL0,
  ride,
  ridePath,
  solveSpan,
  STEEL,
  sweep,
  unloadedSag,
} from "@/lib/sim";

/**
 * A guide chapter with its typography folded away, so a figure can be looked up whether the prose
 * or a formula prints it: the `$` math delimiters, KaTeX's `{,}` decimal comma and `\,` thin
 * space, and the space between groups of thousands.
 */
function chapter(file: string): string {
  return readFileSync(new URL(`../../../docs/guide/${file}`, import.meta.url), "utf8")
    .replaceAll("{,}", ",")
    .replaceAll("\\,", "")
    .replaceAll("$", "")
    .replace(/(\d) (?=\d{3}(?!\d))/g, "$1");
}

/** A figure as the guide writes it: French decimal comma, no grouping. */
function fr(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

const s = FIRST_RUN_SCENARIO;
if (s.geometry.source !== "manual") throw new Error("the first-run scenario is manual geometry");
const { L, h } = s.geometry;
const derived = deriveSteel(s.material);
const P = s.rider.mp * STEEL.g;
const L0 = resolveL0(engineTightness(s.tightness, s.rider.mp, s.tensioningSide), {
  L,
  h,
  ...derived,
});
if (!L0.ok) throw new Error("the opening line resolves");
const span: SpanInput = {
  L,
  h,
  L0: L0.value,
  w: derived.w,
  EA: derived.EA,
  loads: [],
  strength: derived.strength,
};
const unloaded = solveSpan(span);
if (!unloaded.ok) throw new Error("the opening line solves");
const vide = unloaded.state;
const traverse = sweep(span, P, 240);
const terrain: Terrain = {
  kind: "profile",
  xs: Float64Array.from([0, L]),
  zs: Float64Array.from([-s.anchors.zA, h - s.anchors.zB]),
};
const clearance = evaluateClearance(span, P, traverse.steps, terrain, s.rider.hRider, 60);
const verdict = evaluateVerdict({
  steps: traverse.steps,
  coverage: traverse.coverage,
  Tvide: { TA: vide.TA, TB: vide.TB },
  DAF: s.rider.DAF,
  regime: "en15567",
  eta: { A: s.terminations.A.eta, B: s.terminations.B.eta },
  strength: derived.strength,
  usage: s.usage,
  terminations: { A: s.terminations.A.id, B: s.terminations.B.id },
  family: "steel",
});
const path = ridePath(traverse.steps, { L, h });
const descent = ride({
  path,
  m: s.rider.mp,
  CdA: DYNAMICS.CdA,
  rho: DYNAMICS.rhoSeaLevel,
  trolley: DYNAMICS.steel,
  windAlong: 0,
});

describe("chapter 1 — the opening line's unloaded statics", () => {
  const text = chapter("1-ligne.md");

  test("weights: the passager's P and the cable's w and μ", () => {
    expect(text).toContain(`${fr(P, 1)} N`);
    expect(text).toContain(`${fr(derived.w, 3)} N/m`);
    expect(text).toContain(`${fr(derived.w / STEEL.g, 4)} kg/m`);
  });

  test("H, V₀, V_B, T_A, T_B and the vertical balance", () => {
    expect(text).toContain(`H = ${fr(vide.H, 1)} N`);
    expect(text).toContain(`V_0 = ${fr(vide.V0, 1)} N`);
    expect(text).toContain(`V_B = +${fr(vide.VB, 1)} N`);
    expect(text).toContain(`${fr(vide.TA, 1)} \\text{ N}`);
    expect(text).toContain(`T_B \\approx ${fr(vide.TB, 1)} N`);
    expect(text).toContain(`= ${fr(vide.VB - vide.V0, 1)} N`);
  });

  test("L₀, the flèche and flèche / portée", () => {
    expect(text).toContain(`L_0 = ${fr(L0.value, 2)}`);
    const sag = unloadedSag(vide, { L, h }).D;
    expect(text).toContain(`flèche à vide de ${fr(sag, 2)} m`);
    expect(text).toContain(`${fr((sag / L) * 100, 2)} %`);
  });
});

describe("chapter 2 — the traverse", () => {
  const text = chapter("2-statique.md");

  test("the unloaded solve's iteration count", () => {
    expect(text).toContain(`converge en ${vide.iterations} itérations`);
  });

  test("the worst static tension at A over the traverse", () => {
    expect(text).toContain(`${fr(verdict.ends.A.Tstatic, 1)} N`);
  });

  test("the garde min (traversée), redone by hand", () => {
    expect(text).toContain(`\\approx ${fr(clearance.hMin, 2)} m`);
    expect(text).toContain(`x = ${fr(clearance.atX, 1)} m`);
  });
});

describe("chapter 3 — the judgement", () => {
  const text = chapter("3-securite.md");

  test("MBF, the majoration au départ and the two FS", () => {
    expect(text).toContain(`\\approx ${fr(derived.strength / 1000, 2)} kN`);
    expect(text).toContain(`\\approx ${fr(verdict.ends.A.Tdaf, 1)} N`);
    expect(text).toContain(`\\approx ${fr(verdict.ends.A.FS, 2)}`);
    expect(text).toContain(`en B, ${fr(verdict.ends.B.FS, 2)}`);
  });

  test("EN 15567-1's allowable and the réserve de tension", () => {
    const allowable = verdict.cells[0]?.Tadm ?? Number.NaN;
    expect(text).toContain(`\\approx ${fr(allowable, 0)} N`);
    expect(text).toContain(`\\approx ${fr(verdict.reserve?.value ?? Number.NaN, 0)} N`);
    expect(verdict.state).toBe("dans-les-limites");
  });

  test("ACCT 10:1's allowable", () => {
    expect(text).toContain(`T_{\\text{adm}} \\approx ${fr((0.9 * derived.strength) / 10, 0)} N`);
  });

  test("the tension à vide as a share of MBF", () => {
    const share = (Math.max(vide.TA, vide.TB) / derived.strength) * 100;
    expect(text).toContain(`\\approx ${fr(share, 2)} %`);
  });
});

describe("chapter 4 — the ride, an estimation", () => {
  const text = chapter("4-dynamique.md");

  test("the vitesse d'arrivée, its duration and the top speed", () => {
    if (descent.end.kind !== "arrival") throw new Error("the opening line's ride reaches B");
    expect(text).toContain(`**${fr(descent.end.v, 1)} m/s**`);
    expect(text).toContain(`(${fr(descent.end.v * 3.6, 1)} km/h)`);
    expect(text).toContain(`après ${fr(descent.end.t, 1)} s`);
    const top = Math.max(...descent.samples.map((sample) => Math.abs(sample.v)));
    expect(text).toContain(`environ ${fr(top, 1)} m/s`);
  });

  test("the largest v/c of the ride, under the 0,2 threshold", () => {
    const { ratio } = quasiStaticRatio(descent.samples, path, derived.w / STEEL.g);
    expect(ratio).toBeLessThan(DYNAMICS.quasiStaticLimit);
    expect(text).toContain(`descente vaut ${fr(ratio, 2)}`);
  });
});
