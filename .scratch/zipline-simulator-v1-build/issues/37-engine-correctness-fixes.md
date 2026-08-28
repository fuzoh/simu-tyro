# 37 — Engine correctness fixes from the v1 review

**What to build:** Close the five defects the post-v1 algorithmic review confirmed in `src/lib/sim/**`
and its result consumers. One of them makes the safety read-out optimistic; the rest are seed,
provenance and formatting defects that do not move a converged answer.

**Blocked by:** —

**Status:** closed 2026-08-28

Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 4, § 5, § 6, § 10, § 11, § 13 ·
amends the delivery of tickets [06](./06-solve-damped-newton.md),
[09](./09-terrain-and-clearance.md), [11](./11-materials-steel-and-textile.md) and
[25](./25-rail-output-half.md).

**Source:** two-axis code review of 2026-08-15, fixed point = root. The core math was re-derived by
hand and F1 and Z1–Z5 re-solved independently at 40 digits; **every § 15 value reproduces**
(`F1 z(L₀)=24,239248…`, `Z3 H=1286,37815…`, `Z5 x_D=59,957820…`), § 2.1's sign trap is avoided at
`catenary.ts:119`, the load-jump telescoping in `xAt`/`zAt`/`jacobianAt` is the right integral, and
all four Jacobian partials differentiate the residual they claim to. `__fixtures__/theory-15.ts`
pins the doc's numbers rather than the code's output, and its `rejected` block is a genuine
discriminator. **What follows is the whole of what the review found wrong** — nothing here questions
the solved shape.

## 1 · `h_min` never evaluates the rider node — the one non-conservative error

`src/lib/sim/clearance.ts:169-215`. § 11 fixes the worst point per load position **at `x = x_P`**.
The scan walks `samplesPerStep + 1` points uniform in `s` (`clearance.ts:171`), and `s_D` is not on
that grid, so **the rider kink — the loaded low point — is never sampled**. The reported minimum is
read off the two neighbours of the vertex instead of the vertex itself, and the cable is convex
there, so the miss is always in the optimistic direction.

Measured on a 150 m span at −10 m dénivelé, steel:

| | garde |
| --- | --- |
| scan as shipped | 13,0743 m |
| the rider node itself | 13,0594 m |
| **error** | **+14,9 mm, non-conservative** |

The terrain half of the scan compounds it: a ground vertex strictly inside a cable segment is
compared against the segment's **chord** (`clearance.ts:199`), which sits above the convex cable by
that segment's own sag.

[Ticket 09](./09-terrain-and-clearance.md) records this trade knowingly — 18,5 mm smooth, 69 mm over
a ridge — and its docblock reasons the residual is bounded by the cable spacing. That reasoning is
sound for the *convexity* miss and does not cover the *rider vertex*, which is a kink, not a sag.
**Fix: force `s_D` into each step's sample set**, so the loaded low point is always evaluated. It is
one extra sample per step, not a denser grid — the frame budget ticket 09 protects is untouched.

Until it is fixed, the number the pinned safety header shows is optimistic by a margin the UI does
not disclose.

## 2 · § 6.1's `V_B` identity is halved in two seeds

`src/lib/sim/solve.ts:215`. § 6.1 fixes `V_B = V₀ + w·L₀ + ΣP`, so inverting it gives
`V₀ = V_B − w·L₀ − P`. The Peyrot–Goulois seed computes `V_B` from § 5.2 and then subtracts
`w·L₀ + P/2`:

```ts
push(Math.max(Math.abs((w * L) / (2 * lambda)), SOLVER.tolerance), VB - w * L0 - P / 2);
```

`solve.ts:228` applies the same `− P / 2` to `straightBarIterate`'s result. The parabolic seed at
`solve.ts:223` and the fallback at `solve.ts:230` are **not** in scope: they derive `V₀` from a
symmetric split, where `−(w·L₀ + P)/2` is the consistent form. Check 228 against the bar iterate's
own derivation in the same pass rather than assuming it is the same defect.

