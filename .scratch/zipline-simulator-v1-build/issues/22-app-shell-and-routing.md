# A7 · The app shell — one route, `ssr: false`, the Skeleton

Stage: A7
Status: done
Blocked by: 20, 21
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 8; `docs/conventions/routing.md`
(amended, binding from here) · [Amendments](../AMENDMENTS.md) **A**, **B**, **C**

## Delivers

`__root.tsx` carrying **the document only**, **exactly one route** (`/`) with `ssr: false`, the
**Skeleton** as its `shellComponent` content, the refusal page as the **index** route's
`errorComponent`, the load-time rewrite, the dropped-keys report, and the React-context store.

## Gate

Mount order correct, **no hydration warning**, a refused link returns **200** after a Skeleton frame,
an unknown path **404s**. All four are browser-observable, so they are checked from ticket 29 — there
are no component tests (amendment A). Ticket 15's five router re-probes must be green before this
stage starts; every behaviour below depends on them.

## Notes

- **Exactly one route**, because the router validates search params *per route* and a second one would
  re-declare the same ~30-key `validateSearch` — the one place this app cannot afford drift.
- **`ssr: false` on the index route only**; `__root`'s `shellComponent` stays server-rendered.
  Measured: `defaultSsr` in `src/router.tsx` is a **silent no-op** (`createStartHandler` spreads an
  `undefined` from a `src/start.ts` that does not exist), and a thrown `validateSearch` renders the
  refusal at **500** under SSR against **200** without it.
- **Full SSR was rejected on provenance, not cost**: for a bare `/` the server would paint the shipped
  defaults and the Session read would replace them a tick later — a flash of somebody else's numbers.
- **The Skeleton is not optional.** Measured: with no `pendingComponent` the body ships **empty**, so
  the choice was Skeleton or blank page. It renders five section headings, two chart frames at
  `0,42 × W_inner`, labels **without values**, the five real read-out cells, and the banner band's
  *height* reserved with nothing drawn in it. **No control, no value, no « — ».**
- **Rewrite-on-load is a client mount effect building a plain object.** Unknown keys **never** vanish
  on their own under the default `search.strict` — the rewrite is the *only* thing that cleans the
  address bar, and it works because a plain-object `search` replaces the whole bag.
- **The dropped-keys report has exactly one transport**: client-side, from the raw query string,
  *before* the rewrite. Every server-side alternative either stringifies into the URL, leaks across
  requests, or destroys the evidence.
- **Record the `useSearch` trap beside the key table.** `Route.useSearch()` returns raw ∪ validated at
  runtime while its TypeScript type is validated-only. App code reads a **single derived Scenario
  object built from the validated keys**, never the raw bag — which is why « clé ignorée » is an
  app-level guarantee the router does not enforce, and a trap **no test can catch**.
- **The refusal page is the *index* route's `errorComponent`.** On the root it would replace the
  shell, leaving no way back. **Struck by [amendment E](../AMENDMENTS.md)**: no refusal reaches an
  `errorComponent` any more — the index route renders the refusal surface as an ordinary component
  when `search.refused` is set. The route may still declare an `errorComponent` for genuine load
  failures.
- **The index route must install `search: { middlewares: [keepRefusalOutOfTheAddressBar] }`** from
  `src/lib/url/schema.ts`. Not optional, and measured (probe 6 in `docs/conventions/routing.md`):
  `buildLocation` stringifies `{ ...incoming, ...validated }`, so `refused` — the one key
  `validateSearch` synthesises — otherwise 307s into the address bar as JSON. `matchRoutes` runs no
  search middleware, so `Route.useSearch().refused` still carries the marker.
- **An unknown path 404s** rather than redirecting to `/`, which would turn a truncated link into
  somebody else's scenario.
- `__root` carries `lang="fr"`, a French `<title>`, a French `notFoundComponent`, and the viewport meta
  with `interactive-widget=resizes-content` plus the `visualViewport` fallback. The devtools block
  stays **unguarded** — the plugin strips it at build.
- **Offline is a data claim**: no runtime network dependency after load, **no service worker, no PWA
  manifest**.
- **A refused link returns HTTP 200 to crawlers and link-preview bots**, which will render as « a
  working app » in a preview card. Cosmetic consequence of the 200-not-500 election; nobody has looked
  at it.
- The Skeleton's « same CSS layout, therefore correct at 390 px for free » is **reasoned, not
  rendered**. Cheap to verify here — treat it as a checked item, not an assumption.
- The React-context store rests on the sweep being cheap (p95 1,30 ms) **and** on almost every field
  feeding it. If a later feature makes some subtree both expensive and independent of most state,
  subscription granularity comes back as a real question — and the answer would be a store, not a
  context memo.

## Comments

**Built.** The shell, in twelve files — two routes, six components, four `lib` modules:

