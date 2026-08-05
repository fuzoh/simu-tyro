# Material spec model — deriving MBF, EA and mass for steel and textile

Type: grilling
Status: resolved
Blocked by: —
Map: [Zip-line simulator v1](../map.md)

## Question

What does the user type to describe the cable or the rope, and what does the app compute
from it?

The map's scope decision is **formula-derived with raw override, zero shipped product
presets** — `docs/simulation-theory.md` §13.2 warns that every product row in both research
runs is compromised and must be re-pulled before shipping. So the app derives from attested
formulas and lets the user override any derived value.

Settle:

1. **Family A — steel wire rope (§13.1).** The input fields: nominal diameter `d` (mm),
   grade `R₀` (1770 / 1960 N/mm²), construction class (6×19 fibre core `K = 0.330` versus
   steel core `K = 0.356`). Derived: `MBF [kN] = K·d²·R₀/1000`. Then `EA = E_app·C·d²` with
   `E_app ≈ 100–130 GPa` and metallic-area factor `C = 0.384–0.449`, and mass per metre from
   the nominal-mass factor `W = 0.359–0.400`. Every one of those is a **range**, not a
   number. Decide what the app defaults to inside each range, how the range is surfaced, and
   whether the user picks a point or the app shows a band. Note the §13.1 warning that
   [R1]'s per-diameter table is inconsistent with the K-factors and its EA column implies a
   modulus above solid steel — do not resurrect it.
2. **Family B — textile rope (§13.2).** The stiffness convention is `EA = k·MBL`, never a
   fibre modulus. Input fields: rope class (12-strand HMPE, EN 1891 Type A polyamide,
   polyester semi-static), `MBL`, diameter, mass per metre, and `k`. Decide the defaults per
   class: HMPE `k ≈ 22 at 10 % MBL` rising to `≈ 31 at 30 % MBL` — which means **`k` depends
   on the working load**, so decide whether the app iterates or just asks the user to pick a
   band. Polyamide `k ≈ 1.5` at the CE band, with the §13.2 open gap that this value
   under-stiffens the model at highline working loads well above the CE band. That gap is
   real and unresolved (§16 item 6) — decide how the UI admits it.
3. **Terminations.** §10.2 for steel: socket 1.00, ferrule/Flemish eye 0.90, spliced eye
   0.80, U-bolt grips and wedge socket 0.80 with a **regulatory warning** that grips shall
   not be used where the rope supports persons. §10.3 for textile: sewn/spliced eye
   0.90–0.95, figure-eight 0.60–0.80 defaulting to the conservative 0.60, bowline 0.55–0.70,
   and knots on HMPE **prohibited** (0.25–0.50, it slips). Decide whether termination is a
   picker per end or one for the whole line, and how the prohibition and the grips warning
   are enforced — block, or warn loudly?
4. **The override.** Every derived value (`MBF`/`MBL`, `EA`, `μ`) is overridable per the
   scope decision. Decide the interaction: does overriding a derived field detach it
   permanently, show a "modified" state, and offer a reset? What happens to the override
   when the user then changes `d`?
5. **Family switching.** What happens to the form when the user flips family, and how the
   §10.4 use-class gate (`PERMANENT` ⇒ steel only) presents itself — a disabled option with
   an explanation, or an error after the fact.

## Context

Read `docs/simulation-theory.md` §13 in full, plus §10.2 and §10.3 for terminations, §9.2
for the 30 % MBL creep cap on textile, and §14 rows 8, 14 and 17 for the arbitrations that
killed the product tables.

Honour the binding provenance rule from the map: `[CONVENTION]`, `[PAYWALLED]` and
`[UNVERIFIED:R1]` values are labelled, configurable and warned. In this ticket that covers
most of the sheave and efficiency numbers, and the whole textile `k` story.

Pairs with [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) —
that one owns geometry and rider, this one owns the line. Keep the boundary clean.

## Answer

Resolved by grilling, 2026-08-05. The two blocks below are the contract for the **Ligne**
group; tickets 08, 09, 10 and 14 read the line from here, exactly as they read geometry and
rider from ticket 04.

### 0. The governing asymmetry

**Steel derives from geometry. Textile transcribes from a datasheet.**

