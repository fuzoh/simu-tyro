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

Animations: `tw-animate-css` is available. Fonts: Inter and Manrope via
`@fontsource-variable/*`.

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
- What the charts draw comes from `@/lib/chart/scene.ts` — a pure `Scenario → ChartScene`
  derivation, so the questions worth testing are `node` tests and the components stay thin.
- **One sweep per parameter change, at the app root.** `useSceneBase()`
  (`src/components/app/use-scene-base.ts`) is § 2's `useSweep` seam: the Chart Block *and* the
  Rail's output half read the same traverse, so the memo lives once in `app.tsx` and the value is
  passed down. `x_D` is deliberately not one of its inputs — a scrub re-runs `placeRider` alone.
- `visx`'s low-level primitives are the **pre-approved fallback** if the hand-rolled path logic
  becomes unwieldy; it is not a new decision.

## Forms

**`@tanstack/react-form` owns field state; per-field validators are `valibot` Standard Schemas**
([amendment D](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md)). Two boundaries are not
negotiable, and both are why `src/lib/rail/` exists as pure modules rather than as hook bodies:

- **Form validators own exactly tier one** — what needs no physics. `src/lib/rail/fields.ts` is
  that tier: emptiness, readability, a sign rule, the stations' in-trace bound. **The three gates
  are not form validators**: Solve / Clearance / Verdict are cross-field predicates over the derived
  Scenario (`src/lib/rail/gates.ts`), because a per-field validator would split one gate across
  seventeen fields.
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
