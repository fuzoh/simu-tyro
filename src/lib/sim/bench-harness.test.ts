/**
 * The **p95 tripwire** — « v1 build spec » § 10 (E7b)'s gate: p95 of `sweep()` **plus**
 * `evaluateClearance` **≤ 8 ms at 240 steps**, on the three worst-conditioned spans.
 *
 * Why this is a plain `test` and not a bench assertion: `vitest bench` reports tinybench's
 * `p75` / `p99` / `p995` / `p999` and **no `p95`**, while the criterion is stated in p95 — so the
 * threshold is timed here, 40 runs, with the harness taking its own percentile. That also keeps the
 * gate inside `bun run test`: `vitest bench` replaces `test.include` while it runs, so an assertion
 * living in `sweep.bench.ts` would never execute in CI.
 *
 * **Assert the criterion, never the measurement.** The Node figures this guards are ≈2–3 ms at 240
 * steps, and they are *not* the prototype's 1,30 ms: that one was Chromium, with a ~0,1 ms
 * `performance.now()` clamp Node does not have. Nothing here may be tightened onto a measured
 * number — the budget is the contract, the margin is what makes it stable under a loaded CI box.
 */

import { describe, expect, test } from "vitest";

import {
  BENCH_CELLS,
  BENCH_RUNS,
  PAIR_P95_BUDGET_MS,
  measurePair,
  percentile,
} from "./bench-harness.ts";
import { CLEARANCE } from "./clearance.ts";
import { SWEEP, sweepGrid } from "./sweep.ts";

describe("the pair's p95 at 240 steps — § 10 E7b's gate", () => {
  for (const cell of BENCH_CELLS) {
    // One measurement per cell, read by both assertions: timing it twice would double the
    // suite's slowest file for nothing.
    const timing = measurePair(cell, SWEEP.steps, BENCH_RUNS);

    describe(`${cell.key} · ${cell.label}`, () => {
      test("the traverse solves whole, so the timing measures work and not failure", () => {
        // A sweep that loses steps is *faster*. Without this the budget could go green on a cell
        // that stopped computing.
        expect(timing.minCoverage).toBe(1);
      });

      test(`p95 of sweep() + evaluateClearance ≤ ${PAIR_P95_BUDGET_MS} ms over ${BENCH_RUNS} runs`, () => {
        expect(timing.p95).toBeLessThanOrEqual(PAIR_P95_BUDGET_MS);
      });
    });
  }
});

describe("the tripwire the bench arms — « re-run the bench if anything raises 260 × 60 »", () => {
  test("the benched budget is still 260 sweep steps × 60 clearance samples", () => {
    // The frame budget is the **product** of the two, and neither constant lives beside the other:
    // `SWEEP.steps` names the uniform steps only (the grid appends 10 geometric tail steps per
    // end), `CLEARANCE.samplesPerStep` is the inner scan. Raising either re-opens `bun run bench`,
    // and this is where a raise gets caught.
    expect(sweepGrid(1000, SWEEP.steps).length).toBe(260);
    expect(CLEARANCE.samplesPerStep).toBe(60);
  });
});

describe("percentile — the prototype's index rule, ported verbatim", () => {
  test("p95 of 40 samples is the 39th slot, as the prototype's chip read it", () => {
    const samples = Array.from({ length: 40 }, (_, i) => i);
    expect(percentile(samples, 0.95)).toBe(38);
    expect(percentile(samples, 0.5)).toBe(20);
  });

  test("p = 1 is the last sample rather than an out-of-range read", () => {
    expect(percentile([3, 1, 2], 1)).toBe(3);
  });

  test("it sorts, and it does not sort the caller's array", () => {
    const samples = [5, 1, 4, 2, 3];
    expect(percentile(samples, 0)).toBe(1);
    expect(samples).toEqual([5, 1, 4, 2, 3]);
  });
});
