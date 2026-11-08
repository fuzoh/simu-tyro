/**
 * The Chart Block's **drawable scene** — « v1 build spec » § 5 (*The spine*, *Layers*, *The rider
 * moves three ways*, *Clearance failure — four coordinated signals*, *Vertical exaggeration*) and
 * § 4 (*Domaine x partagé*, *La Trace est immuable ; le `Terrain` est dérivé à un seul joint*).
 *
 * **One pure function from the Scenario to everything the two SVGs draw.** It exists as a module
 * rather than as a hook body for the reason amendment A gives: a `node` unit test can reach it, and
 * every question the charts ask — is the rider in a violating band? where does the dimension line
 * go? what z extent does the auto-fit see? — is arithmetic over one input.
 *
 * Rules this module exists to keep:
 *
 * - **Three tiers, because § 8 suppresses three different amounts of picture.**
 *   {@link buildSceneFrame} is the input half — terrain, both anchors, the span markers, the 5 %
 *   margin — and it fails **only** for « l'exception géométrique » (`L` / `h` / station), the one
 *   state where there is no shared x domain and the scrub track stops being a pointer path.
 *   {@link buildSceneBase} is the solved half on top of it, and its `null` is « Aucun résultat »,
 *   where « les entrées se dessinent toujours ». Returning one `null` for both — a blank textile
 *   `MBL` collapsing the frame the same way a negative span does — applies an exception the spec
 *   wrote down *as* an exception.
 * - **`x_D` is not a solve input, so the derivation is split in two.** {@link buildSceneBase} runs
 *   the sweep and the §11 pass over `deriveUnloaded`'s line — everything the *scenario* decides —
 *   and {@link placeRider} runs the rider's exact solve and its one-step clearance. That split
 *   **is** § 7's « memo on the solve inputs behind the `useSweep` seam »: dragging the rider
 *   dispatches a new Scenario on every `pointermove`, and only the second half may re-run for it.
 *   `unloadedInputs`, `mp` and `hRider` are what a memo keys on, and `x_D` is absent from them.
 * - **No polyline is ever stored in a result object.** The cable is regenerated per render from
 *   `sampleCable(state, n)`; what is stored here is this render's samples, not a field on a
 *   `SpanState` — voir § 2 — le contrat du moteur.
 * - **The z extent is the traverse's envelope, not the current cable.** VE is « recomputed on every
 *   render », but a scale that moved *with the rider* would rescale the plot under a drag. The
 *   envelope is a function of the scenario alone, so scrubbing changes no scale.
 * - **A typed position gets § 5's exact §6.1-case-2 solve**, never a snap-and-rewrite: « the field
 *   reads back exactly what was typed and the drawn cable is the true state there ». Pointer input
 *   snaps *before* it reaches state ({@link snapToStep}), so this module has one rider path.
 * - **Signal 3 covers the violating rider positions, not the x of the worst point** — a different
 *   set of x values, and the prototype had it backwards. `inViolation` (signal 4) is « the rider is
 *   in the zone **right now** », which is what keeps the two states separable.
 * - **The clearance cell reports §11's inner minimum at the current rider position**, and the
 *   dimension line is drawn wherever that minimum actually sits — which is why it can step sideways
 *   onto a bump the rider has already passed.
 * - **Two clearances, and only one of them is a criterion.** {@link SceneRider.worst} is §11's
 *   reducer — the strip's curve, the read-out cell, the deficit fill and the zero crossing are all
 *   it, because it is what fails. {@link SceneRider.underRider} is the passenger's own garde, drawn
 *   by `profile.tsx` and judged by nothing. Ticket 41 measured why they may not share the strip's y
 *   axis: on an imported profile the passenger flies a valley at **+62,6 m** while the envelope
 *   minimum sits at **−0,36 m** against a ridge, so one linear axis leaves the crossing this whole
 *   Chart Block exists to show **0,2 px** tall at § 5's reference column.
 * - **Terrain enters at one joint.** `placeSpan` builds the engine's `Terrain` over `[0, L]`; the
 *   *drawn* ground spans the whole shared domain, holding the ends exactly as `zGroundAt` does.
 */

