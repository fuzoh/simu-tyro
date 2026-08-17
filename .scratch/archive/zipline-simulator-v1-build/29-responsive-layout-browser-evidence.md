# 29 — Capture responsive layout browser evidence

**What to build:** Drive real app and still-present prototype in browser to turn responsive layout contract into repeatable evidence. Record dimensions that require layout engine: three reference budgets, banner heights, View Strip label widths, and transition where fixed Rail stops fitting beside chart.

**Blocked by:** 28 — Keep safety controls usable under constrained height.

**Status:** done

- [x] At 390×664, measured bands sum to viewport and leave at least 120 px resting Rail.
- [x] At 768×1024, measured Chart Block and residual letterbox match portrait-tablet budget. — ~~**non** : bloc **545,44** contre 561, boîtage **478,56** contre 463. L'écart est **exactement** le terme bandeau (60 − 44), voir défaut 1.~~ **oui après le correctif du défaut 1** : bloc **561,44** contre 561, boîtage **462,56** contre 463. — *re-mesuré indépendamment* : **561,4375** / **462,5625**, total 1024,000.
- [x] At 1440×900, measured Chart Block and residual letterbox match desktop budget.
- [x] Banner content heights measure 44, 60, and 76 px at one-, two-, and three-line states. — ~~**non** : mesuré **44 / 44 / 56**.~~ **oui après le correctif du défaut 1** : **44** (1 ligne, colonne 1152) · **60** (2 lignes, 480) · **76** (3 lignes, 390), le créneau étant désormais la ligne de § 5 pour *cette largeur* et non pour son texte. — *re-mesuré indépendamment* : **76 / 60 / 44** aux colonnes 390 / 480 / 1152 sur les **trois** occupants (1, 2 et 3 lignes), seuils 479→76 · 480→60 · 599→60 · 600→44 identiques à `bannerBudget`.
- [x] Full and abbreviated View Strip labels are measured against 342 px inner width; abbreviated row fits one 44 px line.
- [x] Real layout confirms 768 px B2 transition and records first width where side-by-side chart becomes unacceptable.
- [x] Evidence includes reproducible browser commands, measured values, viewport, browser version, and comparison with prototype before deletion.

## Comments

**Browser evidence pass — 2026-08-14.** Verdict: **partiel**, five of seven items hold. The two that do not
fail on **one** cause — the banner slot does not render § 5's 44 / 60 / 76 px — and closing it is a § 5
decision, not a patch, so it is named below and left open. Nothing under `src/` was touched by this pass.

**Environment.** `HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
(KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36`; `agent-browser 0.34.0`; session
`scoutech-t29`; `devicePixelRatio 1`. Dev server `http://localhost:3000/`, probed with
`curl -s -o /dev/null -w '%{http_code}'` → **200** before each leg. Every viewport was set with
`agent-browser set viewport <w> <h>` and then **read back from `window.innerWidth/innerHeight`**; every
dimension is `getBoundingClientRect()` / `getComputedStyle()` through `eval --stdin`, never inferred.

### The three links every number was taken on

Built from the app's own codec, so no completion strip is in the way
(`canonicalLink(scenarioToSearch(FIRST_RUN_SCENARIO))`, run under `bun`):

```
FULL = /?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&fam=ac&d=12&r0=1770&cst=iwrc
       &ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&daf=1.2&x=75            → HTTP 200
L3   = FULL, `fl=6` → `lo=100`   (tension impossible: the tallest banner reachable)   → HTTP 200
B1   = FULL, `L=150` → `L=-5`    (blocking summary: the shortest banner)              → HTTP 200
```

### The repeatable sequence

```
S="agent-browser --session scoutech-t29"
$S open "$FULL" ; $S set viewport 390 664 ; $S wait "#rail-L"
$S eval "innerWidth+'x'+innerHeight"                 # confirm the viewport you were given
$S eval --stdin < measure.js                         # band stack, block, rail, letterbox
$S eval --stdin < banner2.js                         # banner slot, content height, line count
$S eval --stdin < strip.js                           # View Strip control widths and the row
$S focus "#rail-h" | "#rail-xD"                      # pinned / pinned-x, to read --pinned-clearance
```

`measure.js` finds the stack without depending on ids — `aside.parentElement` → the sibling that is not the
`aside` is the chart column, its first child is the band stack, and that stack's five children are
*bandeau · profil · bande de garde · View Strip · cellules*. So the same script runs at every width and in
every collapse state. All four scripts are reproduced at the end of this comment.

### Item 1 — 390 × 664, the bands sum and the resting Rail

`innerWidth/innerHeight` read back **390 / 664**, one column (`flexDirection: column`), `W_inner` **342**.
Unrounded, for all three banner occupants:

| occupant | bandeau | profil | garde | View Strip | cellules | **bloc** | rail au repos | **somme** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| régime, 2 lignes (`FULL`) | 44 | 219,625 | 96 | 44 | 104 | **507,625** | **156,375** | **664,000** |
| bloquante, 1 ligne (`B1`) | 44 | 219,625 | 96 | 44 | 104 | **507,625** | **156,375** | **664,000** |
| tension imposs., 3 lignes (`L3`) | 56 | 219,625 | 96 | 44 | 104 | **519,625** | **144,375** | **664,000** |

`data-collapse="whole"`, `data-fit="roomy"`, `--pinned-clearance: 0px` in all three. The sum is the viewport
**exactly** — `block + rail === innerHeight`, no residual — and the worst occupant still leaves
**144,375 px** of Rail, clearing `MIN_RAIL` by 24,375 px rather than by § 5's 4 px, because the rendered
bandeau is 20 px shorter than the table's 76. `profil` = 76 + 0,42 × 342 = 219,64 ✓, `garde` = the 96 px
floor ✓, `cellules` = 2 × 52 ✓ (B1 active at a 390 px column). **The item holds on its own wording**; the
deviation from budget A's *540 / 124* is the banner term and nothing else.

### Item 3 — 1440 × 900, re-measured on a valid scenario

Ticket 27's desktop leg was taken on a URL still carrying `L=-5`, so its 540 px band was `EmptyBands`'.
Re-driven here on **`FULL`**, and every number below belongs to the **live chart** occupant: the profile
band reads « Éch. verticale ×1,9 · A · B · 0 · 38 · 75 · 113 · 150 m », the strip « Garde au sol (m) selon
la position du passager… », the cells « Garde min 2,48 m · T anc. A 817,1 daN … » — where `EmptyBands`
would read « Portée invalide — aucun tracé possible ».

| bande | mesuré | budget C | écart |
| --- | --- | --- | --- |
| colonne graphique | 1152 | 1152 | 0 |
| `W_inner` | 1104 | 1104 | 0 |
| créneau bandeau | 44 | 44 | 0 |
| profil | 539,672 | 540 | −0,33 |
| bande de garde | 176,625 | 177 | −0,38 |
| View Strip | 44 | 44 | 0 |
| cellules | 52 (1 rangée) | 52 | 0 |
| **bloc** | **856,297** | **857** | **−0,70** |
| **marge de boîtage** | **43,703** | **43** | **+0,70** |
| **total** | **900,000** | **900** | 0 |

Rail `md:w-72` = **288**, full height 900. **Budget C reproduces to 0,7 px**, and the letterbox is the
residual — nothing redistributes it.

### Item 2 — 768 × 1024, the portrait-tablet budget misses by the banner term

Two columns at exactly 768 (rail 288 + colonne 480), `W_inner` **432**:

| bande | mesuré | budget B | écart |
| --- | --- | --- | --- |
| créneau bandeau | **44** | **60** | **−16** |
| profil | 257,438 | 257 | +0,44 |
| bande de garde | 96 (plancher) | 96 | 0 |
| View Strip | 44 | 44 | 0 |
| cellules | 104 (2 rangées) | 104 | 0 |
| **bloc** | **545,438** | **561** | **−15,56** |
| **marge de boîtage** | **478,563** | **463** | **+15,56** |
| **total** | **1024,000** | **1024** | 0 |

Every width-derived term lands; the one *occupant*-derived term does not. **The item fails as written** —
défaut 1.

### Item 4 — the banner slot measures 44 / 44 / 56, not 44 / 60 / 76

`--banner` is `44px` and it is a **`min-height`**. The content is `text-xs` (`font-size 12px`,
`line-height 16px`) inside `py-1`, so the slot is `max(44, 16 × lignes + 8)`. Measured — three occupants ×
three column widths, `lignes` = content height ÷ line-height:

| occupant | col 390 | col 480 | col 1152 |
| --- | --- | --- | --- |
| « ⛔ 1 erreur bloquante — aucun résultat » + `[ voir la première ]` | 1 ligne · contenu 28,66 · **slot 44** | 1 · 28,66 · **44** | 1 · 28,66 · **44** |
| « Choisissez un régime… » + `[ Choisir un régime ]` | 2 lignes · 40 · **44** | 2 · 40 · **44** | 1 · 28,66 · **44** |
| « ⛔ Tension impossible — … 149,11 m · valeur : 100,00 m. » | **3 lignes · 56 · slot 56** | 2 · 40 · **44** | 1 · 24 · **44** |

The *line counts* § 5's table assumes are right — the same occupant is 3 lines at 390, 2 at 480, 1 at 1152 —
and the *heights* are not: **44 / 44 / 56 against 44 / 60 / 76**. The 44 px floor swallows the two-line case
whole, and a third line costs 16 px, not 32.

### The 32 px over-reservation ticket 27 left open — correct by design, now measured

`--pinned-clearance` is `pinnedHeaderHeight(state)`, whose `bannerHeight` **defaults to `BANNER.threeLines`
= 76**, with the reason written at the call site (« a reserve that under-shoots is exactly the failure
`scroll-margin-top` exists to prevent »). Driven at 390 × 664, `focus "#rail-h"` for `pinned` and
`focus "#rail-xD"` for `pinned-x`:

