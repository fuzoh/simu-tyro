/**
 * The controls of the prototype (#134) — `docs/simulation-theory.md` §18.6: what the spatial shot
 * must return **before** any difference between two aerodynamic models is read. Every expected
 * value comes from somewhere else than the shot: §15's published fixtures, the plane engine, a
 * closed form, or a symmetry.
 *
 * Rules this module exists to keep:
 *
 * - **A control is a row, passed or failed, with both numbers.** The report prints them all; a
 *   failed one gates the conclusions (`report.ts`).
 * - **§15 is quoted from the engine's fixture module**, never retyped and never taken from
 *   `docs/references/` (`docs/conventions/testing.md` — Fixture rules).
 * - **A control whose line does not solve is a failed control**, with `NaN` where the value
 *   would be — not a skipped one. So is a control the matrix gives no case to: one that reads
 *   the rows picks its case by what the case is, never by an identifier, and fails when no row
 *   answers.
 * - **The matrix's own health is counted, not sampled**: every row's status, and the greatest
 *   residual and refinement gap over the rows that have them.
 */

import { solveSpan } from "@/lib/sim";
import { Z1, Z2, Z3, Z4, Z5 } from "@/lib/sim/__fixtures__/theory-15.ts";

import type { AeroCoefficients, Vec3 } from "./aero.ts";
import type { DifferenceKey, Row, RowStatus } from "./run.ts";
import type { SpatialInput, SpatialSolution } from "./solve.ts";

import { NO_AERO } from "./aero.ts";
import { AIR_DENSITY, isReference, riderForce, RIDER } from "./cases.ts";
import { forceMeasures, shapeMeasures } from "./measures.ts";
import { FORCE_KEYS, inputOf, LENGTH_KEYS, TOLERANCES } from "./run.ts";
import { SPATIAL, solveSpatial } from "./solve.ts";

/** §18.6's bar on the closed forms, relative: they are exact and the integration leaves less. */
export const CLOSED_FORM_BAR = 1e-8;

/**
 * The seven controls of §18.6, in its order. Control 2 is two families: the calm cases against
 * the plane engine, and their variants against the reference.
 */
export type ControlFamily =
  | "§15 sans vent"
  | "moteur plan sans vent"
  | "variantes sans vent"
  | "traînée normale seule"
  | "portance seule"
  | "traînée axiale seule"
  | "charge uniforme"
  | "miroir";

/** One quantity of one control: what was expected, what the shot returned, and the bar. */
export type ControlRow = {
  readonly family: ControlFamily;
  /** Which case of the family, e.g. `Z4` or a matrix case's identifier. */
  readonly subject: string;
  readonly quantity: string;
  readonly unit: string;
  readonly expected: number;
  /** `NaN` when the line did not solve. */
  readonly found: number;
  /** Absolute, in `unit`. */
  readonly bar: number;
  readonly pass: boolean;
  /** Where `expected` comes from. */
  readonly source: string;
};

/** Whether a value is within an absolute bar of what was expected. `NaN` never is. */
export function judge(expected: number, found: number, bar: number): boolean {
  return Number.isFinite(found) && Math.abs(found - expected) <= bar;
}

type Check = readonly [
  quantity: string,
  unit: string,
  expected: number,
  found: number,
  bar: number,
];

const rowsOf = (
  family: ControlFamily,
  subject: string,
  source: string,
  checks: readonly Check[],
): ControlRow[] =>
  checks.map(([quantity, unit, expected, found, bar]) => ({
    family,
    subject,
    quantity,
    unit,
    expected,
    found,
    bar,
    pass: judge(expected, found, bar),
    source,
  }));

/** A bar relative to the expected value. */
const within = (expected: number, relative: number): number => Math.abs(expected) * relative;

/** A flat ground far below: the controls read no garde, only the shape against A–B. */
const shapeOf = (solution: SpatialSolution) =>
  shapeMeasures(
    solution,
    { kind: "profile", xs: Float64Array.of(0, solution.input.L), zs: Float64Array.of(-1e3, -1e3) },
    0,
  );

/** A line of the controls: no wind, no aerodynamic term, unless a control sets them. */
const bare = (line: Pick<SpatialInput, "L" | "h" | "L0" | "w" | "EA">): SpatialInput => ({
  ...line,
  d: 0.012,
  rho: AIR_DENSITY,
  wind: { along: 0, across: 0 },
  aero: NO_AERO,
  rider: null,
});

