# First-run scenario and default values

Type: grilling
Status: resolved
Blocked by: — (05, 07 resolved)
Map: [Zip-line simulator v1](../map.md)

## Question

What is in the form the first time the app opens, and does a worked example ship?

Graduated from the map's fog once
[Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) fixed the field
list. That ticket deliberately settled every field's label, unit, hard range and warning
threshold but **not** its initial value, because the first screen also depends on the
Material Spec (ticket 05) and on what the visualisation prototype (ticket 07) shows.

Settle:

1. **The scenario numbers.** Portée, dénivelé, hauteur d'ancrage A and B, the default
   Tightness Spec mode and its target value, and the default Material Spec. They must form a
   _coherent, solvable, green-verdict_ line — the first thing a user sees cannot be an error
   state or a rupture warning.
2. **Worked example.** Does a named reference scenario ship (a «charger un exemple» action),
   and if so which? Candidates with real provenance: the SSF Vercors 1109 m instrumented
   line (`[FIELD:SSF]`, §10.1) — but it is textile, so it forces
   `TEMPORAIRE — secours & expédition` and is atypical of the permanent installations the
   app defaults to.
3. **Reset behaviour.** What «réinitialiser» returns to, and whether it clears an imported
   GPX terrain along with the numbers.
4. **Interaction with persistence** (ticket 09). A returning user has a localStorage
   session; a shared link has URL params. Rank the three sources — URL, localStorage,
   first-run defaults — and say what a user sees when the URL is partial.
5. **Empty-field behaviour.** A user who clears Portée is mid-edit, not in an error state.
   Decide whether cleared fields fall back to the default, hold the last valid value, or
   block the solve with the form-tier message from ticket 04 §7.

## Context

Already fixed by [ticket 04](./04-span-and-rigging-parameter-model.md) and **not** open here:

- Masse passager **120 kg** and Enveloppe passager **2.1 m** — the Unconfirmed Defaults must
  be pre-filled; that is what makes them labelled-and-configurable rather than blank.
- Type d'installation defaults to **`PERMANENTE`**, the restrictive branch.
- Régime de sécurité has **no default** — never silently defaulted (CONTEXT.md).
- Force unit defaults to **daN**.

Read the field table in ticket 04 §2 before choosing values, and honour the §3 validity range
(50–2000 m) so the default scenario raises no warning of its own.

**Inherited from [CSV profile import](./06-csv-profile-import-and-anchor-placement.md)** — the
first run has **no imported trace**, so the opening state is manual geometry: typed `L` and `h`
plus the two `hauteur d'ancrage` fields, with terrain as the straight line between the anchor
bases. Two consequences for the scenario chosen here:

- **Garde au sol must be meaningful on first launch.** Ticket 04 made manual terrain a real
  2-point profile precisely so §11 clearance is live before any import — so the default
  `hauteur d'ancrage` pair has to produce a clearance figure worth looking at. A scenario whose
  clearance is either comfortably huge or already violated wastes the app's central read-out on
  first contact.
- **The default `h` and the anchor heights interact.** `h` is typed directly in manual mode
  (ticket 04 rejected deriving it from tower heights, since that would make every metre of
  dénivelé come from a tower), so the two are independent inputs that jointly decide where the
  ground sits relative to the cable. Pick them together, not separately.

Ticket 06's example traces (`docs/references/example-profile-trace1.csv`, 183 m with a 68 m
mid-span dip; `…-trace2.csv`, 224 m) are realistic geometry to sanity-check the chosen defaults
against — a default scenario that looks sensible but that no real trace resembles would be a
poor first impression.

**Inherited from [Results panel](./08-results-panel-and-provenance-warnings.md)** — one more
forced initial value, and one deliberate non-value.

- **`Coefficient dynamique` = 1,2** is pre-filled and **not** this ticket's to choose: §8.2's
  `[FIELD:SSF]` measured ceiling for a controlled step-off. Unlike the other two pre-filled
  values it is **not** an Unconfirmed Default and carries **no « non confirmé » chip** — it is the
  best-attested constant in the reference, merely editable.
- **`Régime de sécurité` stays unset** (« — choisir — »). Three of the five regimes are
  `[CONVENTION]`/`[UNVERIFIED:R1]` and the choice multiplies into every margin, so shipping a
  default regime would pick the user's safety framework for them. The first-run scenario therefore
  opens with **no verdict at all** — a consequence this ticket should confirm it is happy with: the
  first screen shows geometry and clearance, and the verdict appears only after a deliberate choice.

**Inherited from [URL state schema and persistence](./09-url-state-schema-and-persistence.md)** —
one constraint, and one state you inherit rather than choose.

- **First run opens with no regime**, and ticket 09 §5 found that ticket 08's five verdict states
  all presuppose one. So the first-run screen shows **no verdict banner at all**, replaced by
  « Choisissez un régime de sécurité pour obtenir un verdict » — presentation owned by ticket 11.
  Worth knowing while choosing the first-run scenario: whatever numbers ship, the app opens
  verdict-less until the user picks a regime, and that is deliberate (ticket 04 §8), not a gap to
  paper over with a default.
- **Every default you choose is *stated* in a shared URL, never omitted.** Ticket 09 §4 rejected
  `stripSearchParams` partly because `mp=120` and `hr=2.1` are Unconfirmed Defaults and a link
  must record what the sender actually computed with. Consequence: a default's value is
  URL-visible from day one, so changing it later changes no existing link.

## Answer

Resolved by grilling over two rounds, 2026-08-12. **Every number below was measured, not
estimated** — see §1 for how. The load-bearing finding is that the first-run scenario is not a
taste question at all: on manual terrain the app's central output reduces to
`garde ≈ lerp(hauteurs d'ancrage) − flèche chargée − enveloppe passager`, so **dénivelé buys no
clearance whatsoever** and every anchor pair that *looks* like a real zip line opens the app in
« Câble au sol ». The defaults are forced by arithmetic. The second finding is that the shipped
line demonstrates ticket 08 §3's envelope-versus-instant distinction on the first frame, by
itself, with a 5 cm difference between two cells 200 px apart.

### 1. How every number in this resolution was produced

