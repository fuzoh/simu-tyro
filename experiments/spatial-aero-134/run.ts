/**
 * The two comparisons of the experiment (#134), row by row — `docs/simulation-theory.md` §18.6
 * (the tolerances, fixed before any difference is read) and §18.7 (the main comparison at one
 * unstretched length, and the separate one at one tension de pose).
 *
 * Rules this module exists to keep:
 *
 * - **Every row is solved twice**, at `SPATIAL.steps` and at twice as many, and reports the finer
 *   one with the gap between the two. A row whose gap, balance or jump is over its bar is a
 *   **failure that stays in the table** — never a difference between two models.
 * - **The main comparison holds `L₀`.** One length per line and geometry, resolved once by the
 *   engine without wind from the tension de pose, then identical for every wind, every load state
 *   and every variant. No length is recomputed behind a model's back.
 * - **The separate comparison holds the tension de pose** and reports the length each model
 *   needs. It is a different table and a different file.
 * - **A difference is taken only between two rows that both passed**, and it is called resolved
 *   only above the floor — the refinement bars are a tenth of it.
 * - **No percentage of nothing.** A relative difference is given only when the reference is
 *   clear of zero; otherwise the cell is empty and says so.
 */

import { resolveL0 } from "@/lib/sim";

import type { Vec3 } from "./aero.ts";
import type { BaseCase, GeometryCase, LineCase, Variant, WindCase } from "./cases.ts";
import type { Residuals } from "./measures.ts";
import type { SpatialInput, SpatialSolution } from "./solve.ts";

import {
  AIR_DENSITY,
  baseCase,
  baseCases,
  GEOMETRIES,
  GROUND,
  groundOf,
  LINES,
  LOAD_STATES,
  RIDER,
  riderForce,
  VARIANTS,
  WINDS,
} from "./cases.ts";
import { forceMeasures, loadMeasures, residuals, shapeMeasures } from "./measures.ts";
import { resolvePoseLength } from "./pose.ts";
import { SPATIAL, solveSpatial } from "./solve.ts";

/**
 * §18.6's bars. Fixed from the controls alone — the published no-wind fixtures and the closed
 * forms — before any difference between two aerodynamic models was computed.
 */
export const TOLERANCES = {
  /**
   * Global force balance and the rider's jump, N. The controls leave ≤ 4×10⁻⁹ N at 120 steps and
   * ≤ 3×10⁻¹⁰ N at 240; the bar is three orders above that and three under the force floor.
   */
  force: 1e-6,
  /** Global moment balance about A, N·m per metre of chord: the force bar times its lever arm. */
  momentPerMetre: 1e-6,
  /** Position continuity at the rider's node, m. */
  continuity: 1e-9,
  /** The greatest gap between the two step counts that a row may show. */
  refinement: { length: 1e-5, force: 1e-4 },
  /** Under these a difference between two models is not read: ten times the refinement bars. */
  floor: { length: 1e-4, force: 1e-3 },
  /** A reference smaller than these gets no percentage. */
  percent: { length: 0.1, force: 10 },
  /** The no-wind return to §15 and to the plane engine, relative — `testing.md`'s solved scalars. */
  reference: 4e-6,
} as const;

/** What one solved row reports. Forces in N, lengths in m, distributed loads in N/m. */
export type Outputs = {
  readonly TA: number;
  readonly TB: number;
  readonly Tmax: number;
  readonly HA: number;
  readonly reactionA: Vec3;
  readonly reactionB: Vec3;
  readonly sag: number;
  readonly rise: number;
  readonly sway: number;
  readonly combined: number;
  readonly clearance: number;
  readonly normalMean: number;
  readonly normalMax: number;
  readonly liftMean: number;
  readonly liftMax: number;
  readonly axialMean: number;
  readonly axialMax: number;
};

/** The outputs a refinement and a difference are taken on. */
export const FORCE_KEYS = ["TA", "TB", "Tmax", "HA"] as const;
export const LENGTH_KEYS = ["sag", "rise", "sway", "combined", "clearance"] as const;

export type RowStatus =
  | "ok"
  /** No equilibrium found at the first step count. Not a physical impossibility. */
  | "non convergé"
  /** No equilibrium found at twice the steps: the row has no refinement to show. */
  | "raffinement non résolu"
  /** The force balance, the moment balance, the jump or the continuity is over its bar. */
  | "bilan hors tolérance"
  /** The two step counts differ by more than the refinement bar. */
  | "raffinement hors tolérance"
  /** The tension de pose could not be inverted for this model. */
  | "pose non résolue";

