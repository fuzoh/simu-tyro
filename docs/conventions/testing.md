# Testing

Vitest 4 with jsdom. `bun run test` → `vitest run` (single pass, no watch).

- React component tests use `@testing-library/react` / `@testing-library/dom`.
- Environment is `jsdom` — no real browser, no layout measurement.

## What deserves a test

Simulation math. It is pure, numeric, and the place where a silent wrong answer is
expensive. When you add or change a formula, add a case with expected values taken
from the reference reports in `docs/references/` (see
[simulation.md](simulation.md)) — not from your own implementation's output.

> No test suite exists yet. When the first tests land, record the chosen file
> layout and naming convention here.
