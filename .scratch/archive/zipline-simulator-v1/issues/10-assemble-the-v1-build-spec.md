# Assemble the v1 build spec

Type: task
Status: resolved
Blocked by: — (all 15 decision tickets resolved 2026-08-12)
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

   **Amended 2026-08-12** by
   [Validation and error-state UX](./11-validation-and-error-state-ux.md) §1 and §12 and
   [App shell and routing shape](./13-app-shell-and-routing-shape.md) §8: this is no longer a
   two-ticket merge. The validation half is **three named gates** — Solve (`L`, `h`, the driving
   tightness field, family + Material Spec, §10.4 family×usage, `m_p`) / Clearance (hauteurs
   d'ancrage A/B, terrain, `h_rider`) / Verdict (régime, both terminations, `DAF`) — not ticket
   04 §7's single FORM tier, and « régime choisi » is **struck** from that tier because it never
   blocks a solve. The field table also gains rows no ticket owned: `x_D` (**Passager**,
   « Position du passager », m, hard `0 ≤ x ≤ L`, no warning, clamps on every path with a
   transient inline note, initial mid-span) and `Paramètres › Géométrie`'s « Importer un
   profil… » (a button, not a drop zone), « Retirer le tracé » and the file-identity line.

4. The terrain and CSV import pipeline from
   [CSV profile import and anchor placement](./06-csv-profile-import-and-anchor-placement.md).
   Note the terrain source changed mid-effort — **GPX is out of scope** and
   [ticket 01](./01-gpx-parsing-in-the-browser.md) is superseded, so the spec must describe the
   CSV path only and must not inherit anything from that research.
5. The visualisation spec, with the prototype linked as the reference artifact, from
   [Profile visualisation prototype](./07-profile-visualisation-prototype.md).

   **Amended 2026-08-12** by
   [App shell and routing shape](./13-app-shell-and-routing-shape.md) §12: **do not link the
   prototype path, and link none of its PNGs** — ticket 07 §12 schedules the route for deletion
   and the cited PNGs are not in the repo, so **ticket 07's prose is the reference artifact**.
   Deletion is sequenced, not performed now: see the inherited block below (item 5).

   **Amended 2026-08-12** by
   [Responsive and narrow-screen layout](./15-responsive-and-narrow-screen-layout.md) §1: ticket
   07's published vertical-exaggeration range **×1,2…×4,7 is superseded** — VE does not depend on
   pixel size, and ticket 07 measured one box shape only. Publish **×1 … ×5,5** with a **Plot
   Aspect Band [0.35, 0.50]** and a **×1 floor**; see the inherited block below (item 1).

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
of a genuine trade-off. The engine execution model and the terrain model are the two plausible
candidates — and for terrain the trade-off worth recording is *use the file's own samples and
disclose the spacing* over *resample to a uniform grid*, which is the kind of decision that looks
arbitrary later and gets "fixed" by someone who does not know it was deliberate.

Finally, sweep the map's **Not yet specified** section. Anything still fogged when
everything else has resolved either graduates into a ticket now or is recorded in the spec
as a decision deferred to implementation. Nothing stays vague by accident.

**Inherited from [Results panel](./08-results-panel-and-provenance-warnings.md)** — one naming
correction and three things to carry.

- **Drop the term "results panel".** There is no such region: ticket 07's spine has four, and the
  aggregates live in the rail's output half. The spec describes a rail with five sections.
- Carry the **criteria × ends verdict grid** — a regime is a rule set, `T adm` is per end because
  `η_t` is, and WorkSafe's suspended-load criterion is not per-end at all, so cells are legitimately
  empty — and the **five verdict states** with the user action each implies.

  **Resolved 2026-08-12**, main agent, on a contradiction raised at assembly time: ticket 14's
  WorkSafe denominator `η_t·MBF / [DAF·(T_chargé − T_vide)]` puts a **per-end `η_t`** in the
  numerator, which would make that criterion per-end after all and contradict « not per-end at all,
  so cells are legitimately empty ». Settled: **the suspended-load criterion is one cell, not per
  end, and its numerator is `min(η_A, η_B) · MBF`.**

  Three reasons, in order of weight. §10.1's row is `[REGULATOR]` quoted verbatim
  (`docs/simulation-theory.md:471`) and says only « `FS ≥ 5` on suspended load » — nothing per-end —
  so ticket 08's grid keeps its legitimately-empty cells and the criterion still yields **one**
  number. Dropping `η_t` to bare `MBF` was rejected: §7 credits `η_t·MBF/k` everywhere else, so bare
  `MBF` would make this the **only** place in the app that credits an unterminated rope, an
  optimistic outlier in the direction that kills. And `min()` rather than a per-end pair because a
  line fails at its **weakest** termination, so one criterion cannot honestly report two margins.
  Ticket 14's measured **12,29** on the shipped line is unchanged, since η_A = η_B = 0,90 there;
  the two diverge only on a mixed-termination line, which is exactly the case the `min` exists for.
  The spec states the numerator explicitly — an implementer reading « FS ≥ 5 sur charge suspendue »
  alone will write `MBF/P` and get **77**, a criterion that can never bind.
- Engine consequence: `T_DAF = T_vide + DAF·(T_chargé − T_vide)` needs `T_vide` alongside the loaded
  sweep. `solveSpan` already produces it, so this is a reporting requirement, not an engine change.
- Add to the trade-offs-worth-recording list: **the verdict grammar**. Never « conforme », always
  naming the chosen regime inside the sentence. It reads like a copy choice and is in fact the
  mechanism that stops the app implying a compliance certificate — exactly the kind of decision
  someone later "fixes" without knowing it was deliberate.

**Inherited from [URL state schema and persistence](./09-url-state-schema-and-persistence.md)** —
three assembly obligations, none of them a decision.

1. **A per-quantity display precision table.** Ticket 09 §3 fixed the rule — a prefill writes the
   *displayed* value into state, never the underlying float — which makes each field's display
   precision load-bearing state rather than cosmetics, and no ticket owned it. Mechanically
   derivable from ticket 04's and ticket 05's field tables (unit + hard range); tabulate it.

   **Amended 2026-08-12** by
   [Validation and error-state UX](./11-validation-and-error-state-ux.md) §8 and
   [First-run scenario and defaults](./14-first-run-scenario-and-defaults.md) §2: « mechanically
   derivable … nothing left to decide, only to tabulate » is **false**. It is a measured
   **sensitivity decision** with a minimum per quantity — `L₀` is the sharp case and carries **2
   decimals**: at the first-run line 1 decimal (151,6 against 151,644 m) shifts flèche by 0,21 m,
   `H` by 3,5 % and garde by 0,20 m, **8 % of the shipped margin**, where 2 decimals costs
   0,02 m. The table also has a *consumer*, not just readers: ticket 11 §8's stale-Override-badge
   comparison runs **at display precision**, so a missing row is not a formatting gap but a badge
   that fires on every load for every override. Add a **decimal-mark column** and the unit-switch
   identity invariant — « le changement d'unité n'écrit jamais dans l'état ; daN→X→daN est
   l'identité ».

2. **Verify the `p1` trace payload size against ticket 06's two real traces.** Ticket 09 §6
   estimated ≈1,1–1,3 KB of URL for a general 200-point trace and ≈0,8 KB when `d` is uniform,
   against a 2000-character budget. That is an estimate, explicitly not a settled number, and the
   whole embed decision rests on it.

   **Discharged 2026-08-12** — measured, no longer an estimate, and there are **three** real
   traces, not two. `p1` costs **910 / 859 / 897** URL characters on
   `example-profile-trace{1,2,3}.csv` and **1065–1071** on synthetic 200-point spans at 1000 /
   1500 / 2000 m, against the 2000-character budget; decode 2,3–2,5 µs, altitude error
   ≤ 0,010 m, distance exact. The embed decision stands.
   [First-run scenario and defaults](./14-first-run-scenario-and-defaults.md) also discharges
   ticket 09 §6's ≈200-char estimate for the readable keys: the first-run URL is **141 characters
   measured**. Keep both as a **re-check** in the real build, not as a risk.

3. **Carry ticket 05's `EA`-in-MN carve-out as *declared*.** Ticket 05 §8 rejected all carve-outs
   from the global force-unit selector while its own §2 table renders `EA` in MN; ticket 09 §2
   found it and it survives on comparability grounds. The spec must state it as a carve-out with
   its reason, not reproduce the inconsistency.

**Inherited from [Validation and error-state UX](./11-validation-and-error-state-ux.md)** — four
tables to carry, one contract to state, and one dependency nobody flagged.

- **Carry §0's four invariants verbatim as the spec's error contract.** No hard check ever renders
  only on a read-out · no error *message* asserts an act (button labels describe their effect) · no
  verdict ever stands on numbers it was not computed from · the banner slot holds exactly one
  occupant. Each one reads like a style rule and is in fact the mechanism that stops a specific
  failure, so each needs its reason beside it or it gets "simplified" later.
- **Carry four tables as written**: the three-gate table (§1, now including `m_p` / `h_rider` /
  `DAF`), the per-field tier-one message table (§2, 17 rows × two message columns), the culprit
  table keyed by (quantity × mode) (§7), and the seven import failures with their file-name prefix
  (§9). Also the three refusal states with their bounds and the `[ Copier le diagnostic ]` payload
  block (§6), and the banner precedence with its per-gate summaries (§3).
- **The coverage denominator is 260.** Verified: `sweepGrid(L0, 240).length === 260`
  (`src/routes/-prototype-07/solver.ts:235` — 240 uniform steps + 10 geometric tail steps per end,
  endpoints excluded). State `SWEEP_STEPS = 240 uniform + 10 tail steps per end ⇒ 260 pas`, correct
  ticket 08's « 240 / 240 » copy, and re-express ticket 12's guard rail on **260 × 60**.
- **The display-precision table has a consumer, not just readers.** The stale-Override-badge
  comparison of §8 runs *at display precision*, so a missing row there is not a formatting gap — it
  is a badge that fires on every load for every override. The table also needs the decimal-mark
  column (ELECTIONS §0.6) and the unit-switch identity invariant (§0.7).
- **Test-plan obligation**: `no-convergence`, `slack-limit` and `Indéterminé` are unreachable inside
  the admissible envelope (measured: 3 792 sweeps at coverage 1,000; 349 440 solves with `reseeded`
  0 and the §4.3 near-taut condition never met, min ratio 3,51e-4). They must be **injected** —
  forced iteration cap or stub — not hunted for with pathological inputs.
- Add to the trade-offs-worth-recording list: **« — » belongs to `Indéterminé` alone.** Ticket 08
  minted it for *attempted, unavailable*; ticket 14 §5 refused it for *nothing attempted*; ticket 11
  refuses it for *blocked*. Three tickets have now spent effort keeping one glyph unambiguous, and a
  later "consistency" pass that dashes empty cells would undo all three.

**Inherited from [App shell and routing shape](./13-app-shell-and-routing-shape.md)** —
five assembly obligations and one implementation trap, none of them a decision.

1. **Amend `docs/conventions/routing.md`.** It asserts plain SSR; ticket 13 §2 elects route-level
   `ssr: false`. Replacement text is in ticket 13's handoff — paste it whole, as ticket 03 did
   with `testing.md`.
2. **CONTEXT.md gains `Skeleton`** (§0.12's list, coined in ticket 13 §3).
3. **« No print route and no print stylesheet in v1 » goes into the map's Out of scope**, with
   ticket 08's anti-certificate grammar as the stated reason.
4. **Record the `useSearch` trap beside ticket 09 §1's key table.** `Route.useSearch()` returns
   raw ∪ validated at runtime (`router-core/dist/esm/router.js:870`, `:918`;
   `react-router/dist/esm/useSearch.js:22`) while its TypeScript type is validated-only. App code
   reads a single derived Scenario object built from the validated keys, never the raw bag. This
   is why ticket 09 §4's « clé ignorée » is an app-level guarantee the router does not enforce.
5. **Sequence the prototype deletion.** `src/routeTree.gen.ts:12` still carries
   `src/routes/prototype.profile-view.tsx` and `src/routes/-prototype-07/`, so a build today
   ships them publicly. Delete both **after** the bench harness and `check.ts`'s §15 fixtures are
   ported into Vitest, and do **not** lift `-prototype-07/solver.ts` into `src/lib/sim/`
   (ticket 07 §12 laid it out so it could not be mistaken for a head start).

Also carry the four `__root.tsx` scaffold corrections as spec obligations: `<html lang="fr">`,
the French `<title>`, the French `notFoundComponent`, and the viewport meta with
`interactive-widget=resizes-content` plus ticket 15's `visualViewport` fallback. The devtools
block stays unguarded — `devtools-vite/dist/esm/plugin.js:12` strips it at build.

**Inherited from [First-run scenario and defaults](./14-first-run-scenario-and-defaults.md)** —
the opening-screen record, three corrections that are not mechanical, and CONTEXT.md terms.

Carry the measured first-run tables (§2 and §6) as the spec's **opening-screen record**, including
the first-run URL at **141 characters measured** (which discharges ticket 09 §6's ≈200-char
estimate). Three corrections that are not mechanical: the per-quantity precision table needs
**`L₀` at 2 decimals** (1 decimal costs 0,21 m of flèche and 0,20 m of garde, 8 % of the shipped
margin); WorkSafe QLD's suspended-load denominator must be written as
`η_t·MBF / [DAF·(T_chargé − T_vide)]`, which gives **12,29** on the shipped line against 8,80 for
total tension, so **total tension governs**; and there are **three** example traces (183,4 / 224,0
/ 188,4 m), not two, as tickets 06, 09 and 14 all claim. Record `FIRST_RUN_SCENARIO`
(`src/lib/scenario/first-run.ts`) and its regression lock `first-run.test.ts`, which asserts
**formatted strings** rather than floats. CONTEXT.md gains **First-Run Scenario**, **Résultats sans
régime** and **Saisie en cours**, and its **Trace** entry must cover a Trace held in the Session
while not being the active terrain source.

**Inherited from
[Responsive and narrow-screen layout](./15-responsive-and-narrow-screen-layout.md)** —
one policy amendment and four things to tabulate. None of them is a decision.

1. **Amend tickets 02 and 07's vertical-exaggeration policy.** Ticket 15 §1 measured that
   `VE = plot aspect × (x-domain span / z-domain span)` — VE does not depend on pixel size at
   all. Tickets 02 and 07 fixed the policy at one box shape (900×420) and never measured another,
   so the published ×1,2…×4,7 is not a property of the app: the same seven scenarios reach ×45 at
   390 px with the rail in flow and ×0,54 in landscape, and the *desktop* was already at ×5,02.
   The policy now carries a **Plot Aspect Band [0.35, 0.50]** with a layout target of **0,42**,
   and a **×1 floor — auto-fit never compresses**. Publish the range as **×1 … ×5,5** (band
   ceiling, on ticket 06 §6's `1,1 L` domain); ticket 07's ×4,7 is also ~10 % low, because ticket
   06 widened the shared x domain *after* it was measured.
2. **Carry ticket 15 §1's seven-scenario `k` table** (x-domain span over z-domain span, both
   domain conventions) as the reference numbers behind the band, and §5's three rule/guard pairs.
3. **Carry the layout constants block** (§3) verbatim, with the invariant that follows from it:
   **no chart dimension may read the window height**. Every band height is a function of the chart
   column's inner width, which is also what makes ticket 13's Skeleton correct at 390 px for free.
4. **Carry the shared-x-scale contract** (§4): one `SharedX` object per (column inline size, `L`,
   terrain source), `GUTTER = 24` on both sides of both charts, and the pointer inverse as a
   method on that object — the prototype has two independently padded scales, an 8 px/end
   misalignment (34 m at 1500 m) and a hand-typed inverse that is wrong by 0,05 L under ticket 06
   §6's real domain.
5. **Re-check the three pixel budgets** (390×664, 768×1024, 1440×900) in the real build before the
   prototype is deleted. The banner heights (44/60/76 px) and the View Strip's label widths are
   computed from the prototype's Tailwind classes, not rendered — the only numbers in the budget
   that are not measured on the artifact.

## Answer

**Assembled and written: [`.scratch/zipline-simulator-v1/spec.md`](../spec.md)** — 6 297 lines,
~68 600 words, thirteen numbered sections, front matter with the standing rules and a table of
contents, every « voir § » cross-reference wired to a real number. It is the destination
artifact: `/implement` can be handed it without further conversation. No app code was written;
the only TypeScript in it is declarations and signatures that resolved tickets had already
fixed.

| § | Discharges |
| --- | --- |
| 1 Périmètre | item 1 — the map's Destination, its *Scope decisions fixed while charting*, and **all eleven** Out-of-scope rulings |
| 2 The engine contract | item 2 (ticket 03), amended by ticket 11 §1/§7 and ticket 12 |
| 3 The parameter model | item 3 (tickets 04 + 05) **as amended** — three gates not one FORM tier, `x_D` row, the three `Géométrie` controls, the display-precision table |
| 4 Terrain et import CSV | item 4 (tickets 06 + 16) — CSV only, nothing inherited from ticket 01 |
| 5 Visualisation and layout | item 5 (tickets 02 + 07 + 15) — ticket 07's **prose** as the reference artifact |
| 6 Sorties, verdict et provenance | item 6 (ticket 08) with its five amendments |
| 7 Le contrat de validation et d'erreur | ticket 11 in full |
| 8 État, URL et coquille applicative | item 7 (ticket 09) + ticket 13 |
| 9 Le premier lancement | ticket 14 — the opening-screen record |
| 10 Implementation order | item 8 — §17's order, the §15 fixtures as the TDD seed set, P3's sequenced deletion |
| 11 The test plan | item 9 — fixture→file→tolerance, plus the six-change diff to `docs/conventions/testing.md` |
| 12 Décisions à consigner | the ADR offer: **five** ADRs written (engine execution model · terrain samples · verdict grammar · charts/VE · URL as typing boundary) and **six** decisions tested against the `/domain-modeling` bar and rejected, each with its reason |
| 13 Known thin spots | the four resolving agents' `residualRisks`, carried so they read as seen |

**The six `Inherited from …` blocks are all discharged** (the assembly brief called them five;
ticket 15's block is the sixth). Results panel → the term is dropped everywhere, the criteria ×
ends grid and the five verdict states are carried, the suspended-load criterion is written as
**one cell** with numerator `min(η_A, η_B)·MBF` over `DAF·(T_chargé − T_vide)`, `T_vide` is
stated as a *reporting* requirement, and the verdict grammar became **ADR-0003**. URL state →
its three obligations are below. Validation → §0's four invariants are §7's error contract
verbatim, all four tables plus the three refusals, the `[ Copier le diagnostic ]` payload and
the banner precedence are carried, the **260** denominator is stated as `SWEEP_STEPS = 240
uniform + 10 tail steps per end ⇒ 260 pas` with ticket 08's « 240 / 240 » copy corrected and
ticket 12's guard rail re-expressed on **260 × 60**, and the injected-only test obligation is in
§11. App shell → `docs/conventions/routing.md` is recorded as amended and binding from A7, the
`useSearch` raw ∪ validated trap sits beside the key table, the print ruling is in §1, the four
`__root.tsx` corrections (`lang="fr"`, French title, French `notFoundComponent`,
`interactive-widget=resizes-content` + the `visualViewport` fallback) and the unguarded devtools
note are spec obligations, and the prototype deletion is **sequenced** in §10 P3 behind three
gates — with `-prototype-07/solver.ts` explicitly never lifted into `src/lib/sim/`. First run →
§9 carries the measured tables including the **141-character** first-run URL,
`FIRST_RUN_SCENARIO` in `src/lib/scenario/first-run.ts` and its formatted-string lock.
Responsive → the VE policy is amended to **×1 … ×5,5** with the Plot Aspect Band [0,35 ; 0,50]
and the ×1 floor, the seven-scenario `k` table, the layout constants with the *no chart
dimension may read the window height* invariant, the `SharedX` contract, and the three pixel
budgets as re-checks before deletion.

`CONTEXT.md` was **not** touched here — another agent owned it this round (§0.12's terms, the
widened `Trace` entry). `map.md` was not touched either.

### The three parked obligations

1. **The per-quantity display precision table — tabulated (§3), and it was a measured
   sensitivity decision rather than the mechanical derivation ticket 09 expected.** Every row
   states a *minimum* with its reason; `L₀` carries **2 decimals** because 1 decimal (151,6
   against 151,644 m) shifts flèche by 0,21 m, `H` by 3,5 % and garde by 0,20 m — **8 % of the
   shipped margin** — where 2 decimals cost 0,02 m. It gains the **decimal-mark column** and the
   unit-switch identity invariant (« le changement d'unité n'écrit jamais dans l'état ;
   daN→X→daN est l'identité »), and it is written with its **three consumers**, two of which are
   not readers: the prefill rule, the stale-Override badge comparison *at display precision*,
   and the first-run regression lock.
2. **The `p1` trace payload size — measured and discharged**, no longer an estimate: **910 / 859
   / 897** URL characters on `example-profile-trace{1,2,3}.csv`, **1065–1071** on synthetic
   200-point spans at 1000 / 1500 / 2000 m, against the 2000-character budget; decode
   2,3–2,5 µs, altitude error ≤ 0,010 m, distance exact. The readable keys' ≈200-character
   estimate is discharged too at **141 characters measured**. Both are kept as a **re-check** in
   the real build (§11), not as a risk.
3. **Ticket 05's `EA`-in-MN carve-out — declared, with its reason.** `EA` renders as « 6,90 MN »
   under every setting of the global force selector, because the strict-global rule's argument
   is *eyeball comparability* (437 daN read against 90,7 kN) and `EA` is never compared to a
   tension by eye — three orders of magnitude larger, consumed only inside ratios. In the URL,
   `ea` is daN like every other force. Stated as a carve-out in §3 and §8, not reproduced as an
   inconsistency.

### The consistency pass — what nine parallel agents left to reconcile

Fixed by editing the spec's prose: the total-tension `FS effectif` now reads `η_A · MBF /
T_DAF,A` (the `min(η)` form belongs to the suspended-load cell alone); the `fl`/`lo` pair is
gone from the ignored-keys strip copy, since two tightness drivers refuse the link whole;
« fifth meaning of absence » → **fourth**; `MIN_RAIL = 120` is no longer equated with the
measured 124 px of resting rail, and the title bar it rejects is `RAIL_HEADER`'s 44 px, not 48;
the shell section's « ~180 px of slack » becomes the measured **124 px**; B2's threshold is
restated on plot *width*, because ticket 15's aspect 0,91–1,25 / VE ×3,1…×12,6 were measured
under the **rejected** flex mechanism; the 69 px plot at 390 px is labelled as the prototype's
padding (53 px under the elected `GUTTER = 24`); the letterbox margin drops the unreproducible
« 0 px at 1280×800 » and keeps the two budgeted figures; the Skeleton labels the five real
read-out cells and states the elected `0,42 × W_inner` rule; `TerminationToken` lists `epissure`
once; the régime-dependent rows of the precision table are marked absent on the first screen;
and **`pente locale` is fixed at percent, 1 decimal, downhill negative** — ticket 14 flagged
that no ticket owned that cell's convention while its own inventory already quoted « −11,1 % ».
Four decisions that had been stated twice are now stated once with a pointer: the three-gate
table and the culprit table (§7), the rendered terrain provenance copy and the seven
parse-failure strings (§6 / §7), `x_D`'s clamp and the Override badge mechanism (§3), and the
eleven frozen first-run strings (§11).

Four things could **not** be resolved by editing prose and are reported rather than guessed:
ticket 15's B2 mechanism (« the rail and an aspect-legal profile cannot coexist ») no longer
matches its evidence under the elected width-derived rule, so the 768 px threshold wants
re-confirming on a real layout; the map's Out of scope reads as excluding **DAF** outright while
ticket 08 puts a `Coefficient dynamique` field in scope, reconciled in the spec's §1 prose
(§8.2's single multiplier in, §8.3's combination and §9 out) but not in the map; the map lists
**eleven** out-of-scope entries where this ticket says nine; and **nobody owns pinning the
TanStack versions**, although every routing behaviour §8 rests on is version-specific to a tree
`package.json` pins at `latest`.

### Fog sweep

**Confirmed: the map's *Not yet specified* section is empty, and the final four tickets (11, 13,
14, 15) added none.** The frontier was empty before this ticket and is empty after it. Two
things that were still vague at assembly time did not stay vague: `pente locale`'s unit and sign
**graduated into a decision** in the spec (§5, with its reason and its rejected alternative),
and two implementation-level choices no ticket fixed are **recorded in §11 as deferred with
their binding constraint** rather than left open — the formatting module's path (the path is
free, the *singleness* is not: one implementation of the precision table, three consumers) and
the CSV parser's path (free, except that it must live **outside** `src/lib/sim/`, so
`terrain.ts` stays engine-pure and the §15 fixtures stay free of terrain stubs). Nothing else
was left vague by accident.
