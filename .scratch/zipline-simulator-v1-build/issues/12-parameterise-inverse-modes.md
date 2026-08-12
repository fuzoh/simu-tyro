# E9 · `parameterise.ts` — §7 inverse modes

Stage: E9
Status: open
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
