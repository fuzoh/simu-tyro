# P0.1 · Test harness and the `testing.md` diff

Stage: P0.1
Status: done
Blocked by: —
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 10 (P0), § 11 ·
[Amendments](../AMENDMENTS.md) **A**, **B**

## Delivers

1. A `test` block in `vite.config.ts` — **there is none today**, so `docs/conventions/testing.md`'s
   claim that « environment is jsdom » is currently false. **The environment is `node`, always.**
2. **Remove `jsdom`, `@testing-library/react` and `@testing-library/dom` from `devDependencies`.**
   Vitest is unit-only; left installed they invite exactly the tests amendment A removes.
3. `"bench": "vitest bench"` in `package.json`, beside `"test"`.
4. The diff to `docs/conventions/testing.md` — the spec's six changes, **as amended**: item 1 becomes
   « `node`, always », the « React component tests use `@testing-library/react` » line is **deleted**
   rather than softened, and a **seventh** change adds the `agent-browser` section naming what lives
   outside the unit suite (voir ticket 29).

## Gate

`bun run test` runs and reports 0 tests. `bun run bench` resolves. No `jsdom` in the lockfile's direct
dependencies. `bun run typecheck` and `bun run lint-type-aware` clean.

## Notes

- **No `@vitest-environment` docblocks anywhere.** The engine is the bulk of the suite and is pure; a
  DOM buys nothing for `solveSpan`, and what a DOM would have decided is now `agent-browser`'s.
- **The one seam that wanted jsdom becomes a parameter instead.** § 11 asked for
  `@vitest-environment-options` supplying a `window.location`, because the link-arrival cases read the
  raw query string on the client. Those functions now **take the raw query string as an argument** —
  pure, and a better seam than the one the docblock was propping up. Same for `readSession`, which
  takes the storage object (ticket 21).
- **Leave `benchmark.enabled` unset.** `vitest bench` globs `*.bench.ts` and replaces `test.include`
  while it runs, so a bench never executes inside `bun run test` — which is what we want.
- **The doc is amended before the first test file exists**, not after. Its standing `1e-3` TODO is
  **discharged** here, with the reason recorded (§5.3's tolerance is fixed; ≤ 4×10⁻⁶ was measured
  against every ported fixture) so nobody re-opens it as an oversight.
- One API fact the diff must carry: tinybench exposes `p75` / `p99` / `p995` / `p999` and **no
  `p95`**, while the performance criterion is stated in p95 — so the threshold assertion is a plain
  `test` that times 40 runs and takes its own p95, against **8 ms**, never against the measurement.
- Also in the diff: colocated one-test-per-source-file, **no `tests/` directory**, and no suite file
  spanning modules.
- The `agent-browser` section must say what CI does **not** cover, so a green suite is not misread as
  coverage of the four states ticket 29 inherits.

## Comments

**Built.** `vite.config.ts` carries a `test` block: `environment: "node"`,
`include: ["src/**/*.test.ts"]`, `benchmark.include: ["src/**/*.bench.ts"]`, `benchmark.enabled`
left unset. `jsdom`, `@testing-library/react` and `@testing-library/dom` are gone from
`devDependencies` **and** from `bun.lock` — bun kept `jsdom` alive as vitest's optional peer after
`bun remove`, so the resolution entry was dropped and `node_modules` reinstalled from the lockfile;
`bun pm why jsdom` now finds nothing. `"bench": "vitest bench"` sits beside `"test"`.
`docs/conventions/testing.md` was rewritten with the seven changes: `node`-always environment with
the `@testing-library` line deleted (not softened), the four-tier tolerance table with the `1e-3`
TODO discharged and its reason recorded, the two `source` provenance classes plus `check.ts` as a
coverage checklist with the four assertions it never made, a benches subsection (tinybench has no
`p95`, so the threshold is a plain `test` timing 40 runs against 8 ms; Node does not reproduce
1,30 ms), an injected-states subsection (`vi.mock` the collaborator, never widen a signature, never
assert unreachability, the envelope sweep is not CI), the colocated one-test-per-source-file rule
with no `tests/` directory, and a seventh section naming what CI does **not** cover — ticket 29's
four states, five measurements and walkthroughs.

Gates: `bun run typecheck`, `bun run lint-type-aware`, `bun run test` (0 tests, exit 0) and
`bun run bench` (0 benches, exit 0) all green.

**Judgement calls.**

- `passWithNoTests: true` in the `test` block — the gate asks for `bun run test` to report 0 tests
  and Vitest otherwise exits 1 on an empty run. In config rather than as a CLI flag so `vitest bench`
  inherits it too.
- `test.include` narrowed to `src/**/*.test.ts`; the default glob also matches `.tsx` and paths
  outside `src/`. `.ts`-only mechanically forecloses the component tests amendment A removes.
- `benchmark.include` set for symmetry with the colocated `*.bench.ts` rule — only `enabled` had to
  stay unset.
- `vite.config.ts` keeps `defineConfig` from `vite` and adds `/// <reference types="vitest/config" />`
  rather than importing `defineConfig` from `vitest/config`, so only one Vite type instance is in
  play.
