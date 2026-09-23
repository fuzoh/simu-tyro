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
 */

import type { Geometry, ScenarioDraft, TightnessDraft } from "@/lib/scenario/types.ts";
import type { Trace } from "@/lib/terrain/trace.ts";

import { G, roundToDisplay } from "@/lib/format/quantity.ts";
import { firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { clampX } from "@/lib/scenario/from-search.ts";
import { spanOfGeometry } from "@/lib/scenario/geometry.ts";

import type { Deduced, DeducedSolve } from "./deduced.ts";
import type { FieldContext, FieldId } from "./fields.ts";

import { deduceValues } from "./deduced.ts";
import { displayField } from "./fields.ts";
import { isFieldActive } from "./gates.ts";

/**
 * The fields the form holds as **text**. Every one of them is § 3's elected widget — `<input
 * type="text" inputMode="decimal">` — and every other control is a picker that cannot be emptied
 * and therefore has no text state to validate.
 */
export const NUMERIC_FIELDS = [
  "L",
  "h",
  "zA",
  "zB",
  "sa",
  "sb",
  "d",
  "mbfOverride",
  "eaOverride",
  "muOverride",
  "MBL",
  "muTextile",
  "k",
  "etaA",
  "etaB",
  "D_target",
  "H_target",
  "L0",
  "vRatio",
  "mp",
  "hRider",
  "DAF",
  "xD",
] as const;

export type NumericFieldId = (typeof NUMERIC_FIELDS)[number];

/** The form's value bag: one string per numeric field, `""` where the state holds no value. */
export type RailValues = Record<NumericFieldId, string>;

/** Everything tier one needs beside a field's own text, gathered once from the Scenario. */
export function fieldContext(scenario: ScenarioDraft, trace: Trace | null): FieldContext {
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
  const value = (id: NumericFieldId): string => {
    if (!isFieldActive(id, scenario)) return "";
    const held = heldValue(scenario, id, deduced);
    return held === null ? "" : displayField(id, held, scenario.unit);
  };
  const out = {} as RailValues;
  for (const id of NUMERIC_FIELDS) out[id] = value(id);
  return out;
}

/** What the Scenario holds for one numeric field. `null` **is** « blank and required ». */
function heldValue(
  scenario: ScenarioDraft,
  id: NumericFieldId,
  deduced: Deduced | undefined,
): number | null {
  const { geometry, anchors, rider, tightness, terminations, material } = scenario;
  switch (id) {
    case "L":
      return geometry.source === "manual" ? geometry.L : (deduced?.span?.L ?? null);
    case "h":
      return geometry.source === "manual" ? geometry.h : (deduced?.span?.h ?? null);
    case "sa":
      return geometry.source === "trace" ? geometry.sa : null;
    case "sb":
      return geometry.source === "trace" ? geometry.sb : null;
    case "zA":
      return anchors.zA;
    case "zB":
      return anchors.zB;
    case "mp":
      return rider.mp;
    case "hRider":
      return rider.hRider;
    case "DAF":
      return rider.DAF;
    case "xD":
      return rider.xD;
    case "etaA":
      return terminations.A.eta;
    case "etaB":
      return terminations.B.eta;
    case "D_target":
      return tightness.mode === "sag" ? tightness.D_target : null;
    case "H_target":
      return tightness.mode === "tension" ? tightness.H_target : null;
    case "L0":
      return tightness.mode === "length" ? tightness.L0 : null;
    case "vRatio":
      return tightness.mode === "ratio" ? tightness.ratio : null;
    case "d":
      return material.family === "steel" ? material.d : null;
    case "MBL":
      return material.family === "textile" ? material.MBL : null;
    case "muTextile":
      return material.family === "textile" ? material.mu : null;
    case "k":
      return material.family === "textile" ? material.k : null;
    // The three derived rows show the **effective** value — override or formula — because § 3
    // draws them as editable fields with a reset control, not as read-outs that sprout an input.
    // Typing into one is what creates the override; « Recalculer » is what drops it again.
    case "mbfOverride":
      return material.family === "steel" ? (deduced?.material.strength ?? null) : null;
    case "eaOverride":
      return material.family === "steel" ? (deduced?.material.EA ?? null) : null;
    case "muOverride":
      return material.family === "steel" ? (deduced?.material.mu ?? null) : null;
  }
}

/**
 * One committed field, written back into the Scenario. **Canonical in, canonical out**: the caller
 * has already run `commitField`, so the number here is newtons, metres, millimetres or kilograms
 * and already sits on the field's display grid.
 *
 * @returns a new draft; the argument is never mutated, because the store's shallow patch merge is
 *   what keeps `sceneInputs` stable across a scrub.
 */
export function applyField(
  scenario: ScenarioDraft,
  id: NumericFieldId,
  value: number,
): ScenarioDraft {
  const { geometry, material } = scenario;
  switch (id) {
    case "L":
      // `x_D` selects a view, so a shorter span moves the viewpoint rather than refusing the span.
      return geometry.source === "manual"
        ? applyGeometry(scenario, { ...geometry, L: value })
        : scenario;
    case "h":
      return geometry.source === "manual"
        ? { ...scenario, geometry: { ...geometry, h: value } }
        : scenario;
    // The stations *are* the span in imported mode (`L = s_B − s_A`), so moving one moves the
    // viewpoint exactly as `Portée` does in the other mode.
    case "sa":
      return geometry.source === "trace"
        ? applyGeometry(scenario, { ...geometry, sa: value })
        : scenario;
    case "sb":
      return geometry.source === "trace"
        ? applyGeometry(scenario, { ...geometry, sb: value })
        : scenario;
    case "zA":
      return { ...scenario, anchors: { ...scenario.anchors, zA: value } };
    case "zB":
      return { ...scenario, anchors: { ...scenario.anchors, zB: value } };
    case "mp":
      return { ...scenario, rider: { ...scenario.rider, mp: value } };
    case "hRider":
      return { ...scenario, rider: { ...scenario.rider, hRider: value } };
    case "DAF":
      return { ...scenario, rider: { ...scenario.rider, DAF: value } };
    case "xD":
      return {
        ...scenario,
        // **Both modes**: an imported span is a span, and a viewpoint past station B is as stale
        // there as one past `Portée` is here.
        rider: { ...scenario.rider, xD: clampRider(value, geometry) },
      };
    case "etaA":
      return {
        ...scenario,
        terminations: { ...scenario.terminations, A: { ...scenario.terminations.A, eta: value } },
      };
    case "etaB":
      return {
        ...scenario,
        terminations: { ...scenario.terminations, B: { ...scenario.terminations.B, eta: value } },
      };
    case "D_target":
      return { ...scenario, tightness: { mode: "sag", D_target: value } };
    case "H_target":
      return { ...scenario, tightness: { mode: "tension", H_target: value } };
    case "L0":
      return { ...scenario, tightness: { mode: "length", L0: value } };
    case "vRatio":
      return { ...scenario, tightness: { mode: "ratio", ratio: value } };
    case "d":
      return material.family === "steel"
        ? { ...scenario, material: { ...material, d: value } }
        : scenario;
    case "MBL":
      return material.family === "textile"
        ? { ...scenario, material: { ...material, MBL: value } }
        : scenario;
    case "muTextile":
      return material.family === "textile"
        ? { ...scenario, material: { ...material, mu: value } }
        : scenario;
    case "k":
      return material.family === "textile"
        ? { ...scenario, material: { ...material, k: value } }
        : scenario;
    case "mbfOverride":
      return withOverride(scenario, "MBF", value);
    case "eaOverride":
      return withOverride(scenario, "EA", value);
    case "muOverride":
      return withOverride(scenario, "mu", value);
  }
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

/** `x_D` clamps on every path, and it is the one field that does. */
function clampRider(x: number, geometry: Geometry): number {
  if (!Number.isFinite(x)) return 0;
  const L = spanOf(geometry);
  return L === null ? Math.max(x, 0) : clampX(x, L);
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
  switch (mode) {
    case "sag":
      return { ...scenario, tightness: { mode, D_target: roundToDisplay("D_target", solve.sag) } };
    case "tension":
      return {
        ...scenario,
        tightness: {
          mode,
          // The prefill is at the **field's** grain in the **displayed** unit, which is what makes
          // a daN → kN → daN round trip through the selector leave the number alone.
          H_target: roundToDisplay("H_target", solve.H, scenario.unit),
        },
      };
    case "length":
      return { ...scenario, tightness: { mode, L0: roundToDisplay("L0", solve.L0) } };
    case "ratio":
      // `P / H` from the read-out `H`, at the field's grain — voir `scenario/tightness.ts`.
      return {
        ...scenario,
        tightness: { mode, ratio: roundToDisplay("vRatio", (scenario.rider.mp * G) / solve.H) },
      };
  }
}

let firstRun: DeducedSolve | null | undefined;

/** The first-run line's read-out — computed, never stored, and only once. */
function firstRunSolve(): DeducedSolve | null {
  firstRun ??= deduceValues(firstRunDefaults() as ScenarioDraft, null).solve;
  return firstRun;
}

/** Which field the segmented control is currently pointing at. */
export function drivingField(scenario: ScenarioDraft): FieldId {
  switch (scenario.tightness.mode) {
    case "sag":
      return "D_target";
    case "tension":
      return "H_target";
    case "length":
      return "L0";
    case "ratio":
      return "vRatio";
  }
}
