/**
 * §7's inverse modes — `docs/simulation-theory.md` §7 (« Parameterisation modes and inverse
 * problems (B5) »: `L₀` as the single internal state variable, `H` strictly monotone decreasing
 * in `L₀`, the bisection bracket, the closed-form seed and its refuted [R1 B5] twin), read with
 * §5.4's chord bound and §4.1's geometry. Underlying reference reports:
 * `docs/references/algo simulation tyrolienne.md` §3/§6 and `docs/references/research-two.md`
 * B5 (the mooring « pretension problem » and the overhead-line stringing problem) — but **no
 * value is transcribed from either**: §14 records [R1 B5]'s worked examples as fabricated and
 * its printed inverse formula as numerically refuted, so §15's `Z6` is the only fixture source.
 *
 * Rules this module exists to keep:
 *
 * - **`L₀` is first-class state, and the four modes are an adapter *above* `solveSpan`** — never
 *   a mode flag inside it. That is what makes mode switching a prefill of the length just
 *   achieved, keeps the §15 fixture surface at one row, and lets §9's `ΔL₀` story compose later.
 *   *Later*: §9 is out of v1 scope and nothing here anticipates it beyond `L₀` being a value.
 * - **The §5.4 bound comes back in the quantity the user is editing.** `solveSpan` refuses with
 *   `field: "L0"` and the floor in metres; this module catches that and re-emits
 *   `field: "H_target" | "T_target" | "D_target"` with the bound **mapped forward through the same inversion
 *   that failed** — « Prétension maximale atteignable : 9 074 daN », « Flèche minimale
 *   atteignable : 0,29 m ». Quoting an `L₀` in metres beside a tension field is the
 *   eyeball-confusion the re-emission exists to prevent, so the bound is stated **once**, in the
 *   driving field's own quantity.
 * - **The bound is violable in every mode**, direct-`L₀` included — ticket 04 §7's line 261
 *   was struck on that ground. Mode `length` runs the same §5.4 floor before returning.
 * - **The floor _is_ the breaking load.** There is no reachable state where an over-target solves
 *   cleanly and the verdict says rupture, which is why this module refuses with a bound and no
 *   fix action rather than handing a sub-floor `L₀` to the solver.
 * - **Two refusals, two surfaces.** A rupture is `invalid-input` ⇒ « Tension impossible »; a
 *   bracket failure for **any other reason** is `no-convergence` ⇒ « Cible inatteignable ». They
 *   share `SolveError`, so a `slack-limit` escaping from inside the bracket would render the
 *   wrong banner — every non-rupture failure is normalised here (see {@link bracketL0}).
 * - **§5.4's bound is never re-derived.** `chordBoundFloor` is imported from `solve.ts`; this
 *   module owns the *mapping* of that one floor into the driving quantity, not a second copy of
 *   it.
 * - **The engine is dependency-free and SI** — `L₀`, `L`, `h` and the flèche in metres, `H` and
 *   `strength` in newtons, `w` in N/m. The daN the copy quotes is a display concern.
 */

import type { SolveError, SpanInput, SpanState } from "./types.ts";

import { xAt, zAt } from "./catenary.ts";
import { chordBoundFloor, solveSpan } from "./solve.ts";

/**
 * § 2's `Result<T, E>` — the same `ok`-discriminated shape as `SolveResult`, because failure is a
 * **value** here too: a target the line cannot reach is an answer about the line, not an
 * exception in the middle of a recompute the UI still has to render.
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/** §2's two anchors: A at `x = 0`, B at `x = L`. */
export type AnchorSide = "A" | "B";

/**
 * §7's input modes — the engine's half of the **Tightness Driver**. Exactly one quantity is
 * editable and the others are read-outs, which is why the field names carry their `_target`
 * suffix and mode `length` carries none: it is not a target, it is the state variable itself.
 */
