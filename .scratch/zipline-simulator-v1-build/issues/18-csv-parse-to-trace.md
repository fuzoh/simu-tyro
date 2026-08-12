# A3 · CSV parse → `Trace`, and the seven parse failures

Stage: A3
Status: open
Blocked by: 09, 15
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 4, § 7 ·
[Amendments](../AMENDMENTS.md) **D**

## Delivers

The profile-CSV parser — **outside `src/lib/sim/`** — producing an immutable `Trace` in **file
coordinates**, the Trace → `Terrain` derivation at one seam, the straightness check, and the seven
parse failures with their file-name prefix. Plus the terrain-provenance disclosure block.

## Gate

The three real traces in `docs/references/example-profile-trace{1,2,3}.csv` — **183,4 / 224,0 /
188,4 m, 200 rows each** (there are **three**, not two, whatever tickets 06, 09 and 14 say). The
seven failures as table-driven cases, each **leaving the current terrain untouched**.

## Notes

- **`Distance` is horizontal, not surface distance.** 183.4 reported against a 183.42 planimetric
  chord and a 263.9 m 3-D surface length — reading it as surface distance would inflate every `L` by
  **44 %** on broken ground.
- **Columns by name** (minimum `Distance` + `Altitude`; delimiter and decimal mark auto-detected) with
  **no positional fallback** — that alone makes a swapped `Altitude;Distance` file unrepresentable.
  A consequence worth knowing: a **hand-authored two-column CSV is a first-class input**, and it has
  no `Easting`/`Northing`, so it lands in « rectitude non vérifiable ».
- **No resampling, no smoothing.** The exporter emits a **fixed 200 points, not a fixed pitch**, so
  spacing is `length/199` — 0,92 m at 183 m, **7,5 m at 1500 m**, coarsest exactly where spans are
  longest. The app uses the file's own samples and **discloses the measured spacing**, warning above
  ≈5 m. Resampling was rejected for inventing zero terrain knowledge while making a coarse import
  indistinguishable from a fine one.
- **200 is a hard ceiling, per export and not per line** — operator-attested, corroborated by three
  traces of different lengths all landing on exactly 200 rows. So the ≈5 m warning is crossed at
  ≈1000 m and **coarse terrain is the normal state on the upper half of the range**; the warning must
  say the cap is per export, or an operator re-exports hoping for a denser file.
- **`Terrain` is derived at one seam**: subtract `d_A`, slice to `[0, L]`, **insert interpolated
  endpoints** so `zGroundAt` never extrapolates where the anchors are. The file stays recoverable and
  ticket 09's type is unchanged.
- **Malformed rows reject the whole file with a line number.** A skipped row is a lost bump.
- **The straightness check is one pass over `Easting`/`Northing`** — it catches the single modelling
  error the format permits: a bent polyline, where `Distance` follows the bend while the line is the
  chord. The traces are straight to **7–9 mm** because they are *drawn* lines DEM-sampled, not GPS
  recordings.
- Terrain quality is disclosed **in manual mode too** — « ligne droite entre les pieds d'ancrage ».
  A missing block is as ambiguous as a missing warning.
- **GPX is out of scope.** Nothing is inherited from the superseded GPX research.
- **Validate with valibot** — this is a boundary, so it belongs here (and **never inside
  `src/lib/sim/`**, which stays dependency-free). Two constraints: the schema validates the **row
  shape**, while « reject the whole file with a line number » is the *parser's* rule, so the issue
  path must carry the row index; and **valibot's messages never reach the UI** — the seven failure
  strings are the spec's French copy, keyed off the issue, not rendered from it.
- Unlike the URL, **this boundary may coerce** — a CSV cell *is* text and must become a number. The
  no-`transform` rule is specific to `validateSearch`, where coercion provoked a 307.
