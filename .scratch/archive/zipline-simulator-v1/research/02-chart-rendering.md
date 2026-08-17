# 02 — Profile chart rendering approach

Research for [issues/02-profile-chart-rendering-approach.md](../issues/02-profile-chart-rendering-approach.md).
Feeds [07-profile-visualisation-prototype.md](../issues/07-profile-visualisation-prototype.md).

Method: primary sources only — official docs, source repos, bundlephobia's own size API,
the npm registry, MDN, react.dev, d3js.org. Where a claim could not be pinned to a primary
source it is marked **not found** rather than filled from a blog.

---

## 1. Candidates

Constraints repeated from the ticket/map: React 19, TanStack Start SSR (file-based router,
`rsc: false` — [docs/conventions/routing.md](../../../docs/conventions/routing.md)), bun,
Tailwind v4 + shadcn/ui on Base UI, few dependencies is a virtue, `bun run typecheck` +
`oxlint --type-aware` must stay clean. `package.json` currently ships **zero** charting or
D3 packages — every candidate below is a net-new dependency.

Bundle sizes are bundlephobia's own measurement API (`https://bundlephobia.com/api/size?package=<name>`),
queried directly, gzip figures quoted:

| Package | gzip (own+deps) | Deps pulled in |
| --- | --- | --- |
| `recharts` | **147.5 KB** | `@reduxjs/toolkit`, `immer`, `react-redux`, `reselect`, `d3-shape`, `d3-scale`, `d3-array`, `es-toolkit`, `victory-vendor`, `clsx` — 11 deps |
| `@observablehq/plot` | **127.9 KB** | full `d3` (d3-array, d3-axis, d3-brush, d3-color, d3-contour, d3-delaunay, d3-format, …) |
| `@visx/scale` | 17.5 KB | `d3-scale`, `d3-array`, `d3-time`, `d3-time-format`, `d3-format`, `d3-interpolate`, `d3-color` |
| `d3-scale` (standalone) | 16.0 KB | `d3-array`, `internmap`, `d3-interpolate`, `d3-format`, `d3-time`, `d3-time-format`, `d3-color` |
| `uplot` | **21.9 KB** | **0** deps |
| `@visx/shape` | 10.7 KB | `d3-shape`, `d3-path`, `@visx/group`, `classnames` |
| `d3-shape` (standalone) | 5.7 KB | `d3-path` |
| `d3-array` (standalone) | 5.9 KB | `internmap` |

Sources: bundlephobia API, queried 2026-08-05 (`https://bundlephobia.com/package/recharts`,
`/@observablehq/plot`, `/@visx/scale`, `/d3-scale`, `/uplot`, `/@visx/shape`, `/d3-shape`,
`/d3-array`).

The recharts figure is inflated by a full Redux store (`@reduxjs/toolkit` + `immer` +
`react-redux` + `reselect`) that recharts v3 now uses internally for cross-component state
— confirmed by the dependency list above, not an assumption.

### visx (low-level `@visx/*` packages, not the `XYChart` facade)

- **What it is**: `@visx/scale` is an explicit wrapper — "a wrapper around existing d3
  scaling originally defined in the d3-scale package" ([npm: @visx/scale](https://www.npmjs.com/package/@visx/scale)).
  `@visx/shape`, `@visx/group`, `@visx/curve` are thin React components around `d3-shape`
  path generators. Airbnb, source at `github.com/airbnb/visx`.
