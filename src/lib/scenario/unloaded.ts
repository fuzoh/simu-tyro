/**
 * **The unloaded line, derived once** — scenario → material → the Vent on the line → `L₀` →
 * unloaded state, the rider-free chain both the `Valeurs déduites` and the chart scene stand on.
 *
 * It is a **composition above the engine**, not a second solver: `sim/types.ts` rejects an
 * unloaded/loaded split of the engine, and nothing here re-derives physics. What it owns is the
 * order the chain runs in and one failure taxonomy for it, so its two readers cannot disagree about
 * why a line has no picture.
 *
 * **One installation, one wind** (`docs/simulation-theory.md` §19.7). Under an applied Vent — a
 * speed and a bearing — the line is posed under it: `L₀` is resolved by `resolveSpatialL0` on the
 * spatial line, and every loaded equilibrium keeps it. Without, the chain is §4–§7's closed form,
 * bit for bit (§19.16), and `state` is that plane state. A textile line with no diameter under an
 * applied Vent has nothing to solve (#127 Q37): the gates name the field.
 *
 * `unit` is deliberately not an input: it only drives the Stale Badge's display precision, and a
 * unit switch must not re-run the `L₀` bisection.
 */

import type {
  DerivedMaterial,
  LineAero,
  MaterialSpec,
  SolveError,
  SolveNote,
  SpanInput,
  SpanState,
  SpatialReadings,
  SpatialState,
} from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import {
  deriveSteel,
  deriveTextile,
  lineAeroOf,
  resolveL0,
  resolveSpatialL0,
  solveSpan,
  solveSpatial,
  unloadedReadings,
  unloadedSag,
} from "@/lib/sim";

import type { PlacedSpan } from "./geometry.ts";
import type { ScenarioDraft } from "./types.ts";

import { lineBearing, placeSpan } from "./geometry.ts";
import { engineTightness } from "./tightness.ts";
import { airDensityOf, isWindApplied, isWindReadable, windFieldOf } from "./wind.ts";

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
  /** The Vent the line is posed under (§19.7) — read only when applied. */
  readonly wind: ScenarioDraft["wind"];
  /** Their bearing A → B is what the Vent is projected on; without both it is not applied. */
  readonly positions: ScenarioDraft["positions"];
  /** The typed `ρ`, or `null` for §12.2's derived one — the statics read it under wind (§19.4). */
  readonly rho: number | null;
};

/**
 * A Scenario's unloaded inputs. Each field is the Scenario's own reference, so a patch that does
 * not touch one — a scrub of `x_D` — leaves it identical and a memo keyed on the fields holds.
 */
export function unloadedInputs(scenario: ScenarioDraft, trace: Trace | null): UnloadedInputs {
  const { geometry, anchors, material, tightness, tensioningSide, wind, positions } = scenario;
  return {
    geometry,
    anchors,
    material,
    tightness,
    tensioningSide,
    mp: scenario.rider.mp,
    trace,
    wind,
    positions,
    rho: scenario.dynamics.rho,
  };
}

/**
 * Where the chain stopped. `geometry`, `material` and `wind` mean **nothing to solve yet** — a gate
 * owns them, never a refusal: `material` also stands for a textile line without a diameter under
 * an applied Vent (#127 Q37), and `wind` for a Vent the physics cannot read (a profile or a speed
 * out of its domain, a negative `ρ`). `L0` and `span` are engine refusals, and the two must stay
 * apart because `resolveL0` and `solveSpan` share one error union: `no-convergence` out of the first
 * is « Cible inatteignable », out of the second « Calcul impossible ». Under wind the pose
 * inversion returns the unloaded state itself, so its failures are all stage `L0`.
 */
