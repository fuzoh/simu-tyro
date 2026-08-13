# A0 · Pin the dependency versions, and re-probe the five router behaviours

Stage: A0
Status: done — but re-probe 4 came back **changed**; § 8 decision to re-open (voir Comments)
Blocked by: —
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 8, § 13 ·
[Amendments](../AMENDMENTS.md) **C**, **D**

## Delivers

Exact versions in `package.json`, replacing `latest` — **the actual latest, pinned**:

| Package | Version |
| --- | --- |
| `@tanstack/react-router` | **1.170.27** |
| `@tanstack/react-start` | **1.168.44** |
| `@tanstack/router-plugin` | **1.168.30** |
| `router-core` (transitive) | record what `bun install` resolves |
| `start-server-core` (transitive) | record what `bun install` resolves |

Plus the two new dependencies: **`@tanstack/react-form` 1.33.5** and **`valibot` 1.4.2**.

Plus the reason, recorded in `docs/conventions/routing.md` — already the binding doc for all of it.

## Gate

`bun install` reproduces the pinned tree, with the two transitives' resolved versions written down.
**Then the five re-probes below, all five green** — voir [amendment C](../AMENDMENTS.md#c--tanstack-versions-the-actual-latest-pinned).

## The re-probe — five measured behaviours, none observable from app code

§ 8 rests on these. They contradict the documentation, so a version change cannot be assumed
harmless — but this is a **patch bump** (1.170.18 → 1.170.27 etc.), so re-probing is cheap. Use a
scratch dev server, as the original measurement did.

1. `{ key: undefined }` still makes the **server** 307-strip the key, even under `ssr: false`.
2. `defaultSsr` in `src/router.tsx` is still a **silent no-op**.
3. `Route.useSearch()` still returns **raw ∪ validated** at runtime while typed validated-only.
4. A thrown `validateSearch` still yields **200** under `ssr: false` (500 with SSR on).
5. `search.strict` still leaves unknown keys in the URL, so the load-time rewrite is still the only
   thing that cleans the address bar.

**If any of the five has changed, stop.** That is a § 8 decision to re-open — it belongs on a map, not
in this ticket. One of them silently destroys ticket 26's ignored-keys banner, in a way no test can
see, because the evidence is destroyed on the server before app code runs.

## Notes

- **This is first in the app phase, ahead of A1.**
- **The pin survives, only the version changed.** `latest` is not a neutral default here: six of § 8's
  decisions are workarounds for measured behaviour, so an upgrade that fixes one silently converts a
  correct workaround into dead code, and an upgrade that changes one breaks a feature invisibly.
  Pinning makes upgrading a deliberate act **with a re-measurement attached** — which is what this
  ticket's re-probe section is for, and it is the template for the next upgrade too.
- `package.json` also floats `@tanstack/react-devtools`, `react-router-devtools`,
  `react-router-ssr-query` and `devtools-vite` at `latest`. Only the three above carry measured
  behaviour; pin the rest too, but say which is which so the next reader knows where the risk is.
- **`jsdom` and both `@testing-library` packages come out** in ticket 01 — do not re-add them here.

## Comments

**2026-08-13 — pinned, re-probed, and one behaviour has moved.**

Shipped:

- `package.json` — every `latest` replaced by an exact version, none of them a range:
  `@tanstack/react-router` 1.170.27 · `@tanstack/react-start` 1.168.44 ·
  `@tanstack/router-plugin` 1.168.30 (the three that carry measured behaviour), plus
  `@tanstack/react-devtools` 0.10.10 · `@tanstack/react-router-devtools` 1.167.1 ·
  `@tanstack/react-router-ssr-query` 1.167.1 · `@tanstack/devtools-vite` 0.8.3 ·
  `@tanstack/eslint-config` 0.4.0 (dev/lint only, no measured surface), plus amendment D's
  `@tanstack/react-form` 1.33.5 and `valibot` 1.4.2. All ten were verified to be the registry's
  published `latest` on the day, so « actual latest, pinned » is literal and not approximate.
- **Transitives as resolved by `bun install`: `@tanstack/router-core` 1.171.22 and
  `@tanstack/start-server-core` 1.169.26** (the spec measured 1.171.15 / 1.169.17). Also recorded:
  `@tanstack/history` 1.162.1, `@tanstack/start-client-core` 1.170.22,
  `@tanstack/start-plugin-core` 1.171.34.
- `docs/conventions/routing.md` — a new « Versions are pinned exactly, and upgrading carries a
  re-probe » section: the reason, the which-carries-risk table, the resolved transitives, and the
  dated re-probe results.

**The re-probe was run as an A/B**, not as a single reading: the same throwaway TanStack Start app
was served twice, once against the pinned tree and once against a scratch install of the exact
tree § 8 measured (1.170.18 / 1.168.34 / 1.168.23 → router-core 1.171.15, start-server-core
1.169.17). Anything reported as changed below is a difference between those two runs and nothing
else. Probes 1, 2, 3 and 5 are **unchanged**, including the companions (omitting a key leaves it in
the URL at 200; a coerced `String(1)` 307s to `?bad=%221%22`; `search.strict` switched on 307-strips
the unknown key server-side, which is why it stays unset).

⚠ **Probe 4 changed. A thrown `validateSearch` under `ssr: false` now answers HTTP 500, where the
measured tree answered 200.** Reproduced in dev *and* on a production build, on both trees. The
body is unchanged — Skeleton frame, match dehydrated errored with `ssr:!1`, refusal page renders
client-side — only the status line moved. Mechanically: `router-core`'s server load pipeline was
rewritten (`load-matches.js` → `load-server.js`) and `applyFailure` now returns `status: 500` for
any errored match without consulting `match.ssr`.

**Per the ticket, the version was not nudged.** This is a § 8 decision to re-open on a map: § 8
elected `ssr: false` partly because the refusal arrived at 200, § 7's refusal copy (« nothing failed
to load and the status line agrees ») rests on it, and § 13's crawler thin spot is written around
200. Tickets 22 (A7) and 26 (A11) are the ones that would encode it. Until the decision is retaken,
`docs/conventions/routing.md` records the measurement and says plainly that nothing may assume 200
for a refused link.

Judgement calls, both where the spec is silent:

- **No Vitest case was added.** The ticket's gate is `bun install` plus five browser/server
  measurements, and `testing.md` forbids both a `tests/` directory and a test file with no source
  file beside it — a `package.json` pin-guard would be exactly that orphan. The pin is guarded by
  the exact versions themselves plus the recorded transitives; the re-probe is the guard for the
  behaviour, and it is a documented procedure, not a unit test.
- **`@tanstack/react-router-ssr-query` was pinned rather than removed.** It is scaffold residue with
  no v1 consumer, but removing a dependency is not this ticket's deliverable; it is flagged as
  « unused by v1 » in the routing.md table instead.
