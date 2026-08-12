# P0.2 · The §15 fixture module

Stage: P0.2
Status: open
Blocked by: 01
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 11

## Delivers

`src/lib/sim/__fixtures__/theory-15.ts`, exporting `F1` and `Z1`–`Z6` transcribed from
`docs/simulation-theory.md` §15, **each with a `source` field**.

## Gate

Every engine test case that will consume a fixture is **red** — the fixtures exist, the modules do
not.

## Notes

- **`Z7` (thermal, §9) and `Z8` (dynamics, §12) are absent on purpose** — their physics is out of v1
  scope. Add them with the feature, not before. §15's own « Excluded fixtures » list is never
  ported.
- **No value is ever transcribed from `docs/references/`** — §14 records which worked examples are
  fabricated.
- **Tag the source in the fixture, not in a comment**, and keep the two provenance classes distinct:
  `source: "simulation-theory.md §15 Z4"` versus `source: "[MEASURED] ticket 14 §2"`. A §15 row is
  MoorPy-cross-validated physics; a measured row is this app's own output at a moment in time.
  Treating them alike invites someone to tighten the wrong one and to trust the wrong one.
- `check.ts` in the prototype is a **coverage checklist, not a value source** — and it never made
  four of the assertions this build needs (voir § 11).
