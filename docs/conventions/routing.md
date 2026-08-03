# Routing & app shell

TanStack Start with SSR and the file-based router (`@tanstack/router-plugin` in
`vite.config.ts`).

- Routes are files under `src/routes/`. Each exports a route created with
  `createFileRoute`.
- `src/routes/__root.tsx` is the app shell; `src/router.tsx` builds the router.
- `src/routeTree.gen.ts` is **generated** — never edit it. It regenerates when the
  dev server runs or the Vite plugin builds. If it looks stale, run `bun run dev`.
- `rsc: false` — no React Server Components. Everything is a normal React 19
  component; SSR happens through TanStack Start.

`bun run dev` serves on port 3000.