import type { SweepRider } from "@/lib/scenario/traverse.ts";
import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { Unloaded } from "@/lib/scenario/unloaded.ts";
import type {
  ClearanceResult,
  DerivedMaterial,
  SpanInput,
  SpanState,
  SweepResult,
  SweepStep,
  Terrain,
} from "@/lib/sim";
import type { AnchorPlacement, Trace } from "@/lib/terrain/trace.ts";

import { xDomain } from "@/lib/layout/contract.ts";
import { clampX, type PlacedSpan } from "@/lib/scenario/geometry.ts";
import { sweepRider } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";
import {
  evaluateClearance,
  sampleCable,
  solveAtHorizontalPosition,
  sweepStep,
  zGroundAt,
} from "@/lib/sim";
import { altitudeAt } from "@/lib/terrain/trace.ts";

/**
 * Vertices minus one on a drawn cable. Nothing downstream is measured against it — it is a drawing
 * resolution, not a physical grid — and 240 puts a vertex every ~4,6 px on the 1104 px desktop plot
 * and every ~1,4 px at 390. The clearance reducer keeps its own `CLEARANCE.samplesPerStep`.
 */
export const CABLE_SAMPLES = 240;

/** A polyline in engine coordinates: metres from anchor A, metres from anchor A's **top**. */
export type Polyline = {
  /** Horizontal positions, m, increasing. */
  readonly xs: Float64Array;
  /** Heights relative to anchor A's top, m. */
  readonly zs: Float64Array;
};

/** One closed interval of rider positions, m. Signal 3 draws one tinted band per entry. */
export type Band = { readonly from: number; readonly to: number };

