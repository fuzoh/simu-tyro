# E7b · The bench, ported out of the prototype

Stage: E7b
Status: open
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
