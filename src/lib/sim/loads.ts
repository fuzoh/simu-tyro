/**
 * §6.1's point load — `docs/simulation-theory.md` §6.1 (the two-segment system, its two cases and
 * their unknowns), §6.2 (why the material coordinate is the primary variable), §2 (frame, signs,
 * units) and §5.3 (the tolerance the outer loop reads its own target at). Underlying reference
 * reports: `docs/references/simulation tyrolienne.md` and `algo simulation tyrolienne.md` §5 — but
 * **no value is transcribed from either**: §14 records which of their worked examples are
 * fabricated, and §15 is the only fixture source. §15's C11 paragraph is why this module has a
 * test asserting a formula it must **not** reproduce.
 *
 * Rules this module exists to keep:
 *
 * - **The piecewise `V(s)` is integrated in `catenary.ts`, not here.** §6.1's
 *   `V(s) = V₀ + w·s + Σ P·𝟙[s > s_P]` is evaluated by `xAt` / `zAt` / `jacobianAt`, because
 *   `sampleCable` takes a `SpanState` and a loaded state must be samplable on its own — and
 *   `catenary.ts` importing this file would be a cycle. What lives here is the **statics**: where
 *   the rider goes, and what `(H, V₀)` results.
 * - **`solveAtHorizontalPosition` is separate, not a mode of `solveSpan`** — « voir § 2 — le
 *   contrat du moteur ». §6.1 case 2 is a different problem (extra unknown `s_P`, extra equation
 *   `x(s_P) = x_D`), resolved by outer 1-D bisection on the **monotone** `s_P` with `solveSpan` in
 *   the loop. §6.1 offers a 3×3 Newton as the alternative and calls the bisection « monotone,
 *   robust »; a bisection also cannot report a spurious convergence, which matters because this is
 *   the path a **typed** rider position takes.
 * - **It is the exact solve, not a snap-and-rewrite.** A typed `x_D` is the one input with real
 *   precision behind it, and rewriting the user's number to the nearest grid step is the thing
 *   this function exists to avoid. Pointer input snaps instead: at 1500 m one pixel is ≈ 1,2 m, so
 *   there is no precision there to preserve.
 * - **Failure is a value, never a throw** — every refusal leaves as a `SolveError`, and an inner
 *   solve's refusal (§5.4's chord bound above all) is returned **unchanged**, bound included.
 * - **The engine is dependency-free and SI** — `m`, `N`, `N/m`; `s` is the unstretched material
 *   coordinate from A, `z` is positive up, `V₀ < 0` on a sagging span, and `P > 0` is downward.
 */

import type { CableShape } from "./catenary.ts";
import type { Iterate } from "./solve.ts";
import type { SolveError, SolveResult, SpanInput, SpanState } from "./types.ts";

import { xAt, zAt } from "./catenary.ts";
import { residualTolerance, solveSpan } from "./solve.ts";

/**
 * §6.1 case 2's one constant. Named and exported for the same reason `SOLVER` is: § 11 requires
 * the budget to be assertable without inferring it from a timing.
 */
export const POINT_LOAD = {
  /**
   * How many times the outer bisection may halve `[0, L₀]`. 60 halvings take a 1500 m bracket to
   * ≈10⁻¹⁵ m — below the double's own grain at that magnitude — so the budget is never what stops
   * the loop: §5.3's tolerance is, or the bracket collapsing onto the root.
   */
  maxBisections: 60,
} as const;

/**
 * §6.1's node outputs: `x_D = x(s_P)`, `z_D = z(s_P)` — the rider trajectory point, and §6.2 step
 * 3's first two recorded quantities.
 *
 * Evaluated on the **below** side of the node (§6.1's `𝟙[s > s_P]` excludes `s = s_P`), which is
 * immaterial: `x` and `z` are continuous through the kink, only their slope is not. The `s` is a
 * parameter rather than read off `state.loads`, because a state with `n` loads has `n` nodes and
 * the caller is the one that knows which one it is asking about.
 */
export function loadNode(state: SpanState, s: number): { x: number; z: number } {
  const shape: CableShape = state;
  return { x: xAt(shape, s), z: zAt(shape, s) };
}

/**
 * §6.1 case 1 — « `s_P` given (the natural case, §6.2) »: the rider is placed at a material
 * coordinate and the unknowns stay `(H, V₀)`. One `solveSpan`, one Jacobian assembler, one
 * convergence path; the load list is composed, so an already-loaded input gains a rider rather
 * than losing its own (§6.1's `n` loads).
 *
 * This is §6.2's per-step solve and case 2's inner solve, which is why it is a named export
 * rather than a closure: the sweep marches over it with a `warmStart` and Newton then converges
 * in 1–3 iterations.
 *
 * @param P the rider's load, N, downward.
 * @param sP the rider's unstretched material coordinate, m — §6.2's primary sweep variable.
 * @param warmStart the previous step's `(H, V₀)`, tried ahead of §5.2's seeds.
 */