/** Everything the two charts know about where the rider is and what it costs. */
export type SceneRider = {
  /** The exact §6.1-case-2 solve at the Scenario's `x_D`, as the sweep's own record. */
  readonly step: SweepStep;
  /** The loaded line at this position — regenerated, never stored on a result. */
  readonly cable: Polyline;
  /**
   * §11's **inner** minimum at this rider position: the worst clearance, and where it sits.
   *
   * `hClear` is a value; **`atX` is a position of a scanned extremum**, and the two do not carry the
   * same resolution. The scan reads the cable's own vertices plus the rider's node plus the terrain's
   * points, so `atX` is always one of those — never an interpolated argmin. On § 4's straight
   * two-point ground that is usually the rider's node (142 of 260 steps on the shipped line, 209 of
   * 260 on the textile one), and where it is not, it is a cable vertex `L₀ / 60` ≈ 2,53 m apart:
   * re-measured on ticket 39 item 5, `atX` sits within **1,26 m** of a 600-sample scan's answer —
   * half a sample spacing, the floor for a vertex-quantised argmin — while `hClear` at that same `x`
   * is within **1,5 mm** of it. Both bounds are against the *fine scan*; between two consecutive
   * scrub steps the drawn dimension jumps up to 2,53 m of `x`, but the garde it carries moves by as
   * much as 0,1 m there, which is the curve's own slope and not an error. On an imported profile the
   * difference against 600 samples is **0,000 m**, because the governing point is a terrain vertex
   * the scan evaluates exactly. Assert it at `testing.md`'s « positions of scanned extrema » tier —
   * absolute, 2× the sample spacing — and voir `clearance.ts` for why refining it costs a root-find
   * in the inner loop.
   */
  readonly worst: { readonly hClear: number; readonly atX: number };
  /**
   * « Garde sous le passager », m — `z_D − z_ground(x_D) − h_rider`, the clearance under the rider's
   * **own feet** rather than at {@link worst}'s governing point.
   *
   * It is **not** a second criterion and nothing judges it: it exists because it is the quantity the
   * reader computes by eye off the profile — passenger glyph against filled terrain — and until
   * ticket 41 the app drew it nowhere while the strip's curve, on an axis captioned « selon la
   * position du passager », carried {@link worst} instead. `profile.tsx` dimensions it at `x_D`; the
   * strip and the read-out cell stay {@link worst}'s, which is what §11 reduces and §10 judges.
   *
   * `underRider ≥ worst.hClear` **by construction** — it is `h_clear` evaluated at `x = x_D`, one
   * candidate in the inner minimum. The shipped scan used to violate that by up to **99 mm**, on
   * roughly half the sweep's steps, because its 60 uniform samples in `s` never landed on the trolley
   * kink — the loaded catenary's own low point.
   * [Ticket 37](../../../.scratch/zipline-simulator-v1-build/issues/37-engine-correctness-fixes.md)
   * item 1 merged `s_D` into every step's sample set, so the ordering now holds **as written**:
   * measured on ticket 39 item 5 at `worst.hClear − underRider ≤ 0` over all 260 steps of six
   * scenarios — first-run, ancrages 12 / 20, the textile line and the three imported profiles — with
   * a worst excess of **exactly 0**. What is *enforced* is looser and deliberately so: `scene.test.ts`
   * bounds the excess by the scan's error rather than by that zero, over three of the six, because
   * the scan's error is the contract and the zero is a property of § 4's straight ground. Consumers
   * may rely on the ordering; what they may **not** rely on is `worst.atX`'s resolution, voir
   * {@link SceneRider.worst}.
   */
  readonly underRider: number;
  /**
   * « Écart à vide », m — how far the load hangs **below the unloaded line** at its own `x`:
   * `z_à vide(x_D) − z_D`. Positive whenever the load pulls the line down, which is always.
   *
   * Read off {@link SceneBase.unloadedCable} by linear interpolation, so it is the gap to the line
   * **as drawn** — the number beside the handle and the dashed curve cannot disagree. The chord error
   * of 240 samples is `Δ²·w / (8·H)`: well under a millimetre on § 9's line and a few millimetres at
   * 1500 m, both below the two decimals it prints at.
   */
  readonly belowUnloaded: number;
  /**
   * Is the worst point further than `max(1 m, 1 % de la portée)` from the rider? The cell relabels
   * itself « Garde min. ligne (à x 101 m) » only then, so the ordinary case reads plainly — **and
   * the same bit gates the profile's second dimension line**, so the drawing and the label say « the
   * number is not under the passenger » together or not at all (ticket 41).
   */
  readonly relabel: boolean;
  /** Signal 4 — « suis-je dans la zone en ce moment ? ». Cable-red is reserved for this. */
  readonly inViolation: boolean;
  /**
   * §6.3's passenger envelope, m — drawn **metrically**, never at a minimum pixel size. At 1500 m
   * it is ~5 px tall, and a non-metric glyph would misrepresent the one measurement the tool
   * exists to produce; legibility is carried by the printed read-out instead.
   */
  readonly envelope: number;
  /** « Flèche » at this position: the drop below the A–B chord, m. */
  readonly sagAtRider: number;
};

/**
 * **The input half of the picture** — everything § 8's « Aucun résultat » keeps drawing: the
 * terrain, both anchors, the span markers and the 5 % margin. It needs no material, no `L₀` and no
 * solve, which is exactly why it is a type of its own: a blank textile `MBL` costs the chart its
 * cable, not its frame.
 *
 * `null` from {@link buildSceneFrame} is the **only** state § 8 lets collapse both plots to an
 * empty frame with no ticks and an inert scrub track — « l'exception géométrique », scoped to `L` /
 * `h` / station failures, and written down as an exception precisely so nobody applies it to every
 * failure alike.
 */
export type SceneFrame = {
  /** Portée, m. */
  readonly L: number;
  /** Dénivelé, m — anchor top to anchor top, negative when B is lower. */
  readonly h: number;
  /** The shared x domain, m — `[−0,05 L, 1,05 L]` clamped to the trace extent. */
  readonly domain: readonly [number, number];
  /** The terrain's own horizontal extent in the span frame, or `null` in manual mode. */
  readonly extent: { readonly min: number; readonly max: number } | null;
  /** The engine's ground, over `[0, L]` — the one terrain joint. */
  readonly terrain: Terrain;
  /** The **drawn** ground, over the whole shared domain, ends held exactly as `zGroundAt` holds them. */
  readonly ground: Polyline;
  /** Anchor heights above their own bases, m — the towers the Handle Lane's bracket marks. */
  readonly anchors: { readonly zA: number; readonly zB: number };
  /**
   * The z extent the auto-fit sees, m, **before** the ±12 % margin. On a frame standing alone it is
   * the drawn ground and both towers — all there is to fit. {@link buildSceneBase} widens it with
   * the traverse's envelope and the unloaded line, and never with the *current* cable: a scale that
   * moved with the rider would rescale the plot under a drag.
   */
  readonly zExtent: { readonly min: number; readonly max: number };
};

