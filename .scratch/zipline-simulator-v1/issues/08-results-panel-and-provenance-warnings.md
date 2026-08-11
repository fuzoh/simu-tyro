# Results panel — safety verdict and provenance warnings

Type: grilling
Status: resolved
Blocked by: — (04, 05 resolved)
Map: [Zip-line simulator v1](../map.md)
Reads: [ticket 04](./04-span-and-rigging-parameter-model.md) — Régime de sécurité is a _panel_
field with no default (this ticket owns the regimes' contents: `k`, `η_t`, provenance); the
aggregate Unconfirmed-Defaults disclosure lives here; and the solve-dependent warnings
(> 30 % MBL, flèche < 3 % de la portée) are this ticket's, not the form's.

## Question

What numbers does the app report, and how does it tell the user that half its safety
constants come from standards nobody has bought?

Settle:

1. **The output list.** Enumerate every reported value with its French label and unit.
   Candidates from the theory: unloaded sag `D` and loaded sag; `H`; `T_max` over the whole
   traverse (§6.2 gives the anchor-tension envelope, and §2 notes `T` is maximal at the
   higher anchor); anchor loads `T_A` and `T_B` as magnitudes; minimum ground clearance
   `h_min` and the `x` where it occurs (§11); `L₀`; and the sag-to-span ratio, which gates
   the §3.1 parabola rule and the §8.2 stiffening warning. Decide which are headline and
   which are detail.
2. **Envelope versus instant.** The rider slider shows one position, but the safety verdict
   must be judged against the **worst** case over the whole traverse. Decide how both are
   present without confusing them — the number under the slider and the number the verdict
   uses are different numbers, and conflating them is a safety bug, not a UI wrinkle.
3. **Safety-factor regime.** §10.1 offers four regimes with sharply different answers:
   EN 15567-1 `k = 3.0`; WorkSafe QLD `FS ≥ 5` on suspended load **and** `FS ≥ 3` on total
   tension plus a 2× proof test; ACCT challenge-course, where the two research runs
   irreconcilably claim 10:1 and 5:1 and both sources are paywalled (§14 row 10); and
   rescue textile 10:1. §10.1 says **no blending** — the user picks a regime and it is
   labelled with its provenance. Decide the picker, the default, and how the unresolved
   ACCT conflict is presented rather than papered over.
4. **The verdict itself.** `T_allow = η_t·MBF/k` (§10.1) — termination efficiency multiplies
   MBF _before_ the factor. Decide what pass/fail looks like, what the margin read-out is,
   and whether a near-miss gets its own state. Decide whether the WorkSafe two-criteria
   regime shows two verdicts or one combined.
5. **Provenance UI.** The map's binding rule: `[PAYWALLED]`, `[CONVENTION]` and
   `[UNVERIFIED:R1]` values are labelled, configurable defaults carrying a warning — never
   silent, never normative-looking. Design the mechanism once, here, and reuse it
   everywhere: a badge, an info popover, a footnote, a coloured field border? It has to
   scale — most of the safety framework is tagged. Decide the vocabulary the user sees for
   each trust tag, in French.
6. **Non-safety warnings.** Where these surface, and how loud: textile above 30 % MBL
   standing tension (§9.2); sag below 3 % of span (§8.2); span outside 50–2000 m; U-bolt
   grips on a person-bearing line (§10.2, regulatory); knots on HMPE (§10.3, prohibited);
   solver failure modes (§5.4).
7. **What the tool refuses to say.** §8.3 is explicit that the normative EN 15567 load
   combination is paywalled and that [R1]'s Eurocode-shaped formula is unverified — so the
   engine reports the physical envelope times the selected regime, with the combination
   exposed and labelled. Make sure the panel does not imply a compliance certificate.

## Context

Read `docs/simulation-theory.md` §10 in full, plus §8.1–§8.3, §11, §6.2, §14 rows 10, 11
and 19, and §16.

Depends on [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) and
[Material spec model](./05-material-spec-model.md) — the verdict consumes `MBF`/`MBL`, `η_t`
and the installation type those two define.

**Inherited from [CSV profile import](./06-csv-profile-import-and-anchor-placement.md)** — a
**terrain provenance block** to place in this panel. It is provenance in the map's exact sense:
the imported ground is only as trustworthy as its sampling, and the panel is where that gets
disclosed rather than assumed.

```
Profil importé · 200 points · pas max 7,5 m
⚠ Résolution du terrain grossière (pas > 5 m) — un relief entre deux
  points de mesure n'est pas vu par le calcul de garde au sol.
⚠ Tracé non rectiligne (écart max 34 m sur 220 m). La portée L est
  mesurée le long du tracé, pas en ligne droite — elle est surestimée.
ℹ Rectitude non vérifiable (coordonnées absentes).
```

Three things this adds to sub-question 5's mechanism design, which was scoped around
coefficient trust tags and now has to stretch one step further:

- The point count and max spacing are **always shown**, warning or not — a fine import earns its
  disclosure as much as a coarse one, otherwise the absence of a warning is ambiguous.
- The straightness line has **three states, not two**: verified straight, verified bent, and
  *unverifiable* (a hand-made two-column file carries no coordinates). The third is the
  interesting one for this ticket's vocabulary — it is not a warning about a value, it is a
  warning about the **absence of a check**, and the map's provenance rule has no existing idiom
  for that.
- Spacing and straightness are properties of **input data**, not of a coefficient from a
  reference. If sub-question 5's mechanism is built purely around `[PAYWALLED]`-style tags it
  will not fit these; deciding whether they share the badge vocabulary or get their own is part
  of this ticket.

Related, already decided elsewhere and *not* re-openable here: ticket 07 put `h_rider`'s
« non confirmé » chip on the envelope-contact verdict itself.

## Answer

Grilled in three rounds. The ticket asked "what numbers, and how do we admit where they come
from" — the session's load-bearing finding is that **those two questions have the same answer
five times over**: every place the disclosure mechanism had to stretch (a verdict carrying a
chip, a warning about an absent check, a regime that is itself unconfirmed, a prohibition that
survives an ample margin, an incomplete traverse), the honest presentation turned out to be a
*distinct state* rather than a note attached to an existing one. Hence five verdict states and
three warning tiers, neither of which the ticket anticipated.

### 1. There is no results panel — the rail has an output half

The ticket's name is a misnomer and the spec should not carry it forward. Ticket 07's spine has
four regions and none of them is a panel; meanwhile the prototype's rail already held
`L₀ · H à vide · T max à vide · Garde min (traversée)` under **Valeurs déduites**, i.e. this
ticket's aggregates were already squatting in ticket 04's *input* rail. Settled: **the rail is
one scrolling column with an input half and an output half** —
`Paramètres → Valeurs déduites → Résultats → Provenance → Ce que cet outil ne calcule pas`.

A right-hand column was rejected outright: tickets 02 and 07 both bought this layout *for the
extreme aspect ratio*, and a third column steals the width the 1500 m case needs. A region
below the five-cell row was rejected for pushing those cells below the fold, and they are the
scrub read-out — the thing ticket 07 built the layout around.

**This forces a reconciliation ticket 04 left open**: two competing read-out lists become one,
split on whether the rider is involved.

- **Valeurs déduites** — rider-free consequences of the tightness spec: the two non-driving
  tightness quantities, `w`, corde, `L₀`, `H à vide`, `flèche à vide`, **`flèche / portée`**,
  **tension permanente en % MBL**, and in imported mode `L`/`h`.
- **Résultats** — everything traverse-dependent, under the scope header of §3.

`flèche/portée` and `%MBL` land on the rider-free side because both §8.2's stiffening rule and
§9.2's creep cap are about the *standing* line, not the loaded one.

### 2. The thirteen reported values, four of them headline

Nothing dropped, no accordion inside `Résultats`. Headline — larger type, top of the block:
**verdict · FS effectif · `T max (traversée)` · `garde min (traversée)`**. The rest are one-line
detail rows in the same block.

```
── RÉSULTATS ─────────────────── sur toute la traversée ──
Verdict           Dans les limites — EN 15567-1 (k = 3,0)
FS effectif       4,12          exigé 3,0
T max             612 daN       ancrage A, passager à x = 88 m
Garde min         1,24 m        passager à x = 88 m

Réserve de tension        +271 daN avant T adm
T adm ancrage A            883 daN   (η 0,90 · MBF / k)
T adm ancrage B            785 daN   (η 0,80 · MBF / k)
T max ancrage A            612 daN
T max ancrage B            604 daN
T max statique             571 daN
  ↳ majoration dynamique   +41 daN   (DAF 1,2)
Flèche chargée max       13,78 m
Couverture              240 / 240 pas
```

Rejected: hiding the detail rows behind a disclosure. `flèche/portée` in particular is a
**validity** read-out, not a nicety — below 3 % the model the tool is running starts
misreporting the dynamic response — and anything behind a click is read by nobody. `H` is kept
(in Valeurs déduites) even though ticket 07 excluded it from the strip for being identical at
both ends: as an aggregate it is the number a rigger actually sets a tensioner to.

**Declined, against ticket 05's "optional" suggestion: the `EA` sensitivity read-out.** Ticket
05 measured the entire §13.2 `k` range moving loaded flèche by 6 % on HMPE — it reports a
non-problem — and for PA the `k` field's own out-of-band warning already carries the message. A
fourteenth row for that is surface without a decision behind it.

### 3. Envelope versus instant — scope in the header *and* in every label

`Garde min (à x 101 m)` in ticket 07's strip and `Garde min (traversée)` in the rail are
different numbers with near-identical labels, and only the second is what the verdict judges.
Belt and braces, deliberately: the `Résultats` block carries **« sur toute la traversée »** as a
section header, the strip row carries **« à la position du passager »**, *and* the parenthetical
suffixes stay on the individual labels.

This is the one place in the ticket where redundancy is right, for ticket 07's own reason — it
gave clearance failure four coordinated signals because that fact must not be missed. A rigger
who reads the instant number as the envelope signs off a line that fails 20 m further along.
Distinct typography or colour *alone* was rejected: colour already carries failure state here,
and overloading it with scope weakens both.

One cheap addition that does most of the work: **the panel's aggregates name the rider position
that produces them** (« Garde min 1,24 m — passager à x = 88 m »). The two numbers then visibly
answer different questions instead of looking like a rounding discrepancy.

### 4. The verdict judges the dynamically amplified envelope

**No ticket owned DAF and ticket 04's field table has no field for it** — found while loading
context, and it is a question about *what number the verdict judges*, so it was this ticket's.

Settled: `Coefficient dynamique` becomes a third field in the **Passager** group, default
**1,2** `[FIELD:SSF]`, and the verdict judges the amplified envelope

```
T_DAF(step) = T_vide + DAF · (T_chargé(step) − T_vide)
```

per sweep step, which is exactly §8.2's `pretension + DAF × suspended load` and needs nothing
from §8.3's paywalled combination. The engine already solves both cases, so it is free.

Judging the *un*-amplified envelope was rejected as optimistic in the one direction that kills,
and it would put the app in disagreement with the only instrumented field measurement in the
whole reference. Reporting an amplified figure *beside* a static verdict was rejected for the
same reason a warning beside a green verdict is (§6): the green is what gets read.

Two boundaries the spec must state, because both are places a reader will assume more than was
decided:

- **DAF does not touch clearance.** A heavier momentary load does not move the quasi-static sag
  the rider traverses at, and §11's criterion is geometric.
- **This is not §8.3's load combination.** The combination stays unimplemented and disclosed —
  §10 below.

`DAF` is also the mechanism's fourth provenance case: `[FIELD:SSF]` is not one of the three tags
§8 binds the chip to, so it is **configurable with a provenance popover but no chip** — well
attested *and* editable, which the two-level scheme had no slot for until now.

### 5. A regime is a rule set, and the ACCT conflict is two picker entries

§10.1's four rows are not the same *shape*: EN 15567-1 is one divisor on one basis, WorkSafe QLD
is two criteria on two different bases plus a proof test the app cannot evaluate. So a regime is
**an ordered list of criteria — each with divisor, basis and trust tag — plus non-computable
obligations**, never a single `k`.

| Entrée (picker)                      | Critères                                                  | Tag               |
| ------------------------------------ | --------------------------------------------------------- | ----------------- |
| EN 15567-1                           | `k = 3,0` sur tension totale                              | `[STD-ATTESTED]`  |
| WorkSafe QLD 2019                    | `FS ≥ 5` sur charge suspendue · `FS ≥ 3` sur tension totale · *essai de charge 2× (non évalué)* | `[REGULATOR]` |
| ACCT / parcours acrobatique — 10:1   | `k = 10` sur tension totale                               | `[CONVENTION]`    |
| ANSI/ACCT 03-2019 — 5:1              | `k = 5` sur tension totale                                | `[UNVERIFIED:R1]` |
| Secours textile — 10:1               | `k = 10` sur tension totale                               | `[CONVENTION]`    |

Collapsing WorkSafe to its worst criterion was rejected because the two criteria bite on
different quantities — on a slack line the suspended-load criterion governs, on a taut one the
total-tension criterion does — and *which one is binding* is information the user wants. The 2×
proof test is stated as an **uncomputable obligation**, which is precisely why the verdict may
never claim conformity (§10).

**The ACCT conflict is two adjacent entries, not one entry with a 5/10 toggle**, sharing one
note that ledger #10 records them as a documented unresolved contradiction between two
paywalled sources. A single entry with a sub-choice implies somebody knows which is right.

**No free `k` field anywhere.** §10 is headed *regulatory — not tunable* and §10.1 forbids
blending; a typed `k` is a blend with extra steps. Note the tension with the map's binding rule
and how it resolves: three of these five entries are `[CONVENTION]`/`[UNVERIFIED:R1]`, so the
rule's "configurable" is satisfied by *choosing among labelled regimes*, not by editing a
divisor.

Availability is coupled to §10.4, but **narrowly**: only *Secours textile 10:1* is disabled —
under steel, or under `PERMANENTE` — because that one presupposes family B and is a category
error elsewhere. Everything else stays selectable; EN 15567-1 on a temporary rescue line is a
conservative choice, not an invalid one, and the app has no standing to refuse it. Disabled
entries **show their reason** rather than vanishing (tickets 04 and 05's inherited rule — no
number ⇒ disable with reason; a filtered picker teaches a shorter list than really exists). And
per ticket 04's family-flip precedent, moving `Type d'installation` into a state where the
chosen regime is disabled is a **blocking error with a one-click fix**, never a silent
re-selection.

### 6. Five verdict states, because each maps to a different user action

The banner is **one sentence naming the governing criterion**; the full criteria × ends grid
sits in `Résultats`. A verdict per axis stacked in the banner was rejected as the
variable-height overlay ticket 07 already killed; two permanent banners (tension, clearance)
were rejected for implying the two are comparable channels, when a clearance failure is
geometric fact and a tension failure is a statement about a regime the user picked.

| État                    | Bandeau                                                        | Action de l'utilisateur       |
| ----------------------- | -------------------------------------------------------------- | ----------------------------- |
| **Dans les limites**    | « Dans les limites — EN 15567-1 (k = 3,0) »                     | rien                          |
| **Marge faible**        | « Marge faible — FS effectif 3,05 pour k = 3,0 »                 | augmenter la marge            |
| **Hors limites**        | « Hors limites — WorkSafe QLD, critère charge suspendue »        | changer la conception         |
| **Refusé — usage interdit** | « Refusé — serre-câbles sur une ligne portant des personnes » | changer la quincaillerie      |
| **Indéterminé**         | « Indéterminé — 209 des 240 pas résolus »                       | aucun chiffre n'est disponible |

Five looks like inflation until the action column is read: each row is a different thing to do,
which is the test a state has to pass.

**`Refusé` exists because a prohibition survives an ample margin.** Ticket 05 fixed the rule as
*defensible number ⇒ compute and let the Verdict refuse on `[REGULATOR]` grounds*, so a line
with `η_t = 0,80` U-bolt grips can read `FS effectif 8,0` against `k = 3` and still must not
pass. Folding that into `Hors limites` is wrong — nothing about limits is at issue — and
demoting it to a loud warning above a passing verdict is the dangerous option, since this is a
regulator's verbatim prohibition (§10.2, WorkSafe QLD / AS 2076), not advice.

**`Indéterminé` suppresses the verdict rather than qualifying it.** Ticket 03 introduced
`coverage` precisely so a green verdict could not lie, and a verdict computed on the solved 87 %
is biased optimistic *by construction*: the steps that failed to converge are the
ill-conditioned ones, which is where the worst tension lives. Routing it to ticket 11's error UX
was also rejected — a partial sweep is not a failed solve, it is a complete solve of an
incomplete traverse, and the margins that did converge are still worth showing (each under the
traverse-scope caveat). `Indéterminé` must be styled as neither pass nor fail.

**Verdict grammar, which is where sub-question 7 is actually solved**: the verdict never says
« conforme » or « non conforme », and **always names the chosen regime inside the sentence**.
The claim is then about the rule the user selected, not about the law — the anti-certificate
requirement met in the grammar rather than bolted on as a disclaimer nobody reads.

### 7. The margin is an effective safety factor, never a percentage

Headline: **`FS effectif = η_t · MBF / T_max`, shown against the regime's required `k`** — « FS
effectif 4,12, exigé 3,0 ». Detail row: **absolute headroom in daN**, the only form that answers
"how much more tension can I put in" without arithmetic.

Percentage utilisation is rejected as actively harmful: it recruits the "80 % is fine" heuristic
from engineering contexts with far more design margin than a zip line sized on paywalled
constants has. Both accepted forms satisfy ticket 05's handoff (verdict as a ratio, never a
side-by-side of two raw numbers) — which matters here because under the daN default `MBF` and
the tensions differ by ~2 orders of magnitude, so `η_t · MBF / k` appears only as the
parenthetical decomposition on the `T adm` rows, and the dimensionless `FS effectif` is what
carries the headline.

**Near-miss earns its own state at `FS_eff < 1,1 · k`**, and its treatment matters more than its
threshold: it is *not* green with a note. A line at `FS_eff = 3,05` against `k = 3,0` has no
margin left for the coefficients this tool openly admits it does not know.

`T adm` is **per end** — ticket 05 gives one termination per end, so `η_t(A)` and `η_t(B)` differ
— while WorkSafe's suspended-load criterion is not per-end at all. The grid is therefore
criteria × ends with some cells empty, which is why §6's banner names the governing cell.

### 8. Provenance: two idioms, two chip levels, three warning tiers

**Two idioms, because coefficients and input data answer different questions** — "is this number
backed by a source?" versus "what does this file let us check?".

*Coefficients* keep ticket 04's single **« non confirmé »** chip, covering exactly
`[PAYWALLED]` + `[CONVENTION]` + `[UNVERIFIED:R1]` — the same three the map's binding rule
groups — with §0.2's finer seven-tag vocabulary living inside the popover and the aggregate
list. A seven-level trust taxonomy on screen is unactionable: the user only ever decides
"accept this number or type my own". Ticket 07's precedent stands and generalises — **a chip can
ride on a verdict, not just a field** — which is what makes the mechanism reach sub-question 5's
real demand.

*Warnings* are **three tiers**, and the third was handed over by ticket 05 rather than grilled
here:

| Tier | Presentation | Cases |
| --- | --- | --- |
| **Ambiant** | plain state text beside the value, no ⚠ | textile `k` out of its attested 10–30 % MBL band (§16-6b) — ticket 05 fixed this as ambient, *not* an alarm, because a zip line **never** enters that band, so an alarm would fire always and mean nothing |
| **Avertissement** | ⚠ inline on the row it qualifies | tension permanente > 30 % MBL (§9.2, creep/design-life, not strength) · `flèche / portée` < 3 % (§8.2) |
| **Verdict** | the banner, state `Refusé` | grips on a person-bearing line (§10.2) |

The ladder is **thinner than sub-question 6 assumed** — three of its six items are not this
ticket's. Span outside 50–2000 m is already a non-blocking *form* warning in ticket 04's table
(no solve needed); knots on HMPE never reach a warning because ticket 05 disables the option (no
`η_t` exists to compute); solver failure modes are ticket 11's by ticket 07's handoff.

The `flèche < 3 %` warning carries an extra clause the others do not, because it is the only
warning in the app that **invalidates another decision**: below 3 % the line stiffens, and §4's
`[FIELD:SSF]` DAF of 1,2 was measured on a *controlled step-off on a tensioned line* — outside
that regime, per §8.2's > 5× drop-entry row. So the warning appears both on `flèche / portée`
and beside the DAF figure.

Aggregate disclosure (inherited from ticket 04): **an always-visible one-line summary with a
count, expandable** — « ⚠ 6 valeurs sans référence normative confirmée ». That satisfies the
binding rule (never silent) while honouring ticket 04's rejection of warning-wall panels, and
the count is the one figure worth a glance. Contents: `m_p`, `h_rider`, textile `k`, any
overridden `MBF` (ticket 05: overriding *downgrades* the one `[STD-ATTESTED]` derived value), and
— **pinned first and visually separated — the chosen regime** whenever it is `[CONVENTION]` or
`[UNVERIFIED:R1]`, which is three of the five. The regime is not one input among six: it
multiplies into every margin in the grid, so with ACCT selected the headline verdict rests on a
convention that [R1] and [R2] contradict each other about. Ticket 04's rule holds: editing a
value flips its chip to *valeur utilisateur* but does **not** remove it from the list.

### 9. Terrain quality is always disclosed — in manual mode too

Ticket 06's drafted block is kept verbatim for the import case (point count and max spacing
**always** shown, warning or not; three straightness states with **ℹ « non vérifiable »**
distinct from ⚠ « non rectiligne », because "we could not check" and "we checked and it is bad"
must not read alike).

The hole found here: the block is import-only, yet ticket 04 made manual-mode ground a
**straight line between the two anchor bases** — a real terrain model with real consequences for
`garde min`. Import-only means the block's *absence* silently reads "no terrain concerns" in
exactly the mode where the terrain is a two-point idealisation. This is ticket 06's own argument
one step further: a fine import must earn its disclosure because otherwise a missing warning is
ambiguous — by the same logic a missing block is ambiguous.

Settled: the block is **always present**, and in manual mode reads
**ℹ « Terrain — ligne droite entre les pieds d'ancrage (aucun profil importé) »**. Placement: its
own sub-block in the rail's Provenance section, **above** the aggregate list — terrain quality is
about *this run's inputs*, the aggregate list about values unconfirmable in principle.

### 10. What the tool does not calculate, and why the formula stays in a popover

A standing block at the bottom of the rail, below everything live: five static lines that never
change, so they cost nothing to maintain. It is the only place a user learns that a passing
verdict says nothing about wind.

- La combinaison de charges normative EN 15567 n'est **pas appliquée** — texte payant.
- L'essai de charge 2× (WorkSafe QLD) n'est **pas évalué**.
- Vent et déport latéral : hors périmètre (§8.4, modèle 2-D).
- Dynamique, vitesse et freinage : hors périmètre (§12).
- Aucune attestation de conformité.

§8.3 instructs that the combination formula be *exposed and labelled*. Settled: **prose on the
surface, formula in the popover** — [R1]'s
`E_d = γ_G·T_pre + γ_Q·(T_user·DAF) + γ_W·F_wind`, tagged `[UNVERIFIED:R1]`, with ledger row 11's
finding that R1 quotes exact clause values from standards it simultaneously lists as paywalled.
Printing an unapplied formula in the open invites the mental arithmetic it is labelled against —
someone will apply those γ-factors by hand and believe the result. On demand it informs; on the
surface it misleads.

### 11. What this hands forward

| Ticket | Obligation created here |
| --- | --- |
| [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) | **Amended**: `Coefficient dynamique` (`DAF`, default 1,2, hard `> 0`) joins the **Passager** group — a field the table lacked. And its **Valeurs déduites** block is re-specified: it gains `L₀`, `H à vide`, `flèche à vide`, `flèche / portée`, `tension permanente % MBL`, all rider-free. |
| [Validation and error-state UX](./11-validation-and-error-state-ux.md) | Five verdict states to render (`Dans les limites` / `Marge faible` / `Hors limites` / `Refusé — usage interdit` / `Indéterminé`), of which its own item 6 is `Indéterminé` — **the verdict is suppressed, not degraded**, and no threshold question remains. Its items 4/5 keep ticket 07's clearance banner; a *failed solve* must not reuse it. Warning ladder is three tiers (ambiant / avertissement / verdict) and thinner than expected — its items on span range, HMPE knots and grips are owned by tickets 04, 05 and this one respectively. Regime-disabled-by-`Type d'installation` is a fourth blocking-error-with-one-click-fix instance, which settles its own §2 question in favour of a general affordance. |
| [URL state schema and persistence](./09-url-state-schema-and-persistence.md) | New state to serialise: the chosen **regime** (5 entries, no free `k`) and **`DAF`**. Note the regime has *no default*, so its absence in a URL is a legitimate « — choisir — », not a fallback. |
| [First-run scenario and defaults](./14-first-run-scenario-and-defaults.md) | `DAF = 1,2` is a third pre-filled value, but **not** an Unconfirmed Default — `[FIELD:SSF]`, so no chip. Régime remains deliberately unset. |
| [Responsive and narrow-screen layout](./15-responsive-and-narrow-screen-layout.md) | The rail is now a five-section scrolling column (`Paramètres → Valeurs déduites → Résultats → Provenance → Ce que cet outil ne calcule pas`), which is what has to reflow — materially more than the input rail it was scoped against. |
| [Assemble the v1 build spec](./10-assemble-the-v1-build-spec.md) | Drop the name "results panel" — there is no such region. Carry the criteria × ends verdict grid, and the engine consequence of §4: `T_DAF` needs `T_vide` alongside the loaded sweep, which `solveSpan` already produces. |