/** The finer of the two step counts the matrix reports: the controls are judged on the same. */
const solve = (input: SpatialInput, seed?: Vec3): SpatialSolution | null => {
  const result = solveSpatial(input, { steps: 2 * SPATIAL.steps, seed });
  return result.ok ? result.solution : null;
};

/** What a control reads off a solved line; every field `NaN` when there is none. */
function reading(solution: SpatialSolution | null) {
  if (solution === null) {
    const nan = Number.NaN;
    return {
      H: nan,
      V0: nan,
      VB: nan,
      TA: nan,
      TB: nan,
      Tmax: nan,
      sag: nan,
      rise: nan,
      sway: nan,
      xP: nan,
      zP: nan,
    };
  }
  const last = solution.S.length - 1;
  const node = solution.pieces[0].to;
  return {
    H: solution.Fx[0],
    V0: solution.Fz[0],
    VB: solution.Fz[last],
    ...forceMeasures(solution),
    ...shapeOf(solution),
    // The rider's node, when the line has one: the end of the first piece.
    xP: solution.x[node],
    zP: solution.z[node],
  };
}

/** §18.6 control 1: §15's Z1–Z5 with every aerodynamic coefficient at zero. */
function theoryFixtures(): ControlRow[] {
  const bar = TOLERANCES.reference;
  const rows: ControlRow[] = [];
  const add = (subject: string, source: string, checks: readonly Check[]) =>
    rows.push(...rowsOf("§15 sans vent", subject, source, checks));
  const scalar = (quantity: string, expected: number, found: number): Check => [
    quantity,
    quantity.startsWith("flèche") || quantity.startsWith("x") || quantity.startsWith("z")
      ? "m"
      : "N",
    expected,
    found,
    within(expected, bar),
  ];

  const z1 = reading(solve(bare(Z1.in)));
  add("Z1", Z1.source, [
    scalar("H", Z1.out.H, z1.H),
    scalar("V₀", Z1.out.V0, z1.V0),
    scalar("V_B", Z1.out.VB, z1.VB),
    scalar("T_max", Z1.out.Tmax, z1.Tmax),
    scalar("flèche", -Z1.out.zMin, z1.sag),
  ]);

  const z2 = reading(solve(bare(Z2.in)));
  add("Z2", Z2.source, [
    scalar("H", Z2.out.H, z2.H),
    scalar("V₀", Z2.out.V0, z2.V0),
    scalar("T_A", Z2.out.TA, z2.TA),
    scalar("T_B", Z2.out.TB, z2.TB),
    scalar("flèche", -Z2.out.zMin, z2.sag),
  ]);

  const z3 = reading(solve(bare(Z3.in)));
  add("Z3", Z3.source, [
    scalar("H", Z3.out.H, z3.H),
    scalar("V₀", Z3.out.V0, z3.V0),
    scalar("V_B", Z3.out.VB, z3.VB),
    scalar("T_A", Z3.out.TA, z3.TA),
    scalar("T_B", Z3.out.TB, z3.TB),
    // §15 prints this one to five figures: the bar is its own rounding, half a unit of the last.
    ["flèche", "m", Z3.out.D, z3.sag, 5e-5],
  ]);

  const loaded = (fixture: typeof Z4 | typeof Z5, s: number): SpatialInput => ({
    ...bare(fixture.in),
    rider: { s, force: [0, 0, -fixture.in.P] },
  });
  const z4 = reading(solve(loaded(Z4, Z4.out.sP)));
  add("Z4", Z4.source, [
    scalar("H", Z4.out.H, z4.H),
    scalar("V₀", Z4.out.V0, z4.V0),
    scalar("V_B", Z4.out.VB, z4.VB),
    scalar("T_A", Z4.out.TA, z4.TA),
    scalar("T_B", Z4.out.TB, z4.TB),
    scalar("z au passager", Z4.out.zD, z4.zP),
  ]);

  const z5 = reading(solve(loaded(Z5, Z5.in.sD)));
  add("Z5", Z5.source, [
    scalar("H", Z5.out.H, z5.H),
    scalar("V₀", Z5.out.V0, z5.V0),
    scalar("x au passager", Z5.out.xD, z5.xP),
    scalar("z au passager", Z5.out.zD, z5.zP),
  ]);
  return rows;
}

/**
 * §18.6 control 2, on the main comparison's own rows: every calm case against the plane engine,
 * and every variant of a calm case against its reference — a wind of zero leaves no model apart.
 */
