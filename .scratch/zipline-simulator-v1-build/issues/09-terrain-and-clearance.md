# E7 · `terrain.ts` + `clearance.ts` — §11 ground clearance

Stage: E7
Status: open
Blocked by: 08
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 4, § 11

## Delivers

`src/lib/sim/terrain.ts` — the `Terrain` union and `zGroundAt` — and `src/lib/sim/clearance.ts` —
§11's `evaluateClearance` as a **reducer over the sweep**.

## Gate

| Case | Value | Source |
| --- | --- | --- |
| first-run line | garde min **2,44 m at x 74,1**, `contact: "none"`, **0** steps in violation | `[MEASURED]` ticket 14 §1 |
| garde is independent of dénivelé | 2,46 / 2,44 / 2,37 / 2,25 m at `h` = 0 / −18 / −40 / −60 | `[MEASURED]` |
| garde moves metre-for-metre with flèche | 3,39 / 2,44 / 1,44 / 0,40 m at flèche 5 / 6 / 7 / 8 | `[MEASURED]` |
| `contact: "cable"` | `L₀` 400 m on a 200 m span ⇒ garde **−169,67 m** | `[MEASURED]` |
| `contact: "rider"` | anchors A 12 / B 6 at flèche 6,0 ⇒ **−1,53 m** | `[MEASURED]` |
| geometry | flat-ground cases, all three `contact` states | — |

`[MEASURED]` rows assert at **`1e-3` relative** — the recorded value *is* the measurement's
precision, and a tighter bar would assert digits nobody measured.

## Notes

- **`terrain.ts` must stay engine-pure.** The CSV parser lives **outside** `src/lib/sim/` (ticket 18
  here) and the Trace → `Terrain` derivation is the single seam between them. That is the property
  that keeps every §15 fixture free of terrain stubs.
- **The straight line between the two anchor bases is the two-point case of the same `Terrain`
  value** — manual terrain is not a separate kind, and §11 clearance is live from first launch.
- **Vertex-only clearance evaluation is safe**: the convexity miss is the cable's own sag across one
  segment, **≈5 mm at 1500 m**. Nobody should densify that scan and spend the frame budget on
  millimetres.
- **Built before `verdict.ts`, although the verdict is the more visible output** — the clearance
  reducer is the larger half of the frame budget (p95 ≤ 1,7 ms against `sweep()`'s ≤ 0,6 ms), and the
  bench cannot exist without it. The bench is the deletion gate.
- Ground contact surfaces **in clearance**, never as a solve failure. The two contact kinds get
  **separate verdicts**, and the envelope one names `h_rider` and carries its « non confirmé » chip.
