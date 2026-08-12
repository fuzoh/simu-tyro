# E2 · `catenary.ts` — §4.1 geometry and `sampleCable`

Stage: E2
Status: open
Blocked by: 02, 03
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 11

## Delivers

`src/lib/sim/catenary.ts` — §4.1's `x(s)` / `z(s)`, `sampleCable(state, n)` and
`levelSpanShortcut`.

## Gate

| Case | Value | Tier |
| --- | --- | --- |
| `F1` | `x(L₀) = 97.0329 m`, `z(L₀) = 24.2392 m` | 4×10⁻⁶ relative |
| `Z1` | `z_min = −4.39987 m`; `x` at `z_min` = 50.0 m | solved / scanned |
| `Z3` | sag below chord `D = 7.0811 m` at `x ≈ 59.7`; `z_min − h = −1.5476 m` | solved / scanned |
| invariant | `EA → 10¹⁴` vs closed-form inextensible catenary | 7 s.f. |

Scanned-extremum positions assert **absolute, at 2× the sample spacing** — an argmax over a sampled
polyline is limited by spacing, not by the solver.

## Notes

- **§2.1's sign trap fires here or nowhere.** A mixed convention returns `z(L₀) = 24.2342` against
  the correct **24.2392**, and reference report [R1] claimed 24.84 — three plausible-looking
  numbers, which is exactly why `F1` is the first gate in the build.
- `sampleCable` is analytic and takes `n`. No polyline is ever stored on a state.
