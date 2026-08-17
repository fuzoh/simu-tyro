# P0.2 · The §15 fixture module

Stage: P0.2
Status: done
Blocked by: 01
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 11

## Delivers

`src/lib/sim/__fixtures__/theory-15.ts`, exporting `F1` and `Z1`–`Z6` transcribed from
`docs/simulation-theory.md` §15, **each with a `source` field**.

## Gate

Every engine test case that will consume a fixture is **red** — the fixtures exist, the modules do
not.

## Notes

- **`Z7` (thermal, §9) and `Z8` (dynamics, §12) are absent on purpose** — their physics is out of v1
  scope. Add them with the feature, not before. §15's own « Excluded fixtures » list is never
  ported.
- **No value is ever transcribed from `docs/references/`** — §14 records which worked examples are
  fabricated.
- **Tag the source in the fixture, not in a comment**, and keep the two provenance classes distinct:
  `source: "simulation-theory.md §15 Z4"` versus `source: "[MEASURED] ticket 14 §2"`. A §15 row is
  MoorPy-cross-validated physics; a measured row is this app's own output at a moment in time.
  Treating them alike invites someone to tighten the wrong one and to trust the wrong one.
- `check.ts` in the prototype is a **coverage checklist, not a value source** — and it never made
  four of the assertions this build needs (voir § 11).

## Comments

**Built.** `src/lib/sim/__fixtures__/theory-15.ts` exports `F1` and `Z1`–`Z6` as
`as const satisfies Fixture` literals, each with its `source`. `Z7` and `Z8` are absent and
§15's « Excluded fixtures » list is not ported; nothing came from `docs/references/`. Every
number is §15's, to the 6 s.f. it publishes — including `Z3`'s `D` / `xAtD` / `zMinMinusH`,
`Z5`'s `sigmaD` and `Z6`'s closed-form seed, which the four assertions § 11 calls « new work »
need. Beside it, `theory-15.test.ts` (28 cases, green) checks the **transcription** — no engine
module is imported, and none exists.

**Judgement calls.**

- **Provenance is enforced by the type, not only by convention.** `FixtureSource` is
  `` `simulation-theory.md §15 ${string}` | `[MEASURED] ${string}` ``, so a row that belongs to
  neither class does not compile and the two tiers cannot quietly merge.
- **A colocated `theory-15.test.ts`, although the ticket asks for no test.** § 11's own rule is
  one test file per source file, and a mistyped digit in a fixture poisons every downstream
  stage silently while looking green. The cases are transcription-only and self-contained:
  §4.1's level-span symmetry on `Z1`/`Z2`, `T = √(H² + V²)` at both ends of `Z1`–`Z4`, `Z3`'s
  `V_B = V₀ + w·L₀`, C11's corrected reaction form on `Z4` **with the double-counted
  `(qL + 2P)/2` asserted as a non-match**, `Z5` riding `Z4`'s line with `σ_D > s_D > x_D`, and
  `Z6`'s seed above the chord. Every identity closes inside `TOLERANCE.solvedScalar` (worst
  case 2,85×10⁻⁶), which is itself a check that § 11's bar is right for a 6 s.f. table. The
  same identities asserted _against the solver's output_ remain `solve.test.ts`'s and
  `loads.test.ts`'s work — this file cannot substitute for them, and says so.
- **The four tolerance tiers ship here as `TOLERANCE` plus `scannedPositionTolerance(span, n)`**,
  rather than being retyped in each of the eleven engine test files. Data, not an abstraction:
  the numbers are § 11's table, and the function is « 2× the sample spacing » (0,10 m at `Z1`'s
  `n = 2000`, 0,06 m at `Z3`'s `n = 4000`).
- **`∂x/∂V₀` and `∂z/∂H` are one literal under two names** (`F1_MIXED_PARTIAL`). §4.2 makes them
  the same expression, so a second transcription could only ever introduce a typo;
  `jacobian.test.ts` still asserts the engine's two partials as an equality.
- **`F1` carries a `rejected` block** — §2.1's mixed-convention `24.2342` and §14's R1 `24.84`,
  both printed in §15's own F1 row. `catenary.test.ts` needs the decoys to assert that the sign
  trap did not fire; they are quarantined under `rejected`, never under `out`.
- **Fixture `in` blocks mirror §15's stated inputs exactly** — no fabricated `loads: []`, no
  import from `src/lib/sim/`. The fixtures stay plain data, so they can never be re-derived from
  the code they check, and they do not block on ticket 03's `types.ts`.

**One repair worth recording.** `bun run format` is `oxfmt --write` with no path argument, so it
reformatted all 98 files it matches — including 56 committed Markdown files, `spec.md` and
`src/routeTree.gen.ts`. All 56 were restored to their committed content. Two files could not be:
`docs/conventions/testing.md` and `01-test-harness-and-testing-md-diff.md` carry ticket 01's
uncommitted work, so their pre-format text is not in git — they now also carry oxfmt's Markdown
normalisation (`*emphasis*` → `_emphasis_`, table padding). **Content is unchanged**; only the
formatting of those two moved. Format single files (`bunx oxfmt --write <path>`), never the bare
script.