**Impact is robustness, not accuracy.** These are seeds; the sweep's warm start dominates, and the
solver still holds `‖r‖ ≤ 1e-8` from `L₀ = chord ± 1e-8` through deep slack. But one function
currently carries two incompatible readings of § 6.1.

## 3 · § 13.1's only `[STD-ATTESTED]` check points are unasserted and do not reproduce

`src/lib/sim/materials/steel.ts:114` · `src/lib/sim/materials/steel.test.ts:26-28`.

§ 13.1 lists 6 mm 6×19 at **12,9 kN** (1770 FC) and **14,4 kN** (IWRC). `steelFormula`'s
`K[construction] · d² · R0` gives **21,03** and **22,69 kN**. The test docblock skips them on the
grounds that « §13.1 itself records that a per-diameter MBL table and these `K`-factors disagree » —
but § 13.1 records that about **R1's table**, not about these pairs.

On balance **the code is right**: § 13.1's own 10 mm cross-check (58–63 kN) reproduces exactly, so
the garbled value is the doc's. `MBF` is what the verdict divides by, which makes this the wrong
place to leave an unexplained gap. **Resolve it in `docs/simulation-theory.md` § 13.1**, then either
assert the corrected pairs or record the reason in provenance terms rather than in a test comment.

## 4 · `divisor()` opens a second precision path

`src/lib/rail/results.ts:667-669` — the **only** `toFixed` in the file, called from lines 253, 419,
421, 485 and 498:

```ts
function divisor(k: number): string {
  return k.toFixed(1).replace(".", DECIMAL_MARK);
}
```

This breaks `src/lib/format/quantity.ts`'s single-table invariant — nothing outside that module
formats a quantity. The docblock's reason is real: `k` cannot join `QUANTITIES` under that name
because § 3's table already spends `k` on textile relative stiffness. That argues for a **distinct
`QuantityId` (`regimeK`)**, not for a second rounding site the table cannot see.

## 5 · § 4.3's near-taut guard is unreachable where the spec expects it

`src/lib/sim/solve.ts:117-122`. `straightBarIterate` returns `null` unless `T = (chord/L₀ − 1)·EA`
is positive, i.e. unless **`L₀ < chord`** — a stretched line. So § 4.3's `w·L₀/H < 1e-4` branch
cannot fire on a slack one. Benign today (`w·L₀/H` bottoms out near 0,14 on realistic spans), but
decide it explicitly: either give the branch a reachable path or delete it as unreachable.

## Out of scope — no action

§ 12 (dynamics and braking, Z8) and § 9 (thermal and creep, Z7) are absent from `src/lib/sim/**`.
That is the v1 scope boundary, not a defect. No scope creep was found in the engine: DAF 1,2
`[FIELD:SSF]`, `h_rider` 2,1 m, `m_p` 120 kg and the `k = 1,1·k` margin all trace to the build spec,
and § 10.1's comparison directions, boundary handling (`FS = k` → *marge faible*) and `η_t·MBF/k`
ordering all match.

## Gate

- [x] The rider node is evaluated at every load position; the 150 m / −10 m case reports the vertex
      value, and the § 15 fixtures still reproduce bit for bit.
- [x] Ticket 09's measured garde figures are re-taken and the ones that move are re-recorded, with
      the direction of each change stated.
