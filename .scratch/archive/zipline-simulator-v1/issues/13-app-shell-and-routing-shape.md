# App shell and routing shape

Type: grilling
Status: resolved
Blocked by: — (09 resolved 2026-08-12)
Map: [Zip-line simulator v1](../map.md)

## Question

Is v1 one route or several, and what — if anything — does TanStack Start's SSR do for it?

Graduated from the map's fog once
[Engine API, execution model and module layout](./03-engine-api-execution-model-and-module-layout.md)
settled where computation lives: the engine is synchronous, pure, and entirely client-side,
reached through a `useSweep` hook. There is no server-side computation to arrange and no
loader-fetched data — which sharpens the question rather than answering it. Blocked by the
URL state schema, because TanStack validates search params in the route definition, so the
schema decides part of the route's shape.

Settle:

1. **One route or several.** A single `/` holding the whole simulator, or separate routes for
   (say) the simulator and a printable report view. Note the app has no navigation in the
   usual sense — every state change is a parameter change.
2. **What SSR renders.** The engine cannot produce anything meaningful on the server: there
   is no persisted state to hydrate, and a shared link's `L₀`/material parameters could in
   principle be solved server-side — decide whether that is worth anything or whether the
   first paint should simply be the empty shell. Consider `ssr: false` on the route, static
   prerendering of the shell, or leaving SSR on and accepting it renders a skeleton.
3. **Where the search-param schema is validated**, given ticket 09's decision — in the route's
   `validateSearch`, or in a plain parser the route delegates to.
4. **Where localStorage rehydration happens** without an SSR hydration mismatch: last-session
   restore is client-only by definition, so decide the mechanism (post-mount effect, or a
   client-only boundary) and what the user sees for the frame before it lands.
5. **Whether `__root.tsx` carries any chrome at all** — a header, a title, a print stylesheet
   hook — or whether the simulator fills the viewport.

## Context

`docs/conventions/routing.md` is the binding doc; read it first.
Current state: `src/routes/__root.tsx` and `src/routes/index.tsx` are untouched scaffold, and
`src/routeTree.gen.ts` is generated — never hand-edit it.

The GPX file never leaves the browser (map scope decision: the app is genuinely offline, no
network calls), so nothing here may introduce a server round-trip for terrain.

**Inherited from [URL state schema and persistence](./09-url-state-schema-and-persistence.md)** —
the schema is fixed, so sub-question 3 is now about *placement*, not design.

- **Hand-rolled `validateSearch`, no zod.** The required behaviour is per-key salvage with a
  report, not valid-or-throw; ticket 09 §0 makes the URL a *typing* boundary only (finite number,
  enum membership, known key) and forbids re-checking anything ticket 04 §7 already owns.
- **Keep the router's default `parseSearch`/`stringifySearch`** — no global codec override. Ticket
  09 §4 verified the defaults are adequate and guarded the one hazard (a JSON-parseable base64
  payload) locally with the `p1.` sentinel instead.
- **`validateSearch` runs on the server too**, so the trace codec must be isomorphic — which it is,
  being synchronous by construction (§6: `DecompressionStream` is unusable inside `validateSearch`).
  Whether decoding a trace during SSR is wasted work is this ticket's call.
- **Rewrite-on-load**: one `replace` navigation to the validated search immediately at load, so the
  address bar never carries keys the app ignored (§4). Interacts with sub-question 2 — that
  navigation must not fight hydration.
- **localStorage is read post-mount only** (§7), which is exactly this ticket's sub-question 4; the
  stored payload is the *session* (both Material Specs, retained manual geometry, cached trace),
  strictly larger than the URL's *scenario*.
- **Refusal is a full-page outcome**: unknown `v` or an undecodable/oversize trace throws from
  `validateSearch`, so the route needs an `errorComponent` offering « Ouvrir l'application vide ».
  Sub-question 5 should decide whether that page sits inside `__root.tsx`'s chrome.

