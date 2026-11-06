/**
 * The bench a human reads — `bun run bench` (`vitest bench`), « v1 build spec » § 10 (E7b) and
 * § 11, *Benches*. Ported out of the prototype's « bench ×40 » chip, which lived at
 * `src/routes/-prototype-07/perf.tsx` **until ticket 36 deleted it**: unported, the only measured
 * performance evidence on this map would have become unreproducible, and ticket 12's tripwire
 * — « re-run the bench if anything raises `260 × 60` » — would still be naming a route that no
 * longer exists. It names `bun run bench`, which is why the deletion cost nothing.
 *
 * The harness — the three worst-conditioned spans, 40 runs per cell, the 100 / 240 / 500 step
 * counts, and what the port does *not* carry over — lives in
 * [`bench-harness.ts`](./bench-harness.ts), shared with the p95 tripwire so the two cannot measure
 * different lines.
 *
 * **This file asserts nothing.** A bench is never part of `bun run test` (bench files match only
 * `benchmark.include`, and `benchmark.enabled` is left unset on purpose), and tinybench
 * reports `p75` / `p99` / `p995` / `p999` and **no `p95`** — the criterion's own statistic. The
 * ≤ 8 ms gate therefore lives in `bench-harness.test.ts` as a plain timed `test`; this file exists
 * to show *where* the time goes when that gate moves.
 *
 * Reading it: the **pair** is the criterion — both halves re-run on every parameter change, so the
 * user waits for their sum. The split beneath it is the prototype chip's own, kept because it
 * answers the first question a regression raises: § 10's budget puts the clearance reducer at
 * ≤ 1,7 ms against `sweep()`'s ≤ 0,6 ms, so the larger half is the one that scales with `260 × 60`.
 *
 * The Node numbers here are **not** the prototype's 1,30 ms at 240 steps: that was Chromium, with
 * a ~0,1 ms `performance.now()` clamp Node does not have. Compare cells against each other and
 * against the 8 ms criterion, never against a Chromium figure.
 */

import { describe, test } from "vitest";

import { BENCH_CELLS, BENCH_RUNS, BENCH_STEP_COUNTS, timePair } from "./bench-harness.ts";
import { CLEARANCE, evaluateClearance } from "./clearance.ts";
import { sweep } from "./sweep.ts";

/**
 * 40 runs per cell, exactly — `time: 0` is what stops tinybench from topping the sample up to its
 * default 500 ms budget, which would make « 40 runs » a floor rather than the prototype's count.
 */
const CELL = { iterations: BENCH_RUNS, time: 0, warmupIterations: 5, warmupTime: 0 } as const;

for (const cell of BENCH_CELLS) {
  describe(`${cell.key} · ${cell.label}`, () => {
    test("pair", async ({ bench }) => {
      await bench.compare(
        ...BENCH_STEP_COUNTS.map((n) => bench(`pair · ${n} steps`, () => void timePair(cell, n))),
        CELL,
      );
    });

    test("the two halves", async ({ bench }) => {
      await bench.compare(
        ...BENCH_STEP_COUNTS.map((n) =>
          bench(`sweep · ${n} steps`, () => void sweep(cell.input, cell.riderP, n)),
        ),
        ...BENCH_STEP_COUNTS.map((n) => {
          // Solved once, outside the timed body: the reducer's cost is what this cell isolates, and
          // re-sweeping inside it would measure the pair again under a narrower name.
          const steps = sweep(cell.input, cell.riderP, n).steps;
          return bench(`clearance · ${n} steps`, () =>
            void evaluateClearance(
              cell.input,
              cell.riderP,
              steps,
              cell.terrain,
              cell.hRider,
              CLEARANCE.samplesPerStep,
            ));
        }),
        CELL,
      );
    });
  });
}