- [x] `sweep()` and `evaluateClearance` stay inside ticket 09's p95 budget (≤ 0,6 ms / ≤ 1,7 ms).
- [x] Seeds read § 6.1 one way; `solve.ts:228` is decided on its own derivation, not by analogy.
      **Both decided against this ticket's prescription** — the four seeds already read it one way
      and the prescribed patch broke it (voir ## Comments).
- [x] § 13.1's 6 mm triple is settled in the theory doc, and `steel.test.ts`'s docblock no longer
      cites a record that does not exist.
- [~] No `toFixed` outside `src/lib/format/quantity.ts` — `results.ts` closed; `provenance.ts:161`
      left standing and disclosed, because it needs a § 3 decision this ticket does not carry
      (voir ## Comments).
- [x] `bun run typecheck`, `bun run lint-type-aware` and the unit suite pass.

## Comments

### All five landed — 2026-08-28, six commits

`3b23cbe` · `459f490` · `e4238c7` · `aed1f7e` · `ce8b8f7` · `937bc1d`. Fixed point for the numbers
below is `e4238c7~1`, i.e. the tree the review read. `bun run typecheck`, `bun run lint-type-aware`
and **1359 unit cases** green; the § 15 fixtures (`F1`, `Z1`–`Z5`) are untouched and reproduce bit
for bit — the diff to `__fixtures__/theory-15.ts` contains no § 15 row at all.

#### 1 · The rider node — the read-out was optimistic by 23 mm, not 15

`s_D` is now **merged into** each step's ascending sample set (`insertAt = ⌈s_D·n/L₀⌉`), one extra
sample per step rather than a denser grid. Ascending order is preserved because the terrain cursor
below depends on it; an `s_D` that lands on a grid point evaluates that point twice, which a minimum
absorbs.

Measured on 150 m at flèche à vide 6,0 m, acier 12 mm IWRC, ancrages 12 / 12 m, `h_rider` 2,1 m,
260 pas — the ticket's own case did not state its anchor heights, so this is the same geometry
re-stated (the ticket's own §1 case is not reproducible as written — 13,07 m of garde needs anchor
heights it does not state):

| dénivelé | scan as shipped | the rider node | error |
| --- | --- | --- | --- |
| −10 m | 2,452638 m à x 74,504 | **2,429606 m** à x 74,819 | +23,03 mm, non-conservative |
| −18 m (la ligne livrée) | 2,440163 m à x 74,117 | **2,417094 m** à x 74,430 | +23,07 mm |

Same sign and order as the ticket's +14,9 mm; the magnitude is the geometry's.

**Ticket 09's two residual figures are re-taken and both collapse.** Refining the cable grid
60 → 4000 recovered 18,5 mm on smooth ground and 69 mm over a 5 m ridge placed where the kink
passes. It now recovers **0,00 mm** and **0,13 mm** — on smooth ground the traverse minimum sits
*on* a sampled vertex, so there is nothing left to recover, and what remains over the ridge is
§ 4's unloaded convexity alone. Both are asserted at 1 mm in `clearance.test.ts`.

**Every `[MEASURED]` garde moved down. None moved up.**

| row | before | after | move |
| --- | --- | --- | --- |
| first-run traversée | 2,442178 m à x 74,1170 | **2,42 m à x 74,4** | −23,06 mm, +0,314 m |
| dénivelé 0 / −18 / −40 / −60 | 2,457865 / 2,442178 / 2,366094 / 2,246617 | **2,43 / 2,42 / 2,34 / 2,22** | −23,00 / −23,06 / −23,23 / −23,70 mm |
| flèche 5 / 6 / 7 / 8 | 3,385605 / 2,440163 / 1,440832 / 0,403679 | **3,37 / 2,42 / 1,41 / 0,37** | −20,18 / −23,07 / −26,12 / −29,30 mm |
| ancrages 12 / 6, flèche 6 | −1,530257 m | **−1,55 m** | −18,27 mm |
| `L₀` 400 m sur 200 m | −169,667110 m | **−170,24 m** | −569,44 mm |
| `L₀` 200,5 m | −7,587399 m | **−7,61 m** | −23,12 mm |

Each delta is the *exact* difference between the two scans, not a subtraction from the rounded
record — a delta formed against a 2-decimal record carries ±5 mm of that record's own rounding, and
the first pass of this table did exactly that and mis-stated six of the ten. The « before » column
therefore carries six digits where the fixture carries two.

The deep-slack row moves furthest because 200 m of slack drops the kink's corner far below the chord
its two neighbours span. Re-recorded in `__fixtures__/theory-15.ts` with the direction on each row,
and in the six consumer sites that had copies: the app's own manual-ground disclosure (« garde min
2,43 / 2,42 / 2,34 / 2,22 m »), `first-run.ts`, `scene.test.ts`, `results.test.ts`,
`contract.test.ts` and two `clearance.test.ts` titles.

**Two consequences worth naming.**

- On § 4's straight two-point ground the traverse minimum now sits **on** the rider's own position,
  so `atRiderX` equals `atX` (74,4 m either way, 0,9 m apart before). They part again on an
  imported profile — `example-profile-trace1.csv` at ancrages 12 / 12 reads « Garde min (traversée)
  6,81 m — passager à x 20,9 m » against « Garde min. ligne (à x 14,7 m) 8,64 m », so **ticket 41's
  shape B+ still has its case** and its relabel bit still fires.
- **Ticket 41's recorded ordering violation is closed.** `worst.hClear ≤ underRider` held 65 mm the
  wrong way at `x_D` 75 (2,48 against 2,42, excess 0,06455 m) and the excess is now **0,000 mm over
  all 260 steps at both anchor pairs**. `scene.test.ts`'s « the two differ … and the printed one is
  the optimistic one » is rewritten as the closure it now is.

**Frame budget.** The fix adds one sample in 61. On the shipped line, 200 runs each in Node:
`sweep()` p50 0,28–0,31 ms / p95 0,57–0,69 ms, and `evaluateClearance` p50 1,00 ms against ticket
09's ≤ 1,7 ms, moving by −0,005 to +0,010 ms — inside the noise. `bench-harness.test.ts`'s enforced
tripwire (the pair, ≤ 8 ms p95, three worst-conditioned cells) reads p95 3,75 / 2,64 / 2,21 ms
against 3,07 / 2,33 / 2,17 before, with p50 unmoved (2,04 / 2,08 / 1,90 against 2,04 / 2,09 / 1,95).

**Unblocks [39](./39-clearance-strip-investigation.md) item 5.** The strip's noise *was* this scan's:
the first-run curve had 55 direction reversals where the shape has two, and it now has **3**. 39's
item 5 can be re-measured on this tree.

#### 2 · § 6.1's `V_B` — **the ticket's diagnosis is refuted, and the code is unchanged**

The ticket reads `VB - w*L0 - P/2` as § 6.1's inversion with a halved `ΣP` and prescribes
`VB - w*L0 - P`. That prescription was implemented, then **reverted**, because the premise does not
hold: § 5.2's `V₀,B = (w/2)·(h/tanh λ₀ + L₀)` carries **no `P`** — it is `V_B` at `ΣP = 0`, and its
`w·L₀/2` prefactor *is* the symmetric split. § 6.1 then gives
`V₀ = (V_B,unloaded + ΣP/2) − w·L₀ − ΣP = V_B,unloaded − w·L₀ − ΣP/2`, which is the line that was
already there.

The check that decides it needs no solver at all — a level span with the trolley at mid-span, where
symmetry fixes `V₀ = −(w·L₀ + ΣP)/2` exactly. `L` 100 m, `L₀` 101 m, `w` 5,36 N/m, `ΣP` 1177,2 N:

| | `V₀` |
| --- | --- |
| symmetry, exact | **−859,280000** |
| `solveSpan`, converged | −859,280000 |
| `V_B − w·L₀ − ΣP/2` (what shipped, and ships) | **−859,280000** |
| `V_B − w·L₀ − ΣP` (what the ticket prescribed) | −1447,880000 — **off by `ΣP/2` = 588,6 N** |

So **all four seeds already read § 6.1 one way**: the symmetric split, reached through § 5.2's `V_B`
in one and through the bar's own derivation in the other. `solve.ts:228` is confirmed correct on the
bar's derivation, exactly as the ticket asked — but for the reason that makes the *other* line
correct too, not as an exception to it.

The prescribed patch was measurably worse, which is how it was caught: it cost Z4 and Z5 an
iteration (6 → 7), moved their converged `H` by 4,1×10⁻⁴ N and 6,5×10⁻⁴ N — inside § 5.3's
`‖r‖ ≤ 10⁻⁸` but **not bit for bit**, breaking this ticket's own gate — and pushed `sweep.test.ts`'s
one-sided-θ identity from *exactly* 0 to 4,5×10⁻¹² of its analytic value, which is what forced a
12 → 11 decimal relaxation there. All of that is reverted: Z4/Z5 are back to
`H = 7898,162877906`, `V₀ = −1091,000000000` in 6 iterations, θ passes at 12 decimals again, and
§ 15 reproduces bit for bit.

What the ticket does buy is that the reading is now **pinned rather than inferred**: the derivation
is in `seedIterates`' comment, and three cases assert it — the exact symmetric check above, the
`−ΣP/2` shift on a § 15 row, and the bar's independent route to the same constant. A future reader
re-diagnosing this line has to get past a test that names the number.

#### 3 · § 13.1's 6 mm triple — the doc was wrong, and now says so

`K · d² · R₀ / 1000` gives **21,03 / 22,68 / 23,28 kN** for 6 mm 6×19 at 1770 FC / 1770 IWRC /
1960 FC. The transcribed « 12,9 / 14,4 / 21,0 » reproduces none of them, and the quoted
« 21,0 (1960 FC) » is in fact the 1770 FC computation mislabelled — while the same factors reproduce
§ 13.1's own 10 mm cross-check (58–63 kN) exactly. Demoted to `[UNVERIFIED:R2]` in § 13.1 and
recorded as **§ 14 #21**; the recomputed triple is asserted in `steel.test.ts`, and the docblock no
longer cites a record about R1's table as if it were about these pairs.

#### 4 · `regimeK`

`divisor()` renders through `formatValue("regimeK", k)`; the row is dimensionless at one decimal and
carries its own reason (§ 3's `k` is textile relative stiffness, a different grandeur sharing a
letter). Byte-identical at all five call sites, verified in the browser too: « Dans les limites —
EN 15567-1 (k = 3,0) », « exigé 3,0 », « Tension totale — k = 3,0 ».

**On the gate's « no `toFixed` outside `quantity.ts` », which is why that box is `[~]` and not
`[x]`:** `rg -n toFixed src/` leaves two non-test sites.

- `layout/contract.ts:643, 670, 810` — the VE badge (`×4,7`) and `clearanceTickLabel`. **Defensible
  and left alone**: a drawing exaggeration is not a physical quantity, and the tick label
  deliberately drops trailing zeros (« 6 m », never « 6,00 m »), which the table cannot express.
- `terrain/provenance.ts:161` — `fr()`, which renders a **max spacing** and a **lateral deviation**,
  both lengths in metres, into user-visible copy. Its docblock's defence (« § 3's table has no row
  for either ») is *word for word* the defence this ticket rejected for `divisor()`. On that reading
  the box is **not satisfied**, and the honest answer is that closing it means adding two rows to
  § 3's table, each needing a justified precision minimum — a § 3 decision, not a refactor, and one
  this ticket does not carry. Left standing, stated here, and it wants a ticket of its own.

