# E4 · `solve.ts` — the damped Newton solver

Stage: E4
Status: done
Blocked by: 05
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 11

## Delivers

`src/lib/sim/solve.ts` — §5's damped Newton iteration, §5.2's seeds and re-seed cap, §5.3's
tolerance, §4.3's branches, and the `invalid-input` path for §5.4's chord bound.

## Gate

| Case | Value |
| --- | --- |
| `Z1` | `H = 1423.94 N`, `V₀ = −251.250 N`, `V_B = +251.250 N`, `T_max = 1445.94 N` |
| `Z2` | `H = 1442.11 N`, `V₀ = −510.000 N`, `T_A = T_B = 1529.63 N`, `z_min = −8.75376 m` |
| `Z3` | `H = 1286.38 N`, `V₀ = −468.701 N`, `V_B = +141.299 N`, `T_A = 1369.11 N`, `T_B = 1294.12 N`, **and `T_A > T_B`** |
| invariant | `V₀ = −w·L₀/2` for `h = 0`, `loads: []` — **exact**, it is `levelSpanShortcut`'s whole claim |
| invariant | symmetry, and `EA → ∞` |
| refusal | `L₀` **197,404 m** on a 200 m level span and **987,02 m** on 1000 m raise `invalid-input{field:"L0"}` — assert `bound` and `boundKind`, not just the kind |

Solved scalars at **4×10⁻⁶** relative. §5.3's tolerance is `1×10⁻⁶ m` absolute for spans ≲ 1000 m,
`1×10⁻⁶·L` beyond.

## Notes

- **The §5.4 chord bound *is* the breaking load.** At the floor `L₀`, `T_max` reaches 100,0 % MBF
  (200 m) and 101,1 % (1000 m) — so there is no reachable state where a line solves cleanly and the
  verdict says rupture. This is why the failure is a refusal with an attainable bound and **no fix
  button**, not a safety verdict.
- **Most of §5.4 is internal remedies that *succeed*.** Only three failures are real kinds; damping
  and re-seeding are notes, not failures.
- **Deep slack converges** — it is not a failure. `L₀` 400 m on a 200 m span lands at garde
  −169,67 m with `contact: "cable"`, which is a clearance verdict (ticket 09 here), not
  `slack-limit`.
- `no-convergence` and `slack-limit` are **unreachable inside the admissible envelope** (measured:
  349 440 solves, `reseeded` 0, near-taut condition 0). Their tests are **injected** via `vi.mock`
  on the collaborator — never hunted with pathological inputs, and never by widening the public
  signature. Voir § 11.
- The `damped` note fires in 0,6 % of iterations in aggregate; test it by calling the damping branch
  directly, since it is a named module export.

## Comments

**Fix round — the deliverable did not exist.** The previous pass left the working tree with no
`src/lib/sim/solve.ts` and no `solve.test.ts`, so the green gate was evidence of absence. Both are
now written: §5.1's damped Newton with MoorPy's `a_max = 1.2` step-growth cap, §5.2's
Peyrot–Goulois / parabolic / straight-bar seeds under §5.1's ≤ 5-attempt retry policy, §5.3's
tolerance, §4.3's near-taut fallback, `H` floor and clamp, and §5.4's chord bound as an
`invalid-input{field:"L0"}` pre-check. 66 cases in `solve.test.ts`; whole suite 141 green, with
`typecheck` and `lint-type-aware`.

**Judgement calls.**

- **`SpanInput.strength?: number`.** § 2's own text obliges « `solveSpan`'s pre-check to carry the
  §5.4 chord bound », and the bound `chord/(1 + T_break/EA)` needs the breaking load, which none of
  § 2's six `SpanInput` fields carries and which the frozen `solveSpan(input, warmStart?)` signature
  has nowhere to put. Added as an **optional** field, so every call site § 2 fixes still compiles
  unchanged and the §15 fixtures stay material-free; omitted, the pre-check simply does not run.
  `DerivedMaterial` — « what the solver consumes » — already carries `strength` beside `w` and `EA`.
- **The refusal is asserted below the floor, not at it.** 197,404 m and 987,02 m are the floor
  _rounded to the displayed grain_: the exact values are 197,4039944 m and 987,019972 m, so `L₀ =
197,404` is a hair **above** the floor and solves. The cases therefore refuse at the spec's own
  message example (`L₀ = 190,00 m` against the 197,40 m floor) and at 980 m, assert `bound` equal to
  the engine's `chord/(1 + MBF/EA)` _and_ within the measured tier of 197,404 / 987,02, assert
  `boundKind: "min"`, and pin the strictness one nanometre under the floor. The floor itself is then
  solved to check the claim that gives the refusal its shape: `T_max` = 100,0 % MBF at 200 m and
  101,1 % at 1000 m — both reproduced to 4×10⁻⁴.
- **`CHORD_BOUND` joined `__fixtures__/theory-15.ts`** as the first `[MEASURED]` row, the class that
  module's `FixtureSource` union already anticipated. `testing.md` puts fixtures in one place.
- **Two constants §5 names without fixing**: `MaxIter` = 100 per attempt and 20 halvings of `α`.
  Both are recorded in `SOLVER` with the reason. §5.3's tolerance is implemented as the literal
  step §5.3 states (`1e-6` up to 1000 m, `1e-6·L` beyond), not smoothed into a continuous ramp the
  theory doc does not state.
- **`slack-limit` is diagnosed when _any_ attempt collapses onto the `H` floor**, not only the last:
  §4.3's `H → 0` is a statement about the line, and both kinds render « Calcul impossible » anyway.
  §4.3's « clamp `H > 0` » is enforced _through_ §5.1's damping — a floored candidate is refused, not
  clamped, so no reported point is one Newton never evaluated.
- **The level-span shortcut makes the solve 1-D.** With `h = 0` and `loads: []`, `z(L₀) ≡ 0` for
  every `H`, so `V₀ = −w·L₀/2` is exact rather than converged and the gate's « exact » is `toBe`,
  not a tolerance.
- **Injection is `vi.mock` on `jacobian.ts`**, delegating to §4.2 by default: a rank-one matrix for
  `no-convergence` (`attempts === 5`, residual carried) and for `reseeded` (singular on call 1
  only), partials 10⁻¹⁸ for `slack-limit` (`hFloored === 0,01·|w|`), and a direct call into the
  exported `dampedStep` for `damped`. No signature was widened.
- **Not asserted here, but verified while building**: the same solver reproduces `Z4`
  (`H = 7898,16`, `V₀ = −1091,00`) and `Z5` (`H = 7765,67`, `V₀ = −973,369`) and marches a
  260-step warm-started sweep with zero failures at ≤ 8 iterations. Those rows belong to tickets
  07 and 08 and are left to them.
