# 38 — Engine review refinements — dedupe and shape

**What to build:** The judgement calls from the post-v1 review. **Nothing here is a defect** — every
item is self-documented and cross-checked where it matters. They are recorded because each is a
place where a future change has two sites to keep in step, or one function to keep growing.

**Blocked by:** 37 — Engine correctness fixes from the v1 review *(item 5 below is the file
ticket 37 rewrites; take them in that order or the dedupe fights the fix)*

**Status:** closed — items 1 and 4 done, item 2 declined, item 3 deferred, item 5 verified

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

- [x] Items 1, 2 and 4 are each either done or closed with the reason stated — a closed judgement
      call is a result, not a skip.
- [x] Item 3 is deferred by decision, with the seam named.
- [x] No behaviour change: the § 15 fixtures, ticket 09's measured garde figures and the verdict
      cases all reproduce identically.
- [x] `bun run typecheck`, `bun run lint-type-aware` and the unit suite pass.

## Comments

### Closed — 2026-08-28, five commits

`2dd0c77` · `e78dd11` · `c9de4e3` · `65ff1f6` · `3b34aa7`, plus this entry. Written on ticket 37 at
`560f890` and **rebased onto `2a5db37`**, where ticket 39 item 5 had landed in the meantime — no
conflict, the two touch different files. `bun run typecheck` and `bun run lint-type-aware` clean,
**1370 unit cases** green on the rebased tree (1366 on 37's).
Two of the five items produced code; three produced a decision. Nothing in `src/lib/sim/` grew a
dependency, no fixture moved, and § 15 reproduces bit for bit — the diff touches no
`__fixtures__/` file at all, and `Z3`/`Z4`/`Z5` are read out of the same rows ticket 37 left.

#### 1 · Done — the scan has one owner

`scanTensionEnvelope(steps, Tvide, DAF)` is now the engine's, exported through the barrel, and
`evaluateVerdict` and the Rail's `envelopes()` both call it. It is **one pass**: both ends' static
maxima with the step each sits at, plus §10.1's suspended denominator, which is a maximum over the
steps *and* the two ends. The Rail drops the denominator — § 9 never prints it — and that is stated
at the call site rather than left as a silent unused field.

**Bit for bit by construction, and checked as such.** The extracted body is the deleted loop
unchanged: same comparison order (A static · B static · suspended A · suspended B), same strict
`>` throughout, so a tie still names the **first** step and a tie between ends still holds `A`;
same `−∞` / `−1` / `"A"` empty-traverse identity, left for the caller to read rather than folded
into a `NaN` here — `evaluateVerdict` needs `NaN` in its printed rows and the Rail does not. The
Rail's `staticHeadline` is still picked on `Tstatic` and never through `Tdaf`, which is what keeps
the refused `DAF = −1` case printing 817,1 daN « ancrage A ».

What the app still owns is § 9's **presentation** choice — which end each of the two headlines
names — and the second `amplifiedTension` call the régime-less row set requires. `results.test.ts`'s
agreement case is kept and re-aimed: it no longer watches two implementations of a scan, it watches
that second caller's arguments, to the printed digit.

**The test set was rewritten once, after the review.** The first version asserted
`scanTensionEnvelope` against `evaluateVerdict` — which, now that one calls the other, is
`f(x) === f(x)`. It asserts against `Math.max` and `indexOf` over the traverse instead, an
independent route to the same two numbers. Four properties beside it: the suspended maximum running
over steps and ends at once (three different answers from one pass), `DAF` reaching that
denominator and nothing else, the empty traverse's identity, and the two tie-breaks. Plus the
`DAF ≤ 0` scan **only the Rail can reach** — `evaluateVerdict` refuses a non-positive `DAF`
outright — where the denominator can never rise above zero, which is why § 9 drops it rather than
printing a « charge suspendue » that reads better the worse the line is.

#### 2 · Declined — the two bisection loops are the same shape and nothing else

`solveAtHorizontalPosition` (`loads.ts`) and `bisect` (`parameterise.ts`) differ on **four** axes,
and the ticket's own test — « a shared helper is worth it only if both call sites want the same
convergence criterion and the same warm-start contract » — fails on the first two:

| | `loads.ts` | `parameterise.ts` |
| --- | --- | --- |
| converges on | the **value**: `abs(x(s_P) − x_D) ≤ residualTolerance(L)`, plus a bracket-collapse break | the **argument**: `upper − lower ≤ bracketTolerance · upper` |
| warm start | an `(H, V₀)` seed pair into the inner 2×2 Newton | a full `SpanState` threaded through `solveAt` |
| returns | `SolveResult` — state, the last inner solve's notes, **accumulated** Newton iterations | `Result<number, SolveError>` |
| direction | hard-codes the increasing `x(s_P)` | dispatches on `driver.falling` |

A helper would have to abstract over predicate, tolerance kind, warm-start type and return shape —
four parameters for a five-line loop, which is the cheaper truth stated twice. Worth adding that
the ticket pairs `bracketL0` with these two: it is a **doubling search**, not a bisection, so the
« same shape » premise is weaker still there.

#### 3 · Deferred by decision — and the seam is named

`evaluateVerdict` is left whole. Item 1 removed nothing from it; the shared scan is a call, so the
function is five responsibilities minus a loop body. **The seam is `regime.criteria`**: the
per-criterion scoring loop is the only part that grows with a régime, it already dispatches on
`criterion.basis`, and it reads `ends`, `suspended` and `strength` and writes `cells` and
`suspendedLoad` — five values, no other coupling. The next régime that does not fit
`tension-totale` or `charge-suspendue` is the change that should lift that loop out, taking its
`[REGULATOR]` citations with it. Validation, envelope construction, warnings and the refusal chain
stay where § 10.1 states them, because splitting those scatters one contract across files.

#### 4 · Done — but not where the ticket pointed

The ticket's census is wrong, and the review is what caught it. `source` is read at **~28 sites in
eleven modules**, not four: `rail/values.ts` alone has ten. So the stated trigger — « a fifth
branch » — was already met four times over on the day the ticket was written, and closing on it
either way would have been closing on a number nobody had counted.

The sites are three kinds, and only one of them owed anything:

- **Narrowing sites** — `deduced.ts`, `values.ts`, `scene.ts`, `url/schema.ts`, `app/state.ts` —
  read an arm's fields. `source` is this union's discriminant, so `source === "manual"` is what
  makes `geometry.L` exist; a shared helper returning `"manual" | "trace"` takes that away and buys
  nothing. **Left alone.**
- **Mode-label sites** ask only which mode is active, and are already served: `gates.ts`'s
  `geometryMode` has existed since `6dfdd5d`, module-private because a function whose body is one
  property read earns nothing by travelling. The ticket cites `gates.ts:222-224` as one of its four
  re-checks — at HEAD that *is* `geometryMode`, i.e. not a re-check at all. **Left alone.**
- **A derivation stated twice**, which is what item 4 was reaching for: `L` in manual mode,
  `s_B − s_A` in imported mode, in `rail/values.ts`'s `spanOf` and `app/state.ts`'s `withViewpoint`.
  That one is now `spanOfGeometry` in `scenario/geometry.ts`, and it returns the span **raw** —
  `NaN`, zero and negatives all reach the caller — because « no span at all » is a different
  refusal in each: `null` for the Rail's clamp, « leave `x_D` where it is » for the reducer's.
  Sharing the policy too would have been a behaviour change this ticket forbids.

The corrected census, the two kinds and where a third geometry mode has to be taught the span are
recorded on the `Geometry` union itself. **One thing left standing and named here:**
`values.ts`'s `applyGeometry` and `state.ts`'s `withViewpoint` are two paths that both claim « the
clamp is on every path » and clamp *differently* — `clampRider` sends a non-finite `x_D` to 0,
`clampX` returns it unchanged. Unifying them moves behaviour, so it is not this ticket's; it wants
one of its own.

#### 5 · Verified — the fusion survived ticket 37

37 rewrote exactly this region to merge `s_D` into the sample set, and the loops are still fused:
one `k` loop body holding the cable vertex and, nested under `if (ground !== null && k > 0)`, the
terrain vertices strictly inside that segment, sharing `stepMin` / `stepMinX` / `cableInGround` and
the forward cursor `g`. Both halves are still documented in place, and 37's `insertAt` correction
sits inside the same body rather than beside it. Nothing to do, which is the item's whole point.

#### The independent review, and what it changed

Run against `560f890..cc7e4d5`, pre-rebase. It confirmed parity in both directions and confirmed the item 2
decline on the code. Four things moved because of it:

1. **The item 4 record was wrong on two facts** — « four modules » (it is eleven) and « a helper
   returning a string cannot do that » (`geometryMode` already exists and is in use). Checked into
   a *type definition*, which is the most authoritative place in the repo to be wrong. Rewritten,
   and the census re-taken by hand.
2. **The real duplication item 4 was after was still there** — the two `spanOf` derivations. Now
   `spanOfGeometry`.
3. **The first new test asserted the implementation back to itself.** Replaced with the
   `Math.max` / `indexOf` cross-check, and the two uncovered paths added.
4. **`EndTensionEnvelope` beside `EndEnvelope`** in the barrel — two names for adjacent concepts.
   The per-end shape is inline now, and only `TensionEnvelopeScan` is exported.

Finding « the ticket file is untouched » is this entry.
