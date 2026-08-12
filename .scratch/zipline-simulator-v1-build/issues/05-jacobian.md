# E3 · `jacobian.ts` — §4.2 analytic partials

Stage: E3
Status: open
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