## Answer

Resolved by grilling over two rounds, 2026-08-12, against a **scratch dev server on port 3111**
(a copy of this repo, probe routes only) and against the installed router source — never from
remembered API shapes, and never from docs alone. `ctx7`
(`/websites/tanstack_start_framework_react`) was used as a cross-check and is silent on four of
the six facts that decide this ticket.

The load-bearing finding is that **the measurements contradict the documentation five times**, and
one of the contradictions silently destroys another ticket's feature: a validator written in the
obvious TypeScript spelling makes the *server* emit a **307** that strips the offending key before
any client code runs, so ticket 11's ignored-keys banner can never name it. Every decision below
therefore states the measurement it rests on.

Installed tree, which is the only truth here because `package.json` pins every TanStack entry to
`latest`: `@tanstack/react-start` 1.168.34 · `react-router` 1.170.18 · `router-core` 1.171.15 ·
`start-server-core` 1.169.17 · `router-plugin` 1.168.23.

### 1. Exactly one route, `src/routes/index.tsx` at `/`, and no second document of any kind

No printable-report route, no `/refuse`, no `/nouveau`. « Ouvrir l'application sans ce lien » is a
`<Link to="/" search={{}} replace>` onto the same route.

Nothing on the map asks for a second document. Ticket 02 §5 deferred SVG export to a client-side
`XMLSerializer` on the SVG already in the page — no route. Ticket 08 *removed* a region rather
than adding one, and ticket 09 §1 makes every state change a search-param change, so there is no
navigation to model. The decisive argument is drift: the router validates search params **per
route**, so a second route re-declares the same ~30-key `validateSearch`, and a link that types
cleanly on one route and refuses on the other is precisely the failure ticket 09 §0 exists to make
impossible.

**Rejected: a print / report route, and any print stylesheet, in v1.** This is the one real gap —
browser-printing a five-section scrolling Rail plus two auto-fitting charts will look bad, and a
rigger would like a sheet to hand over. It is refused on ticket 08's grammar, not on effort: a
printed page is exactly what gets read as an attestation, and a printed « Indéterminé », or a
printed no-regime prompt where a verdict should be, is a document that **outlives its context**.
Ticket 08 spent five verdict states and a « Ce que cet outil ne calcule pas » block to stop the app
signing anything; a print target hands that back. Recorded in the map's **Out of scope**.

Current state to correct: `src/routeTree.gen.ts:12` already carries a **third** route,
`src/routes/prototype.profile-view.tsx` (plus `src/routes/-prototype-07/`), so a production build
today ships the prototype as a public route. Ticket 15 still needs it; deletion is sequenced by
ticket 10 §8, **after** the bench harness and `check.ts`'s §15 fixtures are ported, and the
prototype solver is **not** lifted into `src/lib/sim/`.

### 2. `ssr: false` on the index route only — and the three ways to spell it that do not work

`__root.tsx`'s `shellComponent` stays server-rendered (document, head, CSS, scripts). The index
route sets `ssr: false`. Route-level `ssr` exists in this version: `SSROption = boolean |
'data-only'` (`node_modules/@tanstack/router-core/dist/esm/router.d.ts:41`), accepted on a route or
as a function of `{ search, params }` (`route.d.ts:254`, union shapes at `route.d.ts:281-295`).

What that buys, measured rather than assumed:

| Mechanism | Measured behaviour |
| --- | --- |
| `ssr: false` on the route | `react-router/dist/esm/Match.js:76` wraps the match in `<ClientOnly fallback={pendingElement}>`; `router-core/dist/esm/load-matches.js:82` skips `beforeLoad` and `loader` on the server entirely |
| `GET /probe-nossr?L=250&junk=zz` | **200**, body contains only the `pendingComponent`, dehydrated match reads `s:"pending", ssr:!1` |
| `defaultSsr: false` in `src/router.tsx` | **silent no-op** — match still dehydrates `ssr:!0`, `beforeLoad` still runs server-side |
| `spa: {}` in `vite.config.ts` | adds a build-time prerender of the shell to `/_shell` with `maskPath: '/'` for the same visible result |

