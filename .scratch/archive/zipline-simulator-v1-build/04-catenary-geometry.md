# E2 · `catenary.ts` — §4.1 geometry and `sampleCable`

Stage: E2
Status: done
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

## Comments

`src/lib/sim/catenary.ts` + `catenary.test.ts` (29 cases, fixture-first — the suite was written and
run red before the module existed). Exports: `xAt`, `zAt`, `verticalTensionAt`, `tensionAt`,
`levelSpanShortcut`, `sampleCable`, and the `CableShape` type a `SpanState` satisfies. The gate is
green at the stated tiers: `F1` `x(L₀)`/`z(L₀)` at 3,8×10⁻⁷ / 2,0×10⁻⁶ relative, `Z1` `z_min` at
3,3×10⁻⁶ with the low point on `x = 50,0`, `Z3` `D = 7,0811` at 8,0×10⁻⁷ with the argmax at
`x = 59,711`, and the `EA → 10¹⁴` limit against the closed-form inextensible catenary at ~10⁻¹¹.
The §2.1 sign trap was verified by mutation: flipping the elastic term's sign to the printed
(mixed) convention turns 9 cases red, `z(L₀) = 24.2392` among them.

**Judgement calls.**

- **The piecewise §6.1 `V(s)` is integrated here, not in `loads.ts`.** `sampleCable` takes a
  `SpanState`, and § 2 says a state echoes its loads precisely so it can be sampled on its own —
  `catenary.ts` importing `loads.ts` would be a cycle. `loads.ts` keeps the _statics_
  (`solveAtHorizontalPosition`); this module only evaluates a known `(H, V₀, s_P)`. `Z4` is used
  here only to check that a loaded state samples through its kink; its solve assertions stay in
  `loads.test.ts`.
- **`levelSpanShortcut(input: SpanInput): number | null`** — returns the exact `−w·L₀/2`, or `null`
  when the `h === 0 && loads.length === 0` guard fails. The guard lives inside the function so
  `solve.ts` reads it in one place.
- **`sampleCable` throws `RangeError` on a non-positive-integer `n`.** « Failure is a value » is
  about solver failure modes; a bad `n` is a caller bug with no `SolveError` kind to carry it.
- **`Z3`'s `z_min − h` asserts relatively on `z_min`, not on the difference.** §15 publishes the
  difference but measured `z_min`; 4×10⁻⁶ relative on a 1,55 m difference of two ~16,5 m numbers is
  6 µm, below §15's own printed resolution for that row (5×10⁻⁵ m). On `z_min` itself the error is
  4,9×10⁻⁷.
- **`sampleCable` is uniform in `s`, not in `x`**, with `s = L₀` evaluated exactly at the last
  index so the far end closes on the solver's residual rather than on floating-point drift.
- Loads are read in ascending `s` and the caller's array is never mutated; an already-ordered list
  (every list v1's UI produces) costs one scan and no allocation.

**Fix round.** Tickets 02 and 03's `## Comments` were recovered verbatim — the originals were found
in this workflow's own subagent transcripts (`~/.claude/projects/…/subagents/workflows/…`, the
`Edit` tool calls that wrote them), so the placeholder reconstructions are gone and both tickets
again carry their own account, 03 including its later fix-round paragraph. No source file changed;
the three gates were re-run green (57 tests). Standing rule confirmed: format touched files only
(`bunx oxfmt --write <path>`), never the repo-wide `bun run format`.

**Spec-drift fix round.** The repo-wide `bun run format` damage was **not** in fact restored: ~60
committed files (the spec, the amendments, the build README, all 45 tickets, the map, the research
and reference reports, `AGENTS.md`, `CONTEXT.md`, `docs/conventions/simulation.md` and the
prototype's `variant-d.tsx`) still carried oxfmt's Markdown/TSX normalisation in the working tree.
All are back on their committed content — only `docs/conventions/testing.md`, `package.json`,
`vite.config.ts`, `bun.lock` and the untracked `src/lib/sim/` remain modified, plus tickets 01–07's
own `Status`/`## Comments`. To stop the recurrence the rule is now mechanical, not remembered:
`.oxfmtrc.json` ignores `**/*.md`, `src/routeTree.gen.ts` and `src/routes/-prototype-07/**`, and
`AGENTS.md` has a `## Formatting` section stating « format touched files only ».
