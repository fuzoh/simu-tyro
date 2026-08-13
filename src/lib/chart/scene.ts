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
 *   the material, `L₀`, the unloaded solve, the sweep and the §11 pass — everything the *scenario*
 *   decides — and {@link placeRider} runs the rider's exact solve and its one-step clearance. That
 *   split **is** § 7's « memo on the solve inputs behind the `useSweep` seam »: dragging the rider
 *   dispatches a new Scenario on every `pointermove`, and only the second half may re-run for it.
 *   {@link sceneInputs} is what a memo keys on, and `x_D` is deliberately absent from it.
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
 * - **Terrain enters at one joint.** `deriveTerrain` builds the engine's `Terrain` over `[0, L]`;
 *   the *drawn* ground spans the whole shared domain, holding the ends exactly as `zGroundAt` does.
 */

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type {
  ClearanceResult,
  DerivedMaterial,
  SpanInput,
  SpanState,
  SweepResult,
  SweepStep,
  Terrain,
} from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { G } from "@/lib/format/quantity.ts";
import { xDomain } from "@/lib/layout/contract.ts";
import {
  deriveSteel,
  deriveTextile,
  evaluateClearance,
  resolveL0,
  sampleCable,
  solveAtHorizontalPosition,
  solveSpan,
  sweep,
  sweepStep,
} from "@/lib/sim";
import { altitudeAt, deriveSpan, deriveTerrain } from "@/lib/terrain/trace.ts";

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
  /** §11's **inner** minimum at this rider position: the worst clearance, and where it sits. */
  readonly worst: { readonly hClear: number; readonly atX: number };
  /**
   * Is the worst point further than `max(1 m, 1 % de la portée)` from the rider? The cell relabels
   * itself « Garde min (à x 101 m) » only then, so the ordinary case reads plainly.
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
 * a function of {@link SceneInputs} alone, so a scrub — which changes `x_D` and nothing else —
 * cannot invalidate it.
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
 * **The solve inputs.** Every Scenario field {@link buildSceneBase} reads, and `x_D` is not one of
 * them: it selects a view over a scene that is already solved.
 *
 * This type exists to be a memo key. § 7's store decision rests on « the real performance mechanism
 * is the memo on the solve inputs behind the `useSweep` seam », and a memo keyed on the whole
 * Scenario is not that memo — `moveRider` dispatches a new Scenario on every `pointermove`, so it
 * would re-run the sweep and the §11 pass for a 1 px drag that lands back on the same step.
 */
export type SceneInputs = {
  readonly geometry: ScenarioDraft["geometry"];
  readonly anchors: ScenarioDraft["anchors"];
  readonly material: ScenarioDraft["material"];
  readonly tightness: ScenarioDraft["tightness"];
  /** Passenger mass, kg — the traverse's load, so a scenario input. */
  readonly mp: number;
  /** §6.3's passenger envelope, m — §11's third term, so a scenario input too. */
  readonly hRider: number;
  /** The imported profile, or `null` in manual mode. */
  readonly trace: Trace | null;
};

/**
 * What the input half of the picture is a function of: the placement and nothing else. A subset of
 * {@link SceneInputs}, so a caller with solve inputs in hand can pass them straight in.
 */
export type SceneFrameInputs = Pick<SceneInputs, "anchors" | "geometry" | "trace">;

/** A Scenario's solve inputs, `x_D` dropped. What a memo over {@link buildSceneBase} keys on. */
export function sceneInputs(scenario: ScenarioDraft, trace: Trace | null): SceneInputs {
  return {
    geometry: scenario.geometry,
    anchors: scenario.anchors,
    material: scenario.material,
    tightness: scenario.tightness,
    mp: scenario.rider.mp,
    hRider: scenario.rider.hRider,
    trace,
  };
}

/**
 * The input half of the picture — the placement, the terrain and the shared x domain. **No
 * material, no `L₀`, no solve**, so it survives every failure but its own.
 *
 * @returns `null` for § 8's *exception géométrique* and nothing else: a non-finite or non-positive
 *   `L`, a non-finite `h`, `station B ≤ station A`, or a `tr` geometry with no Trace. Those are the
 *   states where the shared x domain — span + 5 % — does not exist, so `x_D` has no interval to
 *   live in and the scrub track has nothing to be a pointer path over.
 */