All statics come from **ticket 07's §15-verified prototype solver**,
`src/routes/-prototype-07/solver.ts` (§4.1/§4.2/§5/§6.1/§6.2/§11), whose fixture assertions live
in `src/routes/-prototype-07/check.ts:39-151` (F1, Z1–Z5). Driven under `bun` from throwaway
scripts in the session scratchpad (`t14/scen.ts` — the material chain and the mode-3 `resolveL0`
bisection; `t14/run.ts`, `grid.ts`, `final.ts`, `firstscreen.ts`, `precision.ts`, `vercors.ts`,
`trace.ts`, plus the round-2 re-runs `verify14.ts`, `verify14b.ts`, `verify14c.ts`,
`verify14d.ts`).

Fixed run parameters everywhere below: **`sweep(input, P, 240)`** — 240 uniform steps plus 10
geometric tail steps per end, so **`grid.length === 260`** (`solver.ts:235-247`; ELECTIONS §0.10's
denominator, re-verified here: `coverage = 1` over `260 pas`, first and last step at `x` 0,005 and
149,995 m) — and **`evaluateClearance(…, 60)`**, 60 samples per step. `m_p` 120 kg
(`P` = 1177,2 N), `h_rider` 2,1 m, `DAF` 1,2, `η_t` 0,90 at both ends. The steel chain was
recomputed from ticket 05 §2 (`05-material-spec-model.md:120-129`), never transcribed: `d` 12 mm,
`K` 0,356, `R₀` 1770 ⇒ **MBF 9074 daN**; `EA = 115 GPa · 0,4165 · d²` = **6,897 MN**;
`μ = 0,3795·d²/100` = **0,5465 kg/m**; `w` = **5,361 N/m** (0,536 daN/m). Matches ticket 05's
table exactly.

Manual terrain is ticket 04 §1's two-point profile: `xs = [0, L]`, `zs = [−za, h − zb]`, expressed
in the anchor-A-top frame.

### 2. The first-run line is 150,0 m · −18,0 m · 12,0 / 12,0 m · flèche 6,0 m, and it is forced

| Champ | Valeur de départ |
| --- | --- |
| Portée `L` | **150,0 m** |
| Dénivelé `h` | **−18,0 m** |
| Hauteur d'ancrage A | **12,0 m** |
| Hauteur d'ancrage B | **12,0 m** |
| Flèche à vide cible `D_target` | **6,0 m** |

Measured (`t14/verify14.ts`): `L₀` **151,644 m** (corde 151,076) · `H` à vide **253,5 daN** ·
`T_A`/`T_B` à vide **263,4 / 253,7 daN** · flèche à vide **6,000 m à x 74,8** · flèche/portée
**4,000 %** · tension permanente **2,90 % MBF** · `T_A`/`T_B` max statiques **817,1 / 793,5 daN** ·
enveloppe DAF **927,9 / 901,5 daN** · flèche chargée max **7,482 m** · **garde min 2,440 m à
x 74,1** (passager à x 73,8), `contact: "none"`, 0 pas en violation · couverture **260/260** ·
FS effectif **8,801 (A) / 9,059 (B)**. No ticket-04 warning fires: 50 ≤ 150 ≤ 2000, |h| ≪ L,
hauteurs < 30 m, flèche/portée 4,00 % > 3 %, `d` 12 ∈ [6, 26].

The three geometry fields are **one decision**, because manual-mode clearance is only about them.
Two sensitivity runs settle it:

| `h` (m) | 0 | −18 | −40 | −60 |
| --- | --- | --- | --- | --- |
| garde min (m) | 2,46 | **2,44** | 2,37 | 2,25 |
| `L₀` (m) | 150,583 | 151,644 | 155,757 | 161,998 |

| flèche à vide cible (m) | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- |
| garde min (m) | 3,39 | **2,44** | 1,44 | 0,40 |
| flèche chargée (m) | 6,53 | 7,48 | 8,48 | 9,52 |

Read them together: **44 metres of dénivelé move garde by 21 cm; one metre of flèche moves it by a
metre.** Dénivelé tilts the chord and the ground plane by the same amount, so it cancels out of the
difference; only the anchor heights and the loaded sag survive. That is why 2,44 m is the figure
worth shipping — near the practical minimum *and* visibly elastic, so the first parameter a user
touches moves the app's central output metre for metre.

Equal 12 m heights put the minimum at **x 74,1**, mid-span, where the flèche explains it.
Asymmetric hauteurs 12/10 shove it to **x 84,2 and down to 1,39 m** (measured) — the minimum
migrates toward the low end as the ground plane tilts against the sag, and the user loses the
visual explanation.

**The objection, recorded so nobody "fixes" this later.** 12 m platforms at *both* ends read as an
adventure-park tower-to-tower line, whereas the repo's real traces are gorge crossings (trace1
dips 66,3 m below its own ground chord). The intuitively realistic pair is A 12 m on a platform,
B 6 m at the arrival — and it does not work:

| Scénario | garde min | contact |
| --- | --- | --- |
| 150 / −18, hauteurs 12/6, flèche 6,0 | **−1,04 m** | `rider` |
| 150 / −18, hauteurs 10/4, flèche 6,0 | **−3,04 m** | `cable` |
| 200 / −25, hauteurs 12/6, flèche 6,0 | **−1,53 m** | `rider` |
| 200 / −25, hauteurs 12/6, flèche 8,0 | **−3,33 m** | `cable` |
| 180 / −20, hauteurs 10/4, flèche 6,0 | **−3,32 m** | `cable` |

Every realistic-looking anchor pair opens on **« Câble au sol »** — the one thing this ticket
forbids outright. The cause is not the solver, it is ticket 04 §1: manual terrain **is** a plane,
so a plane is what the defaults must suit. A gorge-shaped scenario needs a Trace, and §9 rules that
out. The honest reading of the shipped hauteurs is therefore "12 m of clear air beneath each
anchor", not "build two towers", and ticket 08 §9's terrain-provenance line is where that gets
said (§13 hands the measured consequence forward).

Also rejected: **raising `h` to make the scenario look like a descent worth riding.** −18 m is
12 % of span, far inside ticket 04's `|h| > L` warning, and the first table shows the clearance
cost of going further is 21 cm — i.e. nothing. The number is chosen to sit in the family of the
real traces (183,4 m / −2,7 m; 224,0 m / −38,6 m; 188,4 m / −5,1 m), not to buy margin.

