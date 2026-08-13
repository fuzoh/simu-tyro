# 33 — Verify Trace lifecycle in browser

**What to build:** Take imported CSV from file picker through Trace-backed Terrain, Anchor Placement, removal, and Session reuse. Verify derived geometry and provenance remain understandable at desktop and 390 px, including file-identity line’s fourth state.

**Blocked by:** 28 — Keep safety controls usable under constrained height.

**Status:** ready-for-agent

- [ ] « Importer un profil… » opens file workflow; no drop-zone-only path is required.
- [ ] Valid CSV produces Trace-backed Terrain, interactive Anchor Placements, and derived span/elevation read-outs.
- [ ] Sampling spacing, point count, filename, and provenance disclosure match imported data.
- [ ] Moving Anchor Placement updates derived geometry without mutating received Trace.
- [ ] « Retirer le tracé » restores retained manual span and elevation values.
- [ ] Cached inactive Trace exposes « Réutiliser ce tracé » and its four-state identity line fits at 390 px.
- [ ] Parse failure leaves current Terrain untouched and names filename plus failing line.
- [ ] Browser procedure uses stable fixture and records desktop plus 390 px outcomes.
