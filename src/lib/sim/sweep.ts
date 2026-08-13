/**
 * §6.2's rolling rider — `docs/simulation-theory.md` §6.2 (the material sweep variable, its
 * kinematic chain and the four-step trajectory algorithm), §6.1 (the per-step statics), §4.1 (the
 * geometry the step records) and §2 (frame, signs, units). Underlying reference reports:
 * `docs/references/simulation tyrolienne.md` (rider dynamics, numerical algorithms) and
 * `algo simulation tyrolienne.md` §10 — but **no value is transcribed from either**: §14 records
 * which of their worked examples are fabricated, and §15 is the only fixture source.
 *
 * Rules this module exists to keep:
 *
 * - **`SWEEP_STEPS = 240` names the *uniform* steps only, and the grid is 260 long.** Ten
 *   geometric tail steps per end, endpoints excluded — « voir § 2 — le contrat du moteur ». 260 is
 *   the **coverage denominator everywhere in the app**; ticket 08's « 240 / 240 » copy was wrong,
 *   and a fully solved sweep printed against 240 would read « 260 / 240 ».
 * - **The grid is a pure function of `(L₀, n)`.** A step array that depends on the results is one
 *   you cannot fixture, so nothing here reads a solve before laying the grid out.
 * - **Do not raise `steps` or `samplesPerStep`.** 240 is confirmed by measurement, not inherited:
 *   it costs the same as 100 inside Chromium's ~0,1 ms clock clamp and buys 2,4× the resolution,
 *   while the clearance reducer — the larger half of the frame budget — scales with their
 *   *product*. The fidelity on offer above 240 was measured at ≈ 5 mm. The tripwire is
 *   **`260 × 60`**: re-run the bench if anything raises it.
 * - **A partial sweep carries `coverage` so a green verdict cannot lie.** Failure is a value: a
 *   sweep that loses step 137 keeps the other 259 and records where the hole is. `coverage < 1`
 *   **suppresses** the verdict downstream; it never qualifies it, because the steps that failed
 *   are the ill-conditioned ones and a verdict on the solved fraction is biased optimistic by
 *   construction.
 * - **The engine is synchronous and pure forever.** Async lives only in the `useSweep` seam, which
 *   exists for stale-while-recomputing and stays even though there is no worker.
 * - **The engine is dependency-free and SI** — `m`, `N`, `N/m`, `rad`; `s` is the unstretched
 *   material coordinate from A, `z` is positive up, and `V₀ < 0` on a sagging span.
 */

import type { CableShape } from "./catenary.ts";
import type { Iterate } from "./solve.ts";
import type {
  SolveError,
  SolveNote,
  SpanInput,
  SpanState,
  SweepResult,
  SweepStep,
} from "./types.ts";

import { inSOrder, verticalTensionAt } from "./catenary.ts";
import { loadNode, solveAtMaterialPosition } from "./loads.ts";

/**
 * § 2's « The sweep grid, and why the denominator is 260 », quoted. Named and exported for the
 * same reason `SOLVER` and `POINT_LOAD` are: § 11 requires the grid to be assertable without
 * inferring it from a length.
 *
 * `SAMPLES_PER_STEP = 60` is deliberately **not** here — it is `evaluateClearance`'s default and
 * belongs to `clearance.ts`. The guard rail is the product of the two, `260 × 60`.
 */
export const SWEEP = {
  /**
   * §6.2's « ~100–500 steps », resolved to **240 uniform** steps by measurement rather than
   * inherited: 240 and 100 cost the same inside Chromium's clock clamp, and 500 also passes the
   * 8 ms criterion, so there is no reason to spend the margin either way.
   */
  steps: 240,
  /** §6.2's « refine near ends », per end — where `θ` and `T_A` change fastest. */
  tailSteps: 10,
  /** The band each tail refines: the outer 2 % of `L₀` at each end. */
  tailFraction: 0.02,
} as const;

/** `sweepGrid`'s two structural arguments; a non-integer one is a caller bug, not a bad line. */
function requireInteger(name: string, value: number, floor: number): void {
  if (!Number.isInteger(value) || value < floor) {
    throw new RangeError(`sweepGrid: ${name} must be an integer ≥ ${floor}, got ${value}`);
  }
}