| occupant | lignes | slot | header `pinned` | réservé | header `pinned-x` | réservé |
| --- | --- | --- | --- | --- | --- | --- |
| bloquante (`B1`) | 1 | 44 | **88** = 44 + 44 | 120 | **132** = 44 + 44 + 44 | 164 |
| régime (`FULL`) | 2 | 44 | **88** | 120 | **132** | 164 |
| tension imposs. (`L3`) | 3 | 56 | **100** = 56 + 44 | 120 | **144** = 56 + 44 + 44 | 164 |

`scroll-margin-top` on the focused field read `120px` / `164px` in every case. **The reserve never
under-shoots**: the tallest banner reachable here is 56 px, so the tallest pinned header is 100 px, and the
reserve exceeds it by 20 px — 32 px for the one- and two-line occupants. That answers ticket 27's open
question: the over-reservation in `--pinned-clearance` is **correct by design**, a deliberate worst-case
reserve on the one consumer where an under-shoot would hide a jump target under the header. It is **not**
the same number as ticket 28's finding 3, which is `bannerBudget()` inside `chartBlockHeight` — a different
consumer, where the same 76 runs in the expensive direction. Défaut 1 carries that half.

### Item 5 — the View Strip's labels against 342 px of inner width

The row at the three widths (`px-[var(--gutter)]` = 24 a side, `gap-3` = 12, four children):

| | à vide / ligne à vide | corde / corde A–B | ×1 / ×1 vraie échelle | `x … m · 50 %` | Σ contrôles | + 3 × 12 | **requis** | dispo | rangée |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **abrégé**, col 390 (`W_inner` **342**) | 49,27 | 48,00 | 29,77 | 125,30 | 252,33 | 36 | **288,33** | **342** | **44 px, 1 ligne** |
| **abrégé**, col 480 (`W_inner` 432) | 49,27 | 48,00 | 29,77 | 125,30 | 252,33 | 36 | **288,33** | 432 | 44 px, 1 ligne |
| **complet**, col 1152 (`W_inner` 1104) | 77,36 | 71,38 | 98,88 | 125,30 | 372,91 | 36 | **408,91** | 1104 | 44 px, 1 ligne |

**The abbreviated row fits 342 px with 53,67 px to spare** — `scrollWidth === clientWidth` (390), no wrap,
row height **44 px**, every control on one line. **The full labels do not fit**, and this was measured *at*
342 px rather than argued: forcing the full spans visible at 390 px (`span.style.display = 'inline'` on the
`@max-[600px]:hidden` labels, their `@min-[600px]:hidden` siblings hidden, both reverted in the same
`eval`) took the row's `scrollWidth` from **390 → 445** and put the `x` input's right edge at **393,63**,
i.e. 27,6 px past the 366 px content edge. Required 408,91 against 342 available — **short by 66,91 px**.
§ 5's own arithmetic says 432 / 303; measured **408,91 / 288,33**, so its abbreviation *threshold* argument
stands and its two sums are 23,1 / 14,7 px pessimistic. The abbreviation switches at the B1 container
threshold and nowhere else: column **600** → full labels + 5 cells (viewport 888); column **598** →
abbreviated + 3 cells (viewport 886). That is `CELL_WRAP_PX = 600` agreeing on the CSS and the TS side of
its own boundary.

*(Recorded, not this item's: the four control shells are `h-8` = **32 px** inside the 44 px row. That is
ticket 28's finding 5, owned by ticket 35. Item 5 asks about the row, and the row is 44.)*

### Item 6 — B2 is exactly 768, and side-by-side survives well below it

Sweeping `set viewport <w> 900`, reading `flexDirection`, the rail's width and the column's:

| viewport | layout | rail | colonne | cellules | View Strip |
| --- | --- | --- | --- | --- | --- |
| 888 | 2 col | 288 | **600** | 5 en 1 rangée (52) | labels **complets** |
| 886 | 2 col | 288 | 598 | 3 × 2 rangées (104) | **abrégés** |
| 864 | 2 col | 288 | 576 | 3 × 2 | abrégés |
| 769 | 2 col | 288 | 481 | 3 × 2 | abrégés |
| **768** | **2 col** | **288** | **480** | 3 × 2 | abrégés |
| **767** | **1 col** | 767 (pleine largeur) | **767** | **5 en 1 rangée** | **complets** |
| 760 | 1 col | 760 | 760 | 5 en 1 | complets |

**B2 fires between 768 and 767, to the pixel**, and at 768 the column is **480** and `W_inner` **432** —
budget B's own two numbers. Nothing overflows anywhere in the shipped two-column band: worst cell
`scrollWidth − clientWidth` = **0** at every width ≥ 768, and the aspect is 0,42 by construction.

**The first width at which a side-by-side chart becomes unacceptable — and it is not 768.** With B2
neutralised *for the measurement only* (`flexDirection: 'row'` on the row box, `flex: 0 0 288px` on the
`aside`, both reverted in the same `eval`), the two-column layout was continued downward:

| viewport | colonne | what happens there | criterion |
| --- | --- | --- | --- |
| **888** | 600 | the five read-out values stop fitting one row | B1 — a **designed** degradation |
| **864** | 576 | `288 / 864` = **33,3 %**: the rail crosses one third of the width | B2's own *sentence*, 96 px above B2's *threshold* |
| 768 | 480 | column exactly 480, no overflow, aspect 0,42 | B2's elected threshold |
| **624** | 336 | the **abbreviated** View Strip stops fitting — 288,33 required against 288 available | § 5's « the row is 44 px tall, so every control in it is a legal touch target » |
| **611** | 323 | the View Strip **clips**: `scrollWidth − clientWidth` = 1 px, 12 px at 600 | visible loss |
| 520 | 232 | first read-out cell text clipping (1 px), 14 px at 480 | visible loss |
| 390 | **102** | plot track **54 px** for the whole span; two 44 px anchor targets = 163 % of the track | § 5's « every narrow-screen symptom is downstream of this » |

So **624 px is the first width at which side-by-side is genuinely unacceptable** — a § 5 invariant broken,
the 44 px touch row no longer fits — and **611 px the first at which it visibly clips**. B2 at 768 therefore
fires **144 px before** the first hard failure: conservative, not late. The 390 px end corroborates ticket
15's two carried figures: column **102** (recorded as 101) and track **54** (recorded as 53 under
`GUTTER = 24`).

### Item 7 — the prototype comparison, taken while it still stands

`/prototype/profile-view?variant=D&scenario=z1` — HTTP **200** after the route's own 307 to `variant=D`.
Variant D is « Composite décidé »: `flex-[3]` main + `flex-1` strip, the mechanism § 5 rejected. The plot's
inner box is the SVG minus the prototype's own pad (`{top 28, right 16, bottom 24, left 16}`, i.e. 32 × 52
px of chrome):

| viewport | panneau | colonne | plot interne | **aspect** | badge VE |
| --- | --- | --- | --- | --- | --- |
| 390 × 664 | 288 (fixe, **aucun B2**) | **102** | 70 × 323 | **4,6143** | « Éch. verticale **×47** » |
| 768 × 1024 | 288 | 480 | 448 × 616 | **1,3750** | « ×14 » |
| 1440 × 900 | 288 | 1152 | 1120 × 539 | **0,4813** | « ×4,9 » |

And the claim § 5 is built on, isolated — **one width, five heights**:

| 1440 × … | 700 | 800 | 900 | 1000 | 1200 |
| --- | --- | --- | --- | --- | --- |
| prototype aspect | 0,3473 | 0,4143 | 0,4813 | 0,5482 | 0,6821 |
| prototype VE | ×3,5 | ×4,2 | **×4,9** | ×5,5 | **×6,9** |
| **app** `--profile-plot` | 463,68 | 463,68 | **463,672** | 463,672 | 463,672 |
| **app** `--strip` | 176,64 | 176,64 | 176,625 | 176,625 | 176,625 |
| **app** aspect | **0,42** | 0,42 | **0,42** | 0,42 | 0,42 |
| **app** badge VE | ×1,9 | ×1,9 | **×1,9** | ×1,9 | ×1,9 |

**The prototype's exaggeration is a function of the window's height**: ×3,5 → ×6,9 over 500 px of height at
one width, aspect outside the Plot Aspect Band [0,35 – 0,50] at both ends (0,3473 at 700 and 0,6821 at
1200) and past the published ×5,5 ceiling from 1000 px of height up. **The app's is not**: at 1440 the two
band variables and the badge are identical across 700 … 1200, and the aspect is 0,42 exactly
(463,672 / 1104). At 390 px the prototype has no B2 at all — a 102 px column, a 70 px plot, **×47** — which
is the whole narrow-screen argument, measured on the artifact instead of computed from its classes.
*Caveat, stated rather than papered over*: the prototype runs §15 **z1** (L 100 m, h 0) while the app runs
`FIRST_RUN_SCENARIO` (L 150 m, h −18), so the VE **numbers** are not the same quantity. What is compared —
and what dies with the prototype — is the **variance with the box**: the prototype's varies with height and
with width, the app's with neither. (At 1440 × 700 / 800 the app is `pinned`·`tight`, ticket 28's open
finding 1, so its figures there are the computed custom properties, read back through a throwaway `div`
sized `var(--profile-plot)` / `var(--strip)`; at 900 / 1000 / 1200 they are the rendered bands, and the two
agree.)

### Défaut 1 — the banner slot renders 44 / 44 / 56 where § 5 budgets 44 / 60 / 76. **Open § 5 decision.**

**Repro.** `$S set viewport 390 664`, then open `L3` → the slot is **56 px** on a **3-line** occupant; open
`FULL` → **44 px** on a 2-line one. `--banner: 44px` is a `min-height`; the content is 16 px a line plus
`py-1`.

