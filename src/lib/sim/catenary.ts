/**
 * §4.1's forward geometry — `docs/simulation-theory.md` §4.1 (Irvine elastic catenary, governing
 * equations), §2 (frame, signs, units), §2.1 (the convention trap this file exists to avoid) and
 * §6.1 (the piecewise `V(s)` a point load creates). Underlying reference reports:
 * `docs/references/simulation tyrolienne.md` (statics of the unloaded line, numerics) and
 * `docs/references/algo simulation tyrolienne.md` §4–§5 — but **no value is transcribed from
 * either**: §14 records which of their worked examples are fabricated, and §15 is the only
 * fixture source.
 *
 * This module is **pure, analytic and solver-free**: given `(H, V₀)` it evaluates the cable, it
 * never finds them. `solve.ts` owns Newton, `jacobian.ts` owns §4.2's partials.
 *
 * Rules this module exists to keep:
 *
 * - **§4.1's internally consistent form, not the printed one.** §2.1: the `z(s)` as printed in
 *   the reference reports mixes two sign conventions — its transcendental part uses
 *   `V(s) = V₀ + w·s` while its elastic term `(w·s/EA)(V₀/w − s/2)` belongs to Irvine's original
 *   `V(s) = V₀ − w·s`. The elastic term here is `∫₀ˢ V/EA ds = (s/EA)·(V₀ + w·s/2)`, derived in
 *   §4.1. The error is 5 mm on `F1` — plausible enough to survive a loose bar, which is why
 *   `catenary.test.ts` asserts the two rejected values as well as the right one.
 * - **`sampleCable` is analytic and takes `n`.** No polyline is ever stored on a `SpanState`
 *   — « voir § 2 — the engine contract ». Sampling a state twice must give the same numbers, so
 *   nothing here mutates its argument.
 * - **A loaded state samples through its kink.** §6.1's `V(s) = V₀ + w·s + Σ P·𝟙[s > s_P]` is
 *   integrated here, not in `loads.ts`: `sampleCable` takes a `SpanState`, and a `SpanState`
 *   echoes its loads precisely so it can be sampled on its own. `loads.ts` owns the *statics*
 *   that produce `(H, V₀, s_P)`; this file only evaluates them.
 * - **The engine is dependency-free and SI** — `m`, `N`, `N/m`; `s` is the **unstretched**
 *   material coordinate from A, `z` is positive up, and `V₀ < 0` on a sagging span.
 */

import type { PointLoad, SpanInput, SpanState } from "./types.ts";

/**
 * Everything §4.1's `x(s)` / `z(s)` need. A `SpanState` satisfies it, which is what lets
 * `sampleCable` and the clearance reducer pass one straight through.
 */
export type CableShape = {
  /** Horizontal tension component, N — constant along the span (§2, vertical loads only). */
  H: number;
  /** Vertical reaction at the near anchor, N; negative on a sagging span. */
  V0: number;
  /** Weight per unit length, N/m. */
  w: number;
  /** Axial stiffness, N. */
  EA: number;
  /** Point loads; omit or `[]` for the single-segment §4.1 cable. Any `s` order is accepted. */
  loads?: readonly PointLoad[];
};

const NO_LOADS: readonly PointLoad[] = [];

/**
 * The loads in ascending `s`, without touching the caller's array. Already-sorted input — which
 * is every input v1's UI produces, since it carries exactly one rider — costs one scan and no
 * allocation.
 *
 * Exported as internal API with a public name, like `levelSpanShortcut`: `jacobian.ts` walks the
 * §6.1 nodes in the same order and with the same jump accumulation, and « the loads in `s` order »
 * is one behaviour, not two.
 */
export function inSOrder(loads: readonly PointLoad[]): readonly PointLoad[] {
  for (let i = 1; i < loads.length; i++) {
    if (loads[i].s < loads[i - 1].s) return [...loads].sort((a, b) => a.s - b.s);
  }
  return loads;
}

/**
 * §4.1 / §6.1's `V(s)` — the vertical component of the tension the `s⁺` side exerts on the `s⁻`
 * side. Self-weight gives `V₀ + w·s`; a downward load `P` at `s_P` adds `+P` for `s > s_P`.
 */
export function verticalTensionAt(shape: CableShape, s: number): number {
  let V = shape.V0 + shape.w * s;
  const loads = shape.loads ?? NO_LOADS;
  for (let i = 0; i < loads.length; i++) {
    if (s > loads[i].s) V += loads[i].P;
  }
  return V;
}