/**
 * Everything the scenario decides — the whole scene **but the rider**. `null` from
 * {@link buildSceneBase} is § 8's « Aucun résultat »: the cable, the unloaded line, the clearance
 * curve, the danger bands and the rider marker go, while the {@link SceneFrame} it was built on
 * keeps drawing.
 *
 * This is the expensive half: the sweep plus the clearance reducer, p95 1,30 ms at 240 steps. It is
 * a function of the frame, the unloaded line, `mp` and `hRider` alone, so a scrub — which changes
 * `x_D` and nothing else — cannot invalidate it.
 */
export type SceneBase = SceneFrame & {
  /** The span posed to the solver, rider excluded. */
  readonly span: SpanInput;
  /** The rider's design load, N. */
  readonly P: number;
  /** What the solver consumed. */
  readonly material: DerivedMaterial;
  /** The unloaded line — « ligne à vide », the layer that is **off** by default. */
  readonly unloaded: SpanState;
  /** Its polyline, sampled at {@link CABLE_SAMPLES}. */
  readonly unloadedCable: Polyline;
  /** The precomputed traverse. `coverage < 1` is `Indéterminé` and the scrub track gains gaps. */
  readonly traverse: SweepResult;
  /**
   * « Trajectoire » — the load's own path, `(x_D, z_D)` over every solved step, **split at
   * `Indéterminé`'s gaps** rather than bridged across them: a line through a step that did not solve
   * would draw a position nobody computed. Usually one run.
   */
  readonly trajectory: readonly Polyline[];
  /** §11 over the traverse: the aggregate `h_min`, its `x`, and the per-step arrays. */
  readonly clearance: ClearanceResult;
  /** §6.3's passenger envelope, m — §11's third term, so it is the scenario's, not the view's. */
  readonly hRider: number;
  /** Signal 3 — the rider positions that violate, merged into runs. Empty when nothing fails. */
  readonly violating: readonly Band[];
};

/** What the Chart Block draws: the scenario's half, plus the rider the view parameter selects. */
export type ChartScene = SceneBase & {
  /** The current rider — {@link placeRider}, the only half a scrub re-runs. */
  readonly rider: SceneRider;
};

/**
 * The input half of the picture — the placement, the terrain and the shared x domain. **No
 * material, no `L₀`, no solve**, so it survives every failure but its own.
 *
 * @param placed the unloaded line's `span`, which every outcome but stage `geometry` carries: the
 *   frame is drawn on the placement the line was solved on, and `placeSpan` runs once per edit.
 * @returns `null` for § 8's *exception géométrique* and nothing else — a `null` placement: a
 *   non-finite or non-positive `L`, a non-finite `h`, `station B ≤ station A`, or a `tr` geometry
 *   with no Trace. Those are the states where the shared x domain — span + 5 % — does not exist,
 *   so `x_D` has no interval to live in and the scrub track has nothing to be a pointer path over.
 */
export function buildSceneFrame(placed: PlacedSpan | null): SceneFrame | null {
  if (placed === null) return null;
  const { L, h, anchors, terrain } = placed;
  const { ground, extent } = drawnGround(placed);
  return {
    L,
    h,
    domain: xDomain(L, extent),
    extent,
    terrain,
    ground,
    anchors,
    zExtent: frameZExtent({ ground, h, anchors }),
  };
}

