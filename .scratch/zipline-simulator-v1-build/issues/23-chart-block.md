# A8 · The Chart Block — `SharedX`, both charts, VE

Stage: A8
Status: done
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

## Comments

**Built.** Two pure modules and five components, plus the three edits A7 left room for:

| File | Carries |
| --- | --- |
| `src/lib/layout/contract.ts` (extended) | `SharedX` + `createSharedX`, `xDomain`, `createZScale`, the VE policy (`Z_MARGIN`, `exaggeration`, `veBadgeLabel`, `VE_BAND`, `STRIP_POLICY_BAND`) — A7 said A8 extends this module rather than re-declaring its constants, and it does |
| `src/lib/chart/scene.ts` | the pure `Scenario → ChartScene` derivation: material, `L₀`, the unloaded solve, the sweep, §11, the rider's **exact** solve, the violating bands, the z extent, the drawn ground |
| `src/components/chart/profile.tsx` · `strip.tsx` · `view-strip.tsx` | the two SVGs and the View Strip |
| `src/components/chart/chart-block.tsx` · `use-chart-width.ts` | the assembly and the five read-out cells, plus the app's single `ResizeObserver` (seed `null`, `inlineSize` only) |
| `src/components/app/shell.tsx` · `app.tsx` (edited) | `chartRef` on the Chart Block element, `--profile-band`, the gutter moved into the scales, the row's scope label |
| `src/lib/sim/index.ts` (edited) | `sweepStep` added to the barrel — see the judgement calls |

**The gate, all six rows green** in `contract.test.ts` (22 → 45 cases) and `scene.test.ts` (24 new);
suite 838 → **906**. The `k` table is asserted per scenario at 1e-3 relative — § 5's `étendue z`
column is quoted to 0,1 m, which is what « 200 m en échec » reading 35,3 for 35,277 is worth — and
`xFromPointer(pointerFromX(x)) === x` is asserted as `toMetres(rectLeft + x(m), rectLeft)` over four
widths × four spans × four `rect.left` values, to 9 decimals. The ticket's two method names are the
spec's `x()` and `toMetres()`; § 5's type block is the shape that shipped.

**The identity's missing factor, recovered rather than assumed.** § 5 states
`VE = plot aspect × (x span / z span)` and separately that « the z domain is the data span plus the
plot's ±12 % margin », but never multiplies them out. It is **1,24**: `1,1 × 100 / (1,24 × 8,0)` is
z1's 11,089, and all eight rows of the `k` table reproduce to 1e-3 that way and to nothing else. That
factor is also what makes the badge's **second** row reachable — the margin absorbs a clamp down to
`1/1,24`, so « tout tient dans le cadre » is the interval `autofit ∈ [0,806, 1)` and « câble hors
cadre » is below it. Without the margin the two rows would be one state.

**Measured live, on the pinned tree** (dev server, `agent-browser`), which discharges part of § 5's
*Re-checks owed*:

| | 390×664 | 1440×900 |
| --- | --- | --- |
| bandes | 44 · 220 · 96 · 44 · 104 = **508** | 44 · 540 · 177 · 44 · 52 = **857** |
| rail | **156** (≥ `MIN_RAIL`) | — |
| les deux SVG | `left 0 + 390` | `left 288 + 1152`, **identical for both** |

The two charts' boxes are byte-identical at both widths, which closes the `SharedX` defect in the
layout as well as in the scale. The first-run screen auto-fits at **×1,9**, not the ≈×1,5 § 5
estimated on a 1080×420 plot — inside the published band and clear of the ×1 floor, which is what
that bullet actually claims; the estimate predates the elected 0,42 and the z extent this build
takes (0 → −30 m, the ground under anchor B). Scrub, drag, typed `x`, both layer toggles and
hold-to-peek all work, console clean. The three `[MEASURED]` clearance lines come out of the **app's**
own chain at the engine's numbers: garde 2,44 m at x 74,1 (first run), −1,53 m `contact: "rider"`
(12/6 at flèche 6,0), −169,67 m `contact: "cable"` (`L₀` 400 on 200 m) — and that last one is also
the ×1 clamp's third badge row, drawn: « Éch. verticale ×1 — vraie échelle · câble hors cadre »,
peek disabled, the belly out of frame, and already « Câble au sol ». The self-limiting argument
holds on the one line anybody can reach it with.