**What it costs, measured.** Budget A's block is 507,625 (1–2 lignes) / 519,625 (3 lignes) against **540**;
budget B's is 545,438 against **561**; budget C is unaffected because its banner row *is* 44. So two of the
three budgets in § 5's table do not sum as printed — and `bannerBudget()`, which `chartBlockHeight()` feeds
to collapse condition (c), **over-states the block by 20 px at a 390 px column** (76 against the 56 px worst
occupant) and **by 16 px at 480** (60 against 44). That is ticket 28's finding 3 with numbers, and it runs
in the expensive direction: an over-estimate *deletes a picture that would have fitted*.

**The decision, named and not taken** — every way out edits a § 5 table:

- **(i) Restate § 5's banner rows to the measured 44 / 44 / 56** and let `BANNER` / `bannerBudget` follow.
  Cheapest, and both budgets then sum — but it also *widens* the (c) margin at 390 px from 4 px to 24 px,
  which is a change to the very arithmetic § 5 uses to refuse an app bar in `__root.tsx`.
- **(ii) Make the rendering match the table** (taller line-height, or more `py` in the slot), so a two-line
  occupant is 60 px and a three-line one 76 px. Every existing number survives, at the price of 32 px of
  the tightest budget in the app spent on air, and § 5's « 124 px of resting rail clears `MIN_RAIL` by
  4 px » comes back.
- **(iii) Keep the constants as a declared ceiling** and restate the budget table's `bloc` / `reste` rows as
  *upper bounds* rather than sums. Nothing moves in code; the table stops being « each summing to the
  viewport », which is the section's own title.

Not decidable inside a build ticket. `--pinned-clearance`'s use of the same 76 is **not** in question — it
is the safe direction, and it is measured safe above.

**One thing untested, stated as such:** the longest occupant reachable here is 3 lines / 56 px.
« ⛔ Calcul impossible … » (160 chars) would take a 4th line, ≈72 px, still under 76 — but `no-convergence`
was not reachable by URL in this pass, so that is arithmetic, not a measurement.

### Défaut 2 — the « champs absents du lien » strip is 217 px at 390 px, and the fit rule ignores it

**Repro.** `$S set viewport 390 664`, then `open "http://localhost:3000/?L=-5"` (HTTP **200**),
`wait "#rail-L"`.

**Measured.** The completion strip renders **217 px** tall — it names all 19 keys it filled: « Champs absents
du lien, complétés depuis le scénario par défaut : unité de force daN · type d'installation permanente ·
dénivelé −18,0 m · … ». The row beneath it gets 447 px, the chart column keeps its full **507,625**, and the
Rail is left at **0 px** with `scrollHeight 1808`: `217 + 507,625 + 0 = 724,625` inside a 664 px shell, i.e.
**60,625 px of overflow under `overflow: hidden`**, with `MIN_RAIL` missed by the whole 120 px. The state
stays `data-collapse="whole"` / `data-fit="roomy"`, because the fit rule reads the viewport and not the space
left under the strip. § 5's budget A reserves « 0 | 60 » for this band and says « with the ignored-keys strip
up the rail drops to 64 px ».

**The escapes, all measured.** The strip's `✕` restores rail **156,375** and the sum to **664,000**.
`aside.scrollTop = 200` (trigger a) or `focus "#rail-L"` (trigger b) gives `pinned`, column 88, rail 359 —
`217 + 88 + 359 = 664`. So the state is recoverable by the dismiss button and by the keyboard, and **not**
by touching the Rail, because there is no Rail on screen to touch. Only a hand-truncated link reaches it:
the app's own « Copier le lien » writes all 20 keys.

**Also a § 5 question rather than a patch.** The options are (i) count the strip in the available height
that (c) divides, (ii) cap or scroll the strip, (iii) shorten the sentence to a count plus a disclosure.
(i) is the smallest, and it is still a change to what « available height » means in § 5's collapse rule.

### Not observable on this host — stated, not inferred

- **Coarse pointer / real touch.** Ticket 27's established host limit: `set device` changes the UA and the
  viewport but leaves `navigator.maxTouchPoints 0` and `matchMedia('(pointer: coarse)')` false. Every number
  above is a CSS / layout fact under a **fine** pointer; no tap semantics were exercised.
- **Soft keyboard.** None exists here; `--kb` read `0px` throughout, and nothing in this pass claims a
  keyboard-driven height. That is tickets 28 and 35.
- **`interactive-widget=resizes-content`** is present and correct in the DOM, and only Safari honours it.
- **Timing.** No frame was sampled: drag performance is ticket 30's.

### Also observed while driving — the dev server OOMs on the prototype route

The shared dev server died twice during this pass (`ERR_CONNECTION_REFUSED` mid-leg). The crash log of the
one this pass started is unambiguous: a continuous TanStack-Devtools render diff of
`/src/routes/-prototype-07/marks.tsx` — thousands of `x1/y1/x2/y2` line-attribute diffs — growing until
`FATAL ERROR: Ineffective mark-compacts near heap limit — JavaScript heap out of memory` at ≈4 GB, after
209 s, `SIGABRT`. It is the **prototype's** own re-render loop feeding the devtools, so it is a dev-tooling
cost of the artifact ticket 36 deletes rather than a shipped-app defect — but it takes the server down for
every agent sharing it, which is worth knowing before anyone re-drives these legs.

### Gates

```
$ bun run typecheck            # tsc --noEmit
exit=0                         (no output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
exit=0                         (no output)

$ bun run test                 # vitest run
 Test Files  39 passed (39)
      Tests  1268 passed (1268)
 Duration  2.35s
```

No `oxfmt` run: this pass touched **no** source file — `git status` shows only this ticket under my hand —
and markdown is in `.oxfmtrc.json`'s `ignorePatterns`.

### The four measurement scripts, so the numbers can be retaken

```js
// measure.js — the band stack, the block, the rail, the letterbox. Any width, any collapse state.
(() => {
  const shell = document.querySelector('[data-collapse]');
  const aside = document.querySelector('aside');
  const col = aside.parentElement.querySelector(':scope > div:not(aside)');
  const kids = [...col.firstElementChild.children];
  const h = (e) => e.getBoundingClientRect().height;
  const block = kids.reduce((a, e) => a + h(e), 0);
  const narrow = getComputedStyle(aside.parentElement).flexDirection === 'column';
  return { vp: innerWidth + 'x' + innerHeight, twoCol: !narrow,
    collapse: shell.dataset.collapse, fit: shell.dataset.fit,
    clearance: getComputedStyle(shell).getPropertyValue('--pinned-clearance').trim(),
    colW: col.getBoundingClientRect().width, wInner: col.getBoundingClientRect().width - 48,
    bands: kids.map(h), block, railH: h(aside), railW: aside.getBoundingClientRect().width,
    letterbox: narrow ? 0 : innerHeight - block, sum: narrow ? block + h(aside) : innerHeight };
})()

// banner2.js — the slot, its content, and the line count (content height / line-height).
(() => {
  const aside = document.querySelector('aside');
  const col = aside.parentElement.querySelector(':scope > div:not(aside)');
  const slot = col.firstElementChild.children[0];
  const inner = slot.firstElementChild, span = inner && inner.firstElementChild;
  const btn = inner && inner.querySelector('button');
  const lh = span ? parseFloat(getComputedStyle(span).lineHeight) : 16;
  return { vp: innerWidth + 'x' + innerHeight,
    col: col.getBoundingClientRect().width, slot: slot.getBoundingClientRect().height,
    inner: inner && inner.getBoundingClientRect().height,
    lines: span ? Math.round(span.getBoundingClientRect().height / lh) : 0,
    btnW: btn && btn.getBoundingClientRect().width, txt: span && span.innerText };
})()

// strip.js — the View Strip: each control, the gaps, what the row requires, what it has.
(() => {
  const aside = document.querySelector('aside');
  const col = aside.parentElement.querySelector(':scope > div:not(aside)');
  const row = col.firstElementChild.children[3];
  const cs = getComputedStyle(row), kids = [...row.children], gap = parseFloat(cs.columnGap) || 0;
  const sum = kids.reduce((a, e) => a + e.getBoundingClientRect().width, 0);
  return { vp: innerWidth + 'x' + innerHeight, col: col.getBoundingClientRect().width,
    rowH: row.getBoundingClientRect().height, padding: cs.paddingLeft + '/' + cs.paddingRight, gap,
    innerW: row.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    controls: kids.map((e) => ({ txt: e.innerText.replace(/\n/g, '|'),
      w: +e.getBoundingClientRect().width.toFixed(2), h: +e.getBoundingClientRect().height.toFixed(2) })),
    required: +(sum + gap * (kids.length - 1)).toFixed(2),
    overflowX: row.scrollWidth > row.clientWidth };
})()

// forced.js — B2 neutralised for the measurement only, and reverted in the same eval.
(() => {
  const aside = document.querySelector('aside'), rowBox = aside.parentElement;
  const col = rowBox.querySelector(':scope > div:not(aside)');
  rowBox.style.flexDirection = 'row';
  aside.style.order = '0'; aside.style.flex = '0 0 288px'; aside.style.width = '288px';
  col.style.flex = '1 1 0%'; col.style.minHeight = '0';
  const kids = [...col.firstElementChild.children], strip = kids[3], cells = kids[4];
  const gap = parseFloat(getComputedStyle(strip).columnGap);
  const req = [...strip.children].reduce((a, e) => a + e.getBoundingClientRect().width, 0)
            + gap * (strip.children.length - 1);
  const out = { vp: innerWidth + 'x' + innerHeight,
    colW: +col.getBoundingClientRect().width.toFixed(2),
    track: +(col.getBoundingClientRect().width - 48).toFixed(2),
    railFraction: +(288 / innerWidth * 100).toFixed(1),
    stripRequired: +req.toFixed(2), stripInner: strip.clientWidth - 48,
    stripFits: req <= strip.clientWidth - 48, stripOverflow: strip.scrollWidth - strip.clientWidth,
    cellsOverflow: cells.scrollWidth - cells.clientWidth,
    worstCellTextOverflow: Math.max(0, ...[...cells.querySelectorAll('span')]
      .map((s) => s.scrollWidth - s.clientWidth)) };
  rowBox.style.flexDirection = ''; aside.style.order = ''; aside.style.flex = ''; aside.style.width = '';
  col.style.flex = ''; col.style.minHeight = '';
  return out;
})()
```