/**
 * The traverse over the unloaded line — sweep, reduce §11 over it — reduced to what the Chart Block
 * draws. The material, `L₀` and the unloaded solve are `deriveUnloaded`'s, run once and shared
 * with the `Valeurs déduites`; the Sweep and §11 are `sweepRider`'s; the rider is
 * {@link placeRider}'s.
 *
 * @param frame the {@link SceneFrame} for the same placement — the Chart Block memoises it on its
 *   own, because the frame outlives the solve.
 * @returns `null` when the scenario cannot be **solved**: no frame, an unloaded line that did not
 *   solve, or a traverse that lost every step. A non-`null` frame is unaffected, and § 8's
 *   « Aucun résultat » is exactly that state — « les entrées se dessinent toujours ». **Which**
 *   failure it was is the error surfaces' business (A11), not the chart's.
 */
export function buildSceneBase(
  frame: SceneFrame | null,
  unloaded: Unloaded,
  rider: SweepRider,
): SceneBase | null {
  if (frame === null || !unloaded.ok) return null;
  const swept = sweepRider(unloaded, rider);
  if (swept === null) return null;
  const { input: span, material, state } = unloaded;
  const { P, traverse, clearance } = swept;
  const unloadedCable = polyline(sampleCable(state, CABLE_SAMPLES));

  return {
    ...frame,
    span,
    P,
    material,
    unloaded: state,
    unloadedCable,
    traverse,
    trajectory: trajectoryRuns(traverse),
    clearance,
    hRider: rider.hRider,
    violating: violatingBands(traverse, clearance),
    zExtent: solvedZExtent(frame.zExtent, { traverse, unloadedCable }),
  };
}

/**
 * Both halves at once, for a caller that has no memo to split — the `node` tests, and anything
 * that wants one scene from one Scenario. **The Chart Block does not use it**: it keys
 * {@link buildSceneBase} on the unloaded line and the two rider inputs, and {@link placeRider} on
 * `x_D`, which is the whole point of the split.
 */
export function buildScene({
  scenario,
  trace,
}: {
  scenario: ScenarioDraft;
  trace: Trace | null;
}): ChartScene | null {
  const unloaded = deriveUnloaded(unloadedInputs(scenario, trace));
  const base = buildSceneBase(buildSceneFrame(unloaded.span), unloaded, scenario.rider);
  if (base === null) return null;
  const rider = placeRider(base, scenario.rider.xD);
  return rider === null ? null : { ...base, rider };
}

/**
 * Pointer input **snaps to the precomputed sweep steps**, because at 1500 m one pixel is ≈1,2 m and
 * there is no precision to preserve. It is also what makes `Indéterminé`'s gaps work for free:
 * a failed step is absent from `steps`, so the pointer simply cannot land in the hole.
 *
 * @returns the nearest solved rider position, m, or `null` for a traverse with no solved step.
 */
export function snapToStep(traverse: SweepResult, x: number): number | null {
  let best: number | null = null;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const step of traverse.steps) {
    const gap = Math.abs(step.xD - x);
    if (gap < bestGap) {
      bestGap = gap;
      best = step.xD;
    }
  }
  return best;
}

/** What only the picture needs on top of the placement: the drawn ground and the trace's extent. */
function drawnGround({ L, terrain, onTrace }: PlacedSpan): {
  ground: Polyline;
  extent: { min: number; max: number } | null;
} {
  if (onTrace === null) {
    const [lo, hi] = xDomain(L, null);
    const zBaseA = zGroundAt(terrain, 0);
    const zBaseB = zGroundAt(terrain, L);
    // Outside the span the ends are **held, never extrapolated** — `zGroundAt`'s own rule, drawn.
    return {
      ground: {
        xs: Float64Array.from([lo, 0, L, hi]),
        zs: Float64Array.from([zBaseA, zBaseA, zBaseB, zBaseB]),
      },
      extent: null,
    };
  }

  const { trace, a } = onTrace;
  const extent = {
    min: trace.d[0] - a.station,
    max: trace.d[trace.d.length - 1] - a.station,
  };
  return { ground: drawnTrace(trace, a, xDomain(L, extent)), extent };
}

/**
 * The imported profile over the **whole** shared domain, translated into the anchor-A-top frame.
 *
 * The file's own samples, **never a resampling** — § 4 killed resampling for making a coarse import
 * indistinguishable from a fine one, and that rule does not stop at the engine's edge.
 */
