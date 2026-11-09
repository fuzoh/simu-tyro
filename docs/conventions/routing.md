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
- No service worker and no PWA manifest. Since the
  [network policy](https://github.com/fuzoh/simu-tyro/issues/13) every computation and every Page
  work with no network after load; the connected functions — the profil geo.admin
  (`src/lib/terrain/geoadmin.ts`) and the Fond de carte (`src/lib/map/style.ts`, #93) — call
  swisstopo with the native `fetch`, passed in as a parameter, and degrade to an ambient message
  rather than an error. The Vue 3D (#95) is the one connected function whose requests are not the
  app's: CesiumJS fetches the relief and the draped tiles itself, so its failure — no network, no
  WebGL, a render error — is caught at the renderer, which hands back the vue de dessus with
  « Vue 3D indisponible ». A link carries the profil's points, so it opens offline; the Fond de
  carte, the Couche pentes and the 2D/3D choice are the Session's, never the link's.
  The Mesure (#98) asks the same profil geo.admin between its two points; offline it keeps the
  horizontal and direct distances, and its points and distances are the map's own state — in no
  Session and no link.
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
  Under a 44 px bar Avancé's 1152 px column (from 1728 px of viewport) needs 915 px of height
  against 907 under 36 px; at the 24 px gutter a 44 px bar pinned budget C, whose letterbox was then
  43,68 px. Since the 12 px gutter (#115) budget C's block is 870,24 px, and it pins at 900 px under
  either bar.
- **`/` is the Page Statique (#91)** — `ssr: false`, its own Skeleton, the shared schema. It
  replaced the client redirect to `/avance` that held the path until then, so a link shared before
  the Pages (`/?…`) opens its Scenario on Statique, and the navigation bar's links carry the search
  between the two Pages unchanged. Its `Link` is `exact`, or it would be active on every path.
- **Writes stay on the current Page.** The load-time rewrite, the debounced address bar and the
  Rail's resets navigate `to: "."`, so a future Page that hosts the store never jumps to Avancé.
- **The address bar's write keeps the scroll (`resetScroll: false`, #93).** The router's default
  resets the window to the top after every navigation, a `replace` of the same Page included, so
  each edit jumped the reader to the top — on the vue de dessus, between the click that places A
  and the one that places B. The load-time rewrite and the Rail's reset keep the default.
- **A link that leaves a Page flushes its pending writes first.** Each Page mounts its own store,
  which reads the URL before the Session, and the address bar trails the store by ≈400 ms — so a
  link pressed inside the debounce would carry the Scenario from before the last edit. `PageLink`
  (`src/components/app/navigation-bar.tsx`) runs the slot `usePersist` registers in `PageFrame`,
  and when that wrote the address bar, a plain click navigates with the search it wrote rather
  than the one the link was rendered with. Nothing is pending under « Saisie en cours », so the
  link then carries the last complete Scenario, as the address bar does.
- **GitHub Pages answers `/avance?…` with a 301 to `/avance/?…`**, keeping the query — measured on
  the live site for `/docs`. The router's mount-time canonicalisation then replaces `/avance/?…`
  with `/avance?…`. A bare `/avance/` compares equal after `trimPathRight` and is left alone.

Measured on the installed tree on 2026-11-08 (`react-router` 1.170.46, `router-core` 1.171.39,
`react-start` 1.169.4, `start-server-core` 1.169.45, `router-plugin` 1.168.48), with `agent-browser`
against a production build served the way GitHub Pages serves it:

| Request | Result |
| --- | --- |
| `/?<fixture>`, each of the 26 golden links | lands on `/avance?<fixture>`; same page text and field values as opening `/avance?<fixture>` directly — **superseded by #91**: `/` is Statique |
| `/?…` → « Avancé » → « Statique » (#91, dev, 2026-11-08) | Statique on the link's Scenario; each Page switch keeps the search byte for byte, and Statique's link is the only one active on `/` |
| `/dynamique?ws=50&wd=0` → « Avancé » → « Dynamique » (#92, build, 2026-11-08) | Dynamique on the link's Scenario at 1440 and 390 px (no horizontal overflow at 390); each switch keeps `ws=50`, and Dynamique's link is the only one active on `/dynamique`. A head wind of 50 km/h: « sans vent » arrive au bout, « avec le vent saisi » stops at 112,3 m, one marker on the coupe and one on the curve in the same column; hovering either frame draws the rule on both with x, altitude / vitesse, accélération. `?L=0`: « Aucun résultat », the Verdict never appears |
| `/dynamique/index.html` (build) | prerendered with its Skeleton: both rides' headings and tile labels, `aria-busy`, no value |
| `/` on a blank Scenario → the vue de dessus (#93, dev, `maplibre-gl` 6.16.0, 2026-11-08) | the carte claire over Switzerland, « © swisstopo » bottom-right, « Cliquez sur la carte pour placer A. ». Two clicks near Les Petites Roches: A, then B and « profil geo.admin · 200 points », a Verdict (« Hors limites ») once a Marge exigée is chosen. Dragging B over ten pointer moves: B's reading follows, the line follows, « Placer A / B » greyed, **no geo.admin call**; at the release, three calls (two REFRAME, one `profile.json`) and the engine's new figures. Orthophoto, carte nationale and the Couche pentes each switch under the line and both anchors; a reload keeps carte nationale + pentes (Session `map`), and the URL holds no Fond key. Offline (`set offline on`): a Fond switch leaves the line on the plain background with « fond de carte indisponible »; a drag of B snaps back with « profil geo.admin indisponible », same figures, same Verdict. An imported CSV far from the view: the map moves to its two Positions; a drag then makes « profil geo.admin » active with « CSV en mémoire : … (non utilisé) ». A Latitude B typed on Avancé moves B on Statique. 390 px: the control row and the attribution fit, no horizontal overflow; the scroll stays put across a placement |
| `/?lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783` → the rose des vents (#94, dev, 2026-11-08) | the rose centred on the line's midpoint, rings at 20 / 40 / 60 km/h, the handle at the centre, « Pas de vent. ». A pointer drag of the handle to 51 px right and 30 px up (8 moves): the map does not move (A and B keep their pixels), the fields read 40 km/h and 108° **before the release**, the reading under the map says « Vent de nord-est (60°), 40 km/h : par la droite à l'arrière, 108° par rapport à la ligne A → B. », and `ws=40&wd=108` is in the address bar after it. Typing 270 in « direction du vent » turns the handle to 222° on the screen (the trial line runs at 312°); typing 20 in the speed moves it to a third of the radius. 390 px: the rose fits the map, no horizontal overflow. `?L=150&h=-18&ws=30&wd=108` (no Positions): the line is drawn by the rose, level, A on the left, and the reading ends « (nord inconnu) ». `/dynamique`: no rose — **superseded by the geographic Vent** (2026-11-09): `wd` is the azimuth itself, and without Positions the rose has no handle |
| a line with Positions and a profil geo.admin → « 3D » (#95, dev and `BASE_PATH=/simu-tyro/` build in `vite preview`, `cesium` 1.147.0, 2026-11-08) | `/` loads **no** `vue-3d-renderer-*.js` and nothing under `cesium/`; the first press of « 3D » fetches `assets/vue-3d-renderer-*.{js,css}`, then `/simu-tyro/cesium/Workers/*` and `cesium/Assets/*` (all 200), `3d.geo.admin.ch/ch.swisstopo.terrain.3d/v1/layer.json` and its `.terrain` tiles, and the Fond draped over them: the carte claire as `ch.swisstopo.pixelkarte-grau`, the orthophoto with the Couche pentes at its 2D opacity and « © CNES, Spot Image, swisstopo, NPOC » under the view. The coupe stays. Each anchor stands on its Fil à plomb — a ground mark and a dashed vertical leaving the top of the view — from the closest zoom to the 20 km limit; two Brins porteurs are two lines. A reload keeps the Vue 3D (Session `map.view`), and the URL holds no view key. Manual geometry with Positions: the switch is greyed, « Vue 3D : il faut le profil entre A et B … » under the map; no Positions: « Vue 3D : placez A et B sur la carte. ». Offline (`set offline on`) and with `3d.geo.admin.ch` alone aborted: « Vue 3D indisponible », the 2D map back, the switch released, the coupe and figures unchanged. 390 px: the control row fits, no horizontal overflow |
| a line with Positions and a profil geo.admin, in the Vue 3D → drag B (#97, dev, `cesium` 1.147.0, 2026-11-08) | hovering B's dot gives the `grab` cursor, the terrain beside it none. B pressed and moved over ten pointer moves: B, its Fil à plomb and the Ligne A–B follow the relief, the engine's lines are hidden, B's reading under the view follows; the relief around the line is **pixel-identical** to the frame before the press (the camera is frozen), the figures and the address bar do not change, **no geo.admin call**. At the release, two REFRAME calls and one `profile.json`, then the new profil (« profil geo.admin · 200 points », a new Portée, new figures, the Verdict recomputed), `latb`/`lonb` in the address bar and the Session, `za=1.5&zb=1` kept, Latitude B and Longitude B on Avancé reading the new Position; the camera stays where it was. A press and release on B without a move: no call. A drag on bare terrain moves the camera and nothing else. With `api3.geo.admin.ch` and `geodesy.geo.admin.ch` aborted: B snaps back with « profil geo.admin indisponible », same figures. Back to 2D: both markers draggable, « Placer A / B » enabled |
| the vue de dessus → « Mesure » (#98, dev, `maplibre-gl` 6.16.0, 2026-11-08) | on the trial line (`?lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783`, no profil): « Mesure » beside « Placer A / B », and the hint « Mesure : cliquez sur le premier point. » Pressing it turns the button to « Quitter la mesure », greys « Placer A / B » and gives the markers `pointer-events: none`, so a click on A or B is a point of the ruler. Two clicks: the orange line, a point at each end and the two dotted crosses (north-south and east-west) at each, spanning the whole map; the readout over the map's bottom-left corner reads « Distance horizontale : 185,8 m », « Distance directe : 192,2 m (Δz +49,1 m) », « Distance au sol : 205,2 m » and the hint turns to « un nouveau clic recommence ». **No anchor is placed**: `lata`…`lonb` and the whole address bar are unchanged, and the Session in `localStorage` holds no Mesure. A third click (on marker A) clears and starts over with one point and its two crosses. Between A and B of the trial line, online: 435,2 m / 435,4 m (Δz −15,0 m) / one `profile.json` call after two REFRAME. « Quitter la mesure » removes the drawing and the readout and gives « Placer A / B » and the markers back. Arming « Placer A » then pressing « Mesure » disarms it, and it stays disarmed once the tool is quit. With `api3.geo.admin.ch` and `geodesy.geo.admin.ch` aborted (`network route --abort`): two points off any profil read « Distance horizontale : 185,8 m » and « Distance directe : indisponible hors réseau », with no distance au sol and no error banner; on a line placed by clicks (profil in memory, `tr` in the address bar), the two anchors as points read 454,0 m and « 454,8 m (Δz −26,5 m) » from the profil in memory, and two points off the line fall back to « indisponible hors réseau ». « 3D » (profil present): the Vue 3D shows no « Mesure » button, no crosses and no readout; back to 2D, the Mesure and its points are where they were left |
| a line with Positions and a profil geo.admin → `/terrain` (#101, dev and build in `vite preview`, 2026-11-08) | 390 × 664: the map over the coupe, then the five tiles in two columns pinned under them — « Tension de pose » (1609,8 daN, « par ligne, ancrage A »), « Flèche », « Garde au sol minimale », « Vitesse d'arrivée » « avec le vent saisi » with « estimation », the Verdict across the row — no horizontal overflow (scrollWidth 390) and every control ≥ 44 px. A click on the map, a drag of a marker, a scrub on the coupe or the strip: the address bar unchanged. No handle on the rose and « Pas de vent. » on a calm line; no zoom buttons, no Fond or pentes control, no « Placer A / B », no field. « Mesure » measures as on Statique (375,5 m / 378,8 m (Δz −50,1 m) / 405,6 m), the address bar unchanged. « 3D »: the Vue 3D in the map's place and the coupe hidden; a drag on A moves the camera only, no REFRAME or `profile.json` call. `tp=300` on Maestro S with `ws=50&wd=0`: the tension tile spans the row in the warning colour with the Limite's warning, the arrival reads « pas d'arrivée » (`NO_ARRIVAL`) with « point d'arrêt à x 101,1 m · estimation », the Verdict « Hors limites » in red |
| `/dynamique?v=1&lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783&ws=30&wd=264` → the geographic Vent (dev, 2026-11-09) | both wind fields enabled, 30 and 264, the note « D'où vient le vent, en degrés depuis le nord … » under the direction. The shipped 150 m line: « sans vent » arrive au bout at 47 km/h in 12,0 s, « avec le vent saisi » arrive au bout at 33 km/h in 13,4 s; `ws=60`: « avec le vent saisi » stops at x 125,4 m. `/` on the same link: « Vent d'ouest (264°), 30 km/h : par la gauche à l'avant, 312° par rapport à la ligne A → B. »; « Placer B » and a click on the map move B (profil geo.admin loaded): « Vent d'ouest (264°), 30 km/h : par la gauche à l'arrière, 257° par rapport à la ligne A → B. », `ws=30&wd=264` unchanged in the address bar, Avancé reads the same line. `/dynamique?v=1&ws=30&wd=264` (no Positions): both fields disabled, 30 and 264, each with « ℹ Placez A et B sur la carte pour saisir le vent. »; both rides arrive au bout at 47 km/h in 12,0 s, « Avec le vent saisi » carries « Vent saisi non appliqué : sans A et B sur la carte, la ligne n'a pas d'orientation. », and the completed address bar keeps `ws=30&wd=264`. `/` without Positions: no handle on the rose, the reading « Vent d'ouest (264°), 30 km/h. Vent saisi non appliqué : … »; `/terrain`: the arrival tile 47 km/h with the same notice under it |
| `/` → Statique's first row (#109, dev and build in `vite preview`, 2026-11-09) | At 1024, 1440 and 2560 × 900: « Vue de dessus » top left, its map 287 / 703 / 989 px wide (448 px tall from 1440), and « Résultats » on its right behind a hairline — tracks `180px 180px`, the four value tiles in a 2 × 2 and the Verdict 368 px wide across the third row, the block's right edge 12 px in from the column's, as the coupe's frame; « Coupe » under both, across the column (704 / 1120 / 1406 px), with no border under it. 390, 768 and 1023 px: every box of `/` identical to the same Page before the change, in dev (Résultats, coupe, vue de dessus, stacked); `/terrain` identical at all six widths. With every script aborted (`network route "**/*.js" --abort`), the prerendered Skeleton of `/` (`aria-busy`, no control) puts every region, tile and the map's frame on the live Page's boxes at 390, 1023, 1024, 1440 and 2560. At 1440 on the trial line: a drag of the rose's handle writes `ws=18&wd=14`; « Mesure » and two clicks read « Distance horizontale : 438,9 m »; « Placer B » and a click move B and load the profil geo.admin; « 3D » shows the Vue 3D in the map's place, beside the tiles. From 2560 to 1100 the coupe and the map follow the column down (780 and 363 px) |
| `/terrain/index.html` (build) | prerendered with its Skeleton: the vue de dessus's frame over the coupe's empty bands, the five tiles' labels and scopes, `aria-busy`, no value, no link |
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
  app layout `_app.tsx`, whose `pendingComponent` is Statique's frame, the Page at `/` (#91): the
  navigation bar as text over Statique's Skeleton, the same frame `/` shows in dev, not an empty
  `<body>`. `maskPath` stays at its default `/`. **The Page at `/` and this `pendingComponent` share
  one Skeleton.**
- **Every other app Page is also prerendered on its own**, from `APP_PAGES` in
  `src/lib/app/pages.ts` (`pages` in `vite.config.ts`, `outputPath: "/<page>/index.html"`, `/`
  skipped because the shell is its file). That is not shell mode: the
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
- `dist/client/cesium/` (7,5 MB) is CesiumJS's workers and assets, which it loads by URL at run
  time from `BASE_URL` + `cesium/` — copied there by `vite-plugin-static-copy`, not bundled. Only
  the Vue 3D reads them, on the first press of « 3D ».
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
| `src/routes/_app.index.tsx` | `/`, the Page Statique: `ssr: false`, its Skeleton as `pendingComponent`, the shared `errorComponent` |
| `src/routes/_app.dynamique.tsx` | `/dynamique`, the Page Dynamique (#92): `ssr: false`, its Skeleton as `pendingComponent`, the shared `errorComponent` |
| `src/routes/_app.terrain.tsx` | `/terrain`, the Page Terrain (#101): `ssr: false`, its Skeleton as `pendingComponent`, the shared `errorComponent` |
| `src/components/terrain-page/` | Terrain's frame and Skeleton (`frame.tsx`), its five tiles (`tiles.tsx`) and the live Page (`terrain.tsx`) — over the same store as the other Pages through `useReadingPage`, which hands out the Scenario and no setter; the vue de dessus and the coupe are mounted read-only (`TopMap`'s `readOnly`, `ChartBlock`'s `readOnly`). `-page` because `terrain/` is already the Terrain, the ground under the line |
| `src/lib/terrain-page/` | the five tiles' view model (`view.ts`), read off Statique's and Dynamique's outputs so each tile says what those Pages say, and its copy (`copy.ts`) |
| `src/components/dynamique/` | Dynamique's frame and Skeleton, fields and output tiles (its two SVG frames are `src/components/chart/dynamique.tsx`) — over the same store, form and writer as Avancé (`usePage`), in Statique's two-column layout |
| `src/components/statique/` | Statique's frame and Skeleton (`frame.tsx`), its fields, outputs and vue de dessus's frame — over the same store, form and writer as Avancé (`usePage`) |
| `src/components/map/top-map.tsx` | the vue de dessus as a MapLibre map (#93): the Fond de carte and Couche pentes controls, the anchors as markers, « Placer A / B », the attribution; the plain drawing where WebGL is missing. The « 3D » switch (#95), off with its reason without Positions or a profil, puts the Vue 3D in the map's place and falls back to 2D when it fails. The « Mesure » button (#98) turns a click on the map into a point of the ruler instead of an anchor. With `readOnly` (#101, Terrain): no anchor placed or dragged, no Fond, pentes or zoom control, no rose handle; the « Mesure » stays, and a « 2D » / « 3D » switch shows the map over the coupe it is handed, or the Vue 3D alone |
| `src/components/map/use-measure.ts` | the Mesure's state (#98), the map's own: whether it is on, its points and the profil asked for between them — never in the store, so in no Scenario, Session or link |
| `src/components/map/load-vue-3d.ts` | the Vue 3D's one door, a dynamic `import()`: CesiumJS lands in its own `vue-3d-renderer-*` chunk, fetched on the first press of « 3D ». `load-vue-3d.test.ts` builds the client and holds the line: no CesiumJS in what `/` downloads, and that set within 10 % of its size before #95 |
| `src/components/map/vue-3d-renderer.ts` | the CesiumJS view (#95), imperative behind `openVue3d` → `{ show, destroy }`: the relief, the draped Fond and Couche pentes, the Fils à plomb, the engine's lines; an anchor dragged on the relief (#97) — taken only under the pointer, the camera frozen until the release, the relief sampled at its finest before the gesture ends — reported to the same gesture machine as the markers; `CESIUM_BASE_URL` is `BASE_URL` + `cesium/`, where `vite-plugin-static-copy` puts its workers and assets. Imported for its types only, anywhere else |
| `src/components/map/wind-rose.tsx` | the rose des vents (#94): a sibling of the map, not inside it, so a gesture on its handle never reaches MapLibre's pan; it writes the Scenario's Vent as the handle moves. Without `onWind` it draws no handle (#101, Terrain) |
| `src/lib/chart/hover.ts`, `hover-gesture.ts` | the hover (#99), shared by the coupe, the Dynamique's two charts and the vue de dessus: what is read at a distance from A (`zGroundAt` for the ground, nothing outside the portée) and when a pointer is reading — a mouse always, a finger once held 400 ms. `src/components/chart/use-hover.ts` wires it, `hover.tsx` draws it |
| `src/lib/map/` | the map's pure halves: the style builder and « fond de carte indisponible » (`style.ts`), the click-and-drag state machine that asks for a profil only at a release, for the markers and the Vue 3D's anchors alike (`gesture.ts`), the rose's azimuth ↔ drawing conversions, north-up on the map and turned by the line's bearing on a level drawing (`wind-rose.ts`), the Vue 3D's earth coordinates, draped layers, why its switch is off and what follows a dragged anchor (`vue-3d.ts`), the Mesure's clicks, distances and offline fallback (`measure.ts`), where the pointer stands on the line (`hover.ts`), the Session's display choice (`display.ts`), its copy (`copy.ts`). The Vue 3D and the hover put the profil on the earth only where `profilRunsBetween` (`src/lib/terrain/trace.ts`) says it runs between the two Positions; a link says it does not with `ph` |
| `src/components/app/load-failure.tsx` | every app Page's `errorComponent`, for **genuine load failures only** |
| `src/lib/app/pages.ts` | `APP_PAGES`, the table the navigation bar and the prerender list both read |
| `src/components/app/navigation-bar.tsx` | `PageFrame` — the bar above, the Page's shell below, one viewport tall |
| `src/components/app/skeleton.tsx` | Avancé's `pendingComponent` — what the server renders under the navigation bar on `/avance` |
| `src/components/app/shell.tsx` | the one layout the Skeleton and the live app both render, with § 5's band heights as CSS custom properties over container-query units |
| `src/components/app/refusal.tsx` | the refusal surface, an **ordinary component** driven by `search.refused` |
| `src/components/app/store.tsx` | the React-context store, its lazy Session read and the rewrite mount effect |
| `src/lib/app/state.ts` | the mount order as a **pure function** of the raw query string and the Session |

Three rules that only become visible once the shell exists:

- **The mount order has no race**, and it is decided in one place: the lazy initialiser reads the
  Session, any recognised scenario key then wins **wholesale**, and the mount effect diffs the raw
  keys to produce both the strip's evidence and the rewrite.
- **The rewrite fires on content, never on order.** Same keys in another order is left exactly as
  typed, and a bare Page (`/`, `/avance`) is never rewritten — bare *means*
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
| `maplibre-gl` | 6.16.0 | no — the vue de dessus (#93); the style it is handed is built and tested in `src/lib/map/style.ts` |
| `cesium` | 1.147.0 | no — the Vue 3D (#95); what it draws is built and tested in `src/lib/map/vue-3d.ts`. Resolved on 2026-11-08: `@cesium/engine` 26.5.0, `@cesium/widgets` 16.3.1, `@cesium/core` 0.1.1 |
| `vite-plugin-static-copy` | 4.1.1 | no — build only: copies CesiumJS's `Workers`, `ThirdParty`, `Assets` and `Widgets` to `<base>cesium/` |

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