export type TightnessSpec =
  /** §7 mode 3 — flèche à vide, m. The shipped active segment. */
  | { mode: "sag"; D_target: number }
  /** §7 mode 2 — the horizontal component `H`, N: Avancé's « tension horizontale ». */
  | { mode: "tension"; H_target: number }
  /**
   * §7 mode 2's « or anchor `T_target` » — the unloaded line's tension at one anchor, N: the
   * prétension a dynamometer between that anchor and the Mise en tension reads (#85).
   */
  | { mode: "anchor"; side: AnchorSide; T_target: number }
  /** §7 mode 1 — `L₀` direct, m. No inversion to run; the §5.4 floor still applies. */
  | { mode: "length"; L0: number };

/** The modes with a target to invert. */
type InverseSpec = Exclude<TightnessSpec, { mode: "length" }>;

/**
 * What an inversion needs beside the target: the span it happens on, plus the breaking load
 * §5.4's floor cannot be evaluated without. `strength` is `MBF | MBL` in newtons —
 * `DerivedMaterial` already carries it beside `w` and `EA`, so the app has it at hand.
 */
export type SpanGeometry = { L: number; h: number; w: number; EA: number; strength: number };

/** The interval a bisection runs on, in `L₀` metres. Both ends are admissible spans. */
export type Bracket = { lower: number; upper: number };

/**
 * This module's own constants. None of them is a physical value — §7 fixes the *method* (bisect
 * a monotone quantity between the chord and a doubled slack) and leaves its arithmetic limits
 * open, so these are pragmatic and stated here rather than smuggled into the loops.
 */
export const PARAMETERISE = {
  /**
   * Relative width at which the bracket is narrow enough to answer, against `L₀` itself: `1e-13`
   * on a 150 m span is 1,5×10⁻¹¹ m, comfortably below the ~1e-10 m that `L₀`'s own double
   * precision can express and three orders below §5.3's `1e-6 m` solve tolerance, so the answer
   * is limited by the solver rather than by this loop.
   */
  bracketTolerance: 1e-13,
  /** Bisections after which the bracket is as narrow as doubles allow — `log₂` of the above. */
  maxBisections: 80,
  /**
   * §7's « upper bound grown by doubling the slack ». 64 doublings take the slack from a
   * millionth of the chord past 10¹³ chords: a target still not bracketed there is not a target
   * a tighter cap would have caught.
   */
  maxDoublings: 64,
  /** The slack, as a fraction of the chord, that a doubling starts from when the seed is unusable. */
  seedSlackFraction: 1e-6,
  /** Iterations of the closed-form sag refinement — pure arithmetic, no solve. See {@link tensionForSag}. */
  sagRefinements: 80,
} as const;

/**
 * **Flèche à vide** — the greatest *vertical* distance from the A–B chord down to the unloaded
 * cable, in metres, and the quantity mode `sag` drives.
 *
 * Exact, not scanned: the deepest point below the chord is where the cable's tangent is parallel
 * to it, `V(s)/H = h/L`, and on the **unloaded** line `V(s) = V₀ + w·s` is affine, so that `s`
 * is closed-form. §6.1's jumps in `V(s)` would break the single-vertex assumption — a loaded
 * state has one vertex per segment — which is why this takes an unloaded state and why the
 * flèche the app drives on is the flèche *à vide*.
 *
 * Clamped into `[0, L₀]` and floored at zero: a line taut enough that the vertex falls outside
 * the span has its lowest point *at* an anchor, where the drop below the chord is nil.
 *
 * @returns the flèche `D`, m, and the horizontal position `atX`, m, of the vertex it is read at —
 *   the « (à x 74,8 m) » § 3 prints beside it. Both come off the same closed-form `s`, so the
 *   position is exact rather than an argmax over samples.
 */
export function unloadedSag(
  state: SpanState,
  span: { L: number; h: number },
): { D: number; atX: number } {
  const vertex = ((state.H * span.h) / span.L - state.V0) / state.w;
  const s = Math.min(Math.max(vertex, 0), state.L0);
  const atX = xAt(state, s);
  const drop = (span.h * atX) / span.L - zAt(state, s);
  return { D: drop > 0 ? drop : 0, atX };
}

/**
 * §7 mode 3's seed, step 1: `H ≈ w·L²/(8·D_target)` [ALGO §3], the parabolic sag relation.
 * Approximate by construction — step 2 refines it against the exact catenary
 * ({@link tensionForSag}) and the bisection then owns the answer.
 */
