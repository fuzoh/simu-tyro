# E7 · `terrain.ts` + `clearance.ts` — §11 ground clearance

Stage: E7
Status: done
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

## Comments

**Built.** `src/lib/sim/terrain.ts` (`zGroundAt`, plus the `Terrain` re-export so « the union +
`zGroundAt` » is one module) and `src/lib/sim/clearance.ts` (`evaluateClearance`, `CLEARANCE`),
with `terrain.test.ts` (11 cases) and `clearance.test.ts` (38 cases) beside them. Gates green:
`typecheck`, `lint-type-aware`, `test` — 275 cases over 8 files.

Every `[MEASURED]` row of the gate table reproduces, on `sweep(input, P, 240)` +
`evaluateClearance(…, 60)` with `w = 0,5465·9,81`, `EA` 6,90 MN, `P` 1177,2 N, `h_rider` 2,1 m:
garde **2,4422 m at x 74,117** with `contact: "none"`, 0 steps in violation and the rider at
`x` 73,802 (against 2,44 / 74,1 / 73,8); dénivelé **2,4579 / 2,4422 / 2,3661 / 2,2466**; flèche
**3,3856 / 2,4402 / 1,4408 / 0,4037**; `contact: "cable"` **−169,6671**; `contact: "rider"`
**−1,5303**. The five new fixtures sit in `__fixtures__/theory-15.ts` beside `CHORD_BOUND`, the
existing `[MEASURED]` precedent, under a `ClearanceCase` type — `Fixture` holds numbers only and
`contact` is the one recorded output that is not one.

**Judgement calls.**

- **The `[MEASURED]` bar is `1e-3` relative *floored at the half-ulp of the recorded value's own
  last digit*.** Three rows are unassertable at bare `1e-3`: « 0,40 m » would demand ±0,4 mm and
  the reducer lands on 0,4037; « 2,37 » and « 2,25 » sit 4,3 and 3,8 mm out. Each is **inside**
  the recorded 2-decimal precision, which is what § 11 says the tier is for — « a tighter bar
  would assert digits nobody measured ». The helper returns the deviation **counted in bars**, so
  a failure says how far out it is instead of printing two floats.
- **The deep-slack line is the *level* 200 m span with anchor bases at −4 / −2,5 m** (spec § 7,
  « le mou profond converge »), not § 5's VE row, which describes a 200 m / −18 m line with 12 m
  anchors and quotes the same −169,67. Only the first reproduces it — −169,6671, and the same
  line at `L₀` 200,5 m returns −7,5874 against the recorded −7,59. The VE row's parameters give
  −161,07, so it is the loose citation, not a second measurement.
- **`L₀` for flèche 5 / 7 / 8 m is re-derived by a test-local sag bisection**, because the driver
  ticket 14 recorded is the *flèche target* and `parameterise.ts` (ticket 12) does not exist yet.
  It is cross-checked against the one `L₀` on record — the inversion returns **151,6444 m** at
  flèche 6,0 against the measured 151,644 — and it leaves the test the day § 7's inverse lands.
- **`w` and `EA` are the displayed steel chain** (`μ` 0,5465 kg/m, `EA` 6,90 MN), like
  `CHORD_BOUND`, rather than §13.1's un-rounded `E_app·C·d²`. Reproducing that chain inside a
  fixture would duplicate `materials/steel.ts` (ticket 11) before it exists; the rounding moves
  garde by 3×10⁻⁴ m, two orders below the bar.
- **The scan runs `xAt` / `zAt` over one reused `CableShape`, not `sampleCable`.** Same arithmetic
  on the same vertices — `s_k = L₀·k/n`, the last one `L₀` exactly — and 260 discarded
  `Float64Array`s per parameter change that the frame budget's larger half no longer allocates.
  `catenary.ts` already documents `CableShape` as the type the clearance reducer takes.
- **`evaluateClearance` throws `RangeError` on a non-empty `input.loads`**, the refusal `sweep`
  already makes for the same reason: the steps it reduces came from a sweep that refused it, and
  a span arriving with a rider on it would silently reduce a two-rider line.
- **An empty `steps` returns `hMin: +∞`, `atX: NaN`, `atStepIndex: −1`.** The spec is silent; −1
  is the flag a caller reads, and the state is unreachable in practice because a sweep that lost
  every step suppresses the verdict through `coverage` first.
- **No manual-ground constructor ships in `terrain.ts`.** § 2's function surface lists exactly
  `zGroundAt` there, and § 4 puts the symmetric `deriveTerrain(trace, a, b)` seam **outside**
  `src/lib/sim/`; the two-point manual plane belongs beside it, not in the engine. Both test files
  build the two-point value locally, and `terrain.test.ts` asserts it equals `flat` to the bit.
- **`atStepIndex` and the three per-step arrays are indexed by `steps`, not by the sweep grid.**
  Failed steps are already absent from `steps`, and re-expanding to 260 would invent entries for
  the holes `coverage` exists to report.

**One measured correction to this ticket's own note.** « Vertex-only … the convexity miss is
≈5 mm at 1500 m » is the *unloaded* convexity. On the first-run line, refining 60 → 600 samples
lowers garde by **18,5 mm**, because the trolley kink is a vertex no uniform grid lands on. The
conclusion is unchanged — the measurement *is* the 60-sample scan and the frame budget scales
with `260 × 60` — so the test asserts what is true: refinement is monotone downward and worth
centimetres, never metres.

**Fix round (review).** `evaluateClearance` now scans **both** sets of vertices, as § 4 requires
(« `evaluateClearance` scan[s] at the terrain's own sample points ») — the cable's uniform-in-`s`
grid *plus* every profile sample strictly inside a cable segment, reached by a forward cursor
(`x(s)` is strictly increasing) and read off that segment's chord. Before, an imported profile's
features between two cable vertices were invisible: a 5 m ridge at `x` 75,4 on a 200-point plane
read garde **+2,44 m / « none »** instead of **−2,49 m / « cable »**. Two-point manual ground has
no vertex strictly inside a segment, so every `[MEASURED]` row is bit-identical and all four gate
groups still reproduce. Three new cases in `clearance.test.ts` cover the 200-point plane ≡ the
two-point plane, the ridge, and refinement; the docblocks' « ≈5 mm » is corrected where it
described the *chord* residual — measured **69 mm** on the ridge case, because that ridge sits
under the trolley kink (18,5 mm on smooth ground, per the note above). The kink is **not** added
to the scan: 60 uniform samples is the grid ticket 14 measured on. The `[MEASURED]` bar's half-ulp
floor is now stated where the tier is defined — `docs/conventions/testing.md`'s tolerance table
and `TOLERANCE.measured` — rather than only in this ticket's judgement calls.
