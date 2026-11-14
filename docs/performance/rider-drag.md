# Dragging the passager with the Vue 3D open — measured, then fixed (#130)

**Date:** 13 November 2026. **Baseline:** `0c90eb0` (the probe and the harness, nothing else changed). **Harness:** [`scripts/rider-drag.ts`](../../scripts/rider-drag.ts) — the protocol below is its docblock; re-running it is the only way to compare a later build with these numbers.

**Finding.** The Vue 3D did not follow the drag at all: it kept the loaded line where the drag began and redrew it once, about 70 ms after the pointer stopped. Frames were never the problem on this machine (16,7 ms throughout, no long task). The cause was CesiumJS building the loaded line in a Worker, a build that every move of the drag started over.

**Fix.** A move of the passager now moves the loaded line alone, built on the main thread in the frame it arrives. **Every position asked is drawn** (169 of 169 on the `steady` gesture, 76 of 76 on `fast`, against 1 of 163 and 1 of 76), **36 ms** after the `pointermove` (p95 38 ms). The last position is drawn 10 ms after the release instead of 71 ms, and it is the right one. The 3D view at the end of the drag is pixel-identical to the one before the fix.

The maintainer's report — browser, GPU and gesture — was not reproduced as such. What follows is a reproduction on this machine, **not** the maintainer's. The symptom it measures, a 3D view that does not follow the drag, does not depend on the machine: no number of positions drawn above 1 was ever seen before the fix, at either CPU rate.

## 1. Protocol

| | |
| --- | --- |
| Build | `BASE_PATH=/simu-tyro/ bun run build:pages`, `dist/client/` only, served by `scripts/first-load.ts`'s server (GitHub Pages' behaviour, gzip, under `/simu-tyro/`) |
| Browser | Chromium 156.0.8078.79 (Arch Linux), `--headless=new`, a new process and profile for every run |
| GPU | **hardware**: WebGL2 through ANGLE on Vulkan, `AMD Radeon 8060S Graphics (RADV STRIX_HALO)` — the renderer string each run reads back from the Vue 3D's canvas. (Headless Chromium here takes the GPU even with `--enable-unsafe-swiftshader`, which `first-load.ts` passes; the « software WebGL » in [`first-load.md`](first-load.md) § 1 should read the same.) |
| Machine | AMD Ryzen AI MAX+ 395 (16 cores / 32 threads), 60 GB RAM, Linux 7.3.1 (CachyOS) |
| Viewport | 1920 × 1080 at DPR 1, 60 Hz frames |
| CPU | `1×`, and `4×` slower over CDP (`Emulation.setCPUThrottlingRate`) for a weaker machine; the GPU is not throttled |
| Scenario | Statique on the verified line (#103): the trial's two Positions and its 200-point profil geo.admin, 435,2 m, as a canonical link of the URL fixtures (`trace-full-profil`). One Brin porteur; `--lines 2` adds `bp=2`. Then « 3D », the Vue latérale it opens on, and 2 s with no request (swisstopo's tiles in) |
| Where the reader looks | Statique's middle column scrolled until the coupe's handle stands 160 px above the bottom of the window: the coupe, and above it 92 % of the Vue 3D's canvas |
| Gesture | a press on the handle; a mouse move every 8 ms (125 Hz) for 4 s, back and forth over 80 % of the plot's width — `steady` once in 4 s (≈ 560 px/s), `fast` once in 0,8 s (≈ 2 800 px/s); then three moves to a quarter of the plot and the release there, without a pause. The moves follow the wall clock, so a slow page gets fewer moves, never a longer gesture |
| Runs | 5 per gesture at `1×`, 3 at `4×` and with two Brins porteurs; medians reported. One more run per gesture with a trace, reported apart (tracing slows the page) |

Measured from the press to 1 s after the release:

- **Frames**: the intervals between `requestAnimationFrame` callbacks — p50, p95, max, and how many are longer than 25 ms (1,5 vsync). **Long tasks**: `longtask` entries.
- **Latency**: the `pointermove`'s `timeStamp` → the first Vue 3D frame drawn with that position complete. « Complete » means `vue3d:shown` (`src/lib/app/probe.ts`): every entity built (CesiumJS's clock may animate again) and the loaded line built. It is marked at the end of that frame's CesiumJS render, one compositor frame before the pixels. A position asked twice in a row counts from the first time.
- **Positions drawn**: how many of the distinct `x_D` the coupe asked (`rider:asked`) the Vue 3D drew complete.
- **End of the gesture**: the last position asked, the last drawn and the View Strip's field must be the same, and no position may be drawn after it (a stale result). **Settle** is the time from the release to the frame that drew it; ≤ 0 means it was drawn before the release.
- **Stages**, from the probe's spans:
  - `coupe:rider` — the coupe's `placeRider`.
  - `vue3d:scene` — the Vue 3D's own `placeRider` and its scene.
  - `vue3d:show` — the renderer handed the scene.
  - `vue3d:entities` — CesiumJS's `DataSourceDisplay.update` per frame.
  - `vue3d:render` — the rest of its frame.
  - **asked → show** — the `rider:asked` mark to `vue3d:show`: the Page's React render, commit and effects between the scrub and the renderer.
