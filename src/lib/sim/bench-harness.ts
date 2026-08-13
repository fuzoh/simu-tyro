/**
 * The performance harness, ported out of the prototype — « v1 build spec » § 10 (E7b) and § 11,
 * *Benches*. It is the shared half of two consumers: `sweep.bench.ts`, which a human reads through
 * `bun run bench`, and `bench-harness.test.ts`, which holds the **p95 tripwire** CI enforces.
 *
 * What the port reproduces, from `src/routes/-prototype-07/perf.tsx` (the « bench ×40 » button):
 * **40 runs per cell**, `SWEEP_STEPS` at **100 / 240 / 500**, over the **three worst-conditioned
 * spans** — 1000 m quasi tendu, 1000 m très mou, 1500 m long — and the p95 of `sweep()` **plus**
 * `evaluateClearance`, the *pair*, because both re-run on every parameter change. The prototype's
 * own index rule for a percentile is kept as-is, so a cell here reads against a cell there.
 *
 * **What does not survive the port, stated rather than quietly lost** (voir § 10 E7b):
 *
 * | Measurement | Fate |
 * | --- | --- |
 * | the pair's p95 (1,30 ms at 240, 2,30 ms at 500) | ported — but **re-measured in Node, not Chromium** |
 * | auto-drag frame p50 16,70 / p95 18,40 ms against a 16,7 ms vsync | **not portable** — no vsync, no rAF cadence, no layout in Node. Re-taken by hand in a real browser at A12, because the conclusion it supports (dragging is vsync-bound, so off-threading the sweep would not make it smoother) is one of the two independent reasons there is no Web Worker |
 * | the ~0,1 ms `performance.now()` clamp caveat | Node's timer is finer; several cells stop reading equal |
 *
 * So this is a **relative tripwire against the 8 ms criterion, not a reproduction of 1,30 ms**:
 * assert the criterion, never the measurement. The margin is ≈6× at 240 steps and ≈3,5× at 500,
 * which is what makes a threshold assertion stable in CI. The tripwire it arms is **« re-run the
 * bench if anything raises `260 × 60` »** — the sweep's grid times {@link CLEARANCE.samplesPerStep},
 * which is why both come from the engine's own constants here rather than from a literal.
 *
 * Rules this module exists to keep:
 *
 * - **No value in this file is asserted, and none is a fixture.** The three spans and their ground
 *   are the prototype's *fabricated* timing scenarios — inputs chosen to be badly conditioned, not
 *   physics. §15 stays the only fixture source, and nothing here is transcribed from
 *   `docs/references/`.
 * - **The engine stays dependency-free.** This is plain TypeScript over the public engine surface;
 *   `tinybench` is `sweep.bench.ts`'s business, not this module's.
 * - **The cells are one definition, read twice.** A bench cell and a tripwire cell that could drift
 *   apart would make the CI threshold guard something the human-read bench does not measure.
 */

import type { SpanInput, Terrain } from "./types.ts";

import { CLEARANCE, evaluateClearance } from "./clearance.ts";
import { sweep } from "./sweep.ts";

/** Runs per cell — the prototype's « bench ×40 ». */
export const BENCH_RUNS = 40;

/** Uniform sweep steps per cell. 240 is the shipped default and the one the criterion names. */
export const BENCH_STEP_COUNTS = [100, 240, 500] as const;

/**
 * The criterion, ms — § 10 E7b's gate on the **pair** at 240 steps. A budget, never a
 * measurement: the Node figure it guards sits ≈6× below it.
 */
export const PAIR_P95_BUDGET_MS = 8;

/** §6.3's rider design load, N — the prototype's timing rider. */
const RIDER_P = 1177;

/** §11's `[CONVENTION]` passenger envelope, m — `1,5 + 0,6`. */
const H_RIDER = 2.1;

/**
 * Terrain samples per cell. § 4's **measured CSV export ceiling** is 200 points, and the clearance
 * scan reads the terrain's own vertices on top of the cable's — so the worst ground the app can be
 * handed is the honest bench ground. The prototype's generator emitted 300, which its own reducer
 * never scanned vertex-by-vertex (it only interpolated at cable vertices); capping at the ceiling
 * benches an input the app admits rather than one it refuses.
 */
const GROUND_SAMPLES = 200;

/** One timing cell: a span, its rider and the ground under it. */
export type BenchCell = {
  /** Stable key, used in the bench's cell names. */
  readonly key: string;
  /** What makes this span badly conditioned, in one phrase. */
  readonly label: string;
  /** The span **without** a rider — `sweep` places one per step. */
  readonly input: SpanInput;
  /** Rider design load, N. */
  readonly riderP: number;
  readonly terrain: Terrain;
  /** Passenger envelope, m. */
  readonly hRider: number;
};

/**
 * Fabricated rolling ground — the prototype's own generator, kept because the *shape* of the
 * ground is what the clearance scan costs, not its realism. Gaussian bumps on the straight line
 * between the two anchor bases.
 */