export type Convention = "L0 fixe" | "tension de pose";

/** One row of either comparison. */
export type Row = {
  readonly convention: Convention;
  readonly base: BaseCase;
  readonly variant: Variant;
  /** The unstretched length the row is solved at, m; `NaN` when the pose was not resolved. */
  readonly L0: number;
  readonly status: RowStatus;
  /** What failed, in words; empty on a row that passed. */
  readonly detail: string;
  /** At twice `SPATIAL.steps`. `null` unless the row has an equilibrium at both step counts. */
  readonly outputs: Outputs | null;
  readonly residuals: Residuals | null;
  /**
   * The greatest gap between the two step counts, over the lengths and over the forces — the
   * two reactions included, each as the norm of its vector gap.
   */
  readonly refinement: { readonly length: number; readonly force: number } | null;
  readonly iterations: number;
};

/** A row's difference from its reference on one output. */
export type Difference = {
  /** `row − reference`, in the output's unit. */
  readonly absolute: number;
  /** `absolute / |reference|`, or `null` when the reference is too close to zero for a percentage. */
  readonly relative: number | null;
  /** Above §18.6's floor: a difference the tables read. */
  readonly resolved: boolean;
};

export type DifferenceKey = (typeof FORCE_KEYS)[number] | (typeof LENGTH_KEYS)[number];

/** The solver's input for one row. */
export function inputOf(
  line: LineCase,
  geometry: GeometryCase,
  wind: WindCase,
  variant: Variant,
  L0: number,
  rider: boolean,
): SpatialInput {
  return {
    L: geometry.L,
    h: geometry.h,
    L0,
    w: line.material.w,
    EA: line.material.EA,
    d: line.d,
    rho: AIR_DENSITY,
    wind: wind.components,
    aero: variant.aero,
    rider: rider ? { s: RIDER.fraction * L0, force: riderForce(line) } : null,
  };
}

/** Everything a solved line reports, read with the geometry's ground and the gabarit. */
export function outputsOf(solution: SpatialSolution, geometry: GeometryCase): Outputs {
  const forces = forceMeasures(solution);
  const shape = shapeMeasures(solution, groundOf(geometry), GROUND.gabarit);
  const loads = loadMeasures(solution);
  return {
    ...forces,
    ...shape,
    normalMean: loads.normal.mean,
    normalMax: loads.normal.max,
    liftMean: loads.lift.mean,
    liftMax: loads.lift.max,
    axialMean: loads.axial.mean,
    axialMax: loads.axial.max,
  };
}

/** The first residual over its bar, in words, or `null` when the equilibrium passes them all. */
export function balanceBreach(found: Residuals, chord: number): string | null {
  if (found.force > TOLERANCES.force) return `bilan des forces ${found.force.toExponential(2)} N`;
  if (found.moment > TOLERANCES.momentPerMetre * chord) {
    return `bilan des moments ${found.moment.toExponential(2)} N·m`;
  }
  if (found.jump > TOLERANCES.force) return `saut au passager ${found.jump.toExponential(2)} N`;
  if (found.continuity > TOLERANCES.continuity) {
    return `continuité au passager ${found.continuity.toExponential(2)} m`;
  }
  return null;
}

type Solved = Pick<
  Row,
  "status" | "detail" | "outputs" | "residuals" | "refinement" | "iterations"
>;

const FAILED = { outputs: null, residuals: null, refinement: null } as const;

/**
 * One equilibrium at both step counts, with its checks. The coarse solve is seeded by the
 * caller's neighbour when it has one, the fine solve by the coarse one.
 */