/**
 * §6.2 step 1 — « grid `s_D` over `(0, L₀)` (uniform in `s_D`), refine near ends », laid out
 * exactly as the §15-verified prototype solver laid it out, because the 260 count, the first-run
 * figures and the whole performance table were measured on it.
 *
 * ```
 *  s_D = 0                                                                    s_D = L₀
 *    ╷ ·· · ·  ·   ·    ·     |    ·    ·    ·    ·    ·    ·    |     ·    ·  · ··╷
 *    ╷ └─────────────────┘    └──────────────────────────────────┘   └────────────┘
 *    ╷   10 tail steps            240 uniform inner steps            10 tail steps
 *    ╷   in 0 … 0,02·L₀           i·L₀/241, i = 1…240               in 0,98·L₀ … L₀
 * ```
 *
 * **Endpoints are excluded** — `s_D = 0` is the rider standing on the platform, not a state worth
 * a slider stop — which is why the uniform steps divide by `n + 1` rather than by `n`, and why the
 * tails approach each anchor geometrically without ever reaching it.
 *
 * The tails **refine** the outer 2 % rather than replacing it: the first uniform step already sits
 * at `L₀/241 ≈ 0,4 %`, so head and tail interleave, and the returned array is one sorted grid
 * rather than three concatenated bands.
 *
 * @param L0 the unstretched cable length, m — the grid scales with it and reads nothing else.
 * @param n the **uniform** step count; `grid.length` is `n + 2·tailSteps`, 260 at the defaults.
 * @param tailSteps the geometric steps per end; `0` gives the plain uniform grid.
 * @throws RangeError when `n` or `tailSteps` is not an integer in range — a caller bug, not a
 *   physics failure, and therefore a throw rather than a `SolveError`, exactly as `sampleCable`'s
 *   `n` is.
 */
export function sweepGrid(
  L0: number,
  n: number = SWEEP.steps,
  tailSteps: number = SWEEP.tailSteps,
): Float64Array {
  requireInteger("n", n, 1);
  requireInteger("tailSteps", tailSteps, 0);

  const grid = new Float64Array(n + 2 * tailSteps);
  let at = 0;
  for (let i = 1; i <= n; i++) grid[at++] = (L0 * i) / (n + 1);
  const tail = SWEEP.tailFraction * L0;
  for (let i = 1; i <= tailSteps; i++) {
    // Geometric, densest at the anchor: the outermost step is at `0,02·L₀·2^−(tailSteps−1)`, the
    // innermost at the band's own edge.
    const offset = tail * 2 ** -(tailSteps - i);
    grid[at++] = offset;
    grid[at++] = L0 - offset;
  }
  return grid.sort();
}

/**
 * §6.2's kinematic chain, third link: `σ_D(s_D) = s_D + (1/EA)·∫₀^{s_D} T(s) ds` — the **stretched
 * arc position** of a zero-slip rolling trolley.
 *
 * Closed form rather than quadrature. With `V(s) = V₀ + w·s` on a segment,
 * `∫√(H² + V²) ds = [V·T/2 + (H²/2)·asinh(V/H)] / w`, and §6.1's point loads split the integral at
 * each node — `H` is constant across a node, only `V` jumps.
 *
 * This is what makes `s_D ≠ x_D` concrete on §15's `Z5` (60,20 against 60,15 against 59,96, ≈0,3 %)
 * and therefore **why `s_D` never appears in the UI**: three coordinates of one trolley, close
 * enough that quoting the wrong one looks right. A named module export because §15 requires the
 * test to reach it directly; it is not re-exported from `index.ts`.
 *
 * @param shape the solved cable — a `SpanState` satisfies it, loads included.
 * @param s the unstretched material coordinate to measure to, m.
 * @returns the stretched arc length from A to `s`, m.
 */
export function stretchedArcPosition(shape: CableShape, s: number): number {
  const { H, V0, w, EA } = shape;
  /** The antiderivative of `T` in `V`, so a segment costs one evaluation at each end. */
  const primitive = (V: number) => (V * Math.hypot(H, V)) / 2 + ((H * H) / 2) * Math.asinh(V / H);

  // `from` is `V` at the start of the current segment, `at` is where that segment starts.
  let integral = 0;
  let from = V0;
  let at = 0;
  for (const load of inSOrder(shape.loads ?? [])) {
    if (load.s >= s) break;
    const below = from + w * (load.s - at);
    integral += primitive(below) - primitive(from);
    // Across the node only the vertical component jumps — by `P`, and `H` is continuous.
    from = below + load.P;
    at = load.s;
  }
  integral += primitive(from + w * (s - at)) - primitive(from);
  return s + integral / (w * EA);
}