function calmCases(fixed: readonly Row[]): ControlRow[] {
  const rows: ControlRow[] = [];
  const nan = Number.NaN;
  const calm = fixed.filter((row) => row.base.wind.speed === 0);
  const references = calm.filter((row) => isReference(row.variant));
  if (references.length === 0) {
    // No calm case to return to: the control cannot be made, which is not a pass.
    const subject = "aucun cas sans vent dans la matrice";
    return [
      ...rowsOf("moteur plan sans vent", subject, "`solveSpan`, moteur plan (§4–§6)", [
        ["T_A", "N", nan, nan, 0],
      ]),
      ...rowsOf("variantes sans vent", subject, "sans vent, les modèles coïncident", [
        ["plus grand écart de force", "N", 0, nan, TOLERANCES.floor.force],
      ]),
    ];
  }
  for (const row of references) {
    const { line, geometry, load } = row.base;
    const plane = solveSpan({
      L: geometry.L,
      h: geometry.h,
      L0: row.L0,
      w: line.material.w,
      EA: line.material.EA,
      loads: load.rider ? [{ P: -riderForce(line)[2], s: RIDER.fraction * row.L0 }] : [],
    });
    const found = row.outputs;
    const expected = plane.ok ? plane.state : { H: nan, TA: nan, TB: nan, Tmax: nan };
    const check = (quantity: string, value: number, got: number): Check => [
      quantity,
      "N",
      value,
      got,
      within(value, TOLERANCES.reference),
    ];
    rows.push(
      ...rowsOf("moteur plan sans vent", row.base.id, "`solveSpan`, moteur plan (§4–§6)", [
        check("H", expected.H, found?.HA ?? nan),
        check("T_A", expected.TA, found?.TA ?? nan),
        check("T_B", expected.TB, found?.TB ?? nan),
        check("T_max", expected.Tmax, found?.Tmax ?? nan),
      ]),
    );

    // The greatest gap any other variant of this calm case shows from the reference.
    const others = calm.filter(
      (candidate) => candidate.base.id === row.base.id && candidate.variant.id !== row.variant.id,
    );
    const gap = (keys: readonly DifferenceKey[]): number => {
      if (found === null) return nan;
      let greatest = 0;
      for (const { outputs } of others) {
        if (outputs === null) return nan;
        for (const key of keys) greatest = Math.max(greatest, Math.abs(outputs[key] - found[key]));
      }
      return greatest;
    };
    rows.push(
      ...rowsOf(
        "variantes sans vent",
        row.base.id,
        "sans vent, toute force aérodynamique est nulle : les modèles coïncident",
        [
          ["plus grand écart de longueur", "m", 0, gap(LENGTH_KEYS), TOLERANCES.floor.length],
          ["plus grand écart de force", "N", 0, gap(FORCE_KEYS), TOLERANCES.floor.force],
        ],
      ),
    );
  }
  return rows;
}

/** The weightless line of the three closed forms: `T` is what the anchors are set to carry. */
const WEIGHTLESS = { T: 2000, L0: 100, EA: 1e7, d: 0.012, U: 20 } as const;

/** `½·ρ·C·d·U²`, N/m — the load of a closed form, computed from the inputs and not by `aero.ts`. */
const pressureLoad = (C: number): number =>
  0.5 * AIR_DENSITY * C * WEIGHTLESS.d * WEIGHTLESS.U * WEIGHTLESS.U;