Seven judgement calls, all where the spec was silent:

- **`sweepStep` joins the barrel.** A typed position gets § 5's exact §6.1-case-2 solve, and
  `solveAtHorizontalPosition` returns a `SpanState` — but the chart is written against a
  `SweepStep`, and `θ` needs `verticalTensionAt`. The alternatives were re-deriving §4.1's
  `dz/dx = V/H` in a component (« physics in the UI », which § 5 forbids) or snapping a typed
  position (which § 5 forbids outright). `sweepStep` is not one of § 2's three withheld names.
- **`SharedX.width` is the chart column's inline size, and the gutter lives inside the SVGs.** § 5's
  sketch types `width` as « the single ResizeObserver's inlineSize » *and* maps `domain → [gutter,
  width − gutter]`, which only closes if the SVGs span the full column: `width − 2·GUTTER` is then
  exactly `W_inner`, the number every band height is a function of. So A7's `px-[var(--gutter)]` on
  the chart wrapper had to go — it would have spent 48 px a side and inset the read-out cells, which
  § 5 spans across the **full column width** on purpose. The banner slot and the View Strip now
  carry that padding themselves.
- **The z extent is the traverse's envelope, not the current cable.** VE is « recomputed on every
  render », but a scale that followed the rider would rescale the plot mid-drag. Asserted as a test.
- **The row's scope label is absolutely positioned inside the read-out row** (abbreviated below B1,
  at the same threshold as the View Strip's labels), because a line of its own would add ~14 px to a
  desktop block that sums to the viewport exactly.
- **`buildScene` returns `null` rather than a reason.** Which failure it was — a textile draft's two
  blanks, a degenerate placement, an unreachable target, a refused solve — is A11's error surface to
  name; the chart's job is to know it has no picture. That branch renders the same empty bands the
  Skeleton does, so nothing jumps when A11 fills them.
- **The badge describes what is *drawn***, so a hold-to-peek prints « ×1 — vraie échelle » rather
  than « ×1,0 ». The three auto-fit rows are unchanged; the peek is a fourth thing the badge says.
- **The danger band draws above the terrain fill.** On a deep-slack line the ground fills most of the
  plot, and a tint underneath it answers nobody's question.

Three things left standing for later stages, on purpose: the Handle Lane draws its **bracket** and
reserves its 24 px in both modes, but the Station **handles** become draggable with A9's geometry
fields; « Aucun résultat » keeps the row's height and its labels, and A11 writes the line that
replaces it; and the strip's per-step curve carries a visible ±1 cm sawtooth, which is
`CLEARANCE.samplesPerStep`'s discretisation showing through a 5 m y range — real data, not a drawing
artefact, and not worth a smoothing that would lie about it.

New dependencies, pinned exactly: `d3-shape` **3.2.0** and `@types/d3-shape` **3.1.8**.
`docs/conventions/ui.md` gains a *Charts* section — the renderer rule, the one-`SharedX` rule, the
no-window-height invariant and the `visx` fallback.

Gates green: `typecheck`, `lint-type-aware`, `test` (**906**, was 838).

**Fix round (review + `agent-browser` pass).** Four changes, two declines.

- **The memo was on the wrong key, and that was the ticket's one real defect.** `buildScene` was
  memoised on the whole `ScenarioDraft`, so every `pointermove` — which dispatches
  `scénario/modifié` — re-ran the material derivation, `resolveL0`, the unloaded solve, the 260-step
  sweep and the full §11 pass, including for a 1 px move that snapped back to the same step. That is
  not § 8's « memo on the solve inputs behind the `useSweep` seam ». `scene.ts` now splits at `x_D`:
  `buildSceneBase(sceneInputs(scenario, trace))` owns the scenario's half and `placeRider(base, x_D)`
  the rider's exact solve plus its one-step clearance; `buildScene` survives as the composition the
  `node` tests use, and the Chart Block keys **two** memos instead of one. `sceneInputs` is the memo
  key made explicit, and its test asserts `x_D` is absent from it — the reducer's shallow patch merge
  is what keeps `geometry`, `anchors`, `material` and `tightness` identical across a scrub.
  `SceneBase.hRider` is new: §11's third term is the scenario's, not the view's. Suite 906 → **909**.
- **The clearance dimension line no longer clamps to zero.** `Math.max(hClear, 0)` degenerated the
  one always-on mark that states the magnitude of the violation into a zero-length segment exactly
  when the garde went negative. It now draws from the ground to `ground + hClear`, i.e. below the
  ground, in `stroke-destructive`. Measured on `?L=200&h=-25&za=12&zb=6&x=100`: garde −1,08 m, an
  11 px segment where there was none.
- **The peek control branches on `(pointer: coarse)`**, § 5's own query and the one `.chart-grab`
  already uses, instead of the event's `pointerType`. Read **at the event**, never at render, so it
  is not the `useMediaQuery` branch § 5 forbids. Hold-to-peek re-verified on a fine pointer: badge
  « Éch. verticale ×1 — vraie échelle » on hold, ×2,4 on release.
- **The `x_D` clamp speaks.** § 3 (« le clamp n'est pas silencieux ») and § 7 both require the
  transient inline note, and it had no owner in the « left standing » list — the field is A8's, so
  the note is too. `PositionField` raises « position ramenée à la portée : 0 – 150,0 m » for 4 s on
  all three clamping paths (typed out of range; a geometry change or a link arrival leaving the
  Scenario's own `x_D` outside `[0, L]`), as an `aria-live` region **absolutely positioned** so the
  View Strip keeps its 44 px. An unreadable entry stays silent — it is not a clamp.

Two findings declined, both settled by the spec rather than by code:

- **The block falling below the fold on a viewport shorter than it** (measured 1366×657) is § 5's
  collapse trigger **(c)** — « il ne tient pas : `blockHeight > availableHeight − MIN_RAIL` » — and
  the Pinned Safety Header is **ticket 27's** (A12), which has not landed. `shell.tsx` already says
  so in prose. A8 is not allowed to answer it with a squeeze: a height-fed band is the mechanism both
  measured defects came from.
- **« Pente −19,4 % » is right and § 9's « −11,1 % » is a stale *degree* figure.** § 13 records that
  ticket 14's first-screen inventory quoted −11,1 **before** any ticket had fixed the cell's unit,
  and the prototype printed `fmt.deg(rider.step.theta)` (`variant-b`, `variant-d`). This chain's
  θ at the first-run rider is **−0,191528 rad = −10,97°**, i.e. that same number — and § 5 settled the
  cell as **percent**, which is `tan θ × 100` = **−19,4 %**. The chord is −12,0 %, the kink adds
  −7,4 % on the below side, and the other four cells reproduce § 9 exactly.

**Spec-drift correction (chunk 4 audit).** `buildSceneBase` returned one `null` for every failure
alike, so a blank textile `MBL` collapsed the chart the way an invalid `L` does — § 8's *exception
géométrique*, applied unconditionally, against « Aucun résultat »'s own rule that « les entrées se
dessinent toujours ». The derivation is now **three tiers**: `buildSceneFrame` (terrain, both
anchors, the span markers, the 5 % margin, the shared domain, the frame's own z extent) fails
**only** for `L` / `h` / station; `buildSceneBase` is the solved half built on a frame handed to it,
and its `null` removes exactly § 8's five layers — câble, ligne à vide, courbe de garde, bandes de
danger, marqueur du voyageur — while the frame keeps drawing and the strip keeps its axes and its
pointer path. `useSceneBase` became `useScene` (`use-scene.ts`) returning `{ frame, solved }`, and
`ChartBlock` renders three cases, the third being § 8's « Portée invalide — aucun tracé possible. »
centred in two empty, tick-less frames with no pointer handlers. This **supersedes** the
« buildScene returns `null` rather than a typed reason » judgement call above: the reason is still
untyped, but *which half* was suppressed is now structural. Five `node` cases in `scene.test.ts`,
and both states driven live — `?te=9999999` draws terrain, towers and bracket with no cable and no
grab target; `?L=-5` renders the cause line in both empty frames.