| File | Carries |
| --- | --- |
| `src/routes/__root.tsx` | the document only — `lang="fr"`, « Scoutech — simulateur de tyrolienne », the viewport meta with `interactive-widget=resizes-content`, the French `notFoundComponent` (« Page introuvable. » + « Ouvrir le simulateur »), the devtools block left **unguarded** |
| `src/routes/index.tsx` | the one route: `ssr: false`, `validateSearch`, `search: { middlewares: [keepRefusalOutOfTheAddressBar] }`, `pendingComponent: Skeleton`, `errorComponent` for genuine load failures, and the `search.refused` branch |
| `src/components/app/shell.tsx` | **one** layout, rendered by both the Skeleton and the app — § 5's band heights as CSS custom properties over container-query units |
| `src/components/app/skeleton.tsx` | five Rail headings, both chart frames, five cell labels, the banner band's height with nothing in it, `aria-busy`, the `<noscript>` line. No control, no value, no « — » |
| `src/components/app/refusal.tsx` | the refusal surface — an **ordinary component**, not an `errorComponent` |
| `src/components/app/store.tsx` | the React-context store, the lazy Session read, the rewrite mount effect |
| `src/components/app/app.tsx` · `use-keyboard-inset.ts` | the live shell, and the `visualViewport` fallback writing `--kb` |
| `src/lib/app/state.ts` · `refusal-copy.ts` | the mount order and the four reason lines, both **pure** |
| `src/lib/scenario/from-search.ts` · `src/lib/layout/contract.ts` | the read side of § 7's key table, and § 5's numbers |

**The gate is browser-observable, so it was observed** — not deferred to ticket 29, which owns the
repeatable version. On the pinned tree, dev server: `/` **200**, `/?v=3` **200**, `/?fl=6&lo=151`
**200**, `/nexistepas` **404**; the server HTML for `/?v=3` carries the Skeleton (`aria-busy`, the
five headings, « Garde min », the `<noscript>` line, `lang="fr"`), so the refusal genuinely arrives
**after a Skeleton frame**; `/?v=3` is **not** 307'd — the middleware holds. Console clean on every
path: **no hydration warning**, no error. `?L=250&h=-40&xy=1` rewrote to the canonical bag with
`xy` gone, `x=125` and `history.length` unchanged; bare `/` stayed bare.

**« Correct at 390 px for free » is now measured, not reasoned** — the ticket asked for it as a
checked item. Band heights, live, against § 5's three budgets:

| | 390×664 | 768×1024 | 1440×900 |
| --- | --- | --- | --- |
| colonne graphique | 390 | 480 | 1152 |
| profil | **220** | **257** | **540** |
| bande de garde | **96** | **96** | **177** |
| cellules | **104** (3 col × 2) | **104** | **52** (5 × 1) |

Every row is § 5's, and no band reads the window height: the CSS is
`calc(0.42 * (100cqi - 48px))` and `clamp(96px, calc(0.16 * (100cqi - 48px)), 200px)`, built from
`contract.ts`'s constants. B1 fires as a container query on the chart column, B2 as the one `md:`,
and the document never scrolls at any of the three.

Six judgement calls, all in the gaps the spec left rather than against it:

- **`ScenarioDraft`** (`src/lib/scenario/types.ts`) — `Scenario.material` is the engine's
  `MaterialSpec`, which cannot express § 9's « `MBL` et `μ` vides et requis », yet `?fam=tx` with no
  `mbl` is a state the app must *hold*. So the store holds `Omit<Scenario, "material"> & { material:
  SteelSpec | TextileDraft }`; a `Scenario` is assignable to it, and filling the blanks is the Solve
  Gate's job, not a conversion.
- **`scenarioFromSearch`** lives in `src/lib/scenario/`, not in `schema.ts`, because what it returns
  is the app's type and not the URL's. It is `scenarioToSearch`'s inverse and the round trip of
  § 9's shipped Scenario is its first test.
- **`x` clamps on arrival and the clamp travels into the rewrite**, so the address bar holds exactly
  the state the app holds. `link.xClamped` carries the fact for A9's transient inline note; § 7
  forbids clamping *silently*, and dropping the flag here would have made the note unwritable.
- **The rewrite triggers on a content diff of the bag**, not on `dropped.length || completed.length`.
  Same behaviour on both of § 7's stated cases, plus the third one the sentence misses: a key removed
  because it is not the **active** configuration — a redundant `L` beside a `tr` — gets no strip line
  and would otherwise sit in the address bar contradicting the screen. Order still never triggers it.
- **The reducer ships three actions** (replace scenario · patch scenario · set layers). A7 fixes the
  *shape* — one reducer over one object — and A9 owns the vocabulary; inventing seventeen actions
  here would be guesses about a form that does not exist yet.
- **`src/lib/layout/contract.ts` is new and A8 extends it.** The Skeleton needs § 5's proportions on
  the first frame and « there is no second layout to keep in sync », so the constants had to exist
  now. It holds the numbers and the four functions the Skeleton uses; `SharedX`, VE and the ×1 floor
  are A8's to add to the same file, not to re-declare.

