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

- [Sweep performance measurement and the Web Worker decision](./issues/12-sweep-performance-and-worker-decision.md)
  — **no Web Worker**, on a ≈6× margin: worst-conditioned p95 of `sweep()` + `evaluateClearance`
  is 1,30 ms at 240 steps against ticket 03's pre-agreed 8 ms, and 2,30 ms at 500. `SWEEP_STEPS
  = 240` is now confirmed by data rather than inherited — it costs the same as 100 within
  Chromium's 0,1 ms clock clamp and buys 2,4× the resolution. The ticket stayed arithmetic
  because the criterion was fixed before the numbers existed. Three things it explicitly does
  **not** license: the **`useSweep` seam stays** (ticket 03 justified it on
  stale-while-recomputing, independently of the worker — "no worker, therefore drop the async
  seam" is the obvious wrong inference); the **coarse-live/fine-on-release fallback stays
  unbuilt**, with its hazard recorded as a safety failure rather than a fidelity one (a coarse
  sweep can miss the worst clearance point and flash a green verdict); and neither `steps` nor
  `samplesPerStep` should be raised, since the **clearance reducer is the larger half of the
  budget** and scales with their product, while ticket 06 already measured the fidelity on offer
  at ≈ 5 mm. Also settles the worker question from a second direction: dragging is **vsync-bound**
  (frame p50 16,70 ms against a 16,7 ms interval), so off-threading would not have made it
  smoother anyway. Re-validated against ticket 08's later DAF decision — `T_vide` is one solve,
  not a per-step one — so the 2026-08-05 measurement stands.

- [Profile CSV export — can it exceed 200 points?](./issues/16-profile-export-point-count.md)
  — **no: 200 is the ceiling**, operator-attested (not documentation-verified, and recorded as
  such) and corroborated by ticket 06's two traces of different lengths both landing on exactly
  200 rows. So the warning this ticket existed to word **cannot be actionable**: it states a
  structural limit and must say the cap is *per export, not per line*, or an operator re-exports
  hoping for a denser file. Since spacing is `length/199`, the ~5 m threshold is crossed at
  ≈ 1000 m and everything above is stuck — coarse terrain is the **normal** state on the upper
  half of the 50–2000 m range, a new fact for ticket 08's warning tiers that is flagged to
  ticket 11 rather than resolved here (it fires often but conditionally, and names a real
  blind spot, so ⚠ over ambient is arguable either way).
  The one remedy left interlocks two earlier decisions: ticket 06's columns-by-name contract
  makes a hand-authored two-column CSV a first-class input, and such a file has no
  `Easting`/`Northing` — so **the denser-terrain remedy *is* ticket 08's « rectitude non
  vérifiable » state**, and the operator trades clearance fidelity against the straightness
  check. Left deliberately unchased: the DEM's own resolution, which would sharpen the copy's
  *explanation* but changes no behaviour, because ticket 06 designed the app never to need to
  know what the source could have provided.

- [URL state schema and persistence](./issues/09-url-state-schema-and-persistence.md)
  — one principle answers the ticket: **the URL is a typing boundary, not a validation boundary**,
  so a link restores state *faithfully, including invalid state* — `L = −5` lights up ticket 04's
  existing form validation, and `reg=secours10&fam=ac` arrives already invalid and raises ticket
  08 §5's blocking error exactly as clicking into it would. Re-checking ranges at the URL would
  make three tiers with one rule living in two, and silently repairing a link yields a scenario
  **neither party ever saw** — in the one field ticket 08 pins first. The same rule runs the write
  side (`replace` always) and the refusal path: **applied whole or refused whole**, keys dropped
  only when the remainder still describes a complete line. Schema is **readable flat keys**, ~200
  chars, because a URL you cannot read is a URL you cannot check — with two structural tricks: the
  tightness driver is encoded by *which key is present* (`fl`/`te`/`lo`), since three value keys
  could carry contradictory tightness, and the terrain source is *inferred* from `tr`, extending
  ticket 05's "active family only" into a general rule — **the URL carries the active
  configuration, never a retained alternate**. Forces serialise in **daN always**, so ticket 04's
  «a display control must be provably physics-neutral» keeps holding where a URL is hand-edited
  (`u=daN`→`u=kN` must not make a line 100× tighter). Precision refuses its own trade: the URL
  carries only inputs, inputs are typed at field precision, so **a prefill writes the *displayed*
  value into state, never the float** — 201,84 enters, 201,8412773 never does, serialisation is
  verbatim, and per-quantity display precision becomes load-bearing state nobody owned (→ ticket
  10). `stripSearchParams` rejected: absence already means « — choisir — » and *not overridden*,
  and a fourth meaning would make it unreadable in the field that matters most — plus `mp=120` is
  an Unconfirmed Default, so a link must record what the sender actually computed with. The trace
  is **embedded**, because ticket 06 makes `L`/`h` derived so a link without terrain describes
  **no span at all**: format `p1.<base64url>`, delta + zigzag varint, cm, **altitude quantised by
  ceiling** so the one lossy step is provably safe-side, straightness carried as a scalar instead
  of `Easting`/`Northing`, and no resampling (ticket 06 killed it, and shrinking by resampling
  would smuggle it back in). Hand-rolled and **synchronous — because `validateSearch` is**, which
  rules out `DecompressionStream` outright and keeps terrain off an async boundary ticket 03
  fought to avoid. Oversize **refuses at « Copier le lien »** rather than degrading; the filename
  does not travel («tracé reçu par lien»). Two findings outliving the ticket: the default
  `parseSearch` JSON-parses every value, so an all-digit base64 payload **silently loses
  precision** — hence the `p1.` sentinel; and **no verdict state covers "no regime chosen"** —
  ticket 04 gave the field no default, ticket 08's five states all presuppose one, and it is not
  `Indéterminé` (nothing was attempted), so the banner is *absent* and replaced by a prompt
  (→ tickets 11 and 14). Back is **not** undo — history would restore search params but not the
  retained specs, landing the user somewhere subtly different. Amended ticket 05 (`EA`-in-MN is a
  *declared* carve-out) and CONTEXT.md (**Scenario** vs **Session**).

- [Validation and error-state UX](./issues/11-validation-and-error-state-ux.md)
  — the app's whole error vocabulary, and **two of the ticket's own eight items were misfiled**:
  `slack-limit` and "far too slack" are not refusals — deep slack *converges* (L₀ 400 m on a 200 m
  span ⇒ garde −169,67 m, `contact: "cable"`), so a line lying down is ticket 07's « Câble au sol »
  verdict — while item 8's sub-floor `L₀` is not a safety verdict but the hardest refusal in the app,
  because **the §5.4 chord bound *is* the breaking load** (floor L₀ 197,404 m on 200 m ⇒ T_max
  100,0 % MBF; 987,02 m on 1000 m ⇒ 101,1 %). That one measurement kills ticket 04 §7's line 264
  (`H_target ≥ MBF` "solves perfectly and the verdict says rupture" — no such verdict is reachable)
  and line 261 (violable in all three modes, not just direct-`L₀`), and turns
  `invalid-input{field:"L0"}` into **« Tension impossible »**, which carries its attainable bound and
  no fix button, since the bound *is* a rupture design and no unambiguous repair exists. Structural
  finding: the inherited three-gate table named **no rider field at all**, so `m_p` joins the Solve
  Gate (it is the single `PointLoad`'s magnitude), `h_rider` the Clearance Gate, `DAF` the Verdict
  Gate — three different gates for three fields of one group, which is itself the evidence the split
  was right. Consequently the blocking banner names **the worst gate breached** (« aucun résultat » /
  « garde au sol indisponible » / « aucun verdict »), because a bad DAF beside a printed `Garde min`
  makes the elected single copy contradict the screen. Every state is enumerated in French: two
  per-field messages (neutral « valeur requise » vs ⛔ on a fixed template) plus « nombre illisible »,
  a state `inputMode=decimal` *creates* where `type=number` silently emptied the field; the seven
  import failures inline under the file control, file-name prefixed, **leaving the current terrain
  untouched**; the culprit table keyed by (quantity × mode) with ticket 05's rows derived from §13.1's
  formulas — `MBF` from (d, R₀, construction) but `EA` and `μ` from **`d` alone** — and the rule that
  an overridden derived value is its own culprit. Verified `sweepGrid(L0, 240).length === 260`, so
  ticket 08's « 209 des 240 pas » becomes **260**, and `Indéterminé` punches **gaps in the scrub
  track** where « — » is the only legal glyph. Rejections that matter: no residual on screen and **no
  `SolveNote` ever surfaces** (349 440 instrumented solves — `reseeded` 0, near-taut 0), no dev panel,
  no dashes for absent values, no « ouvrir malgré tout », no persisted strip dismissal, and no second
  equivalent beside a quoted bound. Four invariants carry into the spec as its error contract: no hard
  check renders only on a read-out · no message asserts an act · no verdict stands on numbers it was
  not computed from · one banner occupant. Amended tickets 03 (payload bound, plus `resolveL0`
  re-reporting the bound in the driving quantity), 04 (gates, two struck claims, `x_D` row), 05
  (badge derived on load, compared at *display precision* or it fires every time) and 08 (260, gaps,
  ⚠ confirmed with its frequency labelled arithmetic, not observed).

- [App shell and routing shape](./issues/13-app-shell-and-routing-shape.md)
  — the most measurement-dense ticket on the map, and the measurements *are* the answer: a
  scratch dev server on :3111 plus the installed router source contradict the documentation five
  times, and one contradiction silently destroys ticket 11's ignored-keys banner. **Exactly one
  route** (`/`), because the router validates search params *per route* and a second one would
  re-declare the same ~30-key `validateSearch` — the one place this app cannot afford drift;
  **no print route and no print stylesheet** (→ Out of scope), refused on ticket 08's grammar
  rather than on effort, since a printed « Indéterminé » is a document that outlives its
  context. **`ssr: false` on the index route only**, `__root`'s `shellComponent` still
  server-rendered: measured, `defaultSsr` in `src/router.tsx` is a **silent no-op**
  (`createStartHandler` spreads an `undefined` from a `src/start.ts` that does not exist), and a
  thrown `validateSearch` renders the refusal at **500** under SSR against **200** without it.
  Full SSR was rejected on provenance, not cost — for a bare `/` the server would paint ticket
  14's defaults and the Session read would replace them a tick later, a flash of somebody else's
  numbers. So the server renders exactly one thing below the document, now named the
  **Skeleton**: five section headings, two chart frames at ticket 15's aspect, labels without
  values, the banner band's *height* reserved but nothing drawn in it — measured, with no
  `pendingComponent` the body ships **empty**, so the choice was Skeleton or blank page.
  Rewrite-on-load is a **client mount effect building a plain object**, and it corrects ticket
  09 §4 outright: unknown keys **never** vanish on their own under the default `search.strict`,
  so the rewrite is the *only* thing that cleans the address bar — and it works because a
  plain-object `search` replaces the whole bag. Hard rules on the validator: **omit, never
  `undefined`** (`{key: undefined}` makes the *server* 307 the key away before any client code
  runs, even under `ssr: false`), never coerce, and stay pure and cheap because it runs **3× per
  request** inside a swallowing `catch {}`; `p1.` payloads are validated **structurally only**
  and returned verbatim, the real decode being a memoised client derivation (2,3–2,5 µs). The
  dropped-keys report has exactly **one** transport — client-side, from the raw query string,
  before the rewrite — since every server-side alternative either stringifies into the URL,
  leaks across requests, or destroys the evidence. The Session is read **synchronously in a lazy
  initialiser** (measured: never runs on the server inside `ClientOnly`), so ticket 09 §7's
  "frame before it lands" does not exist. `__root` carries the **document only** — `lang="fr"`,
  French title and `notFoundComponent`, ticket 15's viewport meta — and it *can*, because §0.5
  gave the ten homeless controls three homes. The refusal page is the **index** route's
  `errorComponent` (on the root it would replace the shell, leaving no way back), at 200 after a
  Skeleton frame; an unknown path **404s** rather than redirecting to `/`, which would turn a
  truncated link into somebody else's scenario. URL is write-only after the load-time seed;
  offline is declared as **no runtime network dependency after load, no service worker, no PWA
  manifest**; and `docs/conventions/routing.md` — which asserted plain SSR — is amended.

- [First-run scenario and default values](./issues/14-first-run-scenario-and-defaults.md)
  — the scenario turned out not to be a taste question: on manual terrain (ticket 04 §1's plane)
  clearance reduces to `lerp(hauteurs) − flèche chargée − enveloppe`, so **dénivelé buys no
  clearance at all** — measured garde 2,46 / 2,44 / 2,37 / 2,25 m across `h` 0 / −18 / −40 / −60 —
  while flèche moves it metre for metre (3,39 / 2,44 / 1,44 / 0,40 m for 5 / 6 / 7 / 8 m). Ships
  **150,0 m · −18,0 m · hauteurs 12,0 / 12,0 m · flèche à vide cible 6,0 m** ⇒ L₀ 151,644 m ·
  H 253,5 daN · T max statique 817,1 daN · enveloppe DAF 927,9 daN · **garde min 2,44 m à x 74,1** ·
  couverture 260/260 · FS effectif 8,80 (A) / 9,06 (B), every figure measured on ticket 07's
  §15-verified solver. The 12 m platforms at *both* ends are **forced by arithmetic, not taste**, and
  the objection is recorded in the ticket: every intuitively realistic pair (A 12 m, B 6 m) opens in
  **« Câble au sol »** — −1,04 m at 150/−18, −1,53 m at 200/−25 — which the ticket forbade outright.
  **Flèche ships as the active tightness segment** because it is the only mode whose value is exact
  at display precision: ticket 09 §3 writes the *displayed* value into state, and a direct-`L₀`
  default at one decimal costs 0,21 m of flèche and 0,20 m of garde, **8 % of the shipped margin** —
  which also promotes ticket 09's "mechanical" precision table into a measured sensitivity decision
  (`L₀` needs 2 decimals). The shipped line is **allowed to read « Hors limites » under ACCT 10:1**
  (8,80 against k = 10): the app opens verdict-less so nothing fails on first contact, up-sizing to
  14 mm does not even fix it (10,79, still « Marge faible »), and choosing hardware so a
  `[CONVENTION]` passes would turn the shipped Material Spec into an implicit safety
  recommendation — the spread from « dans les limites » at k = 3 is the teaching. **No worked example
  and no bundled trace**: an SSF-Vercors-shaped line opens at garde −62,8 m on straight ground and
  its verdict flips on invented numbers (MBL 100 kN ⇒ 11,94 « dans les limites », 60 kN ⇒ 7,63
  « hors limites »), while all three repo traces show the *uninteresting* clearance case (6,83 /
  9,90 / 8,80 m). Coined **« Résultats sans régime »** — four k-dependent rows *plus* the criteria ×
  ends grid **absent, not dashed**, because ticket 08 spent « — » on `Indéterminé` and a lone
  `FS effectif 8,80` invites the reader to supply their own k — and gave
  **« Saisie en cours »** its firing rule: **focus-scoped**, so a blurred or never-filled required
  field is « Aucun résultat » with no stale picture, the chart freezes rather than dims, and
  scrubbing goes inert because a stale Sweep must not be used to *generate* new stale numbers.
  « Réinitialiser le scénario » **removes the Trace as terrain source and keeps it cached** (else
  Portée would read the trace's 183,4 m after a reset) — which forced a re-add path, or the cache is
  dead weight. Partial recognised links are **completed literally**, and the measurement settles it:
  `?L=250&h=-40` with `fl=6.0` lands clear at garde 1,25 m with an honest 2,40 % ⚠, while the
  "smart" 4 %-of-span completion lands at −2,39 m, on the ground. Frozen as a Vitest fixture that
  asserts the **formatted strings**, since 1e-3 relative on `L₀` would let the opening screen drift
  6 % of its margin and stay green.

- [Responsive and narrow-screen layout for the profile view](./issues/15-responsive-and-narrow-screen-layout.md)
  — settled by measuring the prototype's own layout code rather than reasoning about phones, and the
  load-bearing finding is one line of arithmetic nobody in tickets 02, 06 or 07 had written down:
  **VE = plot aspect × (x-domain span / z-domain span)**, so vertical exaggeration never depended on
  pixel size at all — only on the plot's H/W and the scenario's flatness. That single identity
  retires the ticket and convicts the artifact twice. `flex-[3]`/`flex-1` makes VE a function of
  *window height*, so the **desktop was already out of budget** — 1440×900 gives the profile H/W
  0,4978 and VE **×5,02** against ticket 07's verified ×4,7 — while a wide-short box (844×330
  landscape, H/W 0,16) yields **×0,54…×1,61 with four of seven scenarios vertically compressed**:
  auto-fit was **unbounded in both directions** and tickets 02/07 had only ever measured one box,
  900×420. A third finding falls out for free: ticket 07's published ×1,2…×4,7 is itself ~10 % low,
  because ticket 06 §6 widened the shared x domain to span + 5 % *after* it was measured. So the
  profile's height is set by **its own width** (target aspect **0,42** — the exact value that keeps
  the flattest scenario inside ×4,7 on ticket 06's domain — with a **Plot Aspect Band [0.35, 0.50]**
  as a guard whose ceiling is what ticket 10 must publish, ×5,5), the strip gets its own
  width-derived band [72, 200], and **VE is floored at ×1 and never compresses**, disclosed as its
  own badge state with the peek control disabled because it is already in force. Compressing the sag
  in a clearance tool is the same error class as exaggerating it and worse, because *it reads safe*.
  The other measured defect is ticket 06 §6's own pixel-alignment constraint, violated in the only
  artifact that ever demonstrated it: profile pad {left 16, right 16} against strip {left 24,
  right 24}, so the two x axes **coincide only at mid-span and diverge to 8 px at each end — 34 m at
  a 1500 m span**, precisely at the anchors, which is where this ticket puts two drag handles. Fixed
  by **one shared x scale object with one `GUTTER = 24`** owning the pointer inverse too (the
  prototype's hand-typed inverse assumes `domain[0] === 0` and is off by 0,05 L = 75 m under the real
  domain). Layout: **two breakpoints stated as what fails** — B1 « the read-out row can no longer fit
  five values » at 600 px of *container* (the value, not the label, binds: ≈605 px for five cells) and
  B2 « the rail and an aspect-legal profile cannot coexist » at 768 px of viewport — because the rail
  is `w-72` = **288 px, not 280**, which leaves the chart column 101 px and the plot **69 px** of x
  range at 390 px, and everything else is downstream of that one number. At narrow the rail becomes an
  in-flow region (CSS only, no `useMediaQuery`, no bottom sheet — Base UI 1.6.0 *does* ship a Drawer,
  so it was declined on **occlusion**, not availability) and the **Chart Block collapses to a pinned
  safety header** driven by scroll, focus, or by not fitting — which is also what makes landscape
  always open collapsed, so portrait needs no rotate prompt and gets none. Budgets sum to the
  viewport at 390×664, 768×1024 and 1440×900, with the letterbox margin left deliberately empty.

- [Assemble the v1 build spec](./issues/10-assemble-the-v1-build-spec.md)
  — **the destination artifact exists**: [`spec.md`](./spec.md), 6 317 lines, thirteen sections,
  every « voir § » cross-reference wired to a real number. All nine brief items and all **six**
  `Inherited from …` blocks discharged (the brief counted five; ticket 15's is the sixth), and the
  three parked obligations closed rather than carried: the display-precision table is **tabulated
  and turned out to be a measured sensitivity decision, not the mechanical derivation ticket 09
  expected** (`L₀` at 2 decimals, with three consumers, two of which are not readers); the `p1`
  payload is **measured, not estimated** — 910 / 859 / 897 chars on the three real traces,
  1065–1071 synthetic at 1000–2000 m, against 2000, so the embed decision stands and both size
  estimates become in-build re-checks; and ticket 05's `EA`-in-MN is **declared as a carve-out with
  its reason** rather than reproduced as an inconsistency. Assembly was not transcription — it
  settled three things no ticket owned: the WorkSafe suspended-load criterion is **one cell, not
  per end**, numerator `min(η_A, η_B)·MBF` (bare `MBF` would make it the only place in the app
  crediting an unterminated rope, and yields 77 — a criterion that can never bind), **`pente
  locale` is percent / 1 decimal / downhill negative**, and **`latest` on five TanStack packages is
  a real hazard, not a default** — six of §8's decisions are workarounds for measured behaviour
  contradicting the docs, so an upgrade silently converts a correct workaround into dead code or
  breaks the ignored-keys banner where **no test can see it**; pinning to the measured tree becomes
  stage **A0**, ahead of everything in the app phase. Five ADRs written, six candidates tested
  against the `/domain-modeling` bar and rejected with reasons. §10 is a **28-stage gated order**
  (P0 · E1–E11 · A0–A12 · P3) where the fixture is written first and the prototype's deletion is
  sequenced behind three re-checks, never a code lift — §13 carries the four resolving agents'
  thin spots so they read as *seen*. Two corrections to this map's own text came out of it: the
  Out-of-scope DAF entry (fixed above) and the frontier note below.

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

[URL state schema and persistence](./issues/09-url-state-schema-and-persistence.md) added no fog
and opened no ticket either: everything it surfaced landed as an obligation on tickets 10, 11, 13
and 14, or as an amendment to
[Material spec model](./issues/05-material-spec-model.md). The one thing it found that nobody
owned — a per-quantity display precision table — is tabulation rather than a decision, so it went
to [Assemble the v1 build spec](./issues/10-assemble-the-v1-build-spec.md) rather than becoming a
seventeenth ticket.

**The final four — 11, 13, 14 and 15 — added no fog and opened no ticket**, which is what it looks
like when a map runs out. Everything they surfaced landed as an obligation on
[Assemble the v1 build spec](./issues/10-assemble-the-v1-build-spec.md), as an amendment to a
resolved ticket (03's error payload · 04's gates, its two struck §7 claims and three new rows · 05's
override badge and its termination-provenance contradiction · 06's shared x scale and handle lane ·
07's `x` field placement, its peek control and its VE range · 08's coverage denominator, scope label
and warning tier · 09's rewrite mechanism, its multi-driver row and its "mechanical" precision
table · 12's guard rail), or as one scope ruling below.

**The map is complete as of 2026-08-12.** The frontier is empty and so is the ticket list: the
destination artifact — [`spec.md`](./spec.md) — exists, and its own fog sweep confirmed nothing was
left vague by accident (`pente locale`'s convention graduated into a decision in §5; two
implementation-level choices with no owner are recorded in §11 as *deferred with their binding
constraint*, not left open). What remains is execution, which this map deliberately does not carry.

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
- **Thermal change of state, creep, and normative load combinations** (§9, §8.3). The engine
  parameterises on `L₀`, so these can be added later as `ΔL₀` without redesign — but not
  in this effort.

  **Corrected 2026-08-12** while assembling
  [the v1 build spec](./issues/10-assemble-the-v1-build-spec.md), which found this entry
  contradicting the map's own decisions: it originally read « Thermal change of state, creep,
  **DAF** and load combinations (§8, §9) », yet
  [Results panel](./issues/08-results-panel-and-provenance-warnings.md) §4 put a
  `Coefficient dynamique` field in scope at **1,2 `[FIELD:SSF]`** and made the Verdict judge the
  amplified envelope `T_vide + DAF·(T_chargé − T_vide)`. The line is drawn **inside §8**, not
  around it: **§8.2's single measured multiplier is in scope**; **§8.3's γ-factor load
  combination is out** and stays unapplied-but-disclosed, with its formula in a popover
  (ticket 08 §10). §9 is out entirely. Nothing about the entry's *intent* changed — DAF was
  listed here before any ticket owned it — but left as written it reads as excluding the one
  coefficient the Verdict divides by.
- **Product identity fields — rope/cable désignation, model name, manufacturer.** Ruled out
  while resolving [Material spec model](./issues/05-material-spec-model.md): purely
  decorative, no consumer in the v1 physics, and every such field still costs surface in
  ticket 09's URL schema and ticket 14's defaults. Consistent with the map's zero-product-
  presets decision — the app describes a rope by its numbers, not its name.
- **A print or report view, and any print stylesheet.** Ruled out while resolving
  [App shell and routing shape](./issues/13-app-shell-and-routing-shape.md) §1, which had raised a
  printable-report route as its own sub-question. Refused on
  [ticket 08](./08-results-panel-and-provenance-warnings.md)'s verdict grammar rather than on
  effort: that ticket spent five verdict states, a « Ce que cet outil ne calcule pas » block and a
  rule against ever saying « conforme » to stop the app implying a compliance certificate, and a
  print target hands all of it back — a printed page is precisely what gets read as an attestation,
  and a printed « Indéterminé », or a printed « Choisissez un régime » where a verdict should be, is
  a document that **outlives its context**. Note what is *not* ruled out: ticket 02 §5's client-side
  SVG export of the chart already in the page, which needs no route and carries no verdict. A real
  hand-over sheet would need the destination redrawn, and its first question is what a refused or
  verdict-less state is allowed to print.
- **A service worker, a PWA manifest, or any installable packaging.** Ruled out while resolving
  [App shell and routing shape](./issues/13-app-shell-and-routing-shape.md), which had to pin down
  what this map's "genuinely offline" actually obliges. It is a **data** claim — no network call for
  terrain or coefficients, no runtime network dependency after load — and not a packaging one. Left
  undeclared it reads as installable-PWA, which adds a caching layer that can serve a **stale build
  of a safety tool**: the one failure mode a provenance-obsessed app must not acquire by accident.
- **Resolving the §16 gap register.** Buying paywalled standards, contacting SSF for the
  Vercors dataset, re-pulling product datasheets. The provenance rule above is how v1
  copes with the gaps instead.
