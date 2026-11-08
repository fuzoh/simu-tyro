/**
 * The seam between **what the form holds** (text) and **what the Scenario holds** (canonical
 * numbers) — « v1 build spec » § 3 (*Tightness Spec — a segmented control with exactly one editable
 * field*, *Units, the force selector, and the two constants*, *Display precision per quantity*).
 *
 * Rules this module exists to keep:
 *
 * - **A unit switch never writes state.** « Le changement d'unité n'écrit jamais dans l'état ;
 *   daN→X→daN est l'identité. » State stays canonical newtons, each unit carries its own display
 *   precision, and only {@link railValues} — the *read* direction — knows the selector exists.
 *   Without the invariant, MBF 9074 daN → 90,7 kN → 9070 daN moves the quantity the Verdict divides
 *   by, by 4 daN per toggle, and the claim that a display control is provably physics-neutral
 *   quietly stops holding.
 * - **A prefill writes the displayed value into state, never the underlying float.** That governs
 *   prefills **from computed read-outs only** — {@link switchTightness} and « Recalculer » — and
 *   201,84 enters state where 201,8412773 never does.
 * - **Exactly one tightness quantity is state.** {@link switchTightness} pre-fills the new field
 *   from its read-out, which is why « cible 250 daN » → « longueur directe » lands on the length
 *   just achieved. Three always-editable fields with a driver radio was rejected: every keystroke
 *   could flip which quantity is the model's meaning.
 * - **Both Material Specs are retained across a family flip**, which is why textile→steel can raise
 *   a sub-floor `L₀` (`T_break/EA` ≈ 0,013 for 12 mm steel against ≈ 0,67 for the PA rope) — and
 *   that is correct, not a bug to smooth over.
 * - **`x_D` clamps on every path**, and in **both** terrain modes. It selects a view, not a design
 *   input, and refusing to draw a valid span because the viewpoint is stale is worse than moving
 *   the viewpoint. The clamp runs against {@link spanLength} — typed `L` in manual mode, `s_B − s_A`
 *   in imported mode — so state never holds an out-of-span `x_D` for one mode and not the other,
 *   and the transient note has a single event to fire on: the value that *entered* state differing
 *   from the one that was asked for.
 * - **One lens per numeric field.** {@link FIELD_ACCESS} is the only place a field is read out of
 *   or written into the Scenario, so the Rail, the gates and « Saisie en cours » cannot disagree on
 *   what a field holds — the drift that left « Rapport V cible » without a committed value.
 */

import type { TraverseScenario } from "@/lib/scenario/traverse.ts";
import type { Geometry, ScenarioDraft, TightnessDraft } from "@/lib/scenario/types.ts";
import type { TextileSpec } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { G, roundToDisplay } from "@/lib/format/quantity.ts";
import {
  FIRST_RUN_RETAINED_TEXTILE,
  FIRST_RUN_SCENARIO,
  firstRunDefaults,
} from "@/lib/scenario/first-run.ts";
import { clampX, spanOfGeometry } from "@/lib/scenario/geometry.ts";
import { TEXTILE } from "@/lib/sim";

import type { Deduced, DeducedMaterial, DeducedSolve } from "./deduced.ts";
import type { FieldContext, FieldId, TightnessFieldId } from "./fields.ts";

import { deduceValues } from "./deduced.ts";
import { displayField, FIELD_ORDER, FIELDS, TIGHTNESS_FIELD } from "./fields.ts";

/**
 * The fields the form holds as **text**: the rows of `FIELDS` with a display-precision row. Every
 * one of them is § 3's elected widget — `<input type="text" inputMode="decimal">` — and every other
 * control is a picker that cannot be emptied and therefore has no text state to validate.
 */
export type NumericFieldId = {
  [K in FieldId]: (typeof FIELDS)[K]["quantity"] extends null ? never : K;
}[FieldId];

/** The numeric fields a gate reads: all but `x_D`, which sits in no gate. */
export type GatedFieldId = {
  [K in NumericFieldId]: (typeof FIELDS)[K]["gate"] extends null ? never : K;
}[NumericFieldId];

export function isNumericField(id: FieldId): id is NumericFieldId {
  return FIELDS[id].quantity !== null;
}

export function isGatedField(id: FieldId): id is GatedFieldId {
  return isNumericField(id) && FIELDS[id].gate !== null;
}

/** Every {@link NumericFieldId}, in rail order. */
export const NUMERIC_FIELDS: readonly NumericFieldId[] = FIELD_ORDER.filter(isNumericField);

