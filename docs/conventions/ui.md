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
