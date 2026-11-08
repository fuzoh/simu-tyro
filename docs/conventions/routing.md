# Routing & app shell

TanStack Start with the file-based router (`@tanstack/router-plugin` in `vite.config.ts`).
**SSR is on for the document and off for the app**: `__root.tsx`'s `shellComponent` and the app
layout's navigation bar are server-rendered, and every app Page sets `ssr: false`. In production
that render happens **once at build time** and ships as a static file (*Static hosting* below);
under `bun run dev` it happens per request. Same output either way — which is the point.

- Routes are files under `src/routes/`. Each exports a route created with `createFileRoute`.
  **One route per app Page, one Scenario in the URL** — [ADR-0002](../adr/0002-one-page-per-route-one-scenario-in-the-url.md)
  and *The app Pages* below. The `/docs` routes are not app Pages: they declare no
  `validateSearch`, read no Session and write no URL state.
- `src/routes/__root.tsx` is the **document**, not chrome: `<html lang="fr">`, head, stylesheet,
  `HeadContent`/`Scripts`, `notFoundComponent`. No header, no navigation bar, no root `component`,
  no print stylesheet — the navigation bar is the app layout's, so `/docs` and the not-found page
  never carry it. `src/router.tsx` builds the router.
- `src/routeTree.gen.ts` is **generated** — never edit it. It regenerates when the dev server runs
  or the Vite plugin builds. If it looks stale, run `bun run dev`.
- `rsc: false` — no React Server Components. Everything is a normal React 19 component.
- **`ssr: false` goes on the route, never on the router.** `defaultSsr` in `createRouter` is
  silently ignored in this scaffold: `createStartHandler` calls
  `router.update({ defaultSsr: <undefined> })` from a `src/start.ts` that does not exist, so the
  option is spread away with no error and SSR stays on. **`spa: { enabled: true }` is now on** —
  see *Static hosting* below — and it changes none of the above: it adds a build step, not a
  routing rule.
- Under `ssr: false` the server — the dev server, or the build's prerender pass — renders the
  route's `pendingComponent`, the **Skeleton**, and returns **200**; `beforeLoad` and `loader` are
  skipped on the server. `validateSearch` still runs there, **three times per request**, so it must
  stay pure, cheap and side-effect-free.
- A `validateSearch` must **omit** keys it rejects, and must never return `{ key: undefined }` or
  a coerced value: either makes the server emit a **307** to the canonical URL before any client
  code runs, which destroys the evidence the ignored-keys banner needs.
- `Route.useSearch()` returns raw ∪ validated at runtime while typed as validated-only. Never
  treat it as the schema; the app reads one derived Scenario object built from the validated keys.
- No service worker and no PWA manifest. "Fully offline" means no runtime network dependency
  after load, not an installable app.
- **The router's `basepath` is read, never written.** `src/router.tsx` sets
  `basepath: import.meta.env.BASE_URL`, which Vite fills from `base` in `vite.config.ts` — `/` in
  dev, `/simu-tyro/` on the GitHub Pages project site. Route code stays written against `/`; the
  router strips the prefix before matching and re-adds it when it builds an href. Hardcoding the
  subpath in either place is how the app 404s on a custom domain, silently.

`bun run dev` serves on port 3000.

## The documentation pages — `/docs`

Added 2026-09-23. `src/routes/docs.tsx` (layout), `docs.index.tsx` and `docs.$slug.tsx` render the
repository's own markdown — `docs/simulation-theory.md` and four reports under `docs/references/` —
through `react-markdown` (+ `remark-gfm`, `remark-math`, `rehype-katex`). The registry is
`src/lib/docs/pages.ts`; the bytes are `src/lib/docs/sources.ts`, raw `?raw` imports.

- **They are SSR and prerendered, unlike the app Pages.** `vite.config.ts` lists the six paths under
  `pages` with `prerender.enabled`, so the build emits `dist/client/docs/<slug>/index.html` as full
  HTML and a shared `/docs/modele#s-10-4` lands with a **200**. `autoStaticPathsDiscovery` is
  **off** so `/` stays the SPA shell. Under `bun run dev`, SPA mode serves the shell for every path
  and the page renders client-side — same output, different status line.
- **Heading ids come from the section number, not the title**: `### 10.4 Use-class gate` renders as
  `id="s-10-4"` (`src/components/docs/markdown.tsx`, `@/lib/docs/refs.ts`). That number is the
  contract every `§` in `src/lib/rail/help.ts` and `provenance.ts` links to, through `HelpText`
  (`src/components/docs/help-text.tsx`). `src/lib/docs/refs.test.ts` fails on a `§` that names no
  heading of the theory file — so a renumbering of `docs/simulation-theory.md` is a test failure,
  not a dead link.
- **The markdown is read in the route's `component`, never in its `loader`.** The router plugin
  code-splits the component and leaves the loader in the critical chunk; a `docSource` call in the
  loader ships ~150 kB of prose with the simulator. Measured: `index-*.js` 517 kB → 668 kB.