/** Every {@link GatedFieldId}, in rail order. */
export const GATED_FIELDS: readonly GatedFieldId[] = FIELD_ORDER.filter(isGatedField);

/** The form's value bag: one string per numeric field, `""` where the state holds no value. */
export type RailValues = Record<NumericFieldId, string>;

/**
 * Do two value bags hold the same text in every gated field? A scrub writes `x_D`'s text on every
 * frame, and tier one read off a bag compared this way keeps its identity through it.
 */
export function sameGatedText(a: RailValues, b: RailValues): boolean {
  return GATED_FIELDS.every((id) => a[id] === b[id]);
}

/**
 * One numeric field's way into and out of the Scenario.
 *
 * `read` is `undefined` where the mode, family or Tightness Driver does not render the field, and
 * `null` where the field is on screen and blank. `V` is what `write` takes: a required field
 * refuses `null`, and a nullable one — a textile blank, an Override — is cleared by it.
 */
export type FieldLens<S, V extends number | null = number> = {
  readonly read: (scenario: S) => V | undefined;
  readonly write: (scenario: ScenarioDraft, value: V) => ScenarioDraft;
};

/**
 * A steel Override's lens, which alone knows what its row shows — override or formula, off the
 * deduced material.
 */
type OverrideLens<S> = FieldLens<S, number | null> & {
  readonly effective: (material: DeducedMaterial) => number | null;
};

const OVERRIDE_FIELDS = ["mbfOverride", "eaOverride", "muOverride"] as const;

/** The three steel Overrides, whose blank is « non surchargée », never « vide et requis ». */
export type OverrideFieldId = (typeof OVERRIDE_FIELDS)[number];

export function isOverrideField(id: FieldId): id is OverrideFieldId {
  return (OVERRIDE_FIELDS as readonly FieldId[]).includes(id);
}

/** The fields whose blank is state: § 9's textile blanks and the three Overrides. */
type NullableFieldId = OverrideFieldId | "MBL" | "muTextile" | "k";

/**
 * What each lens reads. A Tightness Driver's reads the driver alone, so a refusal holding only the
 * `tightness` can name its target; `x_D`'s reads the whole draft; every other lens reads the
 * Traverse-scope Scenario, so no lens the gates call can reach `x_D`.
 */
type LensScope<K extends NumericFieldId> = K extends TightnessFieldId
  ? Pick<TraverseScenario, "tightness">
  : K extends GatedFieldId
    ? TraverseScenario
    : ScenarioDraft;

type FieldAccess = {
  readonly [K in NumericFieldId]: K extends OverrideFieldId
    ? OverrideLens<LensScope<K>>
    : FieldLens<LensScope<K>, K extends NullableFieldId ? number | null : number>;
};

/**
 * Every numeric field's lens, **total**: a row added to `FIELDS` with a precision row does not
 * compile until it can be read and written.
 *
 * A write to a field the Scenario does not render is the mode's own rule: a Tightness Driver field
 * becomes the driver, and `Portée` and `Dénivelé` in imported mode, the steel fields on a rope and
 * the rope fields on steel leave the Scenario as it was.
 */
