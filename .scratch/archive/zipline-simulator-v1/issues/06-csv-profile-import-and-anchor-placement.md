# CSV profile import and anchor placement

Type: grilling
Status: resolved
Blocked by: — (01, 04 resolved)
Map: [Zip-line simulator v1](../map.md)
Reads: [ticket 04](./04-span-and-rigging-parameter-model.md) §1 — anchors are placed as
(station, height above profile), `L`/`h` become read-outs, and manual terrain already emits
the 2-point `profile` case.

> **Retitled mid-effort.** This ticket was `06-gpx-terrain-model-and-anchor-placement.md`
> until the terrain source changed from GPX to profile CSV. GPX is now **out of scope** for
> v1 (see the map) and [GPX parsing in the browser](./01-gpx-parsing-in-the-browser.md) is
> **superseded** — kept as a walked step, not as a thing to build. The question below is the
> CSV rewrite; the original GPX question set is preserved at the bottom under
> [Superseded question](#superseded-question-gpx) so the pivot stays auditable.

## Question

How does an imported profile CSV become the ground under the line, and how does the user
place the two anchors on it?

The source format is the **profile export of a Swiss federal geoportal**
(`map.geo.admin.ch` → outil Profil → export CSV). Two real examples live at
`docs/references/example-profile-trace1.csv` and `…-trace2.csv`. The user draws a line on
the map; the tool samples a DEM along it and exports:

```
Distance;Altitude;Easting;Northing;Longitude;Latitude
0;540.4;2547727.43;1192457.59;6.752859;46.881175
0.9;540.4;2547727.06;1192456.74;6.752854;46.881167
```

Settle:

1. **File contract.** How strictly is an acceptable file defined? Which columns are
   required, which ignored, and what is auto-detected (delimiter, decimal mark)? Note `;`
   *is* the European-Excel convention, so any Excel round-trip on a fr-CH machine rewrites
   `540.4` as `540,4`.
2. **Resolution.** Does the app resample or smooth? §11 requires an inner minimum over
   *all* `x`, so grid resolution is a correctness concern, not a cosmetic one.
3. **The origin.** `x = 0` is anchor A in the §2 frame; the file's `Distance` is 0 at the
   drawn line's start. Name the translation and where it lives.
4. **Anchor placement.** How does the user place the two anchors, and how are `L` and `h`
   derived? Confirm this matches ticket 04's framing.
5. **Two sources, one concept.** What happens to manually-entered geometry when a trace is
   imported, and what happens when the trace is removed?
6. **Crop rule.** A trace kilometres long with the zip line occupying 200 m of it — what x
   range do the charts cover?
7. **Degenerate placements.** Anchors outside the trace extent. B before A. Both at the same
   station. A trace shorter than 50 m.
8. **Parse failures.** Define the taxonomy and the row-level policy, with French copy.

## Context

Read `docs/simulation-theory.md` §11 (the clearance criterion and why the inner minimum over
all `x` exists), §2 (the frame: A at origin, `h < 0` means B lower), and §4.3 (ground
contact is an error state the solver must detect and report, never iterate into).

Scope reminders from the map: there are no network calls, so no DEM fallback and no map
view; the terrain type is ticket 03's `{ kind: "profile"; xs; zs }`, already exercised by
manual mode's 2-point case.

---

## Answer

Resolved by grilling, 2026-08-05. Ten decisions. The measurements below were taken against
the two real example traces *before* any decision was made — and several of the original
ticket's sub-questions dissolved once the format's actual properties were known.

### 0. What the format actually is — measured, not assumed

| Property | trace1 | trace2 |
| --- | --- | --- |
| Rows (excl. header) | **200** | **200** |
| `Distance` span | 0 → 183.4 m | 0 → 224.0 m |
| Spacing (min / max) | 0.90 / 1.00 m | 1.10 / 1.20 m |
| `Distance` strictly increasing | yes | yes |
| Missing `Altitude` cells | 0 | 0 |
| `Altitude` range | 472.5 – 540.5 m | 1182.9 – 1234.7 m |
| Planimetric chord from `Easting`/`Northing` | 183.42 m | 223.96 m |
| `Distance` ÷ chord | **0.99991** | **1.00018** |
| Max lateral deviation from the chord | **0.007 m** | **0.009 m** |
| 3-D surface length along the terrain | **263.9 m** | — |
| Encoding | ASCII, LF, no BOM, `;`, `.` decimal | idem |

Four findings, each of which killed or reframed a sub-question the original ticket had
written down as open:

- **`Distance` is horizontal.** 183.4 reported against a 183.42 planimetric chord and a
  263.9 m 3-D surface length — the horizontal reading is confirmed to 2×10⁻⁴, the surface
  reading is off by 44 %. This is the load-bearing fact of the whole ticket: §2's `x` axis is
  horizontal, and misreading `Distance` as surface distance would inflate every `L` by nearly
  half on broken ground, silently and plausibly.
- **The trace is straight by construction.** 7–9 mm of lateral deviation over 180–224 m.
  These are *drawn* lines sampled from a DEM, not recorded GPS tracks — which dissolves the
  original Q1 (cumulative haversine vs projection onto the A→B chord: the file hands you
  along-line horizontal distance directly, and the line *is* the chord) and dissolves the
  smoothing half of Q2 (there is no barometric or GPS noise to smooth; the 0.1 m altitude
  quantisation is DEM pixel resolution).
- **The exporter emits a fixed count, not a fixed pitch.** 200 rows in both files despite
  different lengths, so spacing = `length/199`. This *created* a concern sharper than the one
  the ticket wrote down — see §2.
- **Every point carries an altitude**, so the original Q8 (partial `<ele>`, inherited from
  ticket 01) has no CSV analogue. Its replacement is a row-level parse policy — §8.

### 1. File contract — columns by name, minimum `Distance` + `Altitude`

Parse the header row and locate columns **by name**, case-insensitively. Require `Distance`
and `Altitude`; ignore every other column except for the straightness check (§10). Detect the
delimiter (`;` or `,`) and the decimal mark (`.` or `,`) from the file.

```
Distance;Altitude;Easting;Northing;Longitude;Latitude   ✓ swisstopo, verbatim
distance;altitude                                       ✓ hand-made minimum
Distance;Altitude    (with 540,4 decimals)              ✓ Excel fr-CH round-trip
Altitude;Distance                                       ✓ by name, so order-free
0;540.4                                                 ✗ no header → rejected
D;Z                                                     ✗ unrecognised → rejected
```

**No positional fallback.** That is the whole point: a file whose first two columns are
`Altitude;Distance` parses "successfully" under a positional reader and yields ground that is
wrong in a way no downstream check can catch. Matching by name makes the swapped-column class
unrepresentable. The price — rejecting a headerless two-column file — is worth paying, and
the rejection message says exactly what is missing.

Rejected alternative: **strict swisstopo shape only** (exact 6-column header, `;`, `.`).
Maximum provenance certainty, but it refuses both a hand-made two-column file and any Excel
round-trip of a legitimate export — a lot of friction to buy a guarantee the app never uses.

### 2. Resolution — use the file's own samples; never resample

Terrain keeps **exactly the points the file gave**. Ticket 03's `xs`/`zs` arrays carry no
uniformity requirement and `zGroundAt` already interpolates linearly, so non-uniform input
costs nothing.

Why this is a decision and not a detail: spacing is `length/199`, so it degrades precisely
where spans get long enough to matter.

| Span | Exported spacing |
| --- | --- |
| 183 m | 0.92 m |
| 500 m | 2.5 m |
| 1500 m | 7.5 m |
| 2000 m | 10.0 m |

Resampling to a uniform 1 m grid is the obvious-looking fix and it is a trap: linear
interpolation between two DEM samples 10 m apart adds **zero** terrain knowledge while making
the array *look* ten times more resolved. A bump between two samples stays exactly as
invisible as before, and a coarse import becomes indistinguishable from a fine one. For a
clearance tool that is the non-conservative direction — it manufactures confidence. Same
argument, same verdict, as dropping rows in §8.

So the honest move is disclosure. The measured max spacing is **always** shown as a terrain
provenance line (hand-off to ticket 08), with a non-blocking warning above ~5 m:

```
Profil importé · 200 points · pas max 7,5 m
⚠ Résolution du terrain grossière (pas > 5 m) — un relief entre deux
  points de mesure n'est pas vu par le calcul de garde au sol.
```

Also rejected: **hard-rejecting** a coarse file. It would block the long-span case outright,
and whether the export can be made denser at all is not yet known — that is now
[ticket 16](./16-profile-export-point-count.md), which will settle whether the warning can
also tell the user *how* to fix it.

**Where clearance gets evaluated — a note so nobody "fixes" this later.** Ticket 03 has
`evaluateClearance` scan `h_clear` at the terrain's own sample points. That is only safe if
the minimum cannot hide *between* two samples, and in principle it can: `z_cable` is convex
(a sagging catenary), `z_ground` is piecewise linear, so `h_clear` is convex on each terrain
segment and a convex function's minimum over an interval may sit in its interior. The
magnitude of the miss is the cable's own sag across one segment — at a 1500 m span with 50 m
sag, across a 7.5 m segment, **≈5 mm**. Vertex evaluation therefore stands. Densifying the
scan would spend ticket 07's measured 8 ms budget to recover millimetres.

### 3. The origin — file coordinates are canonical, translation lives at the Terrain seam

The imported profile is held **once, immutably, in file coordinates**. The engine's `Terrain`
is *derived* where it is needed.

```ts
state:   profile  = { d: Float64Array, z: Float64Array }   // file coords, never mutated
         anchorA  = { station: 62.0,  height: 4.0 }
         anchorB  = { station: 245.0, height: 2.5 }

derived: L = anchorB.station − anchorA.station
         terrain = { kind: "profile",
                     xs: [0, …d[i] − 62 for 62 < d[i] < 245…, L],
                     zs: [interp(62), …,                      interp(245)] }
```

Moving an anchor is a **different derivation, never a mutation** of imported data. Two
consequences fall out for free: what gets persisted is the file, not a view of it (ticket 09),
and re-anchoring is always possible because the original is never lost.

**The slice inserts interpolated endpoints at exactly `x = 0` and `x = L`.** `d_A` will
generally land between two samples, and without synthesised endpoints `zGroundAt` would be
asked to extrapolate at the span's ends — which is where the anchors are and where the
clearance read-outs get the most scrutiny.

Rejected: **translating and slicing at import time** (every anchor drag re-derives the stored
array, and the original has to be kept anyway for provenance and re-anchoring, so nothing is
saved); and **extending `Terrain` with an `x0` offset field** (changes a type ticket 03 fixed,
and puts an offset in the clearance inner loop).

### 4. Anchor placement — four fields, two draggable markers

```
Station A  [ 62.0 ] m     Hauteur d'ancrage A  [ 4.0 ] m
Station B  [ 245.0] m     Hauteur d'ancrage B  [ 2.5 ] m

Valeurs déduites
  Portée L      183.0 m
  Dénivelé h    −38.6 m
  Alt. base A   540.4 m   ·   Alt. base B  501.8 m
```

Derivation, confirming ticket 04 §1 needs no reconciliation:

```
L = d_B − d_A
h = (z(d_B) + hauteur_B) − (z(d_A) + hauteur_A)
```

`z(d)` is the linear interpolation of the profile at station `d`. The two `hauteur d'ancrage`
fields are **the ones ticket 04 already created** for manual mode — no new field concept, and
they keep their meaning: they feed Terrain only, never `solveSpan`.

The two markers on the profile chart drag to write the stations, reusing **ticket 07's rule
verbatim**: pointer input snaps to a terrain sample, a typed station is exact and
interpolates. The justification transfers intact — 1 px ≈ 1.2 m at 1500 m, so there is no
precision in a drag to preserve, while a station taken from a site survey must be enterable
to the metre.

Rejected: **fields only** (placing an anchor on a visible terrain feature becomes trial and
error against the chart) and **chart clicks only** (no way to type an exact station, which is
how a real span gets specified).

### 5. Two sources — import spans the whole trace, manual geometry is retained

```
manual                    import                    remove
L  183.0  (typed)   ─►   L  183.4  (read-out)  ─►   L  183.0  (typed)
h  −30.0  (typed)   ─►   h  −38.6  (read-out)  ─►   h  −30.0  (typed)
haut. A  4.0        ─►   haut. A  4.0          ─►   haut. A  4.0
haut. B  2.5        ─►   haut. B  2.5          ─►   haut. B  2.5
                         stations 0 → 183.4         stations discarded
```

On import, anchor A goes to the first station and B to the last. These traces are **drawn for
the line** — the user opened the geoportal, drew the span, exported it — so the trace length
*is* the intended span, and the import yields a complete, solvable geometry with zero further
input.

Manual `L`/`h` stay in state untouched and are **restored exactly** when the trace is removed.
This mirrors ticket 05's retain-across-family-flip rule and ticket 04's finding that
discarding a user's parallel input is worth a blocking error. The `hauteur d'ancrage` fields
need no special handling in either direction: they describe the installation, not the terrain.

Rejected: **adopting the existing `L`** (place A at 0, B at station `L`). It preserves `L` but
`h` changes anyway because the terrain decides it — half-preserved, harder to explain, and it
needs a further fallback rule whenever the trace is shorter than `L`. Also rejected:
**overwrite and reset**, which makes an accidental import destroy typed geometry with no undo.

**Amended 2026-08-12** by
[First-run scenario and default values](./14-first-run-scenario-and-defaults.md) §10: this
remove path keeps the **profile cached in the Session** — it discards the stations, not the
trace — and the file-identity line in `Paramètres › Géométrie` gains a **fourth state**, « Tracé
en mémoire : *nom.csv* (non utilisé) » with **`[ Réutiliser ce tracé ]`**, which re-places A at
the first station and B at the last exactly as an import does. For a link-received trace the
line reads « tracé reçu par lien (non utilisé) », since ticket 09 §6 drops the filename. Without
this path « Réinitialiser le scénario »'s promise to keep the Trace cached is empty and the
reset is destructive in effect.

### 6. Crop rule — one shared domain, span + 5 % margin, clamped to the trace

```
  margin│        span [0, L]          │margin
  ┈┈┈┈┈┈┈┼──A──────────────────────B──┼┈┈┈┈┈┈   profil
         │   ╲__________________/     │
  ───────┼─────────────────────────────┼──────   garde au sol
  (vide) │  ╲───────────────────────╱  │ (vide)
         0                             L
```

Domain = `[d_A − 0.05L, d_B + 0.05L]`, clamped to the trace extent — so a whole-trace import
makes the domain exactly the trace.

This is **constrained, not chosen**. Ticket 07's spine has the clearance-vs-position curve
doubling as the scrub track, aligned under the profile, which only works if both charts share
an x domain — and the clearance curve's domain is rider position, i.e. `[0, L]`. "Show the
whole trace in the profile chart" therefore isn't a free option: it would silently break the
mechanism ticket 07 chose the entire layout for, putting the marker under the cursor at a
different `x` in each chart.

The margin resolves the counter-pressure. With a domain of exactly `[0, L]`, dragging anchor A
inward rescales the chart under the cursor *and* makes the terrain you just excluded vanish,
so you cannot see what you are dragging away from. The 5 % margin keeps that context visible,
and because the domain is shared the clearance curve is simply **undefined outside `[0, L]`** —
which marks the span's boundaries visually for free rather than needing a separate cue.
Horizontal rescale while dragging an anchor is consistent with the vertical auto-fit ticket 07
already established per render.

**Amended by [ticket 15](./15-responsive-and-narrow-screen-layout.md) §4, §9.** This
pixel-alignment requirement was violated in the prototype that demonstrated it — profile pad
`{left 16, right 16}` (`chart-kit.ts:37`) against strip pad `{left 24, right 24}`
(`variant-d.tsx:104`), so the two x axes coincide only at mid-span and diverge to 8 px at each
end, **34 m at a 1500 m span**, exactly at the anchors. It is now enforced structurally: **one
shared x scale object, one `GUTTER = 24`, one inverse**. Consequently the draggable station
handles of §4 do **not** sit on the profile: they live in a dedicated 24 px **Handle Lane**
between the plot area and the x-axis labels, reserved at every width and in both modes — in
manual mode it draws the non-interactive span bracket, which is also the « span markers »
ELECTIONS §0.3 requires to keep drawing when the Clearance Gate fails.

### 7. Degenerate placements — block with a one-click fix

**A structural finding first, because it relocates validation.** Ticket 04 attached every hard
range to a **field** (`L > 0` finite, `h` finite). In imported mode `L` and `h` are *derived
read-outs*, so those checks have nothing to hang off. They must still run — on the derived
values, with the error **attributed back to whichever station field can fix it**. Otherwise
`station B = station A` yields `L = 0`, reaches `solveSpan`, and returns
`invalid-input{field:"L"}` pointing at a field the user cannot edit.

```
station B ≤ station A
  ⛔ L doit être > 0 — l'ancrage B est avant l'ancrage A.
     [ Inverser A et B ]

typed station 260 on a 224 m trace
  ⛔ Station hors du tracé (0 – 224,0 m).

dragged marker
  → clamped at the trace end; the error state is unreachable

trace 40 m long → L = 40
  ⚠ Hors du domaine de validité (50 – 2000 m)     [ticket 04's existing warning]
```

B ≤ A is a **blocking error with a one-click « Inverser A et B »**, never a silent auto-swap —
auto-normalising to `A = min(station)` would flip the sign of `h`, which is exactly the
silent-model-reinterpretation ticket 04 ruled out at the §10.4 family gate. Typed stations
block; dragged markers clamp, reusing ticket 07's typed-is-exact / pointer-is-constrained
asymmetry so the two input paths stay consistent across the app.

The one-click fix earns its place because the repair is mechanical and unambiguous — making
the user retype both stations is friction with no safety benefit.

### 8. Parse failures — reject the whole file, name the line

Replaces ticket 01's GPX taxonomy (`not-xml` / `not-gpx` / `empty-track` /
`missing-elevation`), superseded along with the rest of that research.

| Kind | French copy |
| --- | --- |
| `colonnes-manquantes` | « Colonnes Distance et Altitude introuvables. » |
| `aucune-donnée` | « Le fichier ne contient aucune ligne de données. » |
| `trop-peu-de-points` | « Au moins 2 points sont nécessaires. » |
| `valeur-non-numérique` | « Valeur illisible ligne 47, colonne Altitude. » |
| `distance-non-croissante` | « La distance décroît à la ligne 112. » |
| `distance-dupliquée` | « Deux altitudes à la même distance, ligne 88. » |
| `lecture-impossible` | « Impossible de lire le fichier. » |

Plus a non-blocking hint when the total distance is < 5 m — the km-vs-m confusion, otherwise
indistinguishable from a legitimately tiny trace:

```
⚠ Distances peut-être en km plutôt qu'en mètres ?
```

**Any bad row rejects the whole file, with its line number.** A skipped row is a lost terrain
bump, so importing-what-parses manufactures a smoother profile than the data supports — the
same non-conservative move as resampling in §2, and a warning count doesn't say *where* the
gap is. These files come from a machine exporter, so a malformed row means hand-editing or a
different tool: worth stopping for, and the line number makes stopping actionable.

`distance-dupliquée` has a format-induced cause worth recording: spacing is `length/199` and
`Distance` is written to 0.1 m, so **any trace under ~20 m produces duplicate `Distance`
values** — two altitudes at one `x`, i.e. ambiguous ground. That is far below the 50 m
validity floor, so rejecting costs nothing real.

### 9. Persistence — handed to ticket 09 with a measured number

Not decided here. The fact ticket 09 needs: an imported trace is **10.4 KB / 200 rows**, so it
cannot ride in a URL search param. Whether a shared URL references it, embeds it compressed,
or drops back to manual geometry is 09's call — §3's decision to keep the file coordinates
canonical and immutable is what makes all three options available.

### 10. Straightness — check it when the coordinates are there

The original ticket called this unresolvable without a straightness metric. It is resolvable:
`Easting`/`Northing` (or `Longitude`/`Latitude`) are in the file, and the metric is one pass —
max lateral deviation from the A→B chord, plus the `Distance` ÷ chord ratio.

It matters because the format permits exactly one modelling error, and this catches it:
nothing stops a user drawing a **bent polyline** on the geoportal. Then `Distance` runs along
the bend while the zip line is the straight chord between anchors — `L` comes out too long,
the terrain gets stretched, and without the check the app cannot tell.

```
Profil importé · 200 points · pas max 0,9 m
✓ Tracé rectiligne (écart max 0,01 m)

bent polyline:
⚠ Tracé non rectiligne (écart max 34 m sur 220 m). La portée L est
  mesurée le long du tracé, pas en ligne droite — elle est surestimée.

hand-made 2-column file:
ℹ Rectitude non vérifiable (coordonnées absentes).
```

Non-blocking, and explicitly **not** a rejection: a slight bend to route around an obstacle is
real surveying practice, and blocking it would leave no way to proceed. The absent-coordinates
case is *disclosed* rather than passed over silently — an unverifiable assumption the user
knows about is a different thing from one they don't.

### Hand-offs

| Ticket | What it inherits |
| --- | --- |
| [08](./08-results-panel-and-provenance-warnings.md) | the terrain provenance block: point count · max spacing · straightness verdict, and the two warnings in §2 and §10 |
| [09](./09-url-state-schema-and-persistence.md) | 10.4 KB / 200 rows; the file-coords-canonical state shape of §3 |
| [11](./11-validation-and-error-state-ux.md) | the derived-`L`/`h` attribution problem (§7) and the « Inverser A et B » fix; the §8 taxonomy |
| [14](./14-first-run-scenario-and-defaults.md) | no trace on first run — manual geometry is the first-launch state |
| [15](./15-responsive-and-narrow-screen-layout.md) | the shared-x-domain constraint of §6 |
| [16](./16-profile-export-point-count.md) | new: can the export exceed 200 points, and how? Decides whether §2's warning can say *how* to fix it |

### Amended

- **`CONTEXT.md`** — the `Terrain` entry said "a profile imported from a GPX track"; now a
  profile CSV. Added **Trace**, **Station** and **Anchor Placement** as vocabulary, since
  §3–§7 gave them precise meanings the app will use in both code and UI.

---

## Superseded question (GPX)

Preserved verbatim from the pre-pivot ticket, so the change of terrain source stays auditable.
**Do not build against this.** Of its eight sub-questions, 1 and 8 were dissolved by the CSV
format's properties, 2 was half-dissolved (smoothing) and half-sharpened (resolution), and
3–7 survived into the rewrite above.

> How does an imported GPX track become the ground under the line, and how does the user
> place the two anchors on it?
>
> 1. **Trackpoints to `z_ground(x)`.** Cumulative haversine distance along the track as `x`,
>    or projection of each point onto the straight A→B chord? These agree only for a perfectly
>    straight track — and the map rules curved tracks out of scope, so decide which assumption
>    the app *makes* and what it does when the track violates it (silently accept, warn, or
>    reject with a straightness metric).
> 2. **Resampling and smoothing.** Raw GPS traces have irregular point spacing and noisy
>    barometric elevation. Does the app resample to a uniform grid, and at what spacing?
>    Decide whether smoothing is offered, and if so whether it is on by default (smoothing a
>    real bump away is non-conservative for clearance).
> 3. **The origin.** `x = 0` is the left anchor A in the §2 frame, but the GPX track has its
>    own start. Name that translation and where it lives.
> 4. **Anchor placement.** Anchors are placed as *distance along the profile* + *height above
>    the profile at that point*. Derive `L` and `h` from that.
> 5. **Edge cases.** Anchors outside the track extent. Anchor B before anchor A. Both anchors
>    at the same distance. A track shorter than 50 m. A track kilometres long with the zip
>    line occupying 200 m of it — decide the crop rule.
> 6. **Terrain as one concept, two sources.** Define the single terrain type both sources
>    produce. Decide what happens to manually-entered geometry when a GPX is imported.
> 7. **Removing the GPX.** Can the user clear an imported track and go back to flat ground?
> 8. **Partial elevation.** `<ele>` is optional *per trackpoint* in both GPX schemas — reject
>    when **any** point lacks it, or only when **all** do (interpolating the gaps)?
