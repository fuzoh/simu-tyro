# URL state schema and persistence

Type: grilling
Status: open
Blocked by: — (04, 05, 06 resolved)
Map: [Zip-line simulator v1](../map.md)
Reads: [ticket 04](./04-span-and-rigging-parameter-model.md) — the field table is the state to
serialise, plus two display preferences that also persist: the force unit (daN/kN/kgf) and the
active Tightness Spec mode. Note that `L`/`h` are _inputs_ in manual mode and _derived_ in
imported mode, so what the URL carries differs by terrain source.

## Question

What exactly goes in the URL, what goes in localStorage, and what happens to a shared link
whose terrain came from a file on someone else's disk?

The map fixes the approach — URL search params for shareable state, localStorage for the
last session, the imported trace stays local. This ticket designs it.

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
4. **The trace and the URL.** **Ticket 06 measured it: 10.4 KB / 200 rows**, so a trace cannot
   ride in a search param — a shared link necessarily loses the terrain unless something else
   carries it. Decide the behaviour: does the link carry the anchor _placements_ and fall back
   to the straight anchor-base ground line, does it embed the trace compressed, or does it
   refuse to encode an import-derived geometry at all? Decide what the recipient sees —
   silently different terrain is the worst answer available, and it is worse here than it looks:
   ticket 06 makes `L` and `h` *derived* from the trace, so losing the terrain silently changes
   the span itself, not just the ground under it.
5. **localStorage.** What is stored, under what key, and how it interacts with the URL when
   both are present. Precedence matters: a user clicking a shared link should see the link's
   scenario, not their own last session. Decide whether the trace itself is cached there
   (10.4 KB is trivially within quota — the question is staleness and privacy, not size), and
   how big a trace is allowed to be before that changes.
6. **The write side.** When does the URL update — on every keystroke, on blur, debounced?
   Every keystroke pollutes browser history; debounced risks a stale link when the user
   copies the address bar. Decide, including whether updates replace or push history
   entries, and whether the browser back button meaningfully undoes a parameter change.

## Context

Read `docs/conventions/routing.md` — TanStack Start with SSR and file-based routing,
`rsc: false`. Check the current TanStack Router search-param API with `ctx7` before
committing to a design; do not rely on remembered API shapes.

Depends on the parameter and material tickets for the field list, and on
[CSV profile import and anchor placement](./06-csv-profile-import-and-anchor-placement.md)
for how a placement is expressed once terrain exists.

**Inherited from ticket 06** (§3, §9) — the state shape is already fixed, and it was chosen
partly to keep this ticket's options open:

```ts
profile = { d: Float64Array, z: Float64Array }   // file coordinates, immutable
anchorA = { station, height }
anchorB = { station, height }
// L, h and the engine's Terrain are all derived — never stored
```

Because the profile is kept in **file coordinates** rather than translated, all three options
in sub-question 4 remain available: the original bytes are always recoverable, so the trace can
be re-serialised, hashed for a reference, or dropped without corrupting anything. Had the
import translated and sliced eagerly, only the lossy option would have survived.

**Inherited from [Results panel](./08-results-panel-and-provenance-warnings.md)** — two new pieces
of state, one of them with an unusual absence semantic.

- **`Régime de sécurité`** — one of five enumerated entries (EN 15567-1 · WorkSafe QLD 2019 ·
  ACCT 10:1 · ANSI/ACCT 03-2019 5:1 · Secours textile 10:1). There is **no free `k`**, so this
  serialises as an enum, never a number. It has **no default** (ticket 04), which makes it the one
  field whose *absence from a URL is legitimate state* — « — choisir — », not a fallback to be
  filled in. A shared link that omits it must not silently acquire a regime.
- **`Coefficient dynamique`** (`DAF`, default 1,2) — a plain number, new to ticket 04's field
  table.

Also note ticket 08 §5's availability coupling: *Secours textile 10:1* is invalid under steel or
`PERMANENTE`. A URL carrying that combination is a restorable-but-invalid state, the same class of
problem as ticket 05's retained-across-flip material specs.