export const FIELD_ACCESS: FieldAccess = {
  L: {
    read: ({ geometry }) => (geometry.source === "manual" ? geometry.L : undefined),
    // `x_D` selects a view, so a shorter span moves the viewpoint rather than refusing the span.
    write: (s, L) => (s.geometry.source === "manual" ? applyGeometry(s, { ...s.geometry, L }) : s),
  },
  h: {
    read: ({ geometry }) => (geometry.source === "manual" ? geometry.h : undefined),
    write: (s, h) =>
      s.geometry.source === "manual" ? { ...s, geometry: { ...s.geometry, h } } : s,
  },
  zA: {
    read: ({ anchors }) => anchors.zA,
    write: (s, zA) => ({ ...s, anchors: { ...s.anchors, zA } }),
  },
  zB: {
    read: ({ anchors }) => anchors.zB,
    write: (s, zB) => ({ ...s, anchors: { ...s.anchors, zB } }),
  },
  // The stations *are* the span in imported mode (`L = s_B − s_A`), so moving one moves the
  // viewpoint exactly as `Portée` does in the other mode.
  sa: {
    read: ({ geometry }) => (geometry.source === "trace" ? geometry.sa : undefined),
    write: (s, sa) => (s.geometry.source === "trace" ? applyGeometry(s, { ...s.geometry, sa }) : s),
  },
  sb: {
    read: ({ geometry }) => (geometry.source === "trace" ? geometry.sb : undefined),
    write: (s, sb) => (s.geometry.source === "trace" ? applyGeometry(s, { ...s.geometry, sb }) : s),
  },
  d: {
    read: ({ material }) => (material.family === "steel" ? material.d : undefined),
    write: (s, d) => (s.material.family === "steel" ? { ...s, material: { ...s.material, d } } : s),
  },
  mbfOverride: overrideLens("MBF", "strength"),
  eaOverride: overrideLens("EA", "EA"),
  muOverride: overrideLens("mu", "mu"),
  MBL: {
    read: ({ material }) => (material.family === "textile" ? material.MBL : undefined),
    write: (s, MBL) =>
      s.material.family === "textile" ? { ...s, material: { ...s.material, MBL } } : s,
  },
  muTextile: {
    read: ({ material }) => (material.family === "textile" ? material.mu : undefined),
    write: (s, mu) =>
      s.material.family === "textile" ? { ...s, material: { ...s.material, mu } } : s,
  },
  k: {
    read: ({ material }) => (material.family === "textile" ? material.k : undefined),
    write: (s, k) =>
      s.material.family === "textile" ? { ...s, material: { ...s.material, k } } : s,
  },
  etaA: {
    read: ({ terminations }) => terminations.A.eta,
    write: (s, eta) => ({
      ...s,
      terminations: { ...s.terminations, A: { ...s.terminations.A, eta } },
    }),
  },
  etaB: {
    read: ({ terminations }) => terminations.B.eta,
    write: (s, eta) => ({
      ...s,
      terminations: { ...s.terminations, B: { ...s.terminations.B, eta } },
    }),
  },
  D_target: {
    read: ({ tightness }) => (tightness.mode === "sag" ? tightness.D_target : undefined),
    write: (s, D_target) => ({ ...s, tightness: { mode: "sag", D_target } }),
  },
  H_target: {
    read: ({ tightness }) => (tightness.mode === "tension" ? tightness.H_target : undefined),
    write: (s, H_target) => ({ ...s, tightness: { mode: "tension", H_target } }),
  },
  L0: {
    read: ({ tightness }) => (tightness.mode === "length" ? tightness.L0 : undefined),
    write: (s, L0) => ({ ...s, tightness: { mode: "length", L0 } }),
  },
  vRatio: {
    read: ({ tightness }) => (tightness.mode === "ratio" ? tightness.ratio : undefined),
    write: (s, ratio) => ({ ...s, tightness: { mode: "ratio", ratio } }),
  },
  mp: {
    read: ({ rider }) => rider.mp,
    write: (s, mp) => ({ ...s, rider: { ...s.rider, mp } }),
  },
  hRider: {
    read: ({ rider }) => rider.hRider,
    write: (s, hRider) => ({ ...s, rider: { ...s.rider, hRider } }),
  },
  hClearMin: {
    read: ({ rider }) => rider.hClearMin,
    write: (s, hClearMin) => ({ ...s, rider: { ...s.rider, hClearMin } }),
  },
  DAF: {
    read: ({ rider }) => rider.DAF,
    write: (s, DAF) => ({ ...s, rider: { ...s.rider, DAF } }),
  },
  xD: {
    read: ({ rider }) => rider.xD,
    // **Both modes**: an imported span is a span, and a viewpoint past station B is as stale there
    // as one past `Portée` is here.
    write: (s, xD) => ({ ...s, rider: { ...s.rider, xD: clampRider(xD, s.geometry) } }),
  },
};

/**
 * A steel Override. The three derived rows are editable at all times on a steel line — typing
 * into one is what creates the override — and they show the **effective** value, because § 3
 * draws them as editable fields with a reset control, not as read-outs that sprout an input.
 */
function overrideLens(
  key: "MBF" | "EA" | "mu",
  readOut: "strength" | "EA" | "mu",
): OverrideLens<TraverseScenario> {
  return {
    read: ({ material }) =>
      material.family === "steel" ? (material.overrides?.[key] ?? null) : undefined,
    write: (s, value) => (value === null ? clearOverride(s, key) : withOverride(s, key, value)),
    effective: (material) => material[readOut],
  };
}

/** Everything tier one needs beside a field's own text, gathered once from the Scenario. */
export function fieldContext(scenario: TraverseScenario, trace: Trace | null): FieldContext {
  return {
    unit: scenario.unit,
    ropeClass: scenario.material.family === "textile" ? scenario.material.ropeClass : undefined,
    extent: trace === null ? undefined : { min: trace.d[0], max: trace.d[trace.d.length - 1] },
    L: scenario.geometry.source === "manual" ? scenario.geometry.L : undefined,
  };
}