- Add a page by adding an entry to `DOC_PAGES`, its raw import to `sources.ts`, and its path to
  `pages` in `vite.config.ts`. Nothing else knows the list.

## The app Pages — one route per Page, one Scenario in the URL

Added 2026-11-08 with [ADR-0002](../adr/0002-one-page-per-route-one-scenario-in-the-url.md), which
retires v1's « the simulator is exactly one route ». The reason that rule existed — a second app
route re-declaring the ~30-key `validateSearch` — is kept by putting the declaration on a route
every Page shares rather than by having one Page.

- **The schema is declared once, on the pathless layout `src/routes/_app.tsx`.** `validateSearch`
  and `keepRefusalOutOfTheAddressBar` live there and nowhere else. A Page under it reads
  `Route.useSearch().refused` from the merge, because `matchRoutes` validates down the branch.
  `src/lib/app/pages.test.ts` holds the shape: one route in the tree declares the schema, every
  route under it is in `APP_PAGES` (or is `/`), and each Page refuses two Tightness Drivers with
  its URL written back unchanged.
- **Each app Page sets `ssr: false` and its own `pendingComponent`.** The layout keeps SSR on, so
  in dev and in a Page's prerender the server renders the bar and then the Page's Skeleton under
  it. `ssr: false` on the layout would have rendered *its* `pendingComponent` for every Page.
- **The navigation bar is the layout's, and it is text until hydration.** `useHydrated()` is false
  on the server and on the first client render, so the prerendered bar names the Pages without
  linking them. A link there would be present and wrong: the HTML was built with no search, and
  pressing it before hydration would drop a shared Scenario for the Session. After hydration each
  `<Link>` gets `search={location.search}`, the **raw** parse. With `search: true` the router hands
  over the validated bag, `refused` included, and `/docs` is off the branch whose middleware strips
  it. Measured: `buildLocation({ to: "/docs", search: true })` from a refused `/avance` link emits
  `refused=…`.
- **The bar is `NAV_BAR` = 36 px, paid out of every Page's height.** `PageFrame` is `h-dvh`, and
  the shell under it is `h-full`. The collapse rule reads it as `ViewportFit.navigationHeight` on
  both arms: unlike § 8's strip it is never dismissed, so `MIN_RAIL` is owed under it below B2.
  At 44 px it would pin budget C, whose letterbox is 43,68 px.
- **`/` redirects to `/avance` in `beforeLoad`, with `location.search` and `replace: true`.** Under
  `ssr: false` the server skips `beforeLoad`, so dev answers `/?…` with a 200 and a Skeleton and
  the client redirects. The raw search keeps key order and unknown keys, so the strip still names
  them on `/avance`. The router re-stringifies it, which is byte-identical for every link the app
  or a fixture writes.
- **Writes stay on the current Page.** The load-time rewrite, the debounced address bar and the
  Rail's resets navigate `to: "."`, so a future Page that hosts the store never jumps to Avancé.
- **GitHub Pages answers `/avance?…` with a 301 to `/avance/?…`**, keeping the query — measured on
  the live site for `/docs`. The router's mount-time canonicalisation then replaces `/avance/?…`
  with `/avance?…`. A bare `/avance/` compares equal after `trimPathRight` and is left alone.

Measured on the installed tree on 2026-11-08 (`react-router` 1.170.46, `router-core` 1.171.39,
`react-start` 1.169.4, `start-server-core` 1.169.45, `router-plugin` 1.168.48), with `agent-browser`
against a production build served the way GitHub Pages serves it:

| Request | Result |
| --- | --- |
| `/?<fixture>`, each of the 26 golden links | lands on `/avance?<fixture>`; same page text and field values as opening `/avance?<fixture>` directly |
| `/avance?fl=6&lo=151.64` (static host) | 301 → `/avance/?…` → **200**, refusal surface, URL intact |
| `/avance?fl=6&lo=151.64`, `/?fl=6&lo=151.64`, `/avance?v=3` (dev) | **200**, no 307 |
| `/avance?L=250&junk=zz` | strip names « junk », then the rewrite stays on `/avance` |
| bare `/avance`, bare `/` | Session restored, URL stays bare |
| « Copier le lien » on `/avance` | `<origin>/simu-tyro/avance?v=1&…`, which reopens the same Scenario |
| `/nope` | **404**, `notFoundComponent`, no navigation bar |

## Static hosting

The app ships as static files — the v1 spec recorded `spa: {}` as the migration path and said it
must not be enabled speculatively; a GitHub Pages deploy is the ask that spends it.

- `vite.config.ts` sets `spa: { enabled: true, prerender: { outputPath: "/index" } }`. The build
  gains a prerender pass that server-renders **the root alone** — shell mode gives every other
  match `ssr: false` — so the root's first child paints its `pendingComponent`. That child is the
  app layout `_app.tsx`, whose `pendingComponent` is Avancé's frame: the navigation bar as text
  over Avancé's Skeleton, the same frame `/` shows in dev, not an empty `<body>`. `maskPath` stays
  at its default `/`. **When a Page takes `/`, that `pendingComponent` becomes its Skeleton.**