**Status stays `claimed`.** Items 2 and 4 are genuinely unsatisfied, they are one cause, and closing them is
a § 5 decision — défaut 1's three options — which a build ticket does not get to take. Items 1, 3, 5, 6 and
7 hold on the measured evidence above, and every figure ticket 36's deletion gate needs — the three budgets,
the banner heights *as they really render*, the View Strip's label widths, and the prototype comparison — is
now written down beside the command that produced it.

---

**Fix pass on this ticket's defects — 2026-08-14.** Verdict: **défaut 1 corrigé**, défauts 2 et 3
**laissés en l'état**, parce que chacun des deux demande une décision de spec et non un correctif.
Every one of the three was **re-reproduced first**, on this host, before anything was touched.

**Environment.** `HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
(KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36`; `agent-browser 0.34.0`; session
`scoutech-fix29`; `devicePixelRatio 1`. **The shared dev server was down when this leg started**
(`curl` → `000`), so a fresh `bun run dev` was started and left running; `curl -s -o /dev/null -w
'%{http_code}'` → **200** before each leg. Same three links as the evidence pass above (`FULL`, `L3`
= `fl=6`→`lo=100`, `B1` = `L=150`→`L=-5`), same walk of the band stack through `aside.parentElement`.

### Défaut 1 — corrigé : le créneau bandeau est de nouveau une fonction de la largeur

**Reproduced first**, exactly as recorded: slot **56** px on a 3-line occupant at a 390 px column
(content 56), **44** on a 2-line one at 480 (content 40), **44** at 1152 (content 28,66);
`--banner: 44px`, a flat `min-height`.

**The seam, and the one thing that changed.** `bannerBudget(columnWidth)` in
`src/lib/layout/contract.ts` — 76 below a 480 px column, 60 below 600, 44 above — was already § 5's
table read down its own column, and (c) was already spending it. **The rendered side was the only
half that ignored it.** So `src/components/app/shell.tsx` now publishes the other two rows as
`--banner-two-lines` / `--banner-three-lines` (built from `BANNER`, never as literals), and
`BannerSlot` re-points `--banner` under two **disjoint** container queries:

```
@min-[480px]:@max-[600px]:[--banner:var(--banner-two-lines)]
@max-[480px]:[--banner:var(--banner-three-lines)]
```

`480` is `RAIL_REFLOW_PX − RAIL_WIDTH` and `600` is `CELL_WRAP_PX` — `bannerBudget`'s own two steps,
**no new breakpoint**. Tailwind emits them as `(width >= 480)` and `(width < 600)`, read back from the
served stylesheet, so the CSS steps exactly where the TypeScript steps. It stays a `min-height` (an
occupant longer than its row still grows instead of clipping), and it re-points a **variable** rather
than adding a second `min-height`, so `compact:min-h-0` still wins the 44 px row the form is owed.

**Measured after, at the three reference viewports:**

| bande | A · 390×664 | budget A | B · 768×1024 | budget B | C · 1440×900 | budget C |
| --- | --- | --- | --- | --- | --- | --- |
| créneau bandeau | **76** | 76 | **60** | 60 | **44** | 44 |
| profil | 219,625 | 220 | 257,438 | 257 | 539,672 | 540 |
| bande de garde | 96 | 96 | 96 | 96 | 176,625 | 177 |
| View Strip | 44 | 44 | 44 | 44 | 44 | 44 |
| cellules | 104 | 104 | 104 | 104 | 52 | 52 |
| **bloc** | **539,625** | **540** | **561,438** | **561** | **856,297** | **857** |
| reste | rail **124,375** | 124 | boîtage **462,563** | 463 | boîtage **43,703** | 43 |
| **total** | **664,000** | 664 | **1024,000** | 1024 | **900,000** | 900 |

**All three budgets now sum as printed** — which is § 5's own section title — and budget A's resting
rail clears `MIN_RAIL` by **4,375 px**, the 4 px the no-app-bar decision rests on, measured instead of
computed. At 390 px the slot reads **76** on the 1-, 2- **and** 3-line occupants (`B1`, `FULL`, `L3`),
which is the point of the fix: the band is the width's row, never the text's.

**Thresholds, to the pixel** (one column, so column = viewport, on `L3`): **479 → 76**, **480 → 60**,
**599 → 60**, **600 → 44**. Identical to `bannerBudget(479 / 480 / 599 / 600)`.

**Two things it also repaired, both measured:**

- **§ 5's pinned-header arithmetic is now exact.** At 390×664, `focus "#rail-h"` → header
  **76 + 44 = 120**, `--pinned-clearance: 120px`, `scroll-margin-top: 120px`; `focus "#rail-xD"` →
  **76 + 44 + 44 = 164** / `164px`. § 5's state table says 120 and 164, and the rendered header used
  to be 88 or 100 under a 120 px reserve. **Ticket 27's 32 px over-reservation at 390 px is now 0** —
  the reserve is still the safe-direction default (`BANNER.threeLines`), it simply stopped
  over-shooting the thing it reserves for. Above a 600 px column it still reserves 120 for an 88 px
  header (1440×700, `tight`·`pinned`, measured), which this ticket already judged correct by design.
- **§ 7's « rank 1's first real occupant lands with no reflow on hydration ».** The Skeleton is the
  same tree, so the server's own HTML (`curl -s http://localhost:3000/`) carries
  `--banner:44px;--banner-two-lines:60px;--banner-three-lines:76px` **and** the slot's two container
  queries: at a 390 px column the Skeleton now reserves the **76** px a three-line summary needs,
  where before it reserved 44 and the band grew to 56 the moment the occupant arrived.

**No regression in ticket 28's states**, re-measured: 390×400 → `compact`, row **44**, slot
`min-height: 0px`, banner 44 inside it; 844×390 (paysage) → `compact`, **44**; 1440×700 →
`tight`·`pinned`, banner **44**, header 88.

**Guarded in `node`**, because the seam is source even though the pixels are not — new case in
`src/lib/layout/contract.test.ts`, *« the banner slot reserves § 5's row for its width, at
`bannerBudget`'s own two thresholds »*: the three rows come from `BANNER` and not from literal pixels
in a class string, the two container queries are `RAIL_REFLOW_PX − RAIL_WIDTH` and `CELL_WRAP_PX`, and
`bannerBudget` steps at exactly those. A flat `--banner` or an invented third breakpoint fails it.

**Défaut 1's three options end up moot.** What the code now does is option (ii) — the rendering
matches the table — and it took **no § 5 table** with it, because the table was already right and the
sentence that had to go was `contract.ts`'s own gloss (« the Skeleton reserves the **one-line**
height »), which § 7's no-reflow rule contradicts at 390 px. Option (i) would have restated § 5's
banner rows and widened the (c) margin the no-app-bar argument is built on; option (iii) would have
made « each summing to the viewport » false by declaration.

### Défaut 2 — reproduit, **non corrigé** : une collision § 5 / § 8, pas un défaut de code

Re-reproduced at 390×664 on `http://localhost:3000/?L=-5` (HTTP **200**): completion strip **217 px**,
inner row **447**, chart column **507,625** (measured before the défaut 1 fix), `aside` **0 px** with
`scrollHeight 1808` — `217 + 507,625 + 0 = 724,625` inside a 664 px `overflow: hidden` shell, with
`data-collapse="whole"` / `data-fit="roomy"` and `MIN_RAIL` missed by its whole 120.

**Why the band is not in `availableHeight`, and why adding it is not a repair.** § 5's budget A band is
« 0 | 60 » and § 5 says « with the ignored-keys strip up **the rail drops to 64 px** — tolerable only
because that strip is dismissible and the block collapses on the first scroll ». § 8 states the same
thing as arithmetic: « the strip spends **60 of the 124 px of resting rail** at 390 px. That
arithmetic *is* the justification for manual-dismissal-only ». **Both sentences spend the strip out of
the Rail on purpose, and neither lets it reach condition (c).** Subtracting the band inside
`fitsWholeBlock` / `compactRequired` — this ticket's option (i), « the smallest » — makes § 5's 64 px
sentence false and collapses the whole block at 390 px whenever *any* strip is up: available 604,
block 539,6 > 604 − 120 = 484. The collision is one level up: **§ 8's mandated copy does not fit
§ 5's 60 px reservation.** § 8 requires the completion sentence to « name the values, not just the
fields », and 19 named values measure **217 px** at a 342 px column — at which point the escape hatch
both sections lean on (« the block collapses on the first scroll ») is gone, because there is 0 px of
Rail left to scroll.

**The decision, named and not taken.** Three ways out, each contradicting a different sentence that is
currently in force:

- **(i) count the band in the available height** — contradicts § 5's « the rail drops to 64 px » and
  § 8's « 60 of the 124 px of resting rail »: with any strip up, the picture goes away instead.
- **(ii) cap the band at its budgeted 60 px** with an internal scroller (§ 5's own « fixed-height
  shell with internal scrollers ») — keeps both sentences literally true, at the price of putting
  § 8's « the recipient can read every number they got » behind a scroll gesture.
- **(iii) shorten the copy** to a count plus a disclosure — contradicts § 8's « names the values, not
  just the fields », which is that sentence's entire stated purpose.

Nothing under `src/` was touched for this one. Both escapes stand as measured, and with the défaut 1
fix in they are unchanged in kind: the strip's `✕` restores the sum (rail **124,375**, total
**664,000**), and `focus "#rail-L"` pins the block. The state is recoverable, but only by someone who
guesses one of those two.

### Défaut 3 — **non corrigé**, and deliberately not re-driven

