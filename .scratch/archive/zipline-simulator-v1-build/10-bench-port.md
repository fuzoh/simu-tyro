# E7b · The bench, ported out of the prototype

Stage: E7b
Status: done
Blocked by: 09
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 10 (E7b), § 11

## Delivers

`src/lib/sim/sweep.bench.ts` plus the **p95 tripwire test**, ported the moment `evaluateClearance`
exists. `check.ts`'s §15 assertions land as Vitest cases in the same move.

## Gate

p95 of `sweep()` **+** `evaluateClearance` **≤ 8 ms** at 240 steps. Assert the criterion, never the
measurement.

## Notes

- **Port now or the only measured performance evidence on this map becomes unreproducible.** Ticket
  12's tripwire — « re-run the bench if anything raises `260 × 60` » — currently names
  `/prototype/profile-view?variant=D&scenario=taut`, a route scheduled for deletion. Ported, it
  names `bun run bench`.
- Reproduce the **harness shape**: 40 runs per cell; `SWEEP_STEPS` at 100, 240, 500; the three
  worst-conditioned spans (1000 m quasi tendu, 1000 m très mou, 1500 m long); p95 of the **pair**,
  since both run on a parameter change.
- **What does not survive the port, stated rather than quietly lost:**

  | Measurement | Fate |
  | --- | --- |
  | `sweep()` + `evaluateClearance` p95 (1,30 ms at 240, 2,30 ms at 500) | ported, but **re-measured in Node, not Chromium** |
  | auto-drag frame p50 16,70 / p95 18,40 ms against a 16,7 ms vsync | **not portable** — jsdom has no vsync, no rAF cadence, no layout |
  | the ~0,1 ms `performance.now()` clamp caveat | Node's timer is finer; several cells stop reading equal |

- So the ported bench is a **relative tripwire**, not a reproduction of 1,30 ms. The margin is ≈6× at
  240 steps and ≈3,5× at 500, which is what makes a threshold assertion stable in CI.
- The drag figure is re-taken **by hand in a real browser at A12** — because the conclusion it
  supports (dragging is vsync-bound, so off-threading would not have made it smoother) is one of the
  two independent reasons there is no Web Worker.
- tinybench exposes no `p95`, so the threshold assertion is a plain `test` timing 40 runs and taking
  its own p95.

## Comments

**Built.** Three files, all in `src/lib/sim/`:

- **`bench-harness.ts`** — the ported harness, and the only definition of a cell: the three
  worst-conditioned spans (1000 m quasi tendu, 1000 m très mou, 1500 m long) with the prototype's
  fabricated rolling ground, `BENCH_RUNS` 40, `BENCH_STEP_COUNTS` 100 / 240 / 500,
  `PAIR_P95_BUDGET_MS` 8, `percentile` (the prototype's own index rule, verbatim), `timePair`
  (sweep **then** clearance, timed together) and `measurePair` (a discarded warm-up, then `runs`
  timed pairs, reporting p95, p50 and the lowest coverage seen). Its docblock carries the
  three-row « what does not survive the port » table.
- **`sweep.bench.ts`** — `bun run bench`, nine pair cells plus the prototype chip's own
  sweep/clearance split, `{ iterations: 40, time: 0 }` so 40 runs is the count and not a floor.
  Asserts nothing.
- **`bench-harness.test.ts`** — the p95 tripwire, in `bun run test`: per span, coverage `=== 1`
  (a sweep that loses steps is *faster*, so the guard is what keeps the budget meaningful) and
  p95 of the pair at 240 steps ≤ 8 ms. Plus `260 × 60` asserted as the product the bench measured
  — the ticket-12 tripwire now has a CI owner — and three cases on `percentile`.

Gates green: `typecheck`, `lint-type-aware`, `test` — 288 cases over 9 files. Measured in Node,
`bun run bench`: pair p95 ≈ 2,0–2,6 ms at 240 steps and ≈ 3,5–4,6 ms at 500 across the three
spans, coverage 1,000 everywhere; the clearance half is 4–13× the sweep half, which is § 10's
« the larger half of the frame budget » reproduced. **Nothing asserts those numbers** — only the
8 ms criterion is.

`check.ts`'s §15 assertions already landed as Vitest cases in tickets 04–09 (F1 in
`catenary.test.ts`, Z1–Z3 in `solve.test.ts`, Z4 in `loads.test.ts`, Z5 in `sweep.test.ts`), so
this ticket added none; the prototype still stands, untouched, and `solver.ts` was read only as a
record of *what* the chip timed.

**Judgement calls.**

- **The harness is its own module rather than living in `sweep.bench.ts`.** The tripwire must run
  under `bun run test`, and `vitest bench` replaces `test.include` while it runs — so an assertion
  inside a `*.bench.ts` never executes in CI, and a `*.test.ts` importing one would evaluate
  top-level `bench()` calls in test mode. One shared, call-free module is the only shape in which
  the bench and the gate cannot measure different lines; `bench-harness.test.ts` keeps
  testing.md's « one test file per source file, same basename ».
- **The tripwire is not in `sweep.test.ts`.** That file `vi.mock`s `solve.ts` to inject a lost
  step, which wraps every solve in a counting closure — timing anything there would measure the
  mock.
- **Bench ground is capped at § 4's 200-point export ceiling**, where the prototype's generator
  emitted 300. The prototype's reducer only interpolated at cable vertices, so its terrain count
  barely showed; this engine scans the terrain's own vertices too, and 200 is the worst ground the
  app can be handed. Benching 300 would time an input the CSV seam refuses.
- **p95 is taken over the 40 per-run pair totals**, where the prototype's chip summed two
  independently-taken p95s. It measures the same thing the user waits for and is the stricter
  reading of « p95 of the pair »; the summed form is recoverable from the bench's split cells.
- **The gate is asserted at 240 steps only** — the criterion's own step count. 100 and 500 stay in
  the bench, where a human reads them.
- **`describe` titles are template literals** (`` `${cell.key} · ${cell.label}` ``) because
  `vitest(valid-title)` refuses a bare identifier as a title.