The `defaultSsr` trap is worth stating in the spec because it fails *invisibly*:
`createStartHandler` calls `router.update({ defaultSsr: requestStartOptions.defaultSsr })` from a
`src/start.ts` that **does not exist** in this scaffold, so the value is `undefined` and
`update()` spreads it over the options (`router-core/dist/esm/router.js:82-85`). Someone who
"tidies" the route option into the router loses SSR opt-out and gets no error. `spa: {}` stays off
(`start-plugin-core/dist/esm/schema.js:109-119`: optional, off by default) — it only makes the
runtime server redundant at build time, which is a deployment question, not this one (§10).

**Rejected: keeping SSR on and mounting only the chart client-only** (the audit's
counter-proposal). Its single benefit is server-rendering the Rail's input half from the validated
search, and in the common case that benefit is negative: for a bare `/` the server paints ticket
14's defaults — Portée 150,0 m, Flèche 6,0 m — and ticket 09 §7's Session read replaces them a tick
later. A flash of somebody else's numbers is the exact failure this app exists to refuse, and it
lands on the input half too, because a rigger who glances at a painted 150,0 m and then sees 250,0
m has been shown a number with no provenance. Second, measured: **a thrown `validateSearch` under
SSR renders the refusal at HTTP 500** — a lie about the server, and a body some hosts and proxies
replace with their own — where `ssr: false` returns **200**.

Third, independent of provenance: ticket 07's spine sizes both charts from a `ResizeObserver`
seeded at a fabricated 900×420 (`src/routes/-prototype-07/use-model.ts:198-211`), so any
server-rendered chart geometry is wrong by construction and re-lays-out on hydration. Ticket 15
§15.1's rejection of `useMediaQuery` rests on the same seed.

### 3. The Skeleton — the only thing the server ever renders below the document

A `pendingComponent`, named **Skeleton** (CONTEXT.md term, coined here). Measured: with no
`pendingComponent` the server ships an **empty `<body>`**, because `ClientOnly`'s fallback defaults
to `null` — so the choice is Skeleton or blank page, not Skeleton or something better.

What it contains, exactly:

```
┌ RAIL ─────────────┐┌ CHART BLOCK ────────────────────────────┐
│ Scoutech          ││ ░ banner band: height reserved, empty ░ │
│                   ││ ┌─────────────────────────────────────┐ │
│ Paramètres        ││ │  (empty profile frame)              │ │
│ Valeurs déduites  ││ └─────────────────────────────────────┘ │
│ Résultats         ││ ┌─────────────────────────────────────┐ │
│ Provenance        ││ │  (empty clearance frame)            │ │
│ Ce que cet outil  ││ └─────────────────────────────────────┘ │
│ ne calcule pas    ││ ░ view strip: height reserved, empty ░  │
│                   ││ T max │ Garde min │ Flèche │ … labels  │
└───────────────────┘└─────────────────────────────────────────┘
```

- **The five section headings in order**, plus the app's name in the Rail Header (§8) as static
  text. No field rows, no group frames: the Skeleton reproduces *containers*, not controls.
- **Both chart frames at the spine's proportions**, per ticket 15 §15.4 — profile inner height
  `clamp(0.35, 0.50) × inner width`, strip clamped to [72, 200] px — so the frames are right at
  390 px for the same reason the app is.
- **The read-out cells' labels, never their values**, and never a « — ». Ticket 08 spent « — » on
  `Indéterminé` (attempted, unavailable); a dash in a clearance cell before anything was attempted
  is a number-shaped thing with no provenance.
