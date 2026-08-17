# 40 — Cohérence UI : une échelle de densité, et des composants shadcn

**What to build:** One coherence pass over everything the user sees. The app reads as several apps
stitched together — **eight DOM text sizes**, the same quantity drawn at four of them, three
typefaces of which one is not loaded, every control hand-rolled next to a `src/components/ui/`
that holds exactly one component nobody renders, and a padding scale with no rule. This ticket
names **one density scale**, moves the chrome onto **shadcn components in their small variants**,
and records what may *not* move — because four of the current sizes are load-bearing and a naive
« make it all smaller » breaks two settled user decisions.

**Blocked by:** — *(item 2 of [ticket 39](./39-clearance-strip-investigation.md) is the strip's own
tick typography; if 39 lands first the strip's SVG sizes are already decided and this ticket leaves
them alone — see § 7 below)*

**Status:** done — 2026-08-16, every gate item verified (greps, browser evidence, full suite)

Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 5, § 7 ·
[docs/conventions/ui.md](../../../docs/conventions/ui.md) · touches tickets
[22](./22-app-shell-and-routing.md), [23](./23-chart-block.md), [24](./24-rail-input-half.md),
[25](./25-rail-output-half.md), [26](./26-error-surfaces.md), [27](./27-pinned-safety-header.md).

**Source:** user report of 2026-08-16 (« multiple fonts, multiple input and text sizes, different
paddings ») plus an inventory pass over `src/` at commit `385ff02`. Every count below is
**measured** with `rg`, not estimated.

## 1 · Eight DOM text sizes, and one quantity drawn at four of them

| class | occurrences | of which SVG |
| --- | --- | --- |
| `text-[11px]` | 35 | 1 (`profile.tsx:175`) |
| `text-xs` | 25 | 0 |
| `text-[10px]` | 15 | 4 (`strip.tsx:129`, `profile.tsx:312,315,351`) |
| `text-lg` | 5 | 0 |
| `text-base` | 5 | 0 |
| `text-sm` | 4 | 0 |
| `text-xl` | 3 | 0 |
| `text-[9px]` | 2 | 2 (`strip.tsx:137,147`) |

Seven of those are inside `<text>` and belong to the drawings; **the remaining 87 are chrome**, and
`text-[10px]` / `text-[11px]` — 45 sites — are raw arbitrary values with no token, no name and no
rule saying which of the two a given label takes. `outputs.tsx` alone mixes both across 17 sites
(`:153` label at 11 px, `:173` qualifier at 10 px, `:189` note at 11 px, `:191` formula at 10 px).

Worse, **a computed value — the thing the whole app exists to print — is set in four different
sizes**:

- `chart-block.tsx:427,435` — `font-mono text-lg` (18 px), the header cells
- `outputs.tsx:155` — `font-mono text-base` (16 px), the `Résultats` primary row
- `outputs.tsx:171,214` · `controls.tsx:373` — `font-mono text-xs` (12 px)
- `outputs.tsx:213,302` · `profile.tsx:175` — `font-mono text-[11px]`

A reader cannot infer hierarchy from a scale with four steps and no legend.

## 2 · `font-mono` resolves to a font this app never loads — **settled, see [amendment L](../AMENDMENTS.md)**

`src/styles.css:144-145` declares `--font-sans` (Inter Variable) and `--font-heading` (Manrope
Variable). **There is no `--font-mono`**, so the 13 `font-mono` sites fall through to Tailwind's
default stack — `ui-monospace, SFMono-Regular, Menlo, …` — which is **whatever the operating system
supplies**. Every number in a safety read-out therefore has a different shape on macOS, on Windows
and on Android, and none of them was chosen.

**Decided 2026-08-16: declare `--font-mono: ui-monospace, monospace`, ship no face.** The variance
is accepted rather than bought out, and its one measured consequence is paid in `contract.ts`:
**B1 moves from 600 px to 624 px**, re-derived at a 0,62 em advance —
`(9 × 18 × 0,62 + 24) × 5 ≈ 622 px`. Amendment L carries the arithmetic and **amends this ticket's
`src/lib/` gate** to permit exactly that change, with `contract.test.ts` updated in the same commit.

