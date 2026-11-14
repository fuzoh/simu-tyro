# First load — measured, then optimised (#128)

**Date:** 13 November 2026. **Baseline:** `a8c6a12`. **Harness:** [`scripts/first-load.ts`](../../scripts/first-load.ts) — the protocol below is its docblock, and re-running it is the only way to compare a later build with these numbers.

Three changes landed, each measured on its own against the one before it: no font inlined into the render-blocking stylesheet, no 500 ms minimum on the Skeleton, and MapLibre behind a door of its own. On the `desktop` profile a Page is usable in **≈ 556 ms instead of ≈ 975 ms** (Avancé 1059 → 558 ms); on `mobile` in **≈ 1545–1573 ms instead of 1770–2028 ms**. The first paint moves from 360 to 184 ms (`desktop`) and 612 to 476 ms (`mobile`). The map itself lands no later than before on `mobile` and earlier on `desktop`, and the first opening of the Vue 3D is unchanged.

## 1. Protocol

| | |
| --- | --- |
| Build | `BASE_PATH=/simu-tyro/ bun run build:pages` — the build `deploy.yml` publishes, `dist/client/` only |
| Server | the harness's own, imitating GitHub Pages: under `/simu-tyro/`, gzip (level 6) on HTML/JS/CSS/JSON/SVG, `index.html` at a directory, `301` from `/avance` to `/avance/` keeping the query, `404.html` for any other path, `cache-control: max-age=600` |
| Browser | Chromium 156.0.8078.79 (Arch Linux), `--headless=new`, software WebGL (`--enable-unsafe-swiftshader`), viewport 1440 × 900 at DPR 1 |
| Machine | AMD Ryzen AI MAX+ 395 (16 cores / 32 threads), 60 GB RAM, Linux 7.3.1 (CachyOS); server and browser on loopback |
| Caches and Session | **cold every run**: a new Chromium process and a new profile directory — no HTTP cache, no V8 code cache, no `localStorage`, hence no Session |
| Network and CPU | set over CDP. `desktop`: 10 Mbit/s down and up, 40 ms latency, CPU 1×. `mobile`: DevTools « Fast 4G » — 8,1 Mbit/s down, 1,35 Mbit/s up, 165 ms latency — and CPU 4× |
| Runs | 5 per scenario and profile; medians reported. Spread of `usable` within a set: ≤ 30 ms (`desktop`), ≤ 35 ms (`mobile`) |
| App vs external | a response from the server's origin is the app's, counted **on the server** (bytes on the wire, then the file's size) so that MapLibre's Worker fetch is counted; anything else — swisstopo's style, tiles, relief — is external, counted from CDP and reported apart |

Scenarios:

- `blank` — `/`, no search, no Session: a first visit, the carte claire over Switzerland.
- `link` — `/?v=1&u=daN&use=perm&za=12&zb=12&fl=6&lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783&tr=p1.AwCQTpBOAJ8G5wcA`: a shared link onto Statique, the trial line with both Positions and a three-point profil (no geo.admin call). It is shorter than a link the app writes today, so the Page completes it and shows the « champs absents » strip — an old link, as it lands.
- `avance` — the same search on `/avance`, the heaviest Page.
- `vue3d` — `link`, then at network idle a press of « 3D ».

Milestones (`performance.now()` in the page, from a script injected before the app's):

- **Usable — the first usable screen**: the navigation bar is links (hydrated), no element is `aria-busy="true"` (the Skeleton is gone) and a form field is enabled. The fields, the tiles, the Verdict and the coupe are live; the vue de dessus may still be filling. The harness records each of the three conditions apart (`marks`); in every run of this report they held in the same task.
- **Map** — the vue de dessus's MapLibre canvas is in the document. Reported beside *usable* so that a cost moved from one to the other shows.
- **Vue 3D** — time from the press of « 3D » to the CesiumJS canvas, and the app bytes that press fetched.
- FCP and LCP from the paint timeline; long tasks (`longtask` entries) before *usable*, with their blocking part over 50 ms (TBT); main-thread script time (`Performance.getMetrics` `ScriptDuration`, at network idle); parse and compile (`v8.parseOnBackgroundParsing` on any thread plus `v8.compile*` on the main one) and top-level module evaluation (`v8.evaluateModule`), from a trace.

Re-run:

```bash
BASE_PATH=/simu-tyro/ bun run build:pages
bun scripts/first-load.ts --dist dist/client --runs 5 --json first-load.json
bun scripts/first-load.ts --dist dist/client --runs 3 --scenario link,avance --block '*/assets/top-map-*.js'   # the map that never arrives
bun scripts/first-load.ts --dist dist/client --serve   # the same server, for agent-browser
```

## 2. Baseline (`a8c6a12`)

What a cold load fetched from the app (`desktop`; the bytes are the same on `mobile`):

| Scenario | Transferred | Decoded | Requests | JS | CSS | Fonts | External |
| --- | --: | --: | --: | --: | --: | --: | --: |
| `blank` | 981 kB | 2941 kB | 29 | 755 kB | 83 kB | 141 kB | 893 kB, 14 req |
| `link` | 1044 kB | 3003 kB | 30 | 755 kB | 83 kB | 203 kB | 520 kB, 20 req |
| `avance` | 1191 kB | 3154 kB | 32 | 757 kB | 83 kB | 349 kB | 520 kB, 16 req |

The largest responses of `link`: `top-map-*.js` 310 kB (1126 kB decoded, nearly all of it MapLibre), `maplibre-gl-worker-*.mjs` 150 kB (519 kB), the client entry 87 kB (272 kB — `react-dom`, the router, Start's `seroval`), `frame-*.js` 79 kB (233 kB — `@base-ui/react`, the Rail's copy), the stylesheet 72 kB (190 kB), then the Iosevka Charon `math` (83 kB) and `symbols` (63 kB) subsets.

Timings (medians, ms):

| Profile / scenario | Usable | Map | FCP | LCP | TBT before usable | Longest task | Script |
| --- | --: | --: | --: | --: | --: | --: | --: |
| `desktop` / `blank` | 972 | 972 | 360 | 996 | 33 | 83 | 163 |
| `desktop` / `link` | 977 | 977 | 368 | 1008 | 39 | 89 | 210 |
| `desktop` / `avance` | 1059 | 1059 | 388 | 1096 | 67 | 117 | 231 |
| `mobile` / `blank` | 1770 | 1770 | 612 | 1828 | 216 | 266 | 534 |
| `mobile` / `link` | 1804 | 1804 | 608 | 1876 | 249 | 299 | 654 |
| `mobile` / `avance` | 2028 | 2028 | 776 | 2124 | 310 | 360 | 734 |

Parse and compile: ≈ 60 ms, almost all on V8's background threads (main-thread compile < 1 ms). Top-level module evaluation: 8 ms (`desktop`), 33 ms (`mobile`). First press of « 3D » (`vue3d`): CesiumJS canvas after 973 ms (`desktop`) / 1592 ms (`mobile`), for 1338 kB transferred (4870 kB decoded, 17 requests) — the renderer chunk and Cesium's workers and assets, already behind a door since #95.

## 3. Where the time went

Read off the request waterfalls and the sub-milestones, `link` on `desktop` unless said otherwise:

1. **A 500 ms floor under every Page — CPU idle, network done.** The navigation bar's links, the fields and the end of the Skeleton all appeared in one task, ≈ 250 ms after the last chunk arrived. Blocking MapLibre altogether (`--block`) did not move that moment. The cause is the router: every app Page is `ssr: false`, so the document arrives with its Skeleton painted, which the router treats as a pending UI it must keep for `defaultPendingMinMs` — 500 ms, counted from hydration (`offerPending` in `@tanstack/router-core`, `presentedPending ? Date.now() + min`). On `desktop` it was the dominant cost; on `mobile` the chunks take longer than 500 ms after hydration, so it mostly does not bind (Avancé excepted).
2. **The stylesheet the document waits on carried 53,5 kB of fonts.** Vite inlines any asset under 4 KiB, and `@fontsource` declares every Iosevka Charon subset behind a `unicode-range`. The Braille and box-drawing faces of the six weights fell under the limit, so 12 faces (woff2 and woff each) rode in `styles-*.css` as base64: 82 kB of its 190 kB, **53,5 kB of its 72 kB gzipped**, for glyphs the app never prints. FCP waited on that download.
3. **MapLibre on the critical path.** `/`, `/avance` and `/terrain` import the map statically, so the Page's chunk graph held `top-map-*.js` — 310 kB of the 605 kB of script fetched before *usable*, and, on `mobile`, the bulk of a single 266–360 ms long task (MapLibre's evaluation followed by the Page's first render). The Vue 3D was already behind a dynamic import; the vue de dessus was not.
4. **A second round of requests on `/`.** The shell `index.html` (`spa.prerender`) preloads only the root's and the layout's chunks; `/`'s own chunks are requested once the entry has run (≈ 390 ms on `desktop`, ≈ 1020 ms on `mobile`). `/avance/index.html` and `/terrain/index.html`, prerendered as Pages, preload theirs.
5. **The `math` and `symbols` font subsets** — 146 kB on Statique, 290 kB on Avancé (two weights each), fetched for a few glyphs (`η`, `μ`, `₀`, `≈`, `→`, `ⓘ`, `⚠`…). They arrive *after* the first usable screen and do not move it; they cost bandwidth shared with the map and a late re-layout under `font-display: swap`.

Network against CPU, `mobile` / `link` before the changes: the app's last chunk before *usable* lands at ≈ 1,51 s (`desktop`: ≈ 0,72 s, then the 500 ms floor); main-thread script is 654 ms in all (load to network idle, map included), style and layout 173 ms, parse ≈ 60 ms off the main thread. Below the floor of item 1, the first screen is bound by the bytes of item 3 and the one long task.

## 4. What changed, each measured against the step before

Medians, ms. Same protocol, same machine, five runs each. *Map* is the MapLibre canvas.

| Build | `desktop` `blank` usable / map / FCP | `desktop` `link` | `desktop` `avance` | `mobile` `blank` | `mobile` `link` | `mobile` `avance` |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline `a8c6a12` | 972 / 972 / 360 | 977 / 977 / 368 | 1059 / 1059 / 388 | 1770 / 1770 / 612 | 1804 / 1804 / 608 | 2028 / 2028 / 776 |
| 1. No font in the stylesheet | 948 / 948 / 188 | 962 / 962 / 184 | 1036 / 1036 / 240 | 1678 / 1678 / 480 | 1696 / 1696 / 480 | 1962 / 1962 / 664 |
| 2. + no Skeleton minimum | 784 / 784 / 188 | 787 / 787 / 188 | 812 / 812 / 232 | 1692 / 1692 / 476 | 1705 / 1705 / 480 | 1885 / 1885 / 656 |
| 3. + MapLibre behind its door | **556** / 836 / 184 | **557** / 882 / 188 | **558** / 998 / 228 | **1545** / 1769 / 476 | **1561** / 1766 / 480 | **1573** / 1868 / 648 |

Long tasks before *usable* (TBT / longest, ms): `desktop` `link` 39 / 89 → 10 / 60; `mobile` `link` 249 / 299 → 148 / 198; `mobile` `avance` 310 / 360 → 228 / 278. LCP follows *usable*: `desktop` `link` 1008 → 572, `mobile` `link` 1876 → 1596.

### 1. No font inlined — `src/lib/app/inline-asset.ts`

`build.assetsInlineLimit` is a function that refuses every font and leaves other assets to Vite's 4 KiB rule. The stylesheet goes from 72,4 to **17 kB gzipped** (190 → 112 kB decoded); the Braille and box-drawing faces become files fetched only if a glyph in their range is ever drawn — never, in this app. FCP: −148 to −184 ms (`desktop`), −112 to −132 ms (`mobile`); *usable* −15 to −24 ms (`desktop`), −66 to −108 ms (`mobile`). Transferred: −55 kB on every Page. `load-top-map.test.ts` fails if a font is ever inlined into a stylesheet again.

### 2. No minimum on the Skeleton — `src/router.tsx`

`defaultPendingMinMs: 0`. The minimum exists to keep a spinner from flashing; the Skeleton is the live frame's own layout, so nothing flashes, and a Page lands when it is ready. `pendingMs` keeps its default — a Page switch shows no Skeleton under 1 s. *Usable*: −164 to −224 ms on `desktop`; on `mobile` −77 ms on Avancé and within noise elsewhere, as item 1 of § 3 predicts.

### 3. MapLibre behind a door — `src/components/map/load-top-map.ts`, `deferred-top-map.tsx`

The Pages mount `TopMap` from `deferred-top-map.tsx`: the live map once `top-map.tsx` has arrived, the Skeleton's empty `TopViewFrame` until then (the same box, so nothing moves when the map lands; on Terrain, over the coupe). The module is asked for by the route's `loader` (`prefetchTopMap`), which the router runs as it starts fetching the Page's own chunk — so the map is on the wire in the same round as before, not one round later, and no press waits for it. Avancé asks for it only from B2, where its middle column shows the map: on a phone it is no longer downloaded at all.

Script fetched before *usable*: 605 → **300 kB** (all app bytes before *usable*: 748 → 388 kB). *Usable* −228 to −254 ms (`desktop`), −144 to −312 ms (`mobile`), and the longest task before it shrinks by 30–34 ms (`desktop`) and 93–113 ms (`mobile`).

**Where the cost went.** The map is drawn at 836–998 ms on `desktop` — earlier than the baseline's 972–1059 ms, though now after *usable* — and at 1766–1868 ms on `mobile`, against 1770–2028 ms before: no later than it was, the Page in front of it no longer waiting. Measured on its own (fonts and deferral, Skeleton minimum still 500 ms), this change moved nothing: *usable* stayed at 986 / 989 / 1060 ms on `desktop` — the floor of § 3 item 1 hid it, which is how that floor was found.

**First opening of the Vue 3D**, same protocol: 973 → 973 ms (`desktop`), 1592 → 1581 ms (`mobile`), 1338 kB fetched by the press both times. `vue-3d-renderer-*.js` imports the map's chunk, which is already there by then: no cost moved onto the press.

**A map that cannot arrive** (`--block '*/assets/top-map-*.js'`, 3 runs): *usable* 563 / 561 ms (`desktop` `link` / `avance`), 1575 / 1574 ms (`mobile`) — the Page does not wait for it or fail with it. The frame shows the plain drawing and « fond de carte indisponible », as for a browser without WebGL, and the next Page that shows the map asks again.

## 5. Avenues measured or weighed, and not taken

- **Preloading `/`'s own chunks in the shell** (§ 3 item 4). Simulated by adding the `modulepreload` links of `/`'s route chunks to the final build's `index.html` by hand, 3 runs: `desktop` `link` 557 → 547 ms, `mobile` `link` 1561 → 1532 ms — within the run-to-run spread once MapLibre is out of the way, since the remaining chunks are small and share the same bandwidth. Doing it for real means prerendering `/` as a Page and moving the SPA shell to `404.html`, which the prerender's de-duplication by path does not allow with `maskPath: "/"`, so it would rewrite how `build:pages` and the 404 fallback work. Not worth that change for that gain.
- **Subsetting the `math` and `symbols` fonts** (§ 3 item 5) to the dozen glyphs the app prints would cut 146–290 kB, but those files arrive after *usable* and do not move it; it would put derived font binaries and a subsetting script in the repository. Proposed as a follow-up if the late re-layout or the bandwidth on Avancé becomes the complaint.
- **Lighter dependencies** — `react-dom` (87 kB of the entry), `@base-ui/react` (≈ 212 kB decoded in `frame-*.js`), `@tanstack/form-core` (≈ 103 kB decoded), Start's `seroval`. Each is the app's architecture rather than a loading choice; swapping one is #129's question, not this issue's.
- **The Vue 3D**: already behind its door since #95, untouched here, and measured unchanged.
- **The `docs` Pages**: not on the app's first load (their KaTeX and markdown are in their own chunks); item 1 also keeps their KaTeX fonts out of their stylesheet.

## 6. Checked by hand on the final build (`--serve`, agent-browser)

- Direct navigation, cold: `/avance?…`, `/terrain?…`, `/dynamique?…`, `/docs/modele` — each Page live, the map's canvas on Statique, Avancé and Terrain, none on Dynamique.
- URL then Session: the `link` search opened Statique on the trial line (Portée 100,0 m, Tension de pose 118,7 daN); bare `/` and `/terrain` then restored the same Scenario from the Session.
- Page switches through the navigation bar (Statique → Terrain → Avancé): the search kept (210 characters each time), the map drawn at once on each Page.
- « 3D » on Statique: `vue-3d-renderer-*.{js,css}` fetched on the press, the CesiumJS canvas up, no « Vue 3D indisponible ».
- Avancé at 390 × 844: no request for `top-map-*`; widened to 1440 × 900, the map's chunk and stylesheet fetched and the map drawn.
- The map's module blocked (`agent-browser network route … --abort`): Statique and Terrain live, the plain drawing with « fond de carte indisponible » (on Terrain, the coupe under it), no error in the console; unblocked, a switch to Statique drew the map.
