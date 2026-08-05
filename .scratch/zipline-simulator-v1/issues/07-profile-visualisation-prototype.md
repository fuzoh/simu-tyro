# Profile visualisation prototype

Type: prototype
Status: open
Blocked by: — (02, 03 resolved)
Map: [Zip-line simulator v1](../map.md)

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
