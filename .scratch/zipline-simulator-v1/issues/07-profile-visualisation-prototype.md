# Profile visualisation prototype

Type: prototype
Status: resolved
Blocked by: — (02, 03 resolved)
Map: [Zip-line simulator v1](../map.md)
Prototype: `src/routes/prototype.profile-view.tsx` + `src/routes/-prototype-07/` (throwaway;
variants A/B/C/D at `/prototype/profile-view?variant=D&scenario=fail`)
Screenshots: [prototypes/07-profile-view/](../prototypes/07-profile-view/)

## Question

What does the profile view actually look like, and how does the rider slider feel?

This is the half of the app the user looks at, and it cannot be settled in prose. Build a
throwaway prototype with fabricated data — the §15 fixtures give real numbers to draw
(Z1: 100 m span, 4.4 m sag; Z3: 120 m inclined span, B 15 m lower, 7.08 m sag; Z4 with a
1177 N rider at mid-span) — and react to it.

Settle by making it:

1. **Layer composition.** Terrain fill, unloaded cable, loaded cable, rider marker and its
   lanyard drop, both anchors, the minimum-clearance callout. Which are always on, which
   are toggles, and how they layer so nothing important hides behind anything else. Does
   showing the unloaded line alongside the loaded one help or just add noise?
2. **Vertical exaggeration in practice.** [Profile chart rendering](./02-profile-chart-rendering-approach.md)
   picks the policy; this ticket proves it works at both ends of the range — a 50 m span
   and a 1500 m span in the same component, without the user re-learning the chart.
   Whatever tells the user the view is distorted must be legible, not a footnote.
3. **The slider.** Where it lives — under the chart, in the parameter panel, or dragging
   the rider marker directly on the chart? Try dragging the marker; it is the obvious
   affordance and may be the wrong one for touch or for precise positioning. Decide whether
   both exist. Decide what the slider's units read as: material coordinate `s_D` is the
   engine's sweep variable (§6.2) but means nothing to a user — horizontal distance `x_D`
   or a percentage does.
4. **Live read-out.** What follows the rider as it moves — clearance under the rider,
   current tension, slope? On the chart or in a fixed panel? Moving numbers next to a
   moving marker are hard to read.
5. **Clearance failure.** How the chart shows the cable dipping into the terrain. This is
   the single most important thing the tool exists to reveal, so it should be impossible to
   miss.
6. **Feel.** Does dragging the slider stay smooth? This is where the map's fog about the
   Web Worker gets resolved — measure, don't guess. Report the frame cost with a
   representative sweep behind it.

## Context

Read `docs/simulation-theory.md` §15 for numbers worth drawing, §11 for what clearance
means, §6.2 for the sweep and §6.3 for the rider's lanyard drop.

Depends on [Profile chart rendering](./02-profile-chart-rendering-approach.md) for the tool
and the exaggeration policy — **resolved**: hand-rolled SVG plus `d3-shape`, auto-fitting
vertical scale with a disclosed "Éch. verticale ×N" label. That ticket hands two open
questions down to this one: no frame-time benchmark exists for this chart's shape, so
measure it here; and whether a user-facing VE slider is warranted in v1 is a product
decision to make against the prototype. Also depends on
[Engine API, execution model and module layout](./03-engine-api-execution-model-and-module-layout.md)
for the shape of the data being drawn — a `SweepStep` array, or whatever that ticket named
it.

Prototype code is throwaway: it goes on a scratch branch or under a clearly-marked scratch
path, is linked from this ticket, and is **not** the v1 implementation. Per the map, this
effort produces a spec, not the app.

## Answer

Settled by building it, not by prose: four variants on a throwaway route, three structurally
opposed (A chart-plein-cadre with a HUD, B tableau-de-bord, C profil + courbe de garde), and
**D the composite the grill converged on**, built afterwards so the winning design was seen
rather than imagined. Behind all four is a real solver — §4.1/§4.2/§5/§6.1/§6.2/§11
implemented and checked against **every §15 fixture (F1, Z1–Z5) to ≤ 4×10⁻⁶ relative**
(`bun src/routes/-prototype-07/check.ts`) — so every number on screen is the physics, not a
sketch. Seven scenarios: Z1 100 m, Z3 120 m incliné, 50 m court, 1500 m long, 1000 m quasi
tendu, 1000 m très mou, and a 200 m case fabricated to fail *marginally* (h_min −1,49 m over
15 % of the traverse), which is what makes "the line fails" and "the rider is in the failing
zone" separable states.