export function parabolicTensionForSag(span: { L: number; w: number }, D_target: number): number {
  return (span.w * span.L * span.L) / (8 * D_target);
}

/**
 * §7 mode 3's seed, step 2: « refine `H` against the exact catenary sag ». The rigid level-span
 * catenary drops `D(H) = (H/w)·(cosh(w·L/(2·H)) − 1)` below its chord, monotone **decreasing**
 * in `H`, so the refinement is a bracket-and-bisect on closed forms — **no solve runs here**.
 *
 * Rigid and level on purpose: elastic stretch and dénivelé are exactly what the outer bisection
 * over the *solved* span corrects, and a seed that tried to carry them would duplicate the
 * solver in a formula. It is a starting point for {@link bracketL0}, never an answer.
 */
export function tensionForSag(span: { L: number; w: number }, D_target: number): number {
  const sagAt = (H: number) => (H / span.w) * (Math.cosh((span.w * span.L) / (2 * H)) - 1);
  const seed = parabolicTensionForSag(span, D_target);
  let lower = seed;
  let upper = seed;
  // The exact catenary sags slightly more than the parabola, so the seed is a low `H`: grow the
  // ceiling until it under-sags, and drop the floor in the (rare) case the seed already does.
  for (let step = 0; step < PARAMETERISE.sagRefinements && sagAt(upper) > D_target; step++) {
    lower = upper;
    upper *= 2;
  }
  for (let step = 0; step < PARAMETERISE.sagRefinements && sagAt(lower) < D_target; step++) {
    upper = lower;
    lower /= 2;
  }
  for (let step = 0; step < PARAMETERISE.sagRefinements; step++) {
    const mid = (lower + upper) / 2;
    if (sagAt(mid) > D_target) lower = mid;
    else upper = mid;
  }
  return (lower + upper) / 2;
}

/**
 * §7's closed-form seed for mode 2, `[VERIFIED-NUM]` — 100.669 on `Z6` against an exact
 * 100.66984:
 *
 * ```
 * L₀ ≈ (L + w²·L³/(24·H²)) · (1 − H/EA)        (level span; parabolic arc + uniform strain)
 * ```
 *
 * Written on the **chord** rather than on `L`, which is the same expression on the level span
 * §7 states it for (`h = 0` ⇒ `chord = L`) and keeps a dénivelé from throwing the seed out by
 * `sec³θ`. It is a seed: §7's own ⚠ records that [R1 B5]'s printed formula has the elastic and
 * sag corrections inverted and yields an unphysical `L₀ < chord`, which is exactly the class of
 * error a *bracketed* bisection cannot commit.
 */
export function closedFormSeedL0(span: SpanGeometry, H: number): number {
  const chord = Math.hypot(span.L, span.h);
  const arc = chord + (span.w * span.w * chord * chord * chord) / (24 * H * H);
  return arc * (1 - H / span.EA);
}

/**
 * §5.4's floor on `L₀` for this span, m — `chord/(1 + strength/EA)`, imported from `solve.ts` and
 * **not re-derived**. The smallest admissible unstretched length: at it the line is at its
 * breaking load, which is why it is also the point every attainable bound is read off.
 */
export function tightnessFloor(span: SpanGeometry): number {
  return chordBoundFloor(span, span.strength);
}

/** The unloaded span this module solves at `L₀`, with `strength` so §5.4's pre-check runs. */
function spanAt(span: SpanGeometry, L0: number): SpanInput {
  return { L: span.L, h: span.h, L0, w: span.w, EA: span.EA, loads: [], strength: span.strength };
}

/** Tier one on the geometry itself, in `solveSpan`'s own payload shape. */
function refuseGeometry(span: SpanGeometry): SolveError | null {
  const positives: [string, number][] = [
    ["L", span.L],
    ["w", span.w],
    ["EA", span.EA],
    // Not one of § 2's four, and it has to be checked here: `solveSpan` **skips** §5.4's bound
    // when `strength` is absent or non-positive, so an unusable breaking load would silently
    // turn the one refusal this module exists to re-emit into no refusal at all.
    ["strength", span.strength],
  ];
  for (const [field, value] of positives) {
    if (!Number.isFinite(value) || value <= 0) {
      return { kind: "invalid-input", field, value, bound: 0, boundKind: "min" };
    }
  }
  if (!Number.isFinite(span.h)) {
    return { kind: "invalid-input", field: "h", value: span.h, bound: 0, boundKind: "min" };
  }
  return null;
}

