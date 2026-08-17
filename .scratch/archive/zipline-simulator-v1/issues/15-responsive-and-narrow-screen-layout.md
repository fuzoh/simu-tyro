# Responsive and narrow-screen layout for the profile view

Type: grilling
Status: resolved
Blocked by: — (07 resolved)
Map: [Zip-line simulator v1](../map.md)

## Question

The spine is now fixed, so the phone question is finally askable. On desktop the app is a
280 px parameter rail beside a vertical stack of **verdict banner · profile chart · clearance
strip · five-cell read-out row** — roughly 1000 px of horizontal furniture and four stacked
horizontal bands. At 390 px wide none of that survives intact.

Settle:

1. **What happens to the rail.** A bottom sheet, a tab beside the chart, a collapsible
   accordion above it, or a separate screen? Note that ticket 04's field table is long — five
   groups plus Valeurs déduites — so it is not a thing that shrinks.
2. **Do both charts survive.** The clearance strip is the reason the failure is unmissable
   (ticket 07 §1), so dropping it on mobile drops the strongest safety signal — but two charts
   in ~400 px of height leaves each of them ~150 px, and the profile is already the squeezed
   one. Options: keep both at reduced height, make them a swipeable pair, collapse the strip to
   a thin sparkline with just the zero crossing marked, or fold the clearance curve *into* the
   profile as a shaded margin.
3. **The five read-out cells.** They are tabular numbers in a single row; at 390 px that is
   ~78 px per cell. Wrap to two rows, scroll horizontally, or reduce to a subset with the rest
   behind a disclosure — and if a subset, which cells are non-negotiable.
4. **The three input paths.** Ticket 07 chose scrub-on-strip + drag-the-marker + typed field.
   On touch: dragging a marker with a finger over a 150 px-tall chart is imprecise, scrub on a
   thin strip is worse, and typing needs a keyboard that covers half the screen. Decide which
   survive and whether touch gets an affordance the mouse does not (a stepper, a larger hit
   area, momentum).
5. **Orientation.** A zip-line profile is intrinsically wide. Is landscape the expected mobile
   posture — and if so, does the app say so, or just work badly in portrait?
6. **Where the breakpoints are**, in terms of what fails at each — not in terms of device
   names.

## Context

Graduated from the map's **Not yet specified** on resolution of
[Profile visualisation prototype](./07-profile-visualisation-prototype.md), which is what made
the question specifiable: before the spine existed there was nothing concrete to reflow.

Ticket 07's prototype is the place to try this — set the viewport narrow on
`/prototype/profile-view?variant=D` and watch what breaks first. Its layout is plain flex, so
reflow experiments are cheap.

Constraints already fixed and not up for re-litigation here: the read-outs stay **outside the
plot area** (ticket 07 §1 — occlusion), vertical exaggeration stays **auto-fit and disclosed**
(ticket 02, ticket 07 §6), and the clearance failure must remain **impossible to miss**
(ticket 07 §7) whatever the screen size. That last one is the hard constraint on any answer
that proposes dropping a chart.

Tailwind v4 conventions: `docs/conventions/ui.md`. No new dependency for layout.

**Inherited from [CSV profile import](./06-csv-profile-import-and-anchor-placement.md)** — the
two charts share **one x domain** (span + 5 % margin, clamped to the trace extent), because
ticket 07's scrub track *is* the clearance curve aligned under the profile. That makes the shared
domain a hard constraint on any reflow proposed here, alongside ticket 07 §7's: a layout that
stacks the two charts must keep their x axes **pixel-aligned**, and one that puts them
side by side breaks the mechanism outright.

Two smaller additions to the reflow surface:

- **Four more fields** in the Géométrie group when a trace is loaded — station A/B alongside the
  existing `hauteur d'ancrage` A/B — plus `L`, `h` and both base altitudes moving into
  **Valeurs déduites**. The panel is denser in imported mode than in manual mode, so whichever
  narrow-screen treatment is chosen has to hold the denser case.
- **Draggable anchor markers on the profile chart**, in addition to ticket 07's rider marker.
  Three drag targets on one chart is a touch-target question at narrow widths, and the anchor
  markers sit at the domain's edges where they are most likely to collide with axis labels or the
  viewport boundary.

**Inherited from [Results panel](./08-results-panel-and-provenance-warnings.md)** — the rail this
ticket has to reflow is materially larger than the input rail it was scoped against.

It is now **one scrolling column with an input half and an output half**, five sections:
`Paramètres → Valeurs déduites → Résultats → Provenance → Ce que cet outil ne calcule pas`. A
right-hand results column was rejected there precisely because the chart needs the width, so the
narrow-screen treatment cannot fall back on "move the results elsewhere" — there is nowhere else.
Two specifics that bite at narrow widths: `Résultats` carries four headline values plus ~nine
detail rows under a scope header (« sur toute la traversée ») whose distinction from the strip's
« à la position du passager » must survive any reflow that brings the two closer together; and
`Provenance` holds an always-visible terrain block plus an expandable aggregate list.

## Answer

Resolved by grilling over two rounds, with every number measured against the prototype's real
layout code and its §15-verified solver — never estimated. The session's load-bearing finding is
one line of arithmetic that nobody in tickets 02, 06 or 07 had written down:

> **VE = (plot inner height / plot inner width) × (x-domain span / z-domain span).**
> Vertical exaggeration does not depend on pixel size at all — only on the plot's **aspect ratio**
> and the scenario's own flatness.

Everything below follows from it, including the two defects it exposes in the very artifact that
demonstrates this ticket's hard constraint: the prototype's two x axes are **misaligned by 8 px at
each end** (§4), and its auto-fit VE is **unbounded in both directions** — already ×5,02 past the
verified ceiling on a 1440×900 desktop, and ×0,54 (vertical *compression*) on a wide-short box
(§5). Both are elected fixes, and both are consequences of one mechanism: a chart dimension derived
from **window height**.

### 1. VE is a function of aspect, which is what lets one rule fix every viewport

Measured with the prototype's solver, z domain and `makePlot` (throwaway scripts `ve.ts` / `ve2.ts`,
reproducing `use-model.ts:76-88`). `k` is the scenario's flatness — x-domain span over z-domain
span, where the z domain is the data span plus `makePlot`'s ±12 % margin (`chart-kit.ts:38-40`) and
the x domain is ticket 06 §6's `[d_A − 0,05 L, d_B + 0,05 L]`, i.e. `1,1 L` wide:

| Scénario | `L` (m) | étendue z (m) | `k`, domaine `[0, L]` (prototype) | `k`, domaine `1,1 L` (spec) |
| --- | --- | --- | --- | --- |
| z1 100 m plat | 100 | 8,0 | 10,081 | **11,089** |
| z3 120 m incliné | 120 | 28,8 | 3,360 | 3,696 |
| 50 m court | 50 | 9,0 | 4,481 | 4,929 |
| 1500 m long | 1500 | 214,5 | 5,640 | 6,204 |
| 1000 m quasi tendu | 1000 | 112,0 | 7,200 | 7,921 |
| 1000 m très mou | 1000 | 220,0 | 3,666 | 4,032 |
| 200 m en échec | 200 | 35,3 | 4,572 | 5,029 |
| *(mou profond — §5, hors des sept)* | 200 | 182,5 | 0,884 | **0,972** |