/** §2's tension magnitude `T(s) = √(H² + V(s)²)`. Maximal at the higher anchor. */
export function tensionAt(shape: CableShape, s: number): number {
  return Math.hypot(shape.H, verticalTensionAt(shape, s));
}

/**
 * §4.1's `x(s) = H·s/EA + (H/w)·[asinh(V(s)/H) − asinh(V₀/H)]`.
 *
 * With loads, the integral runs segment by segment (§6.1). Because `H` is constant the elastic
 * part `H·s/EA` is unaffected, and the telescoping transcendental part reduces to the unloaded
 * expression **minus the jump each node inserts** — one term per load, no segment walk.
 */
export function xAt(shape: CableShape, s: number): number {
  const { H, V0, w, EA } = shape;
  let asinhSpan = Math.asinh(verticalTensionAt(shape, s) / H) - Math.asinh(V0 / H);
  const loads = inSOrder(shape.loads ?? NO_LOADS);
  let jump = 0;
  for (let i = 0; i < loads.length; i++) {
    const load = loads[i];
    if (load.s >= s) break;
    const below = V0 + w * load.s + jump;
    jump += load.P;
    asinhSpan -= Math.asinh((below + load.P) / H) - Math.asinh(below / H);
  }
  return (H * s) / EA + (H / w) * asinhSpan;
}

/**
 * §4.1's `z(s) = (s/EA)·(V₀ + w·s/2) + (H/w)·[√(1+(V(s)/H)²) − √(1+(V₀/H)²)]` — the internally
 * consistent form of §2.1, **not** the printed one.
 *
 * With loads, the elastic term picks up `P·(s − s_P)/EA` per passed node (the extra tension each
 * load puts into the cable below it) and the transcendental term loses each node's jump, exactly
 * as in {@link xAt}.
 */
export function zAt(shape: CableShape, s: number): number {
  const { H, V0, w, EA } = shape;
  let elastic = (V0 * s + (w * s * s) / 2) / EA;
  let coshSpan = Math.hypot(1, verticalTensionAt(shape, s) / H) - Math.hypot(1, V0 / H);
  const loads = inSOrder(shape.loads ?? NO_LOADS);
  let jump = 0;
  for (let i = 0; i < loads.length; i++) {
    const load = loads[i];
    if (load.s >= s) break;
    const below = V0 + w * load.s + jump;
    jump += load.P;
    elastic += (load.P * (s - load.s)) / EA;
    coshSpan -= Math.hypot(1, (below + load.P) / H) - Math.hypot(1, below / H);
  }
  return elastic + (H / w) * coshSpan;
}

/**
 * §4.1's level-span shortcut: for `h = 0` and no loads, symmetry gives **exactly**
 * `V₀ = −w·L₀/2` (fixtures `Z1`, `Z2` return it to 10 digits), and the solve collapses to one
 * equation in `H`.
 *
 * `null` means « not eligible » — the guard is `h === 0 && loads.length === 0`, and it lives here
 * rather than at the call site so there is one place to read it. Not exported from `index.ts`:
 * it is internal API with a public name, because §15 requires tests to reach it directly.
 *
 * @returns the exact `V₀`, N, or `null` when the span is inclined or loaded.
 */
export function levelSpanShortcut(input: SpanInput): number | null {
  if (input.h !== 0 || input.loads.length !== 0) return null;
  return (-input.w * input.L0) / 2;
}

/**
 * §4.1 evaluated at `n + 1` points uniform in the **material** coordinate `s ∈ [0, L₀]`, returned
 * as `2·(n+1)` interleaved `x, z`.
 *
 * Uniform in `s`, not in `x`: `s` is what the closed form is parameterised by, and it is what
 * keeps the sample density even along a steep segment. The two ends are evaluated at exactly
 * `s = 0` and `s = L₀`, so the first pair is the near anchor `(0, 0)` and the last pair closes on
 * `(L, h)` to the solver's residual.
 *
 * @throws RangeError when `n` is not a positive integer — a caller bug, not a physics failure,
 *   and therefore the one thing in the engine that is a throw rather than a `SolveError`.
 */
export function sampleCable(state: SpanState, n: number): Float64Array {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`sampleCable: n must be a positive integer, got ${n}`);
  }
  const shape: CableShape = {
    H: state.H,
    V0: state.V0,
    w: state.w,
    EA: state.EA,
    loads: inSOrder(state.loads),
  };
  const out = new Float64Array(2 * (n + 1));
  for (let i = 0; i <= n; i++) {
    const s = i === n ? state.L0 : (state.L0 * i) / n;
    out[2 * i] = xAt(shape, s);
    out[2 * i + 1] = zAt(shape, s);
  }
  return out;
}
