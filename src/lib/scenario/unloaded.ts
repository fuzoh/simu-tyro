/**
 * **The unloaded line, derived once** — scenario → material → `L₀` → unloaded Span State, the
 * rider-free chain both the `Valeurs déduites` and the chart scene stand on.
 *
 * It is a **composition above `solveSpan`**, not a second solver: `sim/types.ts` rejects an
 * unloaded/loaded split of the engine, and nothing here re-derives physics. What it owns is the
 * order the chain runs in and one failure taxonomy for it, so its two readers cannot disagree about
 * why a line has no picture.
 *
 * `unit` is deliberately not an input: it only drives the Stale Badge's display precision, and a
 * unit switch must not re-run the `L₀` bisection.
 */

import type { DerivedMaterial, SolveError, SolveNote, SpanInput, SpanState } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { deriveSteel, deriveTextile, resolveL0, solveSpan, unloadedSag } from "@/lib/sim";

import type { PlacedSpan } from "./geometry.ts";
import type { ScenarioDraft } from "./types.ts";

import { placeSpan } from "./geometry.ts";
import { engineTightness } from "./tightness.ts";

/** Every Scenario field the unloaded line depends on — and therefore a memo's dependency list. */
export type UnloadedInputs = {
  readonly geometry: ScenarioDraft["geometry"];
  readonly anchors: ScenarioDraft["anchors"];
  readonly material: ScenarioDraft["material"];
  readonly tightness: ScenarioDraft["tightness"];
  /** The anchor a prétension is read at — the prétension driver resolves `L₀` against it. */
  readonly tensioningSide: ScenarioDraft["tensioningSide"];
  /** Passenger mass, kg — « Rapport V » resolves `L₀` against it. */
  readonly mp: number;
  /** The imported profile, or `null` in manual mode. */
  readonly trace: Trace | null;
};

/**
 * A Scenario's unloaded inputs. Each field is the Scenario's own reference, so a patch that does
 * not touch one — a scrub of `x_D` — leaves it identical and a memo keyed on the fields holds.
 */
export function unloadedInputs(scenario: ScenarioDraft, trace: Trace | null): UnloadedInputs {
  const { geometry, anchors, material, tightness, tensioningSide } = scenario;
  return { geometry, anchors, material, tightness, tensioningSide, mp: scenario.rider.mp, trace };
}

/**
 * Where the chain stopped. `geometry` and `material` mean **nothing to solve yet** — a gate owns
 * them, never a refusal. `L0` and `span` are engine refusals, and the two must stay apart because
 * `resolveL0` and `solveSpan` share one error union: `no-convergence` out of the first is « Cible
 * inatteignable », out of the second « Calcul impossible ».
 */
export type SolveStage = "geometry" | "material" | "L0" | "span";

/** One stopped chain: the stage, and the engine's own error verbatim when there is one. */
export type EngineFailure =
  | { readonly stage: Exclude<SolveStage, "L0" | "span">; readonly error: null }
  | { readonly stage: Extract<SolveStage, "L0" | "span">; readonly error: SolveError };

/** The unloaded line, solved. */
export type UnloadedLine = {
  readonly ok: true;
  readonly span: PlacedSpan;
  /** What the solver consumed. */
  readonly material: DerivedMaterial;
  /** The resolved unstretched length, m. */
  readonly L0: number;
  /** The span posed to the solver, no loads. */
  readonly input: SpanInput;
  readonly state: SpanState;
  /** « Flèche à vide », m, and the `x` of its vertex, m — closed-form, voir `unloadedSag`. */
  readonly sag: number;
  readonly sagAtX: number;
  readonly notes: readonly SolveNote[];
};

/**
 * The derivation's result. A failure still carries the span when the chain got past the
 * placement, so a blank rope keeps its `Portée`, `Dénivelé` and `corde`; `span` is `null` exactly
 * at stage `geometry`.
 */
export type Unloaded =
  | UnloadedLine
  | (EngineFailure & { readonly ok: false; readonly span: PlacedSpan | null });

/**
 * Place the span, derive the material, resolve `L₀`, solve the unloaded line — in that order, each
 * stage only once.
 */
export function deriveUnloaded(inputs: UnloadedInputs): Unloaded {
  return unloadedOn(placeSpan(inputs, inputs.trace), inputs);
}

/**
 * {@link deriveUnloaded} over a span already placed, for a caller that memoises the placement on
 * its own: the result carries `span` **by reference**, so a material, tightness or `mp` edit
 * leaves it identical and whatever is keyed on it — the chart frame — holds.
 */
export function unloadedOn(
  span: PlacedSpan | null,
  {
    material: spec,
    tightness,
    tensioningSide,
    mp,
  }: Pick<UnloadedInputs, "material" | "tightness" | "tensioningSide" | "mp">,
): Unloaded {
  if (span === null) return { ok: false, stage: "geometry", error: null, span };

  const material = deriveMaterial(spec);
  if (material === null) return { ok: false, stage: "material", error: null, span };

  const { L, h } = span;
  const L0 = resolveL0(engineTightness(tightness, mp, tensioningSide), { L, h, ...material });
  if (!L0.ok) return { ok: false, stage: "L0", error: L0.error, span };

  const input: SpanInput = {
    L,
    h,
    L0: L0.value,
    w: material.w,
    EA: material.EA,
    loads: [],
    strength: material.strength,
  };
  const solved = solveSpan(input);
  if (!solved.ok) return { ok: false, stage: "span", error: solved.error, span };

  const sag = unloadedSag(solved.state, { L, h });
  return {
    ok: true,
    span,
    material,
    L0: L0.value,
    input,
    state: solved.state,
    sag: sag.D,
    sagAtX: sag.atX,
    notes: solved.notes,
  };
}

/** What the solver consumes, or `null` while a textile draft still has § 9's blanks. */
function deriveMaterial(spec: ScenarioDraft["material"]): DerivedMaterial | null {
  if (spec.family === "steel") return deriveSteel(spec);
  const { MBL, mu, k } = spec;
  if (MBL === null || mu === null || k === null) return null;
  return deriveTextile({ family: "textile", ropeClass: spec.ropeClass, MBL, mu, k });
}