function drawnTrace(
  trace: Trace,
  a: AnchorPlacement,
  [lo, hi]: readonly [number, number],
): Polyline {
  const zRef = altitudeAt(trace, a.station) + a.height;
  const xs: number[] = [lo];
  const zs: number[] = [altitudeAt(trace, lo + a.station) - zRef];
  for (let i = 0; i < trace.d.length; i++) {
    const x = trace.d[i] - a.station;
    if (x <= lo || x >= hi) continue;
    xs.push(x);
    zs.push(trace.z[i] - zRef);
  }
  xs.push(hi);
  zs.push(altitudeAt(trace, hi + a.station) - zRef);
  return { xs: Float64Array.from(xs), zs: Float64Array.from(zs) };
}

/**
 * The rider at `x_D`: the exact solve, its own clearance minimum, and the two flags.
 *
 * **The cheap half, and the only one a scrub re-runs** — one §6.1-case-2 solve (~40 µs) plus a
 * one-step §11 reduction, over a {@link SceneBase} the pointer did not touch. § 2's « dragging the
 * rider is vsync-bound, not compute-bound » is a claim about *this* function, not about the sweep.
 *
 * @returns `null` when the exact solve refuses at this position — the same « no picture » the base
 *   returns, and A11's to name.
 */
export function placeRider(base: SceneBase, requestedXD: number): SceneRider | null {
  const { span, P, terrain, hRider, L, h, unloadedCable } = base;
  const xD = clampX(requestedXD, L);
  // §6.1 case 2 — outer bisection on `s_P`, inner 2×2 Newton, measured ≈40 µs. Snapping 99,7 to
  // 101,2 and rewriting the field would discard user input silently for the sake of one code path.
  const exact = solveAtHorizontalPosition(span, P, xD);
  if (!exact.ok) return null;
  const sP = exact.state.loads[0]?.s;
  if (sP === undefined) return null;

  // The same state, as the record the sweep publishes — `(x_D, z_D, T_A, T_B, θ)`, θ read on the
  // below side of the kink like every other number in the app.
  const resolved = sweepStep(span, P, sP, { H: exact.state.H, V0: exact.state.V0 });
  if (!resolved.ok) return null;
  const { step, state } = resolved;

  // §11's **inner** minimum at this one rider position: the reducer, over a one-step traverse.
  const at = evaluateClearance(span, P, [step], terrain, hRider);
  const worst = { hClear: at.perStep[0], atX: at.perStepX[0] };

  return {
    step,
    cable: polyline(sampleCable(state, CABLE_SAMPLES)),
    worst,
    // The same three terms as §11's `h_clear`, read at the rider's own `x` instead of minimised
    // over the line — voir {@link SceneRider.underRider}. `z_D` is exact here (the trolley sits on
    // the kink), so this is the one clearance in the app that carries no scan error at all.
    underRider: step.zD - zGroundAt(terrain, step.xD) - hRider,
    belowUnloaded: polylineAt(unloadedCable, step.xD) - step.zD,
    // « Only when the worst point is further than max(1 m, 1 % of span) from the rider ». On the
    // shipped line the two now **coincide** — since ticket 37 the inner minimum at `x_D` 75 is the
    // rider's own node, 0,000 m away, against 0,9 m before — so the cell reads plainly on first
    // paint. The traverse's own minimum still sits elsewhere, 0,57 m off at x 74,43.
    relabel: Math.abs(worst.atX - step.xD) > Math.max(1, 0.01 * L),
    inViolation: worst.hClear < 0,
    envelope: hRider,
    sagAtRider: (h * step.xD) / L - step.zD,
  };
}

/**
 * A polyline's height at `at`, by linear interpolation between its vertices — the drawn ground's rule
 * and `zGroundAt`'s: **outside the vertices the ends are held, never extrapolated**.
 */
export function polylineAt(points: Polyline, at: number): number {
  const { xs, zs } = points;
  if (at <= xs[0]) return zs[0];
  const last = xs.length - 1;
  if (at >= xs[last]) return zs[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= at) lo = mid;
    else hi = mid;
  }
  return zs[lo] + ((at - xs[lo]) / (xs[hi] - xs[lo])) * (zs[hi] - zs[lo]);
}