### 1. Spine — C's two-chart layout carrying B's fixed read-out strip

Left parameter rail · verdict banner · profile chart (3 parts) · clearance-vs-position strip
(1 part) · five-cell read-out row.

The deciding argument is **question 5, not aesthetics**: the clearance curve crossing zero is
the only presentation where the violation is impossible to miss, because a zero crossing is a
categorical event while a tinted band on a vertically-distorted profile is a judgement call.
A and B both reduce the most important fact the tool produces to a shading.

Two occlusion findings killed the alternatives' read-out placements. A's HUD sits over anchor B
(`a-z1.png`) — a corner overlay on a full-bleed chart will always cover part of the span, and
the span is the subject. C's follow-the-rider tooltip covers the cable it describes
(`c-fail2.png`), which is exactly the "moving numbers next to a moving marker" failure the
ticket warned about. **Read-outs therefore live in fixed cells, outside the plot area.**

### 2. The rider moves three ways, and there is no range input anywhere

- **Scrub on the clearance strip.** Its x axis *is* rider position, which makes it a
  dimensionally honest scrub track — the one thing a slider in the rail can never be, since
  that maps to nothing spatially. This replaces the dedicated `<input type=range>`.
- **Drag the marker on the profile.** The obvious affordance, and it does feel right; kept
  because it is where the eye already is.
- **Numeric `x` field in the rail.** For precision, which neither pointer path can offer.

### 3. Position reads as `x_D` in metres, with `%` as a quiet secondary

Metres from A is the only unit that matches the chart's x axis, ticket 06's GPX stations, and
how a line is actually paced out; the percentage rides along in smaller type because "748 m" is
hard to place at a glance on a 1500 m span. **`s_D` never appears in the UI** — it stays
ticket 03's engine coordinate. B's prototyped triple read-out
(`x = 99,7 m · 50 % · s_D = 101,5 m`) read as noise, and `s_D` drifts from `x_D` by ~0,5–2 %
(fixture Z5: 60,15 vs 59,96), so exposing it only invites "why are these different?".

### 4. Typed positions get an exact solve; pointer input snaps

A typed `x` runs §6.1 case 2 — outer bisection on `s_P` (monotone in `x`), inner 2×2 Newton — so
the field reads back exactly what was typed and the drawn cable is the true state there.
Measured cost: **~40 µs** (≈20 bisection steps × ~2 µs warm-started). Drag and scrub keep
snapping to precomputed sweep steps, because 1 px ≈ 1,2 m at 1500 m — pointer input has no
precision to preserve.

Two rejections worth carrying into the spec:

- **Snapping the typed value and rewriting the field** (99,7 → 101,2) breaks the map's "never
  discard user input silently" rule for the sake of one code path.
- **Densifying the grid until snapping is invisible** buys the same thing at a much worse price:
  sub-metre steps at 1500 m is ~3000 steps, pushing the sweep past 6 ms and the clearance pass
  past 20 ms — it would force the very Web Worker §10 rules out.

### 5. Layers — a fixed always-on set plus exactly two toggles

Always on: terrain, loaded cable, both anchors, rider + its 2,1 m envelope, the clearance
dimension, the VE badge, and the danger bands *whenever a violation exists* (they self-hide, so
they are never chrome). Toggles: **« ligne à vide » (default off)** and **« corde A–B »
(default on)**.

The unloaded line earns a toggle rather than permanence because the prototype made its
usefulness visibly scenario-dependent: on Z1 it shows what the rider does to the line, while at
1500 m it is indistinguishable from the loaded curve (1177 N against H ≈ 31 kN). Off by
default, because the loaded case is the one the verdict judges.

### 6. Vertical exaggeration — auto-fit, plus a hold-to-peek `×1`

Auto-fit produced **×1,2 … ×4,7** across the whole 50 m–1500 m range and stayed legible in every
scenario, so ticket 02's policy needs no amendment. **The user-facing VE selector question is
answered NO**, on evidence rather than taste: forcing ×20 at 1500 m throws the cable out of the
top of the frame and collapses the terrain into a triangle (`b-long-ve20.png`). A manual
selector is a loaded gun pointed at the chart's legibility.