§13.1 gives a closed formula chain from `d`, so the steel block has three inputs and three
derived values. §13.2 gives no `MBL(d)` and no `μ(d)` — only the stiffness convention
`EA = k·MBL` — so the textile block has four inputs and exactly one derived value. Every
decision below follows from that split, including why override is a steel-only concept.

### 1. Ranges produce point values, never bands

`MBF` is clean — `K` is a discrete pick, so `MBF = K·d²·R₀/1000` has no range. The whole
§13.1 range problem collapses onto **one number, `EA`**:

| Quantité | Formule        | Bas        | Haut       | Étendue    |
| -------- | -------------- | ---------- | ---------- | ---------- |
| `MBF`    | `K·d²·R₀/1000` | 90,74 kN   | 90,74 kN   | **aucune** |
| `EA`     | `E_app·C·d²`   | 5,53 MN    | 8,41 MN    | **×1,52**  |
| `μ`      | `W·d²/100`     | 0,517 kg/m | 0,576 kg/m | ×1,11      |

(12 mm 6×19 âme métallique 1770.) That `EA` spread moves `H` by ~5 % and sag by **~0,3 m**
on a 200 m span at 3 % flèche — 0,3 m of garde au sol, and it grows as the line tightens.

**`EA` is nonetheless a single derived scalar** at a documented default, carrying the
«non confirmé» pastille; the popover states the ranges in prose. One Solve, one Sweep, one
Verdict. `SpanState` stays scalar — ticket 03 is untouched.

Rejected: propagating `EA_min`/`EA_max` so every result is an interval. Three reasons.
It re-litigates ticket 03 rather than refining it — two Sweeps, and ticket 08's whole panel
becomes interval arithmetic. `[5,53 ; 8,41] MN` is **not** a confidence interval, it is the
union of two handbook ranges whose joint distribution nobody published, so presenting it as
bounds claims knowledge we do not have. And `MBF` — the quantity the Verdict turns on — has
no range at all, so the band would decorate the sag numbers while the safety factor stayed a
point value regardless.

If the `EA` uncertainty needs to be visible outside a popover, the cheap honest form is a
**sensitivity read-out** in the results panel ("garde au sol 5,9 m à `EA` bas") — ticket 08's
to design, not an engine change.

### 2. Ligne › Câble acier (§13.1)

| Champ (FR)       | Symbole | Unité | Affordance                                                                  | Dur    | Avertissement | Initial                                                |
| ---------------- | ------- | ----- | --------------------------------------------------------------------------- | ------ | ------------- | ------------------------------------------------------ |
| Diamètre nominal | `d`     | mm    | numérique                                                                   | `> 0`  | ∉ [6, 26] mm  | → [ticket 14](./14-first-run-scenario-and-defaults.md) |
| Grade            | `R₀`    | N/mm² | select : 1770 / 1960                                                        | requis | —             | 1770                                                   |
| Construction     | —       | —     | select : 6×19 âme textile (`K = 0.330`) / 6×19 âme métallique (`K = 0.356`) | requis | —             | âme métallique                                         |

**Valeurs déduites** (each independently overridable — see §5):

| Valeur | Formule           | Défaut à 12 mm IWRC 1770 |
| ------ | ----------------- | ------------------------ |
| `MBF`  | `K·d²·R₀/1000`    | 90,74 kN (9074 daN)      |
| `EA`   | `E_app·C·d²`      | 6,90 MN                  |
| `μ`    | `W·d²/100`        | 0,5465 kg/m              |
| `w`    | `μ·g` (ticket 04) | 5,361 N/m                |

**`E_app` and `C` are not fields.** The spec pins them at `E_app = 115 GPa` and
`C = 0.4165` — midpoints of §13.1's ranges — stated in the popover text so the number is
reproducible, never as a magic `EA` coefficient. `W` likewise: midpoint `0.3795`.

Rejected: exposing `E_app` and `C`. They only ever appear as a product, so two fields means
two knobs for one quantity, two ways to be wrong, and no independent knowledge of either — a
user who nudges `E_app` to 130 and `C` to 0.449 has taken the corner of a box rather than a
value they can defend. Overriding `EA` directly is strictly more expressive.