### 3. The Flèche segment ships active, with 6,0 m as the single editable field

`Tension de la ligne` opens on **Flèche**; `Flèche à vide cible` **6,0 m** is the one editable
field; `Prétension` **253,5 daN** and `Longueur non tendue` **151,64 m** appear as
`Valeurs déduites` read-outs — ticket 04 §3's shape, unchanged.

Two arguments, one of them measured. Sag is the quantity a rigger can verify on site with a tape,
and it is the same quantity ticket 08 promoted to a **validity** read-out (flèche/portée gates
§3.1's parabola rule and fires §8.2's stiffening warning) — so the driving input and the warning
that governs it are the *same number* on the first screen. And it is the only mode whose shipped
value is **exact at display precision**. Ticket 09 §3's rule writes the *displayed* value into
state, so a direct-`L₀` default would have to ship a rounded 151,64 m or 151,6 m:

| `L₀` en état (m) | flèche à vide | `H` à vide | garde min |
| --- | --- | --- | --- |
| 151,6 | 5,79 m | 262,6 daN | 2,64 m |
| 151,64 | 5,98 m | 254,4 daN | 2,46 m |
| **151,644** | **6,00 m** | **253,6 daN** | **2,44 m** |

One decimal costs **0,21 m of flèche and 0,20 m of garde — 8 % of the shipped margin.** Shipping
`Flèche` sidesteps it: 6,0 m is exact, and `L₀` stays a read-out where rounding is cosmetic rather
than state.

**Rejected: `Tension`.** It is the professional framing — a tensioner reads force, and the only
instrumented field data in the whole reference (`[FIELD:SSF]`, ≤ 220/145 daN) is quoted as
pretension — but a force in the driver field on first paint (253 daN) is meaningless until the user
knows the cable, so the first screen's driver would read as an arbitrary constant instead of a
measurable geometric target, and the flèche/portée validity read-out would become a consequence the
user cannot steer directly. **Rejected: `Longueur`.** It ships the rounding problem above, and
practitioners rarely think in unstretched length.

### 4. `Ligne` ships 12 mm / 1770 / 6×19 âme métallique, cosse at both ends, textile blank

Active family **Acier**: `d` **12 mm**, `R₀` **1770**, construction **6×19 âme métallique** ⇒
MBF 9074 daN, `EA` 6,90 MN, `μ` 0,5465 kg/m — **no override anywhere**, because ticket 05 §5's
semantics are « absence = non surchargée » and an override on first run would ship the one
`[STD-ATTESTED]` derived value pre-downgraded. This is the exact chain ticket 05 §2 derived and
pinned in its popover prose (`E_app` 115 GPa, `C` 0,4165, `W` 0,3795), so shipping it makes the
popover's numbers reproducible from the first screen instead of describing a rope nobody can see.

Terminaison A **and** B: **« Cosse à sertir / œil Flamand », `η_t` 0,90.** `[STD-ATTESTED]` under
ticket 05 §6's table (which governs over §5's chip mapping — see §13), the commonest real zip-line
termination, and the conservative choice against the 1,00 socket. Both ends identical, deliberately:
`T_A > T_B` here, so **FS_A 8,80 governs** and the shipped scenario demonstrates ticket 05 §2's
higher-anchor rule without needing asymmetric hardware to do it.

Retained inactive textile spec: classe **HMPE**, `k` **22**, and **`Charge de rupture` and
`Masse linéique` blank and required.** No rope ships. §13.2 compromises every product row in both
research runs, the map's zero-shipped-presets decision is explicit, and — measured — that one
invented MBL *decides the verdict*: 100 kN ⇒ FS 11,94 « dans les limites »; 60 kN ⇒ 7,63
« hors limites » on the same line. Blank-and-required is the treatment ticket 05 already chose for
polyester's `k`, for the same reason: the field states that nobody published the number.

**The consequence is specified, not papered over.** Flipping to `Corde textile` under `TEMPORAIRE`
lands on two blank required fields. That is **not** « Saisie en cours » — see §8: a field the user
never filled is not mid-edit, so it raises ticket 11's blocking errors with the attribution of
11.3's culprit table, and no stale picture is kept.

### 5. The shipped line is allowed to read « Hors limites » under ACCT 10:1

FS effectif **8,80** against `k = 10`. Do not up-size the cable and do not slacken the line to buy
a green under the strictest entry.

| Régime | `k` | `T adm` (ancrage A) | FS effectif | État |
| --- | --- | --- | --- | --- |
| EN 15567-1 | 3,0 | 2722 daN | 8,80 | Dans les limites |
| WorkSafe QLD — tension totale | 3,0 | 2722 daN | 8,80 | Dans les limites |
| WorkSafe QLD — charge suspendue | 5,0 | — | **12,29** | Dans les limites |
| ANSI/ACCT 5:1 | 5,0 | 1633 daN | 8,80 | Dans les limites |
| ACCT 10:1 `[CONVENTION]` | 10,0 | 817 daN | 8,80 | **Hors limites** (réserve −111 daN) |
| Secours textile 10:1 | 10,0 | — | — | indisponible (acier + `PERMANENTE`) |

The suspended-load figure uses the only denominator that makes that criterion bindable —
`η_t·MBF / [DAF·(T_chargé − T_vide)]` = 0,9 · 9074 / 664,5 = **12,29** — against 77 (never binding)
if read as MBF/P. So **total tension governs on the shipped line**, matching ticket 08 §5's prose
about slack versus taut lines. Writing the denominator down is ticket 10's (§13).

