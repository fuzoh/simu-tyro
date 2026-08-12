# Validation and error-state UX

Type: grilling
Status: resolved
Blocked by: — (08 resolved 2026-08-11)
Map: [Zip-line simulator v1](../map.md)
Reads: [ticket 04](./04-span-and-rigging-parameter-model.md) §7 — the two-tier split is fixed
(form owns non-physical checks, engine owns physics), including which rules land in which tier.
This ticket owns only how each state *renders*, plus the §10.4 blocking-error path.

## Question

What does the user see for each way this app can refuse to give an answer?

Graduated from the map's fog once
[Engine API, execution model and module layout](./03-engine-api-execution-model-and-module-layout.md)
fixed the failure taxonomy — the set is now closed and enumerable, which is what makes this
ticketable. Blocked by the results panel, because most of these states render *in place of*
a result.

Settle the presentation for each, in French, and where it appears (inline on the field, on
the chart, in the results panel, or as a blocking dialog):

1. `invalid-input` — a non-finite or non-positive geometry/material value. Field-level, and
   presumably prevented rather than reported.
2. `no-convergence` — the Newton solve gave up after §5.2's five re-seeds. Carries
   `attempts` and the final `residual`; decide whether the residual is shown (it is
   meaningful to a rigger: "3e-4 m, needed 1e-6") or hidden as noise.
3. `slack-limit` — §4.3's `H → 0`. The line is effectively lying on the ground. Is this an
   error or a legitimate "your line is far too slack" reading?
4. `contact: "rider"` — clearance negative, the rider strikes the ground. This is a
   *result*, not a failure: the chart still draws. How loudly does it fail?
5. `contact: "cable"` — the cable itself is in the dirt. Strictly worse than the above.
6. `coverage < 1` — a partial sweep. §10's verdict is computed from an incomplete envelope
   and **must not render as green**. Decide what a degraded verdict looks like, and the
   threshold below which no verdict is offered at all.
7. **Use-class rejection** — §10.4's hard gate: `PERMANENT` plus a textile Material Spec.
   Not a computation failure at all; the input combination is disallowed. Decide whether the
   textile option is disabled, or selectable-then-rejected with an explanation.
8. `L₀` below the physical floor — §5.4 notes `L₀ < chord/(1+T_break/EA)` needs tension above
   breaking. Note this straddles the engine/safety split decided in ticket 03: the solve
   itself succeeds and returns an enormous `H`, so this surfaces as a safety verdict, not a
   solver error. Confirm that is the right user-facing framing.

Also settle: do the `SolveNote`s (`near-taut-fallback`, `damped`, `reseeded`) surface to the
user at all, or are they diagnostics for a dev-only panel?

## Context

Failure taxonomy: ticket 03's answer, §6. Theory §4.3, §5.4, §10.4, §11.
The provenance-warning language lands in the results panel — ticket 08 — so match its tone
rather than inventing a second warning idiom.

**Inherited from [CSV profile import](./06-csv-profile-import-and-anchor-placement.md)** —
three things, one of them a structural problem this ticket has to solve.