What replaces it is a **« ×1 vraie échelle » button, held down to peek** at the undistorted
picture — a second disclosure channel beside the badge, answering "what is the distortion
hiding?" in one gesture, and incapable of producing an unreadable chart because ×1 fits by
construction.

*Derived here, not grilled — flag at ticket 10:* at 1500 m the 2,1 m rider envelope is ~5 px
tall. The envelope stays **metric** (never drawn at a minimum pixel size), because a non-metric
glyph would misrepresent the one measurement the tool exists to produce; legibility is carried
by the printed strip number, per ticket 02's "printed read-out anywhere a number must be
trusted".

**Amended by [ticket 15](./15-responsive-and-narrow-screen-layout.md) §5, §7.** The **« ×1 vraie
échelle » button moves into the View Strip** (see §9's amendment — it moves there together with
the numeric `x` field) **and gains a pointer-dependent interaction**: a *toggle* under
`@media (pointer: coarse)`, hold-to-peek on fine pointers, and **disabled** whenever the ×1
clamp is already in force. Press-and-hold on touch collides with text selection, the context
menu and scroll initiation; this section's original gesture had no touch story.

**Also superseded: the auto-fit range above.** « ×1,2…×4,7 » was measured against one box shape
and is ~10 % low against ticket 06 §6's x domain (ticket 15 §1). The measured figure at the
prototype's own aspect is **×1,57…×4,70**.

### 7. Clearance failure — four coordinated signals, two of them positional

1. A worded verdict naming `h_min` and its `x`, visible whenever the line fails **anywhere**.
2. Red fill below zero on the clearance curve.
3. The violating x-band tinted on the profile — **over rider positions that violate**, not over
   the x of the worst point. (The prototype had this backwards at first: the band answers
   "where must the rider not go?", which is a different set of x values.)
4. Cable and rider turn red **only while the rider is inside that band**.

Redundant deliberately — this is the one thing that must not be missed — but each signal answers
a different question, and the last preserves the distinction between "this design fails" and
"you are standing in the failing zone right now".

Rejected: the heavy hatched full-height band first prototyped in B, which floods the chart and
destroys legibility exactly when legibility matters most. Danger marking is a tint plus an edge,
never a texture over the subject.

### 8. Two failure kinds, and the soft one carries its own provenance

`evaluateClearance` already distinguishes them and the UI must too, because they are not the
same class of claim:

- **« Câble au sol »** — the cable passes under the terrain. Bare geometry; states itself flatly.
- **« Enveloppe passager traversée »** — true only given `h_rider`, so this verdict **names the
  2,1 m value, carries its « non confirmé » chip, and stays editable.**

That is the map's binding provenance rule applied to a *verdict* rather than a coefficient — a
new place for it. §11 tags `h_rider = 2,1 m` `[CONVENTION]` with EN 15567's free-space numbers
`[PAYWALLED]`, so a red banner that hid its dependence would present a convention as a
measurement. Ticket 08 inherits this.

### 9. The strip: garde · T_A · T_B · pente locale · flèche

Five cells. **Both anchor tensions, not one `T max`** — on an inclined span the governing end is
not obvious, ticket 05 judges terminations against `T_A` and `T_B` separately, and watching them
swap as the rider crosses is genuinely informative. `H` stays out: identical at both ends and
engine plumbing. Position lives beside the numeric field in the rail, not in the strip.

**Amended by [ticket 15](./15-responsive-and-narrow-screen-layout.md) §5, §7.** This placement
of the numeric `x` field is superseded. « Position lives beside the numeric field in the rail »
does not survive ticket 15 §6: at 390 px the rail is not co-visible with the chart — the Chart
Block collapses precisely when the rail comes into view — so a rail-only `x` puts the app's only
precision input path out of sight of the thing it moves. The field and its position read-out
(`x` in metres, `%` secondary, `s_D` never) move into the **View Strip** inside the Chart Block,
unchanged in kind.

**The clearance cell reports the worst clearance anywhere on the line for the current rider
position** — §11's inner minimum over x — and the chart draws its dimension line wherever that
minimum actually sits. Under-the-rider-only was rejected because it can read positive while that
same rider position is in violation a few metres away, which the aggregate `h_min` then
contradicts.