Rejected: a free `K` field or a free-numeric grade, for ropes outside 6×19 / 1770–1960.
`K` is `[STD-ATTESTED]` for exactly these two constructions and a free `K` is the invented
constant `docs/conventions/simulation.md` forbids. **The escape hatch is the derived-value
override**: the 6×36 user types their datasheet's `MBF = 102 kN` and `μ = 0,71 kg/m`, which
is better grounded than any extension of the formula would be. Their `EA` stays 6×19-derived
until they override that too — acceptable, because override is per value and each one is
visibly labelled.

`d`'s warning band [6, 26] mm is `[CONVENTION]` — **ours, not §13.1's**. The attested
examples sit at 6 mm, the paywalled EN 12385-4 tables run 10–20 mm, and 26 mm is where
zip-line practice stops. Label it as convention in the UI so it is not mistaken for a
standards range.

### 3. Ligne › Corde textile (§13.2)

| Champ (FR)                | Symbole | Unité                    | Affordance                                                                   | Dur           | Avertissement               | Initial                    |
| ------------------------- | ------- | ------------------------ | ---------------------------------------------------------------------------- | ------------- | --------------------------- | -------------------------- |
| Classe de corde           | —       | —                        | select : HMPE 12 torons / Polyamide EN 1891 type A / Polyester semi-statique | requis        | —                           | HMPE                       |
| Charge de rupture         | `MBL`   | daN _(sélecteur global)_ | numérique                                                                    | `> 0`         | —                           | → ticket 14                |
| Masse linéique            | `μ`     | kg/m                     | numérique                                                                    | `> 0`         | —                           | → ticket 14                |
| Raideur relative `EA/MBL` | `k`     | —                        | numérique                                                                    | `> 0`, requis | ⚠ non confirmé + hors bande | **22** / **1,5** / _aucun_ |

**Valeur déduite**: `EA = k·MBL`, plus `w = μ·g`.

**Diamètre is dropped.** Nothing in the v1 scope consumes it: §13.2 has no `MBL(d)`, sheave
`D/d` is §13.1 and unused by the Verdict, and §12 dynamics are out of scope. A decorative
field would still reach ticket 09's URL schema and ticket 14's defaults while affecting
nothing. A free-text rope _désignation_ is ruled out of scope on the map.

**Classe de corde drives exactly two things**: the `k` default, and the termination
whitelist of §6. Not creep grade — §9 is out of scope.

**Polyester ships `k` blank and `requis`.** §13.2 places it only "between the two" and R1's
`k = 25–35` is refuted (§14 row 8 lineage). A class whose stiffness field is mandatory and
empty states the truth: nobody published it, and this is the one class unusable without a
datasheet in hand.

### 4. `k` — a plain field, no iteration, and a warning that is always on

The decisive finding of this session. §13.2 indexes `k` by working load — 22 @ 10 % MBL,
31 @ 30 % MBL. **A zip line never enters that band.** Computed on a 200 m level span,
120 kg rider, 6 m target flèche (illustrative `MBL`/`μ`, not shipped defaults):

| Classe                        | `k`               | `EA`    | `H` à vide               | `H` chargé              | Flèche chargée |
| ----------------------------- | ----------------- | ------- | ------------------------ | ----------------------- | -------------- |
| HMPE, `MBL` 100 kN, `μ` 0,075 | 22                | 2200 kN | 61,4 daN — **0,6 % MBL** | 626 daN — **6,3 % MBL** | 9,99 m         |
|                               | 31                | 3100 kN | 61,4 daN                 | 669 daN — 6,7 % MBL     | 9,35 m         |
| PA, `MBL` 30 kN, `μ` 0,078    | 1,5               | 45 kN   | 63,0 daN — 2,1 % MBL     | 222 daN — 7,4 % MBL     | **28,24 m**    |
|                               | 18 _(R1, refuté)_ | 540 kN  | 63,8 daN                 | 451 daN — 15,0 % MBL    | **13,91 m**    |

Three readings:

1. **HMPE is insensitive** — the whole §13.2 range moves loaded flèche by 6 %. Not a problem.
2. **PA is brutally sensitive** — a 2× swing in garde au sol, the safety-critical quantity.
   §16 item 6 is not academic.
