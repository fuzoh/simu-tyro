# UI, styling & components

## Tailwind v4

There is **no `tailwind.config` file**. The theme lives in CSS variables in
`src/styles.css`, loaded via `@tailwindcss/vite`. To add or change a design token,
edit the CSS vars — don't reach for a JS config.

## shadcn/ui

Built on Base UI primitives (`@base-ui/react`), not Radix.

- **Never hand-write files in `src/components/ui/`.** Add components with
  `bunx shadcn@latest add <component>`, then customise the generated file.
- Config is `components.json`: `style: base-lyra`, `baseColor: mist`,
  `iconLibrary: lucide` (import icons from `lucide-react`).
- Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.

## Class composition

Use `cn()` from `@/lib/utils` (clsx + tailwind-merge) to merge classes. Variants go
through `cva` (`class-variance-authority`). oxfmt sorts Tailwind classes inside
`cn`, `clsx` and `cva` — don't hand-order them.

Animations: `tw-animate-css` is available. Fonts: Iosevka Charon (`--font-sans` and
`--font-heading`) and Iosevka Charon Mono (`--font-mono`) via `@fontsource/*`, static weights
400 · 500 · 700 only (no variable build exists; `font-semibold` resolves to 700) — see
*Design defaults* below.

## Design defaults

Settled **2026-08-16** ([amendment L](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md),
[ticket 40](../../.scratch/zipline-simulator-v1-build/issues/40-ui-coherence-and-shadcn-density.md)).
These are rules, not preferences: each carries its reason, and the reason travels with any change to
it. The app they replace had **eight DOM text sizes**, the same computed value drawn at four of
them, three typefaces of which one was never loaded, and fifteen hand-rolled controls beside an
empty `ui/`.

### Three type sizes, and no fourth

| role | class | where |
| --- | --- | --- |
| body · annotation | `text-xs` — 12 px | every label, control, note, qualifier, formula, provenance chip. **Annotation ranks below body by colour** (`text-muted-foreground`) and weight, **never by size**: at one step apart, size is a weak rank signal and an invitation to invent a ninth. |
| value · input | `text-base` — 16 px | the Rail's numeric fields and the `Résultats` primary value. **Locked at 16 px**: below it iOS Safari auto-zooms the viewport on focus ([amendment G](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md) decision 5). « Smaller for density » stops at this input. |
| hero value | `text-lg` — 18 px | the Pinned Safety Header's read-out cells, and nothing else. Bound to `CELL_WRAP_PX` — see below. |

- **No arbitrary size in the DOM.** `rg 'text-\[[0-9]+px\]' src --glob '!src/components/chart/**'`
  returns nothing.
- **`text-sm` and `text-xl` do not exist in this app** — including on the two full-page error
  screens, whose headings are `text-lg`. Three sizes with zero exceptions is a rule that survives
  contact with future diffs; « except on … » is how the eight came back.
- **`<text>` inside the hand-rolled SVG charts is drawing, not chrome.** `strip.tsx`, `profile.tsx`
  and `dynamique.tsx` — everything under `src/components/chart/` — size their labels inside a
  hand-written affine scale; those sizes are out of this scale entirely and are not to be folded
  into it. A chart that draws `<text>` lives in that directory, which is what the grep excludes.

### Numbers are mono, everything else is sans