export type SolveStage = "geometry" | "material" | "wind" | "L0" | "span";

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
  /** The span posed to the solver, no loads — the plane fields of {@link spatial}'s input. */
  readonly input: SpanInput;
  /** The Vent on the line (§19.4), or `null` when none is applied — the plane case. */
  readonly aero: LineAero | null;
  /** §19.11's unloaded state under the Scenario's wind; `closed-form` without one. */
  readonly spatial: SpatialState;
  /**
   * §4's plane state — **only without wind** (`aero` `null`), where it is the line. Under wind
   * there is no plane state to read: every reader takes {@link spatial}.
   */
  readonly state: SpanState | null;
  /** §19.7's readings of the unloaded line: flèche, rise, écart latéral, écart maximal à A–B. */
  readonly readings: SpatialReadings;
  /** « Flèche à vide », m, and the `x` of its vertex, m — §19.7's `D`; `unloadedSag` without wind. */
  readonly sag: number;
  readonly sagAtX: number;
  /**
   * The installation read back at the tensioning anchor `K` (§19.7), per member: `T` the tension
   * de pose `|F|` and `H` the component along the horizontal A–B axis, N. Without wind `H` is §4's.
   */
  readonly pose: { readonly T: number; readonly H: number };
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
    trace,
    geometry,
    wind,
    positions,
    rho,
  }: Pick<
    UnloadedInputs,
    | "material"
    | "tightness"
    | "tensioningSide"
    | "mp"
    | "trace"
    | "geometry"
    | "wind"
    | "positions"
    | "rho"
  >,
): Unloaded {
  if (span === null) return { ok: false, stage: "geometry", error: null, span };

  const engineSpec = engineMaterial(spec);
  if (engineSpec === null) return { ok: false, stage: "material", error: null, span };
  const material =
    engineSpec.family === "steel" ? deriveSteel(engineSpec) : deriveTextile(engineSpec);

  // §19.4: the Vent on the line, read only when applied — a speed and a bearing to project it on.
  const bearing = lineBearing(positions);
  let aero: LineAero | null = null;
  if (isWindApplied(wind, bearing)) {
    const air = airDensityOf(rho, geometry.source === "trace" ? trace : null).value;
    if (!isWindReadable(wind) || !(air >= 0))
      return { ok: false, stage: "wind", error: null, span };
    const made = lineAeroOf(engineSpec, windFieldOf(wind), bearing, air);
    // A textile line without its diameter: the gates name `dTextile` (#127 Q37).
    if (!made.ok) return { ok: false, stage: "material", error: null, span };
    aero = made.value;
  }

  const { L, h } = span;
  const driver = engineTightness(tightness, mp, tensioningSide);
  const geometryOf = { L, h, ...material };
  const plane = (L0: number): SpanInput => ({
    L,
    h,
    L0,
    w: material.w,
    EA: material.EA,
    loads: [],
    strength: material.strength,
  });

  if (aero !== null) {
    // One installation under the Scenario's wind (§19.7, §19.10).
    const pose = resolveSpatialL0(driver, geometryOf, aero, tensioningSide);
    if (!pose.ok) return { ok: false, stage: "L0", error: pose.error, span };
    const { L0, state: spatial } = pose.value;
    const readings = unloadedReadings(spatial);
    return {
      ok: true,
      span,
      material,
      L0,
      input: plane(L0),
      aero,
      spatial,
      state: null,
      readings,
      sag: readings.sag.value,
      sagAtX: readings.sag.atX,
      pose: poseAt(spatial, tensioningSide),
      notes: [],
    };
  }

  // No wind applied: §4–§7 as before, and the same line as a spatial state (§19.16).
  const L0 = resolveL0(driver, geometryOf);
  if (!L0.ok) return { ok: false, stage: "L0", error: L0.error, span };
  const input = plane(L0.value);
  const solved = solveSpan(input);
  if (!solved.ok) return { ok: false, stage: "span", error: solved.error, span };
  const spatial = solveSpatial({ ...input, aero: null, rider: null });
  if (!spatial.ok) return { ok: false, stage: "span", error: spatial.error, span };

  const sag = unloadedSag(solved.state, { L, h });
  return {
    ok: true,
    span,
    material,
    L0: L0.value,
    input,
    aero: null,
    spatial: spatial.state,
    state: solved.state,
    readings: unloadedReadings(spatial.state),
    sag: sag.D,
    sagAtX: sag.atX,
    pose: poseAt(spatial.state, tensioningSide),
    notes: solved.notes,
  };
}

/** §19.7's tension de pose and `H_K` at the tensioning anchor — per member. */
function poseAt(
  { TA, TB, HA, HB }: Pick<SpatialState, "TA" | "TB" | "HA" | "HB">,
  side: UnloadedInputs["tensioningSide"],
): UnloadedLine["pose"] {
  return side === "A" ? { T: TA, H: HA } : { T: TB, H: HB };
}

/**
 * The engine's material spec, or `null` while a textile draft still has § 9's blanks. The textile
 * diameter rides along when typed: §19.4 reads it under wind, and nothing reads it without.
 */
function engineMaterial(spec: ScenarioDraft["material"]): MaterialSpec | null {
  if (spec.family === "steel") return spec;
  const { MBL, mu, k, d } = spec;
  if (MBL === null || mu === null || k === null) return null;
  return {
    family: "textile",
    ropeClass: spec.ropeClass,
    MBL,
    mu,
    k,
    ...(d === undefined ? {} : { d }),
  };
}