export function solveAtMaterialPosition(
  input: SpanInput,
  P: number,
  sP: number,
  warmStart?: Iterate,
): SolveResult {
  return solveSpan({ ...input, loads: [...input.loads, { P, s: sP }] }, warmStart);
}

/**
 * Tier one for the two arguments `solveSpan` cannot see. Everything about the span itself — `L`,
 * `L₀`, `w`, `EA`, `h` and §5.4's chord bound — stays the inner solve's own refusal, quoted
 * verbatim, so there is exactly one place each of those bounds is written down.
 */
function refuse(input: SpanInput, P: number, xTarget: number): SolveError | null {
  // `P` is the only quantity here no solver-side check would ever name: a NaN load poisons the
  // residual, and a negative one is an upward pull this engine has no case for.
  if (!Number.isFinite(P) || P < 0) {
    return { kind: "invalid-input", field: "P", value: P, bound: 0, boundKind: "min" };
  }
  // `x_D` can only be judged against a span that is itself a number. When it is not, the inner
  // solve names the span's own culprit — which is the field the user can act on.
  if (Number.isFinite(input.L) && input.L > 0) {
    // The **closed** span `0 ≤ x_D ≤ L` — § 3's own hard range for the field. `x_D` is a view
    // parameter that the app clamps into `[0, L]` on every path (geometry change, link arrival,
    // typed input) and announces with a transient note, so a value sitting *on* its bound is a
    // legal state that must still draw. §6.2's endpoint-excluded grid is about sweep stops, not
    // about the legal range of a typed viewpoint. A non-finite `x_D` fails `>= 0` and lands here.
    if (!(xTarget >= 0)) {
      return { kind: "invalid-input", field: "xD", value: xTarget, bound: 0, boundKind: "min" };
    }
    if (!(xTarget <= input.L)) {
      return {
        kind: "invalid-input",
        field: "xD",
        value: xTarget,
        bound: input.L,
        boundKind: "max",
      };
    }
  }
  return null;
}

/**
 * §6.1 case 2 — « `x_D` given (UI convenience) »: add the unknown `s_P` and the equation
 * `x(s_P) = x_D`, resolved as §6.1's outer 1-D bisection on `s_P` around case 1's 2×2 Newton.
 *
 * `x(s_P)` is strictly increasing in `s_P` — `dx/ds = H/EA + H/T > 0` pointwise, and moving the
 * rider along the cable moves its node down-span — so the bracket `[0, L₀]` always contains the
 * root of `x(s_P) − x_D` for `x_D ∈ [0, L]`, endpoints included: `x(0) = 0` and `x(L₀) = L` are the
 * anchor conditions the inner solve closes to, so the two bounds are roots, not misses. The loop
 * stops on §5.3's own metre tolerance (the same bar the inner solve closes the anchors to) or on the
 * bracket collapsing onto the root, whichever comes first; {@link POINT_LOAD.maxBisections} is a
 * backstop, not the exit.
 *
 * Each inner solve is **warm-started from the previous one**, which is what makes the whole loop
 * one solve's worth of work rather than thirty.
 *
 * Two things about the returned state, neither of them arbitrary:
 *
 * - `state.loads` carries the rider it placed, so `s_P` is read back from it — the state stays
 *   self-sufficient for sampling, kink included.
 * - `iterations` is the **total** Newton iterations the bisection spent, not the last inner
 *   solve's; the `[ Copier le diagnostic ]` payload should not under-report a loop by 30×. The
 *   notes are the last inner solve's, because they describe the state being returned.
 */
export function solveAtHorizontalPosition(
  input: SpanInput,
  P: number,
  xTarget: number,
): SolveResult {
  const refusal = refuse(input, P, xTarget);
  if (refusal) return { ok: false, error: refusal };

  const tol = residualTolerance(input.L);
  let lo = 0;
  let hi = input.L0;
  let sP = (lo + hi) / 2;

  const first = solveAtMaterialPosition(input, P, sP);
  if (!first.ok) return first;
  let solved = { state: first.state, notes: first.notes };
  let iterations = first.state.iterations;
  let x = loadNode(first.state, sP).x;

  for (let i = 1; i < POINT_LOAD.maxBisections && Math.abs(x - xTarget) > tol; i++) {
    if (x < xTarget) lo = sP;
    else hi = sP;
    const next = (lo + hi) / 2;
    // The bracket has collapsed onto the root: another halving returns the same `s_P`, so the
    // remaining budget cannot improve the answer.
    if (next === sP) break;
    sP = next;

    const inner = solveAtMaterialPosition(input, P, sP, {
      H: solved.state.H,
      V0: solved.state.V0,
    });
    if (!inner.ok) return inner;
    solved = { state: inner.state, notes: inner.notes };
    iterations += inner.state.iterations;
    x = loadNode(inner.state, sP).x;
  }

  return { ok: true, state: { ...solved.state, iterations }, notes: solved.notes };
}