/**
 * The quantity one inverse mode drives, as the bracket sees it. Three modes, one loop: §7 states
 * mode 3 as « seed `H`, refine, **then mode 2** », and this is where that reuse lands — with the
 * one deviation the elastic catenary forces, recorded on {@link resolveL0}.
 */
type Driver = {
  /** The field a §5.4 refusal is re-emitted in. */
  field: "H_target" | "T_target" | "D_target";
  /** The value asked for, in that field's own quantity. */
  target: number;
  /** Reads the driving quantity off a solved unloaded span. */
  read: (state: SpanState) => number;
  /** `true` when the quantity **falls** as `L₀` grows from the floor: tension does, flèche does not. */
  falling: boolean;
  /**
   * `true` when the quantity turns back up past a minimum on a very slack line, so only the taut
   * branch — floor to minimum — is monotone. §7 proves monotonicity for `H` alone; an anchor
   * tension `√(H² + V²)` keeps the weight of every metre added, and rises again once `H` has
   * little left to lose.
   */
  turns: boolean;
  /** Which side of the attainable range the §5.4 floor sits on. */
  boundKind: "min" | "max";
  /** §7's closed-form seed for the far end of the bracket, m. */
  seed: number;
};

/** The field each inverse mode's target is refused and re-emitted in. */
const TARGET_FIELD = {
  tension: "H_target",
  anchor: "T_target",
  sag: "D_target",
} as const satisfies Record<InverseSpec["mode"], Driver["field"]>;

/** The value an inverse spec asks for, in its own field's quantity. */
function targetOf(spec: InverseSpec): number {
  if (spec.mode === "tension") return spec.H_target;
  if (spec.mode === "anchor") return spec.T_target;
  return spec.D_target;
}

/** The {@link Driver} of a spec whose target tier one has already accepted. */
function driverOf(spec: InverseSpec, span: SpanGeometry): Driver {
  const target = targetOf(spec);
  if (spec.mode === "tension") {
    return {
      field: "H_target",
      target,
      read: (state) => state.H,
      falling: true,
      turns: false,
      boundKind: "max",
      seed: closedFormSeedL0(span, target),
    };
  }
  if (spec.mode === "anchor") {
    return {
      field: "T_target",
      target,
      read: spec.side === "A" ? (state) => state.TA : (state) => state.TB,
      falling: true,
      turns: true,
      boundKind: "max",
      // `T ≥ H` at either anchor, so the length that would give `H` the target is tighter than
      // the answer: the seed starts the growth on the taut side of it.
      seed: closedFormSeedL0(span, target),
    };
  }
  return {
    field: "D_target",
    target,
    read: (state) => unloadedSag(state, span).D,
    falling: false,
    turns: false,
    boundKind: "min",
    seed: closedFormSeedL0(span, tensionForSag(span, target)),
  };
}

/** A bracket failure — « Cible inatteignable ». Never a `slack-limit`; see {@link solveAt}. */
function unreachable(attempts: number, residual: number): SolveError {
  return { kind: "no-convergence", attempts, residual };
}

/**
 * Solve the unloaded span at `L₀`, or say why the inversion cannot continue.
 *
 * Every failure from inside a bracket is **normalised to `no-convergence`** except tier one and
 * the §5.4 refusal: § 7 binds the *kind* to the banner, so a `slack-limit` escaping this module
 * would render « Calcul impossible » where the taxonomy says « Cible inatteignable ». A
 * `no-convergence` keeps its own `attempts` and `residual` — they are the real ones; a
 * `slack-limit` becomes one attempt at the `L₀`, in metres, the line lay down at, which is the
 * only diagnostic that failure leaves behind that an inverse mode can use.
 */
