# A3 · CSV parse → `Trace`, and the seven parse failures

Stage: A3
Status: done
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

## Comments

**Done.** Three modules in `src/lib/terrain/`, all outside `src/lib/sim/`, each with a colocated
test:

- **`trace.ts`** — § 4's `Trace` (file coordinates, `readonly`, never mutated), `AnchorPlacement`,
  `altitudeAt` (linear interpolation, ends **held** not extrapolated), `traceExtent`, `maxSpacing`,
  `deriveSpan`, and **the one seam** `deriveTerrain`: subtract `d_A`, slice to `(d_A, d_B)`
  strictly, insert interpolated endpoints, `xs[0] === 0` and `xs[last] === L` exactly. Ticket 09's
  `Terrain` union is unchanged and nothing was lifted from the prototype.
- **`csv.ts`** — `parseProfileCsv(text, fileName)`, columns by name (case-insensitive, no
  positional fallback), delimiter and decimal mark auto-detected, BOM / CRLF / quoted cells
  tolerated, a valibot row schema whose `v.array` issue path carries the row index, and the seven
  failures as a discriminated union rendered by `parseFailureMessage` in § 7's verbatim French.
  Also `maxLateralDeviation`, the one-pass straightness metric, and `readFailure` for
  `lecture-impossible`.
- **`provenance.ts`** — `terrainDisclosure(source)` returns the block as data (tier · text ·
  detail): the always-shown « Profil importé · N points · pas max X m », the coarse-resolution ⚠
  with the per-export cap, the three straightness states, the km hint, and the manual-mode ℹ with
  its measured gorge consequence.

Gate green on the three real traces — 200 rows each, extents **183,4 / 224,0 / 188,4 m**, max
spacing **1,0 / 1,2 / 1,0 m**, deviation **0,007 / 0,009 / 0,009 m** — so § 4's measured table
comes back out of the parser instead of being transcribed into it. The seven failures are
table-driven, each asserting its message *and* that a Trace already loaded stays bit-for-bit
untouched.

Judgement calls where the spec was silent:

- **`z` is returned in the anchor-A-top frame**, not as raw altitudes. § 4's sketch writes
  `zs: [interp(62), …]` to show the *x* translation, but § 2 / §11 and `terrain.ts`'s shipped
  two-point manual case fix the datum — 540 m of altitude against a cable at −40 m does not
  compare. So `zs[0] === −hauteur_A` exactly.
- **Line numbers are physical file lines** (header = line 1; blank lines are skipped as data but
  still counted), so « ligne 47 » is the line an editor jumps to.
- **Refusal precedence**: `aucune-donnée` (no header, or no data rows) → `colonnes-manquantes` →
  `trop-peu-de-points` (one row) → `valeur-non-numérique` → `distance-dupliquée` /
  `distance-non-croissante`. A truly empty file has no columns to name, so it lands on
  `aucune-donnée` rather than on a `colonnes-manquantes` with an empty list.
- **An unreadable *coordinate* cell degrades to « rectitude non vérifiable » instead of rejecting
  the file.** « Any bad row rejects the whole file » exists because a skipped row is a lost terrain
  bump; `Easting`/`Northing` carry no ground, and the honest answer to a broken coordinate is the
  state that says a check could not run. Only `Distance` and `Altitude` are rejection-worthy.
- **The straightness cut is `dev > max(0,10 m, 0,5 % of the extent)`.** § 4 gives both ends of the
  scale (7–9 mm over 183–224 m is straight, 34 m over 220 m is bent) and no threshold between
  them. At 0,5 % the induced `L` overestimate is 5×10⁻⁵, under the file's own 0,1 m grain.
- **`Longitude`/`Latitude` fall back to a local equirectangular projection** about the trace's mean
  latitude (spherical earth), used only to turn degrees into metres for the deviation.
- **Copy numbers render at 2 decimals for a deviation and 1 for a spacing or an extent**, through
  `quantity.ts`'s `DECIMAL_MARK`. § 3's display table has no row for either — they are § 6 prose
  figures — and no row was added to it. The clean case reproduces § 6's « écart max 0,01 m »
  verbatim on the real traces.
- **`deriveTerrain` throws `RangeError` on `L ≤ 0`.** That is the degenerate placement the UI
  blocks with « L doit être > 0 » and `[ Inverser A et B ]`; reaching the derivation with it is a
  caller bug of `sampleCable`'s class, not a physics failure.
- **`deriveSpan` follows § 4's formula, not its sketch.** The sketch prints `h −38,6` for anchor
  heights 4,0 / 2,5, which is the difference of the two *base* altitudes; the section's formula
  `h = (z(d_B) + hauteur_B) − (z(d_A) + hauteur_A)` is what `solveSpan` needs, and it gives −40,1.

Three gates green: `bun run typecheck`, `bun run lint-type-aware`, `bun run test` (19 files, 616
cases).