The prototype's devtools leak is a dev-tooling cost of `src/routes/-prototype-07/**`, whose deletion
**is ticket 36** and out of scope here; the prototype is also the frozen source of item 7 above and of
ticket 30's comparison, so it may not be edited either. And reproducing it means driving the dev
server to a 4 GB OOM — i.e. **taking the shared server down for every other agent**, the exact harm
the defect describes. Recorded here as an operational warning instead: *do not load
`/prototype/profile-view` with the devtools attached on a shared dev server.*

### Gates

```
$ bunx oxfmt --write src/components/app/shell.tsx src/lib/layout/contract.ts \
    src/lib/layout/contract.test.ts
Finished in 148ms on 3 files using 32 threads.

$ bun run typecheck            # tsc --noEmit
exit=0                         (no output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
exit=0                         (no output)

$ bun run test                 # vitest run
 Test Files  39 passed (39)
      Tests  1269 passed (1269)      # 1268 + the banner-slot source case
 Duration  1.20s
```

Files touched: `src/components/app/shell.tsx` (the two extra rows and the slot's two container
queries), `src/lib/layout/contract.ts` (one doc sentence, the one § 7 contradicted) and
`src/lib/layout/contract.test.ts` (the new case). No prototype file, and no other ticket's file.

**Status → `done`.** All seven acceptance items hold on measured evidence: items 2 and 4 were the two
the banner slot failed, and they are re-measured above at **561,44 / 462,56** and **44 / 60 / 76**.
**Two things leave this ticket as the owner's decisions rather than as its own work:** défaut 2's
§ 5 / § 8 collision — options (i)–(iii) above — and défaut 3, which dies with ticket 36.

---

**Independent re-verification — 2026-08-14.** Verdict: **défaut 1 confirmé corrigé**, **défaut 2
toujours présent et mesurablement aggravé par le correctif**, défaut 3 **partiellement quantifié**.
All seven acceptance items re-walked from scratch on this host; every number below is my own
measurement, taken after the fix pass and after the other tickets' fixes landed under it. **Nothing
under `src/` was touched by this pass** — `git status` shows only this ticket file under my hand.

**Environment.** `HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
(KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36`; `agent-browser 0.34.0`; session
`scoutech-t29-re`; `devicePixelRatio 1`. **The orchestrator's dev server was up** —
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → **200**, and 200 on each of the
three links before each leg. It was reused, never restarted and never killed. Same three links
(`FULL`, `L3` = `fl=6`→`lo=100`, `B1` = `L=150`→`L=-5`), same four scripts, same walk of the band
stack through `aside.parentElement`. Every viewport was set with `agent-browser set viewport` and
then **read back from `window.innerWidth/innerHeight`** before any dimension was recorded.

**Layout had moved under this ticket, and it had to be re-measured rather than re-read.** `git
status` at the start of this pass shows nine other src files changed since the fix pass —
`chart-block.tsx`, `profile.tsx`, `view-strip.tsx`, `link-strip.tsx`, `app.tsx`, `banner.tsx`,
`styles.css`, `rail/inputs.tsx`, plus the new `use-viewport.ts` / `use-collapse.ts` /
`collapse.ts`. The suite is at **1288** tests, not the fix pass's 1269. Every band below is
therefore a fresh reading, not a citation.

### Défaut 1 — **gone.** The slot is the width's row, on all three occupants

Re-driven exactly as the defect's repro reads: `set viewport`, open, `wait "#rail-L"`, read the
slot's `getBoundingClientRect().height` plus its `min-height` and its resolved `--banner`.

| occupant (lignes rendues) | col 390 | col 480 | col 1152 |
| --- | --- | --- | --- |
| `B1` « ⛔ 1 erreur bloquante — aucun résultat » | 1 ligne · **slot 76** | 1 · **60** | 1 · **44** |
| `FULL` « Choisissez un régime… » | 2 lignes · **76** | 2 · **60** | 1 · **44** |
| `L3` « ⛔ Tension impossible — … 149,11 m · valeur : 100,00 m. » | 3 lignes · **76** | 2 · **60** | 1 · **44** |

`min-height` and the resolved `--banner` read **76px / 60px / 44px** at the three columns — one value
per column, **never a function of the occupant**, which is the whole content of the fix. Was
**44 / 44 / 56**.

**Thresholds, re-taken to the pixel** (one column on `L3`, so column = viewport): **479 → 76**,
**480 → 60**, **599 → 60**, **600 → 44**. Against the TypeScript side read out of the module itself
(`bun -e "import('src/lib/layout/contract.ts')"`): `bannerBudget(479 / 480 / 599 / 600)` =
**76 / 60 / 60 / 44**. **The CSS steps where the TS steps**, so (c)'s term and the rendered band
cannot disagree.

**And the arithmetic half is closed too**, which is what défaut 1 actually cost: `chartBlockHeight`
now returns **539,64 / 561,44 / 856,32** at columns 390 / 480 / 1152, against a **rendered** block of
**539,625 / 561,4375 / 856,297** — agreement to **0,03 px** at every reference width. The 16–20 px
over-statement is 0.

### The three budgets — all three sum, on all three occupants

Bands unrounded, `FULL` / `L3` / `B1` measured separately and **identical at each viewport** (they
must be: every band is a function of width):

| bande | A · 390×664 | budget A | B · 768×1024 | budget B | C · 1440×900 | budget C |
| --- | --- | --- | --- | --- | --- | --- |
| colonne graphique | 390 | 390 | 480 | 480 | 1152 | 1152 |
| `W_inner` | 342 | 342 | 432 | 432 | 1104 | 1104 |
| créneau bandeau | **76** | 76 | **60** | 60 | **44** | 44 |
| profil | 219,625 | 220 | 257,4375 | 257 | 539,672 | 540 |
| bande de garde | 96 (plancher) | 96 | 96 (plancher) | 96 | 176,625 | 177 |
| View Strip | 44 | 44 | 44 | 44 | 44 | 44 |
| cellules | 104 (2 rangées) | 104 | 104 | 104 | 52 (1 rangée) | 52 |
| **bloc** | **539,625** | **540** | **561,4375** | **561** | **856,297** | **857** |
| reste | rail **124,375** | 124 | boîtage **462,5625** | 463 | boîtage **43,703** | 43 |
| **total** | **664,000** | 664 | **1024,000** | 1024 | **900,000** | 900 |

`data-collapse="whole"` / `data-fit="roomy"` / `--pinned-clearance: 0px` / `--kb: 0px` at all three.
Budget A's resting rail clears `MIN_RAIL` by **4,375 px** — § 5's own 4 px, measured. **Items 1, 2
and 3 hold.**

### The two knock-ons the fix claimed — both re-measured, both hold

- **Pinned header, 390×664.** `focus "#rail-h"` → bands `[76, 0, 0, 0, 44]`, header **120**,
  `--pinned-clearance: 120px`, `scroll-margin-top: 120px`. `focus "#rail-xD"` → `[76, 0, 0, 44, 44]`,
  header **164**, clearance **164px**, `scroll-margin-top: 164px`. **Identical on all three
  occupants** (`FULL`, `L3`, `B1`) — § 5's state table says 120 and 164, and the reserve now matches
  the thing it reserves for **exactly**. Ticket 27's 32 px over-reservation at a 390 px column is
  **0**. Above a 600 px column the safe-direction default still over-reserves: 1440×700 →
  `pinned`·`tight`, header **88**, clearance **120px**, which this ticket already judged correct by
  design.
- **§ 7's no-reflow-on-hydration.** Structural, not a sampled reflow, and labelled as such: the
  served HTML (`curl -s http://localhost:3000/`) carries `--banner:44px`,
  `--banner-two-lines:60px`, `--banner-three-lines:76px` **and** the slot's class list
  `min-h-[var(--banner)] … @max-[480px]:[--banner:var(--banner-three-lines)]
  @min-[480px]:@max-[600px]:[--banner:var(--banner-two-lines)]`. So the Skeleton reserves the row
  *its* column produces before any JS runs. **I did not race the hydration frame** — the pre- and
  post-hydration slot heights were not sampled, so « no reflow » is a CSS/DOM fact here, not a
  measured absence of movement.

### No regression in ticket 28's states, and none in the rest of the journey

| viewport | collapse · fit | rangée | créneau | `min-height` du créneau | `--pinned-clearance` |
| --- | --- | --- | --- | --- | --- |
| 390×400 | `compact` · `tight` | **44** | 44 | **0px** | 44px |
| 844×390 (paysage) | `compact` · `tight` | **44** | 44 | **0px** | 44px |
| 1440×700 | `pinned` · `tight` | **88** | 44 | 44px | 120px |

`compact:min-h-0` still wins the 44 px row at both narrow states even though `--banner` resolves to
76px / 60px there — which is precisely the property the fix said it preserved by re-pointing a
variable instead of adding a second `min-height`. **Confirmed on the rendered box, not on the class
list.**

### Items 5, 6, 7 — re-taken, unchanged

**Item 5.** Row `px-[var(--gutter)]` 24 a side, `gap-3` = 12, four children:

| | à vide | corde | ×1 | `x … m · 50 %` | Σ | + 3 × 12 | **requis** | dispo | rangée | `scrollW − clientW` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| abrégé, col **390** (`W_inner` **342**) | 49,27 | 48,00 | 29,77 | 125,30 | 252,33 | 36 | **288,33** | **342** | **44 px, 1 ligne** | **0** |
| abrégé, col 480 | 49,27 | 48,00 | 29,77 | 125,30 | 252,33 | 36 | **288,33** | 432 | 44, 1 ligne | 0 |
| complet, col 1152 | 77,36 | 71,38 | 98,88 | 125,30 | 372,91 | 36 | **408,91** | 1104 | 44, 1 ligne | 0 |

**288,33 against 342 — fits with 53,67 px to spare**, row **44 px**, no wrap. Full labels need
**408,91** against 342: short by **66,91**. Identical to the evidence pass to the hundredth, so
`view-strip.tsx`'s edit since did not move it.