/**
 * Canonical state → the text every field shows. **The read direction of the unit selector**, and
 * the only place in the app that direction is taken for an input.
 */
export function railValues(scenario: ScenarioDraft, deduced?: Deduced): RailValues {
  const out = {} as RailValues;
  for (const id of NUMERIC_FIELDS) {
    const held = heldValue(scenario, id, deduced);
    out[id] = held === null || held === undefined ? "" : displayField(id, held, scenario.unit);
  }
  return out;
}

/**
 * What one numeric field shows: its lens's read, except an Override, which shows its effective
 * value off `deduced`. `undefined` where the field is not on screen, `null` where it is blank.
 */
export function heldValue(
  scenario: ScenarioDraft,
  id: NumericFieldId,
  deduced: Deduced | undefined,
): number | null | undefined {
  const held = FIELD_ACCESS[id].read(scenario);
  if (held === undefined || !isOverrideField(id)) return held;
  return deduced === undefined ? null : FIELD_ACCESS[id].effective(deduced.material);
}

/**
 * One committed field, written back into the Scenario. **Canonical in, canonical out**: the caller
 * has already run `commitField`, so the number here is newtons, metres, millimetres or kilograms
 * and already sits on the field's display grid.
 *
 * @returns a new draft; the argument is never mutated, because the store's shallow patch merge is
 *   what keeps `unloadedInputs` stable across a scrub.
 */
export function applyField(
  scenario: ScenarioDraft,
  id: NumericFieldId,
  value: number,
): ScenarioDraft {
  return FIELD_ACCESS[id].write(scenario, value);
}

/**
 * The span `x_D` is clamped against: `Portée` in manual mode, `s_B − s_A` in imported mode — the
 * same arithmetic `deriveSpan` uses, and the only part of it the clamp needs, which is why it does
 * not wait for the Trace to be decoded.
 *
 * @returns `null` when the placement describes no span at all — `station B ≤ station A`, or an `L`
 *   the hard range has yet to refuse. Nothing is clamped against a non-span.
 */
export function spanLength(scenario: ScenarioDraft): number | null {
  return spanOf(scenario.geometry);
}

function spanOf(geometry: Geometry): number | null {
  const L = spanOfGeometry(geometry);
  return Number.isFinite(L) && L > 0 ? L : null;
}

/**
 * One geometry change, **with the viewpoint brought along** — the shared path for `Portée`, the two
 * stations and « Inverser A et B », so no route into a new span can forget the clamp.
 */
export function applyGeometry(scenario: ScenarioDraft, geometry: Geometry): ScenarioDraft {
  return {
    ...scenario,
    geometry,
    rider: { ...scenario.rider, xD: clampRider(scenario.rider.xD, geometry) },
  };
}

/**
 * `x_D` clamps on every path, and it is the one field that does — through `clampX`'s one rule, so
 * a placement that is no span leaves `x_D` exactly as the reducer's terrain path does.
 */
function clampRider(x: number, geometry: Geometry): number {
  return clampX(x, spanOfGeometry(geometry));
}

/** Typing into a derived field flips it to « valeur saisie ». Steel only, and per value. */
export function withOverride(
  scenario: ScenarioDraft,
  key: "MBF" | "EA" | "mu",
  value: number,
): ScenarioDraft {
  const { material } = scenario;
  if (material.family !== "steel") return scenario;
  return {
    ...scenario,
    material: { ...material, overrides: { ...material.overrides, [key]: value } },
  };
}

/**
 * « Recalculer » — the reset control that restores the formula. A **button**, not a clause in the
 * badge's sentence: messages state, buttons act.
 *
 * Dropping the key rather than writing the formula value in is what makes « non surchargée » a
 * *distinct* state from « equal to the formula value »: the first tracks `d` from here on, and the
 * second is an override that happens to agree today.
 */
export function clearOverride(scenario: ScenarioDraft, key: "MBF" | "EA" | "mu"): ScenarioDraft {
  const { material } = scenario;
  if (material.family !== "steel" || material.overrides === undefined) return scenario;
  const { [key]: _dropped, ...rest } = material.overrides;
  const overrides = Object.keys(rest).length === 0 ? undefined : rest;
  return { ...scenario, material: { ...material, d: material.d, overrides } };
}

/**
 * `Classe de corde`'s change, with the `k` it ships — polyester's `null` included, since nobody
 * published one. **The terminations are kept**: ADR-0001 forbids re-selecting an end silently, so
 * a knot that HMPE now disables stays as given and the Verdict Gate raises it.
 */
