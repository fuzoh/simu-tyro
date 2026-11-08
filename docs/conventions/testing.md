# Testing

Vitest 4, **`node` environment, always**. `bun run test` → `vitest run` (single pass, no watch).
The `test` block lives in `vite.config.ts`.

- **Vitest is unit-only.** No component tests, no DOM, no `@vitest-environment` docblock anywhere,
  no `@vitest-environment-options`. `jsdom`, `@testing-library/react` and `@testing-library/dom` are
  **not** dependencies of this project and must not come back.
- `test.include` is `src/**/*.test.ts` — `.ts` only, because a `.tsx` test file would be a component
  test.
- **Point-to-point app testing belongs to `agent-browser`**, not to Vitest — see
  [What CI does not cover](#what-ci-does-not-cover-agent-browsers-half) at the bottom of this file.
- The two seams that once wanted a DOM are **parameters** instead: the dropped-keys reporter takes the
  **raw query string** as an argument, and `readSession` / `writeSession` take the **storage object**.
  Pure functions test fine in `node`, and they are the better seam.
- **One test builds the app**: `src/components/map/load-vue-3d.test.ts` runs Vite's production
  client build in memory (`build.write: false`) and reads its chunks — the Vue 3D's CesiumJS behind
  a dynamic import, the size of what `/` downloads (#95). A chunk graph is the only place that
  contract is observable, and it is still `node`, no DOM.
- **One test reads the whole app's copy**: `src/lib/vocabulary/labels.test.ts` walks every `.ts` and
  `.tsx` under `src/` for the words the interface never says, and checks the glossary names the
  wordings it prints (#102). A scan of every string is observable nowhere else; it is the one
  suite spanning several modules, and it is still `node`, no DOM.

## What deserves a test

Simulation math. It is pure, numeric, and the place where a silent wrong answer is
expensive. When you add or change a formula, add a case whose expected values come from
`docs/simulation-theory.md` §15 — **never** from your own implementation's output, and
**never** transcribed from `docs/references/` (see [Fixture rules](#fixture-rules)).

The app layers are unit-testable wherever they are arithmetic on one input: the layout contract
(band heights, VE and its ×1 floor, the `SharedX` round-trip, the 600 px wrap threshold), the three
validation gates as predicates over a Scenario, the banner's one-occupant reducer, the tier-one
message and culprit tables, the stale-Override badge and the codecs. None of that needs a DOM.

## File layout and naming

Decided in the wayfinder ticket _Engine API, execution model and module layout_.

- **Colocated.** `solve.test.ts` sits beside `solve.ts` in `src/lib/sim/`. Keeps each
  assertion in eyeshot of the `docs/simulation-theory.md` § citation it verifies.
- **One test file per source file**, same basename. **No `tests/` directory, and no suite file
  spanning several modules** (bar the two exceptions above). This survives every app layer
  unchanged — `first-run.test.ts` beside `first-run.ts`, `p1.test.ts` beside `p1.ts`.
- **Physics fixtures live in one place**: `src/lib/sim/__fixtures__/theory-15.ts`, exporting `F1`,
  `Z1`–`Z6` and `Z8` from `docs/simulation-theory.md` §15 as typed consts. Every fixture carries
  a `source` field naming its § (e.g. `"simulation-theory.md §15 Z4"`). The golden canonical
  links of the URL codec live in `src/lib/url/__fixtures__/canonical-links.ts`, tagged
  `[MEASURED]`.
- **`Z7` (thermal) is deliberately absent** — its physics is out of scope for v1. Add it with the
  feature, not before, as `Z8` arrived with the passager's ride (#89).
- Benches are `*.bench.ts`, colocated too — see [Benches](#benches).

## Fixture rules

- **Never transcribe a fixture from `docs/references/`.** The reference reports contain
  fabricated worked examples — §14 of the theory file lists which ones and why. §15 is the
  regenerated, MoorPy-cross-validated set; it is the only fixture source.
- **Tag the source in the fixture, not in a comment**, and keep the **two provenance classes
  apart**:
  - §15 rows — `source: "simulation-theory.md §15 Z4"` — are cross-validated physics.
  - `[MEASURED]` rows — `source: "[MEASURED] ticket 14 §2"` — are this app's own output at a moment
    in time (the first-run statics, the clearance sensitivities, the textile verdict pair), and they
    assert at the loosest tier below.

  Treating the two alike invites someone to tighten the wrong one and to trust the wrong one.

  A datasheet figure takes `[DATASHEET]` (`simulation-theory.md` §0.2); arithmetic done on one
  keeps that tag and says so in `source` (`src/lib/rail/__fixtures__/courant-bandit.ts`).

- **The prototype's `check.ts` is a coverage checklist, not a value source.** Four assertions it
  never made are new work, so a green `check.ts` is not coverage: `F1`'s three partials with
  `∂z/∂H = ∂x/∂V₀` as an equality; the finite-difference agreement; `Z6` entirely; and `Z5`'s
  stretched arc position `σ_D`. The prototype exposes no Jacobian and implements no inverse mode.
- **Assert the invariants, not only the outputs** — `∂z/∂H = ∂x/∂V₀` (§4.2), level-span symmetry
  `V₀ = −w·L₀/2` (§4.1), the `EA → ∞` limit against the closed-form inextensible catenary, global
  force balance under a point load, and `sweepGrid(L₀, 240).length === 260`. Fixture values alone let
  sign-convention errors through — see §2.1, where a mixed convention returns a plausible 24.2342
  against the correct 24.2392.

## Tolerance — four tiers

The old « assert at `1e-3` relative for now » **TODO is discharged**, not forgotten: §5.3 fixes the
solver's tolerance (`1×10⁻⁶ m` absolute for spans ≲ 1000 m, `1×10⁻⁶·L` beyond) and a solver at that
tolerance was measured against every ported fixture at **≤ 4×10⁻⁶ relative**. Do not re-open it as an
oversight. Four tiers, because they measure four different things:

| Tier                             | Bar                                 | Applies to                                                                                                                                                                              | Why                                                                                                                            |
| -------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Solved scalars**               | `4×10⁻⁶` relative                   | `H`, `V₀`, `V_B`, `T_A`, `T_B`, `T_max`, `L₀`, `z_D`, `s_P`, `σ_D`                                                                                                                      | measured achievable; §15 states 6 s.f., whose rounding floor is ~5×10⁻⁷ — above transcription noise, below any real regression |
| **Positions of scanned extrema** | absolute, **2× the sample spacing** | `x` at `z_min`, `x` at max sag, `x_D` recovered from a node                                                                                                                             | an argmax over a sampled polyline is limited by the spacing, not by the solver                                                 |
| **§15's own stated invariants**  | as §15 states them                  | Jacobian vs finite differences **< 2×10⁻⁹**; `EA → 10¹⁴` vs closed-form inextensible **7 s.f.**; global force balance under a point load **10⁻¹⁰**; level-span `V₀ = −w·L₀/2` **exact** | quoted, not chosen                                                                                                             |
| **`[MEASURED]` cases**           | `1e-3` relative, **floored at the half-ulp of the recorded value's own last digit** | anything sourced from a resolved ticket's measurement rather than from §15                                                                                                              | the recorded value _is_ the measurement's precision (3–4 s.f.); a tighter bar asserts digits nobody measured                   |

The floor is the same rule as the bar, applied to rows the bar over-reads: `1e-3` on a garde
recorded as « 0,40 m » is ±0,4 mm, which demands four digits from a two-decimal record. So the bar
is `max(1e-3 · |expected|, 0,5 · 10⁻ᵈ)` for a value recorded to `d` decimals — `TOLERANCE.measured`
holds the relative half, and the assertion supplies `d`. It never loosens a row that already has
the digits: at 3–4 s.f. the relative half dominates.

One exception on purpose: the **first-run lock** (`src/lib/scenario/first-run.test.ts`) asserts
**formatted strings**, not floats. `1e-3` on `L₀` is ±0,15 m, which moves garde by ≈0,15 m — the
opening screen could drift by 6 % of its safety margin and stay green.

## Injected states

`no-convergence`, `slack-limit` and every `SolveNote` are **injected, never hunted**. Measured inside
the admissible input envelope: 349 440 instrumented solves, `reseeded` **0**, §4.3's near-taut
condition **0**, all 3 792 sweeps at coverage 1,000. A test that waits for a pathological input to
reach one of these states tests nothing — it either never gets there, or it gets there through an
input the app's own ranges refuse.

- **Inject with `vi.mock` on the collaborator** (`jacobian.ts`, `catenary.ts`, `solve.ts`), never by
  widening a signature. `solveSpan(input, warmStart?)` is contract; a test-only third parameter would
  grow the public surface to make a guard reachable.
- `invalid-input{field:"L0"}` is the one state reachable from real input — it is §5.4's chord bound.
  Assert `bound` and `boundKind`, not just the kind.
- Also assert the **surfaces**, since the mapping is what users see: `no-convergence` and
  `slack-limit` both render « Calcul impossible »; `invalid-input{field:"L0"}` renders « Tension
  impossible » with the attainable bound and no fix button; `resolveL0`'s bracket failure renders
  « Cible inatteignable » and re-emits the bound **in the driving quantity**.
- **No test asserts that a state is unreachable.** Unreachability is a property of the input
  envelope; the measurements above are the record and CI's job is regressions. The 349 440-solve
  envelope sweep is a minutes-long one-off and **does not run in CI** — re-run it by hand if §5's
  constants, §5.2's seeds or the input ranges move.

## Benches

- `*.bench.ts`, colocated like tests. `bun run bench` → `vitest bench --reporter=verbose` (the
  default reporter hides the result tables off a TTY).
- **A bench is never part of `bun run test`.** Bench files match only `benchmark.include`, and
  `benchmark.enabled` is left **unset** on purpose: only `vitest bench` turns it on.
- Vitest 5 API: `bench` is a **test-context fixture**, not an import — one `test()` per comparison,
  `await bench.compare(bench(…), bench(…), runOptions)`. Run options (`iterations`, `time`, warmup)
  go in the trailing argument, not per `bench()`.
- What it measures: p95 of `sweep()` **plus** `evaluateClearance` (the pair — both run on a parameter
  change), 40 runs per cell, `SWEEP_STEPS` at 100 / 240 / 500, over the three worst-conditioned spans.
  Tripwire: **re-run the bench if anything raises `260 × 60`**.
- It runs in **Node, not Chromium**, so it does **not** reproduce the prototype's 1,30 ms. It is a
  relative tripwire against the **8 ms** criterion — assert the criterion, never the measurement.
- API note: the bench result exposes tinybench's `p75` / `p99` / `p995` / `p999` and **no `p95`**,
  while the criterion is stated in p95. So the threshold assertion is a **plain `test`** that times
  40 runs and takes its own p95 against 8 ms — the hand-rolled loop also reproduces the prototype
  harness exactly.
- Where it lives: the cells and the timing loop are `src/lib/sim/bench-harness.ts`, read by **both**
  `sweep.bench.ts` (`bun run bench`, human-read, asserts nothing) and `bench-harness.test.ts` (the
  p95 tripwire, in `bun run test`). One definition, because a bench cell and a gate cell that could
  drift apart would make CI guard something the bench does not measure.
- **CI runs `bun run test:ci`, which excludes `bench-harness.test.ts`.** It is a wall-clock gate,
  and a shared runner measures the box, not the code (the same commit measured 8,7 ms then 13,6 ms
  there). The budget is not relaxed to fit a runner: run the full `bun run test` on a real machine
  before merging anything that touches `src/lib/sim/`.
- Microsecond figures (e.g. `p1` decode at 2,3–2,5 µs) belong in a bench a human reads, never in a
  CI assertion.

## What CI does not cover — `agent-browser`'s half

A green suite is **not** coverage of the following. Vitest cannot see them, so `agent-browser` drives
the real app in a real browser instead
([browser tickets 29–35](../../.scratch/zipline-simulator-v1-build/issues/29-responsive-layout-browser-evidence.md)).
**A state nobody scripts there is a state nobody checks** — that is the deliberate trade.

- **Four DOM-shape states**: the Skeleton's content (five Rail headings, both chart frames, no
  control / no value / no « — »), the refusal rendered on an app Page at 200 — as ordinary
  validated state, **not** as a thrown `errorComponent`, [voir amendement E](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) —
  « Saisie en cours », and « Aucun résultat ».
- **Five measurements a layout engine has to make**: the three pixel budgets (390×664 · 768×1024 ·
  1440×900), the banner heights 44 / 60 / 76 px, the View Strip's label widths, the first-run
  auto-fit VE **×1,86** at aspect 0,42 on the 1,1 L domain (badge « ×1,9 », at and below § 5's
  reference chart column), and the drag frame time against a 16,7 ms vsync.
- **The end-to-end walkthroughs** no unit test spans: a link arriving, a CSV import, a steel ⇄ textile
  family flip, a régime chosen, the narrow-screen keyboard.

Anything expressible as a pure function stays in Vitest and must not be duplicated there.