`VE = aspect × k`, verified against direct `makePlot` output (aspect 368/868 = 0,4240 × 10,081 =
4,274 against the ×4,27 measured for z1 at the prototype's default 900×420 box). So, per aspect,
across the seven scenarios:

| Aspect (H/W) | Boîte | VE, domaine `[0, L]` | VE, domaine `1,1 L` |
| --- | --- | --- | --- |
| 4,507 | 390 px, rail **dans** le flux (69×311) | ×15,15 … ×45,44 | ×16,66 … ×49,98 |
| 0,4978 | 1440×900, ratio flex actuel (1119×557) | ×1,67 … **×5,02** | ×1,84 … **×5,52** |
| 0,50 | plafond de la bande | ×1,68 … ×5,04 | ×1,85 … ×5,54 |
| 0,4240 | défaut prototype 900×420 (868×368) | ×1,42 … ×4,27 | ×1,57 … ×4,70 |
| **0,42** | **règle élue, aux trois viewports de §3** | ×1,41 … ×4,24 | **×1,56 … ×4,67** |
| 0,35 | plancher de la bande | ×1,18 … ×3,53 | ×1,29 … ×3,88 |
| 0,1601 | paysage 844×330 (812×130) | ×0,54 … ×1,61 (4/7 comprimés) | ×0,59 … ×1,78 (5/7 comprimés) |

Three findings fall out, and the third is new to round 2:

1. **Ticket 07's « auto-fit spanned only ×1,2…×4,7 » was never a property of the app** — it was a
   property of one box shape, 900×420. The same seven scenarios reach ×45 at 390 px and ×0,54 in
   landscape. The policy needed an aspect band; it now has one.
2. **The desktop was already out of budget.** `flex-[3]` / `flex-1` (`variant-d.tsx:340`,
   `variant-d.tsx:412`) at 1440×900 gives the profile H/W 0,4978 ⇒ **×5,02**, measured on the
   artifact, past ticket 07's verified ×4,7. Nobody had looked at a second window size.
3. **Ticket 07's published band is itself ~10 % low**, because ticket 06 §6 widened the shared x
   domain to span + 5 % *after* ticket 07 measured on `[0, L]`. At the prototype's own aspect the
   spec's domain gives ×1,57…**×4,70**. The aspect that puts the flattest scenario exactly on
   ticket 07's ceiling is **0,4239** — which is why the target below is **0,42** and not the
   prototype's 0,424, which lands on ×4,70 with nothing left.

### 2. Two breakpoints, stated as what fails — and the one number everything is downstream of

Exactly two. No third.

| | Ce qui casse | Seuil | Mécanisme |
| --- | --- | --- | --- |
| **B1** | la rangée de cellules ne tient plus cinq valeurs | largeur de la **colonne graphique** < 600 px | `@container` (inline-size) |
| **B2** | le rail et un profil légal en aspect ne peuvent plus coexister côte à côte | **viewport** < 768 px | media query, reflux en une colonne |

B1 is a **container** query, not a viewport query, because the 288 px rail means the chart column is
never the viewport. Tailwind 4.3.3 ships the `@container` variant
(`node_modules/tailwindcss/package.json`), so it costs no dependency and no config file. **No extra
wrapper element**: the Chart Block itself carries `container-type: inline-size` *and* the single
`ResizeObserver`. Inline-size containment does not change the box's own inline size — it is a
definite-width flex child — and the observer still reports the same content box.

The first thing that actually breaks at 390 px is neither of the things the ticket guessed. The rail
is `w-72 shrink-0` = **288 px, not the ticket's 280** (`variant-d.tsx:233`) beside a
`min-w-0 flex-1` column, so at a 390 px viewport the chart column is **101 px** and the plot's x
range is `101 − 16 − 16` = **69 px** — the whole span in 69 px, aspect 4,507, VE ×16,7…×50,0, and
all three 36 px drag targets overlapping on a 69 px track. Every other symptom is downstream of that
one number. The ~450 px threshold one might expect — where the drag targets cover the whole track —
needs no rule, because B2 has already restored a 342 px track at 390 px.

Rejected: one viewport breakpoint at 900 px collapsing B1 into B2. It clips five values in a 1000 px
window that still believes it is a desktop, and nobody tests 1000 px.

### 3. The layout at each breakpoint, with the pixel budget summing to the viewport

Constants — all in `px`, all **width**-derived, because no band's height may read the window height:

```ts
GUTTER         = 24                                 // both charts, both sides (§4)
PROFILE_CHROME = 28 /*badge*/ + 24 /*handle lane*/ + 24 /*x labels*/ = 76
PROFILE_ASPECT = 0.42                               // target; Plot Aspect Band [0.35, 0.50] guards it
STRIP_OUTER    = clamp(0.16 * W_inner, 96, 200)     // policy band [72, 200]
VIEW_STRIP     = 44                                 // one touch-height row (§7)
CELL_ROW       = 52 ; rows = colWidth >= 600 ? 1 : 2
BANNER         = content height: 44 (1 ligne) … 76 (3 lignes à 390 px)
RAIL_HEADER    = 44 ; MIN_RAIL = 120
```

**A · 390 × 664 (portrait, `svh`, B1 + B2 in force, block whole, rail at scroll-top).** `W_inner` =
390 − 48 = 342 ; profile plot = round(0,42 × 342) = **144** ; aspect 0,4211 ⇒ VE ×1,56…×4,67.

```
┌ (conditionnel) bandeau « clés ignorées », pleine largeur, rejetable ··  0 | 60 ┐
├ CHART BLOCK ───────────────────────────────────────────────────────────────────┤
│ créneau bandeau  (verdict | invite régime | erreurs bloquantes | refus)   76   │
│ profil    28 badge + 144 tracé + 24 couloir de poignées + 24 axe x  =   220   │
│ bande de garde au sol  (= la piste de scrub)                              96   │
│ VIEW STRIP   [à vide] [corde]        [×1]     x [ 74,8 ] m · 50 %         44   │
│ cellules — grille 3 col × 2 rangées, « Garde min » sur 2 colonnes        104   │
├ RAIL (en flux, order-last, pleine largeur, scroller propre) ─── 540 ──────────┤
│ en-tête du rail  (nom · unité de force · Copier le lien · ⋯)              44   │
│ « Paramètres » + premier champ                                            80   │
└─────────────────────────────────────────────────────────────── 664 ──────────┘
```

540 + 124 = 664. Those 124 px of resting rail **are** `MIN_RAIL`, which is why §0.5's rejection of
an app bar in `__root.tsx` is arithmetic and not taste: a 44 px title bar is spent straight out of
the form. With the ignored-keys strip up it drops to 64 px — tolerable only because that strip is
dismissible and the block collapses on the first scroll (§6).

**B · 768 × 1024 (B2 *not* in force — two columns; B1 in force — column 480 px).** `W_inner` =
480 − 48 = 432 ; profile plot = **181** ; aspect 0,4190 ⇒ VE ×1,55…×4,65.

```
┌ rail 288 ───────────┬ colonne graphique 480 ────────────────────────────┐
│ en-tête         44  │ créneau bandeau (2 lignes)                   60   │
│ Paramètres          │ profil   28 + 181 + 24 + 24               =  257  │
│ Valeurs déduites    │ bande de garde   clamp(69 → 96, 96, 200)     96   │
│ Résultats           │ view strip                                   44   │
│ Provenance          │ cellules  3 col × 2 rangées                 104   │
│ Ce que cet outil…   ├───────────────────────────────── 561 ───────────┤
│ (scroller propre,   │ marge de boîtage — vide, délibérément        463   │
│  ~2100 px de haut)  │                                                  │
└──────── 1024 ───────┴──────────────────────── 1024 ────────────────────┘
```

**C · 1440 × 900 (référence desktop).** Colonne 1152 ; `W_inner` = 1104 ; profile plot =
round(0,42 × 1104) = **464** ; aspect 0,4203 ⇒ VE ×1,56…**×4,66** — against ×1,84…×5,52 for the flex
ratio at the same window. That difference is the fix, measured.

```
┌ rail 288 ───────────┬ colonne graphique 1152 ──────────────────────────────────┐
│ en-tête         44  │ créneau bandeau (1 ligne)                           44   │
│ 5 sections,         │ profil   28 + 464 + 24 + 24                      =  540  │
│ scroller propre     │ bande de garde   clamp(177, 96, 200)               177   │
│                     │ view strip                                          44   │
│                     │ cellules — 5 en une rangée (colonne ≥ 600)          52   │
│                     ├─────────────────────────────── 857 ────────────────────┤
│                     │ marge de boîtage                                    43   │
└──────── 900 ────────┴───────────────────────── 900 ───────────────────────────┘
```

**The shell is fixed-height in both modes** (`dvh`, `overflow: hidden` on the body) with internal
scrollers: at narrow the flex row becomes `flex-col` and the `aside` keeps its `overflow-y-auto`,
gaining `order-last` and full width. A document scroll was rejected — §6's collapse trigger would
then have to read `window.scrollY` *and* survive iOS's document-scroll-under-keyboard behaviour,
where a fixed shell plus `interactive-widget=resizes-content` (§10) gives the same result with one
known scroller.

**The letterbox margin is deliberate and quantified**: 43 px at the reference desktop, 0 px at
1280×800 (measured: block 608, remainder 192 ⇒ strip 192, inside the band), 463 px on a 768×1024
tablet in portrait. Filling it means one of two things and both are the defect this ticket exists to
fix: growing the profile is *literally* how ×5,02 happened, and pushing the growth into the strip
runs it to its 200 px ceiling on every desktop, which is the over-feeding that ceiling exists to
bound. **This refines the elected wording « leftover height … is absorbed by the strip (wide) »** —
absorption produces a 665 px tail on a 1024×1366 portrait tablet, and a height-fed band is precisely
the mechanism both measured defects came from. The elected band, the letterbox principle and the ×1
floor are untouched.

### 4. One shared x scale object, one gutter constant — and the three defects they retire

```ts
/** Built once per (chart-column inline size, L, terrain source). Both SVGs consume THIS one. */
type SharedX = {
  width: number;        // chart-column inner width — the single ResizeObserver's inlineSize
  gutter: 24;           // GUTTER, left AND right, identical in both charts
  domain: [number, number];  // ticket 06 §6: [-0.05*L, 1.05*L], clamped to the trace extent
  x(m: number): number;      // affine, domain -> [gutter, width - gutter]
  pxPerM: number;
  toMetres(clientX: number, rectLeft: number): number;  // THE inverse, one implementation
};
```

It replaces two independently padded scales:

| Aujourd'hui | Source | Axe x |
| --- | --- | --- |
| profil, `pad {left 16, right 16}` | `chart-kit.ts:37` | de 16 à `W − 16` |
| bande de garde, `pad {left 24, right 24}` | `variant-d.tsx:104` | de 24 à `W − 24` |

The two axes therefore **coincide only at mid-span and diverge to 8 px at each end** — at the 390 px
narrow column that is 8 px × 1500 m / 358 px = **34 m at a 1500 m span**, and 10,7 m at the 1152 px
desktop column. Ticket 06 §6's pixel-alignment requirement is violated in the only artifact that
ever demonstrated it, and violated **at the anchors**, which is exactly where §9 puts two drag
handles. `GUTTER = 24` is set by the **strip**, whose clearance tick labels are drawn at `x = 6`
inside its left pad (`variant-d.tsx:154-157`); the profile pays 16 px of plot width for alignment —
4,7 % at 390 px, 1,4 % at desktop. Cheap at both ends.

Two further defects the object retires:

- **The hand-typed inverse.** Both pointer paths compute
  `(clientX − rect.left − pad.left) / pxPerM` (`variant-d.tsx:124`, `variant-d.tsx:355`), silently
  assuming `domain[0] === 0`. Under ticket 06 §6's real domain that is wrong by `0,05 L` — **75 m at
  a 1500 m span**. The inverse is not a formula to retype per call site; it is a method on the scale.
- **The 900×420 first frame.** `useSize` seeds `{ width: 900, height: 420 }`
  (`use-model.ts:200`), so the first client frame draws a 900 px chart inside a 390 px box. Since
  every band height is now width-derived, the observer needs `inlineSize` **only**, and the seed
  becomes `null` ⇒ render ticket 13's Skeleton frame until the first measurement — which also makes
  that Skeleton dimensionally correct at 390 px for free.

### 5. The aspect rule, the [72, 200] strip band, and the ×1 floor with its badge states

```
profile plot height = 0.42 × W_inner              // rule
      Plot Aspect Band = [0.35, 0.50]             // guard: the layout may never leave it
strip outer height  = clamp(0.16 × W_inner, 96, 200)
      strip policy band = [72, 200]               // guard: the strip may never leave it
VE                  = max(autofit, 1)             // guard: never compress
```

Three rules, each with a guard that should never fire, and all three guards written down — because
what broke here was a rule with no guard. The target 0,42 keeps VE at ×1,56…×4,67, inside ticket
07's verified ×1,2…×4,7 by 0,03. The band's ceiling 0,50 would permit ×5,54, so **the ceiling is a
legality bound on future layouts, not a target** — and it is the number ticket 10 must publish,
because it is what the policy now allows. The floor 0,35 gives ×1,29…×3,88, so **the aspect band
alone guarantees VE ≥ ×1 for all seven scenarios** (compression would need aspect < 0,2705): box
shape can no longer compress anything.

The strip's floor of **96 px** sits 24 px above the policy floor of 72 px, deliberately, because
96 px is a touch lane: 96 − 30 px of chrome = 66 px of drawn curve, and the whole 96 px SVG is the
hit surface — over twice the 44/48 px minimum. Measured, the strip is the **best** touch target in
the app, not the worst. At narrow it drops to 2 clearance ticks plus the zero line (`ticks(lo,hi,3)`
becomes `2`) and its caption shortens **at the same B1 threshold**, so no new breakpoint:
« Garde au sol (m) selon la position du passager — glisser pour déplacer » above 600 px,
« Garde au sol (m) — glisser » below. The prototype's caption naming `h_clear` goes: French UI,
identifiers in code.

**The ×1 floor, and the state nobody had reached.** Auto-fit was unbounded *below* and nobody had
looked: a wide-short plot (844×330 landscape, profile 182 px, aspect 0,1601) yields ×0,59…×1,78 with
**five of seven scenarios vertically compressed**. Compressing the sag in a tool whose output is
clearance is the same class of error as exaggerating it, and it is worse, because **it reads safe**.
So VE never goes below ×1, and the clamp is **its own disclosed state**:

| État du badge | Quand | « ×1 vraie échelle » |
| --- | --- | --- |
| « Éch. verticale ×4,7 » | auto-fit ordinaire | actif (§10) |
| « Éch. verticale ×1 — vraie échelle » | clamp en vigueur, tout tient dans le cadre | **désactivé — déjà en vigueur** |
| « Éch. verticale ×1 — vraie échelle · câble hors cadre » | clamp en vigueur, la flèche sort du cadre | désactivé |

The third row is a round-2 consequence of the elected clamp, and it is reachable **from the data,
not from the box**: measured, a 200 m span at `L₀` 400 m (`w` 5,36 N/m, `EA` 6,90 MN, hauteurs
d'ancrage 12 m, `h` −18 m) has a z span of **182,5 m** ⇒ `k` = 0,972 ⇒ auto-fit asks for **×0,41 at
every legal aspect**. Clamped to ×1 the plot then shows ~87 m of z in 144 px and the belly of the
cable leaves the frame downward, marked at the clip. Accepted over both alternatives: compressing is
the failure the clamp exists to refuse, and **widening the x domain until ×1 fits is forbidden** —
it would break ticket 06 §6's shared domain, i.e. the alignment mechanism of §4. It is also
self-limiting: every case reachable inside the admissible envelope is already a ground-contact case
(ELECTIONS §0.2 measured garde −169,67 m, `contact: "cable"`, for exactly this line), so the picture
is never cut without the banner saying the line is on the ground.

### 6. The Chart Block collapses to a pinned safety header — by scroll, by focus, or by arithmetic

No toggle, no new control. The block is whole while the rail sits at `scrollTop === 0`; it collapses
when **(a)** the rail scrolls, **(b)** a rail field takes focus, or **(c)** it cannot fit —
`blockHeight > availableHeight − MIN_RAIL`. Reversible by scrolling the rail back to top or tapping
the header (chevron, `aria-label` « Afficher le profil »).

Arithmetic forces (a) and (b): at 390×844 the portrait `svh` is ~664 px and the soft keyboard takes
~336 px, leaving ~328 px — a 540 px block cannot coexist with a focused field. And the rail is not a
thing that shrinks: ticket 04's five groups plus ticket 08's four output sections is ~60 rows,
unusable through a 124 px window.

| État | Contenu | Hauteur |
| --- | --- | --- |
| **whole** | tout §3.A | 540 |
| **pinned** | créneau bandeau + une cellule vive « Garde min » | 76 + 44 = 120 |
| **pinned + x** | idem, plus la View Strip, tant que le champ `x` a le focus | 164 |
| **compact** | une seule rangée : bandeau sur une ligne, « Garde min » en ligne | 44 |

`compact` fires when `--kb > 0` (§10) or available height < 420 px, which is what makes the keyboard
case work: 664 − 336 − 44 = **284 px of usable form**. `pinned + x` exists because the View Strip
lives *inside* the Chart Block (§7): without it, focusing the `x` field would collapse away the very
field being typed into. With it, the user types a position and watches « Garde min » move with the
keyboard open — the best argument available for §0.5b's placement.

Ticket 07 §7's unmissability survives the collapse because signal 1 (the worded verdict naming
`h_min` and its `x`) and the Garde min number are the two **non-positional** signals — the two that
do not need the plot. And per §0.4 the pinned header's banner slot carries **whichever occupant
precedence gives it**, never only a verdict: a blocking-error summary with its jump link, one of
§0.2's three refusal states, the verdict, or the no-regime prompt. It is a slot, not a verdict bar —
a first-run phone paints the neutral no-regime prompt there, and a link arriving with two blocking
errors paints « ⛔ 2 erreurs bloquantes — aucun résultat ». Additionally **a blocking error
force-opens and pins its rail section** at narrow widths, so its Fix Action is reachable in every
layout; otherwise the app's only blocking states can be invisible while the chart draws, including
on the first frame after following a link.

**Amended 2026-08-12** by [Validation and error-state UX](./11-validation-and-error-state-ux.md)
§3: the occupant list above is incomplete. Ticket 11 §3's precedence has a **fourth** rank between
the refusal states and the verdict: **« Saisie en cours »**. The slot may therefore also carry that
neutral mid-edit mark, not only a blocking-error summary, a refusal state, the verdict, or the
no-regime prompt.

Not persisted. The state is derived from scroll position, focus and available height, so a stored
value would fight all three of its own inputs; ticket 09 §7 persists *preferences*, and this is a
transient.

### 7. The View Strip — one row inside the Chart Block, amending ticket 07 §9

Per §0.5b: one row immediately **below the clearance strip and above the read-out cells**, carrying
the two layer toggles, « ×1 vraie échelle », and the numeric `x` field with its `%` secondary.

```
[✓ ligne à vide]  [✓ corde A–B]          [ ×1 vraie échelle ]     x [ 74,8 ] m · 50 %
```

**This amends ticket 07 §9** (« Position lives beside the numeric field in the rail ») and ticket
09 §7's rail placement of the layer toggles. The reason is this ticket's own arithmetic: at 390 px
the rail is **not co-visible with the chart** — §6 collapses the block precisely when the rail comes
into view — so a rail-only `x` puts the app's only precision input path out of sight of the thing it
moves, and a rail-only « ×1 » answers a question whose answer is off screen. Ticket 07 §6 justified
that control as a *second disclosure channel beside the badge*; a channel you cannot see next to the
badge is not one. The position read-out (`x` in metres, `%` in smaller type, `s_D` never) moves with
the field, unchanged in kind.

Width arithmetic at 342 px of inner width, `text-[11px]`: full labels need
93 + 76 + 111 + 128 + 24 of gaps = **432 px**, which does not fit. Hence one stated abbreviation rule
**at the same B1 threshold** (no new breakpoint): below 600 px of column the toggles read « à vide »
and « corde » and the peek control reads « ×1 », each keeping its full string as `aria-label` and
`title` — 59 + 48 + 44 + 128 + 24 = **303 px**, inside 342. The row is 44 px tall, so every control
in it is a legal touch target. Wrapping to two rows was rejected: 44 px out of `MIN_RAIL`, the
tightest budget in the app, to avoid abbreviating two layer names.

### 8. The read-out cells wrap to three columns; « Garde min » spans two

Below 600 px of chart-column width: exactly two rows, 104 px, all five cells kept — no subset, no
horizontal scroll.

```
≥ 600 px                                        < 600 px
┌────────┬────────┬────────┬────────┬────────┐  ┌──────────┬──────────┬──────────┐
│ Garde  │ T A    │ T B    │ Pente  │ Flèche │  │ T anc. A │ T anc. B │ Pente    │
│ 1,24 m │612 daN │604 daN │ 3,4°   │13,78 m │  ├──────────┴──────────┼──────────┤
└────────┴────────┴────────┴────────┴────────┘  │ Garde min (à x 1010 m) │ Flèche │
                       ↑ « à la position du     │  1,24 m                │13,78 m │
                         passager »             └────────────────────────┴────────┘
```

Measured, **the value is the binding constraint, not the label**: `font-mono text-lg` needs ~97 px
for a nine-character value (« 12345 daN ») plus 24 px of `px-3`, so five cells need ≈605 px — hence
600. A 3-column grid at 390 px gives 130 px per cell, 106 px of content, which fits. Wrapping a
label is benign; clipping a value is not. Horizontal scroll is out because it hides Garde min behind
a gesture that competes with the scrub; a subset re-litigates ticket 07 §9 and would delete the
printed number that justified drawing a sub-pixel rider envelope at 1500 m in the first place.
**Garde min and its position qualifier are non-negotiable at every width.** (`pb-14` in
`variant-d.tsx:430` is prototype scaffolding for the perf chip; the real row is 52 px.)

The row gains its own scope label, **« à la position du passager »**: at narrow it ends up directly
against the rail's `Résultats`, whose header reads « sur toute la traversée », so ticket 08 §3's
belt-and-braces scope distinction has to survive the two becoming adjacent. The cells span the
**full column width**, not the gutter-inset plot width — they are cells, not plot content, and
aligning them to the plot would imply a positional correspondence that does not exist.

### 9. A handle lane in the x-axis gutter, reserved in both modes

24 px between the bottom of the plot area and the x-axis labels, inside the profile SVG, at every
width and in both terrain modes:

```
│   … aire de tracé (144 px à 390) …                    │
├───────────────────────────────────────────────────────┤ ← bas de l'aire de tracé
│   ├──A ═══════════════════════════════════ B──┤       │  couloir de poignées  24 px
├───────────────────────────────────────────────────────┤
│   0        250        500        750       1000 m     │  étiquettes axe x     24 px
```

The rider stays on the cable; the two anchors move down here. The collision is **structural, not a
sizing accident**: the anchors are pinned at the domain edges, so at 390 px a 44 px anchor target
covers the first and last 12 % of the span, and the rider glyph overlaps an anchor handle whenever
`x_D` is within ~46 m of an anchor at `L = 1000`. You cannot size your way out of two targets that
are always at `x = 0` and `x = L`. Putting handles outside the plot area is ticket 07 §1's own rule,
and the lane also retires the axis-label collision ticket 06 named.

Each handle's hit target is **44 × 48 px**, spanning the lane plus the label band — **entirely below
the plot area**, so confusing it with the rider is geometrically impossible rather than merely
unlikely.

**Reserved in both modes**, so the profile's height never changes on import — and not blank in
manual mode: the lane draws the **span bracket** `├──A ═══ B──┤`, non-interactive, with ticks at 0
and `L`. On import the same bracket's ends become the draggable station handles. That gives the
reserved 24 px a job in manual mode — marking the span boundary inside ticket 06 §6's 5 % margin,
which is the « span markers » §0.3 requires to keep drawing when the Clearance Gate fails — instead
of paying for chrome that is empty half the time.

### 10. Touch, pointer and keyboard

**Hit radii, CSS only, no JS branch.** The rider's grab circle is `r = 18`, i.e. 36 px across
(`marks.tsx:209`), under both the 44 px and the 48 dp guideline. It becomes a transparent circle with
`pointer-events: all`, `r = 11`, and a transparent **stroke**: `stroke-width: 14px` ⇒ 36 px
(`r + sw/2 = 18`), `stroke-width: 22px` ⇒ 44 px under `@media (pointer: coarse)`. Stroke width is
used deliberately in place of the SVG2 geometry property `r`, whose CSS support is uneven — this is a
plain presentation property everywhere, so the whole rule is one media query in the stylesheet.

**`touch-action` per surface.** Both chart SVGs currently set `touch-none` (`variant-d.tsx:133`,
`variant-d.tsx:345`), which blocks vertical scroll across ~70 % of the viewport — harmless in the
prototype's fixed `h-svh` shell, load-bearing the moment the layout scrolls.

| Surface | `touch-action` | Raison |
| --- | --- | --- |
| profil SVG (couloir de poignées compris) | `pan-y` | glisser en x = déplacer ; glisser en y = défiler |
| bande de garde (piste de scrub) | `pan-y` | idem ; c'est le chemin pointeur obligatoire |
| view strip, cellules, rail | défaut | rien à capturer |

`pan-y` on the lane is exactly right: an anchor only ever moves in x, so a vertical drag starting on
a handle should scroll the page rather than do nothing.

**« ×1 vraie échelle » is a toggle on coarse pointers, hold-to-peek on fine ones.** Press-and-hold on
touch collides with text selection, the context menu and scroll initiation, and ticket 07's gesture
has no touch story at all. Keyboard focus gets toggle semantics in both modes (Space / Enter), since
a held gesture has no keyboard equivalent. When the ×1 clamp is already in force the control is
**disabled** (§5).

**Keyboard, and the iOS fallback.** `src/routes/__root.tsx:15` sets
`width=device-width, initial-scale=1`, i.e. the default `resizes-visual`: the layout viewport, and
therefore `dvh`, does **not** shrink when the keyboard opens, so the keyboard covers the bottom
~336 px of a 664 px viewport — exactly where §3.A puts the rail. Without the tag the reflow is
correct and every field is still behind the keyboard. Four pieces:

1. `interactive-widget=resizes-content` on the viewport meta — **ticket 13's to write**, it owns the
   head.
2. A `visualViewport` `resize` + `scroll` listener writing `--kb`
   (`layoutHeight − visualViewport.height − offsetTop`) onto `documentElement`.
   **Unconditional and self-neutralising**: where the meta tag is honoured `--kb` computes to 0 and
   costs nothing; on older iOS Safari, which ignores the tag, it is what drives §6's `compact` state
   and the rail's bottom padding. There is no feature test for the meta tag, so a conditional
   listener is not on offer.
3. `scrollIntoView({ block: 'center' })` on field focus, inside the rail's own scroller — `behavior`
   left at `auto`, because a smooth scroll races the keyboard animation.
4. Fields are `<input type="text" inputMode="decimal">` per §0.6, plus `enterKeyHint="done"`, and
   Enter commits and blurs — on iOS there is otherwise no way to dismiss the keyboard without
   hunting for a key that may not exist.

This is the one thing the rejected Base UI Drawer would have given for free
(`Drawer.VirtualKeyboardProvider` exists precisely for it), so declining the sheet obliged stating
the replacement. And the sheet was declined on **occlusion, not availability**: Base UI 1.6.0 does
ship a Drawer with `modal={false}`, snap points and swipe, so it costs no new dependency — but a
portalled fixed popup covers the bottom of the viewport at every snap point, and that is where the
five read-out cells and the strip's zero crossing live. It is the same occlusion that killed A's HUD
and C's tooltip in ticket 07; an in-flow region pushes instead of covering. Second, independent
reason: `useMediaQuery` returns `defaultMatches` on the server and on first mount, so a JS-branched
tree paints the desktop layout and then re-measures — a visible 900→390 jump on every narrow first
load. **No `useMediaQuery` anywhere in the layout.**

### 11. Why portrait, and why the app says nothing about it

Landscape is neither privileged nor blocked: no rotate prompt, no orientation lock, no hint. The
measurement settles it, and it settles it *through the rules above* rather than as a special case.
On a 390×844 phone, landscape `svh` is ~330 px, while the Chart Block at 844 px of width budgets
44 + (28 + 334 + 24 + 24) + 127 + 44 + 52 = **677 px** — so condition (c) of §6 fires and landscape
*always* opens collapsed, showing the pinned safety header above the form. The alternative, squashing
the profile into the height available, is exactly the aspect-0,16 case measured at **×0,59…×1,78 with
five of seven scenarios compressed** — the failure the ×1 clamp exists to refuse. And the keyboard in
landscape leaves ~150 px, i.e. ~106 px of rail under the compact header, so the form is unusable in
the posture too. A rotate prompt would therefore recommend the one configuration in which the app has
neither its picture nor its form: it would be advertising its own worst state. The intuition behind
the ticket's question — a zip-line profile is intrinsically wide, so give it a wide screen — is
answered instead by **letterboxing a wide box inside a tall viewport** (§3), because the app is not a
chart: it is a chart plus a banner plus five cells plus a ~60-row form, and three of those four are
vertical costs.

### 12. What this hands forward

| Ticket | Obligation created here |
| --- | --- |
| [10](./10-assemble-the-v1-build-spec.md) | **Amend tickets 02 and 07's VE policy**: auto-fit is bounded by a **Plot Aspect Band [0.35, 0.50]** with a layout target of **0,42**, and floored at **×1 — never compresses**. Publish the range as **×1 … ×5,5** (band ceiling, on ticket 06 §6's `1,1 L` domain), not ticket 07's ×1,2…×4,7: that figure was one box shape, and it is ~10 % low because ticket 06 widened the x domain after it was measured. Record `VE = aspect × (x-domain span / z-domain span)`, §1's seven-scenario `k` table, the `[72, 200]` strip band, §3's constants block, §4's shared-scale + `GUTTER = 24` contract, and the invariant **no chart dimension reads the window height**. |
| [07](./07-profile-visualisation-prototype.md) | **Amended twice.** §9: the numeric `x` field and its position read-out leave the rail for the **View Strip** (§7). §6: « ×1 vraie échelle » moves there too and is a **toggle on coarse pointers**, and its ×1,2…×4,7 is superseded per the row above. |
| [06](./06-csv-profile-import-and-anchor-placement.md) | §6's pixel alignment is now enforced by **one** scale object with one gutter and one inverse; the draggable station handles live in the **handle lane** (§9), not on the profile, and the lane is reserved in manual mode where it draws the span bracket. |
| [13](./13-app-shell-and-routing-shape.md) | `interactive-widget=resizes-content` on the viewport meta (`__root.tsx:15`); the Skeleton reuses these width-derived band heights, so it is correct at 390 px for free; the `ResizeObserver` seed is `null`, not `{900, 420}`; the app is a fixed-`dvh` shell with internal scrollers and no document scroll. |
| [11](./11-validation-and-error-state-ux.md) | The pinned safety header's banner slot takes **any §0.4 occupant**, not only a verdict, precedence unchanged. A **blocking error force-opens and pins its rail section** at narrow widths, and every Fix Action stays reachable in the collapsed layout. The ignored-keys strip is full width above rail and charts, and costs 60 of the 124 px of resting rail at 390 px — which is why it is dismissible. |
| [08](./08-results-panel-and-provenance-warnings.md) | The five-cell row carries its own scope label **« à la position du passager »**, because at narrow it sits directly against `Résultats`' « sur toute la traversée ». |
| [12](./12-sweep-performance-and-worker-decision.md) | Nothing here changes the sweep: the ×1 clamp and the aspect rule are per-render arithmetic on values the render already holds, so no new work enters the drag path. |