#### 5 · § 4.3's near-taut guard — kept, with its path stated

**Decision: keep the branch.** The fallback it gates is the straight elastic bar, which exists only
where `T = (chord/L₀ − 1)·EA > 0` — a stretched line — so it is a stretched-side branch *by
construction*, and `solve.test.ts`'s existing near-taut case takes it. No slack twin is owed, and
that is now measured rather than assumed:

- On the slack side `w·L₀/H` has a **floor**, because a slack line's `H` is bounded by its own
  elastic stretch. At `L₀ = chord + 10⁻⁹` on a level 100 m span it measures **0,120** at the shipped
  rope's `EA` 6,9 MN, 2,29×10⁻² at 1 GN, 2,29×10⁻³ at 1 TN, 6,15×10⁻⁵ at 1 PN — § 4.3's 10⁻⁴ is
  first crossed near `EA` 10¹⁵ N, six orders above any rope.
- Where the band *is* reached, Newton converges unaided: `EA` 10¹⁵ N takes two damped iterations,
  10¹⁸ N takes none, and neither emits a note.

Both ends are asserted, so « leave it to Newton » is a measurement in the suite rather than a
comment.

#### Browser evidence (amendment B)

`HeadlessChrome`, `agent-browser`, the dev server on `:3000`. The **Pinned Safety Header's one live
cell** renders « Garde min. ligne 2,42 m » at 44 px with its box top flush to the row (viewport
390 × 400, the constrained-height tier), and the Rail reads « Garde min (traversée) 2,42 m —
passager à x 74,4 m » at 1440 × 900: the shipped read-out moved **in the conservative direction**
and nothing else about it moved. The régime divisor, the manual-ground disclosure's re-recorded
series and the imported-profile relabel were all re-read in the same session (figures above).

