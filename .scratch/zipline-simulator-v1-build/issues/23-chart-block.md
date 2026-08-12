# A8 · The Chart Block — `SharedX`, both charts, VE

Stage: A8
Status: open
Blocked by: 14, 16, 22
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 5, § 11

## Delivers

The two linked charts — profile above, **clearance-vs-position strip** below — as hand-rolled SVG in
React with `d3-shape` for paths and a hand-written affine scale per axis. **No charting library.**
Plus `SharedX`, the layer set, the vertical-exaggeration policy and the four failure signals.

## Gate

Pure functions in `node`, no DOM:

| Assertion | Bar |
| --- | --- |
| profile inner height `= 0,42 × W_inner`, Plot Aspect Band **[0,35 ; 0,50]** as guard | exact |
| strip outer height `= clamp(0,16 × W_inner, 96, 200)`, policy band [72, 200] | exact |
| `VE = plot aspect × (x-domain span / z-domain span)`, with the **×1 floor** | exact |
| the published band **×1 … ×5,5**, against the seven-scenario `k` table | inside the band |
| `SharedX`: one object per (column inline size, `L`, terrain source), `GUTTER = 24` on both sides of **both** charts, `xFromPointer(pointerFromX(x)) === x` | round-trip to float precision |
| the read-out row wraps to 3 columns below **600 px** of chart-column width | exact threshold |

## Notes

- **`SharedX` is a regression test against a defect found in the artifact.** The prototype padded the
  profile `{left 16, right 16}` and the strip `{left 24, right 24}` — two x axes misaligned by **8 px
  at each end, 34 m at a 1500 m span**, precisely at the anchors, which is where the drag handles go.
  Its hand-typed pointer inverse is also wrong by **0,05 L** under the real `1,1 L` domain because it
  assumes `domain[0] === 0`. **One shared scale object owning the inverse.**
- **No chart dimension may read the window height.** Every band height is a function of the chart
  column's inner **width** — which is also what makes the Skeleton correct at 390 px for free. The
  prototype's `flex-[3]`/`flex-1` made VE a function of window height, and the **desktop was already
  out of budget** at ×5,02.
- **VE never compresses.** Compressing the sag in a clearance tool is the same error class as
  exaggerating it and **worse, because it reads safe**. The floor is its own disclosed badge state,
  with the peek control disabled because it is already in force.
- **The user-facing VE selector is dead** — ×20 at 1500 m throws the cable off-frame. What ships is a
  **hold-to-peek « ×1 vraie échelle »** beside the auto-fit badge, and a live **« Éch. verticale ×N »**
  label with printed numeric read-outs.
- **No range input exists anywhere.** The clearance strip *is* the scrub track — its x axis already is
  rider position — joined by marker drag and a typed `x`. Both charts share **one x domain**, span
  + 5 %; the curve being undefined outside `[0, L]` marks the span for free.
- **Position reads as `x_D` in metres** with `%` secondary and **`s_D` never shown** (it drifts
  0,5–2 % from `x_D`). Typed positions get an **exact solve**; pointer input **snaps**.
- **Read-outs sit outside the plot area** in fixed cells — both alternatives died of occlusion.
- **Failure fires four coordinated signals**, with the tinted band over **rider positions that
  violate** rather than over the worst point's x, and cable-red reserved for « the rider is in the zone
  right now ». The clearance cell reports the **worst clearance for the current rider position**, with
  the dimension line drawn where that minimum sits.
- Layers: a fixed always-on set plus two toggles — « ligne à vide » **off**, « corde A–B » **on**.
- **The « câble hors cadre » clip state is new and unprototyped.** Its mitigation — every case
  reachable inside the admissible envelope is already « Câble au sol » — is an **argument, not a
  proof**: a deep gorge under a short span could in principle clip while safe.
- Ticket 02's client-side SVG export of the chart already in the page is **not** ruled out, and v1
  does not build it either.
