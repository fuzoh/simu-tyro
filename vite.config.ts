/// <reference types="vitest/config" />

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
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
