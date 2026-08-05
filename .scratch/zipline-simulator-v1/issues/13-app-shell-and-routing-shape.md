# App shell and routing shape

Type: grilling
Status: open
Blocked by: 09
Map: [Zip-line simulator v1](../map.md)

## Question

Is v1 one route or several, and what — if anything — does TanStack Start's SSR do for it?

Graduated from the map's fog once
[Engine API, execution model and module layout](./03-engine-api-execution-model-and-module-layout.md)
settled where computation lives: the engine is synchronous, pure, and entirely client-side,
reached through a `useSweep` hook. There is no server-side computation to arrange and no
loader-fetched data — which sharpens the question rather than answering it. Blocked by the
URL state schema, because TanStack validates search params in the route definition, so the
schema decides part of the route's shape.

Settle:

1. **One route or several.** A single `/` holding the whole simulator, or separate routes for
   (say) the simulator and a printable report view. Note the app has no navigation in the
   usual sense — every state change is a parameter change.
2. **What SSR renders.** The engine cannot produce anything meaningful on the server: there
   is no persisted state to hydrate, and a shared link's `L₀`/material parameters could in
   principle be solved server-side — decide whether that is worth anything or whether the
   first paint should simply be the empty shell. Consider `ssr: false` on the route, static
   prerendering of the shell, or leaving SSR on and accepting it renders a skeleton.
3. **Where the search-param schema is validated**, given ticket 09's decision — in the route's
   `validateSearch`, or in a plain parser the route delegates to.
4. **Where localStorage rehydration happens** without an SSR hydration mismatch: last-session
   restore is client-only by definition, so decide the mechanism (post-mount effect, or a
   client-only boundary) and what the user sees for the frame before it lands.
5. **Whether `__root.tsx` carries any chrome at all** — a header, a title, a print stylesheet
   hook — or whether the simulator fills the viewport.

## Context

`docs/conventions/routing.md` is the binding doc; read it first.
Current state: `src/routes/__root.tsx` and `src/routes/index.tsx` are untouched scaffold, and
`src/routeTree.gen.ts` is generated — never hand-edit it.

The GPX file never leaves the browser (map scope decision: the app is genuinely offline, no
network calls), so nothing here may introduce a server round-trip for terrain.
