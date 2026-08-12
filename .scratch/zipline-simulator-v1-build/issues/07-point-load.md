# E5 · `loads.ts` — the point load and §6.1

Stage: E5
Status: open
Blocked by: 06
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 11

## Delivers

`src/lib/sim/loads.ts` — §6.1's multi-segment `V(s)` and `solveAtHorizontalPosition`.

## Gate

| Case | Value |
| --- | --- |
| `Z4` | `s_P = 50.2500 m` (= `L₀/2`), `H = 7898.16 N`, `V₀ = −1091.00 N`, `V_B = +1091.00 N`, `z_D = −5.31434 m`, `T_A = T_B = 7973.16 N` |
| `Z4` | `solveAtHorizontalPosition(x_D = 50)` recovers the same state, and `s_P = 50.2500` |
| invariant | global force balance with a point load — **10⁻¹⁰** |
| invariant | `V_B = (w·L₀ + P)/2` on `Z4`, **and explicitly not `(qL + 2P)/2`** |

## Notes

- **The C11 case is a carried rejection, not a duplicate of `Z4`.** The old report's
  `V_high = (qL + 2P)/2` **double-counts `P`**; `Z4`'s `V_B = 1091.00 = (10·100.5 + 1177)/2` is what
  disproves it. Assert the correct closed form *and* that the double-counted one does not match, or
  the next reader "corrects" the formula back.
- `solveAtHorizontalPosition` is what makes a **typed** rider position an exact §6.1-case-2 solve
  (~40 µs) rather than a snap-and-rewrite. Pointer input snaps instead — at 1500 m, 1 px ≈ 1,2 m, so
  there is no precision to preserve.
