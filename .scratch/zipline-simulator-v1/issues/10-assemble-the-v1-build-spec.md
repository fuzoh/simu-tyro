# Assemble the v1 build spec

Type: task
Status: open
Blocked by: 06, 07, 08, 09, 11, 12, 13, 14 (03, 04, 05 resolved)
Map: [Zip-line simulator v1](../map.md)

## Question

Nothing left to decide — this is the destination artifact.

Gather every resolved ticket on this map into one spec that `/implement` can be handed
without further conversation, and write it to `.scratch/zipline-simulator-v1/spec.md` per
`docs/agents/issue-tracker.md`.

The spec must carry:

1. The scope statement, lifted from the map's Destination and Out-of-scope sections, so a
   reader knows the boundary without opening the map.
2. The engine contract — types, functions, failure taxonomy, module layout — from
   [Engine API, execution model and module layout](./03-engine-api-execution-model-and-module-layout.md).
3. The full parameter model with French labels, units, defaults, ranges and validation
   rules, merged from
   [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) and
   [Material spec model](./05-material-spec-model.md).
4. The terrain and GPX pipeline from
   [GPX terrain model and anchor placement](./06-gpx-terrain-model-and-anchor-placement.md).
5. The visualisation spec, with the prototype linked as the reference artifact, from
   [Profile visualisation prototype](./07-profile-visualisation-prototype.md).
6. The outputs, safety verdict and provenance mechanism from
   [Results panel — safety verdict and provenance warnings](./08-results-panel-and-provenance-warnings.md).
7. The state and URL schema from
   [URL state schema and persistence](./09-url-state-schema-and-persistence.md).
8. An implementation order, seeded by the §17 roadmap — parabola seed, then elastic
   catenary plus Jacobian (§4–§5), point load (§6.1), rolling sweep (§6.2), inverse modes
   (§7), clearance (§11) — with the §15 fixtures as the TDD seed set at each step.
9. The test plan: which §15 fixtures land as which Vitest cases, at what tolerance, and the
   file layout to record in `docs/conventions/testing.md`.

Also, while assembling: update `CONTEXT.md` with the app-layer ubiquitous language the map
produced (`docs/simulation-theory.md` §1 covers the physics vocabulary; the app-layer terms
invented across these tickets do not live anywhere yet), and offer an ADR only where the
`/domain-modeling` bar is met — hard to reverse, surprising without context, and the result
of a genuine trade-off. The engine execution model and the GPX terrain model are the two
plausible candidates.

Finally, sweep the map's **Not yet specified** section. Anything still fogged when
everything else has resolved either graduates into a ticket now or is recorded in the spec
as a decision deferred to implementation. Nothing stays vague by accident.
