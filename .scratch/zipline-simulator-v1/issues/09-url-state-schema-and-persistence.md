# URL state schema and persistence

Type: grilling
Status: open
Blocked by: 05, 06 (04 resolved)
Map: [Zip-line simulator v1](../map.md)
Reads: [ticket 04](./04-span-and-rigging-parameter-model.md) — the field table is the state to
serialise, plus two display preferences that also persist: the force unit (daN/kN/kgf) and the
active Tightness Spec mode. Note that `L`/`h` are *inputs* in manual mode and *derived* in GPX
mode, so what the URL carries differs by terrain source.

## Question

What exactly goes in the URL, what goes in localStorage, and what happens to a shared link
whose terrain came from a file on someone else's disk?

The map fixes the approach — URL search params for shareable state, localStorage for the
last session, GPX stays local. This ticket designs it.

Settle:

1. **The search-param schema.** Every parameter from
   [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) and
   [Material spec model](./05-material-spec-model.md), with its key name, encoding and
   precision. Decide between readable keys (`span=250&h=-40`) and a single opaque encoded
   blob. Readable keys are debuggable and hand-editable; a blob is shorter and versionable.
   Decide how floats are rounded — full precision makes ugly URLs, rounding makes a shared
   link produce slightly different numbers than the sender saw.
2. **Validation on the way in.** TanStack Router validates search params. Decide the
   validation library or hand-rolled validators, and — more importantly — decide what
   happens when a link carries a value that is out of range or a key the app no longer
   knows. Fall back to a default silently, or tell the user the link was partly ignored?
3. **Schema versioning.** A shared link outlives the schema that made it. Decide whether a
   version key ships in v1 and what the upgrade path looks like, or explicitly accept
   breakage and say so.
4. **GPX and the URL.** A track is far too big for a query string, so a shared link
   necessarily loses the terrain. Decide the behaviour: does the link carry the anchor
   *placements* and fall back to flat ground, or does it refuse to encode a GPX-derived
   geometry at all? Decide what the recipient sees — silently different terrain is the worst
   answer available.
5. **localStorage.** What is stored, under what key, and how it interacts with the URL when
   both are present. Precedence matters: a user clicking a shared link should see the link's
   scenario, not their own last session. Decide whether the GPX track itself is cached
   there, and how big a track is allowed to be before that is a bad idea.
6. **The write side.** When does the URL update — on every keystroke, on blur, debounced?
   Every keystroke pollutes browser history; debounced risks a stale link when the user
   copies the address bar. Decide, including whether updates replace or push history
   entries, and whether the browser back button meaningfully undoes a parameter change.

## Context

Read `docs/conventions/routing.md` — TanStack Start with SSR and file-based routing,
`rsc: false`. Check the current TanStack Router search-param API with `ctx7` before
committing to a design; do not rely on remembered API shapes.

Depends on the parameter and material tickets for the field list, and on
[GPX terrain model and anchor placement](./06-gpx-terrain-model-and-anchor-placement.md)
for how a placement is expressed once terrain exists.
