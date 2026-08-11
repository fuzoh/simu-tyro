# Zip-line simulator v1 — wayfinder map

Label: `wayfinder:map`
Effort slug: `zipline-simulator-v1`
Tickets: `.scratch/zipline-simulator-v1/issues/`

## Destination

A **build-ready spec** for Scoutech v1: a single-page, fully offline, French-language
zip-line simulator — parametric inputs on the left, live profile chart on the right, a
slider that moves the rider quasi-statically along the line, and **profile-CSV terrain
import** (`Distance;Altitude`, the Swiss geoportal profile export) with anchor placement on
the imported profile. Physics scope is core statics plus safety verdict, exactly as fixed in
`docs/simulation-theory.md` §4–§7, §10, §11.

The map is done when every decision below the destination is resolved and the spec can be
handed to `/implement` — no app code written along the way except throwaway prototypes.

## Notes

**Domain.** Zip-line (tyrolienne) statics for spans 50 m – ~2000 m. The physics is
**already settled** in [docs/simulation-theory.md](../../docs/simulation-theory.md) —
861 lines, consolidated from four French reference reports and two deep-research runs,
with verified numerical fixtures (§15) cross-validated against MoorPy 1.3.0. Treat it as
the contract. Never re-derive a formula and never invent a constant
(`docs/conventions/simulation.md`). Vocabulary FR↔EN is fixed in §1 — use it.

**Skills every session should consult.** `/grilling` and `/domain-modeling` by default;
`/prototype` for the prototype tickets; `/research` for the research tickets.

**Binding provenance rule** (from `docs/simulation-theory.md` §0.2 and
`docs/conventions/simulation.md`): any coefficient tagged `[PAYWALLED]`, `[CONVENTION]`
or `[UNVERIFIED:R1]` may appear in the UI only as a **labelled, configurable default
carrying a warning** — never as a silent constant, never presented as normative. This is a
UI design constraint, not just an engine one.

**Stack constraints** (`AGENTS.md`). bun · TanStack Start (SSR, file-based router) ·
React 19 · Tailwind v4 (CSS-vars theme, no JS config) · shadcn/ui on Base UI · Vitest 4 +
jsdom. Never edit `src/routeTree.gen.ts` or hand-write `src/components/ui/**`. Gate on
`bun run typecheck` and `bun run lint-type-aware`.

**Never commit.** The agent does not make git commits in this repo.

### Scope decisions fixed while charting

These came out of the charting grill and are not up for re-litigation inside a ticket.

| Decision             | Value                                                                                                                                                                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Destination artifact | A spec plus ticket set, ready to build. Planning, not execution.                                                                                                                                                                                                                         |
| Physics scope        | Core statics (§4–§7) + ground clearance (§11) + safety verdict (§10).                                                                                                                                                                                                                    |
| Rider slider         | Position only, quasi-static. Slider = trolley material coordinate `s_D` (§6.2). No velocity, no time axis.                                                                                                                                                                               |
| Persistence          | URL search params for shareable state + localStorage for the last session. The imported trace stays local.                                                                                                                                                                                |
| Families             | Both — steel wire rope (A) and textile rope (B), gated by the §10.4 use-class rule (`PERMANENT` ⇒ steel only, hard validation). Separate code paths.                                                                                                                                     |
| Terrain baseline     | A straight ground line between the two anchor bases before any import (amended by ticket 04). Terrain is one concept with two sources.                                                                                                                                                   |
| Terrain import       | **Profile CSV** — `Distance;Altitude` plus optional coordinates, the Swiss geoportal profile export. Elevation is required by construction: every row carries it. No network calls — the app is genuinely offline. **Amended 2026-08-05, was GPX** (ticket 06).                            |
| UI language          | French UI, English code identifiers and comments (§1 vocabulary). No i18n framework; strings inline.                                                                                                                                                                                     |
| Material data        | Formula-derived with raw override. Steel: MBF/EA/mass from diameter, grade and construction via the EN 12385-4 K-factors (§13.1). Textile: `EA = k·MBL` with user-supplied `MBL` and `k` (§13.2). **Zero shipped product presets** — every product row in the references is compromised. |

