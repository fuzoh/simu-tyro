# Routing & app shell

TanStack Start with the file-based router (`@tanstack/router-plugin` in `vite.config.ts`).
**SSR is on for the document and off for the app**: `__root.tsx`'s `shellComponent` is
server-rendered, and `src/routes/index.tsx` — the only real route — sets `ssr: false`.

- Routes are files under `src/routes/`. Each exports a route created with `createFileRoute`.
  There is exactly one route in v1; a second route would re-declare the same ~30-key
  `validateSearch`.
- `src/routes/__root.tsx` is the **document**, not chrome: `<html lang="fr">`, head, stylesheet,
  `HeadContent`/`Scripts`, `notFoundComponent`. No header, no app bar, no root `component`, no
  print stylesheet. `src/router.tsx` builds the router.
- `src/routeTree.gen.ts` is **generated** — never edit it. It regenerates when the dev server runs
  or the Vite plugin builds. If it looks stale, run `bun run dev`.
- `rsc: false` — no React Server Components. Everything is a normal React 19 component.
- **`ssr: false` goes on the route, never on the router.** `defaultSsr` in `createRouter` is
  silently ignored in this scaffold: `createStartHandler` calls
  `router.update({ defaultSsr: <undefined> })` from a `src/start.ts` that does not exist, so the
  option is spread away with no error and SSR stays on. `spa: {}` stays off.
- Under `ssr: false` the server renders the route's `pendingComponent` — the **Skeleton** — and
  returns **200**; `beforeLoad` and `loader` are skipped on the server. `validateSearch` still
  runs there, **three times per request**, so it must stay pure, cheap and side-effect-free.
- A `validateSearch` must **omit** keys it rejects, and must never return `{ key: undefined }` or
  a coerced value: either makes the server emit a **307** to the canonical URL before any client
  code runs, which destroys the evidence the ignored-keys banner needs.
- `Route.useSearch()` returns raw ∪ validated at runtime while typed as validated-only. Never
  treat it as the schema; the app reads one derived Scenario object built from the validated keys.
- No service worker and no PWA manifest. "Fully offline" means no runtime network dependency
  after load, not an installable app.

`bun run dev` serves on port 3000.

## The shell, as built — where each rule lives

| File | Carries |
| --- | --- |
| `src/routes/__root.tsx` | the document only — `lang="fr"`, the French `<title>`, the viewport meta with `interactive-widget=resizes-content`, the French `notFoundComponent`, the unguarded devtools block. **No root `component`, no app bar.** |
| `src/routes/index.tsx` | the one route: `ssr: false`, `validateSearch`, `search.middlewares`, `pendingComponent`, and an `errorComponent` for **genuine load failures only** |
| `src/components/app/skeleton.tsx` | the `pendingComponent` — the only thing the server renders below the document |
| `src/components/app/shell.tsx` | the one layout the Skeleton and the live app both render, with § 5's band heights as CSS custom properties over container-query units |
| `src/components/app/refusal.tsx` | the refusal surface, an **ordinary component** driven by `search.refused` |
| `src/components/app/store.tsx` | the React-context store, its lazy Session read and the rewrite mount effect |
| `src/lib/app/state.ts` | the mount order as a **pure function** of the raw query string and the Session |

Three rules that only become visible once the shell exists:

- **The mount order has no race**, and it is decided in one place: the lazy initialiser reads the
  Session, any recognised scenario key then wins **wholesale**, and the mount effect diffs the raw
  keys to produce both the strip's evidence and the rewrite.
- **The rewrite fires on content, never on order.** Same keys in another order is left exactly as
  typed, and a bare `/` is never rewritten — bare `/` *means* « restore the Session ». **`?junk=zz`
  is not bare**: no recognised key survived, so the Session is restored like a bare `/`, but
  something *was* dropped — the strip still names the key and the rewrite still fires, onto the
  salvaged bag (at most `v`) and never onto the completed defaults, which would turn a session
  restore into a shared scenario.
- **App code reads `Route.useSearch()` for exactly one thing**, `refused`, which the validator
  synthesises. Everything else is re-derived from `window.location.search` through
  `salvageSearch`, because the raw ∪ validated merge is not the schema and the dropped-keys report
  has no other transport.

## Versions are pinned exactly, and upgrading carries a re-probe

Every routing rule above is a **measurement**, not a documented API: five of them contradict the
documentation and none is observable from app code. A floating range would let an upgrade convert
a correct workaround into dead code, or break the ignored-keys banner, **with no error and no test
failure** — the evidence is destroyed on the server before app code runs. So `package.json` pins
**exact versions, never `latest`, never a range**, and upgrading is a deliberate act **with the
re-probe below attached**.

| Package | Pinned | Carries measured behaviour |
| --- | --- | --- |
| `@tanstack/react-router` | 1.170.27 | **yes** |
| `@tanstack/react-start` | 1.168.44 | **yes** |
| `@tanstack/router-plugin` | 1.168.30 | **yes** |
| `@tanstack/react-devtools` | 0.10.10 | no — dev only |
| `@tanstack/react-router-devtools` | 1.167.1 | no — dev only |
| `@tanstack/react-router-ssr-query` | 1.167.1 | no — unused by v1 |
| `@tanstack/devtools-vite` | 0.8.3 | no — dev only |
| `@tanstack/eslint-config` | 0.4.0 | no — lint only |
| `@tanstack/react-form` | 1.33.5 | no — form state, no router surface |
| `valibot` | 1.4.2 | no — boundary validation only |

