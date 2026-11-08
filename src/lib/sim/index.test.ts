import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as sim from "./index.ts";

const simDir = fileURLToPath(new URL(".", import.meta.url)).replace(/[/\\]$/, "");
const srcDir = dirname(dirname(simDir));

/** Every `.ts` / `.tsx` file under `src/`, absolute, in directory order. */
function sourceFiles(): string[] {
  return readdirSync(srcDir, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".ts") || entry.endsWith(".tsx"))
    .map((entry) => join(srcDir, entry));
}

/**
 * Block comments are stripped before the scan: this codebase's docblocks cite `src/lib/sim/…`
 * paths constantly, and a citation is not an import.
 */
function importSpecifiers(source: string): string[] {
  const code = source.replaceAll(/\/\*[\s\S]*?\*\//g, "");
  const specifiers: string[] = [];
  // `import x from "…"`, `export … from "…"`, `import "…"` and `import("…")` all reduce to a
  // `from` or an `import` immediately before the quoted specifier.
  const pattern = /\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
  for (const match of code.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

/**
 * The module a specifier names, as an extension-less absolute path — or `null` for a package.
 * `@/…` is the tsconfig alias for `src/…`; `index` is folded into its directory so that
 * `@/lib/sim`, `@/lib/sim/index.ts` and `../sim/index.ts` all reduce to the barrel.
 */
function resolveSpecifier(fromFile: string, specifier: string): string | null {
  let target: string;
  if (specifier.startsWith("@/")) target = join(srcDir, specifier.slice(2));
  else if (specifier.startsWith(".")) target = resolve(dirname(fromFile), specifier);
  else return null;

  target = target.replace(/\.tsx?$/, "");
  return target.endsWith(`${sep}index`) ? dirname(target) : target;
}

describe("the engine's one import path", () => {
  it("is reached by no deep import from outside src/lib/sim", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      if (file === simDir || file.startsWith(simDir + sep)) continue;
      for (const specifier of importSpecifiers(readFileSync(file, "utf8"))) {
        const target = resolveSpecifier(file, specifier);
        if (target !== null && target.startsWith(simDir + sep)) {
          offenders.push(`${relative(srcDir, file)} → ${specifier}`);
        }
      }
    }

    // The whole point of the barrel: app code imports `@/lib/sim`, never `@/lib/sim/solve.ts`.
    expect(offenders).toEqual([]);
  });

  it("scans a src tree it actually found", () => {
    // Guards the check above against silently passing on an empty file list.
    const files = sourceFiles();
    expect(files.length).toBeGreaterThan(20);
    expect(files.filter((file) => file.startsWith(simDir + sep)).length).toBeGreaterThan(10);
  });

  it("would catch a deep import if one appeared", () => {
    // The detector, tested on synthetic sources rather than trusted — a scan that cannot fail is
    // the « convention nobody enforces » this gate replaces.
    const caller = join(srcDir, "routes", "index.tsx");
    const deep = ["@/lib/sim/solve.ts", "../lib/sim/materials/steel.ts", "@/lib/sim/verdict"];
    for (const specifier of deep) {
      const target = resolveSpecifier(caller, specifier);
      expect(target?.startsWith(simDir + sep)).toBe(true);
    }

    const barrel = ["@/lib/sim", "@/lib/sim/index.ts", "../lib/sim"];
    for (const specifier of barrel) {
      expect(resolveSpecifier(caller, specifier)).toBe(simDir);
    }

    expect(resolveSpecifier(caller, "react")).toBeNull();
    expect(importSpecifiers(`import { sweep } from "@/lib/sim";\n`)).toEqual(["@/lib/sim"]);
    expect(importSpecifiers(`export * from "./types.ts";\n`)).toEqual(["./types.ts"]);
    expect(importSpecifiers(`const m = await import("@/lib/sim");\n`)).toEqual(["@/lib/sim"]);
    expect(importSpecifiers(`/* voir from "@/lib/sim/solve.ts" */\n`)).toEqual([]);
  });
});

describe("the public surface", () => {
  it("carries § 2's function surface", () => {
    // One entry per line of § 2's *Function surface* that the barrel owns, plus the two material
    // derivations § 2's *Module layout* puts behind it. Written as static property accesses
    // rather than a name lookup, so a renamed export fails to compile before it fails to run.
    const surface = {
      solveSpan: sim.solveSpan,
      sampleCable: sim.sampleCable,
      solveAtHorizontalPosition: sim.solveAtHorizontalPosition,
      sweep: sim.sweep,
      zGroundAt: sim.zGroundAt,
      evaluateClearance: sim.evaluateClearance,
      resolveL0: sim.resolveL0,
      unloadedSag: sim.unloadedSag,
      evaluateVerdict: sim.evaluateVerdict,
      isRegimeAvailable: sim.isRegimeAvailable,
      isFamilyAllowed: sim.isFamilyAllowed,
      deriveSteel: sim.deriveSteel,
      deriveTextile: sim.deriveTextile,
      steelFormula: sim.steelFormula,
      resolveSteelValues: sim.resolveSteelValues,
    };
    const notFunctions = Object.entries(surface)
      .filter(([, value]) => typeof value !== "function")
      .map(([name]) => name);
    expect(notFunctions).toEqual([]);
    expect(Object.keys(sim)).toEqual(expect.arrayContaining(Object.keys(surface)));
  });

  it("withholds the three names § 2 calls internal API with a public name", () => {
    // « not part of `index.ts`, but a named export from its module because §15 requires tests to
    // reach it directly. Same for `sweepGrid` and the Jacobian. »
    const withheld = ["levelSpanShortcut", "sweepGrid", "jacobianAt"];
    expect(withheld.filter((name) => Object.keys(sim).includes(name))).toEqual([]);
  });

  it("re-exports the constants and catalogues the app reads, and no solver internals", () => {
    expect(Object.keys(sim)).toEqual(
      expect.arrayContaining([
        "SWEEP",
        "CLEARANCE",
        "REGIMES",
        "TERMINATIONS",
        "VERDICT",
        "STEEL",
        "TEXTILE",
        // `SOLVER` joined them at A11: § 7's `[ Copier le diagnostic ]` payload prints §5.3's
        // **tolerance beside the residual**, and that tolerance is L-scaled past 1000 m, so a
        // residual quoted without it cannot be interpreted. It is the constants table — a value
        // to *print*, not a formula to re-derive upstairs — and the barrel is « the only path app
        // code imports from », so the alternative was a second copy of `1e-6` in the app.
        "SOLVER",
      ]),
    );
    // `POINT_LOAD` is a seed set, and the other two are a bench and an inversion's own tuning.
    const internal = ["POINT_LOAD", "PARAMETERISE", "BENCH_CELLS"];
    expect(internal.filter((name) => Object.keys(sim).includes(name))).toEqual([]);
  });

  it("holds no declaration of its own", () => {
    // The barrel re-exports and declares nothing: no constant here can drift from a theory §.
    const source = readFileSync(join(simDir, "index.ts"), "utf8").replaceAll(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    expect(source).not.toMatch(/^\s*(?:export\s+)?(?:const|let|var|function|class)\s/m);
  });
});

describe("§ 2's module layout — eleven modules by concept, the ride (#89) and the two material files", () => {
  const modules = [
    "index.ts",
    "types.ts",
    "catenary.ts",
    "jacobian.ts",
    "solve.ts",
    "loads.ts",
    "sweep.ts",
    "parameterise.ts",
    "terrain.ts",
    "clearance.ts",
    "verdict.ts",
    "dynamics.ts",
    "materials/steel.ts",
    "materials/textile.ts",
  ];

  it.each(modules)("%s opens on a header comment citing its §", (module) => {
    const source = readFileSync(join(simDir, module), "utf8");
    const header = /^\/\*\*[\s\S]*?\*\//.exec(source);
    expect(header).not.toBeNull();
    expect(header?.[0]).toMatch(/§/);
  });

  it("has no materials/index.ts", () => {
    // § 2: the two families share « no base module, no common helper and no `materials/index.ts`
    // barrel ». Adding one is the specific tidying that undoes the A/B separation.
    const entries = readdirSync(join(simDir, "materials"));
    expect(entries).not.toContain("index.ts");
  });
});