- **The banner band's height is reserved; nothing is drawn in it.** No border, no fill, no text.
  Reserving height is layout; painting a band is a statement, and an empty verdict-coloured band
  reads as « rien à signaler ». This is the distinction that lets the Skeleton do its one job —
  fixing the layout before hydration — without asserting anything.
- **No interactive control is painted.** The Rail Header's unit selector, « Copier le lien » and
  overflow menu, the View Strip's toggles and the `x` field are all absent: a control that is
  present and dead is worse than one that is absent, and their slots' heights are reserved instead.
- **No spinner, and no sentence.** A spinner is a promise of waiting that never comes true — the
  document is replaced in the same tick as hydration — and it is one more thing ticket 15 has to
  reflow. `aria-busy="true"` on the Skeleton root, no `aria-live` region.
- **One `<noscript>` line**, which is the one thing `ssr: false` obliges and nobody had noticed:
  with JavaScript disabled the app is a Skeleton **forever and says nothing**. Proposed copy,
  ticket 11 may reword: « Ce simulateur nécessite JavaScript pour fonctionner. »

The Skeleton uses the **same CSS layout as the app** — same flex/grid, same container query, same
gutter constant — so ticket 15 §4's reflow makes it correct at every width for free, and there is no
second layout to keep in sync.

### 4. Rewrite-on-load is a client mount effect building a plain object — and ticket 09 §4's stated mechanism is wrong

One **mount-time effect** in the index route's component: diff the keys of the raw initial location
against the schema's key list and fire

```ts
navigate({ to: '/', search: canonicalObject, replace: true })   // plain object, never a function
```

**only if something was dropped or completed** (ticket 14 §14.8). Never `search: (prev) => ({
...prev })`, never `{ ...Route.useSearch() }`, no `search: { strict: true }`, no search middleware,
no `stripSearchParams`, no `beforeLoad`.

Four measured facts force every clause of that:

1. **`Route.useSearch()` is raw ∪ validated at runtime while typed as validated-only.**
   `router-core/dist/esm/router.js:870` computes `strictSearch` and stores it privately as
   `match._strictSearch` (`:918`), while `match.search` — what `react-router/dist/esm/useSearch.js:22`
   reads — is the merge. Reproduced in the browser: `r.state.matches.at(-1).search` had keys
   `["L","junk","h"]`. So a spread-built rewrite is a **no-op that leaves `junk=zz` in the address
   bar and reports it as dropped** — the worst of both.
2. **Unknown keys never vanish on their own.** `buildLocation`'s rebuild-from-validated-search is
   gated on `this.options.search?.strict` (`router.js:294`), and the search middleware returns
   `{ ...result, ...validated }` (`router.js:1126-1133`) where `result` is the incoming bag. Under
   the default (`strict` unset ⇒ false) an unknown key **persists indefinitely**. Ticket 09 §4 says
   it "survives until the user's first edit and then vanishes with no signal"; that is not what this
   version does. **Rewrite-on-load is therefore the only thing that ever cleans the address bar** —
   which strengthens ticket 09's decision while invalidating its reasoning. Ticket 10 must not
   reproduce §4's wording.
3. **A plain-object `search` still replaces the whole bag under `strict: false`.** Verified in
   source: `applyNext` terminates with `functionalUpdate(dest.search, currentSearch)`
   (`router.js:1145`), and `functionalUpdate` returns a non-function updater verbatim
   (`router-core/dist/esm/utils.js:17-20`). The incoming bag never enters, so the emitted query
   string is exactly the object we built, plus validation merged over it. This is why the mechanism
   needs no router option — and why `search: (prev) => …` must never be used.
4. **A mount-effect `navigate({ replace: true })` does not fight hydration.** Measured: URL
   rewritten, console clean, **no hydration warning**, `history.length` unchanged. The failure mode
   in this version is a wrong search object, not wrong timing.

**Rejected: `beforeLoad`**, which is where a load-time redirect belongs. Under `ssr: false` it runs
on the client during hydration anyway (`load-matches.js:82` skipped it on the server), so it gains
nothing, and it cannot hand the dropped-key report to React state (§6).

