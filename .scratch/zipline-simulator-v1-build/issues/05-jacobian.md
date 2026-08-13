# E3 · `jacobian.ts` — §4.2 analytic partials

Stage: E3
Status: done
Blocked by: 04
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 11

## Delivers

`src/lib/sim/jacobian.ts` — §4.2's analytic partials as its own module and its own export.

## Gate

| Assertion | Value / bar |
| --- | --- |
| `F1` `∂x/∂H` | `1.16024×10⁻³` m/N |
| `F1` `∂x/∂V₀` = `∂z/∂H` | `−4.55088×10⁻³` m/N |
| `F1` `∂z/∂V₀` | `1.82564×10⁻²` m/N |
| symmetry | `∂z/∂H === ∂x/∂V₀` — **same expression, so assert equality, not a tolerance** |
| finite differences | agreement **< 2×10⁻⁹** |

## Notes

- **Built before `solve.ts`, although Newton is what uses it.** §15 gives `F1`'s partials as
  first-class fixture values, so the Jacobian is verifiable in isolation; verified *after* the
  solver, a sign error here shows up as a convergence mystery instead of a failed assertion.
- This is **new work, not a port** — the prototype exposes no Jacobian, so a green `check.ts` is not
  coverage for any of it. Same for the finite-difference case.
- Its own file, because §15 asserts its partials — voir § 10 P3's table of what the prototype's
  single-file solver cannot supply.

## Comments

**Built** — `src/lib/sim/jacobian.ts` + `jacobian.test.ts` (17 cases; suite 190, three gates green:
`typecheck`, `lint-type-aware`, `test`). One named export beyond the type:

- **`jacobianAt(shape: CableShape, s: number): CableJacobian`** — §4.2 evaluated at a material
  coordinate rather than hard-wired to `L₀`. Newton wants it at `s = L₀`, where the residual
  `(x(L₀) − L, z(L₀) − h)` lives, and since `L` and `h` are constants the Jacobian of the residual
  *is* the Jacobian of the position — so no residual-specific variant exists. `CableShape` is
  ticket 04's, so the Jacobian and the geometry it differentiates read the same state and the same
  `inSOrder` load ordering; `verticalTensionAt` is reused rather than re-derived.
- **`CableJacobian` is four named fields**, not `[[a, b], [c, d]]` or a `Float64Array`: the solver
  reads all four by name in one place, and an index slip on §2.1's sign trap would be silent.

Four things the implementation does on purpose:

- **`∂z/∂H` and `∂x/∂V₀` are computed once and written twice.** §4.2 makes them one expression and
  §15 publishes a single number for both, so the test asserts `===`, not a tolerance — an assertion
  that is only meaningful because the value cannot be reached by two roundings of the same algebra.
- **§6.1's loads telescope, exactly as `xAt` / `zAt` do** — one term per node subtracting the jump
  it inserts, no segment walk. `s_P` is a *material* coordinate fixed per solve, so it contributes
  no `∂/∂H` or `∂/∂V₀` term, and every intermediate `V` is `V₀` plus a constant, so `∂V/∂V₀ = 1`
  throughout and the `∂/∂V₀` column stays as simple as the unloaded one.
- **No degenerate branch and no 2×2 inverse live here.** §4.3's near-taut fallback, the `H → 0`
  stiffness floor and the `H > 0` clamp are §5's damped-Newton concerns; the linear solve and its
  singularity test stay in `solve.ts`, which is what lets § 11's `no-convergence` case `vi.mock`
  this module with a singular matrix.
- **Pure, and the caller's `loads` array is never mutated** — asserted, like `catenary.ts`.

Judgement calls (the spec fixes the partials and the bars; these are the silences):

1. **`s` is a parameter, not `L₀`.** § 2's function surface names no signature for this module
   (only « own file »), and §6.1's node outputs plus the finite-difference sweep both want the
   partials *along* the span, not only at the far end.
2. **The finite-difference check is a *central* difference**, step `max(|value|·10⁻⁶, 10⁻⁶)`. §15's
   bar is **absolute at 2×10⁻⁹** on partials of order 10⁻³–10⁻², which a forward difference cannot
   reach without a step so small that cancellation dominates. Both ends of the
   truncation-vs-cancellation curve measured at 10⁻¹⁰ or better, so nothing is tuned to the bar.
3. **The FD case runs beyond `F1`.** `F1` is a taut *rising* segment — `V > 0` across it, so it
   cannot catch a term that is only wrong where `V` changes sign. `Z3` (inclined, sagging, crosses
   its own low point) and `Z4` (loaded, sampled both sides of the node) are added, with their
   solved `(H, V₀)` fed straight into the closed form: **no solver runs in this file**, only the
   derivative of §4.1 is asserted.
4. **Structural cases carry the signs**, because a fixture value alone lets a sign error through
   (§2.1 is the standing proof): `∂x/∂H > 0`, `∂z/∂V₀ > 0`, mixed `< 0`; all four partials exactly
   `0` at `s = 0`; the elastic term `s/EA` on the diagonal only, checked against `EA → 10¹⁴`; and a
   load at `s_P ≥ s` not felt, so §6.1's jump is strictly `s > s_P`.

**Verification round (this run).** The module and its test were found already in the working tree
from an earlier interrupted run, unreviewed and with the ticket still `open`. Re-derived §4.2's four
partials from §4.1 by hand, including the loaded telescoping, and re-computed `F1`'s three values
independently at 40 digits (mpmath): `∂x/∂H = 1.1602373572×10⁻³`, `∂x/∂V₀ = −4.55087809×10⁻³`,
`∂z/∂V₀ = 1.82563500856×10⁻²` — §15's 6 s.f. rows exactly, and the delivered code matches. No source
change was needed; the three gates were run green (190 tests) and the ticket bookkeeping is the only
edit this round.