- **Trace** (one run per gesture): the renderer's main thread over the 4 s of the gesture, split by what it ran. Input handlers (`EventDispatch`), animation frames (CesiumJS's loop), other script outside both (React's scheduler), style and layout, paint, GC. Then the busy time of the page's dedicated Workers (CesiumJS's geometry Workers) and of the GPU process's main thread.
- **p50 and p95** of a run are nearest-rank samples: the value at index `ceil(q·n) − 1` of the sorted `n` (`quantile` in the harness). This is not the bench gate's p95 of [`docs/conventions/testing.md` § Benches](../conventions/testing.md#benches), whose `percentile` reads index `min(n − 1, floor(n·p))`, one slot higher wherever `q·n` is a whole number: the two « p95 » are not the same statistic and their figures do not compare. A figure reported for a gesture is the median of its runs' p50 or p95.

Re-run:

```bash
BASE_PATH=/simu-tyro/ bun run build:pages
bun scripts/rider-drag.ts --dist dist/client --runs 5 --json drag.json
bun scripts/rider-drag.ts --dist dist/client --runs 3 --cpu 4
bun scripts/rider-drag.ts --dist dist/client --runs 3 --lines 2
bun scripts/rider-drag.ts --dist dist/client --runs 1 --trace drag-trace.json --shot drag.png
```

## 2. Baseline (`0c90eb0`)

| Gesture | Frames p50 / p95 / max | > 25 ms | Long tasks | Positions drawn | Latency p50 | asked → show p50 / p95 | Settle | End |
| --- | --- | --: | --: | --: | --: | --: | --: | --- |
| `steady` 1× | 16,7 / 16,7 / 16,8 ms | 0 / 304 | 0 | **1 / 163** | 87,8 ms (the last only) | 8,1 / 10,0 ms | 70,7 ms | correct |
| `fast` 1× | 16,7 / 16,7 / 16,8 ms | 0 / 304 | 0 | **1 / 76** | 88,6 ms | 8,6 / 10,3 ms | 71,1 ms | correct |
| `steady` 4× | 16,7 / 50,0 / 83,3 ms | 49 / 230 | 1 × 68 ms | **1 / 125** | 187,9 ms | 39,4 / 65,0 ms | 82,4 ms | correct |
| `fast` 4× | 16,7 / 50,0 / 83,4 ms | 46 / 240 | 1 × 67 ms | **1 / 118** | 183,5 ms | 42,8 / 66,0 ms | 93,0 ms | correct |
| `steady` 1×, two Brins porteurs | 16,7 / 16,7 / 16,8 ms | 0 / 304 | 0 | 1 / 175 | 84,7 ms | 8,8 / 10,5 ms | 67,8 ms | correct |

Stages at 1× (p50 / p95, ms):

| Stage | Count | Time |
| --- | --: | --- |
| `coupe:rider` | 243 | 0,1 / 0,2 |
| `vue3d:scene` | 243 | 0,1 / 0,2 |
| `vue3d:show` | 243 | 0,3 / 0,4 |
| `vue3d:entities` | 305 frames | 1,1 / 1,7 |
| `vue3d:render` | 305 frames | 2,5 / 3,1 |

At 4×, the same stages take 0,5 / 0,7 / 1,6 / 0,2 (p95 5,3) / 6,8 (p95 11,0) ms.

Trace, `steady` (4 090 ms of gesture, traced run):

| Thread | What it ran | Time |
| --- | --- | --: |
| Main thread | busy in all | 3 103 ms |
| Main thread | input handlers | 367 ms |
| Main thread | CesiumJS's animation frames | 961 ms |
| Main thread | other script — React's scheduler, 728 tasks, p50 2,1 ms, p95 3,8 ms | 1 356 ms |
| Main thread | paint | 246 ms |
| Main thread | GC | 53 ms |
| Main thread | style and layout | 3 ms |
| Workers | busy | 138 ms |
| GPU process | busy | 877 ms |

## 3. Where the time went

The chain is: pointer → scrub → store → the Page's React render → the Vue 3D's scene → renderer → CesiumJS's frame → GPU. Read off the numbers above:

1. **The loaded line never reached the screen during the drag — the whole symptom.** The renderer drew a new scene by removing every entity and adding them again. Most are polylines of fixed vertices, which CesiumJS turns into **static geometry built asynchronously in its Workers** (`StaticGeometryPerMaterialBatch`, `asynchronous: true`). The old primitive stays on screen until the new one is ready, a few frames later. A batch invalidated again before that **drops the pending primitive and starts over** (CesiumJS 1.147, `StaticGeometryPerMaterialBatch.update`). A drag invalidates it on every frame, so nothing new was ever drawn until the pointer stopped. Then one build went through: about 70 ms — the *settle* — of which the Workers' share is small; most of it is the round trip and the frames in between. The Workers did 138 ms of building in 4 s, all of it thrown away but the last. Frame times stay at one vsync throughout, because the cost is not on the main thread: the line is simply late.
2. **Every other line was rebuilt with it**: the anchors, their labels, the Fils à plomb, the Ligne A–B, the Ligne à vide and the Trajectoire, which a move of the passager does not change. Cost: `vue3d:entities` 1,1 ms a frame (p95 1,7; at 4×, p95 5,3), plus the Workers' builds.
3. **The engine is not the cost.** The passager's exact solve and one-step clearance are 0,1 ms (p95 0,2) for the coupe and 0,1 ms again for the Vue 3D's scene, which places the passager a second time. At 4×: 0,5 and 0,7 ms.
4. **The Page's re-render is the largest share of the main thread**, though not the cause. A scrub dispatches a new Scenario; Statique's whole tree renders again — the Rail, the Résultats, the coupe, the map's host — in three scheduler tasks per move, about 5,5 ms per move in the traced run. The renderer hears of the move 8 ms after the scrub (p50; p95 10 ms). At 1× the frames absorb it. **At 4× it is what drops frames**: asked → show 39–43 ms, one frame in five over 25 ms, p95 50 ms — before and after the fix alike (§ 4).
5. **Rendering itself**: CesiumJS's frame is 2,5 ms of main thread at 1× (6,8 ms at 4×) and the GPU process is busy 877 ms of 4 090. Rasterising the terrain, the imagery and a few polylines is already the GPU's work; the CPU side is command submission.

## 4. What changed, measured against the baseline

**`perf(map)`: a passager moved along the same line moves the loaded line alone, built on the main thread** — `src/lib/map/vue-3d.ts` (`onlyLoadedMoved`), `src/components/map/vue-3d-renderer.ts` (`LoadedLine`).

- `onlyLoadedMoved(before, after)` compares two scenes by value: the Positions, the Fils à plomb, the Ligne A–B, the Ligne à vide, the Trajectoire and the members. When only the loaded line differs, the renderer moves that line and leaves every other entity as it is. Anything else — a new solve, a Vent, an Anchor Height, the number of Brins porteurs, a passager no longer placed — draws the scene anew, as before.
- **One Brin porteur**: the loaded line is a CesiumJS `Primitive` built with `asynchronous: false`, so it is drawn in the frame it is built. It carries the same `PolylineOutline` material, width 3 and arc type. Behind a ridge it gets the same fainter ink (`depthFailColor`, `PolylineColorAppearance`), the configuration CesiumJS's own batch gives the entity it replaces. The old primitive is removed in the same frame, so there is no gap and no flicker.
- **Two Brins porteurs**: their members were already rebuilt on every frame on the main thread (`CallbackProperty`, shifted by the camera's scale). They now read the line's current vertices instead of being added anew.

Same protocol, same machine, medians:

| Gesture | Positions drawn | Latency p50 / p95 / max | Settle | Frames p95 / > 25 ms | asked → show p50 | `vue3d:entities` p50 / p95 | `vue3d:render` p50 / p95 | End |
| --- | --: | --- | --: | --- | --: | --- | --- | --- |
| `steady` 1× | 1 / 163 → **169 / 169** | 87,8 (last only) → **36,2 / 38,2 / 40,9 ms** | 70,7 → **10,2 ms** | 16,7 / 0 → 16,7 / 0 | 8,1 → 7,9 ms | 1,1 / 1,7 → **0,1 / 0,2 ms** | 2,5 / 3,1 → 3,1 / 3,6 ms | correct |
| `fast` 1× | 1 / 76 → **76 / 76** | 88,6 → **36,2 / 38,1 / 40,3 ms** | 71,1 → **9,6 ms** | 16,7 / 0 → 16,8 / 0 | 8,6 → 7,9 ms | 1,1 / 1,7 → 0,1 / 0,2 ms | 2,5 / 2,9 → 3,0 / 3,5 ms | correct |
| `steady` 4× | 1 / 125 → **41 / 144** | 187,9 → **66,3 / 87,0 / 123,1 ms** | 82,4 → **30,2 ms** | 50,0 / 49 → 49,9 / 51 | 39,4 → 37,2 ms | 0,2 / 5,3 → 0,1 / 0,8 ms | 6,8 / 11,0 → 6,5 / 10,8 ms | correct |
| `fast` 4× | 1 / 118 → **33 / 126** | 183,5 → **63,9 / 88,2 / 95,8 ms** | 93,0 → **−19,2 ms** (before the release) | 50,0 / 46 → 49,9 / 45 | 42,8 → 38,0 ms | 0,1 / 5,2 → 0,1 / 0,7 ms | 6,3 / 11,4 → 6,5 / 11,1 ms | correct |
| `steady` 1×, two Brins porteurs | 1 / 175 → **196 / 196** | 84,7 → **35,6 / 37,6 / 37,9 ms** | 67,8 → **9,3 ms** | 16,7 / 0 → 16,8 / 0 | 8,8 → 7,5 ms | 1,2 / 1,7 → 0,2 / 0,3 ms | 2,7 / 3,3 → 2,5 / 3,3 ms | correct |

Trace, `steady`: Workers 138 → **2 ms**; CesiumJS's animation frames 961 → 809 ms; main thread busy 3 103 → 2 834 ms; React's scheduler 1 356 → 1 301 ms (unchanged: § 5).

Reading it:

- **The 3D follows.** Every position the coupe asks is drawn, about two frames after the pointer moved: one frame for the scrub's React render to reach the renderer (asked → show, 8 ms), one for CesiumJS's next frame. The p95 is within 2 ms of the p50 and nothing is late by more than 41 ms.
- **`vue3d:render` grows by ≈ 0,6 ms a frame at 1×**: the line's build moved from the Workers into the frame that draws it. `vue3d:entities` loses 1 ms a frame, so the frame is cheaper in all. At 4× the render is unchanged (6,5 against 6,8 ms).
- **At 4×, the drawn positions are limited by the Page's re-render, not by the 3D.** React renders 70–80 times in 4 s (against 245 at 1×), each render coalescing the moves before it, and the Vue 3D draws one position in three or four of those it is handed. It is also what drops frames: one in five over 25 ms, before and after.
- **Two Brins porteurs**: the baseline's « 1 / 175 » counts scenes drawn *complete*. The two members were already redrawn every frame, but the Ligne A–B, the Fils à plomb and the anchors rebuilt behind them never finished. Now everything is complete on every frame.
- **Exactness and the end of the gesture.** In every run of both builds, the last position asked, the last drawn and the field are the same `x_D`, and no position is drawn after it. Fast drags at 4× included: CesiumJS draws only the scene it was last handed, synchronously, so no older one can land after a newer. The engine is untouched — the same `placeRider`, the same vertices through the passager's node (`throughNode`). Every unit test of the scene still passes; the new ones are in `vue-3d.test.ts`.
- **The picture.** At the end of `steady`, the Vue 3D's canvas (972 × 562 px) in the run's screenshot is **pixel-identical** before and after: 0 pixels differ.

**Tried, measured, not kept: handing the scene to the renderer in a layout effect.** `useLayoutEffect` instead of `useEffect` in `Vue3dHost` moved nothing: asked → show 7,9 → 7,8 ms, latency 36,2 → 36,2 ms. The 8 ms are before React's commit — the scheduler task that renders the Page after the event — not between the commit and the paint.

## 5. Options weighed

| Option | Measured or expected gain | Transfers | Complexity | Compatibility | Decision |
| --- | --- | --- | --- | --- | --- |
| **Draw the loaded line synchronously, leave the rest drawn** | measured, § 4: 1 → all positions drawn, 36 ms | none | one predicate, one renderer type | CesiumJS's public `Primitive` API, WebGL2 as before | **taken** |
| Throttle the scenes handed to the renderer to one build in flight | expected ≈ 12 updates/s at ≈ 70–150 ms each: a jerky line instead of a still one | none | small | as now | not taken: dominated by the above |
| Loaded line as a `CallbackProperty` entity (CesiumJS's own per-frame path) | expected the same as taken | none | smallest | — | not taken: CesiumJS draws **no** fainter ink behind a ridge for a line rebuilt every frame (`PolylineGeometryUpdater`'s dynamic path), so a ridge would hide the line whole — the rule the renderer keeps for one Brin porteur |
| Engine in a Worker | none: the solve is 0,1 ms (0,5 ms at 4×), and a round trip costs at least a task hop and a copy of ≈ 240 vertices; a stale result would also need a sequence number | postMessage, structured clone | asynchronous boundary in the scenario state | Workers everywhere | **discarded on the measures** |
| Engine in WebAssembly | none measurable: 0,1 ms of solve | none | a second toolchain | — | **discarded on the measures** |
| More GPU | none: rasterising is already the GPU's (WebGL2, ANGLE/Vulkan here); the line is ≈ 240 vertices; the CPU side of a frame is command submission (2,5–3,1 ms) | — | — | — | **discarded**: nothing on the CPU path is GPU-shaped |
| CesiumJS's Workers for this line | negative: they *were* the cause — async build plus the restart on every frame | geometry to and from the Worker | — | — | removed for the moving line; kept for every static line |
| `requestRenderMode` (render only on change) | none for the drag, which changes every frame; saves the idle frames' 2,5 ms and GPU time | none | the ride's clock, tile loads and the gestures must ask for frames | — | not taken here: follow-up, § 6 |
| Layout effect for `show` | measured 0 (§ 4) | none | trivial | — | not taken |
| One `placeRider` for both the coupe and the Vue 3D | ≤ 0,1 ms a move (0,7 ms at 4×) | none | lift the placed rider through the Page | — | not taken: below the noise; it touches how the Pages share their scene (#129) |

## 6. Results, then proposals — kept apart

**Results** (this report): the Vue 3D now follows the drag on every machine profile measured. It draws every position at 1× and 33–41 of 126–144 at 4×, 36 ms after the pointer at 1× and 64–66 ms at 4×, and it ends on the right position, drawn 10 ms after the release. The remaining cost of a drag on a slow CPU is the Page's React re-render: asked → show 37–38 ms at 4×, one frame in five over 25 ms.

**Proposals** (not done, each its own issue):

- **Re-render less of the Page on a scrub** — #129's question (store and subscription granularity). At 4× it is what drops frames and what limits how many positions reach the 3D; measure it with this harness's `--cpu 4` and its *asked → show*.
- **`requestRenderMode`** for the Vue 3D, rendering only on change: the idle view stops costing 2,5 ms of main thread and the GPU's time every frame. It needs every source of change to ask for a frame (the ride's clock, tile loads, the camera's gestures, the Banane's members). It does not make a drag smoother.
