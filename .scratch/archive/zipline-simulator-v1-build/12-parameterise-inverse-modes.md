# E9 · `parameterise.ts` — §7 inverse modes

Stage: E9
Status: done
Blocked by: 06, 11
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 3, § 7

## Delivers

`src/lib/sim/parameterise.ts` — §7's `resolveL0`, resolving all three Tightness Specs to `L₀` above
the solver, **plus the §5.4 bound re-emitted in the driving quantity**.

## Gate

| Case | Value |
| --- | --- |
| `Z6` | `L₀ = 100.670 m` from `H_target = 2451 N`; forward re-solve gives `H = 2451.000`; sag `D = 5.1164 m`; the §7 closed-form seed **100.669** lies inside the bracket |
| invariant | monotonicity across the bracket |
| bound, flèche mode | « Flèche minimale atteignable : **0,29 m** » |
| bound, tension mode | « Prétension maximale atteignable : **9 074 daN** » |
| refusal | a bracket failure renders **« Cible inatteignable »** naming the *target* |

## Notes

- **`Z6` is entirely new work** — the prototype implements no inverse mode, so `check.ts` is not
  coverage for any of this.
- **`L₀` is first-class state**; the three modes are an adapter *above* `solveSpan`, never a mode
  flag inside it.
- **The bound must come back in the quantity the user is editing**, never as an `L₀` in metres beside
  a tension field. Without this, ticket 26's two mode-specific « Tension impossible » messages are
  unwritable.
- The bound is violable **in all three modes**, not only direct-`L₀` — ticket 04 §7's line 261 was
  struck on that ground.
- `resolveL0` also exists so §9's `ΔL₀` story *can* compose later. That is not the same as building
  it: §9 is out of scope.

## Comments

**Built.** `src/lib/sim/parameterise.ts` — `resolveL0(spec, span)` over § 2's frozen
`TightnessSpec` / `SpanGeometry` / `Result<number, SolveError>`, with `unloadedSag`,
`parabolicTensionForSag`, `tensionForSag`, `closedFormSeedL0`, `tightnessFloor`,
`tightnessBracket` and the `PARAMETERISE` constants as named exports — plus its colocated
`parameterise.test.ts` (38 cases) and three new `[MEASURED]` rows on `CHORD_BOUND` in
`__fixtures__/theory-15.ts` (`HMaxAttainable200` 9 074 daN, `DMinAttainable200` 0,29 m,
`DMinAttainable1000` 7,21 m — spec § 7's « Tension impossible » table, the same one floor read in
each driving quantity). All three gates green; 352 tests.

Gate, measured: `Z6` resolves to **100.669844 m** (§15's exact 100.66984), forward `H` **2450.99975**,
flèche **5.116404 m**, seed **100.66891** inside the bracket `[99.00990, 101.33782]`; the tension
bound is **9 077,9 daN** against the spec's recorded 9 074 (0,43 of the `[MEASURED]` bar) and the
flèche bounds **0,2915 m** / **7,2129 m** against 0,29 / 7,21. A resolve costs ~0,06 ms — one solve
per bracket doubling and per bisection, warm-started from the previous one.

Judgement calls, all where the spec was silent:

- **The bracket's lower bound is §5.4's floor, not §7's `chord`.** §7 writes « lower bound
  `L₀ = chord` », but the chord is itself *below* `chord/(1 + T_break/EA)`, so a bisection anchored
  there asks `solveSpan` for a line that has already broken and gets the refusal instead of a
  bound. Same end of the same interval, moved to the last admissible point — and it is the point
  every attainable bound is read from, which is what makes the re-emission « the floor mapped
  forward through the same inversion » rather than a second formula.
- **Mode 3 reuses mode 2's bracket and bisection, run on the flèche itself** rather than on the `H`
  its seed produced. §7's « seed `H ≈ wL²/(8D)`, refine against the exact catenary sag, then mode
  2 » is followed for the *seed* (`parabolicTensionForSag` → `tensionForSag` → `closedFormSeedL0`),
  but an `H`-exact answer is not a `D`-exact answer once the cable stretches and the chord tilts,
  and § 3 makes flèche the shipped driver whose displayed value must be exact. Cross-checked: the
  two modes return the same `L₀` on `Z6`, and flèche 6,00 m on the first-run line returns ticket
  14's own **151,644 m**.
- **The flèche is closed-form, not scanned.** The deepest point below the chord is where the
  tangent is parallel to it, and `V(s)` is affine on the unloaded line — `unloadedSag` agrees with
  a 200 000-sample scan to 1e-12 and returns `Z3`'s 7,0811 m. It takes an unloaded state on
  purpose: §6.1's jumps in `V(s)` would break the single-vertex assumption.
- **Every non-rupture failure inside a bracket is normalised to `no-convergence`.** § 7 binds the
  *kind* to the banner, so a `slack-limit` escaping `resolveL0` would render « Calcul impossible »
  where the taxonomy says « Cible inatteignable ». A real `no-convergence` keeps its own
  `attempts` / `residual`; a `slack-limit` becomes one attempt at the `L₀`, in metres, the line lay
  down at.
- **« Cible inatteignable » names the target from the caller's `TightnessSpec`, not from the
  error.** `no-convergence`'s payload is frozen at `{ attempts, residual }` and carries no field —
  widening it to name `D_target` would change a § 2 type for a string the Rail already holds. The
  test asserts the refusal carries **no** `bound` and no `field`, so nothing competes with the
  target in the copy.
- **`strength` is tier-one-checked here**, although it is not one of § 2's four: `solveSpan`
  *skips* §5.4's bound when the breaking load is absent or non-positive, so an unusable one would
  silently turn this module's one re-emitted refusal into no refusal at all. It refuses as
  `field: "strength"`, alongside the pass-through of `L` / `w` / `EA` / `h`.
- **`Result<T, E>` is declared in `parameterise.ts`, not in `types.ts`.** § 2's frozen block does
  not list it and § 2 puts `resolveL0`'s collaborating types in the adapter above the solver;
  `{ ok: true; value }` mirrors `SolveResult`'s discriminant so the two read alike.
- **`Z6` carries no material, so the tests pass a stand-in breaking load** (1e5 N) — needed only to
  place the floor below the answer. It is asserted to be a non-claim: the resolved `L₀` does not
  move when it changes by two orders of magnitude.
- **The bracket-failure case is injected with `vi.mock` on `solve.ts`**, per
  `docs/conventions/testing.md`. It *is* reachable by hand (`H_target = 1e-6 N` walks the doubling
  cap into a `slack-limit`), but only through targets the form's ranges refuse.
