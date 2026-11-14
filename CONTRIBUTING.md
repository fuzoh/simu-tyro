# Contributing

Thanks for helping. This file is the workflow. Setup is in the [README](README.md#quick-start);
code-level rules — generated files, formatting, which convention file covers which area — are in
[`AGENTS.md`](AGENTS.md), which applies to humans and agents alike.

## Before you start

- **Open or pick an issue first** on [GitHub Issues](https://github.com/fuzoh/simu-tyro/issues).
  Issues labelled `ready-for-human` or `ready-for-agent` are specified and ready to take;
  `needs-triage` and `needs-info` are not yet.
- **Use the domain vocabulary** from [`GLOSSARY.md`](GLOSSARY.md) in code, issues, commits and UI.
- **Read the convention file for the area you touch** — the table in
  [`AGENTS.md`](AGENTS.md#read-before-you-touch-that-area). Simulation changes must also stay
  faithful to [`docs/simulation-theory.md`](docs/simulation-theory.md): a physics change starts
  there, with its source, before it reaches code.

## Workflow

1. Branch off `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`…
2. Make the change, with colocated unit tests (`foo.ts` → `foo.test.ts`) — see [Tests](#tests).
3. Run the [checks](#checks) locally.
4. Open a pull request against `main`. Every commit that lands on `main` must be a
   [Conventional Commit](#commit-messages); when squash-merging, the PR title becomes that commit.
5. CI must be green before merge.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, imperative,
lower case. They drive the version and the changelog, so pick the type for what the *user* sees:

| Type                                     | Release effect                    |
| ---------------------------------------- | --------------------------------- |
| `feat!` or a `BREAKING CHANGE:` footer   | major bump                        |
| `feat`                                   | minor bump                        |
| `fix`, `perf`, `docs`, `test`, `refactor`, `chore`, `build`, `ci`, `revert` | patch bump, own changelog section |
| `style`                                  | no release, hidden                |

To force a version, push a commit whose body carries a `Release-As: x.y.z` footer.

Scopes follow the code area: `sim`, `chart`, `rail`, `docs`, `ui`, `terrain`, `url`, `agents`…

## Tests

A test earns its place by being able to **fail when the behaviour is wrong**. Tautological tests —
ones that pass whatever the code does — are rejected in review:

- **Expected values never come from the code under test.** Not by calling the function to build
  the expectation, not by re-implementing its formula in the test, not by pasting what it printed.
  Simulation values come from `docs/simulation-theory.md` §15 fixtures, a hand calculation shown in
  the test, or a closed form.
- **Assert behaviour, not wiring.** A mock asserted to return what it was told to return, a constant
  compared with itself, or a type re-checked at runtime tests nothing.
- **Prefer invariants that cross-check the code against itself through physics**: symmetry, limits
  (`EA → ∞` against the inextensible catenary), force balance, a derivative against finite
  differences.
- **Watch it fail once.** Break the line under test (flip a sign, drop a term) and check the test
  goes red before you commit it.

The full rules — fixture provenance, tolerance tiers, what Vitest does not cover — are in
[`docs/conventions/testing.md`](docs/conventions/testing.md).

## Checks

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs these on every PR and on `main`:

```bash
bun run format:check     # oxfmt — fix per AGENTS.md § Formatting
bun run typecheck        # tsc --noEmit
bun run lint-type-aware  # oxlint with type information
bun run test:ci          # vitest, minus the wall-clock tripwire
jactionlint              # only if you touched .github/ — `uv tool install jactionlint`
```

One more check is **not** in CI and is yours to run after any change under `src/lib/sim/` or
`experiments/`:

```bash
bun experiments/spatial-aero-134/matrix.ts --check   # the archived tables and report still match the code
```

It exits `1` when a file differs: regenerate as
[`docs/conventions/simulation.md`](docs/conventions/simulation.md#experiments-are-not-the-engine)
says, or the report under `docs/references/spatial-wind/` goes stale with every other check green.

`test:ci` skips the wall-clock p95 gate ([why](docs/conventions/testing.md#benches)), so run the full
**`bun run test`** locally before merging anything under `src/lib/sim/`.

## Releases

Nothing to do by hand. On every push to `main`,
[release-please](.github/workflows/release-please.yml) opens or updates a **release PR** that bumps
the version and writes the changelog from the commits since the last tag. A maintainer merges it
when a release is wanted; that creates the `vX.Y.Z` tag and GitHub release, and deploys the tagged
build to [GitHub Pages](https://fuzoh.github.io/simu-tyro/). Between releases the live site does not
change.