**No rewrite of a bare `/`.** Ticket 09 §7 gives bare `/` the meaning « restore the Session », so a
rewrite on mount would make `/` destroy itself: the next refresh would stop restoring the session,
silently converting shipped defaults into a shared scenario.

**Key order — settled, and deliberately not a trigger.** When the rewrite does fire it emits the
full canonical bag **in ticket 09 §1's key-table order**, which is achievable because
`router-core/dist/esm/qss.js`'s `encode()` iterates `for (const key in obj)` and appends via
`URLSearchParams.set`, so object insertion order survives into the query string. Two links to the
same Scenario are then string-identical, which is what makes « Copier le lien » diffable and a bug
report reproducible. But **order alone never triggers a navigation**: a hand-authored
`?h=-40&L=250` with nothing dropped is left exactly as typed, because firing a `replace` for
cosmetics would rewrite a URL the user is mid-way through editing. "Re-state defaults" is a
non-question — ticket 09 §4 already states every key that has a value, and the three declared
absences (`reg`, `mbf`/`ea`/`mu`) must stay absent.

### 5. The validator's hard rules

`validateSearch` is hand-rolled (no zod, ticket 09), lives on the index route, and obeys four rules
that are not stylistic:

- **It omits unknown or unrepresentable keys. It never returns `{ key: undefined }`.** Measured:
  returning `{ M: undefined }` makes the **server** 307-strip the key —
  `/probe-drop?L=abc&M=abc` → `307 /probe-drop?L=abc` — while omitting it leaves the key in the URL
  and returns 200. `qss.js`'s `encode()` skips `val !== void 0`, so the canonical href differs from
  the incoming one and `router.beforeLoad()` throws a redirect
  (`router-core/dist/esm/router.js:501-522`, `redirect.js:20`, consumed by `createStartHandler`).
  **The 307 fires even under `ssr: false`** — measured — so the route option does not protect
  against this. Same trap, larger, if `search: { strict: true }` is ever switched on.
- **It never coerces.** Measured: returning `String(1)` for `bad=1` produced
  `307 → ?bad=%221%22`. Whatever the validator returns is what `stringifySearch` writes back.
- **It is pure, cheap and side-effect-free**, because it runs **3× per document request** — call
  sites measured at `router.js:1016` (`matchRoutesLightweight`), `router.js:1127` (the search
  middleware inside `buildLocation`) and `router.js:870` (`matchRoutesInternal`) — again per
  `buildLocation`, and on the server, where module state is shared across requests. Note
  `router.js:1126` wraps it in `try {…} catch {}`: throws are **swallowed** at that call site, so a
  validator with a side channel fires an unknown number of times and leaks between users.
- **`p1.` payloads are validated structurally only.** Sentinel, base64url alphabet, varint walk,
  declared `n` against bytes consumed, character budget — then **the `tr` string is returned
  verbatim**, with no arrays allocated. Ticket 09 §4's refusal semantics are preserved (an
  undecodable or oversize `tr` still throws). The real decode is a **memoised derivation inside the
  client-only subtree** and never enters the validated search object, because arrays in the
  validated search would be stringified into the address bar — 200 points of JSON against ticket
  09's 2000-character budget. Server-side structural validation is **accepted as wasted work**:
  measured 2,3–2,5 µs per full decode on `docs/references/example-profile-trace{1,2,3}.csv`
  (910 / 859 / 897 URL characters), so ≈7 µs per request even if it decoded fully, which is cheaper
  than any mechanism to avoid it.

### 6. The dropped-keys report has exactly one workable transport

**Elected: the banner is computed client-side on first mount from the raw query string, before the
rewrite `replace` fires.** Consequence ticket 11 must hold: **the banner can only ever name keys the
client actually received.**

Every server-side alternative fails, each for its own reason:

