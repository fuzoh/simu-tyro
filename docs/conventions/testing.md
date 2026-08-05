# Testing

Vitest 4 with jsdom. `bun run test` → `vitest run` (single pass, no watch).

- React component tests use `@testing-library/react` / `@testing-library/dom`.
- Environment is `jsdom` — no real browser, no layout measurement.

## What deserves a test

Simulation math. It is pure, numeric, and the place where a silent wrong answer is
expensive. When you add or change a formula, add a case with expected values taken
from the reference reports in `docs/references/` (see
[simulation.md](simulation.md)) — not from your own implementation's output.

## File layout and naming

Decided in the wayfinder ticket *Engine API, execution model and module layout*; no test
files exist yet, so this is the layout the first ones must adopt.

- **Colocated.** `solve.test.ts` sits beside `solve.ts` in `src/lib/sim/`. Keeps each
  assertion in eyeshot of the `docs/simulation-theory.md` § citation it verifies.
- **One test file per source file**, same basename. No `tests/` directory, no suite files
  spanning several modules.
- **Fixtures live in one place**: `src/lib/sim/__fixtures__/theory-15.ts`, exporting `F1`
  and `Z1`–`Z6` from `docs/simulation-theory.md` §15 as typed consts. Every fixture carries
  a `source` field naming its § (e.g. `"simulation-theory.md §15 Z4"`).
- **`Z7` (thermal) and `Z8` (dynamics) are deliberately absent** — their physics is out of
  scope for v1. Add them with the feature, not before.

## Fixture rules

- **Never transcribe a fixture from `docs/references/`.** The reference reports contain
  fabricated worked examples — §14 of the theory file lists which ones and why. §15 is the
  regenerated, MoorPy-cross-validated set; it is the only fixture source.
- **Assert at `1e-3` relative** for now. §15 states its values to 6 s.f. and instructs
  tightening once the production solver's own tolerance is tuned; leave a single TODO
  saying so rather than one per assertion.
- Assert the **invariants**, not only the outputs: `∂z/∂H = ∂x/∂V₀` (§4.2), level-span
  symmetry `V₀ = −wL₀/2` (§4.1), and the `EA → ∞` limit against the closed-form
  inextensible catenary. These catch sign-convention errors that fixture values alone let
  through — see §2.1.