/** §18.6 controls 3–5: the three closed forms on a line without weight. */
function closedForms(): ControlRow[] {
  const { T, L0, EA, d, U } = WEIGHTLESS;
  const stretched = (1 + T / EA) * L0;
  const weightless = (
    L: number,
    wind: SpatialInput["wind"],
    aero: AeroCoefficients,
  ): SpatialInput => ({
    ...bare({ L, h: 0, L0, w: 0, EA }),
    d,
    wind,
    aero,
  });
  const exact = (quantity: string, unit: string, expected: number, found: number): Check => [
    quantity,
    unit,
    expected,
    found,
    within(expected, CLOSED_FORM_BAR),
  ];
  const rows: ControlRow[] = [];

  // 3. Normal drag alone in a pure crossflow: a catenary of parameter `T/p` in the horizontal plane.
  {
    const p = pressureLoad(1.2);
    const tau = (p * stretched) / (2 * T);
    const L = ((2 * T) / p) * Math.asinh(tau);
    const sway = (T / p) * (Math.sqrt(1 + tau * tau) - 1);
    // A rough start, not the answer: the tangent at A is `(1, τ, 0)/√(1 + τ²)`.
    const found = reading(
      solve(weightless(L, { along: 0, across: U }, { ...NO_AERO, normal: 1.2 }), [
        T,
        0.5 * T * tau,
        0,
      ]),
    );
    rows.push(
      ...rowsOf(
        "traînée normale seule",
        "sans poids, 20 m/s de travers, C_D⊥ = 1,2",
        "§18.6 contrôle 3 : T constant, L = (2T/p)·asinh(pΣ/2T)",
        [
          exact("T_A", "N", T, found.TA),
          exact("T_B", "N", T, found.TB),
          exact("déport", "m", sway, found.sway),
          ["flèche", "m", 0, found.sag, CLOSED_FORM_BAR * L],
        ],
      ),
    );
  }

  // 4. Lift alone, binormal law, in a pure crossflow: a circular arc of radius `T/p`, lifted.
  {
    const p = pressureLoad(0.5);
    const R = T / p;
    const L = 2 * R * Math.sin(stretched / (2 * R));
    const rise = R * (1 - Math.cos(stretched / (2 * R)));
    const found = reading(
      solve(weightless(L, { along: 0, across: U }, { ...NO_AERO, lift: 0.5 }), [
        T,
        0,
        (0.5 * T * stretched) / (2 * R),
      ]),
    );
    rows.push(
      ...rowsOf(
        "portance seule",
        "sans poids, 20 m/s de travers, C_L = +0,5, loi binormale",
        "§18.6 contrôle 4 : arc de cercle R = T/p",
        [
          exact("T_A", "N", T, found.TA),
          exact("T_B", "N", T, found.TB),
          exact("remontée", "m", rise, found.rise),
          ["déport", "m", 0, found.sway, CLOSED_FORM_BAR * L],
        ],
      ),
    );
  }

  // 5. Axial drag alone, wind along a taut level line: `T_A − T_B = ½·ρ·C_t·d·|U|·U·L`.
  for (const along of [U, -U]) {
    const L = 100.1;
    const drop = pressureLoad(0.1) * Math.sign(along) * L;
    const found = reading(
      solve(weightless(L, { along, across: 0 }, { ...NO_AERO, axial: 0.1 }), [
        EA * (L / L0 - 1),
        0,
        0,
      ]),
    );
    rows.push(
      ...rowsOf(
        "traînée axiale seule",
        `sans poids, 20 m/s ${along > 0 ? "de dos" : "de face"}, C_t = 0,1`,
        "§18.6 contrôle 5 : T_A − T_B = ½·ρ·C_t·d·|U|·U·L",
        [
          exact("T_A − T_B", "N", drop, found.TA - found.TB),
          ["déport", "m", 0, found.sway, CLOSED_FORM_BAR * L],
        ],
      ),
    );
  }
  return rows;
}

/** §18.6 control 6: Z1's catenary tilted by a lateral load — `w = 3`, `p_y = 4`, so `w' = 5`. */
function uniformLoad(): ControlRow[] {
  const found = reading(solve({ ...bare({ ...Z1.in, w: 3 }), prescribed: [0, 4, 0] }));
  const bar = TOLERANCES.reference;
  const sag = -Z1.out.zMin;
  return rowsOf(
    "charge uniforme",
    "Z1 avec w = 3 N/m et p_y = 4 N/m",
    `${Z1.source}, chaînette inclinée de atan(4/3) autour de A–B`,
    [
      ["H", "N", Z1.out.H, found.H, within(Z1.out.H, bar)],
      ["T_max", "N", Z1.out.Tmax, found.Tmax, within(Z1.out.Tmax, bar)],
      ["flèche", "m", 0.6 * sag, found.sag, within(0.6 * sag, bar)],
      ["déport", "m", 0.8 * sag, found.sway, within(0.8 * sag, bar)],
    ],
  );
}

/** The first of the candidates whose key is the greatest, keys compared entry by entry. */
function foremost<T>(candidates: readonly T[], key: (candidate: T) => readonly number[]): T | null {
  let best: T | null = null;
  let bestKey: readonly number[] = [];
  for (const candidate of candidates) {
    const candidateKey = key(candidate);
    const at = candidateKey.findIndex((value, k) => value !== bestKey[k]);
    if (best === null || (at !== -1 && candidateKey[at] > bestKey[at])) {
      best = candidate;
      bestKey = candidateKey;
    }
  }
  return best;
}

/**
 * The row §18.6's mirror is taken on, picked by what it is and not by a name: under the variant
 * with the largest lift coefficient and, at that lift, the largest axial one; on the case with a
 * crosswind component that has the most to mirror — a rider, inclined anchors, a wind that is
 * also axial, then the strongest crosswind. `null` when the matrix holds no row with both a lift
 * and a crosswind: nothing there has a mirror image to differ from.
 */
