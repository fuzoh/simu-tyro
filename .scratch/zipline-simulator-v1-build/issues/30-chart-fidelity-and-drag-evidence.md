# 30 — Capture chart fidelity and drag-performance evidence

**What to build:** Compare production Chart Block with still-present prototype for two measurements Node cannot establish: first-run vertical exaggeration and frame cadence while dragging rider. Preserve enough browser and machine context to repeat measurement after prototype disappears.

**Blocked by:** 28 — Keep safety controls usable under constrained height.

**Status:** done

- [x] First-run screen reports auto-fit vertical exaggeration **×1,86** at aspect 0,42 on the 1,1 L domain (badge « ×1,9 »), at and below § 5's reference chart column. — **item reworded and closed 2026-08-15** by [amendment I](../AMENDMENTS.md), which took option 1 below: the app draws ×1,86290 and the published ≈×1,5 was arithmetic from a superseded 1,05 L domain and a 1080×420 box the elected rule cannot produce, so **the spec moved, not the app**. Re-measured once more against the shipped tree on 2026-08-15. Voir « Item 1 » under ## Comments.
- [x] Measured plot aspect remains inside [0.35, 0.50] and first-run view stays clear of ×1 floor. — **qualified, and the tick is only true at and below § 5's reference chart column.** Measured here at five viewports it is 0,42000 to five places, dead centre of the band. But [amendment F](../AMENDMENTS.md#f--the-plots-height-is-capped-at--5s-reference-chart-column) has since capped the plot at 463,68 px, so above a **1372,8 px chart column** the *drawn* aspect falls out of the band's floor — 0,2927 at 1920 × 1080, 0,2085 at 2560 × 1440 — and the first-run view reaches the **×1 floor** at 2560 (and badge row 3 at 3440). Amendment F's cost 1 argues why that is acceptable rather than a regression (a cap can only ever *lower* the aspect, and the band's dangerous half is its ceiling); its cost 2 is what the clip costs and what closes it. **This box is ticked for the widths it was measured at, not for every width.**
- [x] Rider drag frame intervals are sampled in browser and p50 is recorded against 16.7 ms vsync interval.
- [x] Measurement records browser version, viewport, hardware context, sample method, and production/prototype values.
- [x] Evidence supports or overturns no-Web-Worker decision explicitly; no microsecond timing assertion is added to CI.
- [x] Reproducible browser procedure survives prototype deletion.

## Comments

**Environment, recorded once for both measurements.**

| | |
| --- | --- |
| Browser | Chromium **151.0.7922.137** (Arch Linux), headless (`HeadlessChrome/151.0.0.0`), `--use-angle=swiftshader-webgl`, dpr 1 |
| Driver | `agent-browser` 0.34.0, session `scoutech-t30`; timing driven over that session's CDP endpoint |
| CPU | **AMD RYZEN AI MAX+ 395 w/ Radeon 8060S** — 16 cores / **32 threads**, max 5187 MHz |
| OS | Linux 7.1.8-1-cachyos, Wayland host, browser on the headless ozone platform |
| Server | `bun run dev` (vite 8.2.0) on `http://localhost:3000`, `curl -s -o /dev/null -w '%{http_code}'` → **200** |
| Machine idle? | **No — not a clean-idle sample.** A second `agent-browser` browser instance (user-data-dir `agent-browser-chrome-214cb741…`) stayed resident for the whole pass; its browser process burned ~600 s of CPU across the session, though it read 0 ticks/10 s at rest. `loadavg` moved between **0,82 and 5,95** on 32 threads while sampling. Treated as contaminated on principle — see « What the contamination does and does not cost » below. |

### Item 1 — first-run vertical exaggeration · **needs a decision, left open**

Measured on the real drawing, not from the constants: `pxPerM_x` from the rendered corde A–B
(`x2 − x1` over `L`), `pxPerM_z` from the same line's `y2 − y1` over `h`, and `VE = pxPerM_z ÷
pxPerM_x`. The plot box is the `clipPath#scoutech-plot` rect's height against the SVG's measured
`getBoundingClientRect().width − 48` (the two 24 px gutters). The badge string is read from the
SVG, so the app's own claim and the geometry are two independent reads.

Session cleared (`localStorage.clear()`, keys `scoutech:session:v1` + `tanstack_devtools_state`) and
reloaded first, because a scenario left in the Session survives a reload and silently stops the
screen being the first-run screen.

| Viewport | Chart col | **Plot inner (measured)** | Aspect | `pxPerM_x` | `pxPerM_z` | **VE measured** | Badge |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1440×900 | 1152 | **1104 × 463,68** | **0,42000** | 6,69091 | 12,46452 | **×1,86290** | « Éch. verticale ×1,9 » |
| 1416×900 | 1128 | **1080 × 453,60** | **0,42000** | 6,54545 | 12,19355 | **×1,86290** | « Éch. verticale ×1,9 » |
| 1336×900 | 1048 | **1000 × 420,00** | **0,42000** | 6,06061 | 11,29032 | **×1,86290** | « Éch. verticale ×1,9 » |
| 768×1024 | 480 | 432 × 181,44 | **0,42000** | 2,61818 | 4,87742 | **×1,86290** | « Éch. verticale ×1,9 » |
| 390×664 | 390 | 342 × 143,64 | **0,42000** | 2,07273 | 3,86129 | **×1,86290** | « Éch. verticale ×1,9 » |

- **Aspect is 0,42000 at every width, to five places** — the guard band [0,35 ; 0,50] is not
  approached, and the three budget rows reproduce (144 / 181 / 464 px of tracé).
- **Clear of the ×1 floor by 86 %.** The badge is row 1 of § 5's three-row table (no « vraie
  échelle », no « câble hors cadre ») and « ×1 vraie échelle » in the View Strip is **enabled**
  (`button.disabled === false`), which is the rendered proof `clamped === false`.
- **VE is invariant to pixel size**, which is the identity's whole claim, and it is why the ×1,5
  target box cannot be hit: **a 1080×420 plot is aspect 0,3889 and the elected rule only ever
  produces 0,42.** 1080 px of width comes with 453,6 px of height (viewport 1416); 420 px of height
  comes with 1000 px of width (viewport 1336). Both were measured; both give ×1,86290.

**Why ×1,86 and not ×1,5, and what is actually stale.** Spec line 4987 derives ≈×1,5 as « z extent
30 m (A at 0 down to base B at −30) with 12 % margins ⇒ 37,2 m over **157,5 m** ». The z half
reproduces exactly — from the measurement, `plotHeight ÷ pxPerM_z` = **37,200 m** of padded domain,
i.e. **30,000 m** of data span. The x half does not: production's shared domain is **1,1 L = 165 m**
(§ 5 « the x domain is the shared `[d_A − 0,05 L, d_B + 0,05 L]` »), not 157,5 m — and the aspect is
the elected 0,42, not 0,3889. `0,42 × 165 ÷ 37,2 = 1,86290`, to the fifth place of what the browser
drew. So **the app is right and the re-check line is arithmetic from two superseded inputs** —
the same 1,05 L domain § 5 already says ticket 06 widened, and the prototype's box shape.

**The decision I am not taking.** Correcting « ≈ ×1,5 on a 1080×420 plot » to « ×1,86 at aspect 0,42
on the 1,1 L domain » edits a published spec figure, and it lands in three more places
(`spec.md` 2555 / 4987–4988 / 5487, and `docs/conventions/testing.md` 148). Options:

1. **Amend the re-check line** to ×1,86 and drop the 1080×420 box, since the box is unreachable
   under the elected rule. Cost: four documents change; the « first concrete point on the band »
   sentence keeps its meaning.
2. **Keep ×1,5 and re-open the x-domain or aspect choice.** Cost: 157,5 m breaks the shared domain
   that the two charts' alignment depends on, and aspect 0,3389 would be needed for a true ×1,5,
   which is *below* the band floor. This option is self-refuting on § 5's own guards.
3. **Leave both and annotate.** Cost: a live safety document carries a number no build reproduces.

Left for the map, not decided here.

#### Décision du propriétaire — 2026-08-15 : c'est l'option 1, et elle est livrée