/**
 * The load's path over the traverse, one polyline per run of consecutive solved steps. A failed
 * step ends a run; a run of one step has no line to draw and is dropped.
 *
 * Exported for its test: a failed step is **injected, never hunted** (`testing.md`), and a
 * hand-built traverse is the injection that needs no mock.
 */
export function trajectoryRuns(traverse: SweepResult): Polyline[] {
  const failed = new Set(traverse.failures.map((failure) => failure.index));
  const runs: Polyline[] = [];
  let xs: number[] = [];
  let zs: number[] = [];
  const close = () => {
    if (xs.length > 1) runs.push({ xs: Float64Array.from(xs), zs: Float64Array.from(zs) });
    xs = [];
    zs = [];
  };
  // `steps` is the grid minus `failures`, in grid order, so walking the grid re-aligns the two.
  let next = 0;
  for (let index = 0; index < traverse.grid.length; index++) {
    if (failed.has(index)) {
      close();
      continue;
    }
    const step = traverse.steps[next++];
    xs.push(step.xD);
    zs.push(step.zD);
  }
  close();
  return runs;
}

/**
 * Signal 3 — the rider positions that violate, as runs of consecutive sweep steps.
 *
 * **Not the x of the worst point.** The band answers « où le passager ne doit-il pas aller ? »,
 * which is a different set of x values; the prototype had this backwards at first.
 */
function violatingBands(traverse: SweepResult, clearance: ClearanceResult): Band[] {
  const bands: Band[] = [];
  let start: number | null = null;
  for (let i = 0; i < traverse.steps.length; i++) {
    const violates = clearance.perStep[i] < 0;
    if (violates && start === null) start = traverse.steps[i].xD;
    if (!violates && start !== null) {
      bands.push({ from: start, to: traverse.steps[i - 1].xD });
      start = null;
    }
  }
  if (start !== null) bands.push({ from: start, to: traverse.steps[traverse.steps.length - 1].xD });
  return bands;
}

/**
 * The frame's own z extent: the drawn ground and both towers. It is all there is to fit when the
 * scenario draws its inputs and nothing else, and it is the floor {@link solvedZExtent} widens.
 */
function frameZExtent({
  ground,
  h,
  anchors,
}: {
  ground: Polyline;
  h: number;
  anchors: { zA: number; zB: number };
}): { min: number; max: number } {
  // Anchor tops are the frame's own datum and its `h`; the bases are where the towers stand.
  let min = Math.min(0, h, -anchors.zA, h - anchors.zB);
  let max = Math.max(0, h, -anchors.zA, h - anchors.zB);

  for (const z of ground.zs) {
    if (z < min) min = z;
    if (z > max) max = z;
  }
  return { min, max };
}

/**
 * The z extent the auto-fit sees once the line solves: the frame's, widened by the **traverse's**
 * envelope and the unloaded line. Not the current cable — a scale that followed the rider would
 * rescale the plot mid-drag, and VE is supposed to describe the scenario, not the moment.
 */
function solvedZExtent(
  frame: { readonly min: number; readonly max: number },
  { traverse, unloadedCable }: { traverse: SweepResult; unloadedCable: Polyline },
): { min: number; max: number } {
  let { min, max } = frame;
  // The loaded envelope's floor: the trolley sits on the kink, which is the low point of a loaded
  // catenary, so the deepest node over the traverse bounds every loaded line the user can scrub to.
  for (const step of traverse.steps) {
    if (step.zD < min) min = step.zD;
    if (step.zD > max) max = step.zD;
  }
  // « Ligne à vide » is a layer the user can switch **off**, but the scale may not jump when they
  // do: a toggle that rescaled the plot would make the two layers unreadable against each other.
  for (const z of unloadedCable.zs) {
    if (z < min) min = z;
    if (z > max) max = z;
  }
  return { min, max };
}

/** `sampleCable`'s interleaved `x, z` pairs, split into the two arrays a path generator wants. */
function polyline(interleaved: Float64Array): Polyline {
  const count = interleaved.length / 2;
  const xs = new Float64Array(count);
  const zs = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    xs[i] = interleaved[2 * i];
    zs[i] = interleaved[2 * i + 1];
  }
  return { xs, zs };
}