The composite proves this pays for itself: with the rider at x = 123,4 m the governing point
stays back at x = 101 m on the terrain bump, the dimension line visibly steps sideways, and the
cell relabels itself « Garde min (à x 101 m) » (`d-fail2.png`). The label changes only when the
worst point is further than max(1 m, 1 % of span) from the rider, so the ordinary case reads
plainly.

### 10. Measured: the sweep stays on the main thread, with ~4× margin

Question 6, answered with numbers. In-browser (Chromium/V8, this machine), 40 runs per cell,
worst-conditioned 1000 m cases included. `p95` of `sweep()` + `evaluateClearance` together:

| `SWEEP_STEPS` | 1000 m quasi tendu | 1000 m très mou | 1500 m long |
| --- | --- | --- | --- |
| 100 | 1,20 ms | 1,30 ms | 0,80 ms |
| **240** | **1,10 ms** | **1,30 ms** | **1,30 ms** |
| 500 | 2,30 ms | 2,10 ms | 2,00 ms |

Against ticket 03's criterion (**> 8 ms ⇒ worker**) this is a clear **no worker**, and it holds
even at 500 steps — so ticket 03's 240 needs no revision: it costs the same as 100 within timer
resolution and buys resolution. `sweep()` alone is p95 ≤ 0,6 ms everywhere; the clearance
reducer is the larger half (p95 ≤ 1,7 ms), worth knowing because it scales with
`steps × samplesPerStep`, not with the solver.

**Dragging is vsync-bound, not compute-bound.** Driving the rider one index per animation frame
for 120 frames at 1500 m: **frame p50 16,70 ms / p95 18,40 ms** against a 16,7 ms vsync
interval. The budget goes on waiting for the display, exactly as ticket 03 predicted — the
slider is an index lookup plus one `sampleCable(200)` and a path string, never a solve.

### 11. What other tickets inherit

| Ticket | Inherits |
| --- | --- |
| [08 Results panel](./08-results-panel-and-provenance-warnings.md) | The two-kind verdict wording, and that the envelope verdict must carry `h_rider`'s provenance chip. The strip owns *position-dependent* numbers, so the panel owns the aggregates (`h_min` over the traverse, the `T` envelope, coverage). |
| [09 URL state](./09-url-state-schema-and-persistence.md) | Rider position round-trips as `x_D` in metres — not an index, not `s_D` — since the grid is derived from `(L₀, n)`. The two layer toggles are persistable state; the `×1` peek is a held gesture and must not be persisted. |
| [11 Validation UX](./11-validation-and-error-state-ux.md) | The verdict banner is where clearance failure speaks; a failed *solve* is a different state and must not reuse it. `coverage < 100 %` has to reach that same banner area. |
| [12 Worker decision](./12-sweep-performance-and-worker-decision.md) | §10's table — that ticket is now arithmetic plus recording the coarse-live/fine-on-release warning. |
| [14 First-run scenario](./14-first-run-scenario-and-defaults.md) | The seven prototype scenarios are illustrative, never defaults. But the fabricated failing case shows a first-run scenario must not be one where `h_min < 0`, and ×1,2…×4,7 is the auto-fit visual budget any default should land inside. |
| [06 CSV terrain](./06-csv-profile-import-and-anchor-placement.md) | Terrain is consumed as `{ xs, zs }`, sampled 60× per sweep step through `zGroundAt`'s binary search — so even a 3000-point profile is not a performance problem. *Resolved: the real export is 200 points, an order of magnitude inside that budget — and ticket 06 inherited this chart's snap-on-drag / exact-on-type rule for anchor stations, plus its scrub-track alignment as a hard constraint on the shared x domain.* |

### 12. The prototype itself

Throwaway, in the repo and clearly marked: route `src/routes/prototype.profile-view.tsx`, the
rest under `src/routes/-prototype-07/` (the `-` prefix keeps the router generator out of it).
`bun run dev`, then `/prototype/profile-view?variant=D&scenario=fail`; `←`/`→` cycle variants,
the dropdown picks the scenario, and the perf chip bottom-left carries `bench ×40` and
`auto-drag`. `bun src/routes/-prototype-07/check.ts` re-verifies the §15 fixtures. Gates clean
on `bun run typecheck` and `bun run lint-type-aware`.

**Delete it once ticket 10 has absorbed this answer.** It is a primary source for the decisions
above, not a head start on the implementation — and its solver is deliberately *not* laid out as
ticket 03 specified `src/lib/sim/`, so it cannot be mistaken for one.
