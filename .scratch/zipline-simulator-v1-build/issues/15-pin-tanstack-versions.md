# A0 · Pin the dependency versions, and re-probe the five router behaviours

Stage: A0
Status: open
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