### Independent review, and what it changed — 2026-08-28

A second pass re-derived the numbers rather than reading them, and it earned its keep. Six things
moved as a result; the review is recorded here because two of them contradict the ticket.

1. **Defect 2 is refuted, not fixed.** The prescribed seed is off by `ΣP/2` against an exact
   symmetric answer, and the patch broke this ticket's own « § 15 reproduces bit for bit » box.
   Reverted; the derivation is now pinned by three cases. Voir § 2 above for the measurement.
2. **Six of ten re-recorded deltas were wrong** by 2–5 mm, because they were formed against the
   *rounded* old record instead of the old scan's exact value; two summary claims (« 19 to 27 mm »,
   « the same two-and-a-half centimetres ») were false. Recomputed exactly, every row.
   **All thirteen recorded *values* reproduced** — it was only the stated moves that were sloppy.
3. **Four consumer sites still held pre-fix gardes**, one of them the user-visible manual-ground
   disclosure with a test locking the superseded string — a green suite over a wrong safety figure,
   the first-run lock's failure mode inverted. Closed in `937bc1d`.
4. **`clearance.ts`'s tripwire figure was mis-edited** to « 260 × 61 ». The tripwire is the *grid*,
   `CLEARANCE.samplesPerStep`, still 60 and defined in three other files; the per-step evaluation
   count is 62, not 61. Restored, and the evaluation count stated separately.