## Decisions so far

<!-- one line per resolved ticket: gist + link -->

- [GPX parsing in the browser — library or DOMParser?](./issues/01-gpx-parsing-in-the-browser.md)
  — ⚠ **SUPERSEDED 2026-08-05** by the CSV pivot in
  [CSV profile import and anchor placement](./issues/06-csv-profile-import-and-anchor-placement.md).
  GPX is now out of scope for v1, so nothing below gets built. Kept because the route was
  walked: the survey is what made the pivot cheap, and it is the reference if GPX ever returns
  as a fresh effort. Its answer was —
  plain `DOMParser` plus a hand-written ~50-line mapper; no GPX library. `gpxparser` runs
  `jsdom-global()` at import and would poison SSR; `gpx-parse` is dead and needs Node
  builtins. `<ele>` is optional _per trackpoint_ in both GPX schemas, and `DOMParser` never
  throws on malformed XML — both facts force explicit validation.
- [Profile chart rendering — surveying the options for an extreme aspect ratio](./issues/02-profile-chart-rendering-approach.md)
  — hand-rolled SVG in React with `d3-shape` for paths and a hand-written affine scale per
  axis; no charting library (every packaged option has an SSR wrinkle, and independent
  mismatched x/y scales are the natural case for two plain functions). Vertical scale
  auto-fits per render and is always disclosed with a live **"Éch. verticale ×N"** label
  plus printed numeric read-outs. Runner-up `visx` primitives, recorded as the fallback.
- [Engine API, execution model and module layout](./issues/03-engine-api-execution-model-and-module-layout.md)
  — one `solveSpan(input)` with `loads: PointLoad[]` (empty = unloaded, since §6.1 keeps the
  unknowns at `(H, V₀)` either way); §7 modes resolve to `L₀` in a `resolveL0` adapter above
  it, making `L₀` first-class state. Results are scalars only — `SpanState` plus analytic
  `sampleCable(state, n)`, never a stored polyline — so §11 clearance is a _reducer_ over the
  sweep and the solver stays terrain-free. Sweep precomputed (240 uniform steps + geometric
  end tails, endpoints excluded, deterministic from `(L₀, n)`); the slider is an index lookup,
  never a solve. Engine is **synchronous and pure forever**, with async confined to a
  `useSweep` seam that stale-while-recomputing needs anyway; the worker question gets a
  measurable 8 ms p95 criterion instead of an opinion, and terrain crosses as cloneable data
  to keep that door open. Failures are a union of three real kinds — `invalid-input`,
  `no-convergence`, `slack-limit` — because most of §5.4 is internal remedies that _succeed_,
  and exceeding `MBF` is a safety verdict rather than a solve failure; ground contact surfaces
  in clearance, and a partial sweep carries `coverage` so a green verdict can't lie. Layout is
  `src/lib/sim/` by concept, with the A/B separation placed at `materials/steel.ts` vs
  `materials/textile.ts` (no shared base) rather than duplicating the material-blind catenary.
  Wrote [CONTEXT.md](../../CONTEXT.md) (app vocabulary) and the file/fixture layout section of
  [docs/conventions/testing.md](../../docs/conventions/testing.md).