- **`--font-mono: "Iosevka Charon Mono", ui-monospace, monospace`**, declared in `@theme inline`
  beside `--font-sans` and `--font-heading`. Since 2026-11-08 the mono face **is** bundled (it
  replaced amendment L's unbound `ui-monospace`); its 0,50 em advance sits inside the 0,62 em
  `CELL_WRAP_PX` budgets, so those constants were not retuned and still cover the fallback faces.
- The call-site rule: **every computed quantity is `font-mono`; every label and every prose string
  is sans.** « Is this a number the engine produced? » must be answerable without knowing the
  layout.
- **No `tabular-nums`.** Mono is fixed-advance; tabular figures do nothing here. CSS that pretends
  to a job it is not doing is worse than none.
- **Value columns are right-aligned.** `src/lib/format/quantity.ts` already pads decimals
  (« 6,00 », never « 6 »), so a column's width only moves when a value crosses a power of ten.
  That residual is **accepted**, not reserved against with a `min-w` — a 288 px rail does not spend
  permanent pixels on a value that may never appear.
- **`CELL_WRAP_PX = 624` budgets a 0,62 em advance** — the widest a bare `monospace` keyword
  realistically resolves to (Liberation Mono, DejaVu Sans Mono, Menlo, Courier New):
  `(9 × 18 × 0,62 + 24) × 5 ≈ 622 px` for five nine-character cells with their `px-3`. Changing the
  header cells' type, or the mono stack, changes this constant **and** `contract.test.ts`, in the
  same commit.

### Everything rectangular is square

`--radius: 0`, which is what the installed `base-lyra` style already assumes — its `button` and
`native-select` are `rounded-none` in every size variant. So a freshly-added component needs no
patch, forever. `rounded-full` survives for **circular marks only** (status dots, the rider grab
handle, the vue de dessus's anchor markers, its hover point and the rose des vents's handle): a dot is a shape, not a corner radius. `rounded-md`, `rounded-sm` and bare `rounded`
appear nowhere.

### One control height: 28 px

`h-7` — shadcn `size="sm"` and `size="icon-sm"`. `xs` (24 px) and `default` (32 px) are unused. One
number you can state is worth more than a chrome bar four pixels shorter.

**One carve-out: a control that is a word inside a sentence.** `outputs.tsx`'s régime jump is
`<Button size="sm" variant="link" className="h-auto px-0">` — the 28 px box is neutralised **at the
call site**, never in `ui/button.tsx`, because a link set in running copy has no box to be 28 px
tall.

### A link that looks like a button keeps `buttonVariants`

`<Link className={buttonVariants({ size: "sm" })}>`, **not** `<Button render={…}>`. Base UI's
`useButton` merges `{ role: "button" }` whenever `nativeButton` is false, and at its `true` default
it logs a development error for a non-`<button>` element — either branch destroys the anchor's link
semantics, and both of this app's cases navigate. The defect ticket 40 actually found at these two
sites was the variants' 32 px `default` size against the app's one height; passing `size: "sm"`
fixes that and nothing else needs to move.

### Rhythm — two paddings, three gaps

- **inline:** controls `px-2.5` (the registry's own, so an added component is already correct);
  containers and full-bleed bars `px-3`.
- **the charts' gutter is the containers' margin:** `GUTTER = 12` in `src/lib/layout/contract.ts`,
  the `px-3` of every other container (#115). The coupe's frame, the strip's and Dynamique's curve
  therefore stand on the same verticals as the region titles, the tiles and the vue de dessus — left
  edges and right edges, on Statique, Avancé, Dynamique and Terrain. A chart label that needs room
  takes it **inside the plot** (`axisLabel()`), never in the gutter, and the vue de dessus spans
  its region and caps its height rather than its width. Where the aligned boxes stand in two
  sibling scrollers — Terrain's visualisation, which scrolls, and its tiles, which do not — both
  reserve the same scrollbar gutter (`scrollbar-gutter: stable`, the tiles' section
  `overflow-hidden` so that it applies), or a classic scrollbar would pull one set of right edges
  its width in from the other.
- **gap:** `gap-1` inside a row (label → control → hint) · `gap-2` between rows in a section ·
  `gap-3` between sections.
- **vertical:** a Rail row is `h-7` inside a `py-1` wrapper; a Page region — a titled section, the
  fields' column, Terrain's band of tiles — is `py-3`.

Nothing else. A `gap-1.5` in a diff is the defect, not the taste.

### Touch: `.touch-44`

≥44 px on coarse pointers is a budget § 5 spends to the pixel — `view-strip.tsx`'s
`4 × 28 + 12 + 44 + 153 + 16 = 337 px` of the `390 − 2 × 12 = 366` a phone's row has (it was
`59 + 48 + 44 + 128 + 24 = 303` of 342 before the four layers and the 12 px gutter), and a
`size="sm"` control is **28 px visually**. One utility in
`src/styles.css` carries the `::after` overlay that closes the gap, applied at call sites and
**never baked into a `ui/` component**: components stay re-`add`-able, and the touch policy stays
one grep.

### Severity is a token

`--warning` and `--warning-foreground` exist in `:root` and `.dark` and are exposed through
`@theme inline`, exactly as `--destructive` is. The filled chip is `bg-warning/15 text-warning`.
**No `amber-*` literal anywhere in `src/`.** **One** warning role, not two: § 7's precedence ladder
is a semantic ordering, and `destructive` covers both text and chip with a single token.

A Verdict's colour is a `Tone` (`src/lib/app/tone.ts`, `VERDICT_TONE`) before it is a class, so a
view model carries it and its test reads it; `TONE_CLASS` in `src/components/app/banner.tsx` is
the one place a Tone becomes a token.

### Every control comes from `src/components/ui/`

No hand-rolled `<button>`, `<input>`, `<select>` or `<label>` outside it. Three registry choices
that are decisions rather than defaults:

- **`native-select`, never `select`.** Base UI's `select` is a popup and would replace the OS picker
  on mobile — a behaviour change nobody decided. `native-select` styles the native element and
  keeps it.
- **`field`, never `form`.** The `form` registry item is `react-hook-form`; this app is TanStack
  Form ([amendment D](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md)). `field` is
  library-agnostic — `FieldError` takes `errors: {message}[]`.
- **A registry rhythm that does not fit gets re-tuned once, in the generated file**, never fought
  with a `className` at seventeen call sites. That is what « add, then customise » is for.
  `ui/field.tsx` is the worked example: `FieldGroup` `gap-2`, `FieldSet` `gap-2`, `Field` `gap-1`,
  `FieldLegend` `text-xs` (`FieldDescription` already ships at `text-xs` in `base-lyra` — the
  `text-sm` figure circulating in ticket 40 is `new-york`'s).

**Three customisations in `ui/` that a re-`add` will silently undo.** All are load-bearing; re-check
them after any `bunx shadcn@latest add`:

- **`ui/input.tsx` must not carry `md:text-xs`.** `base-lyra` ships `text-xs md:text-xs`, where the
  responsive class is a same-value duplicate — a no-op in CSS, **not** a no-op under `cn()`.
  tailwind-merge scores `md:text-xs` in a different conflict group from `text-base`, so it survives
  the override and wins at ≥768 px: a Rail field written `className="text-base"` would render 16 px
  on the phone and **12 px on desktop**, honouring half of the iOS lock, which is worse than
  honouring neither. The duplicate is removed; the base stays `text-xs` and numeric call sites opt
  into `text-base`.
- **`ui/input.tsx` is `h-7`, not `h-8`.** It is the only added component with no size variant, so
  its single height is the app's height. A future 32 px input is a new decision and gets
  `native-select`'s `data-size` pattern, not an invented variant API.
- **`ui/checkbox.tsx` imports `cn` from `@/lib/utils`.** The registry item (added for the Couche
  pentes, #93) arrives importing it from `"cn"`, a module this app does not have.

### The map paints in literals

MapLibre's paint properties take colours, not CSS custom properties, so the vue de dessus's plain
background, the ligne A–B and the Mesure (`MEASURE_INK`, a burnt orange that never reads as the
line) are hex literals in `src/lib/map/style.ts` — the only ones in the app's code, and the only place that may hold them. Everything around the canvas — the anchor
markers, « Placer A / B », the attribution — is HTML over it and takes the tokens as everywhere
else.

The Vue 3D (#95) is the same case: CesiumJS takes a `Color`, so `vue-3d-renderer.ts` reads those
very literals from `style.ts` — the globe's background is `PLAIN`, the lines and the Fils à plomb
`LINE_INK` cased in `LINE_CASING` — and holds none of its own. The attribution and the messages
under it are HTML, on the tokens.

The Vue 3D's lines follow the coupe's strokes in those literals: the Ligne à vide dashed in
`LINE_INK`, the Ligne A–B dashed and the Trajectoire dotted in `LINE_INK` at 60 % — the coupe's
`/60` — and the loaded line solid. Which of them is shown is the View Strip's: the Vue 3D has no
layer picker of its own (#111).

**The Gimbal is HTML over the canvas, from `ui/`** (#111). CesiumJS has no navigation control and
none is brought in: `vue-3d-gimbal.tsx` is `ui/button` at `size="icon-sm"` (the pad) and
`size="sm"` (« Vue du départ », « Vue latérale »), `.touch-44` at each call site, over the view's
top-left corner where « Placer A / B » sit on the vue de dessus. Each button's hover names its key
(`gimbalHint`), and a keyboard glyph's hover lists them all (`vue3dKeysHelp`). The keys act only
from inside the view — its canvas, focusable and outlined in `--ring` when tabbed to, or a Gimbal
button — and a handled key's default is cancelled, so an arrow turns the camera and never scrolls
the page. The north needle is `Navigation2` turned by the camera's heading: a shape, not a printed
number.

**The carte claire has no raster twin, so the Vue 3D drapes its nearest one.** The carte claire is
swisstopo's vector `ch.swisstopo.lightbasemap.vt`, which CesiumJS cannot drape; the WMTS
capabilities read on 2026-11-08 offer no raster light base map (only its relief shading), so the
Vue 3D drapes `ch.swisstopo.pixelkarte-grau`, the grey national map — light, neutral, the ligne
A–B legible on it. `DRAPED` in `src/lib/map/vue-3d.ts` is the table; the orthophoto and the carte
nationale drape the very tiles the vue de dessus shows.

## Avancé's three columns

The Page Avancé (`/avance`) stands on **three columns from 1024 px of viewport** and on one below
it, and spans **the whole width of the window** (#110). The numbers are `THREE_COLUMN_PX`,
`RAIL_WIDTH` (left), `WIDE_RAIL_PX` and `WIDE_RAIL_WIDTH` (the left column from 1920, #112),
`RIGHT_COLUMN_WIDTH`, `AVANCE_BLOCK_MAX_PX` and `AVANCE_PLOT_MAX` in
`src/lib/layout/contract.ts`; the classes spell them as `min-[1024px]:`, `w-72`, `wide-rail:w-144`
and `max-w-[1984px]`, and `contract.test.ts` holds the two together.

- **Left** — the Rail Header and `Paramètres`. **Middle** — Statique's vue de dessus (`TopMap`, the
  same component and the same gestures — the rose des vents, the draggable anchors, « Mesure »,
  « 3D » — #104), then the Chart Block under it (#110). **Right** — `Valeurs déduites`,
  `Résultats`, `Provenance`, `Ce que cet outil ne calcule pas`. Both side columns are 288 px — the
  left one 576 from 1920 (below) — run the whole height, and all three columns scroll on their own.
- **From 1920 the left column is 576 px and `Paramètres` stands on two columns (#112).** B3 —
  `WIDE_RAIL_PX`, declared once in CSS as the `wide-rail` custom variant of `src/styles.css`, never
  retyped as a `min-[1920px]:` (`contract.test.ts` holds the variant to the constant and greps
  `src/` for the retyping). The column is `wide-rail:w-144`, `2 × 288`; the Rail Header and the
  `Paramètres` heading stay across it, and the groups under them flow in **CSS columns**
  (`wide-rail:columns-2`), each group `break-inside-avoid`, `space-y-3` between groups and the
  wrapper's own `gap-3` between the two columns: each column is `(576 − 1 − 24 − 12) / 2 = 269,5`
  px, against the `288 − 1 − 24 = 263` px a group has in the 288 px column (both measured, the
  column's hairline counted). Columns rather than a grid because a column box flows the groups in the
  DOM's order, down the left column and then down the right: the reading order, the order on screen
  and the Tab order are one, with no `order` to keep in step and no split point to choose by hand.
  The browser balances the two, so which group opens the right column depends on the groups'
  heights — `Passager` on the shipped line (routing.md's measurements). Nothing else moves: the
  right column stays 288 px, the column scrolls on its own, and its focus and keyboard handling are
  the 288 px column's. **What it costs**: the middle column, and with it the vue de dessus and the
  Chart Block, is 288 px narrower from 1920 — `viewport − 864` — so it drops from 1343 px at 1919
  to 1056 at 1920 before it widens again pixel for pixel, and the coupe takes the step with it — at
  1920 its plot is 120,5 px and its strip 34,9 px shorter than at 1919 (`0,42` and `0,16 × W_inner`,
  `W_inner` 1319 → 1032); the column is back to its 1919 width at 2207. And the balance is
  re-struck on every edit: a group that grows or shrinks near the split moves the groups after it
  to the other column under the user's eyes. At 1920 × 1080 on the shipped line (review of #112,
  agent-browser), « Installation temporaire » then « Corde » in `Ligne` take it from 398 to 702
  px, and `Tension de la ligne` — the next group to fill — jumps from the foot of the left column
  (x 12, y 980) to the head of the right one (x 294, y 117), the groups after it with it; the
  focus stays on the radio and the DOM order, so the reading and Tab orders hold. The family, the
  Pilote mode, a warning row or Position's LV95 read-outs can do the same. Accepted: a split fixed
  by hand — two wrappers in DOM order on a two-column grid — would not move, but it is lopsided
  whenever `Ligne` swings by its 300 px, and is a split point to re-choose every time a group
  changes, where the columns rebalance on their own.
- **The middle column scrolls, vue de dessus first** — the way Statique's right column does. The
  map is first in the DOM too, so the focus order is the order on screen; its hairline is under it,
  between it and the block. Holding the block still over a residual scroller was rejected (#104): at
  1024 × 768 it leaves the map 116 px. The column reserves its scrollbar gutter
  (`scrollbar-gutter: stable`), so a scrollbar that comes and goes cannot move the width every band
  is a function of; on a platform with classic scrollbars the measured block is that gutter
  narrower than `avanceBlockWidth()` up to 2848 px of viewport. **What it costs**: the Chart Block starts under the map — its
  banner slot at about 633 px from the top of the window at 1440 and at 2560 (the map's region,
  36 + 597 px: its 448 px cap plus its controls and five caption lines), about 458 px at 1024
  (36 + 421,7) — and the profile under the banner at 677 and 533,7 px (routing.md's measurements).
  So the banner is below the fold on a window shorter than about 633 px (458 at 1024), and
  « Garde min » and the read-out cells, under the profile, clearance strip and View Strip, are a
  scroll down on any window shorter than the map plus the whole block — 1440 × 900 among them.
  Scrolled to, the block itself stands whole in any window 36 px taller than it — 1276 px at most,
  its 1984 px letterbox (below).
- **The vue de dessus is three columns only.** Below 1024 its box is `display: none`, and the map
  is not started there at all — `threeColumns()` in `contract.ts`, the same B2, decides what to
  *mount*, never a size: a MapLibre map started in a box with no size holds a WebGL context for
  nothing and has no box to fit its camera to. The Position and Vent fields stay in `Paramètres`,
  in clear at every width, and read the same Scenario the map and the rose write.
- **Why 1024.** A stacked block is sized from the *whole* viewport width and owes `MIN_RAIL` under
  it, so stacking costs the chart its profile on any screen that is not tall: at 1024 × 768 it is a
  796 px block against 612 px left (782 when measured, at the 24 px gutter), and Avancé opens on « Garde min. ligne » alone (measured at the
  built `/avance`, with 1180 × 820 and 1194 × 834 the same). In three columns nothing is collapsed
  and the Rail stands beside the block rather than under it: 1024 × 768 is a 448 px middle column
  and 732 px of height, the map's region to y ≈ 458 and the whole 626 px block under it, to
  y ≈ 1084 — so « Garde min » is a scroll of the middle column away there, never folded away, and
  the profile is never spent to pay for the Rail. Until #110 the block headed the column and the
  same screen held it whole above the fold; putting the map above it spent that. **What it
  costs**: at the switch the middle column is under B1 (`CELL_WRAP_PX`, 624) and under 768, so the
  banner takes three lines and the View Strip its short labels (« à vide », « A–B »); the column
  clears B1 from 1200.
- **Stacked below 1024 and short**: the whole block plus `MIN_RAIL` and the navigation bar need
  `block + 156` px of height — 856 px at 768 wide, 952 px at 1023. Portrait tablets (768 × 1024,
  810 × 1080, 820 × 1180, 834 × 1194) clear it; a narrow desktop window such as 1000 × 900 does not
  and opens on the Pinned Safety Header alone until the window is taller. That is the collapse the
  ticket keeps (« le Pinned Safety Header reste »), accepted rather than capped around.
- **No shell cap (#110).** The shell spans the window, and every pixel past the two side columns
  goes to the middle one: `chartColumnWidth()` is `viewport − 576` from 1024 and `viewport − 864`
  from 1920 (#112) — 1056 px at 1920, 1696 at 2560 and 2576 at 3440 — with no empty margin either
  side. Statique, Dynamique and Terrain keep
  `SHELL_MAX_PX` (1728). The shell used to stop there too, because `1728 − 576 = 1152` is
  `REFERENCE_COLUMN_PX` and kept the middle column under amendment F's plot ceiling (473,76 px).
- **The Chart Block stops at 1984 px and letterboxes past it (#110).** The vue de dessus takes the
  whole middle column; the block widens with it up to `AVANCE_BLOCK_MAX_PX` — the column at 2560
  under #110, `2560 − 576`, and at 2848 since the left column doubles (`AVANCE_BLOCK_VIEWPORT_PX`,
  `1984 + 864`, #112) — and past it stays 1984 px wide, centred (`mx-auto max-w-[1984px]` on the
  block's own box, which is the query container and the observer's target), the column's surplus
  empty either side: 296 px a side at 3440 (288,5 with a classic scrollbar). Its plot ceiling is raised to match (`AVANCE_PLOT_MAX`,
  `0,42 × 1960 = 823,2` px), so the plot is `0,42 × W_inner` at every width it is drawn at and the
  Plot Aspect Band holds by construction — 0,42 at 1024, 1440, 1920, 2560 and 3440
  (`contract.test.ts` walks it). **Why the cap** — the old « Why the cap », moved from the shell to
  the block: with no ceiling the block was `416 + 0,42 × 2840 = 1608,8` px at 3440, taller than the
  1404 px a 1440 px window leaves, so no scroll position showed the banner slot and « Garde min »
  together and the block stopped being one co-visible unit. Capped, it plateaus at 1239,2 px: whole
  in 1920 × 1080 (814,56 against 1044 since #112), 2560 × 1440 (1118,24) and 3440 × 1440 once the
  column is scrolled to it. **Why 1984**: #110 set it at the column of the brief's own 2560, so the
  coupe filled the column there, and it is a block that fits the 1440 px-tall windows the brief
  names; a 1920 cap would fit 1080 px windows at every width but stop the coupe 640 px short at
  2560. #112's wider left column changes no term of the height it bounds, so the cap stays 1984
  rather than following the column at 2560 down to 1696 — which would shrink the coupe at 3440 for
  nothing — and is now reached at 2848. **Why the whole block and not the
  plot alone**: the profile and the clearance strip share one x scale, so a plot narrowed inside its
  band would draw the anchors off the strip's. The cap is a width, so nothing reads the window's
  height: measured at 2560 the coupe is the same at 1440, 900 and 500 px of window height. The Chart
  Block is told the same ceiling (`plotMax`) that the shell's `--profile-plot` spells, so the drawn
  plot and its band agree. Below 1024 nothing moves: the widest stacked column is 1023 px, a
  419,58 px plot, which neither ceiling reaches. **What it costs**: a window under 1276 px tall at
  2848 or wider does not hold the whole block (2560 × 1080 already does not: 1118,24 against 1044);
  past 2848 the block does not widen with the window, and its letterbox margins stand empty.
- **The vue de dessus keeps its frame**: 3 : 2 up to the frame's 448 px height cap
  (`--top-view-max-h`, #115), then wider than 3 : 2 — 409 × 273 at 1024 (its region 422 px tall
  with its controls and caption) and 1657 × 448 at 2560 (1945 before #112), with a classic
  scrollbar. A height read off
  the width, capped, never off the window.
- **The window's height binds the block below 1024 only** (#110, `heightBindsBlock` in
  `src/lib/layout/collapse.ts`): from three columns neither (c) nor the `compact` row fires,
  whatever the height or the keyboard, because the block stands under the map in a column that
  scrolls — so the coupe's height never changes when only the window's does. Before #110 three
  columns at 1440 × 500 pinned the block to the Pinned Safety Header; now they keep it whole and
  scroll to it. The § 8 strip is no longer a term of (c): below 1024 the Rail pays it, which § 5
  tolerates, and above it nothing is fitted to the window.
- **Stacked, the order is the Chart Block, then the Rail's sections in their own order** — the
  Pinned Safety Header and its collapse are unchanged, and apply below 1024 only (the
  `width < 1024px` arm in `src/styles.css` for scroll and focus, `heightBindsBlock` for the
  height). The one scroller is a wrapper that is `display: contents` from 1024 up: both columns
  become the chart's flex siblings, and a focus inside either still bubbles to the wrapper's
  handlers.
- **`Valeurs déduites` holds editable rows**, so it shares `Paramètres`' field-row context: `RailInputs`
  owns the context and hands the two sections back through a render prop.

## Statique's first row

From **1024 px of viewport** — `THREE_COLUMN_PX`, Avancé's own switch — the right column of the
Page Statique (`/`) is two rows (#109). The one number of it in `src/lib/layout/contract.ts` is
`STATIQUE_TILE_MAX_PX`, which reaches the CSS as the block's own `--tile-max` (the
`minmax(0, var(--tile-max))` of its two tracks), so no class spells it a second time. The switch is
written `min-[1024px]:`, as Avancé's. The rest — what the row leaves the map — is arithmetic over the
shell, measured by `agent-browser` (`docs/conventions/routing.md`, 2026-11-09), not modelled.

- **Row 1: the vue de dessus, then `Résultats`.** The map takes the rest of the column; the tiles
  stand on its right as a **block of 2 × 3** — the four value tiles in a 2 × 2, the Verdict across
  both columns of the third row — each capped at 180 px, so the block is `2 × 180 + 8 = 368` px with
  its `gap-2`. The tiles stand at the top of the row. A hairline between the two regions, as one
  under each stacked region; both keep their `px-3`, so the map's left edge and the tiles' right
  edge are the coupe's (#115).
- **Row 2: the coupe**, across the column — the same width, and so the same bands, as before.
- **Below 1024 nothing moves.** The regions' wrapper is `display: contents` there, so `Résultats`,
  the coupe and the vue de dessus stack in the column as they always have — the brief keeps that
  order below 1024, and the DOM keeps it at every width, because any one DOM order mismatches the
  drawing at one of the two shapes. **What it costs from 1024**: a screen reader reads the tiles
  before the map it sees first, and **keyboard focus goes from the coupe back up to the map** —
  measured at 1440 on the trial line, Tab visits the coupe's controls (« Choisir une marge
  exigée », « ligne à vide », « ×1 vraie échelle », « Afficher le profil ») before the vue de
  dessus's (« Fond de carte », pentes, the map, its zoom, « Placer A », « Placer B », « Mesure »…),
  so the focus order is row 2, then row 1 (WCAG 2.4.3). The tiles hold no control, so it is the only
  jump. Accepted: reordering the DOM would move the phone's, which the brief keeps.
- **The block is Statique's alone** (`<OutputGrid block>`, its Verdict `wide`): two columns at every
  width. Terrain's grid keeps its row of five from a 56 rem column. Statique dropped that arm with
  nothing lost below 1024 — its column, `md:w-80` short of the viewport, is 703 px at the most there.
- **The vue de dessus keeps its format**: 3 : 2 at every width of the row, its height read off its
  width and never off the window — the brief's « format conservé ». The row lifts the frame's
  448 px height cap (#115) through the frame's own `--top-view-max-h` (`none` on the region from
  1024), so the cap still holds for the stacked phone shape, Terrain and Avancé, and `TopMap`'s
  mount takes no new prop. Its width is the column, `min(viewport, 1728) − 320`, less the block
  (368), four `px-3` (48) and the hairline between the regions (1): **287 × 191** px at the switch,
  narrower than the block, the wider from 1106 px of viewport, **703 × 469** at 1440 and
  **989 × 659** from the shell's cap — `1408 − 417 = 991` less the shell's own two hairlines
  (`min-[1730px]:border-x`). **What it costs**: the row is as tall as the map, so at 1440 × 900 the
  coupe starts at 710 px and at 2560 × 900 it starts at the fold (900 px), one scroll down — the
  price of a map that keeps its format beside the tiles.
- **Seven caption lines in the row** (`--top-view-caption`, 7 rem, against five elsewhere): the
  caption sets the row's height, and so the coupe's place, where it was the last region and moved
  nothing. Seven is one per line the caption can hold in 2D (A, B, the Vent, the gesture, the fond
  indisponible, the Banane, the Vue 3D); on the narrow map from 1024 to about 1200 px the Vent and
  the Vue 3D lines wrap to two each, and the trial line's six lines on load, seven with « Mesure »
  armed, stay inside it. **What it costs**: 32 to 48 px of empty caption at 1440 on a calm line;
  and a caption of more than seven lines — a Vent, the Banane and « Mesure » armed on the 287 px
  map make eight — still pushes the coupe down a line. The Skeleton cannot foresee a caption any
  more than a tile's Avertissement; seven covers every line the caption can hold unwrapped.
- **The map's own controls at 287 px**: « Placer A / Placer B / Mesure » wrap onto a second line
  rather than run under MapLibre's zoom buttons (the overlay row is `right-12` and `flex-wrap`,
  every Page), so « Quitter la mesure » sits under « Placer A » at 1024. The rose's handle, the
  Mesure, « Placer B » and the Vue 3D work there (`docs/conventions/routing.md`), but the overlay
  and the Mesure's readout cover much of a 191 px map, and at the switch the « Fond de carte »
  select shrinks to « Carte c… » beside « Pentes supérieures à 30° ». Accepted: the brief puts the
  switch at 1024, and the map is the wider of the two from 1106.
- **The Skeleton is the same tree** (`StatiqueFrame`), so it lands in the same boxes at every width.

## Charts

**Hand-rolled SVG in React with `d3-shape` for the paths, and one hand-written affine scale per
axis. No charting library, and no `d3-scale`** — the only transform is linear metres → pixels, and
the two scales are *deliberately mismatched*, which is the whole point (« v1 build spec » § 5).

- The x scale is **one `SharedX` object per (chart-column inline size, `L`, terrain source)**,
  built by `@/lib/layout/contract.ts` and consumed by **both** charts. `GUTTER = 12` — the
  containers' `px-3`, voir *Rhythm* — on both sides of both charts, and **the pointer inverse is a
  method on it** — never a formula retyped per call site. The y-axis labels stand inside the plot
  at `axisLabel()`, on a halo of the background, because a 12 px gutter holds none.
- **No chart dimension may read the window height.** Every band height is a function of the chart
  column's inner width; the constants and the vertical-exaggeration policy (the aspect identity,
  the band, the ×1 floor) live in `contract.ts` and are unit-tested there.
- **The clearance strip's y domain is quantised and always reserves a negative band** —
  `clearanceDomain()` in `contract.ts`, ticket 39. `step` comes off a 1-2-5 ladder, `top` is a whole
  number of steps, the floor is `−step` whether or not anything violates, and the ticks are grid
  multiples carrying the unit on the topmost one. Never `min`/`max` of the data: an auto-fit strip
  puts the zero line on the frame's bottom edge and then *moves* it the instant one step goes
  negative, which presents a scale change as a data change on a safety drawing.
- **The strip's curve is the *line's* minimum, and the passenger's own garde is the profile's** —
  ticket 41. `y` is § 11's inner minimum over the whole line at that rider position, so the strip's
  caption, its `aria-label` and the « Garde min. ligne » cell all name that scope; the garde under the
  rider's feet (`SceneRider.underRider`) is a second clearance dimension on the **profile** at `x_D`,
  self-hiding under the same `max(1 m, 1 % de la portée)` bit that relabels the cell. The two may not
  share the strip's y axis: they differ by two orders of magnitude on real relief — an imported profile
  at low anchors has every rider position violating at −0,36 m while the passenger flies a valley at
  +62,6 m — so one linear domain leaves the zero crossing **0,2 px** tall. Whatever the curve is,
  `clearanceDomain()` is fed **that** quantity and nothing else.
- **The Zones d'ancrage are grey, never red** — #106. `SceneBase.anchorZones` holds the two bands
  `[0, z]` and `[L − z, L]`, and `AnchorZoneBands` (`src/components/chart/anchor-zones.tsx`) draws
  them full height on the profile and on the clearance strip, in `muted-foreground` at low opacity
  with a dashed inner edge, under the red violating bands. Red — the violating bands, the strip's
  below-zero stroke and its deficit fill — is drawn only where the garde is judged, outside the
  zones; the garde itself stays drawn inside them. The coupe's hover says « garde non jugée » there.
- What the charts draw comes from `@/lib/chart/scene.ts` — pure functions over the unloaded line
  `deriveUnloaded` returns (`@/lib/scenario/unloaded.ts`), so the questions worth testing are `node`
  tests and the components stay thin.
- **One unloaded line and one sweep per parameter change, at the app root.** `useUnloaded()`
  (`src/components/app/use-unloaded.ts`) memoises the line on `unloadedInputs`' fields and hands it
  to `useDeduced()`, which formats it with `deducedFrom`, and to `useScene()`
  (`src/components/app/use-scene.ts`), § 2's `useSweep` seam: the Chart Block *and* the Rail's
  output half read the same traverse, so the memo lives once in `app.tsx` and the value is passed
  down. `x_D` is deliberately not one of their inputs — a scrub re-runs `placeRider` alone. The gate
  report and the `Résultats` hold through a scrub the same way: both key on `useTraverse()`
  (`src/components/app/use-traverse.ts`), the Scenario without `x_D` memoised on `traverseInputs`'
  fields, and tier one reads the form's text through `sameGatedText`, which ignores `x_D`'s.
- `visx`'s low-level primitives are the **pre-approved fallback** if the hand-rolled path logic
  becomes unwieldy; it is not a new decision.

## Wording

Two registers, one table: Terrain, Statique and Dynamique speak as people do on site; Avancé keeps
the exact term. A quantity is named by its id in `src/lib/vocabulary/labels.ts`, never by a string
typed where it is shown — `label(id, register)` — so renaming is one edit. `GLOSSARY.md` holds
each term's meaning and its _Avoid_ words; `PROSCRIBED_WORDS` is those words as a guard, and
`labels.test.ts` reads every string in `src/` against it, whichever Page prints it.

- **A new term enters the glossary in the same change.** `labels.test.ts` fails on a wording of the
  vocabulary table that neither the glossary nor §1 of `docs/simulation-theory.md` mentions, and on
  a short list of terms printed outside the table (Écart à vide, Cas défavorable, Réserve de tension,
  Pilote de tension, trajet, ligne hors cadre, ligne entière) that is not a bold glossary name. A term
  printed anywhere else is held by this rule and by review, not by the test.
- **The exact register stays on Avancé.** Prétension, régime de sécurité, FS, rapport V,
  terminaison, rendement, η and DAF appear in no table a simplified Page consumes.
- **« Estimation » rides every dynamic value** (Point d'arrêt, vitesse d'arrivée, durée, the
  curves, the coupe's dynamic marks), and no static one.
- **The essai is « cohérent », never « validé »**; what it does not show is « pas confirmé ».
- **The interface never prints** a lateral drift in metres, a garde au sol under wind with a
  passager, a predicted retension, or a rendement or a rapport V off Avancé.

## Forms

**`@tanstack/react-form` owns field state; per-field validators are `valibot` Standard Schemas**
([amendment D](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md)). Two boundaries are not
negotiable, and both are why `src/lib/rail/` exists as pure modules rather than as hook bodies:

- **Form validators own exactly tier one** — what needs no physics. `src/lib/rail/fields.ts` is
  that tier: emptiness, readability, a sign rule. **The five gates are not form validators**:
  Solve / Clearance / Verdict, then the Wind and Ride gates the passager's ride adds, are
  cross-field predicates over the derived Scenario (`src/lib/rail/gates.ts`, `GATE_IDS`), because a
  per-field validator would split one gate across seventeen fields.
- **§5.4's chord bound stays in the engine.** No form validator re-derives it, and « Tension
  impossible » is an engine refusal the UI surfaces, never a field error.

Three more rules that a later change is likely to break:

- **The form holds text; the store holds numbers.** A keystroke that parses commits a *canonical*
  value; one that does not leaves the Scenario alone. Store → form synchronisation compares against
  the **previous state rendering**, never against the field's text — comparing against the text
  erases a committed-invalid « −5 » on blur, which is the evidence its ⛔ message quotes.
- **TanStack Form marks every field touched on submit, and this app has no submit.** Nothing may
  depend on that transition; « Saisie en cours » is keyed on **focus**.
- **Every numeric field is `<input type="text" inputMode="decimal">`.** `type="number"` is rejected:
  its acceptance of `,` is locale-dependent and its failure is silent.
