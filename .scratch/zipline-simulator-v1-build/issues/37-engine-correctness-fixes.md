# 37 — Engine correctness fixes from the v1 review

**What to build:** Close the five defects the post-v1 algorithmic review confirmed in `src/lib/sim/**`
and its result consumers. One of them makes the safety read-out optimistic; the rest are seed,
provenance and formatting defects that do not move a converged answer.

**Blocked by:** —

**Status:** open

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

- [ ] The rider node is evaluated at every load position; the 150 m / −10 m case reports the vertex
      value, and the § 15 fixtures still reproduce bit for bit.
- [ ] Ticket 09's measured garde figures are re-taken and the ones that move are re-recorded, with
      the direction of each change stated.
- [ ] `sweep()` and `evaluateClearance` stay inside ticket 09's p95 budget (≤ 0,6 ms / ≤ 1,7 ms).
- [ ] Seeds read § 6.1 one way; `solve.ts:228` is decided on its own derivation, not by analogy.
- [ ] § 13.1's 6 mm triple is settled in the theory doc, and `steel.test.ts`'s docblock no longer
      cites a record that does not exist.
- [ ] No `toFixed` outside `src/lib/format/quantity.ts`.
- [ ] `bun run typecheck`, `bun run lint-type-aware` and the unit suite pass.

## Comments
