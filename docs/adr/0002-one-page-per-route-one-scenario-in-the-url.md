# ADR-0002: Une Page par route, un Scénario commun dans l'URL

**Status:** accepted (2026-11-08, #81 — from the routing decision of
[Inventaire des Pages](https://github.com/fuzoh/simu-tyro/issues/2#issuecomment-6719261162) and
[Politique réseau](https://github.com/fuzoh/simu-tyro/issues/13))

## Context

v1 made the simulator exactly one route, `/`. The reason was the search schema: the router
validates search params per route, so a second app route would re-declare the ~30-key
`validateSearch`, and a link that types cleanly on one route and refuses on the other is the
failure the typing boundary exists to prevent.

The field trial of 2026-11-01 split the app into **Pages**, each with its own layout and
information set — Terrain, Statique, Dynamique, Avancé — that must all show the same line. The
network policy keeps the app a static SPA on GitHub Pages. That host has no rewrite rules: a path
without its own file is served `404.html` with a 404 status, and `404.html` carries the SPA shell's
Skeleton, not the Page's.

## Decision

- **One route per Page, one schema for all of them.** Every app Page is a child of one pathless
  layout route, `src/routes/_app.tsx`. It declares `validateSearch` and
  `keepRefusalOutOfTheAddressBar` once. No Page declares either. Each Page sets `ssr: false` and its
  own `pendingComponent`, its Skeleton.
- **One Scenario, carried by the URL.** Every Page reads the same keys, so changing Page keeps the
  search string as it is. Every write goes through the router onto the current Page
  (`navigate({ to: "." })`), and « Copier le lien » builds `origin + base path + Page path +
  canonical search`.
- **A navigation bar**, rendered by the layout route and never by `__root.tsx`, which stays the
  document. It is plain text until hydration and links afterwards, and each link carries the
  current location's raw search. It is 36 px tall and is paid out of every Page's height.
- **`/` redirects to `/avance` on the client**, keeping the search as it came, until the Page
  Statique takes `/`. There is no server redirect: a static host could not reproduce one.
- **Every app Page is prerendered** at `/<page>/index.html` with its own Skeleton. The list comes
  from one table, `APP_PAGES` in `src/lib/app/pages.ts`, which the navigation bar and
  `vite.config.ts` both read.

## Consequences

- `docs/conventions/routing.md` loses « the simulator is exactly one route ». The measurements
  behind it stand, and the pinned versions and their re-probe still apply.
- Links shared before the Pages (`/?…`) still open the same Scenario, now on `/avance`, and the
  golden canonical links still decode identically. `canonicalLink` takes the Page path, and both
  link writers measure the link budget with it.
- A refused link reaches every Page at 200 with its URL intact, because the middleware sits on the
  branch they all share. The navigation bar uses the raw search rather than the validated bag,
  because `/docs` is not on that branch and the validated bag would carry the `refused` marker
  there.
- The bar costs 36 px at every width. Budget C (1440 × 900) keeps its whole Chart Block with
  7,68 px to spare. A 44 px bar would have pinned it. 1600 × 900 now opens pinned, because its
  879,68 px block needs more than the 864 px left. Budget A was already pinned before the bar.
- The SPA shell (`index.html`, copied to `404.html`) server-renders only the root, so it shows the
  layout route's `pendingComponent`, which today is Avancé's frame. When a Page takes `/`, that
  `pendingComponent` must become the new Page's Skeleton.
- Adding a Page takes a route file under `_app.` and an entry in `APP_PAGES`. Prerendering and the
  navigation bar follow from the entry. `src/lib/app/pages.test.ts` fails if a route under the
  layout is missing from the table, and fails if any route declares the schema a second time.