- **Every app Page is also prerendered on its own**, from `APP_PAGES` in `src/lib/app/pages.ts`
  (`pages` in `vite.config.ts`, `outputPath: "/<page>/index.html"`). That is not shell mode: the
  layout renders its bar and the Page its own Skeleton, so a direct `/avance?…` lands with a
  **200** on Avancé's frame rather than with a 404 on `404.html`.
- `outputPath: "/index"` and not the default `/_shell`: a static host serves `index.html` at a
  directory URL, and GitHub Pages runs Jekyll, which drops `_`-prefixed paths outright.
  `public/.nojekyll` covers `assets/` — **do not delete it**, the whole site goes unstyled.
- `bun run build:pages` is `vite build` plus one copy: `index.html` → `404.html`. Pages has no
  rewrite rules, and `404.html` is the only fallback it offers. This keeps the root route's policy
  intact rather than defeating it — an unknown path still returns a genuine **404** status, and the
  router renders `notFoundComponent` into it. No redirect to `/`.
- `BASE_PATH` is a build-time env var, not a constant: unset (`/`) in dev and on a custom domain,
  `/simu-tyro/` on the project site. `.github/workflows/deploy.yml` reads it off
  `actions/configure-pages`, so attaching a domain needs no code change.
- **Every URL the app writes goes through the router** — `navigate({ to: "." })` in `store.tsx`,
  `use-persist.ts` and `inputs.tsx`, onto the current Page; the navigation bar's `<Link>`s — so
  `basepath` is applied for free. « Copier le lien » is the one exception, because `copyLink`
  builds an *absolute* href by hand against § 7's whole-URL budget: its `origin` argument comes
  from `siteOrigin()` in `src/lib/app/site.ts`, which is origin + `BASE_URL`, and its `page` is the
  Page's router path (`Route.fullPath`). A new absolute-URL writer must use both, or it ships links
  that 404 or open the wrong Page.
- Only `dist/client/` is published. `dist/server/` is still emitted by Start — SPA mode does not
  suppress it — and is deliberately not deployed.
- The site is published **per release**, not per push: merging the release-please PR tags `main`,
  and `release-please.yml` calls `deploy.yml`. What is live is always a tagged version.

## The shell, as built — where each rule lives

| File | Carries |
| --- | --- |
| `src/routes/__root.tsx` | the document only — `lang="fr"`, the French `<title>`, the viewport meta with `interactive-widget=resizes-content`, the French `notFoundComponent`, the unguarded devtools block. **No root `component`, no navigation bar.** |
| `src/routes/_app.tsx` | the app Pages' pathless layout, server-rendered: `validateSearch` and `search.middlewares`, **declared once**; the navigation bar; the SPA shell's `pendingComponent` |
| `src/routes/_app.avance.tsx` | the Page Avancé: `ssr: false`, `pendingComponent`, and an `errorComponent` for **genuine load failures only** |
| `src/routes/_app.index.tsx` | `/`: `ssr: false` and a client-side `beforeLoad` redirect to `/avance` with the search as it came |
| `src/lib/app/pages.ts` | `APP_PAGES`, the table the navigation bar and the prerender list both read |
| `src/components/app/navigation-bar.tsx` | `PageFrame` — the bar above, the Page's shell below, one viewport tall |
| `src/components/app/skeleton.tsx` | Avancé's `pendingComponent` — what the server renders under the navigation bar |
| `src/components/app/shell.tsx` | the one layout the Skeleton and the live app both render, with § 5's band heights as CSS custom properties over container-query units |
| `src/components/app/refusal.tsx` | the refusal surface, an **ordinary component** driven by `search.refused` |
| `src/components/app/store.tsx` | the React-context store, its lazy Session read and the rewrite mount effect |
| `src/lib/app/state.ts` | the mount order as a **pure function** of the raw query string and the Session |

Three rules that only become visible once the shell exists:

- **The mount order has no race**, and it is decided in one place: the lazy initialiser reads the
  Session, any recognised scenario key then wins **wholesale**, and the mount effect diffs the raw
  keys to produce both the strip's evidence and the rewrite.
- **The rewrite fires on content, never on order.** Same keys in another order is left exactly as
  typed, and a bare Page (`/avance`, or `/` before its redirect) is never rewritten — bare *means*
  « restore the Session ». **`?junk=zz`
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
bar.** Amendment E's `refused` marker is the app's one synthesised key, and the app layout removes
it from the merge with `search.middlewares: [keepRefusalOutOfTheAddressBar]`
(`src/lib/url/schema.ts`), on the branch every app Page shares. Installing it is not optional. It costs the refusal surface nothing:
`matchRoutes` does **not** run search middlewares, so `Route.useSearch().refused` still carries the
marker while the href stays exactly the one the sender wrote.
