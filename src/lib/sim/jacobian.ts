/**
 * §4.2's analytic Jacobian — `docs/simulation-theory.md` §4.2 (the partials, `[VERIFIED-NUM]`
 * against finite differences at |Δ| < 2×10⁻⁹ on fixture `F1`), §4.1 (the `x(s)` / `z(s)` these
 * differentiate), §2 (frame, signs, units) and §6.1 (« Jacobian assembled from §4.2 per
 * segment » — the piecewise `V(s)` a point load creates). Underlying reference reports:
 * `docs/references/simulation tyrolienne.md` (statics of the unloaded line, numerics) and
 * `docs/references/algo simulation tyrolienne.md` §4 — but **no value is transcribed from
 * either**: §14 records which of their worked examples are fabricated, and §15 is the only
 * fixture source. §4.2 notes that [R1 B1]'s partials are correct even though its `z` fixture is
 * not; the partials below are the re-derived form §4.2 prints, not a transcription.
 *
 * Rules this module exists to keep:
 *
 * - **Its own file, before `solve.ts`.** Newton is what consumes it, but §15 publishes `F1`'s
 *   partials as first-class fixture values, so the Jacobian is verifiable in isolation —
 *   « voir § 10 P3 ». Verified *after* the solver, a sign error here reads as a convergence
 *   mystery instead of a failed assertion.
 * - **`∂z/∂H` and `∂x/∂V₀` are one expression, not two.** §4.2 states the symmetry and §15
 *   publishes a single number for both, so this module computes it **once** and writes it to
 *   both fields: `jacobian.test.ts` asserts `===`, not a tolerance, and that assertion is only
 *   meaningful because the value cannot be reached by two roundings of the same algebra.
 * - **Analytic only — no degenerate branch lives here.** §4.3's near-taut fallback, the `H → 0`
 *   stiffness floor and the `H > 0` clamp are §5's damped-Newton concerns; this file evaluates
 *   the partials it is given and nothing else. Likewise the 2×2 inverse: `solve.ts` owns the
 *   linear solve and the singularity test it needs, which is what lets §11's `no-convergence`
 *   case `vi.mock` this module with a singular matrix.
 * - **Pure, and it never mutates its argument** — same shape in, same numbers out, exactly like
 *   `catenary.ts`. The engine is dependency-free and SI: `m`, `N`, `N/m`; partials are m/N.
 */

import type { CableShape } from "./catenary.ts";

import { inSOrder, verticalTensionAt } from "./catenary.ts";

/**
 * §4.2's four partials of the far-end position with respect to the two unknowns `(H, V₀)`, m/N.
 *
 * Laid out as named fields rather than a `Float64Array` or a nested array: the solver reads all
 * four by name in one place, and a `[[a, b], [c, d]]` would put the sign trap of §2.1 one index
 * slip away from being silent.
 */
export type CableJacobian = {
  /** `∂x/∂H`, m/N. */
  dxdH: number;
  /** `∂x/∂V₀`, m/N. */
  dxdV0: number;
  /** `∂z/∂H`, m/N — **the same expression** as `dxdV0` (§4.2), hence the same number. */
  dzdH: number;
  /** `∂z/∂V₀`, m/N. */
  dzdV0: number;
};

/**
 * §4.2 evaluated at the material coordinate `s`. With `V₁ = V(s)`, `T₀ = √(H²+V₀²)`,
 * `T₁ = √(H²+V₁²)` and no loads this is §4.2 verbatim:
 *
 * ```
 * ∂x/∂H  = s/EA + (1/w)·[asinh(V₁/H) − asinh(V₀/H)] − (1/w)·[V₁/T₁ − V₀/T₀]
 * ∂x/∂V₀ = (1/w)·[H/T₁ − H/T₀]
 * ∂z/∂H  = ∂x/∂V₀
 * ∂z/∂V₀ = s/EA + (1/w)·[V₁/T₁ − V₀/T₀]
 * ```
 *
 * Newton wants it at `s = L₀`, where the residual `(x(L₀) − L, z(L₀) − h)` lives; `L` and `h` are
 * constants, so the Jacobian of the residual *is* the Jacobian of the position.
 *
 * **With loads** (§6.1) the three sums below telescope exactly as `xAt` / `zAt` do — every node
 * subtracts the jump it inserts, one term per load and no segment walk. `s_P` is a *material*
 * coordinate fixed per solve, so it contributes no `∂/∂H` or `∂/∂V₀` term; and because every
 * intermediate `V` is `V₀` plus a constant, `∂V/∂V₀ = 1` throughout, which is what keeps the
 * `∂/∂V₀` column as simple as the unloaded one.
 */
export function jacobianAt(shape: CableShape, s: number): CableJacobian {
  const { H, V0, w, EA } = shape;

  const Vs = verticalTensionAt(shape, s);
  const T0 = Math.hypot(H, V0);
  const Ts = Math.hypot(H, Vs);

  /** `Σ ± asinh(V/H)` — the transcendental part of `x`, differentiated by the product rule. */
  let asinhSpan = Math.asinh(Vs / H) - Math.asinh(V0 / H);
  /** `Σ ± V/T` — `∂/∂V₀` of the same part, and `−H·∂/∂H` of it. */
  let slopeSpan = Vs / Ts - V0 / T0;
  /** `Σ ± 1/T` — `∂/∂V₀` of `z`'s transcendental part `(1/w)·Σ ± T`. */
  let inverseSpan = 1 / Ts - 1 / T0;

  const loads = inSOrder(shape.loads ?? []);
  let jump = 0;
  for (let i = 0; i < loads.length; i++) {
    const load = loads[i];
    if (load.s >= s) break;
    const below = V0 + w * load.s + jump;
    jump += load.P;
    const above = below + load.P;
    const Tbelow = Math.hypot(H, below);
    const Tabove = Math.hypot(H, above);
    asinhSpan -= Math.asinh(above / H) - Math.asinh(below / H);
    slopeSpan -= above / Tabove - below / Tbelow;
    inverseSpan -= 1 / Tabove - 1 / Tbelow;
  }

  // Computed once, written twice — §4.2's symmetry is an identity of the algebra, and
  // `jacobian.test.ts` asserts it with `===`.
  const mixed = (H / w) * inverseSpan;

  return {
    dxdH: s / EA + (asinhSpan - slopeSpan) / w,
    dxdV0: mixed,
    dzdH: mixed,
    dzdV0: s / EA + slopeSpan / w,
  };
}