3. **The operative regime is below the published band.** Textile highlines are strength-sized
   for shock and rescue, not standing tension, so they run an order of magnitude under the
   mooring loads §13.2 was measured at. And since the elongation rows (0,46 / 0,70 / 0,96 %
   at 10 / 20 / 30 % MBL) put the bedding-in toe in the _first_ 10 %, the true secant `k`
   below 10 % MBL is **lower than 22** — the mildest attested value is already optimistic here.

Therefore `k` is a **plain editable numeric with a per-class default**, and the honesty
mechanism is a **result-level warning driven by the computed `%MBL`**:

```
⚠ Raideur hors bande attestée
  k = 22 attesté à 10 % MBL (Samson 872) ; tension calculée 6,3 % MBL.
  Sous 10 % MBL le rodage rend k inférieur ⇒ raideur probablement surestimée.
  §13.2 · lacune §16
```

Rejected: a band selector (`10 % / 20 % / 30 % MBL` → `k`). It offers three choices **none
of which describe the operative regime**, and picking from a menu makes an extrapolation feel
like a calibrated selection.

Rejected: auto-iteration on `k(%MBL)`. It extrapolates a two-point table backwards past its
lowest point and dresses the result as convergence — the exact fabricated-precision failure
§14 rules against. It also has no defensible answer to _which_ tension selects `k`, since the
rider swings tension ~10× between standing and loaded.

**Consequence for ticket 08**: this warning is a **standing condition of textile use**, not
an edge case. Design it as ambient state, not an alarm.

### 5. Override — steel only, per value, stale rather than silent

Textile has **no override affordance**: `MBL` and `μ` are already direct inputs, and `EA` is
a read-out. `k` is the sole source of truth for stiffness.

Rejected: making `EA` writable so it back-solves `k`. It creates a real ambiguity the moment
`MBL` is edited — "my rope has `k = 22`" and "my rope has `EA = 2200 kN`" disagree about what
survives. That is the same semantic-flip objection ticket 04 used to reject three editable
Tightness fields, and §13.2 states the physics as `k` ("never a fibre modulus").

Steel's three derived values override **independently and persistently**:

```
Valeurs déduites
Charge de rupture  [ 9074 ] daN                    ⟳
Raideur axiale     [ 6.90 ] MN   ⚠ non confirmé    ⟳
Masse linéique     [ 0.5465 ] kg/m ⚠ non confirmé  ⟳

— après passage de d = 12 à 16 mm —
Charge de rupture  [ 9074 ] daN   valeur saisie
  ⚠ la formule donne maintenant 16 129 daN · recalculer
```

- Typing into a derived field flips it to a «valeur saisie» pastille with a reset control
  restoring the formula.
- On a change to `d`, `R₀` or construction, overrides **survive** and each gains a **stale
  badge** carrying the new formula value and a one-click «recalculer». **Non-blocking.**

Rejected both alternatives, because both lose information silently — the failure ticket 04
legislated against when it refused the silent family auto-switch. Clearing the override
discards datasheet numbers; keeping it silently leaves a 16 mm rope reporting a 12 mm
breaking force, and `MBF` drives the Verdict, so that is the worst thing to hide.

**Provenance mapping**, including the case where override _removes_ provenance:

| Valeur déduite | Provenance                                         | Pastille                       |
| -------------- | -------------------------------------------------- | ------------------------------ |
| `MBF` acier    | `[STD-ATTESTED]` facteurs `K`                      | **aucune**                     |
| `EA` acier     | plages `E_app`, `C` `[CONVENTION]`                 | toujours                       |
| `μ` acier      | plage `W` `[STD-ATTESTED]`, milieu choisi par nous | toujours — « milieu de plage » |
| `EA` textile   | `k` `[DATASHEET]`, hors bande                      | toujours                       |
| `η_t`          | `[CONVENTION]` sauf manchon 1,00 `[STD-ATTESTED]`  | toutes sauf manchon            |