function solveAt(
  span: SpanGeometry,
  L0: number,
  warmStart: { H: number; V0: number } | undefined,
): Result<SpanState, SolveError> {
  const solved = solveSpan(spanAt(span, L0), warmStart);
  if (solved.ok) return { ok: true, value: solved.state };
  if (solved.error.kind === "invalid-input") return { ok: false, error: solved.error };
  if (solved.error.kind === "no-convergence") return { ok: false, error: solved.error };
  return { ok: false, error: unreachable(1, L0) };
}

/**
 * §7's bracket: **lower bound the §5.4 floor, upper bound grown by doubling the slack** until the
 * driving quantity passes the target — or, for a driver that {@link Driver.turns}, until it reads
 * higher than at the length before, which puts its minimum behind the growth ({@link tautBranch}).
 *
 * §7 writes the lower bound as `L₀ = chord`. The floor is where it actually sits: `chord` is
 * itself below §5.4's `chord/(1 + T_break/EA)`, so a bisection anchored there would ask
 * `solveSpan` for a line that has already broken and get the refusal instead of a bound. The
 * floor is the same end of the same interval, moved to the last admissible point — and it is the
 * point every attainable bound is read from.
 *
 * @param atFloor the span solved at the floor, which the caller has already needed to decide
 *   whether the target is reachable at all.
 */
function bracketL0(
  span: SpanGeometry,
  driver: Driver,
  floor: number,
  atFloor: SpanState,
): Result<Bracket, SolveError> {
  const chord = Math.hypot(span.L, span.h);
  const minimumSlack = chord * PARAMETERISE.seedSlackFraction;
  let upper =
    Number.isFinite(driver.seed) && driver.seed > floor ? driver.seed : floor + minimumSlack;
  let warm: SpanState = atFloor;
  // The two lengths the growth passed last: once a turning driver reads higher than at `previous`,
  // its minimum lies between `before` and the length just solved.
  let before = floor;
  let previous = { L0: floor, value: driver.read(atFloor) };

  for (let doubling = 0; doubling <= PARAMETERISE.maxDoublings; doubling++) {
    const solved = solveAt(span, upper, warm);
    if (!solved.ok) return { ok: false, error: solved.error };
    warm = solved.value;
    const value = driver.read(solved.value);
    const past = driver.falling ? value <= driver.target : value >= driver.target;
    if (past) return { ok: true, value: { lower: floor, upper } };
    if (driver.turns && value > previous.value) {
      return tautBranch(span, driver, floor, { lower: before, upper }, warm);
    }
    before = previous.L0;
    previous = { L0: upper, value };
    upper = chord + 2 * Math.max(upper - chord, minimumSlack);
  }
  return { ok: false, error: unreachable(PARAMETERISE.maxDoublings, upper - floor) };
}

/** `(√5 − 1)/2` — the interval a golden-section search keeps per step. Arithmetic, not physics. */
const GOLDEN_SECTION = (Math.sqrt(5) - 1) / 2;

/**
 * The taut branch of a driver that turns: a golden-section search for its minimum inside
 * `around`, which holds it, stopping at the first length that already reads at or under the
 * target. Between the floor and that length the quantity crosses the target exactly once — on the
 * taut branch, whichever side of the minimum the length itself fell — so the two close the
 * bracket the bisection then runs on.
 *
 * A target under the minimum is attainable at no length: no-convergence, « Cible inatteignable »,
 * and no bound, since nothing about the line is wrong — only the target is. Its `residual` is how
 * far above the target the least value found stays, in the driving quantity.
 */