Three reasons. The app opens **verdict-less**, so nothing fails on first contact — the state appears
only after a deliberate pick of the entry ticket 08 labelled `[CONVENTION]`, adjacent to its
contradictory `[UNVERIFIED:R1]` twin (ledger #10). Choosing hardware so that a convention passes
turns the shipped Material Spec into an **implicit safety recommendation**, which §10's
« regulatory — not tunable » heading and the map's zero-preset rule both refuse. And the spread
**is** the teaching: one unchanged line reads « dans les limites » at `k = 3` and « hors limites »
at `k = 10`.

**Measured cost of the alternative, which is why it is not close:** `d` 14 mm gives FS 10,79 —
still « Marge faible » at `FS_eff < 1,1·k` — so up-sizing one step does not even work. Green
everywhere needs `d` ≥ 16 mm (12,71) or flèche ≥ 5 % of span, i.e. the first screen would teach an
oversized cable or a slack line as normal practice, and 16 mm would contradict ticket 05's own
worked chain.

### 6. Confirmed: opening verdict-less is right — and here is the first screen, value by value

The ticket asked this resolution to *confirm* the verdict-less first run rather than inherit it. It
is confirmed, on a ground the measurement supplies: **the two numbers the app exists to produce are
both live without a regime.** Garde min 2,44 m is geometric fact — no `k` appears anywhere in §11 —
and the tension envelope is physics. All a regime adds is a *divisor*, and ELECTIONS §0.1 struck
« régime choisi » from ticket 04 §7's form tier precisely so that divisor cannot gate the engine. A
default regime would pick the user's safety framework (three of five are
`[CONVENTION]`/`[UNVERIFIED:R1]`); a blocked solve would ship an empty chart and destroy ticket 04
§1's own reason for inventing manual-mode ground. Verdict-less is the only option left, and it
costs nothing.

```
┌ En-tête du rail ────────────────────────────────────────────────┐
│ Scoutech    [daN ▾]  [ Copier le lien ]                    [⋯]  │
├ PARAMÈTRES ─────────────────────────────────────────────────────┤
│ Type d'installation      PERMANENTE                             │
│ Régime de sécurité       — choisir —                            │
│ Portée                   150,0  m                               │
│ Dénivelé                 −18,0  m                               │
│ Hauteur d'ancrage A       12,0  m                               │
│ Hauteur d'ancrage B       12,0  m                               │
│ [ Importer un profil… ]   (aucun tracé)                         │
│ Famille                  Acier                                  │
│ Diamètre nominal          12    mm      Grade  1770             │
│ Construction             6×19 âme métallique                    │
│ Terminaison A            Cosse à sertir / œil Flamand  (η 0,90) │
│ Terminaison B            Cosse à sertir / œil Flamand  (η 0,90) │
│ [Flèche|Tension|Longueur]  Flèche à vide cible   6,0  m         │
│ Masse passager           120    kg    ⚠ non confirmé            │
│ Enveloppe passager         2,1  m     ⚠ non confirmé            │
│ Coefficient dynamique      1,2                                  │
│ Position du passager      75,0  m                               │
├ VALEURS DÉDUITES ───────────────────────────────────────────────┤
│ Charge de rupture MBF    9074 daN                               │
│ Rigidité EA              6,90 MN            ⚠ non confirmé      │
│ Masse linéique μ         0,5465 kg/m        ⚠ non confirmé      │
│ Poids linéique w         0,536 daN/m                            │
│ Corde                    151,08 m                               │
│ Longueur non tendue L₀   151,64 m                               │
│ Prétension H à vide      253,5 daN                              │
│ Flèche à vide            6,00 m   (à x 74,8 m)                   │
│ Flèche / portée          4,00 %                                 │
│ Tension permanente       2,90 % MBF                             │
├ RÉSULTATS ── sur toute la traversée ── aucun régime choisi ──────┤
│ (the reduced row set of §7)                                     │
├ PROVENANCE ─────────────────────────────────────────────────────┤
│ ℹ Terrain — ligne droite entre les pieds d'ancrage              │
│   (aucun profil importé)                                        │
│ ⚠ 4 valeurs sans référence normative confirmée           [ ▾ ]  │
├ CE QUE CET OUTIL NE CALCULE PAS ────────────────────────────────┤
│ (ticket 08 §10's five static lines, unchanged)                  │
└─────────────────────────────────────────────────────────────────┘
```

The aggregate count is **4** — `m_p`, `h_rider`, `EA` acier, `μ` acier — with **no regime line
pinned yet**, since ticket 08 §8 pins the regime first only once one is chosen. `DAF` 1,2 carries a
provenance popover and **no chip** (`[FIELD:SSF]`, ticket 08 §4).

**Chart Block on first paint.** Cable drawn; « corde A–B » on and « ligne à vide » off (ticket 07
§5); `x` domain [−3,75; 153,75] m (span + 5 %, ticket 06 §6); `z` extent 30 m (anchor A top at 0
down to base B at −30) with 12 % margins ⇒ 37,2 m over 157,5 m, i.e. **auto-fit VE ≈ ×1,5** at a
1080×420 px plot, computed from the prototype's `makePlot` rule
(`src/routes/-prototype-07/chart-kit.ts:31-45`) — inside ticket 07's verified ×1,2…×4,7 band and
clear of ticket 15's ×1 floor. No danger band, no violation marker, the handle lane empty in manual
mode.

**Read-out strip at `x = 75,0 m`** (the rider snaps to sweep step `x` 75,06): garde **2,49 m**
(à x 74,1) · `T_A` **817 daN** · `T_B` **794 daN** · pente locale **−11,1 %** · flèche chargée
**7,48 m**.

**The rider ships at `x = L/2` = 75,0 m**, and that choice pays a dividend nobody asked for. The
traverse minimum sits at rider `x` 73,8 — **0,9 m away**, inside ticket 07 §9's
`max(1 m, 1 % de la portée)` = 1,5 m rule — so the clearance cell reads plainly as « Garde min » on
first paint instead of relabelling itself. And the cell says **2,49 m** while the rail says
**2,44 m**: the first screen *is* ticket 08 §3's worked example of Position scope versus Traverse
scope, a 5 cm gap that reads as a rounding bug unless both scope labels
(« à la position du passager » / « sur toute la traversée ») are present. They are — and ticket 15's
elected read-out-row scope label is what keeps that true when the two blocks become adjacent at
390 px.

**Rejected: parking the rider on the traverse minimum** so the two numbers agree. That is a curated
first screen hiding the distinction the app spent belt-and-braces redundancy on, and `L/2` is the
only neutral choice — ELECTIONS §0.8 fixed mid-span as `x`'s initial value and clamps it on every
path.

**The address bar stays bare.** ELECTIONS §2 forbids rewriting a bare `/`, which is ticket 09 §7's
« restore the Session ». The defaults become a URL only through « Copier le lien »:

```
/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6.0&fam=ac&d=12&r0=1770
 &cst=iwrc&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&daf=1.2&x=75.0
```

**141 characters, measured** — `reg` absent (« — choisir — ») and `mbf`/`ea`/`mu` absent (non
surchargées), the two absence meanings ticket 09 §1 protects. Ticket 09's « ~200 chars before the
trace » estimate is discharged as conservative.

### 7. « Résultats sans régime » — the reduced row set, defined

Coined here, because ticket 09 §5 removed only the *banner* and nobody removed the rows that need
`k`. The definition has to be precise: ticket 11 renders it and ticket 10 tabulates it.

> **Résultats sans régime** — the state of the rail's output half while `Régime de sécurité` is
> « — choisir — ». Every rider-free and Traverse-scope value is **present and complete**; every
> `k`-dependent value is **absent — not dashed, not blank, not zero**; the banner slot carries
> ELECTIONS §1's neutral prompt.

| Ligne de `Résultats` (ticket 08 §2) | Sans régime |
| --- | --- |
| Verdict (bandeau) | **absent** → prompt neutre |
| FS effectif | **absent** |
| Réserve de tension | **absent** |
| `T adm` ancrage A | **absent** |
| `T adm` ancrage B | **absent** |
| grille critères × extrémités | **absent** (ELECTIONS §0.1, Verdict Gate) |
| `T max` (traversée) | **928 daN — ancrage A, passager à x 74 m** (enveloppe majorée, voir ci-dessous) |
| Garde min (traversée) | **2,44 m — passager à x 74 m** |
| `T max` ancrage A / B | présents |
| `T max` statique · majoration dynamique | présents |
| Flèche chargée max | 7,48 m |
| Couverture | 260 / 260 pas |
| Provenance · Ce que cet outil ne calcule pas | présents, complets |

Five things absent, not four: **the criteria × ends grid goes with the rows**, since ELECTIONS
§0.1's Verdict Gate suppresses the banner and that grid together.

The replacing line, in place of the four rows — plain text, no second button, because ELECTIONS
§0.4 already put `[ Choisir un régime ]` in the banner and two identical buttons 200 px apart is
the warning wall ticket 04 refused:

> « FS effectif, réserve de tension et T admissible aux ancrages A et B dépendent du régime —
> choisissez un **régime de sécurité**. »   (the emphasised phrase focuses the picker)

The block header gains **« aucun régime choisi »** beside ticket 08 §3's « sur toute la traversée »,
so the scope label and the reduction are read in one glance.

**Dashes are the wrong idiom, and this overrides ticket 11's treatment.** Ticket 08 spent « — » on
`Indéterminé` — *attempted, unavailable* — and reusing it for *nothing attempted* collides with the
distinction that ticket bought five verdict states to preserve. A first screen full of dashes on a
scenario that solved perfectly (couverture 260/260, `contact: "none"`, 0 pas en violation) reads as
a failed computation: the exact misread `Indéterminé` exists to prevent, now firing on a healthy
line. And a bare `FS effectif 8,80` with no requirement beside it is **worse than hiding it** —
§10.1 forbids blending and ticket 08 refused a free `k`, yet a lone safety factor invites the reader
to supply their own. **Accept the block growing when a regime is picked**: it is honest feedback on
a deliberate act, and it grows in the output half, not under the user's cursor.

#### The headline `T max` is the amplified envelope — a correction to this ticket's own election

The round-1 election wrote the headline as « T max 817 daN ». **That is wrong and is corrected
here**, because 817,1 daN is the **static** envelope while ticket 08's headline `T max` is the
**DAF-amplified** one: its §2 sketch lists `T max 612` above `T max statique 571` and
`↳ majoration dynamique +41 daN`, and its §4 makes the verdict judge
`T_vide + DAF·(T_chargé − T_vide)`. The amplified figure has to be the headline, because it is the
quantity `FS effectif` divides by:

```
FS effectif 8,80 = η_t · MBF / T_DAF = 0,9 · 9074 / 927,9
```

Settled: the headline reads **« T max 928 daN — ancrage A, passager à x 74 m »**, with detail rows
**« T max statique 817 daN »** and **« ↳ majoration dynamique +111 daN (DAF 1,2) »**.

The failure the correction avoids is a *reconciliation* failure, not a cosmetic one, and it is
invisible in exactly the state this ticket ships: with no regime chosen `FS effectif` is absent
(§7), so a headline of 817 beside a hidden 8,80 contradicts nothing — and then contradicts itself
the moment the user picks a regime, when a reader who divides 0,9 · 9074 / 817 gets **10,00**
against a printed 8,80.

It also *strengthens* §6's scope finding rather than complicating it. The strip's Position-scope
`T_A` cell reads **817 daN** at `x` 75 while the Rail's traverse headline reads **928 daN**, so
ticket 08 §3's two scopes are visibly **different numbers** on the first frame instead of the same
number printed twice — which is precisely what that section's belt-and-braces labelling exists to
teach. The strip stays static because DAF is a verdict-side amplification that never touches a
drawn or instantaneous quantity (ticket 08 §4).

### 8. « Saisie en cours » fires on focus — that is the whole rule

ELECTIONS §0.3 fixed the state; the firing rule is this ticket's. It is focus-scoped, which is the
only definition of "mid-edit" that needs no history:

```
« Saisie en cours »  ⇔  a required numeric field is empty
                     ∧  that field has focus
                     ∧  no other required field is empty or invalid
```

Each clause earns its place:

- **Emptying `Portée` while typing** ⇒ « Saisie en cours ». The output half keeps the last valid
  Sweep, the field carries **« Valeur requise. »**, the verdict slot is suppressed exactly as under
  no-regime, and the URL and Session writes are suspended so the address bar keeps the last
  complete Scenario. « Copier le lien » is disabled with
  **« Complétez les champs vides pour partager ce lien. »** The field message is gender-free by
  design — « Portée requise » / « Dénivelé requis » would need a per-field string — and it states
  no global consequence, because the *consequence* belongs on the output half where the stale
  numbers are, not on a local control.
- **Blur with the field still empty** ⇒ it stops being mid-edit and becomes « Aucun résultat ». No
  stale number survives an unfocused hole.