| Transport | Why it fails |
| --- | --- |
| ride in the validated search | the router stringifies the validated object back into the URL under strict search — the report becomes a search param |
| module-scope side channel in `validateSearch` | runs on the server, where module state is shared across requests, and is called inside `try {…} catch {}` (`router.js:1126`) an unknown number of times ⇒ leaks between users |
| `{ key: undefined }` or `search.strict` | the server 307s the key away before any client code runs (§5) — the banner can never name it |
| a `redirect` carrying the report | the rewrite is the thing that destroys the evidence; the redirect *is* the rewrite |

Reading the raw query string on the client is not a workaround, it is the only place where the
evidence and the renderer coexist.

### 7. The Session is read synchronously in a lazy initialiser; the store is React context

`useState(() => readSession() ?? firstRunDefaults())` at the client-only subtree's first render —
**not** a post-mount effect. Measured: under `ssr: false` a lazy initialiser never runs on the
server (0 `[INIT SERVER]` log lines), because the subtree sits inside `ClientOnly` whose
`useHydrated()` is `useSyncExternalStore(subscribe, () => true, () => false)`
(`react-router/dist/esm/ClientOnly.js:44`) — false on the server *and* on the first client render.

**Amended 2026-08-12** by [First-run scenario and defaults](./14-first-run-scenario-and-defaults.md)
§12: the fallback is not a function call. Ticket 14 elects **`FIRST_RUN_SCENARIO`**, a single
constant object at `src/lib/scenario/first-run.ts` — the same object serving the opening state,
the reset target and the link-completion values, "not three copies." Read as
`useState(() => readSession() ?? FIRST_RUN_SCENARIO)`.

Ticket 09 §7's "post-mount read" constraint exists to avoid a hydration mismatch. With no server
HTML for the subtree there is **no mismatch to avoid**, so a synchronous read satisfies the
constraint's purpose strictly better than an effect: **there is no "frame before it lands" to
design** (sub-question 4's last clause dissolves). An effect would cost one extra paint plus one
extra sweep on a scenario the user did not ask for — ticket 14's defaults flashing over a returning
user's own line.

Stated cost: reading `localStorage` during render is a side effect in render, and breaks the moment
someone re-enables SSR for this route. It is the same one-line edit as re-adding the effect, guarded
by the same `ssr: false` elected in §2, and the guard is now written down here.

**The store is React context over one reducer-backed state object, created inside the client-only
subtree. No external store library, no hand-rolled `useSyncExternalStore`.** Rejected because
selective subscription buys nothing here: the expensive thing is the sweep plus the clearance
reducer (ticket 12: p95 1,30 ms at 240 steps, 2,30 ms at 500), it depends on nearly every field, and
both charts re-render on nearly every change anyway. The real performance mechanism is the memo on
the solve inputs behind ticket 03's `useSweep` seam, not subscription granularity. A second reason
specific to this ticket: an external store is a second place where the Session read could escape the
client-only subtree and start running on the server.

### 8. `__root.tsx` carries the document and nothing visible

No header, no app bar, no root `component`, no print stylesheet hook. `__root` is document-only —
and it can be, because **the ten controls that had no address now have three homes** (elections
§0.5): the Rail Header, the View Strip, and `Paramètres › Géométrie`. This is not "chrome deferred",
it is chrome *placed elsewhere*. Ticket 15 measured why it matters: at 390×664 the whole stack
leaves ~180 px of slack, which **is** the Rail's resting height, so a 48 px title bar is spent
straight out of the form.

The scaffold contradicts four fixed map decisions today and this ticket owns the corrections:

| `src/routes/__root.tsx` | Now | v1 |
| --- | --- | --- |
| `:39` | `<html lang="en">` | `<html lang="fr">` — elections §0.6 makes this load-bearing, not cosmetic: the decimal comma is a correctness question |
| `:18` | `title: "TanStack Start Starter"` | « Scoutech — simulateur de tyrolienne » |
| `:28-33` | English `notFoundComponent` | « Page introuvable. » + « Ouvrir le simulateur » |
| `:14-16` | `width=device-width, initial-scale=1` | `width=device-width, initial-scale=1, interactive-widget=resizes-content` |
| `:45-55` | `TanStackDevtools`, unconditional | **kept as-is** — `devtools-vite/dist/esm/plugin.js:12` reads `removeDevtoolsOnBuild ?? true`, so it is stripped at build and needs no guard |

The viewport meta is ticket 15 §15.8's, flagged to this ticket because this ticket owns the head.
Measured there: the default `resizes-visual` means `100svh` does not shrink when the soft keyboard
opens, so the keyboard covers the bottom ~336 px of a ~664 px viewport — exactly where §15.1 puts the
Rail. **iOS fallback, also elected**: a `visualViewport` `resize` listener writing
`window.innerHeight − visualViewport.height` into a CSS custom property the layout subtracts. It
needs no threshold constant because the value is 0 when no keyboard is up. Both chart SVGs get
`touch-action: pan-y`, never `touch-none`.

**The refusal page is the *index* route's `errorComponent`, not the root's.** A search error is that
match's error and renders in its parent's `Outlet`; declared on the root it would **replace the
shell**, so the refusal would appear with no Rail Header and no way back into the app. Full-viewport
inside the shell. It arrives at **HTTP 200 after a Skeleton frame**, which is accepted and which
ticket 11's copy must read correctly against — « Ce lien ne peut pas être ouvert. » plus one reason
line plus « Ouvrir l'application sans ce lien », and no « ouvrir malgré tout » (ticket 09 §0's
whole-or-nothing rule).

