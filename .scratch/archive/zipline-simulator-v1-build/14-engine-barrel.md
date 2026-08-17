# E11 · `index.ts` — the public barrel

Stage: E11
Status: done
Blocked by: 04, 05, 06, 07, 08, 09, 11, 12, 13
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2

## Delivers

`src/lib/sim/index.ts` — the one path app code imports.

## Gate

**No deep import into `src/lib/sim/**` from anywhere outside it.** Add the check as a lint rule or a
test, not as a convention nobody enforces.

## Notes

- Eleven modules by concept, **each citing its § in a header comment** — the layout is
  `src/lib/sim/` by concept, and the A/B separation sits at `materials/steel.ts` vs
  `materials/textile.ts`.
- The barrel is what lets terrain cross as **cloneable data**, which keeps the worker door open even
  though ticket 10 measured that we do not need one.
- `solveSpan(input, warmStart?)` and the rest are **contract**. A test-only third parameter to make a
  guard reachable is the tail wagging the dog — inject with `vi.mock` on the collaborator instead.

## Comments

**Done.** `src/lib/sim/index.ts` re-exports and **declares nothing** — no constant, no formula, no
type of its own, so there is nothing here for §14's ledger to reach and nothing to keep in step with
a theory §. It carries § 2's *Function surface* (`solveSpan`, `sampleCable`,
`solveAtHorizontalPosition`, `sweep`, `zGroundAt`, `evaluateClearance`, `resolveL0`,
`evaluateVerdict`), the twelve `types.ts` declarations, the two family derivations, and the
constants and catalogues the app layers read (`SWEEP`, `CLEARANCE`, `REGIMES`, `TERMINATIONS`,
`VERDICT`, `STEEL`, `TEXTILE`). Inside the engine nothing imports the barrel — modules keep
importing each other directly, which is what keeps `import/no-cycle` quiet.

**The gate is a test, not a lint rule**: `src/lib/sim/index.test.ts` walks every `.ts`/`.tsx` under
`src/`, resolves each specifier (`@/…` alias and relative alike, `index` folded into its directory)
and fails on any that lands inside `src/lib/sim/` from outside it. Chosen over
`no-restricted-imports` + an `overrides` block because the semantics are exact and testable rather
than dependent on oxlint's pattern implementation — and the detector itself is asserted on synthetic
specifiers, since a scan that cannot fail is the convention this gate replaces. Verified end to end
by planting a deep import and watching the suite go red. Two further checks ride along: every module
of § 2's layout opens on a header docblock citing a §, and `materials/index.ts` does not exist.

Judgement calls, where the spec was silent:

- **Three names are withheld and the test asserts their absence.** § 2 says `levelSpanShortcut` is
  « not part of `index.ts` … Same for `sweepGrid` and the Jacobian » — so `levelSpanShortcut`,
  `sweepGrid` and `jacobianAt` stay module-local. Nothing downstream needs them: `sweep()` returns
  its grid on `SweepResult.grid`, and the shortcut is a fast path `solveSpan` takes by itself.
- **Withheld too: `allowableTension` and `amplifiedTension`.** `VerdictCell.Tadm` and
  `EndEnvelope.Tdaf` already carry those numbers, and a second caller of §10's formula is a second
  place it can drift. Same reasoning drops `SOLVER`, `POINT_LOAD` and `PARAMETERISE` (tolerances,
  seeds and bracket policy — the engine's own business) and `bench-harness.ts` (test infrastructure,
  not app surface); all five absences are asserted.
- **Four names beyond § 2's function surface are exported, because the barrel is the *only* path
  and an omission forces the deep import this ticket forbids**: `unloadedSag` (§ 6 displays « flèche
  à vide » and `VerdictInput.sagRatio` has no other producer), `isRegimeAvailable` /
  `isFamilyAllowed` (§ 6's and §10.4's picker availability rules), and `steelFormula` beside
  `resolveSteelValues` (§ 3's stale-Override badge compares the two).
- **`Iterate` is re-exported as a type** — it is `solveSpan`'s optional `warmStart` parameter, and a
  caller cannot name that parameter without it. Widening the signature was never on the table.
- **Block comments are stripped before the import scan.** This codebase's docblocks cite
  `src/lib/sim/…` paths constantly and a citation is not an import; line comments are left in, so a
  commented-out deep import still trips the gate.
