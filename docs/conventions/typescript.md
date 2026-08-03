# TypeScript & formatting

## tsconfig facts that change how you write code

- `verbatimModuleSyntax` — type-only imports **must** use `import type`.
- `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
  `noUncheckedSideEffectImports` are all on.
- Import alias: `@/*` → `src/*`. Prefer it over deep relative paths.
- `allowImportingTsExtensions` is on, `noEmit` — this project never emits JS,
  Vite handles the build.

## Formatting

**oxfmt owns formatting.** `bun run format` runs `oxfmt --write`; config is
`.oxfmtrc.json`. Don't argue with it, don't hand-align code, don't add
formatting-only diffs.

Current values (`.oxfmtrc.json` is the source of truth):
semicolons, double quotes, 100 columns, 2-space indent, trailing commas
everywhere.

oxfmt also sorts imports (grouped: types → builtin/external → internal → relative)
and sorts Tailwind classes inside `clsx`, `cn` and `cva`. Don't hand-order either.

## Linting

`bun run lint` for fast iteration, `bun run lint-type-aware` before declaring work
done (`oxlint --type-aware --type-check`). Config is `.oxlintrc.json`.