function tautBranch(
  span: SpanGeometry,
  driver: Driver,
  floor: number,
  around: Bracket,
  warmStart: SpanState,
): Result<Bracket, SolveError> {
  let warm = warmStart;
  const read = (L0: number): Result<number, SolveError> => {
    const solved = solveAt(span, L0, warm);
    if (!solved.ok) return solved;
    warm = solved.value;
    return { ok: true, value: driver.read(solved.value) };
  };

  let { lower, upper } = around;
  let near = upper - GOLDEN_SECTION * (upper - lower);
  let far = lower + GOLDEN_SECTION * (upper - lower);
  let atNear = read(near);
  if (!atNear.ok) return atNear;
  let atFar = read(far);
  if (!atFar.ok) return atFar;

  for (let step = 0; step < PARAMETERISE.maxBisections; step++) {
    if (atNear.value <= driver.target) return { ok: true, value: { lower: floor, upper: near } };
    if (atFar.value <= driver.target) return { ok: true, value: { lower: floor, upper: far } };
    if (upper - lower <= PARAMETERISE.bracketTolerance * upper) break;
    if (atNear.value < atFar.value) {
      upper = far;
      far = near;
      atFar = atNear;
      near = upper - GOLDEN_SECTION * (upper - lower);
      atNear = read(near);
      if (!atNear.ok) return atNear;
    } else {
      lower = near;
      near = far;
      atNear = atFar;
      far = lower + GOLDEN_SECTION * (upper - lower);
      atFar = read(far);
      if (!atFar.ok) return atFar;
    }
  }
  const least = Math.min(atNear.value, atFar.value);
  return { ok: false, error: unreachable(PARAMETERISE.maxBisections, least - driver.target) };
}

/** Bisection on the monotone driver, warm-started from the previous midpoint. */
function bisect(
  span: SpanGeometry,
  driver: Driver,
  bracket: Bracket,
  atFloor: SpanState,
): Result<number, SolveError> {
  let { lower, upper } = bracket;
  let warm: SpanState = atFloor;
  for (let step = 0; step < PARAMETERISE.maxBisections; step++) {
    if (upper - lower <= PARAMETERISE.bracketTolerance * upper) break;
    const mid = (lower + upper) / 2;
    const solved = solveAt(span, mid, warm);
    if (!solved.ok) return { ok: false, error: solved.error };
    warm = solved.value;
    const value = driver.read(solved.value);
    // `falling`: the quantity is above the target on the `lower` side, so a midpoint still above
    // it moves `lower` up. Rising reads the same sentence with the inequality turned round.
    if (driver.falling ? value > driver.target : value < driver.target) lower = mid;
    else upper = mid;
  }
  return { ok: true, value: (lower + upper) / 2 };
}

/** Everything an inversion needs before it can bracket: the floor, the span at it, the driver. */
type Inversion = { floor: number; atFloor: SpanState; driver: Driver };

/**
 * Tier one, the §5.4 floor, the span solved at it, and the rupture refusal — the part of an
 * inversion that runs before a bracket exists, shared so that {@link tightnessBracket} and
 * {@link resolveL0} cannot disagree about where the interval starts.
 */
function prepare(spec: InverseSpec, span: SpanGeometry): Result<Inversion, SolveError> {
  const geometry = refuseGeometry(span);
  if (geometry) return { ok: false, error: geometry };

  const target = targetOf(spec);
  const field = TARGET_FIELD[spec.mode];
  if (!Number.isFinite(target) || target <= 0) {
    return {
      ok: false,
      error: { kind: "invalid-input", field, value: target, bound: 0, boundKind: "min" },
    };
  }

  const floor = tightnessFloor(span);
  const solvedFloor = solveAt(span, floor, undefined);
  if (!solvedFloor.ok) return { ok: false, error: solvedFloor.error };
  const atFloor = solvedFloor.value;

  const driver = driverOf(spec, span);

  // The floor's own value **is** the attainable bound — the most tension, the least flèche, any
  // admissible line on this span can carry. Past it the line breaks, so the refusal is §5.4's,
  // re-emitted in the quantity the user is editing.
  const extreme = driver.read(atFloor);
  const beyond = driver.falling ? target > extreme : target < extreme;
  if (beyond) {
    return {
      ok: false,
      error: {
        kind: "invalid-input",
        field: driver.field,
        value: target,
        bound: extreme,
        boundKind: driver.boundKind,
      },
    };
  }

  return { ok: true, value: { floor, atFloor, driver } };
}

/**
 * The interval §7's bisection runs on for one target — the §5.4 floor, and the doubled slack the
 * driving quantity first passes the target at.
 *
 * A named export because §15's `Z6` states its seed (**100.669**) separately from its answer
 * (**100.66984**), and « the seed is valid » is a claim about *this* interval containing it —
 * `resolveL0`'s return value cannot make it. Mode `length` has no bracket, which is why the
 * parameter excludes it rather than returning a refusal for it.
 */