**This section's second half was wrong, and is retracted.** It claimed the scrub changing `2,44` to
`2,4` jitters the column, and prescribed `tabular-nums`. `src/lib/format/quantity.ts` renders every
quantity through `toFixed(displayDecimals(id))` — « a row at 2 decimals renders « 6,00 », never
« 6 » », its own words — so **a value cannot lose a decimal**. The only real movement is the integer
digit count (817,1 → 1017,1), and `tabular-nums` is inert against it because mono is fixed-advance.
**Elected: right-align the value columns, accept the residual, add no `tabular-nums`.**

## 3 · Every control is hand-rolled, and the one shadcn component present is never rendered

`src/components/ui/` contains `button.tsx` and nothing else. `<Button>` is rendered **zero** times;
`buttonVariants` is used as a class string in two places (`__root.tsx:21`, `refusal.tsx:25`).
Meanwhile:

| hand-rolled | sites |
| --- | --- |
| `<button>` with an ad-hoc box — **15** | `banner.tsx:127` · `inputs.tsx:974,988,1008,1083,1091,1100` · `controls.tsx:292,386` · `link-strip.tsx:54` · `outputs.tsx:111` · `shell.tsx:593` · `view-strip.tsx:124,135,146` |
| `<input>` | `controls.tsx:166` (numeric) · `controls.tsx:254` (radio) · `view-strip.tsx:274` |
| `<select>` | `controls.tsx:211` · `inputs.tsx:344,958` |
| `<label>` | `controls.tsx:74,247` · `view-strip.tsx:252` |

**The punchline: `button.tsx`'s own `size="sm"` is already the density this ticket wants** —
`h-7 gap-1 rounded-none px-2.5 text-xs`. The hand-rolled boxes are
`border-border hover:bg-accent rounded-md border px-2 py-0.5 text-[11px]` (five copies, byte-identical
across `banner.tsx`, `controls.tsx` and `inputs.tsx`) and
`border-border hover:bg-accent h-7 rounded-md border px-2 text-xs` (`inputs.tsx:975`). They differ
from the registry variant in **radius, padding and one type step** — three arbitrary divergences,
zero of them decided.

`size="xs"` (`h-6 … text-xs`) exists for the tightest row, and `icon-sm` / `icon-xs` for the dismiss
and peek controls.

## 4 · The radius contradicts the installed style

`components.json` sets `style: "base-lyra"`, whose button base is **`rounded-none`** and whose `sm` /
`xs` sizes re-assert it. The app writes `rounded-md` 17 times and bare `rounded` 19 times. So the
two `buttonVariants` call sites render square while every hand-rolled control beside them renders
rounded. Pick one and state it; `--radius` is a single variable in `styles.css:98`.

**Decided: square.** `--radius: 0`. It is what the installed style already assumes — `button` and
`native-select` re-assert `rounded-none` in every size variant — so it is the only option with no
recurring patch on every `shadcn add`. `rounded-full` is carved out for circular marks.

## 5 · The warning colour is an un-tokenised literal, eight times

`text-amber-600 dark:text-amber-400` appears at `banner.tsx:57` · `controls.tsx:105,377` ·
`inputs.tsx:1211` · `outputs.tsx:206,280`, and `text-amber-700 dark:text-amber-300` at
`outputs.tsx:258` and `controls.tsx:331` (there with `bg-amber-500/15`). Two ramps for one meaning,
hardcoded, while
`--destructive` — the *other* severity, of the same family — is a proper token used through
`text-destructive`.

§ 7's precedence ladder is a **semantic** ordering; its colours should be semantic tokens
(`--warning` / `--warning-foreground` in both `:root` and `.dark`, exposed through `@theme inline`
exactly as `--destructive` is), not a Tailwind palette index chosen per file.

## 6 · Padding and gap have no rule

`px-1` ×10 · `px-2` ×12 · `px-2.5` ×3 · `px-3` ×4 · `px-4` ×4 · `py-0.5` ×8 · `py-1` ×5 · `py-3` ×2,
and `gap-0.5` · `gap-1` ×14 · `gap-1.5` ×4 · `gap-2` ×10 · `gap-3` ×4 · `gap-4` ×3. Inside one
component: a Rail row is `gap-1`, the `Choice` radio row `gap-1.5`, the View Strip row `gap-3`.
Field boxes take `px-1` (`controls.tsx:169,212`) while buttons two pixels away take `px-2`.