/** §6.2 step 3's record, assembled from one solved state — the seven quantities, no more. */
function toSweepStep(state: SpanState, sD: number): SweepStep {
  const node = loadNode(state, sD);
  return {
    sD,
    xD: node.x,
    zD: node.z,
    H: state.H,
    V0: state.V0,
    TA: state.TA,
    TB: state.TB,
    // §4.1 gives `dz/dx = V/H` pointwise, so the slope at the node is `atan(V/H)`. Read on the
    // **below** side, like `loadNode`'s own `x` and `z`: a trolley sits on a kink, the slope is
    // discontinuous across it, and the two sides differ by the rider's own load. Below is the
    // side the prototype's `riderNode` measured on, and every number in § 2's performance and
    // first-run tables was taken there.
    theta: Math.atan2(verticalTensionAt(state, sD), state.H),
  };
}

/** One step of the march: §6.1's fixed-node solve, plus §6.2 step 3's record of it. */
export type SweepStepResult =
  | { ok: true; step: SweepStep; state: SpanState; notes: SolveNote[] }
  | { ok: false; error: SolveError };

/**
 * §6.2 step 2 and 3 for a single trolley position — the per-step solve the march runs 260 times,
 * and a named module export because §15's `Z5` is a *step*, not a whole sweep.
 *
 * @param riderP the rider's design load, N, downward.
 * @param sD the trolley's unstretched material coordinate, m — §6.2's primary sweep variable.
 * @param warmStart the previous step's `(H, V₀)`; Newton then converges in 1–3 iterations. It is
 *   tried **ahead of** §5.2's seeds rather than instead of them, so a bad warm start costs an
 *   attempt and never an answer — which is what lets the march keep going after a hole.
 */
export function sweepStep(
  input: SpanInput,
  riderP: number,
  sD: number,
  warmStart?: Iterate,
): SweepStepResult {
  const result = solveAtMaterialPosition(input, riderP, sD, warmStart);
  if (!result.ok) return result;
  return {
    ok: true,
    step: toSweepStep(result.state, sD),
    state: result.state,
    notes: result.notes,
  };
}

/**
 * §6.2's trajectory algorithm, whole: lay the grid, march it in order warm-starting each solve
 * from the last, and record `(s_D, x_D, z_D, H, V₀, T_A, T_B, θ)` per step.
 *
 * The traverse is **precomputed**, not solved on demand: §11's clearance minimum is global over
 * rider positions, §10's verdict needs the worst tension over the traverse, and §6.2's warm start
 * is inherently sequential — solving per slider frame would pay a cold start per frame *and* still
 * precompute the traverse for the verdict. The slider is an index lookup into `steps`.
 *
 * A failed step is **recorded and skipped**, never thrown: the other 259 are still wanted, and so
 * is the location of the hole. The next step then solves **cold** — a warm start taken from a
 * failure is not a warm start — and `coverage` divides by `grid.length`, so the denominator is the
 * traverse that was asked for rather than the fraction that answered.
 *
 * @param input the span **without** a rider: `input.loads` must be `[]`, since `riderP` is the
 *   rider this function places.
 * @param riderP the rider's design load, N, downward.
 * @param n the uniform step count; `grid.length` is `n + 20`, 260 at the default.
 * @throws RangeError when `input.loads` is not empty — a caller bug of the same class as
 *   `sampleCable`'s `n`: a span arriving with a rider already on it would silently sweep a
 *   two-rider line, and every downstream denominator would be measuring something else.
 */
export function sweep(input: SpanInput, riderP: number, n: number = SWEEP.steps): SweepResult {
  if (input.loads.length !== 0) {
    throw new RangeError(`sweep: input.loads must be [], got ${input.loads.length} load(s)`);
  }

  const grid = sweepGrid(input.L0, n);
  const steps: SweepStep[] = [];
  const failures: SweepResult["failures"] = [];
  let warmStart: Iterate | undefined;

  for (let i = 0; i < grid.length; i++) {
    const sD = grid[i];
    const result = sweepStep(input, riderP, sD, warmStart);
    if (!result.ok) {
      failures.push({ index: i, sD, error: result.error });
      warmStart = undefined;
      continue;
    }
    steps.push(result.step);
    warmStart = { H: result.step.H, V0: result.step.V0 };
  }

  return { grid, steps, failures, coverage: steps.length / grid.length };
}