- **Two empty fields, or a field that was never filled** — textile MBL/`μ` after a family flip
  (§4), a link that completed into a blank required key (§11) — ⇒ clause 3 fails ⇒
  « Aucun résultat » with ticket 11's blocking errors. Precedence is fixed: **« Aucun résultat »
  outranks « Saisie en cours ».** This is ELECTIONS §0.3's own criterion — split on whether a value
  was committed — made operational: a family flip *is* a committed act, and keeping the acier line
  on screen while the form says textile is the superseded-inputs lie §0.3 exists to forbid.

The stale grain, decided here so ticket 11 has something to paint:

- **One mark for the whole output half, never per row.**
  « Saisie en cours — ces valeurs correspondent à *Portée 150,0 m*. » — naming the field and its
  last committed value, so every number on screen is unambiguously attributed. A per-row or
  per-gate stale matrix is rejected: it would give the app Solve-stale, Clearance-stale and mixed
  flavours, the multiplication ELECTIONS §0.2 and §0.3 spent the round collapsing, and it would let
  a reader pair a live number with a stale one.
- **The chart freezes; it does not dim.** Dimming degrades legibility of exactly the quantity the
  user is steering toward, and at 390 px the collapsed two-row safety header has no room for a
  decorative state.
- **The strip keeps its numbers, and scrubbing goes inert** — pointer and typed `x` both. ELECTIONS
  §0.1 protects the scrub track against a *Clearance Gate* failure, where the Sweep is still valid;
  here the Sweep is stale by definition, so scrubbing would let the user **generate new stale
  numbers** rather than read the ones already on screen, and ticket 07 §4's exact typed-`x` solve
  cannot run on an incomplete input set. Mid-edit is bounded by the next keystroke.
- **Writes are suspended whenever the Scenario is incomplete**, in both states, so the suspension
  rule needs no per-state branch.

`Régime de sécurité` at « — choisir — » is **not** an empty required field: ELECTIONS §0.1 struck
it from the form tier, and its absence is legitimate state (ticket 09 §5).

### 9. No worked example ships — no named scenario, no bundled trace, no « charger un exemple »

The first-run scenario **is** the worked example. The three CSVs stay in `docs/references/` as
fixtures.

**The SSF Vercors line cannot ship, and the reason is measured twice over.** Ledger #7
(`docs/simulation-theory.md:690`) rules R1's Vercors numeric table fabricated — only the 1109 m
span, ≤ 220/145 daN and ~33 m/s are attested — so dénivelé, MBL, `μ`, `k`, hauteurs and terrain
would all be ours. And the invented half decides the answer:

| Variante inventée (L 1109 m, HMPE illustratif) | flèche à vide | garde min | FS effectif | Verdict (secours 10:1) |
| --- | --- | --- | --- | --- |
| MBL 100 kN, `μ` 0,075, H cible 220 daN | 52,0 m | **−62,8 m** `cable` | 11,94 | dans les limites |
| MBL 60 kN | 51,9 m | −67,2 m | **7,63** | **hors limites** |
| `k` 31 | 52,0 m | −60,5 m | 11,53 | dans les limites |
| H cible 145 daN (l'autre chiffre SSF) | 79,2 m | −89,2 m | 16,13 | dans les limites |
| `h` −60 au lieu de −150 | 51,6 m | −62,2 m | 12,08 | dans les limites |

Two failures at once: the verdict flips on a number nobody published, **and every variant opens in
« Câble au sol »** on straight ground at any plausible anchor height — because what makes such a
line safe is a gorge, i.e. a Trace nobody has. Shipping that under the reference's highest-trust
tag is the fabricated-precision failure §14 exists to prevent.

**Bundling a real trace as a demo is also rejected**, and it is the closer call because the files
exist. Measured at the shipped tightness (flèche à vide 6,0 m, hauteurs 12/12, `t14/verify14b.ts`):

| Fichier | points | `L` | `h` | pas max | garde min |
| --- | --- | --- | --- | --- | --- |
| `example-profile-trace1.csv` | 200 | 183,4 m | −2,7 m | 1,00 m | 6,83 m à x 21,0 |
| `example-profile-trace2.csv` | 200 | 224,0 m | −38,6 m | 1,20 m | 9,90 m à **x 224,0** |
| `example-profile-trace3.csv` | 200 | 188,4 m | −5,1 m | 1,00 m | 8,80 m à x 6,0 |

All three show the **uninteresting** clearance case — a gorge gives metres of air, and on trace2 the
minimum sits *at the arrival anchor*, i.e. it is merely `hauteur B − enveloppe` and teaches nothing
about sag. A demo file would also buy a third state in ticket 09 §6's "which file" line
(« tracé d'exemple » beside « tracé reçu par lien » and a real filename) and hand some users an
unattested Swiss profile they will treat as a reference line. Note for ticket 10: **there are three
example traces, not two** — tickets 06, 09 and 14 all say two.

### 10. « Réinitialiser le scénario » removes the Trace as terrain source and keeps it cached

Overriding this ticket's round-1 recommendation, on the strength of its own objection. Reset returns
the **active configuration** to the first-run defaults:

| Revient aux valeurs de départ | Survit intact |
| --- | --- |
| `L` 150,0 · `h` −18,0 · hauteurs 12,0 / 12,0 | la Material Spec inactive conservée |
| Flèche à vide cible 6,0 m, segment `Flèche` actif | le **tracé, mis en cache** dans la Session |
| Spec acier 12 / 1770 / 6×19, aucune surcharge | l'unité de force et les bascules de calques |
| Terminaisons cosse / cosse · passager 120 kg / 2,1 m · DAF 1,2 | |
| `x` → `L/2` = 75,0 m · régime → « — choisir — » | |
| **la source de terrain** → géométrie manuelle | |

It removes the Trace **as terrain source** through ticket 06 §5's existing remove path — which
restores the retained manual `L`/`h` — while **keeping the profile cached**, and navigates to bare
`/` with `replace: true`.

Round 1 argued the Trace should survive as terrain; its own objection concedes why that fails. With
a trace loaded, `L` and `h` are *derived read-outs*, so the post-reset state would not be the
first-run scenario at all — **Portée would read the trace's 183,4 m** after a control that promised
a return to the shipped state. The elected version keeps the promise **and** destroys nothing.
Ticket 09 §1's rule decides it: the terrain source *is* part of the active configuration.

**"Keeping it cached" forces a re-add path, or the cache is dead weight.** After a reset nothing
reads the cached profile, so with no way back the reset is destructive in effect and the election
contradicts itself. Settled: ELECTIONS §0.5c's file-identity line in `Paramètres › Géométrie` gains
a **fourth state** — « Tracé en mémoire : *pont-du-diable.csv* (non utilisé) » with
**`[ Réutiliser ce tracé ]`**, which re-places A at the first station and B at the last exactly as
an import does (ticket 06 §5). For a link-received trace the line reads
« tracé reçu par lien (non utilisé) », since ticket 09 §6 drops the filename. This is an amendment
to ticket 06 §5, which discards the stations on removal but never said what becomes of the profile.

**No confirmation dialog on reset**, and that is a decision rather than an omission. Nothing is
destroyed — the Trace, the retained spec and the display preferences all survive — and a
confirmation on a non-destructive action **trains the user to click through confirmations**, which
is precisely what would make the one dialog guarding real data loss worthless. The control already
costs two clicks (Rail-header overflow menu, ELECTIONS §0.5a) and the menu item states its own
consequence:

> **Réinitialiser le scénario**
> Revient aux valeurs de départ. Le tracé importé est retiré du terrain mais reste en mémoire.

Also rejected: **`push` instead of `replace`, to make Back an undo of a reset.** Tempting — reset
keeps everything the URL does not carry, so the previous entry would restore the pre-reset Scenario
exactly. Rejected because it is only *nearly* true: writes are debounced ≈400 ms (ticket 09 §7) and
suspended under « Saisie en cours » (§8), so the previous entry is sometimes not the pre-reset state,
and an undo that is right 99 % of the time contradicts ticket 09 §7's flat « Back is not undo ».
Accepted cost, recorded: a reset discards typed numbers with no undo; the mitigation is
« Copier le lien », which exists.

**« Effacer la session » stays the only destructive control**: it deletes `scoutech:session:v1`
entirely — cached Trace, filename, retained inactive spec, display preferences — **behind a
confirmation**, with an extra warning when the Trace arrived by link
(« Ce tracé est arrivé par lien : il ne pourra pas être réimporté depuis un fichier. »). Keep the
two controls distinct: collapsing them either leaves an imported trace standing behind a word that
promised a reset, or deletes user data behind a word that promised only numbers.

### 11. A recognised link that omits keys is completed from the defaults — literally

`?L=250&h=-40` loads. The missing fields are filled from the first-run defaults, the address bar is
rewritten to the **completed** Scenario (ELECTIONS §2's mount-effect
`navigate({ to: '/', search: <plain object>, replace: true })`, which fires here precisely because
something was completed), and ELECTIONS §1's ignored-keys strip gains a **second sentence** — same
component, same manual dismissal, shown whenever *either* sentence has content:

```
Clés ignorées : « junk » (clé inconnue) · « fl » et « lo » (deux tensions
contradictoires — une seule est possible).
Valeurs absentes complétées avec les valeurs de départ : hauteur d'ancrage A
12,0 m · hauteur d'ancrage B 12,0 m · flèche à vide cible 6,0 m · diamètre
12 mm · … · position du passager 125,0 m. L'adresse a été réécrite avec le
scénario complet.
```

One strip and not two, because both sentences answer the same question — "what did this link
actually give me?" — and ELECTIONS §0.4 keeps the banner slot single-occupant. Each sentence names
**field and value**, which is what defeats ticket 09 §0's scenario-nobody-saw hazard: the recipient
can read every value they got.

**The completion set is conditional, and stating it is the whole implementation.** Keys whose
absence already carries meaning are exempt and keep it:

| Absence | Sens conservé |
| --- | --- |
| `reg` | « — choisir — » (ticket 04 §8) |
| `mbf` `ea` `mu` (acier) | non surchargée (ticket 05 §5) |
| `tr` `sa` `sb` | source de terrain manuelle — et si `tr` **est** présent, `L`/`h` ne sont **pas** complétés, ils sont dérivés |
| clés de la famille inactive | famille inactive (ticket 05 §7) |

Everything else completes. Two consequences worth writing down:

- **`x` completes to `L/2` of the *completed* span**, not to the constant 75,0 — 125,0 m for
  `?L=250&h=-40` — and then clamps per ELECTIONS §0.8.
- **`fam=tx` cannot be completed into a solvable line**, because two of its required keys have no
  shipped default (§4). Such a link arrives at « Aucun résultat » with two blocking errors, which is
  correct and is §8's clause-3 case.

**The literal rule beats the clever one, and the measurement is decisive.** `fl` completes to the
absolute **6,0 m**, never to 4 % of the arriving span:

| `?L=250&h=-40` complété par | flèche/portée | garde min | FS eff | résultat |
| --- | --- | --- | --- | --- |
| `fl=6.0` (littéral) | 2,40 % ⚠ | **1,25 m**, `contact: none` | 5,41 | solvable, avertissement §8.2 honnête |
| `fl=10.0` (4 % de la portée) | 4,00 % | **−2,39 m**, `contact: cable` | 7,49 | **« Câble au sol »** |

The "smart" completion puts a hand-authored link **on the ground**; the literal one lands on a clear
line with a ⚠ that is simply true — a 250 m span at 6 m of sag really is stiff, and firing an honest
warning beats inventing a sag the sender never wrote. Literal also keeps « les valeurs de départ »
meaning one thing in both places it is used, here and §10's reset, instead of two rules behind the
same words.

Refusals are unchanged from ticket 09 §4: unknown `v`, undecodable or oversize `tr`, `fl` and `lo`
both present. **Rejected: refusing partial links.** Ticket 09 §3 explicitly kept hand-authored
`?L=250&h=-40` working, which is only coherent if the rest comes from this ticket's defaults;
refusing would make the readable-keys decision pay its cost and buy nothing. The
fifth-meaning-of-absence objection is answered by *stating* the completion in both the address bar
and the strip.

### 12. The opening screen is frozen as a Vitest fixture, asserted at display precision

A defaults change, a precision-table change or a solver regression must not be able to move the
first screen silently.

- Constant: **`FIRST_RUN_SCENARIO`** in `src/lib/scenario/first-run.ts` — one object serving the
  opening state, §10's reset target and §11's completion values. Not three copies.
- Test: **`src/lib/scenario/first-run.test.ts`**, colocated per `docs/conventions/testing.md`.
- **Assert the formatted strings, not the floats.** `1e-3` relative on `L₀` is ±0,15 m, and §3
  measured that 0,15 m of `L₀` moves garde by ≈0,15 m — a tolerance that would let the opening
  screen drift by 6 % of its safety margin and stay green. What is being frozen is what the user
  reads, so assert that: « 151,64 m » · « 253,5 daN » · « 6,00 m » · « 4,00 % » · « 2,90 % » ·
  « 817,1 daN » · « 927,9 daN » · « 7,48 m » · « 2,44 m » · « 8,80 » · « 9,06 ».
- Plus three structural assertions no string carries: `contact === "none"`, `coverage === 1` over
  `grid.length === 260`, and zero steps in violation.
- Side effect worth having: the same test locks ELECTIONS §0.6's decimal comma and ticket 10's
  precision table, since both live inside the rendered string.

This is a **regression lock, not a physics fixture** — §15's `F1`/`Z1`–`Z6` in
`src/lib/sim/__fixtures__/theory-15.ts` keep that job and keep their `1e-3` tolerance.

### 13. What this hands forward

| Ticket | Obligation created here |
| --- | --- |
| [04](./04-span-and-rigging-parameter-model.md) | **Amended**: the five « → premier lancement » cells are filled — `L` 150,0 · `h` −18,0 · hauteurs 12,0 / 12,0 · `Flèche à vide cible` 6,0 m, with `Flèche` as the active segment (§2, §3). Form-tier copy for an empty required field is **« Valeur requise. »** (§8) |
| [05](./05-material-spec-model.md) | **Amended**: first-run acier is `d` 12 / `R₀` 1770 / 6×19 âme métallique with **no override**, terminations « Cosse à sertir / œil Flamand » at both ends, retained textile HMPE `k` 22 with `MBL` and `μ` **blank and required** (§4). §6's `[STD-ATTESTED]` tags govern over §5's chip mapping, so the first-run aggregate is **4**, not 6 |
| [06](./06-csv-profile-import-and-anchor-placement.md) | **Amended**: §5's remove path keeps the profile **cached in the Session**, and the file-identity line gains a fourth state « tracé en mémoire … (non utilisé) » with `[ Réutiliser ce tracé ]`, re-placing A/B at the first/last station (§10) |
| [11](./11-validation-and-error-state-ux.md) | Render **« Résultats sans régime »** — four rows *plus* the criteria × ends grid absent, the replacing line, the header's « aucun régime choisi » (§7) · « Saisie en cours »: the focus-scoped firing rule, one output-half mark naming field + last committed value, chart frozen not dimmed, scrub inert, precedence below « Aucun résultat » (§8) · the ignored-keys strip's **second sentence** and its either-sentence firing condition (§11) · the textile-flip blank-required case as blocking errors, never stale (§4) |
| [13](./13-app-shell-and-routing-shape.md) | `FIRST_RUN_SCENARIO` is what the store's lazy initialiser falls back to (`readSession() ?? firstRunDefaults()`) · the mount-effect rewrite fires on **completion** as well as on dropping, using §11's conditional completion set · reset navigates to bare `/` with `replace: true`, never `push` |
| [08](./08-results-panel-and-provenance-warnings.md) | Terrain-provenance copy must state the measured consequence: **on a straight ground line no metre of dénivelé buys clearance** (garde 2,46 → 2,25 m across `h` 0 → −60), so a user modelling a gorge manually otherwise reads a false failure (−62,8 m at 1109 m) · the headline `T max` label: see §7's TODO |
| [10](./10-assemble-the-v1-build-spec.md) | The measured first-run tables (§2, §6) as the spec's opening-screen record · **`L₀` needs 2 decimals** in the precision table (1 decimal costs 0,20 m of garde, 8 % of the shipped margin) · WorkSafe's suspended-load denominator is `η_t·MBF / [DAF·(T_chargé − T_vide)]` = 12,29, so **total tension governs** at 8,80 · there are **three** example traces (183,4 / 224,0 / 188,4 m), not two · the first-run URL is **141 characters**, discharging ticket 09 §6's ≈200-char estimate · `FIRST_RUN_SCENARIO` + `first-run.test.ts` (§12) · CONTEXT.md gains **First-Run Scenario**, **Résultats sans régime** and **Saisie en cours**, and its **Trace** entry must cover a Trace held in the Session while not being the active terrain source |
| [15](./15-responsive-and-narrow-screen-layout.md) | The shipped scenario's auto-fit VE is ≈ ×1,5 at 1080×420 — inside the Plot Aspect Band and clear of the ×1 floor · the first screen's 2,49 / 2,44 m pair is why the read-out row's « à la position du passager » label is load-bearing at 390 px |

**Inherited from [App shell and routing shape](./13-app-shell-and-routing-shape.md)** — two facts
this ticket's defaults depend on, beyond the "no rewrite of a bare `/`" rule already stated in §6.

- **The completed scenario ticket 13 §4's rewrite emits (§11) is written in ticket 09 §1's key-table
  order.** Two links completed from the same partial input are therefore string-identical, which is
  what keeps « Copier le lien » diffable.
- **The first-run defaults are never server-painted.** Ticket 13 §7 reads the Session synchronously
  in the store's lazy initialiser at the client-only subtree's first render — not a post-mount
  effect — so a returning user never sees this ticket's scenario flash before their own, and the
  Skeleton (ticket 13 §3) carries no field values at all.

**Inherited from [Validation and error-state UX](./11-validation-and-error-state-ux.md)** — one
fact about `m_p` that ticket 11 §1 settles and this ticket's default depends on.

`m_p` is a **Solve Gate** input (ticket 11 §1: with no rider mass there is no loaded `SpanState` —
no cable, no `T_A`/`T_B`, nothing in the five cells). The shipped 120 kg is therefore not
decoration: it is what keeps the opening screen solvable at all, on top of the Unconfirmed-Default
reasons already given in this ticket's Context.
