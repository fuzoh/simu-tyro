# Zip-line simulator v1 — wayfinder map

Label: `wayfinder:map`
Effort slug: `zipline-simulator-v1`
Tickets: `.scratch/zipline-simulator-v1/issues/`

## Destination

A **build-ready spec** for Scoutech v1: a single-page, fully offline, French-language
zip-line simulator — parametric inputs on the left, live profile chart on the right, a
slider that moves the rider quasi-statically along the line, and GPX terrain import with
anchor placement on the imported profile. Physics scope is core statics plus safety
verdict, exactly as fixed in `docs/simulation-theory.md` §4–§7, §10, §11.

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
| Persistence          | URL search params for shareable state + localStorage for the last session. GPX stays local.                                                                                                                                                                                              |
| Families             | Both — steel wire rope (A) and textile rope (B), gated by the §10.4 use-class rule (`PERMANENT` ⇒ steel only, hard validation). Separate code paths.                                                                                                                                     |
| Terrain baseline     | Flat ground at anchor-base level before any GPX. Terrain is one concept with two sources.                                                                                                                                                                                                |
| GPX elevation        | Required. A file without `<ele>` is rejected with an error. No network calls — the app is genuinely offline.                                                                                                                                                                             |
| UI language          | French UI, English code identifiers and comments (§1 vocabulary). No i18n framework; strings inline.                                                                                                                                                                                     |
| Material data        | Formula-derived with raw override. Steel: MBF/EA/mass from diameter, grade and construction via the EN 12385-4 K-factors (§13.1). Textile: `EA = k·MBL` with user-supplied `MBL` and `k` (§13.2). **Zero shipped product presets** — every product row in the references is compromised. |

## Decisions so far

<!-- one line per resolved ticket: gist + link -->

- [GPX parsing in the browser — library or DOMParser?](./issues/01-gpx-parsing-in-the-browser.md)
  — plain `DOMParser` plus a hand-written ~50-line mapper; no GPX library. `gpxparser` runs
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

## Not yet specified

Fog: in scope, heading toward the destination, not yet sharp enough to ticket.

*Empty.* The last patch — responsive and narrow-screen layout — graduated into
[Responsive and narrow-screen layout for the profile view](./issues/15-responsive-and-narrow-screen-layout.md)
once [Profile visualisation prototype](./issues/07-profile-visualisation-prototype.md) fixed
the spine there was something to reflow.

## Out of scope

Ruled beyond this destination. These never graduate; they would need the destination
redrawn as a fresh effort.

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
