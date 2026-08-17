# E5 · `loads.ts` — the point load and §6.1

Stage: E5
Status: done
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

## Comments

**Built** — `src/lib/sim/loads.ts` + `loads.test.ts` (50 cases; suite 141 → 191, all three gates
green: `typecheck`, `lint-type-aware`, `test`).

Three named exports, no more:

- **`solveAtHorizontalPosition(input, P, xTarget)`** — § 2's frozen signature, unchanged. §6.1's
  outer 1-D bisection on the monotone `s_P` around case 1, each inner solve **warm-started from the
  previous one**. It stops on §5.3's own `residualTolerance(L)` (no new constant invented) or on the
  bracket collapsing onto the root; `POINT_LOAD.maxBisections = 60` is a backstop, never the exit.
  **[MEASURED] 35 µs and 44 Newton iterations total** per call on `Z4`'s line (Node, 500 runs) —
  which is the ~40 µs this ticket predicted, so the tighter 10⁻⁶ m target costs nothing. Not ported
  into a test: a microsecond figure belongs in a bench a human reads (`docs/conventions/testing.md`).
- **`solveAtMaterialPosition(input, P, sP, warmStart?)`** — §6.1 case 1, « the natural case ». Not a
  new abstraction: it is case 2's own inner solve and §6.2's per-step solve, and it composes the
  load list (`[...input.loads, { P, s }]`) so §6.1's `n` loads keep working. Ticket 08 marches over
  it with a `warmStart`.
- **`loadNode(state, s)`** — §6.1's stated node outputs `x_D = x(s_P)`, `z_D = z(s_P)`. `s` is a
  parameter rather than read off `state.loads`, because an `n`-load state has `n` nodes.

§6.1's multi-segment `V(s)` is **not** re-implemented here — it already lives in `catenary.ts` /
`jacobian.ts` per ticket 04's seam (`sampleCable` takes a `SpanState`, so a loaded state samples its
own kink, and `catenary.ts` importing `loads.ts` would be a cycle). What landed here is the statics.

Judgement calls (1 is § 3's own hard range, not a silence — see the fix round below):

1. **`x_D` is refused only outside the closed `[0, L]`**, as `invalid-input{field:"xD"}` with
   `bound` 0 or `L` and `boundKind` `"min"`/`"max"`. This was **not** a silence to fill: § 3's field
   table states the hard range as `0 ≤ x ≤ L`, `x_D` clamps into `[0, L]` on every path and § 7 makes
   the clamp « a note, not an error » with `x_D` in no gate — so a viewpoint clamped onto its own
   bound is a legal state that must draw. §6.2's endpoint-excluded grid is about *slider stops*, not
   about the legal range of a typed viewpoint.
2. **`P` is refused when non-finite or negative** (`field:"P"`, bound 0, min); `P = 0` is admitted,
   since `loads: []` **is** the unloaded case. `P` is the one quantity no solver-side check would
   ever name.
3. **The span's own tier one goes first**: the `x_D` bound is only judged once `L` is a finite
   positive number, so a broken span still names `L` / `L0` / `w` / `EA` rather than `xD`. Every
   inner refusal — §5.4's chord bound above all — is returned **unchanged**, bound included.
4. **`iterations` is the bisection's total**, not the last inner solve's, so `[ Copier le
   diagnostic ]` cannot under-report a 28-step loop by 30×; `notes` stay the last inner solve's,
   because they describe the state being returned.

Two test-side findings worth keeping, both places where the obvious assertion is wrong:

- `Z4`'s **mid-span node has `T₁ = T₂` to the last bit** — `|V(s_P⁻)| = |V(s_P⁺)| = P/2 + w·L₀/2`
  exactly, by symmetry. So §6.1's « do not impose `T₁ = T₂` » is asserted on an **off-centre** node,
  where the two differ by tens of daN; the symmetric case is asserted as an agreement that follows
  from symmetry rather than from fiat.
- **A second rider raises `H`, so the first rider's node sits _higher_.** More load is not more sag
  at a given point — the test says so explicitly, so nobody "fixes" it into the opposite claim.

**Spec-drift fix round.** `refuse()` now judges `x_D` on the **closed** `[0, L]` (`>= 0` / `<= L`,
non-finite still landing on the `min` branch); `loads.test.ts` drops the two endpoint refusal rows
and asserts instead that `x_D = 0` and `x_D = L` solve onto the requested position inside
`residualTolerance(L)` — judgement call 1 above is rewritten accordingly. 190 tests, three gates
green.
