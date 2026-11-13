/// <reference types="vitest/config" />

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

import { inlineAsset } from "./src/lib/app/inline-asset.ts";
import { APP_PAGES } from "./src/lib/app/pages.ts";

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
  // No font is inlined into the stylesheet the document waits on (#128): `src/lib/app/inline-asset.ts`.
  build: { assetsInlineLimit: inlineAsset },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      /**
       * **SPA mode — the app ships as static files.** Nothing here needs a server: every app Page
       * sets `ssr: false`, there is no `createServerFn` and no server route, and computation never
       * crosses a network boundary. The build gains a prerender step that renders the root route
       * with its first child's `pendingComponent` — the app layout's, i.e. Statique's Skeleton, the
       * Page at `/` — into a single HTML file; `dist/server/` is still emitted and is simply not
       * deployed.
       *
       * `outputPath: "/index"` instead of the default `/_shell`: a static host serves `index.html`
       * at a directory URL, and GitHub Pages runs Jekyll, which would drop an `_`-prefixed file
       * outright. `public/.nojekyll` covers `assets/`; this covers the shell.
       *
       * `maskPath` stays at its default `/` — the shell is prerendered *as* `/`, which is why a
       * Skeleton lands in the HTML rather than an empty `<body>`.
       */
      spa: { enabled: true, prerender: { outputPath: "/index" } },
      /**
       * **The documentation pages are prerendered as full HTML**, unlike the app. `/docs/*`
       * renders markdown from the repository with no client state and no `ResizeObserver`, so the
       * provenance argument that puts `ssr: false` on the app Pages does not apply, and a shared
       * `/docs/modele#s-10-4` should land on the text with a **200** rather than on `404.html`.
       * `autoStaticPathsDiscovery` stays off: `/` must remain the SPA shell, and `$slug` is not a
       * static path — the documentation pages are listed here by hand, the app Pages from their
       * table.
       */
      prerender: { enabled: true, autoStaticPathsDiscovery: false, crawlLinks: false },
      pages: [
        /**
         * **Every app Page is prerendered with its own Skeleton** (ADR-0002), so a direct
         * `/avance?…` on GitHub Pages lands with a **200** on Avancé's frame — not with a 404 on
         * `404.html`, which carries the shell's. The search never reaches a static host, so one
         * file per Page serves every Scenario. `/` is the shell itself, prerendered above.
         */
        ...APP_PAGES.filter(({ path }) => path !== "/").map(({ path }) => ({
          path,
          prerender: { enabled: true, outputPath: `${path}/index.html` },
        })),
        { path: "/docs", prerender: { enabled: true, outputPath: "/docs/index.html" } },
        ...["modele", "algorithme", "simulation", "cable", "corde"].map((slug) => ({
          path: `/docs/${slug}`,
          prerender: { enabled: true, outputPath: `/docs/${slug}/index.html` },
        })),
      ],
    }),
    viteReact(),
    /**
     * **CesiumJS's workers and assets, beside the app** — the Vue 3D's renderer (#95) loads them by
     * URL at run time (terrain decoding runs in a Worker), so they are files, not modules. Served
     * from `node_modules` under `bun run dev`, copied into `dist/client/cesium/` by the build; the
     * renderer points `CESIUM_BASE_URL` at `<base>cesium/`. Nothing fetches them until the 3D is
     * chosen. The four folders are the ones Cesium's own Vite example copies.
     */
    viteStaticCopy({
      targets: ["Workers", "ThirdParty", "Assets", "Widgets"].map((folder) => ({
        src: `node_modules/cesium/Build/Cesium/${folder}`,
        dest: "cesium",
        // `node_modules/cesium/Build/Cesium/` off the front: `cesium/Workers/…`, not the whole path.
        rename: { stripBase: 4 },
      })),
    }),
  ],
  test: {
    // `node`, always. Vitest is unit-only here: no jsdom, no component tests,
    // no `@vitest-environment` docblock anywhere — voir docs/conventions/testing.md.
    environment: "node",
    // Colocated, one test file per source file, `.ts` only (a `.tsx` test would be
    // a component test, which this project does not have). No `tests/` directory.
    include: ["src/**/*.test.ts"],
    benchmark: {
      // `benchmark.enabled` stays unset: only `vitest bench` turns it on, so a bench never
      // executes inside `bun run test`.
      include: ["src/**/*.bench.ts"],
    },
  },
});

export default config;
