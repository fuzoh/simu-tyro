# A7 · The app shell — one route, `ssr: false`, the Skeleton

Stage: A7
Status: open
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
  shell, leaving no way back.
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