`MBF` is the only derived value shipping **attested**, so overriding it **downgrades**
provenance: a typed `MBF` gains a «valeur saisie» pastille and **enters** ticket 08's
aggregate list. Mirror image of ticket 04's rule that editing an Unconfirmed Default never
removes it from that list — same principle, since the aggregate tracks "not standards-backed"
whichever direction you arrived from.

### 6. Terminations — one per end, and one rule for prohibitions

§10.1 gives `T_allow = η_t·MBF/k` with a single `η_t`, but a real rig is asymmetric —
socket at the tree, grips at the tensioner. Ticket 03 already reports `T_A` and `T_B`
separately per Sweep Step, so:

**Terminaison A and Terminaison B are separate pickers**, each setting an **editable** `η_t`
(mandatory — every §10.2/§10.3 value is `[CONVENTION]` or a range, so the binding rule
requires it configurable). The Verdict checks worst `T_A` against `η_A·MBF/k` and worst
`T_B` against `η_B·MBF/k` — strictly more correct than `min(η)` against `max(T)`, and free.

| Famille | Terminaison                       | `η_t` défaut | Tag                                  |
| ------- | --------------------------------- | ------------ | ------------------------------------ |
| Acier   | Manchon métal/résine (EN 13411-4) | 1,00         | `[STD-ATTESTED]`                     |
|         | Cosse à sertir / œil Flamand (−3) | 0,90         | `[STD-ATTESTED]`                     |
|         | Épissure (−2)                     | 0,80         | `[STD-ATTESTED]`                     |
|         | Manchon à coin (−6)               | 0,80         | `[CONVENTION]`                       |
|         | Serre-câbles étrier (−5)          | 0,80         | `[CONVENTION]` + refus `[REGULATOR]` |
| Textile | Œil cousu / épissuré              | **0,90**     | `[CONVENTION]`                       |
|         | Épissure longue HMPE              | 0,90         | `[DATASHEET/CONVENTION]`             |
|         | Nœud de huit (PA)                 | **0,60**     | `[CONVENTION]`, plage 0,60–0,80      |
|         | Nœud de chaise (PA)               | **0,55**     | `[CONVENTION]`, plage 0,55–0,70      |
|         | Nœuds sur HMPE                    | —            | **désactivé**                        |

Every range takes its conservative end (§10.3, §14 row 13): 0,90 not 0,95; 0,60 not 0,80.

**The governing rule for prohibitions** — one rule, inherited by tickets 08 and 11:

> If a defensible number exists, let the user compute and let the **Verdict** judge.
> If no number exists, **disable** the option and show the reason.

- **Serre-câbles étrier — selectable, Verdict refuses.** `η_t = 0,80` is attested; "shall not
  be used where the rope supports persons" is `[REGULATOR]`, i.e. _regulatory, not physical_.
  Ticket 04 already fixed that `H_target ≥ MBF` is not an input error — it solves and the
  Verdict says rupture. Grips are the same shape. This is what lets a user model the
  non-compliant installation they have been sent to inspect and be told exactly why it fails.
- **Nœuds sur HMPE — disabled with the reason shown**, exactly ticket 04's §10.4 pattern.
  Not because it is forbidden, but because §10.3's 0,25–0,50 describes a knot that _slips_:
  there is no efficiency to multiply by, so no honest number to compute with.

```
Terminaison B
 (●) Épissure longue
 ( ) Nœud de huit — indisponible
     ℹ §10.3 : sur HMPE le nœud glisse (0,25–0,50).
       Aucun rendement défendable ⇒ épissure obligatoire.
```

Accepted cost, stated so tickets 08/11 inherit it knowingly: the app will render a computed,
plausible-looking result for an illegal rig, relying on the Verdict to carry the refusal.

### 7. Family switching — both specs retained

Ticket 04 fixed the Usage side: textile disabled-with-reason under `PERMANENTE`, and
switching _to_ `PERMANENTE` with textile configured is a blocking error with a one-click
«Passer à l'acier», reasoned as _"would discard the Material Spec the user just built"_.

**The app holds both Material Specs at once.** The family selector chooses which is active;
the inactive one — overrides and terminations included — is retained, so flipping back
restores what you built. This follows from ticket 04's own premise: if discarding a Material
Spec justifies a blocking error, it justifies not discarding it on a voluntary flip. The map
put both families at parity precisely so a user can compare, and comparison is the workflow
a clear-on-flip would destroy.