**An unknown path 404s in `__root`'s French `notFoundComponent`. It does not redirect to `/`.**
The asymmetry with the `errorComponent` is deliberate and has a reason: for an unmatched path there
is no child match to render into, so replacing the Outlet's content is correct, whereas a search
error belongs to a match that exists. And a redirect would silently turn a mistyped or
chat-client-truncated link into a working app on somebody else's default scenario — indistinguishable
from a successful share, which is ticket 09 §0's failure in a new costume.

### 9. The URL is read once at load, then write-only

No component subscribes to `Route.useSearch()` after the load-time seed. The write side stays
ticket 09 §7's — ≈400 ms debounced `replace`, plus the synchronous flush at « Copier le lien ».

Ticket 09 §7 already collapsed history to one `replace`d entry and ruled that **Back is not undo**,
so there is nothing to read back from. If `useSearch` were the live state, every keystroke would
round-trip through the debounced navigate: the field would lag the keyboard by the debounce, and each
write would run the router's load cycle plus **3 `validateSearch` calls** (measured, §5) — and
ticket 07's drag path would push `x` into the URL at vsync. And measured, `useSearch` is not even a
faithful view of the schema (§4, fact 1), so treating it as state silently carries junk keys.

Stated cost: two representations can diverge. Hand-editing the address bar after load does nothing
until reload, which will confuse the hand-editing audience ticket 09 §1's readable keys were designed
for. That is already implied by a `replace`-only history, and the reload path re-seeds correctly.

### 10. « Fully offline » is one declared line

**No runtime network dependency after load. No service worker, no PWA manifest in v1.** The map's
"genuinely offline" was a *data* claim (no network for terrain or coefficients, `docs/conventions/
routing.md` notwithstanding); left undeclared it reads as installable-PWA and adds a caching layer
that can serve a **stale build of a safety tool**. No terrain ever crosses a network boundary, which
§5's client-side decode already guarantees structurally.

Static hosting is not a v1 requirement and is not decided here. Recorded for whoever asks later:
`spa: {}` (`start-plugin-core/dist/esm/schema.js:109-119`, prerendering the shell to `/_shell` with
`maskPath: '/'`) is the migration path, it changes no route code, and it must not be enabled
speculatively — under `ssr: false` it buys only a build-time prerender of a frame the server already
returns in 200.

