/**
 * The command of the experiment (#134): solve both comparisons, run the controls, write the
 * tables and the report — `docs/simulation-theory.md` §18.
 *
 * ```bash
 * bun experiments/spatial-aero-134/matrix.ts            # write the tables and the report
 * bun experiments/spatial-aero-134/matrix.ts --check    # compare with the files present, write nothing
 * bun experiments/spatial-aero-134/matrix.ts --out /tmp/run --report /tmp/run/report.md
 * ```
 *
 * Rules this module exists to keep:
 *
 * - **One command, no interface.** Nothing is read but `cases.ts`; nothing is asked.
 * - **The output is a function of the inputs.** No date, no machine, no duration is written, so
 *   that `--check` can tell whether the committed tables are still what the code produces.
 * - **The exit code says whether the experiment may be read**: `0` when every control passed and
 *   every row solved, `1` when `--check` found a difference, `2` when a control or a row failed —
 *   the files are written all the same, as the diagnostic.
 * - **The coordinates are a selection.** Every row's outputs are in the tables; the nodes of
 *   every row would be half a million lines, so `shapes.csv` holds the lines of the stronger wind
 *   under the reference and the largest probes, every {@link SHAPES.every} steps.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Row } from "./run.ts";

import { COEFFICIENTS, REFERENCE_VARIANT, WIND_SPEEDS } from "./cases.ts";
import { runControls } from "./controls.ts";
import { buildReport, controlsCsv, inputsCsv, rowsCsv } from "./report.ts";
import { inputOf, runFixedLength, runPoseTension } from "./run.ts";
import { SPATIAL, solveSpatial } from "./solve.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");

/** Which lines `shapes.csv` holds, and how densely. */
export const SHAPES = {
  /** The stronger of the two winds. */
  speed: Math.max(...WIND_SPEEDS),
  /** The reference and the largest probe of each added force, both signs and both laws. */
  variants: [
    REFERENCE_VARIANT.id,
    ...COEFFICIENTS.liftLaws.flatMap((law) =>
      ["+", "-"].map(
        (sign) =>
          `NL-${law === "binormal" ? "b" : "y"}${sign}${Math.max(...COEFFICIENTS.liftMagnitudes)}`,
      ),
    ),
    `NA-${Math.max(...COEFFICIENTS.axial)}`,
  ],
  /** One node out of this many, the ends of each piece always kept. */
  every: 40,
} as const;

const number = (value: number): string => String(Number(value.toPrecision(6)));

/** The coordinates and the tension along the selected lines of the main comparison. */
export function shapesCsv(fixed: readonly Row[]): string {
  const lines = ["cas,variante,S_m,x_m,y_m,z_m,T_N"];
  for (const row of fixed) {
    if (row.base.wind.speed !== SHAPES.speed || !SHAPES.variants.includes(row.variant.id)) continue;
    if (row.outputs === null) continue;
    const { line, geometry, wind, load } = row.base;
    const solved = solveSpatial(inputOf(line, geometry, wind, row.variant, row.L0, load.rider), {
      steps: 2 * SPATIAL.steps,
      seed: row.outputs.reactionA,
    });
    if (!solved.ok) continue;
    const { S, x, y, z, Fx, Fy, Fz, pieces } = solved.solution;
    for (const { from, to } of pieces) {
      for (let i = from; i <= to; i++) {
        if ((i - from) % SHAPES.every !== 0 && i !== to) continue;
        const T = Math.hypot(Fx[i], Fy[i], Fz[i]);
        lines.push(
          [row.base.id, row.variant.id, ...[S[i], x[i], y[i], z[i], T].map(number)].join(","),
        );
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : resolve(process.argv[at + 1] ?? fallback);
}

function main(): void {
  const out = option("out", join(HERE, "results"));
  const report = option(
    "report",
    join(ROOT, "docs/references/spatial-wind/lift-axial-drag-experiment.md"),
  );
  const check = process.argv.includes("--check");

  const started = performance.now();
  const fixed = runFixedLength();
  const pose = runPoseTension();
  const controls = runControls(fixed);
  const files = new Map<string, string>([
    [join(out, "fixed-l0.csv"), rowsCsv(fixed)],
    [join(out, "pose-tension.csv"), rowsCsv(pose)],
    [join(out, "controls.csv"), controlsCsv(controls)],
    [join(out, "inputs.csv"), inputsCsv()],
    [join(out, "shapes.csv"), shapesCsv(fixed)],
    [report, buildReport({ fixed, pose, controls })],
  ]);

  const failedControls = controls.filter(({ pass }) => !pass).length;
  const failedRows = [...fixed, ...pose].filter(({ status }) => status !== "ok").length;
  console.log(
    `${fixed.length} + ${pose.length} lignes, ${controls.length} grandeurs de contrôle, ` +
      `${((performance.now() - started) / 1000).toFixed(1)} s`,
  );
  console.log(`contrôles en échec : ${failedControls} ; lignes en échec : ${failedRows}`);

  let stale = 0;
  for (const [path, content] of files) {
    if (check) {
      const same = existsSync(path) && readFileSync(path, "utf8") === content;
      if (!same) stale++;
      console.log(`${same ? "identique" : "DIFFÉRENT"}  ${path}`);
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
      console.log(`écrit  ${path}`);
    }
  }

  if (stale > 0) process.exitCode = 1;
  else if (failedControls > 0 || failedRows > 0) process.exitCode = 2;
}

if (import.meta.main) main();