Three consequences:

- **Refines ticket 04's fix**: «Passer à l'acier» restores a prior steel spec if one exists,
  defaults otherwise. An elaboration, not a contradiction.
- **Retention is session state, not a URL guarantee.** Ticket 09 carries only the _active_
  family's spec; a shared URL described one line, so landing on it and flipping gives
  defaults.
- **A textile→steel flip can raise `invalid-input{field:"L0"}`.** §5.4's bound is
  `L₀ > chord/(1 + T_break/EA)`, and `T_break/EA` is ≈ 0,013 for 12 mm steel (bound
  ≈ 0,987·corde) but ≈ 0,67 for the PA rope (bound ≈ 0,600·corde). So steel→textile never
  invalidates `L₀`; textile→steel routinely can. Presentation belongs to ticket 11 — but this
  ticket creates the state, so it is named here.

Also worth stating: in direct-`L₀` mode a flip keeps `L₀` and the line changes character
completely — same `L₀`, `EA` 6,90 MN versus 45 kN. Correct, but dramatic enough that
ticket 07's chart will look broken to someone not expecting it.

### 8. `MBF` obeys the global force-unit selector

Ticket 04 made the force unit **global, never per-field**, justified by lossless conversion.
This ticket introduces the first breaking load, which is where that decision bites: `MBF` is
quoted in **kN** everywhere (§13.1's attested examples are 12,9 / 14,4 / 21,0 kN; every
datasheet is kN), while French rigging practice quotes tension in **daN**. Under the global
rule, a 90,74 kN datasheet is typed as **9074 daN**.

**Strict global wins.** Rejected: carving breaking loads out to always-kN. That puts two
force units on screen simultaneously — «MBF 90,7 kN» above «tension 437 daN» — and a user
eyeballing whether 437 sits safely under 90,7 is wrong by a factor of 100. Worse error class
than the typo, and _unavoidable_, whereas the typo has a clean escape: switch the selector to
kN and every field converts losslessly, including the one about to be typed. The remedy for
wanting kN is the global control doing its job.

**Consequence for ticket 08**: `MBF` is usually the largest force in the app and tensions the
smallest, so under the daN default they differ by ~2 orders of magnitude in one panel. Render
the Verdict as a **ratio or percentage of allowable**, never a side-by-side of two raw
numbers — the comparison the user needs should not require reading four digits against six.

### 9. What this hands forward

| Ticket                                              | Obligation created here                                                                                                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [08](./08-results-panel-and-provenance-warnings.md) | out-of-band `k` warning as ambient state, not an alarm · per-end allowable (`T_A` vs `η_A`, `T_B` vs `η_B`) · grips ⇒ Verdict non-conformity `[REGULATOR]` · overridden `MBF` enters the aggregate list · Verdict as ratio/% of allowable · optional `EA` sensitivity read-out |
| [09](./09-url-state-schema-and-persistence.md)      | active family's spec only · steel `(d, R₀, construction)` + three optional overrides · textile `(classe, MBL, μ, k)`, **no diamètre** · `η_A`, `η_B`                                                                                                                           |
| [11](./11-validation-and-error-state-ux.md)         | `invalid-input{field:"L0"}` reachable by family flip · stale-badge presentation · disabled-with-reason for HMPE knots                                                                                                                                                          |
| [14](./14-first-run-scenario-and-defaults.md)       | initial `d`, `R₀`, construction, `MBL`, `μ`, terminations · `k` defaults 22 / 1,5 / _blank_ · polyester is unusable without a datasheet                                                                                                                                        |
| [10](./10-assemble-the-v1-build-spec.md)            | carry ticket 04's obligation: `solveSpan`'s pre-check enforces §5.4's chord bound as `invalid-input{field:"L0"}`                                                                                                                                                               |

**Amended `docs/simulation-theory.md` §16** with a new gap entry: HMPE `k` is attested only
at 10–30 % MBL while zip lines operate at ~0,5–7 % MBL, where the bedding-in toe puts the
true secant `k` _below_ 22. Distinct from §16-6, which is PA _above_ the CE band.
