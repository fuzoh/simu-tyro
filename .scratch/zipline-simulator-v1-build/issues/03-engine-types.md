# E1 · `types.ts` — the frozen engine declarations

Stage: E1
Status: open
Blocked by: 01
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2

## Delivers

`src/lib/sim/types.ts` — the declarations § 2 already fixes, verbatim: `SpanInput` with
`loads: PointLoad[]`, `SpanState`, `Terrain`, the `SolveFailure` union
(`invalid-input` · `no-convergence` · `slack-limit`) with its **amended payload** carrying `bound`
and `boundKind`, `SolveNote`, and the sweep/clearance result shapes.

## Gate

`bun run typecheck`.

## Notes

- **These are a contract, not a draft.** § 2 is the output of a resolved decision ticket; this stage
  transcribes it. A signature that feels awkward is not licence to redesign it here.
- `loads: PointLoad[]` stays a list even though the UI exposes exactly one rider — §6.1 keeps the
  unknowns at `(H, V₀)` either way, and the empty list *is* the unloaded case.
- The `bound` / `boundKind` fields are not optional decoration: without them « Tension impossible »
  is **unwritable** and the state degrades to quoting an `L₀` floor at a user editing a tension.
- Results are **scalars only** — `SpanState` plus analytic `sampleCable(state, n)`, never a stored
  polyline. That is what keeps clearance a *reducer* over the sweep and the solver terrain-free.