Two spec sentences that A7 did **not** implement, on purpose: the « clé ignorée » strip's rendering
and the banner's occupants are **A11's** (`link.dropped` and `link.completed` are computed and held,
ready for it), and the Chart Block's collapse states are **A12's** — A7 ships the bands they collapse.

`docs/conventions/routing.md` gains a *The shell, as built* table plus the three rules that only
become visible once it exists (the mount order, content-not-order, and the single `useSearch` read).

Gates green: `typecheck`, `lint-type-aware`, `test` (suite 774 → **835**; four new files —
`state.test.ts` 19, `from-search.test.ts` 14, `contract.test.ts` 22, `refusal-copy.test.ts` 6).

**Fix round.** Three defects found by review, all fixed, gates re-run green (suite 835 → **838**).

- **B2 allocated the residual to the wrong side, and the block was clipped rather than budgeted.**
  In column mode the `aside` kept `shrink-0` while the chart column was `flex-1`, so the Rail's
  content height won and the Chart Block got what was left: measured 415 px of box against 507,63 px
  of content at 390×664, with the View Strip and the whole read-out row cut off inside an
  `overflow-hidden` shell. § 5's budget A is the other way round — « bloc 540 · reste : rail en flux
  124 » — so the chart column is now `flex-none md:flex-1` and the `aside` `flex-1 min-h-0
  md:flex-none`. Re-measured: **390×664** chart block **508** (44 · 220 · 96 · 44 · 104), rail **156**
  with a 249 px internal scroller, all five cells legible; **768×1024** and **1440×900** byte-identical
  to the table above. The 390 row of that table was right about the bands and wrong to call the
  budget verified — it is now.
- **A link whose only keys are ignorable was misread as a bare `/`.** `initialAppState` short-circuited
  on `!hasScenarioKey(search)` *after* salvage and returned `NO_LINK`, discarding the drop
  `salvageSearch` had just recorded: `?junk=zz` kept its key in the address bar forever and left the
  « clé ignorée » strip no evidence. Bare `/` is still never rewritten, but `?junk=zz` is not bare —
  it now keeps `dropped` and rewrites onto the **salvaged** bag (`{}`, or `{v}` where a `v` arrived),
  never onto the completed defaults, which would convert a session restore into a shared scenario.
  Verified live: `?junk=zz` · `?utm_source=slack` · `?za=oops` → `/`, `?v=1&xy=1` → `?v=1`, bare `/`
  and `?v=1` untouched, `history.length` unchanged across the replace. Three cases added to
  `state.test.ts`.
- **The `visualViewport` fallback followed § 7's short phrasing rather than § 5's.** It now writes
  `innerHeight − height − offsetTop` and listens to **`scroll` as well as `resize`** — on older iOS
  Safari, the one platform it exists for, the pan fires `scroll` and is carried by `offsetTop`, so
  the old form overstated `--kb` and then never updated during the pan.

**Spec-drift correction (chunk 4 audit) — the write side had no owner, so A7 takes it.** The shell
shipped the load-time *read* and nothing wrote afterwards: no module outside `schema.ts` called
`scenarioToSearch`, `writeSession` or `clearSession`, so § 7's « the address bar must always hold
exactly the state the app holds » was false after the first keystroke and `readSession` could never
return anything — which left A7's own justification for the synchronous lazy initialiser
unreachable. Added `src/lib/app/persist.ts` (pure: `completeScenario`, `publishedSearch`,
`sessionOf`, `copyLink`, the two debounce constants) and `src/components/app/use-persist.ts`, called
from `AppStoreProvider`: one ≈400 ms-debounced `navigate({ to: '/', search, replace: true })` per
Scenario change and one ≈1 s-debounced `writeSession`, both taking a `suspended` flag A11 wires to
« Saisie en cours ». Two things this round measured rather than reasoned:

- **A mount-once flag does not survive `<StrictMode>`.** `@tanstack/react-start`'s default client
  entry hydrates under it, so the effect runs mount → cleanup → mount, the flag is already true on
  the second pass and a **bare `/` gets rewritten into a full bag on load** — the one navigation
  § 8 forbids, because bare `/` *means* « restore the Session ». The guard now remembers the
  mounted Scenario **by identity**; every dispatch makes a new object, so « still the state we
  opened on » is an `===`. Driven in the browser: bare `/` stays bare, a typed `Portée` publishes
  the canonical bag ≈400 ms later, `history.length` unchanged across the write.
- **Only a *complete* Scenario is publishable.** `Session.scenario` is a `Scenario` and
  `scenarioToSearch` would emit `mbl=0` for § 9's blank rope, so both writes suspend while a
  textile draft still has blanks, exactly as they do under « Saisie en cours ».

One observation left standing, not a defect to fix here: axe reports `scrollable-region-focusable`
on the `aside` at 390 px, because the Rail is now genuinely a scroller and A7's Rail holds five empty
headings and **no focusable child**. A9's fields clear it; a `tabIndex` added now would be a stray tab
stop for A9 to remove. The other three axe findings (`landmark-one-main`, `page-has-heading-one`,
`region`) predate this round at every width and belong to A9–A11's content.