export function buildSceneFrame({ geometry, anchors, trace }: SceneFrameInputs): SceneFrame | null {
  const placed = place({ geometry, anchors }, trace);
  if (placed === null) return null;
  const { L, h, terrain, ground, extent } = placed;
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
 * The whole chain a **parameter** change runs — derive the material, resolve `L₀`, solve the
 * unloaded line, sweep, reduce §11 over it — reduced to what the Chart Block draws. The rider is
 * {@link placeRider}'s, and deliberately not here.
 *
 * @param frame the already-built {@link SceneFrame} for these same inputs, when the caller holds
 *   one — the Chart Block does, because the frame outlives the solve and is memoised on its own.
 * @returns `null` when the scenario cannot be **solved**: a textile draft with blanks, an
 *   unreachable tightness target, a refused solve, a traverse that lost every step. The frame is
 *   unaffected, and § 8's « Aucun résultat » is exactly that state — « les entrées se dessinent
 *   toujours ». A `null` frame is the *other* state and is the caller's to distinguish. **Which**
 *   failure it was is the error surfaces' business (A11), not the chart's.
 */
export function buildSceneBase(
  { geometry, anchors, material: materialSpec, tightness, mp, hRider, trace }: SceneInputs,
  frame?: SceneFrame | null,
): SceneBase | null {
  const material = deriveMaterial(materialSpec);
  if (material === null) return null;

  const placed = frame === undefined ? buildSceneFrame({ geometry, anchors, trace }) : frame;
  if (placed === null) return null;
  const { L, h, terrain } = placed;

  const L0 = resolveL0(tightness, { L, h, ...material });
  if (!L0.ok) return null;

  const span: SpanInput = {
    L,
    h,
    L0: L0.value,
    w: material.w,
    EA: material.EA,
    loads: [],
    strength: material.strength,
  };

  const unloaded = solveSpan(span);
  if (!unloaded.ok) return null;

  const P = mp * G;
  const traverse = sweep(span, P);
  // A traverse that lost every step has no picture and no `h_min`: `atStepIndex` is −1, which is
  // the flag § 2 says to check rather than reading a garde off a traverse that never happened.
  if (traverse.steps.length === 0) return null;

  const clearance = evaluateClearance(span, P, traverse.steps, terrain, hRider);
  const unloadedCable = polyline(sampleCable(unloaded.state, CABLE_SAMPLES));

  return {
    ...placed,
    span,
    P,
    material,
    unloaded: unloaded.state,
    unloadedCable,
    traverse,
    clearance,
    hRider,
    violating: violatingBands(traverse, clearance),
    zExtent: solvedZExtent(placed.zExtent, { traverse, unloadedCable }),
  };
}

/**
 * Both halves at once, for a caller that has no memo to split — the `node` tests, and anything
 * that wants one scene from one Scenario. **The Chart Block does not use it**: it keys
 * {@link buildSceneBase} on {@link sceneInputs} and {@link placeRider} on `x_D`, which is the
 * whole point of the split.
 */
export function buildScene({
  scenario,
  trace,
}: {
  scenario: ScenarioDraft;
  trace: Trace | null;
}): ChartScene | null {
  const base = buildSceneBase(sceneInputs(scenario, trace));
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

/** `x_D` clamps on **every** path — geometry change, link arrival, typed input. It selects a view. */
export function clampToSpan(x: number, L: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > L ? L : x;
}

/** What the solver consumes, or `null` while a textile draft still has § 9's two blanks. */
function deriveMaterial(material: ScenarioDraft["material"]): DerivedMaterial | null {
  if (material.family === "steel") return deriveSteel(material);
  const { MBL, mu, k } = material;
  if (MBL === null || mu === null || k === null) return null;
  return deriveTextile({ family: "textile", ropeClass: material.ropeClass, MBL, mu, k });
}

/** The span, the engine's ground and the drawn ground — the one place the two modes differ. */
function place(
  { geometry, anchors }: Pick<SceneInputs, "anchors" | "geometry">,
  trace: Trace | null,
): {
  L: number;
  h: number;
  terrain: Terrain;
  ground: Polyline;
  extent: { min: number; max: number } | null;
} | null {
  if (geometry.source === "manual") {
    const { L, h } = geometry;
    if (!Number.isFinite(L) || L <= 0 || !Number.isFinite(h)) return null;
    // § 4's manual ground: the straight line between the two anchor bases, in the anchor-A-top
    // frame. Its two points are the cable's own ends, so it costs the clearance reducer nothing.
    const zBaseA = -anchors.zA;
    const zBaseB = h - anchors.zB;
    const terrain: Terrain = {
      kind: "profile",
      xs: Float64Array.from([0, L]),
      zs: Float64Array.from([zBaseA, zBaseB]),
    };
    const [lo, hi] = xDomain(L, null);
    // Outside the span the ends are **held, never extrapolated** — `zGroundAt`'s own rule, drawn.
    return {
      L,
      h,
      terrain,
      ground: {
        xs: Float64Array.from([lo, 0, L, hi]),
        zs: Float64Array.from([zBaseA, zBaseA, zBaseB, zBaseB]),
      },
      extent: null,
    };
  }

  if (trace === null) return null;
  const a = { station: geometry.sa, height: anchors.zA };
  const b = { station: geometry.sb, height: anchors.zB };
  // `station B ≤ station A` is § 4's blocked placement, repaired by `[ Inverser A et B ]`. It has
  // no picture, and `deriveTerrain` would throw on it.
  if (!(b.station > a.station)) return null;

  const { L, h } = deriveSpan(trace, a, b);
  const terrain = deriveTerrain(trace, a, b);
  const extent = {
    min: trace.d[0] - a.station,
    max: trace.d[trace.d.length - 1] - a.station,
  };
  return { L, h, terrain, ground: drawnTrace(trace, a, xDomain(L, extent)), extent };
}

/**
 * The imported profile over the **whole** shared domain, translated into the anchor-A-top frame.
 *
 * The file's own samples, **never a resampling** — § 4 killed resampling for making a coarse import
 * indistinguishable from a fine one, and that rule does not stop at the engine's edge.
 */
function drawnTrace(
  trace: Trace,
  a: { station: number; height: number },
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
  const { span, P, terrain, hRider, L, h } = base;
  const xD = clampToSpan(requestedXD, L);
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
    // « Only when the worst point is further than max(1 m, 1 % of span) from the rider », which is
    // why the first-run rider ships 0,9 m from the traverse minimum: the cell must not relabel
    // itself on first paint.
    relabel: Math.abs(worst.atX - step.xD) > Math.max(1, 0.01 * L),
    inViolation: worst.hClear < 0,
    envelope: hRider,
    sagAtRider: (h * step.xD) / L - step.zD,
  };
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