The fix is not a sweep-and-replace. It is **one rhythm per surface**, written down: Rail row, Rail
section, chrome bar, banner. Three inline paddings and two gaps for the whole app is a reachable
target.

## 7 · What must not move — read this before touching anything

Five of the current sizes are load-bearing. **None of them is re-opened here.**

1. **`text-base` (16 px) on the Rail's numeric fields** — `controls.tsx:169`, argued at
   `controls.tsx:115-127` and in [amendment G](../AMENDMENTS.md) decision 5, **settled 2026-08-14**:
   below 16 px iOS Safari auto-zooms the viewport on focus. « Small fonts for density » **stops at
   this input.** The box already absorbs it (`h-7` = 28 px against a 24 px line box); shrinking the
   *type* would undo a user decision. If a 12 px field is genuinely wanted, the only honest route is
   16 px behind `@media (hover: none) and (pointer: coarse)` — and that is a **new decision for a
   map**, not a class change in this ticket.
2. **44 px hit targets on coarse pointers** — `view-strip.tsx:55-64,146-150` budgets
   `59 + 48 + 44 + 128 + 24 = 303 px` and reaches 44 px from a 32 px box with an `::after` overlay;
   `styles.css`'s `.chart-grab` does the same for the rider. A shadcn `size="sm"` control is 28 px
   **visually** — it must keep an overlay or `min-w-11`, or the § 5 touch budget silently regresses.
3. **`font-mono text-lg` on the header cells** — `chart-block.tsx:427,435`. `contract.ts:69` and
   `shell.tsx:74` both compute « ≈605 px for five cells » **from this exact size**, and
   `contract.test.ts` asserts the result. Changing the cells' type is changing a unit-tested layout
   contract; do it only with the arithmetic and the test updated in the same commit.
4. **The SVG sizes in `strip.tsx` and `profile.tsx`** are drawing sizes inside a hand-written affine
   scale, not chrome. `strip.tsx`'s three are [ticket 39](./39-clearance-strip-investigation.md)
   item 3's subject (the labels overlay the plot at `GUTTER = 24`); **leave them to 39.** Name a
   separate `--text-annotation` role if you want them tokenised, and do not fold them into the DOM
   scale.
5. **`src/components/ui/**` is never hand-written** (`CLAUDE.md`). Every component arrives via
   `bunx shadcn@latest add <name>`, *then* gets customised in place.

## The shape to converge on

**Everything below is settled. [`docs/conventions/ui.md` § *Design defaults*](../../../docs/conventions/ui.md)
is the normative copy** — it governs, this section is the summary you are implementing against.

**A DOM scale of three sizes, and no fourth** (amendment L decision 2 — the four-role proposal with
an 11 px `--text-2xs` was rejected):

| role | size | where |
| --- | --- | --- |
| body · annotation | `text-xs` 12 px | every control, every label, and every annotation — qualifiers, formulas, notes, provenance. **Annotation ranks below body by `text-muted-foreground` and weight, never by size.** |
| value / input | `text-base` 16 px | the numeric fields (locked, § 7.1) and the `Résultats` primary value |
| hero value | `text-lg` 18 px | the header cells only (locked, § 7.3) |

That deletes `text-[10px]` and `text-[11px]` from the DOM outright — no replacement token is minted,
because a token at 11 px is the fourth size arriving under another name. `text-sm` and `text-xl`
leave the app entirely: the two full-page error screens (`refusal.tsx:36`, `__root.tsx:50`,
`index.tsx:88`) drop to `text-lg`. **Three sizes, zero exceptions.**

**The other seven defaults, all settled 2026-08-16:**