**Item 6.** Sweeping `set viewport <w> 900` on `FULL`: **768 → 2 col, rail 288, colonne 480**;
**767 → 1 col, rail = colonne = 767**. **B2 fires between 768 and 767, to the pixel.** The banner
steps with the column in the same sweep (viewport 888 / col 600 → **44**; viewport 886 / col 598 →
**60**), i.e. `CELL_WRAP_PX` governs the cells *and* the banner row at one threshold, no new
breakpoint. Cells 52 at col ≥ 600, 104 below; worst `scrollWidth − clientWidth` **0** at every
shipped width ≥ 768.

With B2 neutralised **for the measurement only** and reverted in the same `eval`:

| viewport | colonne | piste | rail % | strip requis / dispo | tient | clip strip | clip texte cellule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 888 | 600 | 552 | 32,4 | 408,91 / 552 | oui | 0 | 0 |
| **864** | 576 | 528 | **33,3** | 288,33 / 528 | oui | 0 | 0 |
| 768 | 480 | 432 | 37,5 | 288,33 / 432 | oui | 0 | 0 |
| 625 | 337 | 289 | 46,1 | 288,33 / **289** | **oui, de 0,67 px** | 0 | 0 |
| **624** | 336 | 288 | 46,2 | 288,33 / **288** | **non** | 0 | 0 |
| **611** | 323 | 275 | 47,1 | 288,33 / 275 | non | **1** | 0 |
| 600 | 312 | 264 | 48,0 | 288,33 / 264 | non | 12 | 0 |
| 520 | 232 | 184 | 55,4 | — | non | 92 | **1** |
| 480 | 192 | 144 | 60,0 | — | non | 132 | 14 |
| 390 | **102** | **54** | 73,8 | — | non | 222 | 44 |

**624 px is the first width at which side-by-side is genuinely unacceptable** (§ 5's 44 px touch row
stops fitting: 288,33 required against 288) and **611 px the first at which it visibly clips**. B2 at
768 fires **144 px before** the first hard failure. Every figure reproduces the evidence pass.

**Item 7.** The prototype is untouched (`git status` clean under `src/routes/-prototype-07/**`), and
`/prototype/profile-view?variant=D&scenario=z1` answers **200**. Prototype inner plot = SVG minus
`chart-kit.ts`'s own pad `{top 28, right 16, bottom 24, left 16}`:

| | 390×664 | 768×1024 | 1440×700 | 1440×900 | 1440×1200 |
| --- | --- | --- | --- | --- | --- |
| prototype colonne | **102** | 480 | 1152 | 1152 | 1152 |
| prototype plot interne | 70 × 323 | 448 × 616 | 1120 × 389 | 1120 × 539 | 1120 × 764 |
| **prototype aspect** | **4,6143** | **1,3750** | **0,3473** | **0,4813** | **0,6821** |
| prototype badge VE | **×47** | ×14 | ×3,5 | **×4,9** | **×6,9** |
| **app** `--profile-plot` | — | — | **463,672** | **463,672** | **463,672** |
| **app** `--strip` | — | — | **176,625** | **176,625** | **176,625** |
| **app** aspect | — | — | **0,42** | **0,42** | **0,42** |
| **app** badge VE | — | — | **×1,9** | **×1,9** | **×1,9** |

**The comparison § 5 rests on reproduces exactly**: at one width the prototype's VE runs ×3,5 → ×6,9
over 500 px of window height, with the aspect outside the Plot Aspect Band [0,35 – 0,50] at both
ends, while the app's three figures are **byte-identical** across 700 … 1200. The prototype's 390 px
end is still a 102 px column, a 70 px plot and **×47**. Same caveat as the evidence pass, restated
rather than papered over: the prototype runs §15 `z1` and the app `FIRST_RUN_SCENARIO`, so the VE
*numbers* are not the same quantity — what is compared is the **variance with the box**. (At 1440×700
and ×800 the app is `pinned`·`tight`, so its two figures there are the computed custom properties
read back through a throwaway `div`; at 900 / 1000 / 1200 they are the rendered bands, and the two
agree to 0 px.)

### Défaut 2 — **still present, and the défaut 1 fix widened it from 60,6 px to 92,6 px**

Re-driven verbatim: `set viewport 390 664`, `open "http://localhost:3000/?L=-5"` (`curl` → **200**),
`wait "#rail-L"`.

| | evidence pass | fix pass (measured before its own fix) | **this pass, after the fix** |
| --- | --- | --- | --- |
| bandeau « champs absents » | 217 | 217 | **217** |
| bloc graphique | 507,625 | 507,625 | **539,625** |
| `aside` (rail) | 0 (`scrollHeight` 1808) | 0 (1808) | **0** (`scrollHeight` **1808**) |
| somme dans une coque de 664 | 724,625 | 724,625 | **756,625** |
| **débordement sous `overflow: hidden`** | **60,625** | 60,625 | **92,625** |
| état | `whole` · `roomy` | `whole` · `roomy` | **`whole` · `roomy`** |

**This is the fix's one adverse knock-on, and it is arithmetic, not bad luck**: the banner row at a
390 px column went 44 → 76, so the uncounted band's overflow went 60,625 → **92,625 px**, and
`MIN_RAIL` is still missed by its whole **120**. The fix pass named défaut 2 a § 5 / § 8 collision
and left it — which I agree is the right call, and **it is still not decidable in a build ticket** —
but the decision is now **32 px more expensive** than when it was written up, and option (i)
(« count the band in the available height ») is correspondingly further out of reach: available
664 − 217 = 447, block 539,625, so the block cannot fit *at all* under the strip, let alone leave
`MIN_RAIL`. Options (i)–(iii) stand exactly as the fix pass stated them; only their price moved.

**Both escapes re-verified, and both still work.** The strip's `[ Masquer ce message ]` (`✕`,
`aria-label` « Masquer ce message », found by snapshot) → rail back to **124,375**, sum **664,000**,
`whole`. `focus "#rail-L"` → `pinned`, colonne **120**, rail **327**, and `217 + 120 + 327 = 664`
**exactly**. So the state is recoverable by the dismiss button and by the keyboard, and **not** by
touching the Rail — there is none on screen to touch. Still only reachable by a hand-truncated link;
the app's own « Copier le lien » writes all 20 keys.

**Why item 1 is still ticked with défaut 2 open**, stated plainly so the tick is not read as a
contradiction: item 1 asks for the bands to sum and for ≥ 120 px of **resting** Rail, and § 5 itself
does **not** promise `MIN_RAIL` with the strip up — its budget A band is « 0 | 60 » and its own
sentence is « the rail drops to **64 px** ». At rest the bands sum to 664,000 with **124,375** px of
Rail. The strip-up state is a separate, named § 5 / § 8 collision, not this item's subject.

### Défaut 3 — **not fixed, deliberately not driven to OOM, and now partly quantified**

I did not reproduce the crash: driving the dev server to a 4 GB OOM takes the shared server down for
every other agent, which is the harm the defect describes, and `src/routes/-prototype-07/**` is
frozen (deletion is ticket 36, out of scope). But item 7 needs that route loaded anyway, so the leak
was **measured on the way past**, watching the vite process (`ps -o rss= -p <vite pid>`):

| moment | vite RSS |
| --- | --- |
| avant la manche prototype (serveur en place depuis 1 h 39) | **323 512 kB** |
| après ≈ 55 s sur `/prototype/profile-view?variant=D`, 5 changements de viewport | **426 932 kB** |
| après retour sur `/`, 6 échantillons consécutifs | **373 344 kB**, stable (identique aux 6) |

**+103 MB in ~55 s of driving that one route — ≈ 1,9 MB/s — and it plateaus the moment you leave
it.** That is consistent with the reported cause (the prototype's own re-render loop feeding the
TanStack-Devtools source diff) and with the reported 4 GB / 209 s figure, without spending a server
to prove it. **The operational warning stands**: do not dwell on `/prototype/profile-view` with the
devtools attached on a shared dev server. Nothing here is a shipped-app defect, and nothing here is
fixable inside this ticket.

### Not observable on this host — re-confirmed, not inferred

- **Coarse pointer / real touch.** `navigator.maxTouchPoints` **0**, `matchMedia('(pointer: coarse)')`
  **false**. Every 44 px figure above — the View Strip row, the pinned header's rows, the compact row —
  is a **CSS / layout fact under a fine pointer**. No tap semantics were exercised.
- **Soft keyboard.** None on this Linux host; `--kb` read **0px** in every state measured, including
  the two `compact` ones. Nothing above claims a keyboard-driven height.
- **`interactive-widget=resizes-content`** is present in the served HTML and correct;
  `matchMedia('(interactive-widget: resizes-content)')` is **false** here, because only Safari honours
  it. Not a defect, and not a measurement of iOS behaviour.
- **Hydration reflow** was not sampled — see the knock-on note above. It is a DOM/CSS fact.
- **Timing.** No frame sampled: drag performance is ticket 30's.

### Gates — run by me, on the tree as it stands

```
$ bun run typecheck            # tsc --noEmit
exit=0                         (no output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
exit=0                         (no output)

$ bun run test                 # vitest run  (v4.1.10)
 Test Files  39 passed (39)
      Tests  1288 passed (1288)
 Duration  1.17s
```

**1288, not the fix pass's 1269** — the other tickets' fixes landed in between; all green either way.
The fix's own guard is real and source-level, not a tautology:
`src/lib/layout/contract.test.ts:608` asserts the three rows are spelled from `BANNER`, that the two
container queries are `RAIL_REFLOW_PX − RAIL_WIDTH` and `CELL_WRAP_PX`, and that `bannerBudget`
steps at exactly those — a flat `--banner` or an invented third breakpoint fails it.

No `oxfmt` run: this pass touched **no** source file, and markdown is in `.oxfmtrc.json`'s
`ignorePatterns`.

**Status stays `done`.** All seven acceptance items pass on **my own** measurements, taken after both
the fix and the other tickets' churn. Two things remain the owner's, unchanged in kind and named
above: **défaut 2**'s § 5 / § 8 collision — now 92,625 px of overflow rather than 60,625, so its
options (i)–(iii) are worth re-pricing before choosing — and **défaut 3**, which dies with ticket 36.

