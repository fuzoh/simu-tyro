# E1 · `types.ts` — the frozen engine declarations

Stage: E1
Status: done
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

## Comments

**Built.** `src/lib/sim/types.ts`, declarations only, no runtime export and no import — the
engine stays dependency-free and valibot stays at the boundaries. Transcribed verbatim from
§ 2's _Public types_ block: `PointLoad`, `SpanInput` (with `loads: PointLoad[]`), `SpanState`
(inputs echoed, `loads` included), `SweepStep`, `SweepResult` (`grid` / `steps` / `failures` /
`coverage`), `SolveResult`, `SolveError` with the amended `bound` / `boundKind` payload,
`SolveNote`, `Terrain`, `MaterialSpec`, `DerivedMaterial` — plus `ClearanceResult`, the
clearance shape § 2 only writes inline in `evaluateClearance`'s signature. Field-level doc
comments carry the unit and the reason a field exists; the module header carries the § citations
and the rejected alternatives, so the next reader cannot "fix" one of them unknowingly. Gates:
`typecheck`, `lint-type-aware` and `test` (28 fixture cases) all green.

**Judgement calls.**

- **`SolveError`, not `SolveFailure`.** The ticket's prose names the union `SolveFailure`; § 2's
  code block, the failure-taxonomy table, `SweepResult.failures` and `SolveResult` all say
  `SolveError`. The spec is the contract, so the type is `SolveError` and the ticket's name is
  read as descriptive.
- **`ClearanceResult` is named here.** The ticket asks for « the sweep/clearance result shapes »
  and § 2 leaves the clearance shape anonymous inside `evaluateClearance`'s return type.
  Naming it in `types.ts` changes nothing structurally and gives E7 and the Rail one name for
  it; the field list is § 2's, unchanged.
- **`TightnessSpec` / `SpanGeometry` / `VerdictInput` stay out.** § 2 says the first two « belong
  to the adapter above the solver », and the module-layout listing of `types.ts` ends at
  `MaterialSpec`. They ship with `parameterise.ts` (12) and `verdict.ts` (13). `DerivedMaterial`
  _is_ here: it sits in § 2's own public-types block and E8 (11) is blocked on E1 only.
- **`SweepResult.failures`' element type stays inline**, as § 2 writes it — a name the spec did
  not choose would be an invention, and `SweepResult["failures"][number]` already indexes it.
- **No `types.test.ts`.** § 11's stage table starts at E2, and the module has zero runtime
  surface: every assertion it could carry is one `tsc --noEmit` already makes. The one test file
  per source file rule keeps its consumers — `catenary.test.ts` onward — where the values are.
- **Fields are mutable and `loads` is a plain array**, not `readonly`. « Verbatim » was read
  strictly: `readonly PointLoad[]` would change assignability at every call site the spec's own
  signatures fix.

**Fix round.** `MaterialSpec` steel `d` was documented as metres; § 3's field table fixes it in
**mm** (`Diamètre nominal | d | mm`, default `12,0`) and §13.1's `MBF [kN] = K·d²·R₀/1000` takes
`d` in mm. Corrected the doc comment and spelled out that the module header's SI-in-metres rule
covers the span quantities the solver consumes, not this boundary input spec — a consumer
(ticket 11, `materials/steel.ts`) trusting « m » and passing `0.012` would scale `MBF` and `EA`
by 10⁻⁶. `R0`'s note now records MPa = N/mm², § 3's own unit for the field. Declarations
otherwise unchanged; `typecheck`, `lint-type-aware`, `test` (28) re-run green.