| | |
| --- | --- |
| mono | `--font-mono: ui-monospace, monospace`, declared in `@theme inline`. Every computed quantity is `font-mono`; every label and prose is sans. No `tabular-nums`. Value columns right-aligned. |
| radius | `--radius: 0` — square, following `base-lyra`, so no added component needs patching. `rounded-full` survives for circular marks only. `rounded-md` / `rounded-sm` / bare `rounded` appear nowhere. |
| height | one control height, **28 px** (`h-7` — `size="sm"` / `icon-sm`). `xs` and `default` unused. |
| rhythm | **two paddings** — controls `px-2.5` (the registry's own), containers and bars `px-3`; **three gaps** — `gap-1` in-row, `gap-2` between rows, `gap-3` between sections; a row is `h-7` in a `py-1` wrapper. Nothing else. |
| touch | one `.touch-44` utility in `styles.css` carrying the `::after` overlay, applied at call sites, **never** baked into a `ui/` component. |
| warning | `--warning` / `--warning-foreground` in both themes through `@theme inline`, values as today (light `oklch(66.6% 0.179 58.318)`, dark `oklch(82.8% 0.189 84.429)`); the filled chip is `bg-warning/15 text-warning`. **One** role, not two. |
| components | all nine below, in one pass — a half-migrated app is the state this ticket exists to end. |

**Components to add** — all confirmed present in the `@shadcn` registry on 2026-08-16:

| add | replaces | note |
| --- | --- | --- |
| *(present)* `button` | the 15 hand-rolled `<button>` boxes | `size="sm"` / `"xs"` / `"icon-sm"`; keep § 7.2 |
| `input` | `controls.tsx:166`, `view-strip.tsx:274` | must keep `type="text" inputMode="decimal"` and 16 px |
| `label` | the three `<label>`s | |
| `native-select` | the three `<select>`s | **not `select`** — the Base UI `select` is a popup and would replace the OS picker on mobile; that is a behaviour change nobody decided. `native-select` styles the native element and keeps it |
| `radio-group` | `controls.tsx:247-258` `Choice` | |
| `toggle-group` | the `aria-pressed` segmented rows (`controls.tsx:292`, `view-strip.tsx:124,135`) | |
| `badge` | the provenance / stale-Override / VE chips | |
| `separator` | the 8 `border-b` dividers in `inputs.tsx` | |
| `field` | the Rail's label + control + error row | **never `form`** — that one is `react-hook-form`; this app is TanStack Form ([amendment D](../AMENDMENTS.md)). `field` is library-agnostic (`FieldError` takes `errors: {message}[]`) |

**One caveat on `field`:** its stock rhythm is a settings page's — `FieldGroup` `gap-7`, `FieldSet`
`gap-6`, `FieldDescription` `text-sm`. The Rail is a 28 px row with a right-aligned 80 px field.
Re-tune it **once, in the generated `ui/field.tsx`**, rather than fighting it with a className at
seventeen call sites. That is what « add, then customise » is for. **The elected values, as applied:**
`FieldGroup` `gap-5`→`gap-2`, `FieldSet` `gap-4`→`gap-2`, `Field` `gap-2`→`gap-1`, `FieldLegend`
`text-sm`→`text-xs`; the default `orientation` stays `vertical` and Rail rows pass `horizontal`
explicitly. **`FieldDescription` needed no edit** — `base-lyra` already ships it at
`text-xs/relaxed text-muted-foreground`; the `text-sm` figure above was `new-york`'s.

## Gate

Rewritten 2026-08-16 to the decisions of [amendment L](../AMENDMENTS.md) and
[`ui.md` § *Design defaults*](../../../docs/conventions/ui.md). Six items said something the
decisions overruled; a gate that contradicts the decision is a gate nobody can check.

- [x] `rg 'text-\[[0-9]+px\]' src --glob '!src/components/chart/**'` returns **nothing**, and
      `rg 'text-(sm|xl|2xl)' src` returns nothing either — the three sizes above are the only ones in
      the DOM, error screens included.
- [x] `--font-mono: ui-monospace, monospace` is declared in `@theme inline`. **No mono face is added
      to `package.json`.** `rg tabular-nums src` returns nothing. Every computed quantity is
      `font-mono`; no label or prose string is.
- [x] `CELL_WRAP_PX` is **624**, `contract.ts`'s docblock carries the 0,62 em re-derivation, and
      `contract.test.ts` is updated in the same commit. This is the **only** permitted `src/lib/`
      change — anything else that had to move is a finding for Comments, not a licence.
- [x] No hand-rolled `<button>`, `<input>`, `<select>` or `<label>` remains outside
      `src/components/ui/`, and every file added there came from `bunx shadcn@latest add`. All nine
      components land in this ticket, not a subset.
- [x] `--radius` is `0`; `rg 'rounded-(md|sm|lg|xl)|rounded[^-]' src` returns nothing outside
      `rounded-full` on circular marks.
- [x] `--warning` and `--warning-foreground` exist in `:root` and `.dark` and are exposed through
      `@theme inline`; `rg 'amber-' src` returns nothing.
- [x] The rhythm holds: `rg 'px-(1|2|4|6)\b|gap-(0\.5|1\.5|4)\b' src` returns nothing outside
      `src/components/ui/` and the chart SVGs — two paddings (`px-2.5`, `px-3`) and three gaps
      (`gap-1`, `gap-2`, `gap-3`).
- [x] **The five locks of § 7 are verified, not assumed:** the numeric field still computes to 16 px
      in the browser; the View Strip controls still measure ≥44 px under `pointer: coarse` (now via
      `.touch-44`); the `contract.test.ts` cell-width assertions pass **with the 624 update and no
      other**; `strip.tsx` and `profile.tsx` `<text>` sizes are byte-identical to before.
- [x] Browser evidence by [ticket 29](./29-responsive-layout-browser-evidence.md)'s method: the Rail
      and the header at **390 px** and at the reference column, before and after, with the row height
      and the smallest rendered type called out in each. A density claim without a measurement is a
      preference.
- [x] `bun run typecheck`, `bun run lint-type-aware` and the unit suite pass.

## Comments

### 2026-08-16 — the defaults, and three places this ticket was wrong

The nine open questions this ticket left were settled in an interview with the repo owner. The
**normative record is [`docs/conventions/ui.md` § *Design defaults*](../../../docs/conventions/ui.md)**;
the **reasoning for the two that amend the spec, plus one correction, is
[amendment L](../AMENDMENTS.md)**. Where this ticket's body and those two disagree, they govern.

Three of this ticket's own recommendations were overruled, and the reasons matter more than the
outcomes:

1. **Bundling a variable mono was rejected** in favour of an unbound `ui-monospace, monospace`. The
   ticket's argument — « the width budget is the argument, not taste » — was accepted *as a cost to
   pay explicitly*: B1 moves 600 → 624 px rather than a font being shipped to make 600 true.
2. **The four-role type scale became three.** 11 px against 12 px is not a rank a reader resolves,
   and `--text-2xs` would have been the fourth size arriving under a token's name.
3. **§ 2's jitter diagnosis was false.** `format/quantity.ts` has padded fixed decimals by design
   since it was written; `2,44` cannot become `2,4`. `tabular-nums` was nearly added on that basis
   and is now explicitly forbidden.

Also noted while inventorying, **not fixed here**: the spec moved to `.scratch/archive/`, so this
ticket's `../../zipline-simulator-v1/spec.md` links — and its siblings' — are broken. That is a
repo-wide link pass, not a presentation ticket's business.

### 2026-08-16 — `ui/` populated, and one merge trap found

Eight components added via `bunx shadcn@latest add` (`input`, `label`, `native-select`,
`radio-group`, `toggle-group`, `badge`, `separator`, `field`), plus `toggle.tsx`, which the registry
pulls as a dependency of `toggle-group` — so `ui/` holds **ten** files, not the nine § *Components to
add* counts. `native-select`'s registry-internal `IconPlaceholder` import never materialised: the CLI
honours `components.json`'s `iconLibrary` and emitted `ChevronDownIcon` from `lucide-react`.
`base-lyra` turned out to be square and 12 px as generated — zero radius, size or `amber-` fixes
needed in the added files.

**The trap, now recorded in [`ui.md`](../../../docs/conventions/ui.md): `input.tsx` shipped
`text-xs md:text-xs`.** The responsive class is a same-value duplicate — inert in CSS, **not** inert
under `cn()`, because tailwind-merge scores `md:text-xs` in a different conflict group from
`text-base` and it survives the override at ≥768 px. A Rail field written `className="text-base"`
would have rendered 16 px on the phone and 12 px on desktop: § 7.1's iOS lock honoured on exactly
the platform that does not need it. Removed. `input.tsx` is also `h-7`, not `h-8` — it is the one
added component with no size variant.

**Left for the migration:** `RadioGroup` ships `gap-2` where § 6's in-row gap is `gap-1`, and
`ToggleGroup` takes a numeric `spacing={2}` prop. Both sit inside the `ui/` exemption, so neither
trips the gate — but the Rail's `Choice` row inherits `gap-2` unless the call site says otherwise.
Decide it there: a `className` at the two call sites, not a third re-tune.

### 2026-08-16 — the browser pass, and the one regression it caught

Measured on the dev server, app root only — the **router devtools overlay** injects `goober` classes
at 10 px and 14 px in two more faces, and a naive `document.body` sweep reads them as app violations.
Anyone re-running this pass must scope to `document.body.children[0]`.

| | before (`385ff02`, :3001) | after |
| --- | --- | --- |
| distinct DOM type sizes @390 | **6** — 10 px ×18, 11 px ×76, 12 px ×86, 14 px ×1, 16 px ×3, 18 px ×5 | **3** — 12 px ×183, 16 px ×2, 18 px ×5 |
| smallest rendered type | **10 px** | **12 px** |
| distinct control heights | **8** — 13, 17, 21, 23, 24, 28, 32, 53 | **28**, plus two declared carve-outs (18 px inline link, 78 px two-line menu item) and the 1 px visually-hidden radio input |
| DOM font families | 3, one of them never loaded | 3, all declared — Inter Variable · Manrope Variable · `ui-monospace, monospace` |

Shots in [`../evidence/40/`](../evidence/40/) at 390 × 844 and at the 1440 reference column.

**Locks, verified rather than assumed:** all 15 Rail numeric fields compute to **16 px** at both
viewports; `touch-44` resolves to a 44 × 44 `::after` on all five coarse-pointer controls; the View
Strip row measures **325 px of content in 342 px of inner width — 17 px of real slack**, against the
339 px its re-derivation predicted on § 5's character-count arithmetic, which over-states as ticket
29 said it does; `contract.test.ts` passes with the 624 update and no other; the seven SVG `<text>`
sizes are byte-identical.

**The regression, caught and repaired.** § 6 named the numeric field's `px-1` as « a padding with no
rule » and the Gate grepped it out of `src/`. It was not ruleless — it was **measured**, and it was
the width half of amendment G decision 5. At the registry's `px-2.5`, `w-20` leaves **58 px of
content box: six characters at 16 px mono**, and `L₀` at 2 decimals over a 1000 m span spends
**seven** (« 1512,75 » → `scrollWidth` 87 against `clientWidth` 78). It clipped **silently** — `L₀`'s
tier-one rule has no upper bound, so no `aria-invalid`, no ⛔, and the value still committed to state
and to the link. Both repairs were measured at the 288 px Rail rather than argued: `px-1` costs
nothing but carves an exception out of § 6; **`w-24` keeps the rhythm and costs 2 px of total Rail
height** (546 → 548 px of rows, one `h_rider` label wrapping). The rhythm was kept, the 2 px spent,
and the field is now 96 × 28 with 74 px of content — 7,7 characters. The View Strip's « x » stays
`w-21`: one decimal, six characters, and 17 px of slack it should not spend.

**Also fixed, unowned by any file group:** `skeleton.tsx:55`'s `<noscript>` was the last `text-sm` and
`px-4` in `src/`. And `use-viewport.ts`'s docblock recorded the View Strip « x » field as an 11 px
iOS-zoom residual « recorded, not fixed » — the migration put it on the 16 px step, so that paragraph
now states the closure instead.

**Two residuals, neither a regression, both worth a later decision.** The Rail's ten `select` and
four `radio` controls remain at 12 px, so `use-viewport.ts`'s named-not-measured zoom risk stands
untouched — extending 16 px to `Picker` and `Choice` is still « a policy nobody has decided ». And
`RadioGroupItem` presents a 16 × 16 visual target with no `touch-44`; that is not worse than the
native radios it replaced, but it is not 44 px either.