**New CONTEXT.md terms coined here**, for ticket 10 to write: **Chart Block**, **View Strip**,
**Plot Aspect Band**, **Handle Lane**, **Pinned Safety Header**.

**Inherited from [Validation and error-state UX](./11-validation-and-error-state-ux.md)** — one
rendering rule for the read-out cells §8 does not cover, because §8 only treats the healthy case.

**Under « Aucun résultat » the five-cell row is replaced by one line spanning the row, keeping the
row's height** (ticket 11 §5) — the ~104 px two-row band from §3.A does not collapse and nothing
else on the page jumps. Not « — » per cell: ticket 08 spent that glyph on `Indéterminé`
(attempted, unavailable), and reusing it for *nothing attempted* would collide with the
distinction it exists to preserve.

**Inherited from [First-run scenario and defaults](./14-first-run-scenario-and-defaults.md)** — a
first-run datum confirming two policies elected above.

- **The shipped scenario's auto-fit VE is ≈ ×1,5** at a 1080×420 px plot (`z` extent 30 m with
  12 % margins over 157,5 m of `x`) — inside the Plot Aspect Band (§5) and clear of the ×1 floor,
  the first concrete point on the band the app actually ships.
- **The first screen already prints 2,49 m in the strip against 2,44 m in the rail** (Position
  scope versus Traverse scope), which is the load-bearing case for §8's « à la position du
  passager » scope label: the two blocks are adjacent at 390 px from the very first paint, not only
  in a constructed example.