### 11. `docs/conventions/routing.md` must be amended by this ticket

The doc asserts plain SSR (`docs/conventions/routing.md:3-4`, `:11-12`) and this ticket elects
route-level `ssr: false`. Left as-is, the binding doc contradicts the spec at the exact point where
the failure mode is invisible (§2's `defaultSsr` no-op). Amended the way ticket 03 amended
`testing.md`; replacement text handed forward.

### 12. What this hands forward

| Ticket | Obligation created here |
| --- | --- |
| [09](./09-url-state-schema-and-persistence.md) | **Amended**: §4's stated mechanism is wrong in this version — unknown keys never vanish on their own (`router.js:294`, `:1126-1133`); rewrite-on-load is the *only* thing that cleans the address bar, and it works under `search.strict = false` because a plain-object `search` replaces the whole bag (`router.js:1145` + `utils.js:17-20`) |
| [11](./11-validation-and-error-state-ux.md) | the ignored-keys banner is **client-computed on first mount from the raw query string** and can only name keys the client received (§6) · refusal copy must read correctly at **HTTP 200 after a Skeleton frame**, not as an immediate refusal · the `<noscript>` sentence (§3) · the error component's placement is layout-independent |
| [14](./14-first-run-scenario-and-defaults.md) | **no rewrite of a bare `/`** — the Session-restore meaning depends on it; the rewrite fires only when keys were dropped **or completed** (§14.8), and the completed scenario is emitted in canonical key order |
| [15](./15-responsive-and-narrow-screen-layout.md) | the Skeleton uses the **same CSS layout** as the app, so its reflow is covered by §4's rules and needs no separate narrow-screen treatment · this ticket owns the head, so §15.8's viewport meta and the `visualViewport` fallback land in `__root.tsx` |
| [10](./10-assemble-the-v1-build-spec.md) | `docs/conventions/routing.md` **amendment text** (§11) · CONTEXT.md term **Skeleton** · « no print route, no print stylesheet » into the map's **Out of scope** (§1) · record `Route.useSearch()` = raw ∪ validated as an implementation trap beside ticket 09 §1's key table · delete `src/routes/prototype.profile-view.tsx` + `src/routes/-prototype-07/` **after** porting the bench and §15 fixtures, and do not lift the prototype solver |
| [12](./12-sweep-performance-and-worker-decision.md) | its bench tripwire targets a route this ticket schedules for deletion — reword it against the ported Vitest bench before the prototype goes |

**Inherited from [Validation and error-state UX](./11-validation-and-error-state-ux.md)** — two
consequences of decisions already made above that §6/§13 do not spell out.

- **The ignored-keys strip's dismissal is component state and must not be persisted.** §6 already
  computes the strip client-side on first mount from the raw query string, before the rewrite
  `replace` fires; after that rewrite, a reload of the now-clean URL produces no strip at all, so
  there is nothing left for persistence to suppress, and a per-URL dismissal map would be Session
  surface nobody owns.
- **A successful Session restore announces nothing.** Ticket 09 §7 makes bare `/` *mean* « restore
  the session », so a notice for the defined normal case would be noise competing with the strip
  for the first paint.

**Inherited from [First-run scenario and defaults](./14-first-run-scenario-and-defaults.md)** — one
navigation call this ticket's mount-effect mechanism (§4) also has to serve.

« Réinitialiser le scénario » (ticket 14 §10) navigates to bare `/` with **`navigate({ to: '/',
replace: true })` — never `push`.** A pushed entry would make Back a near-undo of the reset, which
is only ≈99 % true given the ≈400 ms debounce (§9) and the writes suspended under « Saisie en
cours » (ticket 11 §4), and ticket 09 §7 already rules flatly that **Back is not undo**.
