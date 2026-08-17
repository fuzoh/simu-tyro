# 38 — Engine review refinements — dedupe and shape

**What to build:** The judgement calls from the post-v1 review. **Nothing here is a defect** — every
item is self-documented and cross-checked where it matters. They are recorded because each is a
place where a future change has two sites to keep in step, or one function to keep growing.

**Blocked by:** 37 — Engine correctness fixes from the v1 review *(item 5 below is the file
ticket 37 rewrites; take them in that order or the dedupe fights the fix)*

**Status:** open

Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 6, § 10 · touches tickets
[07](./07-point-load.md), [09](./09-terrain-and-clearance.md), [12](./12-parameterise-inverse-modes.md),
[13](./13-verdict.md) and [25](./25-rail-output-half.md).

**Source:** two-axis code review of 2026-08-15, fixed point = root. The Standards axis found **one**
hard violation, which is item 4 of [ticket 37](./37-engine-correctness-fixes.md); the sim engine
otherwise cites `docs/simulation-theory.md` § numbers for every formula and coefficient, keeps steel
and textile as separate code paths on purpose, tags fixture provenance correctly, and matches the
four documented test tolerance tiers. **No invented safety factor or coefficient exists anywhere in
scope** — `GATE_RANK`, `VERDICT.standingTensionCap` and `REGIMES[…].k` are imported from `@/lib/sim`,
never redeclared downstream.

## 1 · The worst-tension-per-end scan exists twice

`src/lib/rail/results.ts:576-609` (`envelopes()`) re-implements the max-scan of
`src/lib/sim/verdict.ts:594-598`. Both are self-documented, and `results.test.ts` asserts the two
agree — so today they cannot silently diverge. But a régime-model change needs to touch only one to
break that agreement, and the assertion is the only thing that would say so.

**Weigh:** the engine owns the envelope; the Rail should read it, not recompute it. Exporting the
scan from `verdict.ts` and having `envelopes()` call it removes the agreement test's reason to
exist.

## 2 · Two bisection loops of the same shape

`src/lib/sim/loads.ts:148-187` (`solveAtHorizontalPosition`) shares its bracket / converge /
warm-start shape with `parameterise.ts`'s `bisect` and `bracketL0`.

**Weigh honestly.** A shared helper is worth it only if both call sites want the same convergence
criterion and the same warm-start contract. If they differ, a five-line loop stated twice is the
cheaper truth — say so in the ticket and close it rather than abstracting over a difference.

## 3 · `evaluateVerdict` carries five responsibilities

`src/lib/sim/verdict.ts:576-753` does validation, envelope construction, per-régime scoring, warning
derivation and refusal-state derivation in one function. It is a coherent single contract today —
one input, one verdict — and splitting it for its own sake would scatter § 10.1 across files.

The pressure is directional: every new régime or warning grows it. Split when the next one lands,
along the seam that change reveals, not before.

## 4 · `geometry.source === "manual"` is re-checked in four modules

`src/lib/rail/gates.ts:222-224` · `src/lib/rail/deduced.ts:258-259` · `src/lib/rail/values.ts:113-116`
· `src/lib/chart/scene.ts:382-384`.

Each instance is justified by its own module's concern, and none of them is wrong. Four is the point
at which to name the pattern; **a fifth branch makes it a genuine Repeated Switches case** and the
discriminant should become one shared derivation the four read.

## 5 · The fused clearance loops stay fused — recorded so nobody "fixes" it

`src/lib/sim/clearance.ts:154-225` interleaves the cable-vertex and terrain-vertex scans in one loop
body. The docblock explains this as an allocation trade against ticket 09's frame budget. **This is
correct as written.** It is listed here only so the next reader does not split it on style grounds.

Note it is the same region [ticket 37](./37-engine-correctness-fixes.md) item 1 rewrites to force
`s_D` into the sample set — that fix must preserve the fusion.

## Gate

- [ ] Items 1, 2 and 4 are each either done or closed with the reason stated — a closed judgement
      call is a result, not a skip.
- [ ] Item 3 is deferred by decision, with the seam named.
- [ ] No behaviour change: the § 15 fixtures, ticket 09's measured garde figures and the verdict
      cases all reproduce identically.
- [ ] `bun run typecheck`, `bun run lint-type-aware` and the unit suite pass.

## Comments