5. **The merge's ascending order was nearly true, not true.** `⌈s_D·n/L₀⌉` and the grid expression
   round differently, so an `s_D` within an ulp of a grid point could emit a sequence stepping back
   ≈10⁻¹⁴ m — 6 cases in 100 005 brute-forced `(s_D, n)` combinations. Physically nil, but the
   terrain cursor's docblock *relies* on the order, so the index is now corrected against the grid
   values themselves. Two comparisons per step.
6. **Three smaller ones**, all taken: `quantity.test.ts`'s « one case per row of § 3's table » is
   false now that `regimeK` exists and says so; `steel.test.ts`'s new cases asserted 4–5 decimals
   taken from the implementation and now assert § 13.1's own two; and `solve.ts`'s near-taut floors
   were labelled as the shipped rope's when the line measured carries `w` 5 N/m, not 5,36.
   `scene.test.ts`'s exact float equality between two independently-computed paths is a
   `toBeCloseTo(…, 12)`.

Verified and left alone: the merge is correct at `s_D = 0`, `s_D = L₀`, `s_D` on a grid point and
`samplesPerStep = 1`; a duplicated sample changes no reported number (a minimum is idempotent, and
the terrain cursor has already consumed everything a zero-width segment could see); the scan is
exactly `samplesPerStep + 2` evaluations; the 0,00 / 0,13 / 0,000 mm figures reproduce; and gate
box 3 re-measures independently at `sweep()` p95 **0,382 ms** and `evaluateClearance` p95
**0,914 ms**, inside ticket 09's ≤ 0,6 / ≤ 1,7 ms.

Final state: `bun run typecheck` and `bun run lint-type-aware` clean, **1360 unit cases** green,
§ 15 bit for bit (`Z3 H = 1286,378149147`, `Z4`/`Z5` `H = 7898,162877906` in 6 iterations).
