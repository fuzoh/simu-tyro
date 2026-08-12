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