- **SSR**: the low-level primitives are pure functions (`d3-scale`) or plain SVG-emitting
  React components (`d3-shape`-backed) — nothing in them touches `window`/`document`.
  The composed **`XYChart` facade** does have a known SSR problem: its child components
  register themselves into a shared registry via `useEffect`, so on the server "the data
  registry … prevents XYChart from being server-side rendered"
  ([airbnb/visx#1478](https://github.com/airbnb/visx/issues/1478)). The team's own
  framing: "The visx team's understanding was that SSR should just work" for v1.0
  ([airbnb/visx#1](https://github.com/airbnb/visx/issues/1)) — i.e. SSR was a known open
  concern even for the maintainers, and it's the composed layer that broke it, not the
  primitives. `ParentSize`/`useParentSize` (responsive sizing) depends on `ResizeObserver`
  and is client-only by nature — give it explicit width/height for SSR instead.
- **TypeScript**: native. `@visx/scale`'s package.json declares `"types": "lib/index.d.ts"`
  (npm registry, checked directly) — hand-written types shipped, not DefinitelyTyped.
  `d3-scale` itself ships **no** `types`/`typings` field and has no `.d.ts` in its
  published tree (`unpkg.com/d3-scale@4.0.2/src/index.d.ts` → 404, checked directly) — it
  relies on the separate `@types/d3-scale` package.
- **React 19**: `@visx/shape` and `@visx/drag` peerDependencies are
  `"react": "^18.0.0 || ^19.0.0"` (npm registry) — officially compatible.
- **Layer fit**: exactly the primitives this UI needs — `@visx/shape`'s `AreaClosed` (filled
  terrain polygon), `LinePath` (cable curves), and plain `<circle>`/`<g>` for anchors/rider;
  `@visx/drag`'s `useDrag`/`Drag` for the rider marker. Independent x/y scales are the
  default — `scaleLinear` takes its own `domain`/`range` per axis, nothing couples them.

### uPlot

- **What it is**: canvas-based. GitHub README: "A small, fast chart for time series,
  lines, areas, ohlc & bars" ([leeoniya/uPlot](https://github.com/leeoniya/uPlot)).
  Zero runtime dependencies (bundlephobia dependency count: 0).
- **Bundle**: 21.9 KB gzip, own-only (0 deps) — smallest of the real charting libraries
  surveyed.
- **SSR**: canvas rendering needs a live `<canvas>` element and a 2D context; the README
  documents no server/JSDOM rendering path. Not found: any official statement of SSR
  support. Practical implication: it can only mount client-side (behind `useEffect` /
  `typeof window !== "undefined"`), which is a real cost in a TanStack Start SSR app
  even though the physics engine itself is client-only (per `map.md`'s open question).
- **TypeScript**: ships its own `dist/uPlot.d.ts` (`"typings"` field in package.json,
  npm registry, checked directly) — "the full API is further documented via comments in
  `/dist/uPlot.d.ts`" ([GitHub README](https://github.com/leeoniya/uPlot)).
- **Layer fit**: built for dense time-series line/area/OHLC/bar plots with one shared x
  axis and multiple y-scales — a materially different shape than "one filled polygon,
  several polylines, a draggable point, two fixed anchors." uPlot's own docs describe
  "pluggable path renderers" and a "hooks & plugins" system, but nothing purpose-built for
  a draggable marker with hit-testing — that would need hand-rolled canvas pointer math
  on top, and the accompanying React wrapper is unofficial/community, not part of the
  library.

### Recharts

- **What it is**: composed, declarative React chart components (`AreaChart`, `Line`,
  `ReferenceDot`, `ReferenceLine`), TypeScript-native (package.json `"types":
  "types/index.d.ts"` per npm registry check — hand-authored, not DefinitelyTyped).
- **React 19**: peerDependencies explicitly list `"react": "^16.8.0 || ^17.0.0 ||
  ^18.0.0 || ^19.0.0"` (npm registry, checked directly) — officially supported.
- **SSR**: broken today for anything beyond the most trivial static markup.
  `ResponsiveContainer` "doesn't work outside of the browser, as the container has to
  know the dimensions before rendering, and there's no way to know them for sure on the
  server" ([recharts/recharts#3595](https://github.com/recharts/recharts/issues/3595)).
  More fundamentally: recharts v3's chart configuration is propagated through
  `useEffect`/`useContext` into an internal Redux store, so per the maintainers' own
  discussion, "chart configuration does not run during server-side rendering, meaning
  charts are not present in the initial HTML," and their proposed fix
  (`renderToStringWithRecharts()`, a two-pass render) is **not yet implemented** and is
  explicitly incompatible with streaming SSR ("requires one full render before final
  output can begin," which breaks `renderToPipeableStream`)
  ([recharts/recharts#6390](https://github.com/recharts/recharts/discussions/6390)).
- **Layer fit**: `AreaChart` + `Line` + `ReferenceDot` cover the terrain fill, cable
  curves and anchors declaratively, but every series shares recharts' own Cartesian
  scale abstraction — forcing two *different*, deliberately-mismatched x/y scales (the
  entire point of a vertical-exaggeration policy, §3 below) means fighting that
  abstraction rather than using it, and a continuously-dragged marker needs a custom
  overlay recharts wasn't designed to host (no first-class drag primitive).

### Observable Plot

- **What it is**: declarative "grammar of graphics" over `d3`, official docs at
  `observablehq.com/plot`. Depends on the **whole** `d3` meta-package, not selected
  submodules (bundlephobia dependency listing above) — the source of its 127.9 KB gzip.
- **SSR**: officially supported, but not for free. The getting-started docs state: "use
  the `document` plot option to tell Plot to render with React's virtual DOM" for React,
  and for pure Node.js: "You can use Plot to server-side render SVG or PNG in Node.js. Use
  JSDOM for a DOM implementation via the `document` option, then serialize the generated
  plot using `outerHTML`" ([Getting started | Plot](https://observablehq.com/plot/getting-started)).
  I.e. Plot always wants a `Document` — in the browser it uses the global one implicitly;
  under SSR you must supply a JSDOM (or React-VDOM) document explicitly, which is an
  extra moving part TanStack Start's SSR pass would need wired in. A parallel open
  GitHub issue asking for the same recipe for Svelte/SolidJS
  ([observablehq/plot#1550](https://github.com/observablehq/plot/issues/1550)) confirms
  the React/Vue path is the only one with first-party docs.
- **TypeScript**: ships its own hand-written `src/index.d.ts` (npm registry, checked
  directly) — native, but hand-maintained rather than compiler-generated (Plot's source
  is JS with JSDoc, not TS).
- **Layer fit**: Plot's mark model (`Plot.area`, `Plot.line`, `Plot.dot`) covers the
  static layers well, but Plot is fundamentally a **declarative, re-plot-the-whole-thing**
  library — it re-renders the entire SVG from a fresh `Plot.plot(...)` call on every
  data change, and it has no built-in imperative drag/marker-follows-pointer primitive
  comparable to `@visx/drag`. Continuous re-solve-and-redraw during a slider drag (§4)
  would mean re-running the whole `Plot.plot()` pipeline every frame.

### D3 driving SVG directly (classic imperative pattern)

This is the pattern where D3 selections (`d3.select(...).append(...)`) own DOM nodes
inside the chart, bypassing React's rendering for those nodes. React's own docs warn
against this in general terms: "Avoid changing DOM nodes managed by React. Modifying,
adding children to, or removing children from elements that are managed by React can
lead to inconsistent visual results or crashes" — the safe pattern is restricting refs
to "parts of the DOM that React has *no reason* to update"
([react.dev — Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs)).
Practically that means giving D3 an empty `<g ref={...}>` React never re-renders into, and
letting D3's `.enter()/.exit()` own everything below it — workable, but it re-introduces a
second mutation system fighting React's, for no benefit over the next option.

### Hand-rolled SVG with React

- **Rendering**: pure JSX (`<path>`, `<circle>`, `<line>`) — React SSRs it exactly like
  any other markup, no client-only dependency, no hydration mismatch risk.
- **Scale math**: for this domain the "scale" is a single affine map per axis
  (`pixel = a + b·metres`) — a linear-only special case of `d3-scale`'s `scaleLinear`.
  `d3-scale`'s own docs confirm `scaleLinear().domain(...).range(...).clamp(...)` is "a
  pure function with no DOM dependency" ([d3js.org/d3-scale/linear](https://d3js.org/d3-scale/linear))
  — safe to use, but for two numbers in, two numbers out, and no dates/colours/bands ever
  needed here, a ~10-line hand-written affine map removes even the 16 KB gzip and the
  `@types/d3-scale` dependency (§1 above). `d3-shape`'s path generators (`area`, `line`,
  `curveLinear`) are more clearly worth keeping if the terrain/cable curves need smooth
  interpolation between GPX/solver points, at 5.7 KB gzip standalone
  (`d3js.org` / bundlephobia, checked directly) with zero DOM coupling.
- **Layers**: every layer in the §2 inventory below is a plain SVG primitive; nothing in
  the ticket's list needs a feature a charting library provides and hand-rolled SVG
  doesn't (stacked series, legends, tooltips-on-hover-over-arbitrary-data are not on the
  list).
- **Interaction**: the draggable rider marker is a `pointerdown`/`pointermove` handler on
  an SVG element updating one piece of state — full control over whether that state
  update is a normal `setState` (re-renders the marker + whatever depends on `s_D`) or is
  decoupled from React's render entirely (imperative style via refs), see §4.

---

## 2. Layer inventory

Confirmed against `docs/simulation-theory.md` §6, §11, §6.3 and the map's scope table:

1. **Terrain profile** — filled area, `z_ground(x)`. Flat baseline before GPX per
   `map.md`'s "Terrain baseline" decision; a GPX-derived polyline after import.
2. **Unloaded cable curve** — `z_cable(x; no rider)`, the installed/pretension shape.
3. **Loaded cable curve** — `z_cable(x; x_P)` with the rider at its current slider
   position; this is the curve that moves continuously while dragging (§6.2's rolling
   sweep, material coordinate `s_D`).
4. **Rider marker**, offset **below** the loaded cable by `h_rider` (§6.3; lanyard +
   body-below-harness, default 2.1 m, `[CONVENTION]` — must render as a labelled,
   adjustable value per the map's binding provenance rule, not a silent constant).
5. **Both anchors** — A and B, fixed points, generally at different heights (`h ≠ 0`
   per §2's frame, B can be higher or lower than A).
6. **Minimum-clearance callout** — the §11 global minimum of
   `h_clear(x; x_P) = z_cable − z_ground − h_rider` over the current sweep step, i.e. a
   highlighted point + numeric readout, not just a visual gap.
7. **Clearance band/shading** — a visual fill between the loaded cable (minus `h_rider`)
   and the terrain, to make the §11 minimum legible as an area, not just a number.

What the references imply that this list doesn't yet name, worth flagging to the
prototype ticket (07):

- **The chord line** (straight line A→B) — §6.1/§7's reasoning is anchored on sag
  *below the chord* (`D`), and PLS-CADD-style stringing charts (§3 below) conventionally
  show the chord as a reference line precisely so a viewer can read sag without it being
  swamped by vertical exaggeration. Not in the ticket's list; recommend adding it.
- **A slope/angle readout in true units** (° or %) next to the chart — because §3's
  policy below makes the *visual* angle unreliable by construction, any place the app
  wants the user to trust a slope it must print the number, not rely on the drawing.
- **A visible V.E. annotation itself** — the ticket's §3 already asks for this; noting it
  here so it isn't lost as "just a label" — it is a required layer, see §3.
- **Use-class / textile-vs-steel indicator** is not a chart layer but the map's scope
  table gates textile to non-`PERMANENT` use — not a rendering concern, no action here.

---

## 3. Vertical exaggeration

### What the physics fixture actually looks like true-to-scale

Fixture Z1 (`docs/simulation-theory.md` §15): `L = 100 m`, sag `D ≈ 4.4 m` — a 1:23 aspect
ratio. At the domain's other extreme (map.md's ~2000 m spans), a deep-slack span like
fixture Z2's shape (10 N/m, `w`, sag ≈ 8.75 m on a 100 m span, i.e. 1:11 at that end) scaled
up implies sags in the tens of metres on the longest spans — still a two-order-of-magnitude
horizontal:vertical ratio at every point in the 50–2000 m domain. A single fixed
exaggeration factor cannot serve both ends: whatever ratio makes a 100 m/4.4 m-sag span
read as a visible curve will make a 2000 m/30 m-sag span either barely-there or, inverted,
whatever suits the long span will over-exaggerate the short one into a caricature.

### How adjacent domains handle it

- **Topographic profiles (cartography, general).** Vertical exaggeration is formally
  `VE = VS/HS` (vertical scale over horizontal scale, both as representative fractions);
  "5× means vertical measurements appear 5 times greater than horizontal measurements…
  1× indicates … 'no vertical exaggeration.'" Convention: **"it's a cartographic
  convention to always show the vertical exaggeration value on your profile graph."**
  Also flagged as a known hazard: "if the vertical exaggeration is too high, the map
  reader may get confused" ([Vertical exaggeration — Wikipedia](https://en.wikipedia.org/wiki/Vertical_exaggeration),
  citing a 2007 Idaho State University geology source, itself now archived — the primary
  numeric-example source is one hop further back than I could verify).
- **Overhead-line stringing / sag-tension charts.** `docs/simulation-theory.md` §7
  itself frames the zip-line sag-vs-tension inverse problem as "the mooring 'pretension
  problem' and overhead-line 'sag-tension/stringing' problem [R2 B5]" — i.e. the domain
  this ticket is worried about is a known, named problem in transmission-line
  engineering, with commercial tooling (PLS-CADD/PLS-CADD-Ultralite, Power Line Systems)
  built around it. What I could confirm about that tooling's *display* conventions from
  primary text:
  - Profile/plan-and-profile views are a first-class view type with their own window
    state, independent axis handling ("F1/Survey/Terrain Features/Shift/Scale/Rotate
    XYZ," long-axis grid label options configurable per view) and a dedicated,
    toggleable **on-screen scale indicator**: "Added a scale indicator to the lower
    right of most graphics views. Control default visibility with new File/Preferences
    setting 'Default show scale indicator'" (PLS-CADD 2022 "What's New," item 11 —
    [powline.com ATUG_2022 handout](https://www.powline.com/usrgroup/madison22/handouts/ATUG_2022_PLS_CADD_WhatsNew.pdf),
    text extracted via `pdftotext`).
  - **Not found**: an explicit statement, in the material I could reach, of whether that
    scale indicator reports a *single* uniform scale (implying true-to-scale plotting) or
    independent horizontal/vertical scales with a displayed ratio (implying an
    acknowledged exaggeration). Other PLS-CADD marketing/technote PDFs I fetched
    (`graphical_sagging.pdf`, `Output_Reformatted_Stringing_Charts.pdf`) either don't
    mention scale at all in extractable text or weren't reachable in readable form. I am
    not asserting PLS-CADD's convention beyond what's quoted above.
- **GPS/consumer elevation profiles (Strava et al.).** These use non-uniform axes as a
  matter of course — "vertical exaggeration occurs when the vertical dimension is scaled
  differently than the horizontal dimension on a profile… this is a common practice…
  because actual elevation changes are often small compared to horizontal distances" — but
  **not found**: any evidence Strava (or peers) prints a numeric V.E. figure on the chart
  itself; the pattern there seems to be silent auto-fit, which is exactly the failure mode
  the cartographic convention above warns against ("can appear steeper… than it actually
  is").
- **Ski-run / ropeway longitudinal profiles.** Not found: any citable primary source
  (manufacturer datasheet, standard, or ropeway-authority document) describing a specific
  vertical-exaggeration convention for ski-lift or ropeway profile drawings. General
  elevation-profile literature (above) is the closest transferable evidence.

### Recommendation

**Auto-fit vertical scale per render, with a mandatory, permanently visible numeric V.E.
annotation, plus a true-scale numeric readout wherever the picture can't be trusted.**

Reasoning, tied to evidence:

1. A fixed ratio is ruled out by the domain's own numbers (above) — it cannot serve both
   a 100 m and a 2000 m span legibly.
2. Auto-fit (compute the vertical pixel range needed so the sag/clearance band occupies a
   fixed, generous fraction of the chart height, then derive `y-scale/x-scale` from that)
   matches the *de facto* practice in the one domain with the most transferable
   commercial tooling (GPS/mapping elevation profiles) — but that domain's silent
   auto-fit is explicitly the pattern the cartographic literature warns is misleading
   when undisclosed.
3. So: keep the auto-fit (it's necessary given point 1), but add what cartography's
   literature says is missing from it — an always-visible, computed "Éch. verticale ×N"
   label (French UI per `map.md`), recomputed live as parameters change, never a static
   design-time constant.
4. Because the visual slope is now guaranteed distorted by construction, any number the
   user needs to trust — ground clearance at the rider's position, chord slope angle,
   sag depth — must also appear as **printed text**, not be left for the user to read off
   the drawing. This is the direct answer to the ticket's "how does the app tell the
   user it's looking at a distorted picture": both a standing ×N label *and* refusing to
   let any safety-relevant number be eyeballed.
5. A user-controlled slider is not ruled out by any evidence found, but nothing in the
   surveyed conventions treats it as necessary either (topographic tools fix VE per
   product/print, they don't expose a live control) — leaving it out of v1 is
   defensible; flag as future/nice-to-have, not as settled.

---

## 4. Interaction cost

The rider slider re-solves per §6.2's rolling-rider sweep and must redraw continuously
while dragging (map.md: "Rider slider… quasi-static," "100–500 solves per parameter
change" is flagged as an *open, measurable* performance question already, not this
ticket's to answer for the *solver* — but the *chart* redraw cost is in scope here).

- **Declarative libraries (Recharts, Observable Plot)** re-render/re-plot their whole
  output from the new data on every update by design — Recharts through its component
  tree + Redux-backed context, Plot through a fresh `Plot.plot()` call. Neither publishes
  a documented per-frame cost for "n points, redrawn every pointer-move event"; I found
  no primary benchmark for either under a continuous-drag workload — **not found**, flag
  as open (§ below), but structurally both are the closest thing here to "force a
  virtual-DOM diff of the whole chart every frame."
- **uPlot** publishes concrete numbers, but for a different workload: "From a cold start,
  uPlot can create an interactive chart containing 166,650 data points in 25ms, scaling
  linearly at ~100,000 points per millisecond afterwards," and "in most cases, you can
  live-stream data with uPlot at 60fps" ([leeoniya/uPlot README](https://github.com/leeoniya/uPlot)).
  That's canvas-repaint throughput for bulk time-series data, not a measurement of "one
  polygon + a few polylines + one dragged marker" — likely overkill-fast for this
  chart's actual point count (a discretised profile of a few hundred points per §11's
  sweep-step scan, not hundreds of thousands), but the number doesn't transfer directly.
- **Hand-rolled SVG / visx-primitives**: no published benchmark for this exact shape
  either, but the relevant primary guidance is React's own and a first-hand engineering
  account of solving *exactly this class of problem* (continuous pointer-driven updates
  at 60fps): Atlassian's drag-and-drop performance writeup reports concrete before/after
  numbers — "reduced from 2.6 seconds to 15ms with 500 draggable items" and "reduced from
  380ms to 8ms" for equivalent operations — achieved specifically by **avoiding
  `render()`** on the hot path ("avoid calling a component's `render()` function as much
  as possible") and pushing continuous visual updates through direct style/attribute
  mutation on refs instead of `setState`
  ([Dragging React performance forward — A. Reardon](https://medium.com/@alexandereardon/dragging-react-performance-forward-688b30d40a33)).
  This is a blog post, not a spec — flagged as such — but it's a named engineer's
  first-hand account of shipping this exact pattern (Atlassian's `pragmatic-drag-and-drop`),
  not a roundup, and it converges with React's own architecture: a chart made of a few
  hundred plain SVG nodes can update the one node that moves (the rider marker, the one
  cable path's `d` attribute) via a ref and `element.setAttribute`, sidestepping React's
  reconciliation for the 60fps path entirely — something none of the declarative
  libraries expose a hook for, and something uPlot's canvas model does for free but at
  the cost of §1's SSR and interaction-model mismatches.
- React's own documented tool for this class of problem, if the ref-mutation route is not
  taken: `useDeferredValue`/`startTransition`, "React documentation covers implementing
  these Hooks in scenarios like … slider-driven lists," where "the deferred version lags
  behind the real value during rapid updates" ([react.dev — useTransition](https://react.dev/reference/react/useTransition),
  [react.dev — startTransition](https://react.dev/reference/react/startTransition)) — a
  documented, lower-effort fallback if direct ref mutation turns out to be unnecessary
  once the prototype (07) measures actual frame cost.

**No library surveyed publishes a benchmark for this chart's actual shape** (few hundred
points, one filled polygon, a handful of polylines, one dragged marker, redrawn on every
`pointermove`). That number has to be measured against the prototype, not assumed from
any of the above — flagged as an open question below.

---

## 5. Accessibility and export

- **Accessible name/description on inline SVG**: MDN's `<title>` reference documents this
  is the mechanism — "the `<title>` element provides an accessible, short-text description
  of any SVG container element or graphics element" — combined with `role="img"` and
  `aria-labelledby` referencing `<title>`/`<desc>` ids
  ([MDN — `<title>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/title)).
  Hand-rolled SVG (or visx primitives, which emit plain SVG) can carry this from day one;
  a canvas-based chart (uPlot) cannot — a `<canvas>` has no internal structure for a
  screen reader to read, only whatever fallback content/ARIA the app layers around the
  whole element.
- **Export to PNG/SVG later, without a rewrite**: for an SVG-based approach (hand-rolled,
  visx, Recharts, Plot's SVG output), the browser-native path is
  `new XMLSerializer().serializeToString(svgElement)` — MDN: "The `XMLSerializer`
  interface provides the `serializeToString()` method to construct an XML string
  representing a DOM tree" ([MDN — XMLSerializer](https://developer.mozilla.org/en-US/docs/Web/API/XMLSerializer))
  — giving an SVG string directly (exportable as `.svg`), or drawable onto a `<canvas>`
  via an `Image` + `canvas.toDataURL()` for a `.png`. This is a client-only, dependency-free
  path — consistent with the map's "no backend" constraint. A canvas-first chart
  (uPlot) gets PNG export for free (`canvas.toDataURL()` directly) but SVG export would
  need re-drawing the chart into an SVG-emitting path, which is the rewrite this
  question is trying to avoid.
- Net: SVG-based rendering (hand-rolled or visx) keeps both accessibility semantics and
  both export formats open without committing to either now, "note it, don't design it,"
  per the ticket.

---

## RECOMMENDATION

**Hand-rolled SVG in React, with `d3-shape` for the two path generators (area + line) and
a hand-written ~10-line affine scale for the axes.** Skip `d3-scale` itself — its 16 KB
gzip and its dependence on the separate `@types/d3-scale` package (§1) buy nothing this
chart needs (band/time/log/ordinal scales, `.nice()`, colour interpolation); the only
operation ever needed here is `pixel = a + b·metres` on two independent axes, which is
simpler to write, test (trivially, against the exact §15 fixture coordinates) and read
than to onboard a dependency for. Keep `d3-shape` (5.7 KB gzip, its only dependency is `d3-path` per bundlephobia's
dependency listing — no DOM-touching module in its tree, same shape of purity `d3-scale`
itself documents: "a pure function with no DOM dependency,"
[d3js.org/d3-scale/linear](https://d3js.org/d3-scale/linear)) for turning point arrays
into `<path d="...">` strings with sane curve
interpolation for the terrain/cable polylines; hand-rolling a robust SVG path-string
builder is the one piece of this that's genuinely fiddlier than it looks (curve
smoothing, area-closing back along the baseline) and `d3-shape` is a narrow,
well-scoped, actively-maintained answer to exactly that, not a chart framework.

Why this wins over every packaged option surveyed:

- **SSR**: zero risk. It's JSX; TanStack Start's SSR renders it exactly like any other
  markup. Every packaged alternative has a documented SSR wrinkle — recharts's is
  currently unresolved and explicitly incompatible with streaming SSR
  ([recharts/recharts#6390](https://github.com/recharts/recharts/discussions/6390)); Plot's
  needs an explicit JSDOM/`document` option wired through
  ([observablehq.com/plot/getting-started](https://observablehq.com/plot/getting-started));
  uPlot's canvas model has no documented SSR path at all; even visx's composed `XYChart`
  has an open SSR bug ([airbnb/visx#1478](https://github.com/airbnb/visx/issues/1478)) —
  though visx's raw primitives (the only part this recommendation would use if visx were
  chosen) don't share that bug.
- **Dependency weight**: `d3-shape` alone (5.7 KB gzip) vs. 147.5 KB (recharts) or 127.9 KB
  (Observable Plot) for the same three layers this chart actually needs.
- **Interaction model**: full control over whether the dragged rider marker's 60fps
  update goes through `setState` or bypasses it via a ref, per §4 — none of the
  declarative libraries expose that choice; it's baked into how they own their DOM.
- **Independent x/y scales**: this ticket's central tension (§3) *requires* deliberately
  mismatched axes. That's the natural, unopinionated case for two independent affine
  functions; it's the case every Cartesian-chart abstraction (Recharts, Plot) has to be
  fought to produce, because their whole value proposition is coupling series to a shared
  scale story.
- **Accessibility/export**: SVG output keeps both `<title>`/`<desc>`/ARIA (MDN) and
  `XMLSerializer`-based SVG/PNG export (MDN) open, same as visx, better than uPlot's
  canvas (§5).

### Runner-up: visx primitives (`@visx/shape`, `@visx/group`, `@visx/drag`) — and why it lost

visx's low-level packages are SSR-safe, natively typed, officially React-19-compatible,
and would do this job well — `@visx/shape`'s `AreaClosed`/`LinePath` are literally the
`d3-shape` wrapper this recommendation would otherwise hand-roll a thin JSX layer around.
It loses narrowly, on the map's own stated preference ("few dependencies is a virtue…
hand-rolled SVG is a legitimate answer if the survey supports it") and this survey's
finding that no visx package here does anything the app can't do with 5.7 KB of
`d3-shape` plus its own JSX: `@visx/shape`'s 10.7 KB gzip includes `@visx/group` and
`classnames` for composition sugar this small a chart doesn't need. If the prototype (07)
finds the hand-rolled path-string/area-closing logic gets unwieldy once real GPX terrain
and the clearance band are both on screen, `@visx/shape`'s `AreaClosed`/`LinePath`/`Bar`
are the documented fallback with the least migration cost, since it's the same
`d3-shape`-backed model.

`@visx/drag` is worth a second look regardless of the marker verdict above — it's a
purpose-built, typed drag primitive for exactly the rider-marker interaction, and using
it wouldn't reintroduce any of visx's SSR concerns (it's a plain hook, no registry).
Recharts and Observable Plot are ruled out outright, not just "lost" — Recharts on the
unresolved-SSR finding (§1, §5) and its Cartesian-abstraction fight against independent
axes (§3); Plot on its re-plot-the-whole-chart model being the wrong interaction shape
for a continuously-dragged marker (§4) plus its full-`d3` dependency weight (§1). uPlot is
ruled out on SSR (no path) and interaction-model mismatch (canvas hit-testing for a
draggable point + no accessible SVG structure, §5) even though its raw redraw throughput
is the best-documented number in this survey.

---

## Vertical-exaggeration policy (repeated from §3, for the spec)

**Auto-fit the vertical scale per render** so the sag/clearance band occupies a fixed,
generous fraction of the chart's pixel height regardless of span (50 m–2000 m) or sag
magnitude, **plus** a mandatory, live-recomputed "Éch. verticale ×N" label, **plus**
printed numeric readouts (clearance, slope, sag) anywhere the app needs the user to trust
a number rather than eyeball the drawing. Evidence: cartography's own convention is to
always disclose VE ("it's a cartographic convention to always show the vertical
exaggeration value on your profile graph" —
[Wikipedia, Vertical exaggeration](https://en.wikipedia.org/wiki/Vertical_exaggeration));
the domain's own numbers (§3) rule out a fixed ratio; GPS-tool practice (Strava et al.)
shows auto-fit without disclosure is the common failure mode this policy is designed to
avoid. A user-adjustable VE slider is not contraindicated by anything found, but nothing
found treats it as necessary either — left out of v1, flagged open below.

---

## Scale/projection module sketch

A pure, framework-agnostic module — no React, no DOM — so it's directly Vitest-testable
against the §15 fixture coordinates (`docs/conventions/testing.md`'s existing pattern).

```ts
// domain metres -> screen pixels, independent x/y, math frame (z up) -> SVG frame (y down)

interface DomainExtent {
  xMin: number; xMax: number; // metres, along the chord
  zMin: number; zMax: number; // metres, up positive (§2 sign convention)
}

interface Viewport {
  width: number; height: number; // px
  padding: { top: number; right: number; bottom: number; left: number }; // px, for axis labels/VE annotation
}

interface Projection {
  x: (xMetres: number) => number; // px
  z: (zMetres: number) => number; // px, flips sign: SVG y grows downward
  invertX: (xPx: number) => number; // for pointer -> metres, rider drag
  verticalExaggeration: number; // x-scale (px/m) / z-scale (px/m) — the printed "×N"
}

function createProjection(extent: DomainExtent, viewport: Viewport, opts?: {
  minVerticalFractionOfHeight?: number; // e.g. 0.6 — the §3 auto-fit target
}): Projection;
```

- `x` and `z` are independent affine maps built from `extent`/`viewport` — no shared scale
  object, so the §3 policy (deliberately mismatched axes) is the natural output, not a
  workaround.
- `createProjection` computes the auto-fit vertical scale from the *current* sweep step's
  data (terrain + both cable curves + clearance band, not a fixed design-time constant)
  and returns `verticalExaggeration` for the mandatory label — this is the one function
  that encodes the §3 policy; everything downstream just reads its output.
- `invertX` (and its z-equivalent, if the rider drag is ever driven by pointer Y as well
  as X) is what the draggable marker's pointer handler calls to turn a pixel position
  back into a domain coordinate — feeding §6.2's material-coordinate sweep, not the pixel
  math.
- Layer components (`TerrainArea`, `CablePath`, `RiderMarker`, `AnchorPoint`,
  `ClearanceBand`, `ClearanceCallout`, `ChordLine` per §2's inventory) each take a
  `Projection` plus their own domain data and emit plain SVG — none of them know about
  scale math, all of them are trivially snapshot-testable on fixed inputs.
- `d3-shape`'s `area()`/`line()` generators sit just inside `CablePath`/`TerrainArea`,
  consuming already-projected (pixel-space) point arrays — i.e. `Projection` is called
  first, `d3-shape` only ever sees pixels, never metres, keeping the "what's a metre vs
  what's a pixel" boundary in exactly one place.

---

## OPEN QUESTIONS

- **No measured frame-time number exists, from any source, for this chart's actual
  shape** (a few hundred points, one polygon, several polylines, one dragged marker,
  redrawn on every `pointermove`). §4's evidence is all either a different workload
  (uPlot's bulk time-series throughput) or a different domain (Atlassian's drag-and-drop
  list reordering). This has to be measured against the prototype (07), not assumed.
- **PLS-CADD's actual profile-view scale convention** (true-to-scale vs. independent axes
  with a disclosed ratio) could not be confirmed from the primary text I could reach —
  two of its technotes were unreadable PDFs even via `pdftotext`, and the one readable
  "what's new" note confirms a generic on-screen scale indicator exists but not what it
  reports. If this matters later, it would need someone with PLS-CADD access or a
  clearer technote, not another search pass.
- **Whether GPS elevation-profile tools (Strava etc.) ever print a numeric V.E. value**
  could not be confirmed either way from primary sources — flagged as "not found," not
  assumed absent, in §3.
- **No ropeway/ski-lift-specific profile convention found** at all — general
  elevation-profile literature is the closest transferable evidence, not a direct hit.
- **Whether a user-adjustable V.E. slider should ship in v1** is a product decision, not
  a research one — nothing found makes it necessary, nothing found rules it out. Left to
  the prototype/spec tickets.
- **Whether `d3-shape`'s curve interpolation (vs. plain polyline/`curveLinear`) is
  warranted** for the cable curves specifically — the elastic catenary already gives a
  smooth analytic shape at the sweep's resolution (§4, §6.2), so interpolation between
  sample points may be unnecessary smoothing of already-smooth data. Decide against the
  prototype once real point density is chosen, not here.