export function solveRow(input: SpatialInput, geometry: GeometryCase, seed?: Vec3): Solved {
  const coarse = solveSpatial(input, { steps: SPATIAL.steps, seed });
  if (!coarse.ok) {
    const { failure } = coarse;
    const detail =
      failure.kind === "no-convergence"
        ? `fermeture ${failure.closure.toExponential(2)} m après ${failure.iterations} itérations`
        : `entrée refusée : ${failure.field} = ${failure.value}`;
    const iterations = failure.kind === "no-convergence" ? failure.iterations : 0;
    return { ...FAILED, status: "non convergé", detail, iterations };
  }
  const { solution } = coarse;
  const fine = solveSpatial(input, {
    steps: 2 * SPATIAL.steps,
    seed: [solution.Fx[0], solution.Fy[0], solution.Fz[0]],
  });
  const spent = { iterations: solution.iterations + (fine.ok ? fine.solution.iterations : 0) };
  if (!fine.ok) {
    return {
      ...FAILED,
      ...spent,
      status: "raffinement non résolu",
      detail: `pas d'équilibre à ${2 * SPATIAL.steps} pas`,
    };
  }

  const outputs = outputsOf(fine.solution, geometry);
  const before = outputsOf(solution, geometry);
  const gap = (keys: readonly DifferenceKey[]): number =>
    Math.max(...keys.map((key) => Math.abs(outputs[key] - before[key])));
  // §18.6 holds every force reported to the bar: a reaction that has not settled in direction
  // moves no tension, so the two reactions are compared as vectors.
  const turn = (anchor: "reactionA" | "reactionB"): number =>
    Math.hypot(...outputs[anchor].map((component, k) => component - before[anchor][k]));
  const refinement = {
    length: gap(LENGTH_KEYS),
    force: Math.max(gap(FORCE_KEYS), turn("reactionA"), turn("reactionB")),
  };
  const found = residuals(fine.solution);
  const reported = { ...spent, outputs, residuals: found, refinement };

  const breach = balanceBreach(found, Math.hypot(input.L, input.h));
  if (breach !== null) return { ...reported, status: "bilan hors tolérance", detail: breach };
  if (
    refinement.length > TOLERANCES.refinement.length ||
    refinement.force > TOLERANCES.refinement.force
  ) {
    return {
      ...reported,
      status: "raffinement hors tolérance",
      detail: `écart ${refinement.length.toExponential(2)} m, ${refinement.force.toExponential(2)} N`,
    };
  }
  return { ...reported, status: "ok", detail: "" };
}

/**
 * The unstretched length of the main comparison: the engine's own inverse, **without wind**, of
 * the line's tension de pose at anchor A. One number per line and geometry.
 *
 * @throws Error when the engine cannot pose the line — a broken matrix, not a result.
 */
export function fixedLength(line: LineCase, geometry: GeometryCase): number {
  const resolved = resolveL0(
    { mode: "anchor", side: "A", T_target: line.poseTension },
    { L: geometry.L, h: geometry.h, ...line.material },
  );
  if (!resolved.ok) {
    throw new Error(`${line.id} on ${geometry.id}: no L0 for ${line.poseTension} N at anchor A`);
  }
  return resolved.value;
}

const seedOf = (row: Solved | undefined): Vec3 | undefined =>
  row?.outputs ? row.outputs.reactionA : undefined;

/**
 * §18.7's main comparison: every base case under every variant, at the one `L₀` of its line and
 * geometry. Rows come in the order of the cases, the reference variant first in each.
 *
 * @param cases the base cases to run — the whole matrix unless a test asks for a part of it.
 * @param variants the coefficient variants, reference first — the matrix's own unless a test
 *   builds another set.
 */
export function runFixedLength(
  cases: readonly BaseCase[] = baseCases(),
  variants: readonly Variant[] = VARIANTS,
): Row[] {
  const lengths = new Map<string, number>();
  const rows: Row[] = [];
  for (const base of cases) {
    const key = `${base.line.id}|${base.geometry.id}`;
    const L0 = lengths.get(key) ?? fixedLength(base.line, base.geometry);
    lengths.set(key, L0);
    let reference: Solved | undefined;
    for (const variant of variants) {
      const input = inputOf(base.line, base.geometry, base.wind, variant, L0, base.load.rider);
      const solved = solveRow(input, base.geometry, seedOf(reference));
      reference ??= solved;
      rows.push({ convention: "L0 fixe", base, variant, L0, ...solved });
    }
  }
  return rows;
}

/**
 * §18.7's separate comparison: for every line, geometry, wind and variant, the `L₀` at which the
 * unloaded line reads the tension de pose at A **under that wind and that model**, then the
 * unloaded and the loaded line at that length. The length is resolved at the finer step count,
 * the one the rows are reported at; the rows then go through the same checks as the main
 * comparison's, at both counts.
 *
 * @param part the lines, geometries, winds and variants to run — the whole matrix unless a test
 *   asks for a part of it.
 */