export function mirrorSubject(fixed: readonly Row[]): Row | null {
  const mirrored = fixed.filter(
    ({ base, variant }) => variant.aero.lift !== 0 && base.wind.components.across !== 0,
  );
  const lifted = foremost(mirrored, ({ variant }) => [variant.aero.lift, variant.aero.axial]);
  if (lifted === null) return null;
  return foremost(
    mirrored.filter(({ variant }) => variant.id === lifted.variant.id),
    ({ base }) => [
      Number(base.load.rider),
      Number(base.geometry.h !== 0),
      Number(base.wind.components.along !== 0),
      Math.abs(base.wind.components.across),
    ],
  );
}

/** §18.6 control 7: one case of the matrix against its mirror image in the plane `y = 0`. */
function mirror(fixed: readonly Row[]): ControlRow[] {
  const row = mirrorSubject(fixed);
  const nan = Number.NaN;
  const { refinement } = TOLERANCES;
  // No subject, or one without an equilibrium: the four quantities fail, none is left out.
  const outputs = row?.outputs ?? { TA: nan, Tmax: nan, sag: nan, sway: nan };
  let mirrored = reading(null);
  if (row?.outputs) {
    const { line, geometry, wind, load } = row.base;
    const input = inputOf(line, geometry, wind, row.variant, row.L0, load.rider);
    mirrored = reading(
      solve({
        ...input,
        wind: { along: input.wind.along, across: -input.wind.across },
        aero: { ...input.aero, lift: -input.aero.lift },
      }),
    );
  }
  return rowsOf(
    "miroir",
    row === null
      ? "aucun cas de la matrice n'a à la fois une portance et un vent traversier"
      : `${row.base.id}, ${row.variant.id}${row.outputs === null ? ` (${row.status})` : ""}`,
    "§18.6 contrôle 7 : vent traversier et signe de C_L inversés",
    [
      ["T_A", "N", outputs.TA, mirrored.TA, refinement.force],
      ["T_max", "N", outputs.Tmax, mirrored.Tmax, refinement.force],
      ["flèche", "m", outputs.sag, mirrored.sag, refinement.length],
      ["déport", "m", -outputs.sway, mirrored.sway, refinement.length],
    ],
  );
}

/**
 * Every control of §18.6, in its order.
 *
 * @param fixed the rows of the main comparison — controls 2 and 7 read them rather than solve
 *   the same lines again.
 */
export function runControls(fixed: readonly Row[]): ControlRow[] {
  return [
    ...theoryFixtures(),
    ...calmCases(fixed),
    ...closedForms(),
    ...uniformLoad(),
    ...mirror(fixed),
  ];
}

/** The health of one comparison: every status counted, and the worst of each residual. */
export type MatrixHealth = {
  readonly rows: number;
  readonly statuses: Readonly<Record<RowStatus, number>>;
  /** The greatest value over the rows that have residuals; `0` when none has. */
  readonly worst: {
    readonly closure: number;
    readonly force: number;
    /** Per metre of chord, to read against its bar. */
    readonly momentPerMetre: number;
    readonly jump: number;
    readonly continuity: number;
    readonly refinementLength: number;
    readonly refinementForce: number;
  };
};

export function matrixHealth(rows: readonly Row[]): MatrixHealth {
  const statuses: Record<RowStatus, number> = {
    ok: 0,
    "non convergé": 0,
    "raffinement non résolu": 0,
    "bilan hors tolérance": 0,
    "raffinement hors tolérance": 0,
    "pose non résolue": 0,
  };
  const worst = {
    closure: 0,
    force: 0,
    momentPerMetre: 0,
    jump: 0,
    continuity: 0,
    refinementLength: 0,
    refinementForce: 0,
  };
  for (const row of rows) {
    statuses[row.status]++;
    if (row.residuals !== null) {
      const chord = Math.hypot(row.base.geometry.L, row.base.geometry.h);
      worst.closure = Math.max(worst.closure, row.residuals.closure);
      worst.force = Math.max(worst.force, row.residuals.force);
      worst.momentPerMetre = Math.max(worst.momentPerMetre, row.residuals.moment / chord);
      worst.jump = Math.max(worst.jump, row.residuals.jump);
      worst.continuity = Math.max(worst.continuity, row.residuals.continuity);
    }
    if (row.refinement !== null) {
      worst.refinementLength = Math.max(worst.refinementLength, row.refinement.length);
      worst.refinementForce = Math.max(worst.refinementForce, row.refinement.force);
    }
  }
  return { rows: rows.length, statuses, worst };
}
