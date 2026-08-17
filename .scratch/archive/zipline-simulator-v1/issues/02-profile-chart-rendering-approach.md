# Profile chart rendering — surveying the options for an extreme aspect ratio

Type: research
Status: resolved
Blocked by: —
Findings: [research/02-chart-rendering.md](../research/02-chart-rendering.md)
Map: [Zip-line simulator v1](../map.md)

## Question

What should draw the zip-line profile view, and how does it cope with the aspect ratio
this domain produces?

The shape of the data is unusual and is the crux of the question: spans run 50 m to
~2000 m horizontally while sag is metres — fixture Z1 in `docs/simulation-theory.md` §15
is a 100 m span with 4.4 m of sag, and a 1000 m span might sag 30 m. Drawn to true scale
the cable is a flat line and the simulation is illegible; drawn with vertical exaggeration
the curve reads well but slopes and clearances lie to the eye. Every candidate must be
judged against that tension.

Settle:

1. **Candidates.** Hand-rolled SVG with React, `visx`, `uPlot`, `Recharts`, `Observable
   Plot`, or D3 driving SVG directly. For each: bundle size, whether it renders under SSR
   without a `window`, TypeScript quality, how much control it gives over independent x/y
   scales, and whether it can draw a filled terrain polygon plus several overlaid
   polylines plus a draggable marker without fighting the library.
2. **Layer inventory.** Confirm what has to be drawn, so the survey judges against real
   requirements: terrain profile as a filled area, the unloaded cable curve, the loaded
   cable curve, the rider marker with its lanyard drop `h_rider`, both anchors, the
   minimum-clearance callout, and a clearance band or shading. Note anything the
   references imply that this list misses.
3. **Vertical exaggeration.** How do adjacent domains handle it — topographic profiles,
   overhead-line stringing charts, ski-run profiles, cross-section tools? Report the
   conventions: fixed ratio, auto-fit to data, user-controlled slider, or a printed "V.E.
   ×5" annotation. Recommend one, and say how the app tells the user it is looking at a
   distorted picture.
4. **Interaction cost.** The rider slider re-solves and redraws continuously while
   dragging. Which candidates re-render cheaply enough for that, and which force a full
   virtual-DOM diff of hundreds of points per frame? Report measured or documented
   figures, not vibes.
5. **Accessibility and export.** Can the chosen approach produce something printable or
   exportable (PNG/SVG) later without a rewrite? Note it; do not design it.

Deliver a recommendation, the runner-up and why it lost, and a sketch of the scale/
projection module the app will need (domain metres → screen pixels, with independent
axes).

## Context

Feeds [Profile visualisation prototype](./07-profile-visualisation-prototype.md), which
builds the thing. This ticket picks the tool and the exaggeration policy; the prototype
decides what it actually looks like.

Constraints: React 19, Tailwind v4, TanStack Start SSR, no backend. Prefer few dependencies
— hand-rolled SVG is a legitimate answer if the survey supports it.

## Answer

Full detail with inline source citations in
[research/02-chart-rendering.md](../research/02-chart-rendering.md) (562 lines).

**Renderer: hand-rolled SVG in React**, with `d3-shape` (~5.7 KB gzip, no DOM coupling)
for line and area path generation and a hand-written affine scale function per axis.
Skip `d3-scale` — the only transform needed is linear metres→pixels, and it costs 16 KB
gzip with no bundled types.

Three reasons it wins:

- **SSR is free.** It is just JSX. Every packaged alternative has a documented SSR
  wrinkle: Recharts' SSR story is unresolved and explicitly broken under streaming SSR
  (its own discussion #6390); Observable Plot needs an explicit JSDOM `document` wired in;
  uPlot's canvas model has no SSR path at all. `docs/conventions/routing.md` puts us on
  TanStack Start with SSR, so this is load-bearing.
- **Weight.** ~6 KB against 127–147 KB for Plot or Recharts.
- **It matches the actual problem.** Independent, deliberately mismatched x and y scales
  are the whole point of this ticket. Two plain affine functions express that directly;
  a Cartesian-chart abstraction has to be fought into it.

**Runner-up: visx low-level primitives** (`@visx/shape`, `@visx/group`, `@visx/drag`) —
SSR-safe, natively typed, React 19 compatible. Lost narrowly on dependency parsimony,
since nothing it offers here is more than `d3-shape` plus JSX. Recorded as the documented
fallback if hand-rolled path and area logic gets unwieldy once GPX terrain and the
clearance band are both on screen.

**Vertical-exaggeration policy: auto-fit per render, always disclosed.** A fixed ratio
cannot serve both a 100 m span sagging 4.4 m (fixture Z1) and a 2000 m span. So the
vertical scale auto-fits, and three things make the distortion impossible to miss:

1. A live-recomputed **"Éch. verticale ×N"** label, recalculated on every render.
2. Printed numeric read-outs — clearance, slope, sag — anywhere a number has to be
   trusted rather than eyeballed.
3. The label is chart furniture, not a footnote.

Evidence: cartographic convention is to always disclose vertical exaggeration; GPS tools
such as Strava auto-fit silently *without* disclosing it, which is precisely the failure
mode this policy exists to avoid.

The findings file also carries the scale/projection module sketch (domain metres → screen
pixels, independent axes), the layer inventory, and notes on SVG accessibility via
`<title>` and export via `XMLSerializer`.

**Open questions carried forward** (recorded, not guessed):

- No measured frame-time benchmark exists anywhere for this chart's actual shape — a few
  hundred points, one filled polygon, a few polylines, one dragged marker. **Must be
  measured against [Profile visualisation prototype](./07-profile-visualisation-prototype.md)**,
  which is where the map's Web-Worker fog resolves too.
- PLS-CADD's profile-view scale convention could not be confirmed; two of its technote
  PDFs were unreadable even via `pdftotext`.
- Whether Strava-class tools ever print a numeric VE value: not found.
- No ropeway or ski-lift specific profile convention found at all.
- Whether a user-facing VE slider is warranted in v1 is left as a product decision for
  the prototype ticket.
