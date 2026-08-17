# Sweep performance measurement and the Web Worker decision

Type: task
Status: resolved
Blocked by: — (07 resolved; measurements already taken, see Measurements below)
Map: [Zip-line simulator v1](../map.md)

## Question

Measure the sweep, then apply the criterion. Nothing to decide by argument — ticket 03 fixed
the criterion precisely so that this ticket is arithmetic.

> Move the sweep to a Web Worker iff p95 wall time of one full `sweep()` — 240 steps plus
> the end tails, 1000 m span, worst-conditioned case (deep slack or near-taut, where §5.1
> damping and §5.2 retries bite) — exceeds **8 ms**: half a 60 Hz frame, leaving the rest for
> React reconciliation and `d3-shape` path generation.

Do:

1. Measure against the ticket-07 prototype, not a synthetic harness — React reconciliation
   and SVG path generation are inside the frame budget the criterion is set against.
2. Measure `SWEEP_STEPS` at 100, 240 and 500 (§6.2's stated range) so the constant is chosen
   on data rather than inherited from ticket 03's guess.
3. Measure the worst-conditioned cases specifically, not the happy path: deep slack
   (approaching §4.3's `H → 0` floor) and near-taut (`w·L₀/H < 10⁻⁴`, the straight-bar
   branch), where iteration counts and re-seeds are highest.
4. Report p95, not mean — a stutter is a tail event.
5. Apply the criterion and record the answer.

Record whichever way it lands, including the measured numbers: the answer needs to survive
into the build spec, and "we measured 3 ms, main thread is fine" is what stops the question
being reopened on feel later.

## Context

Graduated from the map's fog. Ticket 03 decided the engine is **synchronous and pure
forever**, with async confined to the `useSweep(params) → { status, steps, envelopes, stale }`
seam — so this ticket cannot change the engine's shape, only what sits behind that hook.

If it lands on "worker": terrain already crosses as cloneable data
(`Terrain = { kind: "flat" } | { kind: "profile"; xs; zs }`), which was chosen in ticket 03
precisely to keep this option open. Nothing else in the sweep's inputs or outputs is a
closure.

If it lands on "main thread": the coarse-live/fine-on-release fallback stays unbuilt, and the
hazard that ruled it out (a coarse sweep can miss the worst clearance point and flash a green
verdict) is worth carrying into the spec as a warning against reintroducing it casually.

## Measurements — already taken (2026-08-05, ticket 07 session)

Steps 1–4 are **done**; this ticket is now only step 5, recording the decision. Taken in the
ticket-07 prototype in-browser (Chromium/V8, CachyOS desktop), 40 runs per cell, `p95` of one
full `sweep()` **plus** `evaluateClearance` — the pair, since both run on a parameter change:

| `SWEEP_STEPS` | 1000 m quasi tendu (near-taut) | 1000 m très mou (deep slack) | 1500 m long |
| --- | --- | --- | --- |
| 100 | 1,20 ms | 1,30 ms | 0,80 ms |
| **240** | **1,10 ms** | **1,30 ms** | **1,30 ms** |
| 500 | 2,30 ms | 2,10 ms | 2,00 ms |

`sweep()` alone: p95 ≤ 0,6 ms in every cell. The clearance reducer is the larger half
(p95 ≤ 1,7 ms) and scales with `steps × samplesPerStep`, not with the solver — the interesting
fact for anyone later tempted to raise either.

Drag cost, driving the rider one index per animation frame for 120 frames at 1500 m:
**frame p50 16,70 ms / p95 18,40 ms** against a 16,7 ms vsync interval — vsync-bound, not
compute-bound, because the slider is an index lookup plus one `sampleCable(200)`.

Caveats to state when recording the answer: one machine, one browser, and a fast desktop CPU;
`performance.now()` in Chromium is clamped to ~0,1 ms, which is why several cells read equal.
The margin against 8 ms is ~4× at 240 steps and ~3,5× at 500, so the conclusion survives a
considerably slower device — but the *measurement* is single-machine.

Reproduce: `bun run dev`, `/prototype/profile-view?variant=D&scenario=taut`, then the
`bench ×40` and `auto-drag` buttons on the perf chip (bottom-left).

## Answer

**No Web Worker.** The sweep stays on the main thread. Step 5 applied to the table above:

| | 240 steps | 500 steps |
| --- | --- | --- |
| Worst measured p95 (`sweep()` + `evaluateClearance`) | **1,30 ms** | **2,30 ms** |
| Criterion | 8 ms | 8 ms |
| Margin | **≈ 6,2×** | ≈ 3,5× |

This ticket was written to be arithmetic and it stayed arithmetic — the criterion was fixed in
ticket 03 *before* the numbers existed, which is the whole point, and the numbers clear it by
more than half an order of magnitude in the worst-conditioned case measured.

**`SWEEP_STEPS = 240` confirmed, not merely inherited.** Ticket 03 picked it by argument; the
data says it costs the same as 100 within Chromium's ~0,1 ms `performance.now()` clamp while
buying 2,4× the resolution. 500 also passes the criterion, so the constant is not load-bearing
for the decision — but there is no reason to spend the margin.

### What this ticket does *not* decide

**The `useSweep` seam stays, and that was never this ticket's to reopen.** Ticket 03 §"App
boundary" justified it independently: *"the cost of the unused state is ~zero because
stale-while-recomputing rendering is needed anyway"*. So `useSweep(params) → { status, steps,
envelopes, stale }` ships with `status` never reporting `"computing"` in v1, and that is not
dead code awaiting a worker — it is the shape stale-while-recomputing needs, which a
main-thread build needs too. Recording this explicitly because "we decided no worker, so drop
the async seam" is the obvious wrong inference from this answer.

Likewise unchanged: the engine core stays plain sync pure functions with no knowledge that
workers exist (which is what keeps §15 a set of one-line Vitest assertions with no async
harness in jsdom), and terrain still crosses as **data** rather than a closure. Ticket 03 chose
the data form partly to keep the worker door open; it keeps that property for free, so nothing
needs undoing.

### Carried into the spec

1. **The coarse-live/fine-on-release fallback stays unbuilt**, with its hazard recorded rather
   than forgotten: a coarse sweep can miss the worst clearance point and flash a green verdict.
   That is a safety failure, not a fidelity one, and it is the reason the fallback was ruled out
   even though it is the conventional answer to a slow sweep. Anyone reintroducing it "for
   smoothness" is trading a verdict's correctness for an animation.
2. **The clearance reducer is the larger half of the budget** (p95 ≤ 1,7 ms against `sweep()`'s
   ≤ 0,6 ms) and scales with `steps × samplesPerStep`, *not* with the solver. So the guard rail
   for future work is on that product, not on step count alone. This meets ticket 06's finding
   from the other side: vertex-only clearance evaluation is safe because the convexity miss is
   the cable's own sag across one terrain segment, **≈ 5 mm at 1500 m** — so densifying the
   clearance scan buys millimetres and spends the half of the budget that actually scales.
   Together those two facts close the question of raising either knob.

   **Amended 2026-08-12** — re-expressed per the round-1 elections §0.10 (coverage denominator):
   `SWEEP_STEPS = 240` names the uniform-step count only; `sweepGrid` appends 10 geometric tail
   steps per end, so the grid actually swept is **260** points, not 240. The guard rail above is
   on **260 × 60**, not 240 × 60.
3. **Dragging is vsync-bound, not compute-bound** (frame p50 16,70 ms against a 16,7 ms vsync
   interval). Worth stating because it makes the worker question moot from a second direction:
   even if the sweep were expensive, moving it off-thread would not make dragging smoother — the
   slider is an index lookup plus one `sampleCable(200)` and a path string, never a solve.

### Checked against the decisions taken since the measurement

The numbers were taken 2026-08-05, before [Results panel](./08-results-panel-and-provenance-warnings.md)
resolved. That ticket added the dynamically amplified envelope
`T_DAF = T_vide + DAF·(T_chargé − T_vide)`, so the measurement needed re-validating rather than
assuming: `T_vide` is **one** unloaded solve, not a per-step one, and the amplification is a
multiply-add per step per end over tensions the sweep already produces. No new pass over the
terrain, no new solve. The measurement stands.

### Caveats to carry, and the tripwire

One machine, one browser, one fast desktop CPU; several cells read equal because of the ~0,1 ms
clamp. The *conclusion* survives a considerably slower device on a ≈6× margin; the
*measurement* does not generalise and should not be quoted as a portable benchmark.

Re-run the bench — `bun run dev`, `/prototype/profile-view?variant=D&scenario=taut`, `bench ×40`
— if anything raises `steps × samplesPerStep`, or adds per-step work heavier than arithmetic on
values the sweep already has. Nothing decided through ticket 08 does either.

**Amended 2026-08-12** by [App shell and routing shape](./13-app-shell-and-routing-shape.md) §1:
the tripwire above names a route scheduled for deletion. Ticket 13 §1 elects exactly one route
(`/`); `src/routes/prototype.profile-view.tsx` ships publicly today only because it has not yet
been removed, and ticket 10 §8 deletes it after porting this bench. **Re-run the ported Vitest
bench** (not the prototype route) if anything raises `steps × samplesPerStep` or adds per-step work
heavier than arithmetic on values the sweep already has — port the bench harness and
`check.ts`'s §15 fixture assertions into the real build before the prototype is deleted, or this
tripwire becomes unreproducible.

**Inherited from [Responsive and narrow-screen layout](./15-responsive-and-narrow-screen-layout.md)**
— no change to the sweep. Recorded for completeness: ticket 15's ×1 clamp and its Plot Aspect Band
rule are per-render arithmetic on values the render already holds, so nothing new enters the drag
path measured above at frame p50 16,70 ms.