- [Span and rigging parameter model, and the three parameterisation modes](./issues/04-span-and-rigging-parameter-model.md)
  — the full field table (label, unit, hard range, warning threshold) in five groups: Usage
  (type d'installation, régime de sécurité), Géométrie, Ligne, Tension de la ligne, Passager,
  plus read-only **Valeurs déduites**. Manual mode types `L` and `h` **directly** while GPX mode
  places anchors as (station, height above profile) with `L`/`h` as read-outs — two framings
  deliberately, because `solveSpan` wants exactly `(L, h)` and forcing the GPX framing onto
  manual mode would make every metre of dénivelé come from tower height. Manual ground is the
  **straight line between the two anchor bases** from two hauteur-d'ancrage fields, so §11
  clearance is live from first launch; it emits the 2-point case of ticket 03's existing
  `profile` terrain, needing no engine change — but it **amended CONTEXT.md's Terrain entry**
  away from "flat baseline". Tightness Spec is a segmented control with exactly one editable
  field and the other two as deduced read-outs (three editable fields with a driver radio
  rejected: every keystroke can flip the model's meaning). §10.4 shows textile **disabled with
  its reason** under `PERMANENTE`, and the switch path is a blocking error with a one-click fix,
  never a silent auto-switch that would discard the Material Spec. Forces get a **global,
  persisted unit selector** (daN default / kN / kgf) that **converts the quantity** on switch —
  provably physics-neutral, which is what kills the 10× input-error class; `G = 9.81` fixed and
  unexposed, `KGF = 9.80665`, the 0.03 % gap disclosed. Unconfirmed Defaults carry a «non
  confirmé» chip with the provenance in a popover, and editing one flips the chip but never
  clears the aggregate entry. Validation splits in **two tiers with one source of truth each**:
  the form checks only what needs no physics, and §5.4's chord bound stays in the engine as
  `invalid-input{field:"L0"}` rather than being re-derived in the UI. Régime de sécurité is a
  panel field with **no default**. Initial _scenario_ values deliberately deferred.

- [Material spec model — deriving MBF, EA and mass for steel and textile](./issues/05-material-spec-model.md)
  — the two **Ligne** blocks, resting on one asymmetry: **steel derives from geometry, textile
  transcribes from a datasheet**. Steel takes `(d, R₀, construction)` through the §13.1
  K-factors to `MBF`/`EA`/`μ`, each independently overridable; `E_app = 115 GPa` and
  `C = 0.4165` are pinned in popover prose, never fields, because they only ever appear as a
  product and two knobs for one number is two ways to be wrong. Textile takes
  `(classe, MBL, μ, k)` with `EA = k·MBL` as its only read-out — **diamètre dropped, no
  consumer in v1 scope** — and polyester ships `k` blank-and-required because nobody published
  it. Range-valued factors give **point values, never bands**: an interval would re-litigate
  ticket 03, and `[5.53 ; 8.41] MN` is the union of two handbook ranges, not a confidence
  interval. The session's key finding: **a zip line never enters §13.2's attested `k` band** —
  0.6 % MBL standing, 6.3 % loaded, against a table measured at 10–30 % — so `k` is a plain
  field whose out-of-band warning is _ambient state, not an alarm_; a band selector would
  dress three extrapolations as a calibrated choice and auto-iteration would dress backwards
  extrapolation as convergence. Terminations get **one picker per end** judged against `T_A`
  and `T_B` separately (free — ticket 03 already reports both), under one inherited rule:
  **defensible number ⇒ compute and let the Verdict judge** (grips solve, Verdict refuses on
  `[REGULATOR]` grounds), **no number ⇒ disable with reason** (knots on HMPE _slip_, so no
  `η_t` exists). Override is steel-only, per value, and survives a `d` change with a **stale
  badge** rather than being cleared or silently kept — and because `MBF` is the one derived
  value shipping `[STD-ATTESTED]`, overriding it _downgrades_ provenance into ticket 08's
  aggregate. Both Material Specs are **retained across a family flip** (ticket 04 already
  ruled discarding one worth a blocking error), which makes textile→steel able to raise
  `invalid-input{field:"L0"}` since `T_break/EA` is ≈ 0.013 steel vs ≈ 0.67 PA. `MBF` obeys
  the global force unit strictly — a kN carve-out would put 90,7 kN beside 437 daN and invite
  a 100× misread. Amended `docs/simulation-theory.md` §16 with gap **6b**.

- [Profile visualisation prototype](./issues/07-profile-visualisation-prototype.md)
  — built four variants behind a **verified solver** (§15 fixtures F1, Z1–Z5 to ≤ 4×10⁻⁶) and
  let the measurements decide. Spine is **C's two linked charts carrying B's fixed read-out
  strip**: rail · verdict banner · profile · clearance-vs-position curve · five cells. The
  deciding argument was the failure case, not taste — a **zero crossing is categorical** where a
  tint on a distorted profile is a judgement call — and both alternatives' read-out placements
  died of occlusion (A's HUD covers anchor B; C's tooltip covers the cable it describes), so
  read-outs sit **outside the plot area** in fixed cells. **No range input exists anywhere**: the
  clearance strip *is* the scrub track, since its x axis already is rider position, and it is
  joined by marker drag and a typed `x`. Position reads as **`x_D` in metres** with `%`
  secondary and **`s_D` never shown** (it drifts 0,5–2 % from `x_D`, so exposing it only invites
  "why are these different?"). Typed positions get an **exact §6.1-case-2 solve (~40 µs)** rather
  than being snapped and rewritten, while pointer input snaps — 1 px ≈ 1,2 m at 1500 m, so there
  is no precision to preserve; densifying the grid to hide snapping was rejected for costing the
  8 ms budget. Layers: fixed always-on set plus two toggles (« ligne à vide » off, « corde A–B »
  on), the unloaded line earning a toggle because it is informative on Z1 and invisible at
  1500 m. **The user-facing VE selector is dead** — ×20 at 1500 m throws the cable off-frame —
  replaced by a **hold-to-peek « ×1 vraie échelle »** beside the auto-fit badge (auto-fit spanned
  only ×1,2…×4,7 across 50–1500 m). Failure fires **four coordinated signals**, with the tinted
  band over **rider positions that violate** rather than over the worst point's x, and cable-red
  reserved for "the rider is in the zone right now"; the two contact kinds get **separate
  verdicts**, and the envelope one **names `h_rider` and carries its « non confirmé » chip** —
  the provenance rule applied to a verdict, not a coefficient. The clearance cell reports the
  **worst clearance for the current rider position** (§11's inner min) with the dimension line
  drawn where that minimum sits, which visibly steps sideways onto a terrain bump the rider has
  already passed. **Measured: no Web Worker**, p95 of sweep + clearance ≤ 2,3 ms even at 500
  steps against the 8 ms criterion, and dragging is vsync-bound (frame p50 16,7 ms) — ticket 12
  is now arithmetic.

- [CSV profile import and anchor placement](./issues/06-csv-profile-import-and-anchor-placement.md)
  — **the terrain source changed here**: GPX out, profile CSV in
  (`Distance;Altitude` + optional coordinates, the geoportal export), so this ticket was
  retitled and its GPX question set preserved as superseded. Measuring the two real traces
  first is what settled it, and three of the original sub-questions dissolved on contact with
  the facts. **`Distance` is horizontal** — 183.4 reported against a 183.42 planimetric chord
  and a 263.9 m 3-D surface length, so reading it as surface distance would have inflated
  every `L` by 44 % on broken ground. The traces are **straight to 7–9 mm** because they are
  *drawn* lines DEM-sampled, not GPS recordings, which kills the haversine-vs-chord question
  and the smoothing question outright. But the exporter emits a **fixed 200 points, not a fixed
  pitch**, so spacing is `length/199` — 0.92 m at 183 m, **7.5 m at 1500 m** — coarsest exactly
  where spans are longest; resampling to a uniform grid was rejected for inventing zero terrain
  knowledge while making a coarse import indistinguishable from a fine one, so the app **uses
  the file's own samples and discloses the measured spacing**, warning above ~5 m. Contract is
  **columns by name** (min `Distance` + `Altitude`, delimiter and decimal mark auto-detected,
  **no positional fallback** — that alone makes a swapped `Altitude;Distance` file
  unrepresentable). The profile is stored **immutably in file coordinates** and `Terrain` is
  derived at one seam (subtract `d_A`, slice to `[0, L]`, **insert interpolated endpoints** so
  `zGroundAt` never extrapolates where the anchors are) — which keeps ticket 03's type
  unchanged and the original file recoverable. Anchors are four fields plus draggable markers,
  reusing ticket 07's snap-on-drag / exact-on-type rule and ticket 04's existing
  `hauteur d'ancrage` fields; **import spans the whole trace** and manual `L`/`h` are retained
  and restored on removal (ticket 05's retain-across-flip rule). Both charts share **one x
  domain** — span + 5 % margin — because ticket 07's scrub track *is* the clearance curve
  aligned under the profile, so "show the whole trace" would have broken the mechanism the
  layout exists for; the clearance curve being undefined outside `[0, L]` marks the span for
  free. Degenerate placements **block with a one-click « Inverser A et B »** rather than
  auto-swapping, which would flip `h`'s sign — and a structural catch: ticket 04 hung its hard
  ranges on *fields*, but `L`/`h` are derived here, so those checks must run on derived values
  and attribute the error to a station field or `L = 0` returns
  `invalid-input{field:"L"}` pointing at something uneditable. Malformed rows **reject the whole
  file with a line number** (a skipped row is a lost bump). Two findings that outlive the
  ticket: vertex-only clearance evaluation is safe because the convexity miss is the cable's own
  sag across one segment, **≈5 mm** at 1500 m — so nobody should densify that scan and spend the
  8 ms budget on millimetres; and the straightness check the original ticket called unavailable
  is **one pass over `Easting`/`Northing`**, catching the single modelling error the format
  permits (a bent polyline, where `Distance` follows the bend while the line is the chord).
  Amended CONTEXT.md's `Terrain` entry and added Trace / Station / Anchor Placement.

- [Results panel — safety verdict and provenance warnings](./issues/08-results-panel-and-provenance-warnings.md)
  — the ticket's own name is wrong and the spec drops it: **there is no results panel**. Ticket 07's
  spine has four regions, the prototype's rail was already squatting on these aggregates, and a
  right-hand column would steal the width tickets 02 and 07 bought the layout for — so the **rail
  becomes one scrolling column with an input half and an output half**
  (`Paramètres → Valeurs déduites → Résultats → Provenance → Ce que cet outil ne calcule pas`),
  which forced ticket 04's two competing read-out lists into one, split on **whether the rider is
  involved**. Thirteen reported values, four headline, **no accordion** — `flèche/portée` is a
  *validity* read-out, not a nicety. The session's load-bearing finding is that the disclosure
  question and the numbers question have the **same answer five times over**: every place the
  provenance mechanism had to stretch, the honest presentation was a *distinct state*, not a note on
  an existing one — hence **five verdict states**, each mapping to a different user action
  (`Dans les limites` · `Marge faible` at `FS_eff < 1,1·k` · `Hors limites` ·
  **`Refusé — usage interdit`** · **`Indéterminé`**). `Refusé` exists because §10.2's grips
  prohibition **survives an ample margin** — `FS effectif 8,0` against `k = 3` and still refused, so
  it is neither a limits failure nor a warning above a pass; `Indéterminé` **suppresses** the verdict
  rather than degrading it, because the steps that fail to converge are the ill-conditioned ones and
  a verdict on the solved 87 % is biased optimistic *by construction*. Found a hole no ticket owned:
  **ticket 04's field table had no DAF field**, yet the verdict must judge an amplified envelope —
  so `Coefficient dynamique` joins the Passager group at **1,2 `[FIELD:SSF]`** and the verdict judges
  `T_vide + DAF·(T_chargé − T_vide)` per step, which is exactly §8.2 and needs nothing from §8.3's
  paywalled combination; it deliberately does **not** touch clearance. A regime is a **rule set**, not
  a `k` — WorkSafe's two criteria bite on different quantities and *which one binds* is information —
  with the 2× proof test as an **uncomputable obligation**, the ACCT 5:1/10:1 conflict as **two
  adjacent picker entries** (one entry with a toggle would imply somebody knows which is right), and
  **no free `k` anywhere** since §10 is not tunable and a typed `k` is blending with extra steps.
  Margin reads as **`FS effectif` against the required `k`**, never percentage utilisation — that
  recruits the "80 % is fine" heuristic into a tool sized on paywalled constants. Provenance keeps
  **two idioms and two chip levels** (the chip covers exactly the three tags the binding rule groups;
  §0.2's seven live in the popover), gains a **fourth case** in DAF — well-attested *and* editable,
  so no chip — and a **three-tier warning ladder** whose ambient tier is ticket 05's out-of-band `k`,
  fired always and therefore never an alarm. The aggregate list **pins the regime first**: three of
  five regimes are unconfirmed, and a regime is not one input among six, it multiplies into every
  margin. Terrain quality is disclosed in **manual mode too** (« ligne droite entre les pieds
  d'ancrage ») — ticket 06's own argument that a missing warning is ambiguous makes a missing block
  ambiguous. And sub-question 7 is solved **in the grammar**: the verdict never says
  « conforme »/« non conforme » and always names the chosen regime inside the sentence, so the claim
  is about the rule the user picked rather than about the law — with a standing
  « Ce que cet outil ne calcule pas » block whose popover carries [R1]'s unapplied load-combination
  formula, because printed on the surface someone applies those γ-factors by hand and believes the
  result. **Amended ticket 04** twice (the DAF field; the Valeurs déduites split).

## Not yet specified

Fog: in scope, heading toward the destination, not yet sharp enough to ticket.

*Empty.* The last patch — responsive and narrow-screen layout — graduated into
[Responsive and narrow-screen layout for the profile view](./issues/15-responsive-and-narrow-screen-layout.md)
once [Profile visualisation prototype](./issues/07-profile-visualisation-prototype.md) fixed
the spine there was something to reflow.

The GPX→CSV pivot added no fog: it *removed* questions (resampling, smoothing, chord
projection, partial elevation) rather than opening new ones, and the single question it did
raise was sharp enough to ticket immediately —
[Profile CSV export — can it exceed 200 points?](./issues/16-profile-export-point-count.md).

[Results panel](./issues/08-results-panel-and-provenance-warnings.md) added no fog either, and
opened no new ticket: everything it surfaced landed as an obligation on a ticket that already
exists (four of them) or as an amendment to
[Span and rigging parameter model](./issues/04-span-and-rigging-parameter-model.md). It also
*closed* two of [Validation and error-state UX](./issues/11-validation-and-error-state-ux.md)'s
own sub-questions outright — the `coverage` threshold (there is none) and whether a fix-action is
a general affordance (three instances now, so yes).

## Out of scope

Ruled beyond this destination. These never graduate; they would need the destination
redrawn as a fresh effort.

- **GPX import.** Ruled out while resolving
  [CSV profile import and anchor placement](./issues/06-csv-profile-import-and-anchor-placement.md):
  v1 imports profile CSV instead, so GPX is deferred past this destination rather than
  unspecified. It would need the destination redrawn as a fresh effort — at which point
  [GPX parsing in the browser](./issues/01-gpx-parsing-in-the-browser.md), now superseded, is
  the reference to start from. Note the two formats differ in kind, not just syntax: a GPX
  track is *recorded* (noisy, irregularly spaced, curved, elevation optional per point) where a
  profile CSV is *drawn and DEM-sampled* (straight, monotonic, elevation always present) — so a
  GPX path would resurrect the resampling, smoothing and chord-projection questions this ticket
  got to delete, not merely add a second parser.
- **Intermediate supports / multi-span lines.** v1 is one span, anchor to anchor.
- **Multiple simultaneous riders.** The §6.1 solver handles `n` point loads; the UI
  exposes exactly one rider.
- **Wind, lateral blow-out, 3-D.** Already out of v1 per `docs/simulation-theory.md` §8.4
  — the model stays 2-D in the vertical plane. Confirmed here.
- **Curved or winding GPX tracks, and any map view.** Straight-line tracks only; no
  projection of a winding track onto a chord, no plan-view map.
- **Rider dynamics, speed and braking** (§12). Follows from the position-only slider
  decision. Rules out drag, trolley friction, eddy brakes and terminal velocity.
- **Thermal change of state, creep, DAF and load combinations** (§8, §9). The engine
  parameterises on `L₀`, so these can be added later as `ΔL₀` without redesign — but not
  in this effort.
- **Product identity fields — rope/cable désignation, model name, manufacturer.** Ruled out
  while resolving [Material spec model](./issues/05-material-spec-model.md): purely
  decorative, no consumer in the v1 physics, and every such field still costs surface in
  ticket 09's URL schema and ticket 14's defaults. Consistent with the map's zero-product-
  presets decision — the app describes a rope by its numbers, not its name.
- **Resolving the §16 gap register.** Buying paywalled standards, contacting SSF for the
  Vercors dataset, re-pulling product datasheets. The provenance rule above is how v1
  copes with the gaps instead.
