# E6 · `sweep.ts` — the rolling sweep and `coverage`

Stage: E6
Status: open
Blocked by: 07
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 11

## Delivers

`src/lib/sim/sweep.ts` — §6.2's `sweepGrid`, the marching solve with warm start, and `coverage`
with its `failures[]`.

## Gate

| Case | Value |
| --- | --- |
| `Z5` | `H = 7765.67 N`, `V₀ = −973.369 N`, `x_D = 59.9578 m`, `z_D = −5.19064 m`, `σ_D = 60.1969 m` |
| exact | `sweepGrid(L₀, 240).length === 260` |
| exact | the grid is a **pure function of `(L₀, n)`** — determinism |

## Notes

- **`SWEEP_STEPS = 240 uniform + 10 tail steps per end ⇒ 260 pas`**, endpoints excluded. 260 is the
  coverage denominator everywhere in the app; ticket 08's « 240 / 240 » copy was wrong and § 6
  already carries the correction.
- `Z5`'s **`σ_D = 60.1969 m` is new work, not a port** — it is the quantity that makes `s_D` ≠ `x_D`
  concrete (60,15 against 59,96, ≈0,3 %), which is *why* `s_D` never appears in the UI.
- **240 is confirmed by measurement, not inherited**: it costs the same as 100 inside Chromium's
  0,1 ms clock clamp and buys 2,4× the resolution. Do **not** raise `steps` or `samplesPerStep` —
  the clearance reducer is the larger half of the frame budget and scales with their product, while
  the fidelity on offer was measured at ≈ 5 mm.
- A partial sweep carries `coverage` **so a green verdict cannot lie**. `coverage < 1` **suppresses**
  the verdict; it never qualifies it.
- The engine is **synchronous and pure forever**. Async lives only in the `useSweep` seam, which
  exists for stale-while-recomputing and **stays** even though there is no worker.