export function tightnessBracket(
  spec: InverseSpec,
  span: SpanGeometry,
): Result<Bracket, SolveError> {
  const inversion = prepare(spec, span);
  if (!inversion.ok) return { ok: false, error: inversion.error };
  const { floor, atFloor, driver } = inversion.value;
  return bracketL0(span, driver, floor, atFloor);
}

/**
 * §7's input modes, all resolved to `L₀` **above** the solver — the engine's one inverse entry
 * point, and the reason there is no `solveForTension` beside `solveSpan`.
 *
 * - **Mode `length`** runs no inversion. It still runs §5.4's floor: the bound is violable in
 *   every mode, and this is the one that re-emits it as `field: "L0"` unchanged.
 * - **Mode `tension`** is §7 mode 2 — `H(L₀) = H_target` by bisection, safe because `H` is
 *   **strictly monotone decreasing in `L₀`** (`[VERIFIED-NUM]` on `Z6`'s bracket).
 * - **Mode `anchor`** is §7 mode 2's anchor `T_target` — `T_A(L₀)` or `T_B(L₀)` equal to the
 *   target. Not monotone: it falls from the floor, bottoms out on a very slack line and rises
 *   again, so the bisection runs on the **taut branch** only ({@link tautBranch}), and a target
 *   under its minimum is « Cible inatteignable ».
 * - **Mode `sag`** is §7 mode 3 — seed `H ≈ w·L²/(8·D_target)`, refine it against the exact
 *   catenary sag, then mode 2. **One deviation, and it is deliberate**: mode 2 is reused for its
 *   *bracket and bisection*, run on the flèche itself rather than on the `H` the seed produced.
 *   An `H`-exact answer is not a `D`-exact answer once the cable stretches and the chord tilts,
 *   and § 3 makes flèche the shipped driver whose displayed value has to be exact — 1 decimal of
 *   drift there costs 0,20 m of garde. The seed's `H` still positions the far end of the bracket,
 *   which is what §7 uses it for; the flèche is monotone **increasing** in `L₀`, so the same loop
 *   reads with one inequality turned round.
 *
 * Refusals, and the two surfaces they map to (« voir § 7 — validation et états d'erreur »):
 *
 * - A target beyond what the §5.4 floor can reach is `invalid-input` **in the driving field**,
 *   carrying the attainable bound — « Tension impossible ». The bound is the floor mapped forward
 *   through this same inversion, so it is stated in the user's own quantity and **never twice**.
 * - Any other bracket failure is `no-convergence` — « Cible inatteignable », which the caller
 *   names the target in, since it is the caller that holds the {@link TightnessSpec}.
 * - Tier one on the geometry passes through untouched: `field: "L"`, `"w"`, `"EA"`, `"h"` or
 *   `"strength"` is a statement about the span, not about the target.
 */
export function resolveL0(spec: TightnessSpec, span: SpanGeometry): Result<number, SolveError> {
  if (spec.mode === "length") {
    const geometry = refuseGeometry(span);
    if (geometry) return { ok: false, error: geometry };
    const floor = tightnessFloor(span);
    if (!Number.isFinite(spec.L0) || spec.L0 <= 0) {
      return {
        ok: false,
        error: { kind: "invalid-input", field: "L0", value: spec.L0, bound: 0, boundKind: "min" },
      };
    }
    if (spec.L0 < floor) {
      return {
        ok: false,
        error: {
          kind: "invalid-input",
          field: "L0",
          value: spec.L0,
          bound: floor,
          boundKind: "min",
        },
      };
    }
    return { ok: true, value: spec.L0 };
  }

  const inversion = prepare(spec, span);
  if (!inversion.ok) return { ok: false, error: inversion.error };
  const { floor, atFloor, driver } = inversion.value;

  const bracket = bracketL0(span, driver, floor, atFloor);
  if (!bracket.ok) return { ok: false, error: bracket.error };
  return bisect(span, driver, bracket.value, atFloor);
}
