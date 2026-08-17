# E6 · `sweep.ts` — the rolling sweep and `coverage`

Stage: E6
Status: done
Blocked by: 07
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 11

## Delivers

`src/lib/sim/sweep.ts` — §6.2's `sweepGrid`, the marching solve with warm start, and `coverage`
with its `failures[]`.

## Gate

| Case | Value |
| --- | --- |
| `Z5` | `H = 7765.67 N`, `V₀ = −973.369 N`, `x_D = 59.9578 m`, `z_D = −5.19064 m`, `σ_D = 60.1969 m` |
| exact | `sweepGrid(L₀, 240).length === 260` |
| exact | the grid is a **pure function of `(L₀, n)`** — determinism |

## Notes

- **`SWEEP_STEPS = 240 uniform + 10 tail steps per end ⇒ 260 pas`**, endpoints excluded. 260 is the
  coverage denominator everywhere in the app; ticket 08's « 240 / 240 » copy was wrong and § 6
  already carries the correction.
- `Z5`'s **`σ_D = 60.1969 m` is new work, not a port** — it is the quantity that makes `s_D` ≠ `x_D`
  concrete (60,15 against 59,96, ≈0,3 %), which is *why* `s_D` never appears in the UI.
- **240 is confirmed by measurement, not inherited**: it costs the same as 100 inside Chromium's
  0,1 ms clock clamp and buys 2,4× the resolution. Do **not** raise `steps` or `samplesPerStep` —
  the clearance reducer is the larger half of the frame budget and scales with their product, while
  the fidelity on offer was measured at ≈ 5 mm.
- A partial sweep carries `coverage` **so a green verdict cannot lie**. `coverage < 1` **suppresses**
  the verdict; it never qualifies it.
- The engine is **synchronous and pure forever**. Async lives only in the `useSweep` seam, which
  exists for stale-while-recomputing and **stays** even though there is no worker.

## Comments

**Built** — `src/lib/sim/sweep.ts` + `sweep.test.ts` (36 cases; suite 190 → 226, all three gates
green: `typecheck`, `lint-type-aware`, `test`).

Four named exports plus the constants:

- **`sweepGrid(L0, n = 240, tailSteps = 10)`** — § 2's frozen signature. Laid out *exactly* as the
  §15-verified prototype solver lays it out (`solver.ts:235`), because the 260 count, the first-run
  figures and the whole performance table were measured on it: uniform steps at `i·L₀/(n+1)`,
  `i = 1…n`, plus `0,02·L₀·2^−(tailSteps−i)` at each end, all sorted. `length === n + 2·tailSteps`,
  260 at the defaults, endpoints excluded. Reads `L₀` and nothing else — the determinism gate.
- **`sweep(input, riderP, n = 240)`** — § 2's frozen signature. Marches the grid in order,
  warm-starting each solve from the last; a failed step is recorded in `failures[]` (grid `index`,
  `sD`, the `SolveError` verbatim) and the **next step solves cold**, since a warm start taken from
  a failure is not one. `coverage = steps.length / grid.length`.
- **`sweepStep(input, riderP, sD, warmStart?)`** — the per-step solve the march runs 260 times,
  exported for the same reason `levelSpanShortcut` and `dampedStep` are: §15's `Z5` is a *step*, not
  a sweep, and 60,15 is not on any grid. Not in `index.ts`.
- **`stretchedArcPosition(shape, s)`** — §6.2's `σ_D = s_D + (1/EA)·∫₀^{s_D} T ds`, closed form
  (`∫√(H²+V²) ds = [V·T/2 + (H²/2)·asinh(V/H)]/w` per §6.1 segment, split at each node). Not a
  `SweepStep` field: `σ_D` is nowhere in the UI, it is the *evidence* that `σ_D ≠ s_D ≠ x_D`.
- **`SWEEP = { steps: 240, tailSteps: 10, tailFraction: 0.02 }`** — namespaced like `SOLVER` and
  `POINT_LOAD` rather than three loose `SWEEP_STEPS`-style consts, matching the two modules already
  shipped. `SAMPLES_PER_STEP = 60` stays out: it is `clearance.ts`'s default (ticket 09), and the
  tripwire is the product `260 × 60`.

Judgement calls, where the spec was silent:

- **`input.loads must be []` is enforced as a `RangeError`**, on `sampleCable`'s precedent for `n`:
  a caller bug is a throw, a statement about a line is a `SolveError`. A span arriving with a rider
  already on it would silently sweep a two-rider line and every downstream denominator would be
  measuring something else. Same for a non-integer `n` / `tailSteps` in `sweepGrid`; a bad `L₀` is
  *not* a throw — it reaches `solveSpan`'s own pre-check and lands as 260 `failures[]` at coverage 0,
  which is a tested case (§5.4's chord bound at `L₀ = 190 m` on a 200 m span).
- **`θ` is read on the *below* side of the node**, like `loadNode`'s own `x` and `z` and like the
  prototype's `riderNode`. A trolley sits on a kink and the slope is discontinuous across it; below
  is where every § 2 measurement was taken. Pinned by a test on `Z4`'s mid-span node, where the two
  sides are ±0,0744 rad and an averaged `θ` would read a plausible **0**.
- `coverage < 1` is **injected**, not hunted — `vi.mock` on `solve.ts`'s `solveSpan`, failing call
  137 — per § 11's own table: 259/260, `failures[0].index === 137`, the other 259 intact and in
  order.

Two invariants asserted beyond the gate, both of which caught a wrong assumption while writing:

- **Marched equals cold.** Every sampled step is re-solved from §5.2's seeds and compared at
  `4×10⁻⁶`; a traverse that depended on the direction it was walked is not a property of a cable.
- **`θ` is monotone increasing along the traverse** (§6.2 step 4's « slope profile for dynamics »).
  The naive « always descending » is **false**: on the `Z3` geometry 16 of 260 steps have `θ > 0`,
  past the loaded low point. Likewise `H` peaks at *mid-span*, not at the ends.