export function applyRopeClass(
  scenario: ScenarioDraft,
  ropeClass: TextileSpec["ropeClass"],
): ScenarioDraft {
  const { material } = scenario;
  if (material.family !== "textile") return scenario;
  return { ...scenario, material: { ...material, ropeClass, k: TEXTILE.kDefault[ropeClass] } };
}

/** Each family's ends as § 9 ships them: what the termination Fix Action puts back. */
export const SHIPPED_TERMINATIONS = {
  steel: FIRST_RUN_SCENARIO.terminations,
  textile: FIRST_RUN_RETAINED_TEXTILE.terminations,
} as const satisfies Record<ScenarioDraft["material"]["family"], ScenarioDraft["terminations"]>;

/** The termination field of each end. */
export const TERMINATION_FIELD = { A: "ta", B: "tb" } as const satisfies Record<"A" | "B", FieldId>;

/**
 * The termination Fix Action's effect, given the Blocking Error whose button was pressed: every end
 * the error names takes the active family's shipped end, `η` included. An end it does not name is
 * left alone, so another breach stands.
 */
export function applyShippedTerminations(
  scenario: ScenarioDraft,
  { field, alsoOutlined }: { readonly field: FieldId; readonly alsoOutlined: readonly FieldId[] },
): ScenarioDraft {
  const shipped = SHIPPED_TERMINATIONS[scenario.material.family];
  const named = (key: "A" | "B") =>
    field === TERMINATION_FIELD[key] || alsoOutlined.includes(TERMINATION_FIELD[key]);
  const end = (key: "A" | "B") => (named(key) ? { ...shipped[key] } : scenario.terminations[key]);
  return { ...scenario, terminations: { A: end("A"), B: end("B") } };
}

/**
 * The Tightness Spec's segmented control: switching mode **pre-fills the new field from its
 * read-out**, at the read-out's own display precision.
 *
 * **Under « Aucun résultat » the switch still switches.** That is the state a user most needs
 * another driver in — « Tension impossible » on a flèche is fixed by typing a tension — so with no
 * read-out the prefill falls back to `lastGood`, the last read-out the Rail saw solve, and failing
 * that to the first-run line's. A dead control there reads as a broken app.
 *
 * @returns the Scenario on the new driver, or unchanged when it is already on it.
 */
export function switchTightness(
  scenario: ScenarioDraft,
  mode: TightnessDraft["mode"],
  deduced: Deduced,
  lastGood: DeducedSolve | null = null,
): ScenarioDraft {
  if (scenario.tightness.mode === mode) return scenario;
  const solve = deduced.solve ?? lastGood ?? firstRunSolve();
  if (solve === null) return scenario;
  const field = TIGHTNESS_FIELD[mode];
  // The prefill is at the **field's** grain in the **displayed** unit, which is what makes a
  // daN → kN → daN round trip through the selector leave the number alone.
  const value = roundToDisplay(
    FIELDS[field].quantity,
    PREFILL[field](solve, scenario),
    scenario.unit,
  );
  return FIELD_ACCESS[field].write(scenario, value);
}

/** The read-out each driver is prefilled from when the segmented control switches to it. */
const PREFILL: Record<TightnessFieldId, (solve: DeducedSolve, scenario: ScenarioDraft) => number> =
  {
    D_target: (solve) => solve.sag,
    H_target: (solve) => solve.H,
    L0: (solve) => solve.L0,
    // `P / H` from the read-out `H` — voir `scenario/tightness.ts`.
    vRatio: (solve, { rider }) => (rider.mp * G) / solve.H,
  };

let firstRun: DeducedSolve | null | undefined;

/** The first-run line's read-out — computed, never stored, and only once. */
function firstRunSolve(): DeducedSolve | null {
  firstRun ??= deduceValues(firstRunDefaults() as ScenarioDraft, null).solve;
  return firstRun;
}

/** Which field the segmented control is currently pointing at. */
export function drivingField(scenario: Pick<TraverseScenario, "tightness">): TightnessFieldId {
  return TIGHTNESS_FIELD[scenario.tightness.mode];
}

/** The Tightness Driver: the field the segmented control points at, and the number it holds. */
export function tightnessDriver(scenario: Pick<TraverseScenario, "tightness">): {
  readonly field: TightnessFieldId;
  readonly value: number;
} {
  const field = drivingField(scenario);
  const value = FIELD_ACCESS[field].read(scenario);
  if (value === undefined) throw new Error(`tightnessDriver: ${field} does not read its own mode`);
  return { field, value };
}
