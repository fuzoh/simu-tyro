/// <reference types="vitest/config" />

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Where the built app will be *served* from — `/` in dev and on any root-domain host, `/simu-tyro/`
 * on a GitHub Pages **project** site. It is an env var and not a constant because it is a property
 * of the host, not of the app: `.github/workflows/deploy.yml` sets it, a custom domain unsets it,
 * and `bun run dev` never sees it. Vite hands the same value to client code as
 * `import.meta.env.BASE_URL`, which is where `src/router.tsx` reads the router's `basepath` — one
 * value, two consumers, no second place to forget.
 */
const base = process.env.BASE_PATH ?? "/";

const config = defineConfig({
  base,
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      /**
       * **SPA mode — the app ships as static files.** Nothing here needs a server: the one route
       * already sets `ssr: false`, there is no `createServerFn` and no server route, and terrain
       * never crosses a network boundary. The build gains a prerender step that renders the root
       * route with the index route's `pendingComponent` — the Skeleton — into a single HTML file;
       * `dist/server/` is still emitted and is simply not deployed.
       *
       * `outputPath: "/index"` instead of the default `/_shell`: a static host serves `index.html`
       * at a directory URL, and GitHub Pages runs Jekyll, which would drop an `_`-prefixed file
       * outright. `public/.nojekyll` covers `assets/`; this covers the shell.
       *
       * `maskPath` stays at its default `/` — the shell is prerendered *as* the one route, which is
       * why the Skeleton lands in the HTML rather than an empty `<body>`.
       */
      spa: { enabled: true, prerender: { outputPath: "/index" } },
      /**
       * **The documentation pages are prerendered as full HTML**, unlike the app. `/docs/*`
       * renders markdown from the repository with no client state and no `ResizeObserver`, so the
       * provenance argument that puts `ssr: false` on `/` does not apply, and a shared
       * `/docs/modele#s-10-4` should land on the text with a **200** rather than on `404.html`.
       * `autoStaticPathsDiscovery` stays off: `/` must remain the SPA shell, and `$slug` is not a
       * static path — the five pages are listed here, from the same registry the router uses.
       */
      prerender: { enabled: true, autoStaticPathsDiscovery: false, crawlLinks: false },
      pages: [
        { path: "/docs", prerender: { enabled: true, outputPath: "/docs/index.html" } },
        ...["modele", "algorithme", "simulation", "cable", "corde"].map((slug) => ({
          path: `/docs/${slug}`,
          prerender: { enabled: true, outputPath: `/docs/${slug}/index.html` },
        })),
      ],
    }),
    viteReact(),
  ],
  test: {
    // `node`, always. Vitest is unit-only here: no jsdom, no component tests,
    // no `@vitest-environment` docblock anywhere — voir docs/conventions/testing.md.
    environment: "node",
    // Colocated, one test file per source file, `.ts` only (a `.tsx` test would be
    // a component test, which this project does not have). No `tests/` directory.
    include: ["src/**/*.test.ts"],
    // The suite is empty until the §15 fixtures land; an empty run is a pass, not a failure.
    passWithNoTests: true,
    benchmark: {
      // `benchmark.enabled` stays unset: `vitest bench` replaces `test.include` while it
      // runs, so a bench never executes inside `bun run test`.
      include: ["src/**/*.bench.ts"],
    },
  },
});

export default config;
