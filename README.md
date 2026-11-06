# Scoutech — zip line simulator

[![CI](https://github.com/fuzoh/simu-tyro/actions/workflows/ci.yml/badge.svg)](https://github.com/fuzoh/simu-tyro/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/fuzoh/simu-tyro?include_prereleases)](https://github.com/fuzoh/simu-tyro/releases)

Web simulator for zip lines (tyroliennes) with spans over 50 m: cable and rope statics, ground
clearance along the terrain profile, rider dynamics and equipment sizing. Two physical models at
parity — steel wire rope for permanent installations, textile rope for temporary ones (scouting,
rescue highlines). The UI is in French.

**Live:** <https://fuzoh.github.io/simu-tyro/>

Runs entirely in the browser: no backend, no account, terrain never leaves the page. The scenario
lives in the URL, so a link is a shareable simulation.

> [!WARNING]
> A planning aid, not a certification. Every installation must still be checked by a qualified
> person against the applicable standards (EN 15567, EN 1891) before anyone rides it.

## Quick start

Requires [Bun](https://bun.sh) — the version is pinned in `package.json` (`packageManager`).

```bash
git clone git@github.com:fuzoh/simu-tyro.git
cd simu-tyro
bun install
bun run dev          # http://localhost:3000
```

## Scripts

| Command                   | What it does                                                 |
| ------------------------- | ------------------------------------------------------------ |
| `bun run dev`             | Dev server on port 3000                                      |
| `bun run build`           | Production build into `dist/`                                |
| `bun run build:pages`     | Build for GitHub Pages (adds the `404.html` fallback)        |
| `bun run preview`         | Serve the production build                                   |
| `bun run test`            | Full Vitest suite, including the p95 performance tripwire    |
| `bun run test:ci`         | The suite without the wall-clock tripwire (what CI runs)     |
| `bun run bench`           | Solver benchmarks, human-read                                |
| `bun run typecheck`       | `tsc --noEmit`                                               |
| `bun run lint-type-aware` | Oxlint with type information                                 |
| `bun run format:check`    | Check formatting with Oxfmt                                  |

## Stack

TanStack Start in SPA mode (file-based router, static output) · React 19 · TypeScript ·
Tailwind CSS v4 · shadcn/ui on Base UI · Vitest · Oxlint / Oxfmt.

## Project layout

```
src/
├── routes/        # file-based routes: `/` (simulator) and `/docs/*` (theory pages)
├── components/    # app, chart, rail, docs — and ui/ (shadcn, generated)
└── lib/
    ├── sim/       # physics engine: catenary, solver, sweep, clearance, verdict
    ├── terrain/   # terrain profile import (CSV)
    └── …          # scenario, url, session, chart, format helpers
docs/
├── simulation-theory.md   # the contract the engine implements
├── conventions/           # how the code is written, per area
└── references/            # source research reports
GLOSSARY.md                # domain vocabulary
```

## Documentation

- [`docs/simulation-theory.md`](docs/simulation-theory.md) — the physics, its sources and their
  trust levels. Also served in the app under `/docs`.
- [`GLOSSARY.md`](GLOSSARY.md) — the domain vocabulary used in code, issues and UI.
- [`docs/conventions/`](docs/conventions/) — coding conventions per area.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Agents start from [`AGENTS.md`](AGENTS.md).

## Releases

Versions follow [Conventional Commits](https://www.conventionalcommits.org/) via
[release-please](https://github.com/googleapis/release-please). Merging the release PR tags `main`,
publishes a GitHub release with the changelog, and deploys that version to GitHub Pages.
