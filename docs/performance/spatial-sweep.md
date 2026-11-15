# The windy sweep and its clearance — measured (#127)

**Date:** 15 November 2026. **Baseline:** `e151dd4` plus #127's Step A (the spatial engine). **Harness:** `measureSpatialPair` in [`src/lib/sim/bench-harness.ts`](../../src/lib/sim/bench-harness.ts), gated by [`bench-harness.test.ts`](../../src/lib/sim/bench-harness.test.ts); the human-read table is `bun run bench` ([`sweep.bench.ts`](../../src/lib/sim/sweep.bench.ts), the `windy ·` cells).

**Finding.** Under a uniform wind, `sweepSpatial` + `evaluateSpatialClearance` cost **31–49 ms p95** at §19.9's `N = 240` over §6.2's 260 positions. Under §8.4's 40 % profile the same pair costs **≈ 92 ms p95**: `φ(ξ)` costs a `pow`, a `sin` and a `cos` at every RK4 stage, and that doubles the shot. #127's plan targeted ≤ 60 ms; the profile cell misses it. Per the plan, `N` is not lowered and the miss is reported, not coarsened away. The gate `SPATIAL_PAIR_P95_BUDGET_MS` is **150 ms** — a budget set from these figures with room for a loaded CI box, not the measurement. Wind-free cells take the closed form and keep `PAIR_P95_BUDGET_MS = 8` unchanged.

## 1. Protocol

| | |
| --- | --- |
| Runtime | Node v26.13.0 under Vitest 5.1.0 (`bunx vitest run`), one file alone, no other suite in parallel |
| Machine | AMD Ryzen AI MAX+ 395 (16 cores / 32 threads), Linux 7.3.1 (CachyOS) |
| Pair | `sweepSpatial(cell.input, cell.rider)` then `evaluateSpatialClearance(swept, cell.terrain, cell.hRider)`, timed together with `performance.now()` |
| Runs | one warm-up, then 40 timed pairs (`BENCH_RUNS`); p95 and p50 by the gate's `percentile`. Each cell measured three times; the table gives the range |
| Line | steel 12 mm (`d = 0,012 m`, `C_D⊥ = 1,2`), `ρ = 1,225 kg/m³`, one rider at `share = 1`, the cells' own span, ground and gabarit |
| Wind | 15 m/s; « across » is `from = 90°` on a bearing of 0°, « oblique » `from = 45°`; profile width 50 %, attenuation 0 % unless stated |
| `N = 480` | the same pairs with `SPATIAL.steps` set to 480 in a scratch file (not committed) |
| Shots | `Shooter.prototype.run` counted with `vi.spyOn` over one sweep and one clearance |

## 2. Figures

| Cell | `N = 240` p50 | `N = 240` p95 | `N = 480` p95 | Shots per position, sweep | Clearance |
| --- | --: | --: | --: | --: | --: |
| `cross-150` — first run, 150 m | 45,6–47,2 ms | 46,3–49,0 ms | 86,6–88,1 ms | 3,88 | 1,00 |
| `oblique-150` — first run, 45°, 40 % profile | 91,1–91,3 ms | 91,6–93,1 ms | 177,8–182,4 ms | 3,87 | 1,00 |
| `cross-taut-1000` | 33,7–33,9 ms | 34,2–34,3 ms | 58,4–60,6 ms | 2,05 | 1,00 |
| `cross-slack-1000` | 42,2–43,0 ms | 42,4–44,2 ms | 74,8–75,8 ms | 3,22 | 1,00 |
| `cross-long-1500` | 29,7–30,3 ms | 30,4–31,9 ms | 50,5–52,5 ms | 1,51 | 1,00 |

Coverage was 1 on every run. The split by wind on the 150 m line (p50, 20 runs): uniform across 47,2 ms, uniform oblique 46,8 ms, 40 % across 92,9 ms, 40 % oblique 91,8 ms — the direction costs nothing, the profile doubles the pair.

Inside the Vitest suite, run with every other file in parallel, the profile cell read 94,8 ms p95: the budget's margin is for that.

## 3. What would lower it

Not done in Step A, listed for the maintainer: a forward finite-difference Jacobian (4 shots per refresh instead of 7), variational sensitivities, or a cheaper `φ` that is no longer bit-identical to `windAt`. `N` stays at 240, the value §19.9's refinement bars were measured at.