function rollingGround(
  L: number,
  zA: number,
  zB: number,
  bumps: readonly { at: number; height: number; width: number }[],
  n: number = GROUND_SAMPLES,
): Terrain {
  const xs = new Float64Array(n);
  const zs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = (L * i) / (n - 1);
    const f = x / L;
    let z = zA + f * (zB - zA);
    for (const b of bumps) {
      const u = (x - b.at * L) / (b.width * L);
      z += b.height * Math.exp(-u * u * 4);
    }
    xs[i] = x;
    zs[i] = z;
  }
  return { kind: "profile", xs, zs };
}

/** A cell from the prototype's fabricated timing scenario, spelled out once. */
function cell(
  key: string,
  label: string,
  span: { L: number; h: number; L0: number; w: number; EA: number },
  ground: {
    zA: number;
    zB: number;
    bumps: readonly { at: number; height: number; width: number }[];
  },
): BenchCell {
  return {
    key,
    label,
    input: { ...span, loads: [] },
    riderP: RIDER_P,
    terrain: rollingGround(span.L, ground.zA, ground.zB, ground.bumps),
    hRider: H_RIDER,
  };
}

/**
 * The three worst-conditioned spans the prototype timed on — §4.3's two ill-conditioned regimes
 * (near-taut and deep slack) at 1000 m, plus the top of v1's range at 1500 m. Nothing here is a
 * default, a recommendation or a fixture: they are the slowest lines the input envelope admits.
 */
export const BENCH_CELLS: readonly BenchCell[] = [
  cell(
    "taut-1000",
    "1000 m quasi tendu — §4.3 near-taut, the worst-conditioned Newton",
    { L: 1000, h: -50, L0: 1001.45, w: 5.36, EA: 6.9e6 },
    { zA: -52, zB: -112, bumps: [{ at: 0.45, height: 12, width: 0.2 }] },
  ),
  cell(
    "slack-1000",
    "1000 m très mou — §4.3 deep slack, the other end of the same conditioning",
    { L: 1000, h: -50, L0: 1050, w: 5.36, EA: 6.9e6 },
    { zA: -160, zB: -220, bumps: [{ at: 0.45, height: 12, width: 0.2 }] },
  ),
  cell(
    "long-1500",
    "1500 m long — the top of v1's span range",
    { L: 1500, h: -120, L0: 1504.5, w: 5.36, EA: 6.9e6 },
    {
      zA: -103,
      zB: -213,
      bumps: [
        { at: 0.35, height: 18, width: 0.18 },
        { at: 0.62, height: 26, width: 0.12 },
        { at: 0.85, height: -14, width: 0.2 },
      ],
    },
  ),
];

/**
 * The prototype's percentile, index rule included — `sort`, then
 * `min(len − 1, floor(len·p))`. Kept identical on purpose: a nearest-rank variant would shift a
 * 40-sample p95 by one slot and stop a ported cell reading against the figure it was ported from.
 *
 * @param samples at least one; the caller owns the array, this reads a copy.
 */
export function percentile(samples: readonly number[], p: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

/**
 * One run of the pair — `sweep()` **then** `evaluateClearance`, timed together because a parameter
 * change runs both and the user waits for the second one.
 *
 * `coverage` comes back with the time so a caller can refuse a measurement taken on a traverse that
 * did not solve: a sweep losing steps is *faster*, and a silently faster cell is a tripwire that
 * has stopped guarding anything.
 */
export function timePair(cell: BenchCell, n: number): { ms: number; coverage: number } {
  const t0 = performance.now();
  const swept = sweep(cell.input, cell.riderP, n);
  evaluateClearance(
    cell.input,
    cell.riderP,
    swept.steps,
    cell.terrain,
    cell.hRider,
    CLEARANCE.samplesPerStep,
  );
  return { ms: performance.now() - t0, coverage: swept.coverage };
}

/** What {@link measurePair} reports: the distribution, plus the coverage that validates it. */
export type PairTiming = {
  /** ms — the criterion's own statistic. */
  p95: number;
  /** ms — carried because a p95 far above the median means the *tail*, not the work, moved. */
  p50: number;
  /** The lowest coverage any run returned; anything below 1 invalidates the timing. */
  minCoverage: number;
  runs: number;
};

/**
 * `runs` timed pairs, discarding a warm-up pass first. The warm-up is not cosmetic: the first call
 * pays JIT compilation of the Newton inner loop, which on a 1500 m cell is a multiple of the
 * measurement itself.
 */
export function measurePair(cell: BenchCell, n: number, runs: number = BENCH_RUNS): PairTiming {
  timePair(cell, n);

  const times: number[] = [];
  let minCoverage = Number.POSITIVE_INFINITY;
  for (let i = 0; i < runs; i++) {
    const run = timePair(cell, n);
    times.push(run.ms);
    minCoverage = Math.min(minCoverage, run.coverage);
  }

  return { p95: percentile(times, 0.95), p50: percentile(times, 0.5), minCoverage, runs };
}