---

## Les trois budgets après l'amendement F — re-mesure indépendante, session `capverify`, 2026-08-14

Le plafond du tracé (amendement **F**, décision de l'utilisateur du 2026-08-14) touche § 5 ; la
condition que la décision devait respecter est que **rien au niveau du bureau de référence ou en
dessous ne bouge**. Re-mesuré ici de zéro, sur le `FULL` de ce ticket (HTTP **200**), **lecture seule
sur `src/**`** et sans toucher aucune ligne `Status:`. L'arc large et la porte de zoom sont dans
[le ticket 28](./28-constrained-height-and-keyboard-modes.md).

**Environnement.** `HeadlessChrome/151.0.0.0`, `devicePixelRatio 1`, `agent-browser`, session
**`capverify`** (fermée à la fin par `--session` ; le serveur de dév partagé réutilisé, jamais tué —
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → **200** avant et après). Viewports
posés avec `agent-browser set viewport` puis **relus depuis `innerWidth`/`innerHeight`** ; bandes en
`getBoundingClientRect()` ; `--profile-plot` / `--strip` relus à travers un `div` jetable.

| bande | A · 390 × 664 | ce ticket, avant F | B · 768 × 1024 | avant F | C · 1440 × 900 | avant F |
| --- | --- | --- | --- | --- | --- | --- |
| colonne graphique | 390 | 390 | 480 | 480 | 1152 | 1152 |
| `W_inner` | 342 | 342 | 432 | 432 | 1104 | 1104 |
| créneau bandeau | 76 | 76 | 60 | 60 | 44 | 44 |
| profil | **219,625** | 219,625 | **257,4375** | 257,4375 | **539,671875** | 539,672 |
| `--profile-plot` | **143,625** | — | **181,4375** | — | **463,671875** | 463,672 |
| bande de garde | **96** (plancher) | 96 | **96** (plancher) | 96 | **176,625** | 176,625 |
| View Strip | 44 | 44 | 44 | 44 | 44 | 44 |
| cellules | **104** (2 rangées) | 104 | **104** | 104 | **52** (1 rangée) | 52 |
| **bloc** | **539,625** | **539,625** | **561,4375** | **561,4375** | **856,296875** | **856,297** |
| reste | rail **124,375** | 124,375 | boîtage **462,5625** | 462,5625 | boîtage **43,703125** | **43,703** |
| **total** | **664,000** | 664,000 | **1024,000** | 1024,000 | **900,000** | 900,000 |

`data-collapse="whole"` · `data-fit="roomy"` · `--pinned-clearance: 0px` · `--kb: 0px` aux trois.
**Les trois budgets sont identiques, chiffre pour chiffre, à ce que ce ticket avait enregistré avant
que l'amendement F existe** — y compris le boîtage délibéré de **43,703 px** du budget C et les
**124,375 px** de rail au repos du budget A, qui dégagent `MIN_RAIL = 120` de **4,375 px**, le 4 px de
§ 5. Le `min()` du plafond est donc bien transparent à `W_inner` 342, 432 et **1104** : à 1104 le
tracé vaut **exactement** le plafond (463,671875), ce qui est tout le contenu de « rien ne bouge à la
référence ». Aucun débordement : `scrollHeight − clientHeight` = **0** sur la colonne aux trois.

**L'invariance de 1440 × {700 … 1200} tient, et c'est l'ancre du plafond** — la ligne du tableau de
l'item 7 dont l'amendement F tire sa constante :

| 1440 × … | 700 | 800 | 900 | 1000 | 1200 |
| --- | --- | --- | --- | --- | --- |
| `--profile-plot` | **463,671875** | **463,671875** | **463,671875** | **463,671875** | **463,671875** |
| `--strip` | 176,625 | 176,625 | 176,625 | 176,625 | 176,625 |
| aspect obtenu | **0,419993** | 0,419993 | 0,419993 | 0,419993 | 0,419993 |
| badge VE | **×1,9** | ×1,9 | ×1,9 | ×1,9 | ×1,9 |
| état | `pinned` · `tight` | `pinned` · `tight` | `whole` · `roomy` | `whole` · `roomy` | `whole` · `roomy` |

Identique au chiffre à ce que l'item 7 avait enregistré : **une largeur, cinq hauteurs, une seule
valeur**. Le plafond n'a donc rien changé ici non plus — il *est* cette valeur.

**Ce que la re-mesure ne couvre pas** : les items 4, 5, 6 et 7 de ce ticket n'ont pas été re-pris,
seuls les trois budgets et l'invariance de hauteur l'ont été ; les bandeaux 76 / 60 / 44 apparaissent
ci-dessus parce qu'ils sont un terme du bloc, pas comme une re-vérification de l'item 4. Statut de ce
ticket **inchangé (`done`)**.

**Ajout du 2026-08-14 — les décisions 5 et 3 laissent les trois budgets où ils sont.** La décision 5
grossit le texte des champs numériques du Rail (12 → **16 px**) et sa correction de largeur resserre leur
gouttière (`px-2` → **`px-1`**) : **la boîte de bordure reste 80 × 28** dans les deux cas, donc aucun
terme de ce tableau ne bouge. Re-mesuré après les deux changements, sur Session vierge
(`localStorage.clear()`, session `fixdec-7cbe9071d13d`) : budget A **bloc 539,625 · rail 124,375 ·
total 664,000 · colonne 390**, budget C **bloc 856,296875 · colonne 1152**, `whole` · `roomy` aux deux —
identiques au chiffre à la table ci-dessus. **La décision 3 est un `NO CODE CHANGE`** : 1280 × 720,
1366 × 768 et 1512 × 850 ouvrent en en-tête épinglé et c'est réglé, budget C intouchable — voir
[AMENDMENTS.md § F, coût 3 « SETTLED »](../AMENDMENTS.md). Détail et résidus dans
[le ticket 28](./28-constrained-height-and-keyboard-modes.md). Statut toujours **inchangé (`done`)**.

---

## Re-measurement addendum — the seven items against decision 5 — 2026-08-15

**Role: re-measurement agent, not the implementer and not a reviewer.** **Read-only on `src/**`** —
nothing under `src/` was touched, `src/routes/-prototype-07/**` and `src/routes/prototype.profile-view.tsx`
were not opened, ticket 36 is out of scope. Every table above stands as written; this one supersedes by
pointer, because dated evidence is amendment B's rule.

**Why.** [Decision 5 of 2026-08-14](./28-constrained-height-and-keyboard-modes.md) took the Rail's
fifteen numeric fields from `text-xs` (12 px) to `text-base` (16 px), then tightened their gutter from
`px-2` to `px-1`. Its accepted cost names **this ticket's measurements** among what it moves. The
2026-08-14 *Ajout* at the end of the `capverify` comment re-checked budgets **A and C** on a clean
Session; it did not re-take **budget B**, the banner rows, the View Strip's label widths or the pinned
header. Those are re-taken here.

**Environment.** `HeadlessChrome/151.0.0.0` — UA `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36
(KHTML, like Gecko) HeadlessChrome/151.0.0.0 Safari/537.36`, `devicePixelRatio 1`. `agent-browser
0.34.0`, session **`remeas5`**, closed at the end with `--session` only — **the shared dev server was
reused, never killed, never `close --all`**; `curl -s -o /dev/null -w '%{http_code}'
http://localhost:3000/` → **200** before and after, and **200** on this ticket's own `FULL` and `B1`.
Every viewport was set with `agent-browser set viewport` and then **read back from
`innerWidth`/`innerHeight`** before any number was recorded; geometry is `getBoundingClientRect()` /
`getComputedStyle()`, through this ticket's own `measure.js` / `banner2.js` / `strip.js` walk of the band
stack (`aside.parentElement` → the sibling that is not the `aside`). `localStorage.clear()` first, and
every resting row taken after `aside.scrollTop = 0` **and** a blur.

### The counterfactual, so the attribution is not a story

Decision 5's two edits — a computed font size and a horizontal padding on the Rail's
`input[inputmode="decimal"]` — were **reverted in the page** in one frame (`font-size: 12px;
line-height: 16px; padding: 0 8px`, i.e. `text-xs`'s metrics and `px-2`'s gutter), measured, removed,
measured again. At 390 × 664, 768 × 1024 and 1440 × 900 the block, the Rail, the five Rail sections,
`aside.scrollHeight`, the Rail's horizontal extent and the fields' border boxes are **byte-identical in
all three states**. `h-7` is a 28 px border box, `text-base`'s line height is 24 px, and the row's label
is still `text-xs`: the text grows inside the box. **Decision 5 costs this ticket nothing.**

### Items 1, 2, 3 — the three budgets, re-taken from zero

| bande | A · 390 × 664 | budget A | B · 768 × 1024 | budget B | C · 1440 × 900 | budget C |
| --- | --- | --- | --- | --- | --- | --- |
| colonne graphique | 390 | 390 | 480 | 480 | 1152 | 1152 |
| `W_inner` | 342 | 342 | 432 | 432 | 1104 | 1104 |
| créneau bandeau | **76** | 76 | **60** | 60 | **44** | 44 |
| profil | **219,625** | 220 | **257,4375** | 257 | **539,6719** | 540 |
| bande de garde | **96** (plancher) | 96 | **96** (plancher) | 96 | **176,625** | 177 |
| View Strip | **44** | 44 | **44** | 44 | **44** | 44 |
| cellules | **104** (2 rangées) | 104 | **104** | 104 | **52** (1 rangée) | 52 |
| **bloc** | **539,625** | 540 | **561,4375** | 561 | **856,2969** | 857 |
| reste | rail **124,375** | 124 | boîtage **462,5625** | 463 | boîtage **43,7031** | 43 |
| **total** | **664,000** | 664 | **1024,000** | 1024 | **900,000** | 900 |

`whole` · `roomy` · `--pinned-clearance: 0px` · `--kb: 0px` at all three; column overflow
(`scrollHeight − clientHeight`) **0** at all three. **Identical, digit for digit, to this ticket's
independent re-verification and to the post-amendment-F `capverify` table.** Budget A's resting Rail is
**124,375**, clearing `MIN_RAIL = 120` by **4,375 px** — § 5's own 4 px, still measured rather than
computed. **Budget B is the one this ticket's decision-5 note had not re-taken; it is unchanged.**
**Items 1, 2 and 3 hold.**

### Item 4 — the banner slot is still the width's row

| colonne | `--banner` résolu | `min-height` | créneau rendu | occupant (`FULL`, 2 lignes) |
| --- | --- | --- | --- | --- |
| **390** | **76px** | **76px** | **76** | contenu 40, 2 lignes |
| **480** | **60px** | **60px** | **60** | contenu 40, 2 lignes |
| **1152** | **44px** | **44px** | **44** | contenu 28,656, 1 ligne |

One value per column, never a function of the occupant — défaut 1's fix, intact. **Item 4 holds.**
(Not re-swept across the 479/480/599/600 thresholds here: they are a function of the chart column, which
decision 5 cannot reach, and this ticket's re-verification took them to the pixel.)

### Item 5 — the View Strip's labels against 342 px, to the hundredth

| | à vide / ligne à vide | corde / corde A–B | ×1 / ×1 vraie échelle | `x … m · 50 %` | Σ | + 3 × 12 | **requis** | dispo | rangée | `scrollW − clientW` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| abrégé, col **390** (`W_inner` **342**) | **49,27** | **48,00** | **29,77** | **125,30** | **252,33** | 36 | **288,33** | **342** | **44 px, 1 ligne** | **0** |
| abrégé, col 480 | 49,27 | 48,00 | 29,77 | 125,30 | 252,33 | 36 | **288,33** | 432 | 44 px, 1 ligne | 0 |
| complet, col 1152 | **77,36** | **71,38** | **98,88** | **125,30** | **372,91** | 36 | **408,91** | 1104 | 44 px, 1 ligne | 0 |

**288,33 against 342 — fits with 53,67 px to spare**, row **44 px**, no wrap; the full labels still need
**408,91** against 342, short by **66,91**. Identical to both earlier passes. The strip is in the chart
column, not the Rail, so decision 5 has no reach into it — and the measurement says so rather than the
argument alone. Recorded as before, not this item's: the four control shells are **32 px** inside the
44 px row (ticket 35's). **Item 5 holds.**

### The pinned-header knock-on this ticket claimed — re-measured, still exact

| leg | `--pinned-clearance` | en-tête rendu | `scroll-margin-top` |
| --- | --- | --- | --- |
| 390 × 664, `focus #rail-h` | **`120px`** | **120** = 76 + 44 | **`120px`** |
| 390 × 664, `focus #rail-xD` | **`164px`** | **164** = 76 + 44 + 44 | **`164px`** |
| 390 × 844, `focus #rail-xD` | `164px` | **164** | `164px` |
| 844 × 390 · 1024 × 400 (`compact`) | **`44px`** | **44** | `44px` |
| 1440 × 700 | `120px` | **88** | — |

**The reserve matches the thing it reserves for exactly at 390 px**, and above a 600 px column it still
over-reserves in the safe direction, which this ticket already judged correct by design. Unchanged.

### Items 6 and 7 — not re-taken here, and why

**Item 6** (B2 at 768/767, and the first width where side-by-side becomes unacceptable) and **item 7**
(the prototype comparison and the 1440 × {700 … 1200} invariance) are functions of the **chart column**
and of a frozen artifact. Neither reads a Rail field, the counterfactual leaves both untouched by
construction, and item 7's route is the one whose devtools leak takes the shared dev server down —
défaut 3's own operational warning. They were **deliberately not re-driven**; their last readings are
this ticket's independent re-verification and the `capverify` invariance table.

### Verdicts

**No acceptance item changes state, and nothing is unticked.** Items 1–5 and the pinned-header knock-on
hold on the measurements above; items 6 and 7 are out of decision 5's reach and are stated as not
re-driven rather than claimed. **`Status:` stays `done`** — `docs/agents/issue-tracker.md` admits `done`
when every acceptance item passes, and all seven still do. The two things this ticket already leaves to
the owner are unchanged in kind and **not re-priced here**: **défaut 2**'s § 5 / § 8 collision (92,625 px
of overflow) and **défaut 3**, which dies with ticket 36.

### Not observable on this host — re-confirmed, not inferred

`navigator.maxTouchPoints` **0** and `matchMedia('(pointer: coarse)')` **false** without CDP touch
emulation, which this leg did not enable — every 44 px figure above is a CSS/layout fact under a **fine**
pointer. No soft keyboard: `--kb` read **`0px`** in every row above. `interactive-widget=resizes-content`
present in the served markup, honoured by Safari alone. No hydration frame was raced. No image compared
against a reference.

### Gates, as this leg leaves them

```
$ bun run typecheck            # tsc --noEmit
$ tsc --noEmit
exit=0                         (no output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
$ oxlint --type-aware --type-check
exit=0                         (no output)

$ bun run test                 # vitest run
 RUN  v4.1.10 /home/bastien/lab/perso/scoutech
 Test Files  40 passed (40)
      Tests  1331 passed (1331)
   Duration  1.18s
```

No `oxfmt`: this leg touched no source file, and Markdown is in `.oxfmtrc.json`'s `ignorePatterns`.

---

## Independent verification — the three budgets after the `px-1` fix, and finding 6 (cost 3's settled marker) — 2026-08-15, session `closeverify`

**Role: verifier, read-only on `src/**`.** No source file written, no `Status:` line moved, no commit;
`src/routes/-prototype-07/**` and `src/routes/prototype.profile-view.tsx` untouched; ticket 36 out of
scope. Same host as every other leg: `HeadlessChrome/151.0.0.0`, `devicePixelRatio 1`, `agent-browser
0.34.0`, the **shared dev server reused and left running** (`curl` → **200**), viewports set then
**read back** from `innerWidth`/`innerHeight`, geometry through this ticket's own `measure.js`.

**Why this leg exists.** The `px-2` → `px-1` correction in `NumericInput` changed a *content* box in
every Rail numeric field. Budgets A and C are the two figures on this ticket a Rail width change could
plausibly reach, so they were re-taken by an agent that did not write the fix, on a cleared Session
(`localStorage.clear()`) and on this ticket's `FULL` link.

| bande | A · 390 × 664 mesuré | budget A consigné | C · 1440 × 900 mesuré | budget C consigné |
| --- | --- | --- | --- | --- |
| colonne graphique | 390 | 390 | 1152 | 1152 |
| `W_inner` | 342 | 342 | 1104 | 1104 |
| créneau bandeau | **76** | 76 | **44** | 44 |
| profil | **219,625** | 219,625 | **539,671875** | 539,6719 |
| bande de garde | **96** | 96 | **176,625** | 176,625 |
| View Strip | **44** | 44 | **44** | 44 |
| cellules | **104** | 104 | **52** | 52 |
| **bloc** | **539,625** | 539,625 | **856,296875** | 856,297 |
| reste | rail **124,375** | 124,375 | boîtage **43,703125** | 43,703 |
| **total** | **664,000** | 664 | **900** | 900 |
| cinq sections du Rail | **1034,5 / 322 / 333 / 222 / 164** (somme **2075,5**) | idem | **1053,5 / 322 / 402,328125 / 288 / 230** (somme **2295,828125**) | idem |
| `aside.scrollHeight` | **2120** | 2120 | **2340** | 2340 |
| `aside.scrollWidth` / `clientWidth` | **390 / 390** | 390 / 390 | **287 / 287** | 287 / 287 |
| `collapse` · `fit` · `--pinned-clearance` | `whole` · `roomy` · `0px` | idem | `whole` · `roomy` · `0px` | idem |

**Zero movement, at either viewport, on any figure this ticket records.** Budget A's resting Rail is
**124,375**, clearing `MIN_RAIL = 120` by **4,375 px**, and budget C's block / letterbox are
**856,296875 / 43,703125** — digit for digit what amendment F's cost 3 calls untouchable. **Nothing
was compensated**, because nothing needed to be.

### Finding 6 — cost 3 now carries a settled marker in cost 2's own shape

`AMENDMENTS.md` § F cost 3 reads **« Cost 3 · SETTLED BY THE USER, 2026-08-14 — decision 3. NO CODE
CHANGE. »**, the same `### Cost N · …` heading shape cost 2 got (« Cost 2 · **ADDRESSED — the user's
decision 4, 2026-08-14** »), so the asymmetry that read « cost 2 resolved, cost 3 still open » is gone.
It states budget C untouchable, names 1280 × 720 / 1366 × 768 / 1512 × 850 as **settled policy, not an
outstanding gap**, and names both alternatives as **rejected rather than unexplored** — lowering the
cap (it moves the spec's own reference desktop and invalidates budget C's evidence in tickets 27, 28
and 29) and a height-aware cap (§ 5 and ticket 28 forbid a chart height derived from window height —
the ×5,02 defect). The README's one-line index agrees: « Amendment F's costs 2 and 3 and amendment G's
decision 5 are **settled**, not open questions. » **No code moved for it, and none should have.**

### Gates, real output

```
$ bun run typecheck            # tsc --noEmit
$ tsc --noEmit
exit=0                         (no other output)

$ bun run lint-type-aware      # oxlint --type-aware --type-check
$ oxlint --type-aware --type-check
exit=0                         (no other output)

$ bun run test                 # vitest run
 RUN  v4.1.10 /home/bastien/lab/perso/scoutech
 Test Files  40 passed (40)
      Tests  1331 passed (1331)
   Duration  1.18s
```

No `oxfmt`: this leg wrote no source file, and Markdown is in `.oxfmtrc.json`'s `ignorePatterns`.