export function runPoseTension(
  part: {
    readonly lines?: readonly LineCase[];
    readonly geometries?: readonly GeometryCase[];
    readonly winds?: readonly WindCase[];
    readonly variants?: readonly Variant[];
  } = {},
): Row[] {
  const rows: Row[] = [];
  for (const line of part.lines ?? LINES) {
    for (const geometry of part.geometries ?? GEOMETRIES) {
      const start = fixedLength(line, geometry);
      for (const wind of part.winds ?? WINDS) {
        for (const variant of part.variants ?? VARIANTS) {
          const unposed = inputOf(line, geometry, wind, variant, start, false);
          const pose = resolvePoseLength(unposed, line.poseTension, start, {
            steps: 2 * SPATIAL.steps,
          });
          for (const load of LOAD_STATES) {
            const base = baseCase(line, geometry, load, wind);
            if (!pose.ok) {
              const { failure } = pose;
              rows.push({
                convention: "tension de pose",
                base,
                variant,
                L0: Number.NaN,
                ...FAILED,
                status: "pose non résolue",
                detail: `${failure.kind} à L0 = ${failure.L0.toFixed(4)} m`,
                iterations: 0,
              });
              continue;
            }
            const input = inputOf(line, geometry, wind, variant, pose.L0, load.rider);
            const { Fx, Fy, Fz } = pose.solution;
            const solved = solveRow(input, geometry, [Fx[0], Fy[0], Fz[0]]);
            rows.push({ convention: "tension de pose", base, variant, L0: pose.L0, ...solved });
          }
        }
      }
    }
  }
  return rows;
}

/**
 * `row − reference` on one output, or `null` when either row did not pass its checks — a failed
 * row has no difference to show.
 */
export function differenceOf(
  row: Row,
  reference: Row | undefined,
  key: DifferenceKey,
): Difference | null {
  if (reference === undefined || row.status !== "ok" || reference.status !== "ok") return null;
  if (row.outputs === null || reference.outputs === null) return null;
  const isForce = (FORCE_KEYS as readonly string[]).includes(key);
  const from = reference.outputs[key];
  const absolute = row.outputs[key] - from;
  const floor = isForce ? TOLERANCES.floor.force : TOLERANCES.floor.length;
  const smallest = isForce ? TOLERANCES.percent.force : TOLERANCES.percent.length;
  return {
    absolute,
    relative: Math.abs(from) >= smallest ? absolute / Math.abs(from) : null,
    resolved: Math.abs(absolute) >= floor,
  };
}

/**
 * How far the `L₀` of a row is from its reference's, m — in the separate comparison, the length
 * a model needs beyond the reference's for the same tension de pose (§18.7). Read on the unloaded
 * row, whose equilibrium is the one the length was solved on. `null` under the same rule as
 * {@link differenceOf}, resolved above the same floor; no percentage — a share of the whole line.
 */
export function lengthShift(row: Row, reference: Row | undefined): Difference | null {
  if (reference === undefined || row.status !== "ok" || reference.status !== "ok") return null;
  const absolute = row.L0 - reference.L0;
  return { absolute, relative: null, resolved: Math.abs(absolute) >= TOLERANCES.floor.length };
}

/**
 * How far a row's reaction at one anchor is from its reference's, as the **norm of the vector
 * difference** — a reaction that turns without growing still shows. `relative` is to the norm of
 * the reference's reaction. `null` under the same rule as {@link differenceOf}.
 */
export function reactionShift(
  row: Row,
  reference: Row | undefined,
  anchor: "reactionA" | "reactionB",
): Difference | null {
  if (reference === undefined || row.status !== "ok" || reference.status !== "ok") return null;
  if (row.outputs === null || reference.outputs === null) return null;
  const found = row.outputs[anchor];
  const from = reference.outputs[anchor];
  const absolute = Math.hypot(found[0] - from[0], found[1] - from[1], found[2] - from[2]);
  const size = Math.hypot(from[0], from[1], from[2]);
  return {
    absolute,
    relative: size >= TOLERANCES.percent.force ? absolute / size : null,
    resolved: absolute >= TOLERANCES.floor.force,
  };
}
