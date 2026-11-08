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
handle): a dot is a shape, not a corner radius. `rounded-md`, `rounded-sm` and bare `rounded`
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
- **gap:** `gap-1` inside a row (label → control → hint) · `gap-2` between rows in a section ·
  `gap-3` between sections.
- **vertical:** a Rail row is `h-7` inside a `py-1` wrapper.

Nothing else. A `gap-1.5` in a diff is the defect, not the taste.

### Touch: `.touch-44`

≥44 px on coarse pointers is a budget § 5 spends to the pixel — `view-strip.tsx`'s
`59 + 48 + 44 + 128 + 24 = 303 px`, and a `size="sm"` control is **28 px visually**. One utility in
`src/styles.css` carries the `::after` overlay that closes the gap, applied at call sites and
**never baked into a `ui/` component**: components stay re-`add`-able, and the touch policy stays
one grep.

### Severity is a token

`--warning` and `--warning-foreground` exist in `:root` and `.dark` and are exposed through
`@theme inline`, exactly as `--destructive` is. The filled chip is `bg-warning/15 text-warning`.
**No `amber-*` literal anywhere in `src/`.** **One** warning role, not two: § 7's precedence ladder
is a semantic ordering, and `destructive` covers both text and chip with a single token.

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

**Two customisations in `ui/` that a re-`add` will silently undo.** Both are load-bearing; re-check
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

## Charts

**Hand-rolled SVG in React with `d3-shape` for the paths, and one hand-written affine scale per
axis. No charting library, and no `d3-scale`** — the only transform is linear metres → pixels, and
the two scales are *deliberately mismatched*, which is the whole point (« v1 build spec » § 5).

- The x scale is **one `SharedX` object per (chart-column inline size, `L`, terrain source)**,
  built by `@/lib/layout/contract.ts` and consumed by **both** charts. `GUTTER = 24` on both sides
  of both charts, and **the pointer inverse is a method on it** — never a formula retyped per call
  site.
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

## Forms

**`@tanstack/react-form` owns field state; per-field validators are `valibot` Standard Schemas**
([amendment D](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md)). Two boundaries are not
negotiable, and both are why `src/lib/rail/` exists as pure modules rather than as hook bodies:

- **Form validators own exactly tier one** — what needs no physics. `src/lib/rail/fields.ts` is
  that tier: emptiness, readability, a sign rule. **The three gates are not form validators**:
  Solve / Clearance / Verdict are cross-field predicates over the derived Scenario
  (`src/lib/rail/gates.ts`), because a per-field validator would split one gate across seventeen
  fields.
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