**1. The derived-value attribution problem (§7).** Ticket 04 hung every hard range on a
**field**: `L > 0` finite, `h` finite. But in imported mode `L` and `h` are *derived read-outs*
— so those checks have nothing to attach to, and yet they must still run. They have to be
evaluated on the derived values and **attributed back to whichever station field can fix them**.
Concretely: `station B = station A` yields `L = 0`, reaches `solveSpan`, and returns
`invalid-input{field:"L"}` pointing at a field the user cannot edit. Ticket 04's two-tier split
(form checks what needs no physics; the engine owns §5.4's chord bound) survives intact — but
tier one now needs a notion of *which input is culpable for a derived value*, which it did not
before. This generalises past terrain: any read-out under **Valeurs déduites** can go
out of range while every editable field is individually valid.

**2. Blocking errors carrying a one-click fix.** Ticket 06 chose
`⛔ L doit être > 0 — l'ancrage B est avant l'ancrage A.  [ Inverser A et B ]` over silently
auto-normalising, because auto-swapping A and B flips `h`'s sign — the same
no-silent-reinterpretation rule ticket 04 applied at the §10.4 family gate. Ticket 04 also gave
the family switch a one-click fix. That is now **two instances**, so this ticket should decide
whether a fix-action is a general affordance of the error component or an ad-hoc addition per
error.

**3. The import failure taxonomy**, which needs a home in whatever error surface this ticket
designs — it is a file-level failure, so it belongs to neither the form nor the engine:

| Kind | French copy |
| --- | --- |
| `colonnes-manquantes` | « Colonnes Distance et Altitude introuvables. » |
| `aucune-donnée` | « Le fichier ne contient aucune ligne de données. » |
| `trop-peu-de-points` | « Au moins 2 points sont nécessaires. » |
| `valeur-non-numérique` | « Valeur illisible ligne 47, colonne Altitude. » |
| `distance-non-croissante` | « La distance décroît à la ligne 112. » |
| `distance-dupliquée` | « Deux altitudes à la même distance, ligne 88. » |
| `lecture-impossible` | « Impossible de lire le fichier. » |
| *(non-blocking)* | « ⚠ Distances peut-être en km plutôt qu'en mètres ? » |

Also settled there and not re-openable: a typed station outside the trace **blocks**, while a
dragged marker **clamps** — so the same constraint has a blocking presentation on one input path
and no error state at all on the other. Worth checking that this ticket's error model can express
that asymmetry, since ticket 07 established the same split for rider position.

**Inherited from [Results panel](./08-results-panel-and-provenance-warnings.md)** — four things,
two of which *close* questions this ticket was asking.

**1. Item 6 is answered, not this ticket's to decide.** `coverage < 1` yields a fifth verdict
state, **« Indéterminé — 209 des 240 pas résolus »**, which **suppresses** the verdict instead of
degrading it — so the "threshold below which no verdict is offered" question dissolves: there is
no threshold, any `coverage < 1` is indeterminate. The reasoning is worth carrying: the steps
that fail to converge are the ill-conditioned ones, which is where the worst tension lives, so a
verdict on the solved 87 % is biased optimistic *by construction*. It is also explicitly **not**
routed here as a solve failure — a partial sweep is a complete solve of an incomplete traverse —
so this ticket renders it as a *verdict* state, styled as neither pass nor fail, with the
converged margins still shown under the traverse-scope caveat.

**2. Item 2 of this ticket's §2 is answered too.** Regime-disabled-by-`Type d'installation` is now
a **third** blocking-error-with-one-click-fix instance (after ticket 04's family gate and ticket
06's `Inverser A et B`). Three instances settles it: the fix-action is a **general affordance of
the error component**, not an ad-hoc addition per error.

**3. Five verdict states to render**, and the banner is one sentence naming the governing
criterion:

| État | Action de l'utilisateur |
| --- | --- |
| Dans les limites | rien |
| Marge faible (`FS_eff < 1,1·k`) | augmenter la marge |
| Hors limites | changer la conception |
| **Refusé — usage interdit** | changer la quincaillerie |
| Indéterminé | aucun chiffre disponible |

`Refusé` is the one to be careful with: it is **§10.2's grips prohibition surviving an ample
margin** — `FS effectif 8,0` against `k = 3` and still refused — so it is neither `Hors limites`
(nothing about limits is at issue) nor a loud warning above a pass. The three passing/failing
states must be visually distinct from each other; `Marge faible` is **not** green with a note.

**4. The warning ladder is three tiers and thinner than this ticket's item list implies** —
`ambiant` (plain text, no ⚠: textile `k` out of band, which fires *always* on zip lines, so an
alarm would mean nothing) · `avertissement` (⚠ inline on the row: > 30 % MBL, `flèche/portée`
< 3 %) · `verdict` (the banner). Of sub-question 6's original six items, span-outside-50–2000 m is
ticket 04's form warning, HMPE knots never reach a warning (ticket 05 disables the option), and
only the solver failure modes are this ticket's. Match the tone: the verdict never says
« conforme »/« non conforme » and always names the chosen regime inside the sentence — a second
error idiom that claimed conformity anywhere would undo that.

**Inherited from [Profile CSV export — can it exceed 200 points?](./16-profile-export-point-count.md)**
— one tier boundary to confirm, now that its frequency is known.

The geoportal caps its export at **200 points regardless of length**, so spacing is
`length/199` and ticket 06's ~5 m coarse-terrain threshold is crossed at **≈ 1000 m**:
everything on the upper half of the map's 50–2000 m range trips it, permanently, with no
re-export that helps. Ticket 08 placed that warning at **⚠** inside the always-visible terrain
block, before this frequency was known. Confirm or move it: the *ambient* tier exists for
warnings that fire always and therefore mean nothing, and this one now fires often — but
conditionally, and unlike an out-of-band coefficient it names a **real blind spot in the
clearance calculation**, which is the app's primary output. Arguable either way; decide it
explicitly rather than inheriting ⚠ by default.

**Inherited from [URL state schema and persistence](./09-url-state-schema-and-persistence.md)** —
four presentation obligations, one of them a hole no ticket owned.

1. **No regime ⇒ no verdict banner, a prompt in its place.** Ticket 04 §8 gave `Régime de
   sécurité` no default and ticket 08 §6 defined five verdict states, **all of which presuppose a
   regime** — its grammar rule requires naming the chosen regime inside the sentence. Ticket 09 §5
   forced the question by making the regime's absence legitimate *shared* state, but the hole is not
   URL-specific: ticket 14's first run opens the same way. It is **not** a sixth verdict state —
   `Indéterminé` concerns a sweep that partly failed to converge, whereas here nothing was
   attempted. Recommended shape: the banner is absent, replaced by « Choisissez un régime de
   sécurité pour obtenir un verdict ». Wording and styling are yours.
2. **The ignored-keys banner.** Dismissible, naming what was dropped and what was used instead,
   shown once at load alongside the rewrite-on-load navigation that cleans the address bar.
3. **The refusal page.** An unknown schema version or an undecodable/oversize trace refuses the
   link *whole* and renders through `errorComponent`, offering « Ouvrir l'application vide ».
   Distinct from case 2 — nothing about the link was trustworthy.
4. **Invalid state can now *arrive* rather than be entered.** Ticket 09 §0 fixed that the URL
   restores state faithfully including invalid state, so ticket 08 §5's `reg=secours10&fam=ac`
   blocking error and ticket 05 §7's `invalid-input{field:"L0"}` after a family flip both have a
   first-frame variant with no preceding user action. Check that every fix-action's copy still
   reads correctly when the user did not cause the state — « Passer à l'acier » assumes an act the
   recipient of a link never performed.

## Answer

Resolved by grilling over two rounds, 2026-08-12. The ticket asked "what does the user see for
each way the app can refuse", and the headline finding is that **two of its eight items are
misfiled**: `slack-limit` and "far too slack" are not refusals at all — they converge and land as
`contact: "cable"` — while item 8's `L₀`-below-the-floor is not a safety verdict but the app's
hardest refusal, because measured, the §5.4 chord bound **is** the breaking load, so the ticket's
own framing ("the solve succeeds and returns an enormous `H`") is false. The second finding is
structural: the gate table this ticket inherited names no rider field at all, so §1 had to
complete it before a single message could be written.

### 0. Four invariants generate every screen below

Stated as invariants because each is violated by the obvious implementation:

1. **No hard check ever renders only on a read-out.** Every check is declared on a *quantity* and
   attributed to an editable field by §7's static table.
2. **No error message asserts an act.** Ticket 09 §0 makes every state here reachable on the first
   frame of a link, so « vous avez saisi » / « maintenant » are lies half the time. **Button
   labels describe the effect of pressing them**, which is accurate either way (ELECTIONS §0.9).
3. **No verdict ever stands on numbers it was not computed from.** `stale` narrows to exactly one
   meaning — *a recompute in flight on inputs that are still valid* (ELECTIONS §0.3).
4. **The banner slot holds exactly one occupant** (ELECTIONS §0.4, completed in §3).

A fifth, weaker but load-bearing three times: **a refusal never destroys a value the user still
has** — a rejected import keeps the current terrain (§9), an out-of-range `x` clamps rather than
blocking the span (§12), a family flip keeps both Material Specs (ticket 05 §7).

### 1. The three gates complete: `m_p` solves, `h_rider` clears, `DAF` judges

ELECTIONS §0.1 split ticket 04 §7's single FORM tier into three gates, and its input lists name
**no field from the Passager group**. `m_p`, `h_rider` and `DAF` all carry hard `> 0` checks
(ticket 04 §2, DAF added by ticket 08 §4) and no gate claimed any of them. Completed — and they
land in three *different* gates, which is itself evidence the split was right:

| Grille | Entrées | Ce que l'échec supprime |
| --- | --- | --- |
| **Solve Gate** | `L`, `h`, le champ de tension directeur, famille + Material Spec, famille×usage (§10.4), **`m_p`** | tout l'aval : ni `SpanState`, ni câble, ni read-out |
| **Clearance Gate** | hauteur d'ancrage A/B, terrain (stations), **`h_rider`** | la garde au sol et la courbe de garde seules — le câble se dessine |
| **Verdict Gate** | régime, les deux terminaisons, **`DAF`** | le bandeau et la grille critères × extrémités seuls |

The assignment is forced by decisions already made, not chosen:

- `m_p` is the magnitude of the single `PointLoad` ticket 03 hands `solveSpan`. With no rider
  there is no loaded `SpanState` — no cable, no `T_A`/`T_B`, nothing in the five cells. Solve Gate.
- `h_rider` enters only `evaluateClearance`'s envelope: ticket 07 §8 made « Enveloppe passager
  traversée » true *only given* `h_rider`, and made that verdict carry the value's chip. Clearance
  Gate — exactly the row ELECTIONS §0.1 wrote for the anchor heights.
- `DAF` enters only `T_vide + DAF·(T_chargé − T_vide)`, and ticket 08 §4 states in terms that
  **DAF does not touch clearance**. Verdict Gate — and its failure additionally removes the
  « ↳ majoration dynamique » detail row, which is the DAF decomposition and nothing else.

**Rejected: a fourth "rider-free" gate** keeping `Valeurs déduites` alive while blanking everything
rider-dependent. `m_p` ships at 120 kg and ticket 14 §8 completes it from defaults on an incomplete
link, so an empty `m_p` is reachable only by a user clearing the field — which ELECTIONS §0.3
already routes to « Saisie en cours », a state that keeps **all** the numbers rather than the
rider-free half. A fourth gate would buy a worse version of a state that already exists.

`x_D` sits in **no gate**: it clamps (§12). And « régime choisi » is struck from ticket 04 §7's
FORM tier — it never blocks a solve, which is what makes ticket 14's verdict-less first run
coherent.

### 2. Two field-level states, not one — and the input widget creates a third message

ELECTIONS §0.3 splits on whether a value was **committed**, so every field carries two distinct
messages and they are typographically distinct: the empty state is **neutral, lowercase, no
icon**; the committed-invalid state is **⛔ and blocking**. Calling both « erreur » would make
ordinary typing feel like a fault, which is the whole point of §0.3's split.

ELECTIONS §0.6's widget adds a third message. With `<input type="text" inputMode="decimal">`
accepting both `,` and `.`, **unparseable text is a reachable state** — `type="number"` hid it by
reporting an empty value, precisely the silent failure §0.6 rejected it for. So « nombre
illisible » is a message this app needs and `type=number` had no place for, and it quotes the raw
text back, because what the user typed is the evidence.

| Champ | Contrôle dur | Vide (neutre) | Valeur engagée invalide (⛔) |
| --- | --- | --- | --- |
| Portée `L` | `> 0`, fini | « valeur requise » | « ⛔ Portée — une longueur strictement positive est requise. Valeur : −5,0 m. » |
| Dénivelé `h` | fini | « valeur requise » | « ⛔ Dénivelé — nombre illisible. Saisie : « 12,3,4 ». » |
| Hauteur d'ancrage A / B | `≥ 0` | « valeur requise » | « ⛔ Hauteur d'ancrage A — une hauteur négative n'existe pas. Valeur : −2,0 m. » |
| Flèche à vide cible | `> 0` | « valeur requise » | « ⛔ Flèche à vide cible — une flèche strictement positive est requise. Valeur : 0 m. » |
| Prétension cible | `> 0` | « valeur requise » | « ⛔ Prétension cible — une tension strictement positive est requise. Valeur : 0 daN. » |
| Longueur non tendue | `> 0` | « valeur requise » | « ⛔ Longueur non tendue — une longueur strictement positive est requise. Valeur : 0 m. » |
| Masse `m_p` | `> 0` | « valeur requise » | « ⛔ Masse du passager — une masse strictement positive est requise. Valeur : 0 kg. » |
| Enveloppe passager `h_rider` | `> 0` | « valeur requise » | « ⛔ Enveloppe passager — une hauteur strictement positive est requise. Valeur : 0 m. » |
| Coefficient dynamique `DAF` | `> 0` | « valeur requise » | « ⛔ Coefficient dynamique — une valeur strictement positive est requise. Valeur : 0. » |
| Diamètre nominal `d` | `> 0` | « valeur requise » | « ⛔ Diamètre nominal — un diamètre strictement positif est requis. Valeur : 0 mm. » |
| Charge de rupture `MBL` | `> 0` | « valeur requise » | « ⛔ Charge de rupture — une charge strictement positive est requise. Valeur : 0 daN. » |
| Masse linéique `μ` | `> 0` | « valeur requise » | « ⛔ Masse linéique — une valeur strictement positive est requise. Valeur : 0 kg/m. » |
| Raideur relative `k` | `> 0`, requis | « valeur requise — aucune valeur publiée pour le polyester » | « ⛔ Raideur relative k — une valeur strictement positive est requise. Valeur : 0. » |
| Station A / B | dans le tracé | « valeur requise » | « ⛔ Station hors du tracé (0 – 224,0 m). Valeur : 260,0 m. » |
| Station B ≤ Station A | `L > 0` | — | « ⛔ Portée nulle ou négative — l'ancrage B est avant l'ancrage A. » `[ Inverser A et B ]` |
| Type d'installation × famille | §10.4 | — | « ⛔ Corde textile impossible en installation permanente (§10.4). » `[ Passer à l'acier ]` `[ Passer en usage temporaire ]` |
| Régime × famille / usage | ticket 08 §5 | — | « ⛔ Régime « Secours textile 10:1 » indisponible avec un câble acier. » `[ Choisir un autre régime ]` |

Template, fixed: `⛔ <Champ> — <la règle, énoncée>. Valeur : <v>.` The rule is stated as a
property of the world, never as a reproach, and the offending value is always echoed — on an
arrived link the user has not seen it yet. Note `k`'s empty message carries ticket 05 §3's reason,
because for polyester the blank is not an omission: nobody published the number.

`Grade`, `Construction` and `Classe de corde` are selects that ship with a value and cannot be
emptied, so their `requis` needs no message. Terminations are handled by disabling with the reason
(ticket 05 §6), never by an error.

Warning-tier copy is deliberately **not** here: `L ∉ [50, 2000]`, `|h| > L`, `hauteur > 30`,
`d ∉ [6, 26]` are ticket 04's non-blocking form warnings, and result-level warnings are ticket 08
§8's three-tier ladder.

### 3. The blocking-error banner names the gate it breached — and « Saisie en cours » joins the precedence

ELECTIONS §0.4 fixed the summary as « ⛔ 2 erreurs bloquantes — aucun résultat ». That copy is true
only for a Solve Gate breach: under §1's split a bad `DAF` blocks the verdict while `T max` and
`Garde min` are printed on screen, and « aucun résultat » beside a printed clearance is the app
contradicting itself. The summary therefore names the **worst gate breached**:

```
Solve Gate      ⛔ 2 erreurs bloquantes — aucun résultat             [ voir la première ]
Clearance Gate  ⛔ 1 erreur bloquante — garde au sol indisponible     [ voir la première ]
Verdict Gate    ⛔ 1 erreur bloquante — aucun verdict                 [ voir la première ]
```

The slot carries **only** the count and the jump link; the actionable message and its Fix Action
live inline on the culpable field. Blocking errors are a **list**, not a singleton:
`use=perm & fam=tx & reg=secours10` raises two at once, family first, and applying one Fix Action
leaves the other standing rather than cascading a silent second repair.

Precedence, completing §0.4's list with the state §0.3 created:

1. **Blocking errors** (any gate) — count + jump link.
2. **The three refusal states** of §6 — same visual class as blocking.
3. **« Saisie en cours »** — neutral. §0.3 gives it "the same slot behaviour as no-regime", so it
   *is* a slot occupant; it was simply not in §0.4's list.
4. **The verdict** — ticket 08 §6's five states, not restated here — **or** the no-regime prompt.

Ranks 3 and 4 are mutually exclusive by construction: an empty required field suppresses the
verdict, so nothing at rank 4 can coexist with rank 3. **Not slot occupants**, unchanged: the
ignored-keys strip, import parse failures, the coarse-terrain ⚠ (Provenance, never promotes). The
refusal page pre-empts everything by being the index route's `errorComponent`.

### 4. « Saisie en cours » — the last complete Sweep, marked, with the writes suspended

A *required field is empty* **and holds focus**. Mid-edit, not an error.

The focus clause is ticket 14 §8's firing rule and it is what keeps this state bounded: mid-edit
lasts as long as the caret is in the field. A required field that is empty and **blurred** — or that
was never filled — is not mid-edit at all, and falls to §5's « Aucun résultat » with no stale
picture. Without the clause, walking away from a half-typed form would leave a stale Sweep on screen
indefinitely, which is the one thing §0.3's split exists to prevent.

```
[ bandeau ]  Saisie en cours — ces valeurs correspondent à Flèche à vide cible 6,00 m.
```

- The chart and both read-out blocks keep the **last valid Sweep**, and the chart **freezes rather
  than dims** — one worded mark for the whole output half, never a per-row or per-gate stale matrix.
  Ticket 14 §8 owns this rule and it is the right one: the banner *names the field and its last
  committed value*, which attributes every number on screen unambiguously, where opacity only says
  « something here is provisional » while degrading legibility of exactly the quantity the user is
  steering toward — and at 390 px ticket 15 §6's collapsed two-row header has no space for a
  decorative state. An earlier draft of this section dimmed the chart with the danger bands and the
  red cable/rider exempted at full strength; freezing makes that exemption unnecessary, since
  nothing fades in the first place.
- **Scrubbing goes inert**, pointer and typed `x` alike, and this is the app's second inert scrub
  track. §3's protection of the track covers a *Clearance Gate* failure, where the Sweep is still
  valid; here the Sweep is stale by definition, so scrubbing would let the user **generate new
  stale numbers** rather than read the ones already on screen — and ticket 07 §4's exact typed-`x`
  solve cannot run on an incomplete input set anyway.
- The verdict banner is suppressed (rank 3). Every solve-dependent number keeps its value, so
  ticket 04 §1's claim that garde au sol is live from first launch survives ordinary typing.
- The debounced URL write and the Session write are **suspended**, so the address bar keeps the
  last complete Scenario. « Copier le lien » is disabled with « Complétez les champs vides pour
  partager ce lien ».
- The empty field carries §2's neutral message.

Rejected — blanking the output half on every keystroke that momentarily empties a field. Visually
violent, and worse, it punishes correct behaviour: clearing a field to retype it is how numeric
input works. Rejected in the other direction — keeping the URL write live, which would publish a
half-typed scenario into the address bar and into `[ Copier le lien ]`.

### 5. « Aucun résultat » — one cause, three echoes, and the app's only inert scrub track

A **committed** invalid value (typed `−5`, or arrived in a link) or any of §6's three refusals.
**No stale numbers, ever**, because the alternative breaks invariant 3: a rigger reading
`FS effectif 4,12` beside a blocking error has been told the line is fine by the largest number on
screen — and ticket 09 §0 makes this reachable on a first frame where there is no "last good" to
fall back on, so « keep the last good » has no value to offer in the case that matters.

The cause sentence is written **once** and echoed in each suppressed region — not per row, which
is the warning wall ticket 04 §6 rejected, and not once only, because ticket 08 §1's single
scrolling column means a rail reader may never have the banner in view:

```
[ bandeau ]        ⛔ 1 erreur bloquante — aucun résultat        [ voir la première ]
[ 5 cellules ]     Aucun résultat — portée invalide.
── RÉSULTATS ──    Aucun résultat — portée invalide.
── VALEURS DÉDUITES ──
  corde · w                   (présents — indépendants de la résolution)
  L₀ · H à vide · flèche à vide · flèche/portée · tension permanente
                              Aucun résultat — portée invalide.
```

Inputs still draw: terrain, both anchors, the span markers, the 5 % margin. Absent: the cable, the
unloaded line, the clearance curve, the danger bands, the rider marker.

The five read-out cells are **replaced by one line spanning the row**, keeping the row's height
(ticket 15 §6's two-row ≈104 px band, so nothing jumps). Not « — » per cell: ticket 08 spent that
glyph on `Indéterminé` — *attempted, unavailable* — and reusing it for *nothing attempted*
collides with the distinction ticket 08 bought five states to preserve (ticket 14 §5's argument,
applied one level down). Not empty frames either: a blank value cell reads as a rendering fault.

**The geometry-invalid sub-case, and the one exception to the scrub-track rule.** ELECTIONS §0.1
requires the strip to keep its axes and stay a scrub track when the **Clearance Gate** fails. When
`L` itself is invalid there is no shared x domain at all — ticket 06 §6 defines it as span + 5 % —
so `x_D`, defined on `[0, L]`, has no interval to live in, and §0.8's clamp has nothing to clamp
into. Both plots then render an empty frame with **no axis ticks** and one centred line « Portée
invalide — aucun tracé possible. », and pointer input is inert. This is the **only** state in the
app where the strip is not a pointer path; it is scoped to `L`/`h`/station failures, and it has to
be written down as an exception or someone implements §0.1's rule unconditionally and computes a
scale over a NaN domain.

### 6. Three refusal states, their bounds, and the diagnostic payload

Items 3 and 5 of the question dissolve on measurement: **deep slack converges.** On a 200 m span
with anchor bases at −4 / −2,5 m, `L₀ = 200,5 m` gives coverage 1,000 and `h_min = −7,59 m` with
`contact: "cable"`; `L₀ = 400 m` gives `h_min = −169,67 m`, still `contact: "cable"` (measured on
the §15-verified prototype solver, `src/routes/-prototype-07/solver.ts`). The user-facing surface
for a line lying down is therefore ticket 07 §8's **« Câble au sol »** verdict, not a solver
error. Item 3 answered: neither of its two options — it is a *result*.

| État | Cause | Copie |
| --- | --- | --- |
| **Tension impossible** | §5.4 chord bound; any tightness target above breaking load | « ⛔ Tension impossible — la ligne casserait avant d'atteindre cette tension. Longueur non tendue minimale pour ce câble : 197,40 m · valeur : 190,00 m. » |
| | mode Tension | « ⛔ Tension impossible — … Prétension maximale atteignable : 9 074 daN. » |
| | mode Flèche | « ⛔ Tension impossible — … Flèche minimale atteignable : 0,29 m. » |
| **Cible inatteignable** | `resolveL0` bracket failure for any reason other than rupture | « ⛔ Cible inatteignable — aucune longueur non tendue ne donne cette flèche à vide (6,00 m). » |
| **Calcul impossible** | `solveSpan` `no-convergence` **or** `slack-limit` | « ⛔ Calcul impossible pour cette configuration. Le solveur n'a pas convergé — ce cas n'est pas censé se produire. Modifiez légèrement la tension ou la géométrie. » `[ Copier le diagnostic ]` |

**« Tension impossible » is not a verdict, and it carries no Fix Action.** Measured: the §5.4 floor
**is** the breaking load — floor `L₀ = chord/(1 + MBF/EA) = 197,404 m` on a 200 m level span yields
`T_max = 100,0 % MBF`, and 987,02 m on a 1000 m span yields 101,1 % (bun probe against the
prototype solver, 12 mm IWRC 1770: `w = 0,5465·9,81 N/m`, `EA = 6,90 MN`, `MBF = 90 740 N`;
theory §5.4 at `docs/simulation-theory.md:254-266`). So `invalid-input{field:"L0"}` **never** means
« nombre invalide », and item 1's "presumably prevented rather than reported" framing is wrong for
the one field where it matters: the generic-typo copy would be a lie about the one physics this app
exists to report.

The same measurement kills ticket 04 §7's line 264 — `H_target ≥ MBF` "is not an input error. It
solves perfectly and the verdict says rupture" — because any over-MBF target maps through
`resolveL0` to a sub-floor `L₀` that the same section's pre-check refuses. **No user-facing rupture
verdict is reachable that way**, and the bound is violable in all three tightness modes, not only
in direct-`L₀` mode as line 261 claims. Item 8 is therefore answered *against* its own framing.

No Fix Action, and the reason is not restraint: no unambiguous repair exists, because the bound
*is* a rupture design. Ticket 05 §6's rule — « defensible number ⇒ compute and let the Verdict
judge » — does not reach here: that rule governs *regulatory* refusals with a real installation
behind them (grips at `FS 8,0`), and here there is no installed state to compute. You cannot
tension a rope past its breaking load, so a rupture verdict would report a line that cannot exist.

**The bound is quoted in the driving field's own quantity and unit, and never twice.** In tension
mode the copy states 9 074 daN and *not* « soit L₀ ≥ 197,40 m »: a second equivalent invites the
user to type a length into a tension field, the eyeball-confusion class ticket 05 §8 refused a `kN`
carve-out to avoid. That makes an **engine obligation**, and it is free at a seam ticket 03 already
built — `solveSpan` reports `field: "L0"` with the floor, and `resolveL0` catches it and re-reports
`field: "D_target" | "H_target"` with the bound mapped forward through the same inversion that
failed. With ELECTIONS §0.11's `{ …, bound, boundKind }`, that is everything the copy needs. The
0,29 m figure is the measured minimum attainable flèche at the floor on a 200 m span (0,15 % of
span; 7,21 m / 0,72 % at 1000 m).

**« Calcul impossible » shows no residual, and the `SolveNote`s never surface.** Measured across
349 440 instrumented solves: `reseeded` fired **0** times, the §4.3 near-taut condition
`w·L₀/H < 1e-4` fired **0** times (minimum observed ratio 3,51e-4 — needing ≈3,5× more tension
than the §5.4 floor admits), and damping halved α in 2 114 iterations (0,6 %). 3 792 sweeps
(steel/PA/HMPE × 50–2000 m × `h` to ±0,99 L × `L₀` from 0,2× to 50× the floor × riders 0–1000 kg)
returned coverage 1,000 in **every** case. So a residual read-out would document a number nobody
has ever seen — and §5.3's tolerance is itself L-scaled beyond 1000 m
(`docs/simulation-theory.md:243-252`, implemented at `solver.ts:134`), so it could not be
interpreted without printing its own tolerance beside it. Answering the ticket's closing question:
**no `SolveNote` reaches the UI and no dev panel ships.** Two engine kinds share one surface
because ticket 08 §6's discipline is that a state earns its own presentation when it maps to a
*different user action*; these two map to the same non-action.

The clipboard payload is **plain text, English keys, full float precision, decimal point** — it is
evidence, not UI copy, and rounding it to §0.6's display grain would destroy the thing it exists to
carry. It contains **no terrain**, which is not an omission: ticket 03 made `solveSpan`
terrain-free and clearance a reducer above it, so a solve failure is fully reproducible without the
200-row trace.

```
scoutech diagnostic — 2026-08-12T14:22:09.114Z — build <version>
kind        no-convergence
attempts    5
residual    3.4170e-4
tolerance   1e-6
notes       damped×12  reseeded×0  near-taut-fallback×0
[resolveL0] mode=sag  target=6
[solveSpan] L=150  h=-18  L0=151.6440231  w=5.361164  EA=6900000
            loads=[{x:75,P:1177.2}]
[material]  family=steel  d=12  R0=1770  cst=iwrc  MBF=90740  overrides=none
[address]   /?v=1&u=daN&use=perm&reg=en15567&L=150&h=-18&...
```

`[address]` reads « (non partageable — tracé hors budget) » where ticket 09 §6 would refuse the
link, so the payload never silently omits a field.

**All three engine kinds stay as guards, and the test plan must inject them** — a forced iteration
cap or a stub. Measured, they are unreachable inside the admissible envelope, so no fixture finds
them naturally. The same obligation covers `Indéterminé`.

### 7. The culprit table in full — static, keyed by (quantity × mode), never inference

Invariant 1's mechanism, and the answer to the attribution problem inherited from ticket 06 §7.
The message and its Fix Action anchor to the **first** culpable field in table order; other
culprits get the error outline only; the `Valeurs déduites` read-out shows the offending value
marked.

| Grandeur | Mode | Champs responsables (dans l'ordre) |
| --- | --- | --- |
| `L` | manuel | Portée |
| `L` | importé | Station A, Station B |
| `h` | manuel | Dénivelé |
| `h` | importé | Station A, Station B, Hauteur d'ancrage A, Hauteur d'ancrage B |
| `L₀` | mode Longueur | Longueur non tendue |
| `L₀` | mode Flèche | Flèche à vide cible |
| `L₀` | mode Tension | Prétension cible |
| `MBF` | acier, non surchargé | Diamètre nominal, Grade, Construction |
| `MBF` | acier, surchargé | Charge de rupture *(le champ lui-même)* |
| `EA` | acier, non surchargé | Diamètre nominal |
| `EA` | acier, surchargé | Raideur axiale *(le champ lui-même)* |
| `EA` | textile | Raideur relative `k`, Charge de rupture |
| `μ`, `w` | acier, non surchargé | Diamètre nominal |
| `μ`, `w` | acier, surchargé | Masse linéique *(le champ lui-même)* |
| `μ`, `w` | textile | Masse linéique |

Two rules the material rows establish, which is why ticket 05's fields need no new machinery:

- **An overridden derived value is its own culprit.** Override turns the read-out into an editable
  field (ticket 05 §5), so attribution collapses to identity — the row exists only to say so, and
  to keep the two modes visibly parallel in review.
- **The steel rows follow §13.1's formulas, not the field group.** `MBF = K·d²·R₀/1000` depends on
  all three inputs, but `EA = E_app·C·d²` and `μ = W·d²/100` depend on `d` **alone**, since
  `E_app`, `C` and `W` are pinned midpoints and not construction-indexed (ticket 05 §2). Listing
  Grade and Construction as culprits for `EA` would send a user to two fields that cannot move the
  number.

The table carries rows **only for quantities with a hard check**. `flèche à vide`, `H à vide`,
`tension permanente % MBL`, `corde` and `FS effectif` have none — they are solve outputs judged by
warnings and by the verdict, so they never need a culprit.

Rejected: a dependency graph. The mapping is tiny and mode-indexed and has to be reviewable beside
the field table ticket 10 assembles. Ticket 04 §3 makes exactly one tightness quantity state per
mode, so the table has one row per mode **by construction** — the same drift argument already
accepted for ticket 04 §3's prefill and ticket 09 §1's presence-encoded driver.

### 8. A stale Override badge is derived on load — and compared at display precision

Ticket 09 §1 has no staleness key, so a link from a sender whose override was stale arrives as a
plain override: the recipient sees a 12 mm breaking force on a 16 mm rope with no badge, which
ticket 05 §5 names as the worst thing to hide, since `MBF` drives the Verdict. Settled: **on every
load and every link arrival, each override is compared against the formula for the current
`(d, R₀, construction)` and badged if it differs.** This generalises the ticket's inherited item 4
from *invalid* state arriving to *stale* state arriving. Copy per §0.9, « maintenant » dropped:

```
Charge de rupture  [ 9074 ] daN   valeur saisie
  ⚠ la formule donne 16 129 daN                      [ Recalculer ]
```

**The comparison runs at the field's display precision, never on floats.** Ticket 09 §3 writes the
*displayed* value into state, so a freshly created override holds 9074 daN while the formula yields
9073,98 — float equality would badge every override on every load, which is a badge that means
nothing. Derived, not carried; rounded, not exact. Non-blocking, as ticket 05 fixed it.

### 9. Import failures: seven inline, one hint elsewhere, and the file that survives

The seven blocking kinds render **inline under the file control** in `Paramètres › Géométrie`
(ELECTIONS §0.5c) with `[ Choisir un autre fichier ]`, and **never** in the banner slot — nothing
about the current line changed. **A rejected file leaves the current terrain untouched**: manual
geometry or a previously loaded trace both survive. Destroying it would turn a rejected import into
data loss, which is ticket 06 §5's retain-and-restore rule read one step further.

Every message is **prefixed with the file name** — the user may have picked the wrong file of
several — and `colonnes-manquantes` **names what it did read**:

| Kind | Copie |
| --- | --- |
| `colonnes-manquantes` | « profil-2.csv — colonnes Distance et Altitude introuvables (colonnes lues : D, Z). » |
| `aucune-donnée` | « profil-2.csv — le fichier ne contient aucune ligne de données. » |
| `trop-peu-de-points` | « profil-2.csv — au moins 2 points sont nécessaires. » |
| `valeur-non-numérique` | « profil-2.csv — valeur illisible ligne 47, colonne Altitude. » |
| `distance-non-croissante` | « profil-2.csv — la distance décroît à la ligne 112. » |
| `distance-dupliquée` | « profil-2.csv — deux altitudes à la même distance, ligne 88. » |
| `lecture-impossible` | « profil-2.csv — impossible de lire le fichier. » |

The non-blocking « ⚠ Distances peut-être en km plutôt qu'en mètres ? » belongs to ticket 08 §9's
**terrain provenance block**, since that file *was* accepted and the hint qualifies terrain now in
use. The split across two surfaces is structural rather than cosmetic: a blocking failure has no
scenario to disclose.

Recorded because it will otherwise read as dead code: the km hint is reachable **only for
hand-authored files**. Ticket 06 §8's sub-20 m duplicate-`Distance` rule (`Distance` written to
0,1 m, spacing `length/199`) rejects any geoportal trace short enough to trigger it as
`distance-dupliquée` first. It is kept for exactly that case, which is ticket 16's denser-terrain
escape hatch.

The typed-blocks / dragged-clamps asymmetry inherited from ticket 06 §7 needs **no machinery in the
error model at all**: clamping produces no error state, so the asymmetry lives entirely in the
input handler. §12's `x_D` note is the one place a clamp speaks, and it speaks as a note, not an
error.

### 10. Coarse terrain stays ⚠ — and the frequency claim is arithmetic, not observed

Confirmed at **⚠**, inside the always-visible terrain block, with ticket 16's per-export sentence
intact (« L'export du géoportail est limité à 200 points quelle que soit la longueur : ré-exporter
ne changera rien. »). Below 5 m the spacing line stays plain: « 200 points · pas max 0,9 m ».

Ticket 08 §8 defined the *ambient* tier by a specific property — it fires **always**, so an alarm
would mean nothing (textile `k`, on 100 % of textile lines by construction). This warning is
conditional on a design choice the user controls: spacing is `length/199`, crossing 5 m at ≈995 m
span. And the two name different kinds of thing — ambient names a coefficient whose uncertainty is
already visible in another read-out, while this names a **blind spot in garde au sol**, the app's
primary output. Demoting it would put the only disclosure of an unseen-terrain risk in plain text
beside a green verdict, exactly what ticket 08 §4 refused for the DAF.

**State explicitly that the frequency claim is arithmetic, not observed.** All three repo traces
are ≤ 224 m (`docs/references/example-profile-trace{1,2,3}.csv`, 183,4 m / 224 m / 188,4 m, 200
rows each), so **nobody has ever seen a coarse file** — the ≈995 m threshold is division, not field
experience, and the spec must say so or the claim reads as measurement.

The counter-argument — a warning firing on half the stated range trains the blindness ambient
exists to avoid — is answered by the frequency being over the *range*, not over one user's work: an
operator building 200 m lines never sees it, and the one building 1500 m lines should see it every
time, because it is true every time.

### 11. « Résultats sans régime » — a neutral strip, and the four rows are absent

The prompt is a **neutral strip: no colour, no icon**, deliberately not the verdict's chrome —
« Choisissez un régime de sécurité pour obtenir un verdict. » `[ Choisir un régime ]` focusing the
picker. Colouring the absence of a judgement would *be* a judgement, and three of ticket 08's five
verdict states are not-pass, so a coloured band reading anything at all invites a wrong read of a
screenshot.

`Résultats` renders a distinct **« sans régime »** shape: the headline reduces to the two
regime-free values, and the four regime-dependent rows (`FS effectif`, `Réserve de tension`,
`T adm ancrage A`, `T adm ancrage B`) are **absent, not dashed** (ticket 14 §5 overriding this
ticket's round-1 dash proposal), replaced by one line pointing at the picker:

```
── RÉSULTATS ─────────────────── sur toute la traversée ──
T max             817 daN      ancrage A, passager à x 74 m
Garde min        2,44 m        passager à x 74 m

Choisissez un régime de sécurité pour obtenir FS effectif, réserve de
tension et tensions admissibles.                    [ Choisir un régime ]
```

Dashes are the wrong idiom, and a bare `FS effectif 8,80` with no requirement beside it is **worse
than hiding it**: §10.1 forbids blending and ticket 08 refused a free `k`, yet a lone safety factor
invites the reader to supply their own. Accept the block growing when a regime is picked — that is
honest feedback on a deliberate act. Everything rider-free stays complete; the aggregate reads
« ⚠ 4 valeurs sans référence normative confirmée » with no regime line pinned yet.

The objection is real and answered rather than dismissed: a neutral strip is easy to ignore, and
ticket 14's first run opens in exactly this state, so a user may never discover why no verdict
appears. The button in the strip is the discovery path, and it is a better one than a coloured
warning about a line that has nothing wrong with it.

### 12. `Indéterminé` punches holes in the scrub track — and « — » is legal only there

**Coverage renders as `résolus / grid.length`, and the denominator is 260, not 240.** Verified here:
`sweepGrid(151.644, 240).length === 260` and `sweepGrid(1000, 240).length === 260`
(`src/routes/-prototype-07/solver.ts:235` — 240 uniform steps plus 10 geometric tail steps per end,
endpoints excluded). Ticket 08 §2/§6's « Couverture 240 / 240 pas » and « Indéterminé — 209 des 240
pas résolus » are therefore wrong by construction: a fully solved sweep would read 260/240.
Amended copy: **« Indéterminé — 209 des 260 pas résolus »**.

Ticket 07 §2 made the clearance curve the scrub track and ticket 03 §6 makes failed steps a sparse
`failures[]`, so under coverage < 1 the track has **gaps** and the rider can be parked in one:

- Gaps are drawn as an **explicit discontinuity** — the curve is broken, never interpolated across,
  with the gap's x-interval hatched in the axis gutter. Not a tint: ticket 07 §7 reserved tint for
  danger, and a second tint meaning « inconnu » would compete with the one meaning « dangereux ».
- **Pointer input skips them**: a drag crossing a gap snaps to the nearest *solved* step, so no
  pointer path can leave the rider in a hole.
- A **typed `x` inside a gap gets ticket 07 §4's exact §6.1-case-2 solve** (~40 µs), which may
  succeed where the swept step failed — different conditioning, different seed. If that solve also
  fails, the five cells read **« — »**, and this is the **only** place that glyph is legal:
  attempted and unavailable, exactly what ticket 08 minted it for.

**`x_D`'s clamp, and its note.** `x_D` gains a row in ticket 04's field table (Passager,
« Position du passager », `x_D`, m, hard `0 ≤ x ≤ L`, no warning, initial = mid-span) and it
**clamps on every path — geometry change, link arrival and typed input** — because `x` selects a
view, not a design input, and refusing to draw a valid span because the viewpoint is stale is worse
than moving the viewpoint. Ticket 06 §7's typed-blocks rule is deliberately excepted here, and the
exception is **not silent**:

```
Position du passager  [ 150,0 ] m
  position ramenée à la portée : 0 – 150,0 m
```

That satisfies never-discard-silently without inventing a blocking error for a viewpoint, and the
clamped value is what the debounced write puts in the URL.

### 13. The link surfaces: the ignored-keys strip, the completion sentence, the refusal page

**The ignored-keys strip** is a dismissible **full-width strip above rail and charts** — not the
banner slot, because it is about the link and not the line, and it must never be able to hide a
verdict. Shown once at load, naming **each dropped key with its reason** and stating the rewrite:
« ignoré » alone cannot distinguish the sender's typo from a contradiction, so each key says which
it was.

```
Une partie du lien a été ignorée : clé inconnue « xy » ; « za » n'était pas
un nombre (hauteur d'ancrage A ignorée).
Champs absents du lien, complétés depuis le scénario par défaut :
masse du passager 120 kg · enveloppe passager 2,1 m · coefficient dynamique 1,2.
L'adresse a été corrigée pour indiquer les valeurs utilisées.          [ ✕ ]
```

The two salvageable kinds are **an unknown key** and **an unrepresentable value**; a contradictory
*pair* of keys is not salvageable and refuses the link whole (see below).

Manual dismissal only, no auto-hide. **Dismissal lasts for the page load and nothing longer**, in
component state: ticket 13 §4 computes the strip client-side on first mount from the raw query
string, *before* the rewrite `replace` fires, so after the rewrite a reload of the now-clean URL
produces no strip at all — there is nothing left for persistence to suppress, and a per-URL
dismissal map would be Session surface nobody owns. Mount order is settled by ticket 13 and has no
race: (1) the store's lazy initialiser reads the Session or ticket 14's defaults, (2) ticket 09
§7's precedence lets any recognised key win wholesale, (3) the mount effect diffs raw keys and
produces both the strip and the rewrite. **A successful Session restore announces nothing** —
ticket 09 §7 makes bare `/` *mean* « restore the session », and a notice for the defined normal
case is noise.

The second sentence is ticket 14 §8's completion, and it **names the values, not just the fields**,
so the recipient can read every number they got — which is the whole answer to the
fifth-meaning-of-absence objection.

#### A multi-driver link refuses whole — an amendment to ticket 09 §4

The round-1 elections left one composition unowned, and settling it **amends ticket 09 §4's table
row**. That row reads « `fl` et `te` tous deux présents ⇒ les deux ignorés, bandeau », which was
written before ticket 14 §8 elected completion-from-defaults. Composed, the two rules do this: both
drivers are dropped, no driver key remains, completion supplies the **default Flèche 6,0 m** — and
the recipient reads a line whose *tension came from our defaults*, in the one quantity that scales
every tension in the criteria grid.

Settled: **two or more tightness drivers present ⇒ refuse the link whole**, through the same
`errorComponent` path as an unknown `v`, reason line
**« flèche, prétension et longueur non tendue : deux valeurs de tension dans le même lien »**.

This is not an override of ticket 09 §0 but an **application** of it. §4's own criterion is that
individual keys are dropped « only when the remainder still describes a complete line »; with no
driver the remainder does not describe a line at all — its tension is unspecified, and anything the
app supplies is a scenario **neither party ever saw**, which is the precise failure §0 exists to
prevent. The elected drop-and-report was the right answer while absence meant nothing; once absence
became completable it stopped being one. Note the same argument does *not* reach the other salvage
rows: an unknown key removes nothing the line needs, so dropping it and saying so still leaves a
complete line.

The rule generalises past the `fl`/`lo` pair the election happened to name — `fl`+`te`, `te`+`lo`
and all three together are the same fault, because ticket 09 §1 encodes the driver **by which key is
present**, so two present keys are not a bad value but *two contradictory models of the same line*.

Consequence for the strip copy above: the `fl`/`lo` example the election quoted is gone from it,
because that case no longer reaches the strip at all. The strip keeps its per-key contradiction
idiom for the two kinds that do stay salvageable, which is why each dropped key still says **which**
kind it was.

**The refusal page** is the *index* route's `errorComponent`, full-viewport inside ticket 13's
shell, and it arrives at **HTTP 200 after a Skeleton frame** — measured by ticket 13: `ssr: false`
returns 200 where a thrown `validateSearch` under SSR renders the same refusal at 500. Two
consequences for the copy. It must **name the link, never the app or the network** — no « erreur de
chargement », no « échec », because nothing failed to load and the status line agrees. And it
renders **in the frame the Skeleton occupied**, so the transition reads as the page resolving
rather than as an error interrupting a load.

```
Ce lien ne peut pas être ouvert.
Version de schéma inconnue (v = 3).
                                        [ Ouvrir l'application sans ce lien ]
```

Reason lines, one per refusal cause: « version de schéma inconnue (v = 3) » · « tracé illisible » ·
« tracé trop volumineux pour cette adresse » · **« flèche, prétension et longueur non tendue : deux
valeurs de tension dans le même lien »** (the multi-driver case above). **No « ouvrir malgré tout »** — ticket 09 §0's whole-or-nothing
rule forbids offering a partial read, and ticket 06 makes `L`/`h` derived, so a trace-less
application of an imported link would fabricate geometry the sender never entered. The action is
labelled by its **effect** per invariant 2: « Ouvrir l'application sans ce lien », not « Ouvrir
l'application vide » — the app is not empty, it opens on ticket 14's first-run scenario, and
promising emptiness would be the one wrong thing to say about the screen that follows.

### 14. Jump links, Fix Actions, and the narrow-screen reflow

**Fix Actions are a general affordance of the error component** — four instances now (ticket 04's
family gate, ticket 06's `Inverser A et B`, ticket 08 §5's regime gate, and §10.4's second repair)
— and their labels describe the **effect of pressing them**: « Passer à l'acier », « Passer en
usage temporaire », « Inverser A et B », « Choisir un autre régime », « Recalculer ». The audit's
counter-proposal of destination nouns (« Ligne en acier ») is rejected: the rule that matters
constrains *messages*, and a verb naming the effect is accurate whether the state was entered or
arrived.

The §10.4 gate offers **two** Fix Actions, `[ Passer à l'acier ]` first (ticket 04's conservative
branch) and `[ Passer en usage temporaire ]` second. For an arrived link neither repair is
privileged, and withholding the second forces a recipient to discard the Material Spec the link was
sent to show them — the exact silent loss ticket 04 refused. Ticket 08 §5's unnamed fix becomes
`[ Choisir un autre régime ]`: a **focus** action, not a value-setting one, since no single correct
regime exists.

**One jump primitive serves all of them**: scroll the target's rail section into view, force-open it
if collapsed, then move DOM focus to the field or control, with `scroll-margin-top` reserving the
pinned header's height so the target never lands underneath it. `[ Choisir un régime ]` focuses the
picker **without opening it** — opening a popup from a remote button covers the context the user has
just travelled to. The banner's jump link is a **button, not an `<a href="#…">`**: ticket 13 §8
makes the URL write-only after load, and a hash would put a fragment into an address bar the app
rewrites.

**Narrow screens (ticket 15).** The error surface's placement is layout-independent, and two rules
make it so: a **blocking error force-opens and pins its rail section**, and its Fix Action is
reachable at every width — otherwise the app's only blocking states can be invisible while the
chart draws, including on the first frame after following a link. Ticket 15 §2's pinned two-row
safety header carries the banner slot under §3's precedence, so it may hold a blocking-error
summary or « Saisie en cours » rather than only a verdict. The two mechanisms compose with no
special case: the jump link scrolls into the rail, which is itself ticket 15 §2's collapse trigger,
so pressing it produces exactly the layout the message needs.

### 15. What this hands forward

| Ticket | Obligation created here |
| --- | --- |
| [Engine API and execution model](./03-engine-api-execution-model-and-module-layout.md) | **Amended twice.** `invalid-input` becomes `{ kind, field, value, bound, boundKind: "min" \| "max" }` (ELECTIONS §0.11) — without the bound, « Tension impossible »'s only actionable copy is unwritable. And `resolveL0` must **re-report the bound in the driving quantity**: it catches `solveSpan`'s `field:"L0"` floor and re-emits `field: "D_target" \| "H_target"` with the bound mapped forward through the same inversion that failed. Test plan: `no-convergence`, `slack-limit` and `Indéterminé` are **unreachable in the admissible envelope** and must be injected (forced iteration cap or stub), not hunted for with pathological inputs. |
| [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) | **Amended.** §7's FORM tier becomes §1's three gates; « régime choisi » is struck from it (it never blocks a solve); `m_p` joins the Solve Gate, `h_rider` the Clearance Gate, `DAF` the Verdict Gate. §7's line 264 (`H_target ≥ MBF` "is not an input error… the verdict says rupture") and line 261 ("only user-violable in direct-`L₀` mode") are **both false and must be struck** — measured, the §5.4 floor is the breaking load. `x_D` gains a field-table row (Passager, hard `0 ≤ x ≤ L`, clamps on every path, initial mid-span). |
| [Material spec model](./05-material-spec-model.md) | The stale Override badge is **derived on every load and link arrival**, never carried, and compared **at display precision** rather than as floats. §5's badge copy drops « maintenant »: « valeur saisie — la formule donne 16 129 daN » `[ Recalculer ]`. §7's culprit attribution is fixed by §7's table, including that `EA` and `μ` depend on `d` alone while `MBF` depends on all three steel inputs. |
| [Results panel](./08-results-panel-and-provenance-warnings.md) | **Copy amended**: the coverage denominator is `grid.length` = **260**, so « Couverture 260 / 260 pas » and « Indéterminé — 209 des 260 pas résolus ». `Indéterminé` additionally punches **gaps in the scrub track** (§12). The coarse-terrain warning is **confirmed at ⚠**, with its frequency stated as arithmetic rather than observed. « — » is reserved to `Indéterminé` and may not be reused for absent or blocked values. §5's regime blocking error gains `[ Choisir un autre régime ]`. |
| [URL state schema and persistence](./09-url-state-schema-and-persistence.md) | The refusal reason lines and the ignored-keys strip are worded here (§13). **Flagged**: §4's `fl` + `lo` row composes with ticket 14 §8's completion into a silently defaulted tightness driver — refusal recommended, not written. |
| [App shell and routing shape](./13-app-shell-and-routing-shape.md) | The refusal page's copy must read correctly at **HTTP 200 after a Skeleton frame**: it names the *link*, never the app or the network, and renders in the frame the Skeleton occupied; its action is « Ouvrir l'application sans ce lien ». The ignored-keys strip needs the raw query string on first mount, before the rewrite `replace`; its dismissal is component state and **must not** be persisted. |
| [First-run scenario and defaults](./14-first-run-scenario-and-defaults.md) | « Saisie en cours » renders per §4, including the **suspended URL and Session writes** and the disabled « Copier le lien ». The completion sentence names **values, not just fields**. `m_p` is a Solve Gate input, so the shipped 120 kg is what keeps the opening screen solvable at all. |
| [Responsive and narrow-screen layout](./15-responsive-and-narrow-screen-layout.md) | A blocking error **force-opens and pins its rail section**; the pinned safety header carries the banner slot under §3's four-rank precedence; under « Aucun résultat » the five-cell row is replaced by **one spanning line** that preserves its height. |
| [Assemble the v1 build spec](./10-assemble-the-v1-build-spec.md) | Carry §0's four invariants verbatim — they are the spec's error contract. Carry the three-gate table (§1), the per-field message table (§2), the banner precedence and per-gate summaries (§3), the three refusal states with the diagnostic payload (§6), the culprit table (§7) and the 260 denominator (§12). CONTEXT.md terms coined here: **Blocking Error**, **Fix Action**, **Champ responsable / Culpable Field**, **Tension impossible**, **Cible inatteignable**, **Calcul impossible**, **Saisie en cours**, **Aucun résultat**, **Résultats sans régime**, **Solve / Clearance / Verdict Gate**. And one dependency to record: the stale-badge comparison **consumes** the display-precision table, so a missing row there is not a formatting gap — it is a badge that fires on every load. |

**Inherited from [App shell and routing shape](./13-app-shell-and-routing-shape.md)** — three
measured facts about the link surfaces this ticket designed, none of them carried above.

1. **The ignored-keys strip can only ever name keys the client received.** Measured by ticket 13
   §5/§6: a validator that returns `{ key: undefined }`, or that runs under `search.strict`, makes
   the *server* 307 the offending key away before any client code runs — even under `ssr: false`.
   There is no other transport, so a malformed key of that shape is never reported at all; it is
   simply gone from the URL the client ever sees.
2. **The Skeleton's one `<noscript>` line is this ticket's to word.** Ticket 13 §3 proposes
   « Ce simulateur nécessite JavaScript pour fonctionner. » and reserves the rewording to this
   ticket — with JavaScript disabled the app is a Skeleton forever and otherwise says nothing.
3. **The Skeleton reserves the banner band's height and paints nothing in it** (ticket 13 §3): no
   border, no fill, no text. That is what makes §3's precedence table's first real occupant land
   with no reflow on hydration — reserving height is layout, painting a band is a statement.

**Inherited from [Responsive and narrow-screen layout](./15-responsive-and-narrow-screen-layout.md)**
— two figures the sizing decisions above rest on.

- **The pinned safety header's banner slot is 44–76 px of content height and reduces to a single
  line while the soft keyboard is open** (ticket 15 §3.A, §6) — the concrete sizing behind §3's
  four-rank precedence.
- **The ignored-keys strip costs 60 of the 124 px of resting rail at 390 px** (ticket 15 §3.A: a
  664 px viewport nets 540 + 124 px, `MIN_RAIL`; with the strip up the rail's resting height drops
  to 64 px). That arithmetic is the actual justification for §13's "manual dismissal only": the
  strip is affordable exactly because it can be removed and because the Chart Block collapses on
  the first scroll.