**Recorded as [amendment I](../AMENDMENTS.md).** The re-check line now reads « auto-fit VE **×1,86**
at aspect 0,42 on the 1,1 L domain (badge « ×1,9 »), at and below § 5's reference chart column », and
**the 1080×420 box is dropped** as unreachable under the elected rule. Options 2 and 3 were rejected
for the reasons costed above — option 2 needs aspect 0,3389, below the band floor, and option 3 would
leave a live safety document carrying a number no build reproduces.

**Re-measured once more before the edit**, against the shipped tree rather than trusting this table:
`HeadlessChrome/151.0.0.0`, session cleared (`localStorage.clear()` then reload), viewport
**1440 × 900** read back from `innerWidth`/`innerHeight` — badge « **Éch. verticale ×1,9** », plot
clip **1152 × 463,68** (amendment F's cap to the pixel). The domain correction was verified rather
than assumed: plot inner **1104 px ÷ `pxPerM_x` 6,69091 = 165,0 m**, i.e. 1,1 L, so the spec's old
« `x` domain **[−3,75 ; 153,75] m** (span + 5 %) » was the superseded 1,05 L and now reads
**[−7,5 ; 157,5] m**.

**Edited, five sites:** `spec.md` × 4 (the § 5 re-check list, the first-paint paragraph — domain and
VE both — the A12 gate list, and the jsdom-limits paragraph) and `docs/conventions/testing.md` × 1.
`src/lib/layout/contract.test.ts`'s first-run case needed no change — it already asserted
`toBeCloseTo(1.8629, 4)` — but its docblock, which carried « reconciling it is an open spec
decision », now cites the settled figure.

**One record corrected while settling this.** A handoff claimed amendment F's ×1,9 was contradicted by
« a later reading of ×1,4 on the same host », unreconciled. **No such reading exists anywhere in the
repo**: every recorded first-run badge is ×1,9 (11 occurrences across tickets 29, 30, 34 and
`AMENDMENTS.md`), and the only other figure — ×1,2 — is this ticket's own `D_target` 6 leg *after* a
scenario change, which is not the first-run screen. There was nothing to reconcile, and the trap was
itself the stale record.

### Item 2 — rider drag frame cadence

**Sample method, stated precisely.** In-page `requestAnimationFrame` chain records, per frame, the
rAF timestamp **and** the rider glyph's current `cx` — so the report can say how many sampled frames
actually redrew. The drag is **real input**: `Input.dispatchMouseEvent` `mousePressed` on the rider's
own grab circle, then 251 `mouseMoved` events along a triangle path across 12 %→88 % of the plot and
back, then `mouseReleased`. No synthetic stepping function, no `step(index)` loop — the app's own
pointer handler is what moves the rider, and `getCoalescedEvents()` accounts for every event sent.
Two input densities were run because they answer different questions:

- **realistic** — one move per CDP round trip + 4 ms (≈ 56 Hz delivered, ~1 move per frame)
- **flood** — fire-and-forget + 2 ms (≈ 420 Hz raw; the page received 41–43 `pointermove` per 0,6 s,
  i.e. more than one per frame, with all 251 accounted for as coalesced)

Only frames inside the press→release window are counted.

**Production — `/`, first-run scenario, 1440×900:**

| Run | Input | Frames | n deltas | **rAF p50** | rAF p95 | rAF max | >20 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | realistic | 254 | 253 | **16,7** | 16,7 | 16,8 | 0 |
| 2 | realistic | 253 | 252 | **16,7** | 16,8 | 16,8 | 0 |
| 3 | realistic | 252 | 251 | **16,7** | 16,7 | 16,8 | 0 |
| idle baseline (no input at all) | — | 78 | 77 | **16,7** | 16,7 | 16,8 | 0 |
| 1500 m span (`?L=1500&h=-120&fl=60&d=20`) ×2 | realistic | 274 / 272 | 273 / 271 | **16,7** | 16,7–16,8 | 16,8 / 33,3 | 0 / 1 |
| flood ×3 | flood | 33 / 33 / 34 | 32 / 32 / 33 | **16,7** | 16,8–33,3 | 33,3–33,5 | 0–2 |

**Prototype — `/prototype/profile-view?variant=D`, same box, same script:**

| Scenario | Input | Frames | **rAF p50** | rAF p95 | rAF max | >20 ms |
| --- | --- | --- | --- | --- | --- | --- |
| z3 120 m incliné ×2 | realistic | 266 / 259 | **16,7** | 16,7–16,8 | 16,8 | 0 |
| 1500 m long ×2 | realistic | 262 / 259 | **16,7** | 16,7–16,8 | 16,8 | 0 |
| z3 ×3 | flood | 35 | **16,7** | 16,7–16,8 | 16,8 | 0 |

**Both sides sit on the vsync interval.** p50 **16,7 ms** against a 16,7 ms vsync, in production and
in the prototype, at 150 m and at 1500 m, and — the load-bearing control — **the idle page with no
pointer input at all measures the same 16,7 / 16,8**. Dragging the rider costs nothing above vsync.
That reproduces § 2's « vsync-bound, not compute-bound » from the app rather than from the prototype.

**One difference from the prototype, recorded but not a cadence failure.** The prototype's own
`useFrameMeter` is **commit-to-commit**, not frame-to-frame (`src/routes/-prototype-07/use-model.ts`
:214, a `useLayoutEffect` that samples on every render) — so § 2's published « frame p50 16,70 /
p95 18,40 » is that quantity, not rAF cadence. Measured the same way, on a fresh load, flood input:

| | frames | frames that redrew rider | commit-to-commit p50 | p95 | dropped frames / run |
| --- | --- | --- | --- | --- | --- |
| **production** ×3 | 33–34 | **16–17 (≈ 49 %)** | **30,0–31,7 ms** | 54–56 ms | 2 |
| **prototype** ×3 | 35 | **22–23 (≈ 64 %)** | **22,9–24,0 ms** | 28–30 ms | 0 |

> **⚠ SUPERSEDED — both rows of this table are withdrawn as host artefacts.** They were taken on the
> contaminated machine described in the environment table above. Re-taken on a quiet machine on
> 2026-08-14: production **7,1–7,5 ms** / 88–91 % redraw, prototype **3,7–4,0 ms** / 100 % redraw —
> 4× and 6× faster than recorded here. The *direction* (prototype commits faster under a flood)
> survives; the magnitudes do not. Voir
> [« Quiet-machine re-take of the commit cadence — 2026-08-14 »](#quiet-machine-re-take-of-the-commit-cadence--2026-08-14)
> at the bottom of this file. Nothing is deleted here: the numbers stay readable so the contamination
> is auditable.

Under a 420 Hz flood production commits the rider at ≈ 32 Hz where the prototype manages ≈ 42 Hz,
and drops 2 frames per 33 where the prototype drops none. At **realistic** delivery (~56 Hz)
production dropped 0–1 frames in ~270 and p95 stayed at 16,7 — so this only shows up when input
arrives faster than the screen. **⚠ The « ≈ 32 Hz vs ≈ 42 Hz » sentence is withdrawn with the table:
on a quiet machine it is ≈ 133 Hz vs ≈ 265 Hz of commit rate, and at realistic delivery both sides
commit once per vsync frame. The prototype's realistic-input commit cadence — the figure this
paragraph never actually measured — is now recorded in the 2026-08-14 addendum below.** Reported as
an observation rather than a defect because I could not
attribute it inside this harness: headless Chromium's own input coalescing and React 19's
default-priority batching of a continuous `pointermove` are both plausible causes, and separating
them needs a profiler trace, not a frame count. It is **orthogonal to the worker question** either
way: the rider path is « an index lookup plus one `sampleCable(200)` » (§ 2) and never re-enters
`sweep()`, so there is nothing in it a worker could take.

### The no-Web-Worker decision: **SUPPORTED, not overturned**

Three measured reasons, in the order they bind:

1. **The frame budget is never the constraint.** p50 16,7 ms = vsync, p95 16,7–16,8 ms, and
   **zero** intervals above 20 ms across ~1 500 frame deltas at realistic input density, in both
   the 150 m first-run case and a 1500 m span. A thread that is not saturated cannot be relieved by
   a second thread.
2. **The idle control settles it.** The same page with **no drag at all** measures 16,7 / 16,8. The
   drag adds no measurable frame cost, so there is no cost to move off-thread.
3. **What varies is not on the worker's side of the seam.** The only production-vs-prototype gap is
   commit cadence under a flood, and § 2's `useSweep` seam already covers the async case it would
   need. § 2's own inference stands unchanged: « off-threading would not have made dragging
   smoother ».

**Nothing was added to CI.** No microsecond assertion, no timing test, no new file — `bun run test`
is unchanged at 39 files / 1268 cases. The evidence lives in this ticket, which is what the ticket
asked for and what makes it re-takeable rather than flaky.

**What the contamination does and does not cost.** The pass was not clean-idle (see the table). What
that could bias is the tail — a busy machine drops frames — and the tail is exactly where the
realistic runs read **zero intervals above 20 ms**. The p50 is *saturated at the vsync interval*: it
cannot be made to look better by load, only worse. So the direction of the contamination is
opposite to the conclusion, and the conclusion holds in spite of it rather than because of it. The
two flood-run dropped frames are the one number I would not defend on a loaded machine.

### The procedure, written to survive `/prototype/profile-view`'s deletion

Nothing below reads the prototype. Steps 1–6 are the production half in full; the prototype column
of the tables above is the part that dies with ticket 36, and it is already recorded.

```
# 0 · server + machine context
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/     # expect 200
lscpu | grep -E 'Model name|^CPU\(s\)' ; cat /proc/loadavg         # record both
chromium --version                                                # record
pgrep -fa 'agent-browser|chrome.*--remote-debugging'              # nothing else, or say so

# 1 · own session, explicit viewport, then MEASURE the viewport
agent-browser --session t30 set viewport 1440 900
agent-browser --session t30 open http://localhost:3000/
agent-browser --session t30 eval "[innerWidth, innerHeight, devicePixelRatio]"

# 2 · make it really the first run — a Session survives a reload
agent-browser --session t30 eval "(() => { localStorage.clear(); return 1; })()"
agent-browser --session t30 open http://localhost:3000/

# 3 · VE and aspect from the drawing (script: scratchpad t30/ve.js in this pass)
#     plot inner width  = svg.getBoundingClientRect().width - 48      (2 × GUTTER)
#     plot inner height = clipPath#scoutech-plot rect @height
#     pxPerM_x = (corde x2 - x1) / L      pxPerM_z = |corde y2 - y1| / |h|
#     VE = pxPerM_z / pxPerM_x            aspect = height / width
#     cross-checks: the badge text in the SVG, and « ×1 vraie échelle ».disabled === false
#     repeat at 1416×900 (1080 px wide plot) and 1336×900 (420 px tall plot)

# 4 · CDP endpoint for real input
agent-browser --session t30 get cdp-url            # browser endpoint
curl -s http://127.0.0.1:<port>/json/list          # take the page target's webSocketDebuggerUrl

# 5 · real drag, rAF cadence (script: scratchpad t30/drag4.py in this pass)
#     arm: rAF chain pushing (timestamp, rider circle.chart-grab cx) each frame
#     drive: Input.dispatchMouseEvent mousePressed on the grab circle,
#            251 × mouseMoved across 12 % → 88 % → 12 % of the plot, mouseReleased
#     report: deltas of consecutive rAF timestamps inside the press/release window,
#             p50 / p95 / max / count over 20 ms, plus how many frames redrew the rider
#     run the same script with no input at all — that idle baseline is what makes the
#     drag number mean something

# 6 · gates
bun run typecheck ; bun run lint-type-aware ; bun run test
```

Two host limits that will still be true next time, both re-confirmed here: **coarse pointer is not
observable** (`navigator.maxTouchPoints === 0`, `matchMedia('(pointer: coarse)')` false even after
`set device`), and headless Chromium **spins its compositor** while a page animates, so « was the
machine idle » has to be read from `/proc/<pid>/stat` deltas, not from the absence of visible work.

**One incidental, filed here because it cost this pass two dev servers.** Loading
`/prototype/profile-view` makes the dev server emit TanStack-Devtools SSR-hydration diffs
**continuously** — 5,2 GB and 2,8 GB of log in two separate runs, which filled `/tmp` and killed
both `bun run dev` processes (the orchestrator's included; that is why the server answered `000` at
the start of this pass). Any future prototype visit should send dev-server stdout to `/dev/null`.
It disappears with ticket 36 and needs no fix.

**Gates.** `bun run typecheck` → exit 0. `bun run lint-type-aware` → exit 0. `bun run test` → **39
files / 1268 tests passed**, 1,19 s. `src/**` untouched by this ticket — read-only pass.

**Status stays `claimed`**, on one item: the first-run VE reads ×1,86, not the ≈×1,5 the acceptance
line names, and reconciling them is a spec decision (three options costed above) that a build ticket
may not take. Everything else on the list passes and is recorded above.

---

## Fix pass — 2026-08-14

Second agent, own working tree, own browser session `scoutech-fix30`. Chromium **151.0.7922.137**
(Arch), headless, dpr 1, `agent-browser` 0.34.0, `bun run dev` on `http://localhost:3000` → **200**.
Machine **quieter than the measuring run above**: `/proc/loadavg` **1,14 → 1,55** on 32 threads
throughout, and no second resident browser instance.

**One file changed, and it is a test:** `src/lib/layout/contract.test.ts`. No production source
touched, nothing under `src/routes/-prototype-07/**` touched, no spec or convention document edited.

### Item 1 — first-run VE · **reproduced exactly, and left open as a spec decision**

Re-measured from the drawing at 1416×900, `localStorage.clear()` + reload first:

| | measured here | measured above |
| --- | --- | --- |
| Plot inner | **1080 × 453,60 px** | 1080 × 453,60 px |
| Aspect | **0,42000** | 0,42000 |
| `pxPerM_x` / `pxPerM_z` | **6,54545 / 12,19355** | 6,54545 / 12,19355 |
| **VE** | **×1,86290** | ×1,86290 |
| Badge · peek | « Éch. verticale ×1,9 » · `.disabled === false` | idem |
| Padded z domain / data span | **37,200 m / 30,000 m** | 37,200 / 30,000 |

Digit-for-digit. **Not fixed, deliberately** — the fix edits a published spec figure (`spec.md`
2555 / 4987–4988 / 5487 and `docs/conventions/testing.md` 148), which is the decision this ticket
already declines. Two findings from the reproduction, both strengthening « the re-check line is
stale, the app is right »:

- **§ 5 contradicts the re-check line on its own.** `spec.md`:2130 publishes « règle élue, aux trois
  viewports ⇒ ×1,56 … ×4,67 », and 2101–2102 fixes the x domain at `1,1 L`. A ≈×1,5 badge is
  **below § 5's own published minimum**, so no scenario under the elected rule can read it.
- **A true ×1,5 on the shipped scenario needs aspect 0,3382**, under the Plot Aspect Band floor of
  0,35 — option 2 stays self-refuting, now with the number written down.

**What was added instead, at the pure seam the report names.** `exaggeration()` was already
unit-tested across § 5's seven `k` rows — but **none of the seven is the shipped scenario**, so the
first screen had no lock at all and could drift with the suite green. New case, `node`, no DOM:

> `§ 5 — vertical exaggeration › the first-run screen draws ×1,86 at aspect 0,42 — the measured
> first point on the band`

It asserts `ve` **1,8629**, `clamped === false`, `peekEnabled === true`, the badge « Éch. verticale
×1,9 », `zVisibleSpan` 37,2 m, and `profilePlotHeight(1080) = 453,6` — the browser measurement,
locked as arithmetic. It takes **no** side on the spec decision: it records what the app draws, and
its job is to **fail loudly** if someone chases ×1,5 by nudging `PROFILE_ASPECT` or `X_MARGIN`
instead of taking the decision. The acceptance box stays unticked.

### Item 2 — drag cadence under a flood · **does not reproduce**

Same script (`scratchpad t30/drag4.py --fast`: fire-and-forget `Input.dispatchMouseEvent`, 2 ms
spacing, 251 moves), same 1440×900 box, fresh load before each run, real CDP input on the rider's
own grab circle.

| | frames | frames that redrew rider | rAF p50 | rAF p95 | rAF max | >20 ms |
| --- | --- | --- | --- | --- | --- | --- |
| **production** ×4 | 34 / 32 / 33 / 32 | **30 · 27 · 29 · 28 (85–91 %)** | **16,7** | 16,7–16,8 | 16,7–33,4 | **0 / 1 / 0 / 1** |
| **prototype** ×2 (`?variant=D&scenario=z3`) | 32 / 32 | **30 · 31 (97–100 %)** | **16,7** | 16,7–16,8 | 16,8–33,4 | **0 / 0** |

Production's rider `cx` mutation cadence read **p50 8,2 ms / p95 14,7 ms** (65 commits in 568 ms)
against the reported 30,0–31,7 / 54–56. The reported **49 % redraw · ≈32 Hz commit · 2 dropped
frames per 33** is **absent**: 85–91 % redraw, vsync p50, 0–1 dropped frames per ~32 over four runs.
Delivered input was denser here too — 71 `pointermove` per 568 ms ≈ 125 Hz, against 41–43 per 0,6 s
— which is itself a sign the earlier sample was host-limited rather than app-limited.

The pass above was right to file this as an observation, not a defect. On a quiet machine the residue
is 1–4 frames per 32, and **that residue is by design, not scheduling**: pointer input snaps to one
of the sweep's 260 steps (`snapToStep`, `chart-block.tsx`:215) — ≈0,62 m ≈ 4,2 px per step in this
box — so a frame whose coalesced move lands back on the same step **correctly** commits nothing. The
prototype does not snap, so it redraws every frame. **No code changed**:
`src/components/chart/profile.tsx` and `chart-block.tsx` are untouched, and redrawing on every
delivered `pointermove` would delete the snap § 5 asks for.

### Item 3 — prototype dev-server log flood · **reproduced, prototype-only, no fix**

Reproduced **on its own server** (`bunx vite dev --port 3007`, stdout to a scratch file — never the
orchestrator's `:3000`), then sitting on `/prototype/profile-view?variant=D&scenario=z3`:

```
174 068 → 365 398 → 536 588 → 667 498 → 778 268 → 889 038 bytes   (one sample per 5 s)
```

≈ **24 KB/s unbounded**, ≈1,4 MB/min, **with no interaction at all** — 1,78 MB by the time the
server was stopped. The content is React's hydration-mismatch dump re-emitted continuously, and the
diff names the prototype: `<RiderGlyph … plot={{width:900, …}}>` at
`/src/routes/-prototype-07/variant-d.tsx:74`, differing in the **last float digit**
(`x1="444.4508432587664"` server against `x1={444.4508432587661}` client). `/` does not do it.

**No fix.** The mismatch lives inside `src/routes/-prototype-07/**`, which this run may not modify
and which **ticket 36** deletes; a float-identical SSR path for a throwaway prototype is work with a
scheduled expiry date. The operational note above stands: **send dev-server stdout to `/dev/null`
for any prototype visit**, and a dev server that dies of it is not evidence of an app fault. The
scratch log was deleted, `:3007` stopped, `:3000` left running and answering 200.

**Gates, after the change.** `bunx oxfmt --write src/lib/layout/contract.test.ts` → 1 file ·
`bun run typecheck` → **exit 0** · `bun run lint-type-aware` → **exit 0** · `bun run test` → **39
files / 1270 tests passed**, 1,27 s (1268 before — the one new case). Browser session
`scoutech-fix30` closed; no `close --all`.

**Status stays `claimed`**, for the same single reason: acceptance item 1 needs the spec decision on
≈×1,5, which is not a build ticket's to take. Items 2 and 3 needed no code, and now say so with
numbers.

---

## Re-verification pass — 2026-08-14

Third agent, **read-only on `src/`** — nothing under `src/` was touched here, and neither was
`spec.md`, `docs/conventions/testing.md` nor `src/routes/-prototype-07/**`. Own browser session
`scoutech-t30-re`, closed at the end; no `close --all`.

| | |
| --- | --- |
| Browser | Chromium **151.0.7922.137** (Arch Linux), headless, UA `HeadlessChrome/151.0.0.0`, `devicePixelRatio` **1** |
| Driver | `agent-browser` **0.34.0**, session `scoutech-t30-re`; timing over that session's CDP browser endpoint `ws://127.0.0.1:44333` |
| CPU / OS | 32 threads (`nproc`), Linux 7.1.8-1-cachyos, headless ozone |
| Machine | **quiet** — `/proc/loadavg` 1-min **0,15 → 2,21** across the pass (0,15 at rest, 2,21 only inside a drag run). **No second resident browser**: `pgrep -c chrome` = 5, all this session's. `/tmp` 23 G free before and after |
| Server | the orchestrator's `bun run dev` on `http://localhost:3000` → **200** before and after. The prototype leg ran on a **separate** `bunx vite dev --port 3011` with stdout to a scratch file, stopped afterwards (`:3011` → `000`, `:3000` → `200`), so the orchestrator's stdout was never the prototype's dumping ground |

**Gates, run here rather than taken on trust:**

- `bun run typecheck` → **exit 0**, output `$ tsc --noEmit` and nothing else.
- `bun run lint-type-aware` → **exit 0**, output `$ oxlint --type-aware --type-check` and nothing else.
- `bun run test` → **exit 0**, vitest 4.1.10, **39 files / 1288 tests passed**, 1,16 s. (The fix
  section above reported 1270; the extra 18 are other tickets' fix agents landing cases in the same
  run, not this ticket's.) The ticket-30 lock in isolation:
  `bunx vitest run src/lib/layout/contract.test.ts -t "first-run screen draws"` → **1 passed |
  86 skipped**.

### Item 1 · first-run VE — **reproduces a third time, still ×1,86, decision still open**

`localStorage.clear()` + reload before each read; VE from the rendered corde A–B, plot box from
`clipPath#scoutech-plot` against `svg.getBoundingClientRect().width − 48`:

| Viewport | svg | **Plot inner** | Aspect | `pxPerM_x` | `pxPerM_z` | **VE** | Badge | peek `.disabled` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440×900 | 1152 | **1104 × 463,68** | **0,42000** | 6,69091 | 12,46452 | **×1,86290** | « Éch. verticale ×1,9 » | `false` |
| 1416×900 | 1128 | **1080 × 453,60** | **0,42000** | 6,54545 | 12,19355 | **×1,86290** | idem | `false` |
| 1336×900 | 1048 | **1000 × 420,00** | **0,42000** | 6,06061 | 11,29032 | **×1,86290** | idem | `false` |
| 768×1024 | 480 | 432 × 181,44 | **0,42000** | 2,61818 | 4,87742 | **×1,86290** | idem | `false` |
| 390×664 | 390 | 342 × 143,64 | **0,42000** | 2,07273 | 3,86129 | **×1,86290** | idem | `false` |

Padded z domain **37,200 m** / data span **30,000 m** at all five. Every figure matches the two
earlier passes digit-for-digit, so **nothing that landed elsewhere in this run moved the plot box**.
`spec.md` 2555 / 4987–4988 / 5487 and `docs/conventions/testing.md` 148 still read « ≈ ×1,5 on a
1080×420 plot » (neither file is modified in the working tree) — the decision is genuinely still
open, not silently amended. **Acceptance item 1 stays unticked.**

### Item 2 · band, ×1 floor, and the two adjacent controls

- Aspect **0,42000** at five viewports; the band [0,35 ; 0,50] is never approached, and VE ×1,86 is
  **86 % clear** of the ×1 floor.
- First paint, read off the SVG: « corde A–B » `aria-pressed="true"`, « ligne à vide »
  `aria-pressed="false"`, « ×1 vraie échelle » **enabled** — § 5's row-1 badge state, rendered.
- **The peek control works, and its clamp arithmetic is exact.** `<button aria-label="×1 vraie
  échelle">` is *hold*-to-peek on a fine pointer (`view-strip.tsx` 115–133), so a plain `click`
  (down **and** up) correctly leaves the badge at ×1,9 — that is not a defect. Driven the keyboard
  way instead (focus + `Space`): **VE exactly ×1,00000**, `pxPerM_z` **= 6,69091 =** `pxPerM_x`,
  badge « **Éch. verticale ×1 — vraie échelle** », padded z domain **69,3 m**; a second `Space`
  restores ×1,86290 / 37,2 m. The ×1 path is live, not merely enabled.
- **A second scenario, since one box proves little.** Full 1500 m link (every key present, so no
  salvage banner): aspect **0,42000**, **VE ×4,05912**, badge « Éch. verticale ×4,1 » — inside the
  band and under § 5's published ×4,67 ceiling for the elected rule.
  *Recorded so the next pass does not mistake it for a chart fault:* the **short** form
  `?L=1500&h=-120&fl=60&d=20` puts the block at `data-collapse="pinned"` with the chart's parents
  `display: none`, because the « Champs absents du lien » banner spends the height collapse
  condition (c) needs. That is ticket 27/28 behaviour reached through a banner, and the chart draws
  normally the moment the banner is gone.

**Ajout du 2026-08-14 — au-dessus de la colonne de référence, la 3ᵉ ligne du badge devient
atteignable *par la boîte*, et c'est le coût 2 de l'amendement F.** Tout ce qui est mesuré ci-dessus
reste vrai — aspect 0,42, VE ×1,86, plancher ×1 à 86 % de marge — parce que le cap est transparent à
`W_inner` ≤ 1104. Au-delà, `plotAspect = 463,68 / W_inner` baisse, et la condition de coupe de
`exaggeration` (`clamped ∧ plotAspect × xSpan < zDataSpan`) devient **`plotAspect < 1 / (1,24 k)`**,
soit une coupe qui s'ouvre à `W_inner = 574,96 × k` : **une fonction de la boîte seule**, alors que § 5
écrit que cette ligne du badge est « reachable **from the data, not from the box** ». Mesuré à
**2560 × 1440** (colonne 2272, `W_inner` 2224, bloc 879,672, `whole` · `roomy`), scénario
`?L=200&h=-40&za=12&zb=12&fl=6` : badge « **Éch. verticale ×1 — vraie échelle · câble hors cadre** »,
« Garde min (traversée) » **1,83 m**, « Garde min » du View Strip **1,89 m**, **aucun contact au sol et
aucune bannière de verdict** — le câble est coupé en haut du cadre sur une ligne saine. Balayage de
largeur : absente à 2290 × 1440 (`W_inner` 1954), présente à 2300 × 1440 (`W_inner` 1964). Ce qui
divulgue reste **la 3ᵉ ligne du badge plus la « Garde min » imprimée** (le signal non positionnel de
§ 5), pas une bannière de sol ; et le contrôle « peek » est justement désactivé quand le clamp tient.
Le détail chiffré, les options rejetées et la question § 5 laissée ouverte sont dans
[AMENDMENTS.md § F, coût 2](../AMENDMENTS.md).

**Mise à jour du 2026-08-14 — la dernière clause ci-dessus est levée par la décision 4 du
propriétaire.** Le « peek » reste désactivé quand la coupe vient de la **donnée** (« mou profond » :
mesuré désactivé à 2560 × 1440 sur `?L=200&h=-18&za=12&zb=12&lo=400`, garde −161 m) et est **réactivé
quand c'est le cap qui coupe** : à 2560 × 1440 sur le scénario mesuré ci-dessus le contrôle lit
« voir tout le câble », actif, et le maintien ramène le câble entier dans le cadre (`y` −3 … 401,4 au
repos, **72,9 … 360,5** maintenu, cadre 28 … 491,68) sous le badge « Éch. verticale ×0,7 — sous la
vraie échelle · câble entier ». Tout le reste de cet item est inchangé : à 1440 × 900 le premier
lancement lit toujours « Éch. verticale ×1,9 » avec « ×1 vraie échelle » **actif**, garde 2,44 / 2,48 m.
Voir [AMENDMENTS.md § F, coût 2 « ADDRESSED »](../AMENDMENTS.md).

**Deuxième mise à jour du 2026-08-14 — le maintien n'était pas seulement un maintien, et il ressuscitait.**
Deux précisions sur le badge que cet item porte, toutes deux mesurées à 2560 × 1440 sur
`?L=200&h=-40&za=12&zb=12&fl=6` (session `fixdec-7cbe9071d13d`, `HeadlessChrome/151.0.0.0`) :

1. **Le contrôle est une bascule au clavier dans les deux modes de pointeur** (§ 5) et sous
   `(pointer: coarse)`, donc le badge « ×0,7 — sous la vraie échelle · câble entier » **reste affiché**
   après un seul `Space` (`aria-pressed="true"`) jusqu'à l'appui suivant. « Un transitoire » décrivait le
   bras pointeur fin, pas les deux ; ce qui est inconditionnel, c'est **jamais persisté** (aucune clé
   Session ni URL) et **toujours annoncé par le badge**.
2. **Défaut corrigé** : le drapeau de maintien n'était que *masqué* pendant que le mode valait `"off"`,
   jamais effacé, donc une excursion de largeur le **ré-armait**. `Space` à 2560, `set viewport
   2000 1440` (contrôle désactivé, badge « ×1 — vraie échelle »), retour à 2560 → le badge
   « ×0,7 — sous la vraie échelle · câble entier » revenait, `aria-pressed="true"`, sans focus et sans
   saisie. Après correction ce même trajet finit sur **« ×1 — vraie échelle · câble hors cadre »**,
   `aria-pressed="false"` ; la bascule (`Space`, `Space`) et la tenue au pointeur fin sont vérifiées
   intactes. Table complète des trajets : [AMENDMENTS.md § F, coût 2](../AMENDMENTS.md).

### Item 3 · drag cadence — **the reported defect does not reproduce**

Same script, same real input (`Input.dispatchMouseEvent` on `circle.chart-grab`, 251 moves over a
12 % → 88 % → 12 % triangle), fresh load before every run, 1440×900.

| Run | Input | Frames | Redrew rider | **rAF p50** | rAF p95 | rAF max | >20 ms | commit p50 / p95 | `pointermove` in window |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| prod flood 1 | ≈420 Hz | 34 | **30 (91 %)** | **16,7** | 16,8 | 16,8 | **0** | 7,4 / 14,2 ms | 71 · coalesced 251 |
| prod flood 2 | ≈420 Hz | 34 | **29 (88 %)** | **16,7** | 16,8 | 16,8 | **0** | 8,0 / 17,8 ms | 70 · coalesced 251 |
| prod flood 3 | ≈420 Hz | 33 | **28 (85 %)** | **16,7** | 16,7 | 16,8 | **0** | 7,4 / 13,4 ms | 80 · coalesced 251 |
| prod realistic 1 | ≈56 Hz | 259 | **249 (96,5 %)** | **16,7** | 16,7 | 16,8 | **0** | 16,7 / 24,4 ms | 251 |
| prod realistic 2 | ≈56 Hz | 259 | **249 (96,5 %)** | **16,7** | 16,8 | 50,0 | 2 | 16,6 / 24,6 ms | 251 |
| prod 1500 m realistic | ≈56 Hz | 256 | 229 (90 %) | **16,7** | 16,7 | 16,8 | **0** | — | 251 |
| **idle baseline, no input** | — | 79 | 0 | **16,7** | 16,8 | 16,8 | **0** | — | 0 |
| proto flood 1 (`:3011`) | ≈420 Hz | 33 | 32 (100 %) | **16,7** | 16,7 | 16,8 | **0** | 4,0 / 5,5 ms | 149 · coalesced 251 |
| proto flood 2 (`:3011`) | ≈420 Hz | 32 | 30 (97 %) | **16,7** | 16,7 | 33,3 | **0** | 4,2 / 5,7 ms | 135 · coalesced 251 |

The measuring pass's flood figures — **49 % redraw, commit p50 30,0–31,7 ms, 2 dropped frames per
33** — are **absent** on a quiet machine: 85–91 % redraw, commit p50 **7,4–8,0 ms**, **zero**
intervals over 20 ms across three flood runs. That confirms the fix section's reading from a third
machine state (loadavg 0,15–0,52 at the flood runs against 0,82–5,95 originally, and no second
browser resident). The one tail event of this pass is realistic run 2's two 50 ms intervals, on a run
whose p95 stayed at 16,8 ms.

Production's residual gap to the prototype (85–91 % against 94–100 % of frames redrawing) tracks
`snapToStep` — the call is `snapToStep(scene.traverse, clampToSpan(metres, scene.L))` at
`src/components/chart/chart-block.tsx`:**222** (the fix note above says 215; the import is line 47).
A coalesced move landing back on the same sweep step commits nothing, which is the snap § 5 asks
for, and it is why the 1500 m run redraws 90 % of frames where the 150 m run redraws 96,5 %: a
longer span puts more metres behind each step. **No code change is warranted and none was made.**

### Item 4 · the prototype's dev-server log flood — **still reproduces, still out of scope**

On the isolated `:3011` only, sitting on `/prototype/profile-view?variant=D&scenario=z3` with **no
interaction**, one `wc -c` per 5 s:

```
93 508 → 264 698 → 435 888 → 607 078 → 768 198 → 939 388 → 1 100 508 bytes  (30 s)
```

**1 007 000 B / 30 s ≈ 33,6 KB/s ≈ 2,0 MB/min, unbounded.** 109 hydration-mismatch dumps in that
window, every one naming `/src/routes/-prototype-07/variant-d.tsx:74` and differing in the last float
digit (`x1="444.4508432587664"` server against `x1={444.4508432587661}` client). `/` does not do it.
Prototype-only, deleted by **ticket 36**, out of scope here. The operational rule stands: **send
dev-server stdout to `/dev/null` for any prototype visit** — and never point the prototype at a
server another agent depends on.

### One amendment to the written procedure (item 6)

Step 3 as written can read the **Skeleton**: an `eval` fired immediately after `agent-browser open`
returns `profileVisible: false` at *every* viewport, because the profile SVG is not mounted yet. Four
viewports read blank that way before a settle was added. Insert between steps 2 and 3:

```
sleep 2      # or poll until svg[aria-label="Profil du terrain et du câble"] has width > 0
```

With that one line, steps 0–6 of the procedure re-ran end to end here **without reading a single
prototype file** — which is the property item 6 claims.

### Verdict of this pass

Items 2–6 **hold, re-measured**. Item 1 **fails as written and is correctly left open**: the app
draws ×1,86290 at aspect 0,42000, internally consistent to five places and now locked by a colocated
`node` case, while `spec.md` and `docs/conventions/testing.md` still publish ≈×1,5 on an unreachable
1080×420 box. **Status stays `claimed`** on that one item — it is a spec decision, and the three
costed options above are still the whole of it.

---

## Quiet-machine re-take of the commit cadence — 2026-08-14

Fourth agent, **read-only on `src/`, on `spec.md`, on the conventions and on
`src/routes/-prototype-07/**`** — the only file this run writes is this one. Own browser sessions
`t30q` (production) and `t30p` (prototype); the prototype session was closed, **no `close --all`**.

**Scope, narrowly.** One thing was re-taken: the **prototype's realistic-input commit cadence**, plus
production's alongside it in the same sitting, because the two had never been measured under one set
of conditions. The rAF-cadence acceptance item (16,7 ms p50 against the 16,7 ms vsync interval, with
an idle control) is **not re-opened** — it was already solid on both sides across three runs, and it
reproduced again here for free.

**Why it needed re-taking.** The measuring run's commit-cadence table (production 30,0–31,7 ms /
49 % redraw, prototype 22,9–24,0 ms / 64 %) declared itself **contaminated** — a second resident
`agent-browser` instance and `loadavg` 0,82–5,95. The re-verification run corrected the *flood*
figures on `:3011` but drove **flood input only**. So the prototype's commit numbers under
**realistic** input survived from nowhere at all, and its flood numbers survived only from the
contaminated sample. This addendum closes both holes from one machine state.

### The machine was quiet, and here is the evidence rather than the assertion

| | |
| --- | --- |
| Other browsers at start | `pgrep -fa 'agent-browser\|chrome.*--remote-debugging'` → **nothing** but the `pgrep` shell's own command line. **No second resident browser instance** — unlike the measuring run |
| Browsers during | **one** automated `user-data-dir` only (`/tmp/agent-browser-chrome-f63aa44c-…`, 20 procs, all this run's own session). Verified with `pgrep -fa chrome \| rg -o 'user-data-dir=[^ ]*' \| sort -u` → one line |
| The one thing that *was* resident, named for honesty | the **human's own desktop Chromium** (`~/.config/chromium`, pid 2875 / 3020, alive since boot 23 h earlier) and VS Code's crashpad handler. Neither carries `--remote-debugging`, neither was under automation, and both hold only `--type=renderer --top-chrome-webui` — i.e. browser chrome, no page being driven. They are **not** the contaminated run's problem, which was a **second `agent-browser` browser instance** burning ~600 s of CPU beside the measured one. Recorded rather than omitted, because « quiet » should mean a measured claim |
| `uptime` at start | `15:39:04 up 23:06, 1 user, load average: 0.38, 0.66, 0.80` |
| `/proc/loadavg` 1-min, sampled before **every** measured run | **0,20 · 0,28 · 0,63 · 0,66 · 0,85 · 0,85 · 0,92 · 0,93 · 0,98 · 1,11** on 32 threads — never above **1,11**, against **0,82–5,95** in the contaminated sample |
| CPU | **AMD RYZEN AI MAX+ 395 w/ Radeon 8060S**, `nproc` **32** (16 cores × 2 threads), max 5187,5 MHz, min 625 MHz, scaling MHz at 50 % |
| OS | Linux 7.1.8-1-cachyos, Wayland host, browser on the headless ozone platform |
| Browser | Chromium **151.0.7922.137** (Arch Linux), headless, UA `HeadlessChrome/151.0.0.0`, **`devicePixelRatio` 1** |
| Driver | `agent-browser` **0.34.0**; timing driven over the session's own CDP **page** endpoint, not over the CLI |
| Viewport | `set viewport 1440 900`, then **read back** from the page: `[innerWidth, innerHeight, devicePixelRatio]` → **`[1440, 900, 1]`**, on both sides |
| `/tmp` | **23 G free** before and after (568 M used of 24 G at the end) |
| Servers | production on the orchestrator's `:3000` → **200** before, between runs and after. Prototype on a **separate** `./node_modules/.bin/vite dev --port 3013` with **stdout and stderr to `/dev/null`** — never a file, never `:3000`. Stopped at the end: `:3013` → **000**, `:3000` → **200** |

**The prototype server survived, and the sample is not truncated.** Its RSS was read before each
prototype run: **523 968 → 438 096 → 522 156 kB** — oscillating around 0,5 GB, never climbing toward
the 4 GB that OOM-killed a server at 209 s in an earlier run. That is what `>/dev/null` buys: the
hydration flood has nowhere to accumulate. Total prototype page exposure was **six loads over
~2 min**, deliberately short, and `:3013` answered **200** after the last prototype run as well as
before the first. Every run below reports its full press→release window.

### Sample method — the measuring run's own script, unchanged

`scratchpad t30/drag4.py`, the same file the two earlier runs drove, invoked exactly as its docstring
says. **Real input**: `Input.dispatchMouseEvent` `mousePressed` on the rider's own grab circle, then
**251** `mouseMoved` along a triangle across 12 % → 88 % → 12 % of the plot, then `mouseReleased`. No
stepping function, no synthetic setter. Fresh page load + 3 s settle before **every** run.

- **realistic** — one `mouseMoved` per CDP round trip + 4 ms. Delivered **≈ 59 Hz**: all 251 moves
  arrived as **251 separate `pointermove`** inside the window, none coalesced, over a ~4,2 s window.
- **flood** — fire-and-forget + 2 ms (`--fast`). ≈ 460 Hz raw into a ~0,54 s window; the page saw
  72–151 `pointermove` with **all 251 accounted for by `getCoalescedEvents()`**.

Two quantities per run, and they are **different things** — the distinction the measuring run drew,
preserved here:

- **rAF cadence** — deltas of consecutive `requestAnimationFrame` timestamps. That is the acceptance
  item, and it is not what disagreed.
- **commit cadence** — a `MutationObserver` on the rider glyph's `cx` attribute: deltas between
  consecutive *committed* mutations. This is the quantity the prototype's own `useFrameMeter`
  reports, and the one that disagreed between runs.

**Redraw ratio** = frames whose sampled `cx` changed ÷ rAF deltas inside the window.

### Realistic input — the figure this run exists to take

**Prototype, `:3013`, `/prototype/profile-view?variant=D&scenario=z3`, viewport 1440×900, its own
chart svg 1152 × 591:**

| Run | Frames | Redrew rider | **Redraw ratio** | rAF p50 | rAF p95 | rAF max | >20 ms | **commit p50** | commit p95 | commit max | `pointermove` | commits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proto realistic 1 | 251 | 217 / 250 | **86,8 %** | **16,7** | 16,7 | 16,8 | **0** | **16,9** | 32,9 | 34,9 | 251 | 218 |
| proto realistic 2 | 251 | 217 / 250 | **86,8 %** | **16,7** | 16,7 | 16,8 | **0** | **16,9** | 33,1 | 36,7 | 251 | 218 |
| proto realistic 3 | 252 | 217 / 251 | **86,5 %** | **16,7** | 16,7 | 16,8 | **0** | **16,9** | 33,1 | 36,5 | 251 | 218 |

**Production, `:3000`, `/`, first-run screen (`localStorage.clear()` then reload), viewport 1440×900,
plot inner **1104 × 463,68**, badge « Éch. verticale ×1,9 » — the same box the three earlier runs
measured:**

| Run | Frames | Redrew rider | **Redraw ratio** | rAF p50 | rAF p95 | rAF max | >20 ms | **commit p50** | commit p95 | commit max | `pointermove` | commits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| prod realistic 1 | 257 | 227 / 256 | **88,7 %** | **16,7** | 16,8 | 16,8 | **0** | **17,0** | 32,5 | 42,5 | 251 | 229 |
| prod realistic 2 | 254 | 227 / 253 | **89,7 %** | **16,7** | 16,8 | 16,8 | **0** | **16,9** | 32,2 | 35,2 | 251 | 229 |
| prod realistic 3 | 255 | 227 / 254 | **89,4 %** | **16,7** | 16,8 | 16,8 | **0** | **16,8** | 32,2 | 36,0 | 251 | 229 |
| **idle baseline, no input at all** | 78 | 0 / 77 | — | **16,7** | 16,7 | 16,8 | **0** | — | — | — | 0 | 0 |

**At realistic input the two sides are indistinguishable.** Commit p50 **16,9 ms** in the prototype
against **16,8–17,0 ms** in production — both **one commit per vsync frame** — both with p95 at the
one-skipped-frame value (32,2–33,1 ms), and **zero** rAF intervals above 20 ms across **1 514** frame
deltas. Redraw ratio is **86,5–86,8 %** in the prototype against **88,7–89,7 %** in production:
production redraws *marginally more* frames than the prototype, which is the **opposite direction** to
the contaminated table's story. The idle control reads the same **16,7 / 16,8** with no pointer input
at all, so dragging the rider still costs nothing above vsync.

### Flood input, measured in the same sitting, so the withdrawn table can be adjudicated

| Run | Frames | Redrew rider | **Redraw ratio** | rAF p50 | rAF p95 | rAF max | >20 ms | **commit p50** | commit p95 | commit max | `pointermove` · coalesced | commits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proto flood 1 | 32 | 31 / 31 | **100 %** | **16,7** | 16,8 | 16,8 | **0** | **3,8** | 5,7 | 6,5 | 147 · 251 | 141 |
| proto flood 2 | 32 | 31 / 31 | **100 %** | **16,7** | 16,8 | 16,8 | **0** | **3,7** | 5,7 | 6,5 | 151 · 251 | 141 |
| proto flood 3 | 32 | 31 / 31 | **100 %** | **16,7** | 16,7 | 16,7 | **0** | **4,0** | 5,2 | 6,4 | 137 · 251 | 135 |
| prod flood 1 | 32 | 28 / 31 | **90,3 %** | **16,7** | 16,7 | 16,8 | **0** | **7,5** | 11,0 | 32,3 | 72 · 251 | 65 |
| prod flood 2 | 33 | 29 / 32 | **90,6 %** | **16,7** | 16,7 | 16,8 | **0** | **7,4** | 12,2 | 32,1 | 75 · 251 | 67 |
| prod flood 3 | 33 | 29 / 32 | **90,6 %** | **16,7** | 16,7 | 16,8 | **0** | **7,1** | 11,5 | 33,2 | 76 · 251 | 70 |

### Adjudication of the earlier figures, stated explicitly

| Earlier figure | Where | Verdict here |
| --- | --- | --- |
| production flood commit p50 **30,0–31,7 ms**, p95 54–56 ms | measuring run, contaminated | **WITHDRAWN.** Quiet machine: **7,1–7,5 ms** p50, **11,0–12,2 ms** p95 — 4,2× faster. Host artefact |
| production flood redraw **≈ 49 %** (16–17 of 33–34) and **2 dropped frames per 33** | measuring run, contaminated | **WITHDRAWN.** Quiet machine: **90,3–90,6 %** redraw and **zero** intervals over 20 ms in three runs |
| prototype flood commit p50 **22,9–24,0 ms**, p95 28–30 ms | measuring run, contaminated | **WITHDRAWN.** Quiet machine: **3,7–4,0 ms** p50, **5,2–5,7 ms** p95 — 6× faster. Host artefact |
| prototype flood redraw **≈ 64 %** (22–23 of 35) | measuring run, contaminated | **WITHDRAWN.** Quiet machine: **100 %** (31 / 31), three runs |
| « production commits at ≈ 32 Hz where the prototype manages ≈ 42 Hz » | measuring run, contaminated | **WITHDRAWN as stated.** The real rates are ≈ **133 Hz** and ≈ **265 Hz**. The *ordering* — prototype faster under a flood — is **confirmed** |
| prototype flood commit p50 **4,0 / 4,2 ms**, redraw **97–100 %** on `:3011` | re-verification run, quiet | **CONFIRMED.** Independently reproduced on `:3013`: **3,7–4,0 ms**, **100 %** |
| production flood commit p50 **7,4–8,0 ms**, redraw **85–91 %** | re-verification run, quiet | **CONFIRMED.** Reproduced: **7,1–7,5 ms**, **90,3–90,6 %** |
| production **realistic** commit p50 **16,7 / 16,6 ms**, redraw **96,5 %** | re-verification run, quiet | **CONFIRMED on the cadence** (16,8–17,0 ms here). The redraw ratio reads **88,7–89,7 %** rather than 96,5 % — both are « nearly every frame », and the residue is `snapToStep`, below |
| **prototype realistic commit cadence** | **never measured by any earlier run** | **NEW: p50 16,9 ms · p95 32,9–33,1 ms · redraw 86,5–86,8 %**, three runs. This is the hole this run existed to fill |
| rAF p50 **16,7 ms** against the 16,7 ms vsync interval, both sides, with an idle control | all runs | **CONFIRMED a fourth time**: 1 514 realistic deltas + 189 flood deltas, **zero** above 20 ms |

### What the corrected numbers mean, and what they do not change

**The prototype-vs-production gap is flood-only, and it is `snapToStep` working as specified.** Under
a flood the prototype commits every frame (100 %) at 3,7–4,0 ms while production commits 90,3–90,6 %
at 7,1–7,5 ms — the same reading the re-verification run gave, and the same cause:
`snapToStep(scene.traverse, clampToSpan(metres, scene.L))` at
`src/components/chart/chart-block.tsx`:222 quantises the pointer onto one of the sweep's 260 steps, so
a coalesced move landing back on the same step **correctly commits nothing**. The prototype does not
snap. At realistic input — the density a real pointer and a real screen actually produce — the gap
**vanishes**: 16,9 ms against 16,8–17,0 ms, with production redrawing *more* frames than the
prototype, not fewer. **No code change is warranted and none was made**; `src/**` is byte-identical to
how this run found it.

**The no-Web-Worker decision is unaffected, and now rests on a cleaner sample.** All three of its
reasons hold on a machine whose 1-min load never exceeded **1,11**: p50 sits on vsync, zero intervals
above 20 ms, and the idle page measures the same. The one number the measuring run said it « would not
defend on a loaded machine » — the two dropped flood frames — is **withdrawn**, and with it the last
figure in this ticket that depended on the contaminated state. **Nothing was added to CI**: no timing
assertion, no new file, no change to any test.

**Gates, run here rather than taken on trust.** `bun run typecheck` → **exit 0**, output `$ tsc
--noEmit` and nothing else. `bun run lint-type-aware` → **exit 0**, output `$ oxlint --type-aware
--type-check` and nothing else. `bun run test` → **exit 0**, vitest **4.1.10**, **40 files / 1322
tests passed**, 1,19 s. (Earlier runs reported 39/1268, 39/1270 and 39/1288; the growth is other
tickets' agents landing cases in the same working tree, none of it this run's — this run wrote one
markdown file and no code.) No `oxfmt` invocation: markdown is in `.oxfmtrc.json`'s `ignorePatterns`
and no other path was touched.

### Does this close ticket 36's deletion gate?

**Yes for the measurement half, which is the half this ticket owns.** Ticket 36's first acceptance line
is « responsive dimensions, first-run VE, and drag-frame measurements are recorded before prototype
removal », and all three are now recorded on uncontaminated evidence:

- **responsive dimensions** — ticket 29, `Status: done`.
- **first-run VE** — ×1,86290 at aspect 0,42000, reproduced digit-for-digit by **three** independent
  runs and locked by a `node` case in `src/lib/layout/contract.test.ts`.
- **drag-frame measurements** — rAF cadence **16,7 ms** p50 on both sides with an idle control, and
  now the **commit** cadence for **both** sides at **both** input densities from **one quiet machine
  state**. The soft spot the contaminated table left is gone: every figure in it is either confirmed
  or explicitly withdrawn above.

**So nothing in ticket 36's gate is still waiting for the prototype to be standing.** Its five
remaining acceptance items are deletion mechanics (route removal, route-tree regeneration, no
prototype chunk in the build, fixtures and bench independent, gates green after deletion) and none of
them needs a measurement.

**Ticket 30's own `Status` stays `claimed`, deliberately.** Acceptance **item 1** is still open and
this run does not touch it: the first-run VE reads **×1,86**, while `spec.md` **2555 / 4987–4988 /
5487** and `docs/conventions/testing.md` **148** still publish « ≈ ×1,5 on a 1080×420 plot » —
re-checked in the working tree during this run, **still unamended**. That is a documentation decision
the user has not taken, the three costed options above are still the whole of it, and a build ticket
may not take it. **Every other acceptance item on this ticket now holds on measured, uncontaminated
evidence.** No `Status:` line was modified by this run — not on this ticket, not on any other.

---

## Independent verification — finding 1 (the peek latch) and finding 3 (amendment F's restated claim) — 2026-08-15, session `closeverify`

**Role: verifier, read-only on `src/**` throughout.** Nothing under `src/` was written;
`src/routes/-prototype-07/**` and `src/routes/prototype.profile-view.tsx` were not touched; ticket 36
is out of scope; no `Status:` line moved; no commit. I did not write either fix.

**Environment.** `HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
(KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36`, `devicePixelRatio 1`, `agent-browser
0.34.0`, session **`closeverify`**, the **shared dev server reused and left running** —
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → **200** before and after. Every
viewport was set with `agent-browser set viewport` and then **read back from
`innerWidth`/`innerHeight`** before any number was recorded. This host reports **`maxTouchPoints` 0**
and **`(pointer: coarse)` false**, so the coarse-pointer arm stays **named, not measured** here, as it
already is everywhere else in this record.

### Finding 1 — the latch ends. Five trips at 2560 × 1440 on `?L=200&h=-40&za=12&zb=12&fl=6`

| # | geste | après le geste | dans la bande « off » | de retour |
| --- | --- | --- | --- | --- |
| 1 | `focus` + `Space`, puis `set viewport 2000 1440` → `2560 × 1440` | « Éch. verticale ×0,7 — sous la vraie échelle · câble entier », `aria-pressed="true"` | contrôle **désactivé**, `aria-pressed="false"`, « Éch. verticale ×1 — vraie échelle » | **« Éch. verticale ×1 — vraie échelle · câble hors cadre », `aria-pressed="false"`, `activeElement` `BODY`** — **aucun ré-armement** |
| 2 | `Space` / `Space` sur place | « ×0,7 … câble entier », `aria-pressed="true"` | — | 2ᵉ `Space` : « ×1 — vraie échelle · câble hors cadre », `aria-pressed="false"` — la bascule § 5 est intacte |
| 3 | `mouse down` / `mouse up` sur le contrôle (pointeur fin) | maintenu « ×0,7 … câble entier », `aria-pressed="true"` | — | relâché « ×1 — vraie échelle · câble hors cadre », `aria-pressed="false"` — la tenue § 5 est intacte |
| 4 | `Space`, puis `#rail-L` = `0`, puis `#rail-L` = `200` | « ×0,7 … câble entier », `aria-pressed="true"` | `#profil` lit « Portée invalide — aucun tracé possible » — **ni badge ni contrôle dans le DOM** | « ×1 — vraie échelle · câble hors cadre », `aria-pressed="false"` — la deuxième porte est fermée |
| 5 | `Space`, puis `#rail-D_target` 6 → 60 → **80** → 60 → 6 (la coupe passe à `data`, **sans** redimensionnement) | « ×0,5 … câble entier » à D 60, `aria-pressed="true"` | à D 80 la coupe devient **`data`** : contrôle **désactivé**, `aria-pressed="false"`, « ×1 — vraie échelle · câble hors cadre » | retour à D 60 : « ×1 — vraie échelle · câble hors cadre », `aria-pressed="false"` ; à D 6 : « Éch. verticale ×1,2 » — **aucun ré-armement par le scénario non plus** |

Trip 5 is **new coverage**: the existing record drives the `"off"` band with a *resize* and with the
empty band. Driving it with a **scenario** — the sag deepened until `ClipCause` flips `"box"` →
`"data"` — exercises the same mode-keyed reset through a third kind of input, and lands released too.

**Reload.** With the peek latched by `Space` at 2560 × 1440 (« ×0,7 … câble entier »,
`aria-pressed="true"`), `location.reload()` comes back at **« Éch. verticale ×1 — vraie échelle ·
câble hors cadre », `aria-pressed="false"`**. `localStorage` holds `scoutech:session:v1` and the
router's own devtools key and **no peek key**; the persisted Session JSON carries `scenario` /
`rider` and nothing about the peek. « Never persisted » is unconditional, as claimed.

### Finding 3 — amendment F's restated claim, checked clause by clause

The claim now reads « **held** on a fine pointer, **latched until the next press** from the keyboard
and under `(pointer: coarse)`, **never persisted** across a reload, **badge-disclosed** in every
case », plus « the latch is released when the mode leaves `"fit"` ». Against what was measured above:

| clause | verdict |
| --- | --- |
| held on a fine pointer | **holds** — trip 3 |
| latched until the next press, from the keyboard | **holds** — trips 1, 2 |
| under `(pointer: coarse)` | **named, not measured** — `maxTouchPoints 0`, `(pointer: coarse)` false on this host, and the amendment says exactly that |
| never persisted across a reload | **holds** — the reload row, and no peek key in `localStorage` |
| badge-disclosed in every case | **holds** — every peeked frame printed the factor **and** « sous la vraie échelle » |
| released when the mode leaves `"fit"` | **holds on all three doors** — resize (trip 1), empty band (trip 4), scenario (trip 5) |

**The amendment no longer claims more than the code delivers.** The two docstrings that carried the
old wording now match it as well: `contract.ts`'s `exaggeration` (« It is *held* on a fine pointer and
**latched until the next press** … released the moment the mode leaves `"fit"` ») and
`peekBadgeLabel` (« **held** on a fine pointer, **latched until the next press** from the keyboard and
on a coarse pointer »).

**No banner occupant was created for the box clip** — tickets 26 and 27's four ranks and single
occupant are untouched, and nothing here asked for one. **The published first-run VE figure was not
moved**: item 1 above is still open, « ≈ ×1,5 » still stands in `spec.md` and `testing.md`, and this
leg neither takes that decision nor edits those lines.

### Gates, real output

```
$ bun run typecheck            # tsc --noEmit
$ tsc --noEmit
exit=0                         (no other output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
$ oxlint --type-aware --type-check
exit=0                         (no other output)

$ bun run test                 # vitest run
 RUN  v4.1.10 /home/bastien/lab/perso/scoutech
 Test Files  40 passed (40)
      Tests  1331 passed (1331)
   Duration  1.18s
```

No `oxfmt`: this leg wrote no source file, and Markdown is in `.oxfmtrc.json`'s `ignorePatterns`.