Transitives, **recorded rather than pinned** — what `bun install` resolved on 2026-08-13:
`@tanstack/router-core` **1.171.22**, `@tanstack/start-server-core` **1.169.26**
(`@tanstack/history` 1.162.1, `@tanstack/start-client-core` 1.170.22,
`@tanstack/start-plugin-core` 1.171.34). The routing rules live in `router-core` and
`start-server-core`, so a bump of either is what a re-probe is actually testing.

### The re-probe — 2026-08-13, on a scratch dev server and on a production build

Method: a throwaway TanStack Start app with one route per behaviour, run twice — once against the
tree above, once against the previously measured tree (`react-router` 1.170.18 · `react-start`
1.168.34 · `router-core` 1.171.15 · `start-server-core` 1.169.17) — so every line below is an A/B,
not a recollection.

| # | Behaviour | Result |
| --- | --- | --- |
| 1 | `{ key: undefined }` makes the **server** 307-strip the key, even under `ssr: false` | **unchanged** — `/probe-drop?L=abc&M=abc` → `307 /probe-drop?L=abc`; omitting the key instead → 200 with `M=abc` intact; returning `String(1)` for `bad=1` → `307 ?bad=%221%22` |
| 2 | `defaultSsr` in `src/router.tsx` is a **silent no-op** | **unchanged** — with `defaultSsr: false` and no route-level `ssr`, the component is still server-rendered, the match still dehydrates SSR-on, and `beforeLoad` still runs on the server |
| 3 | `Route.useSearch()` is **raw ∪ validated** at runtime while typed validated-only | **unchanged** — `?L=250&junk=zz` against a validator that returns `L` alone yields keys `L, junk`, both server-rendered and in the browser |
| 4 | A thrown `validateSearch` yields **200** under `ssr: false` (500 with SSR on) | ⚠ **CHANGED — now 500 under `ssr: false` too** (see below) |
| 5 | Unknown keys stay in the URL, so the load-time rewrite is the only cleaner | **unchanged** — with `search.strict` unset the key survives the load untouched; switching `search.strict` on 307-strips it server-side, which is why it stays unset |

**Behaviour 4 changed with the patch bump and the version was not nudged back.** Measured both in
dev and on a production build: a route with `ssr: false` whose `validateSearch` throws now answers
**HTTP 500** where the 1.170.18 tree answered **200**. The *body* is unchanged — the Skeleton frame
ships, the match dehydrates errored and `ssr:!1`, and the refusal page still renders client-side —
only the status line moved. Mechanically, `router-core`'s server load pipeline was rewritten
(`load-matches.js` → `load-server.js`) and its `applyFailure` now returns `status: 500` for **any**
errored match, without consulting `match.ssr`.

This was a **§ 8 decision to re-open, not a version to nudge**: § 8 elected `ssr: false` partly
*because* the refusal arrived at 200, and § 7's refusal copy ("nothing failed to load and the
status line agrees") rests on it.

**Re-taken on 2026-08-13 as [amendment E](../../.scratch/zipline-simulator-v1-build/AMENDMENTS.md):
the throw goes, not the status.** `validateSearch` never throws for the three refusal classes — it
returns the refusal as a `refused` marker in the validated search (`src/lib/url/schema.ts`) and the
index route renders the refusal surface as an ordinary component. Nothing fails, so no match errors
and the status stays **200**. The measurement above still stands for a *genuine* throw, so the rule
it implies is now narrower and sharper: **do not throw from a `validateSearch` for anything the app
means to render** — a throw is a 500 under this tree, whatever `ssr` says.

**Probe 6, measured 2026-08-13 while reworking ticket 20: a key `validateSearch` *synthesises* is a
307.** `router.js`'s `applySearchMiddleware` wraps each route's validator in a middleware returning
`{ ...incoming, ...validated }`; `buildLocation` stringifies **that merge**, every key of it;
`load-server.js`'s `loadServerRoute` rebuilds the canonical location on every document request with
`_includeValidateSearch: true` and redirects when the rebuilt `publicHref` differs from the incoming
one. So `/?v=3` rebuilds as `/?v=3&refused=%7B%22kind%22…` and 307s there. `search.strict` does not
gate this — it is unset (probe 5) and the middleware path runs regardless.

**The rule: a `validateSearch` may return keys it received; a key it invents lands in the address
bar.** Amendment E's `refused` marker is the app's one synthesised key, and the index route removes
it from the merge with `search.middlewares: [keepRefusalOutOfTheAddressBar]`
(`src/lib/url/schema.ts`). Installing it is not optional. It costs the refusal surface nothing:
`matchRoutes` does **not** run search middlewares, so `Route.useSearch().refused` still carries the
marker while the href stays exactly the one the sender wrote.
