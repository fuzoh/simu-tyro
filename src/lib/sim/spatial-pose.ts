/**
 * The installation under wind — `docs/simulation-theory.md` §19.7 (one installation, one wind; the
 * tightness drivers read on the unloaded spatial line at the tensioning anchor `K`) and §19.10
 * (inverting them: the floor, the seed and the bracket, Illinois with bisection, the taut branch of
 * the tension de pose, and uniqueness **checked, not assumed**).
 *
 * Rules this module exists to keep:
 *
 * - **`L₀` is resolved once, under the Scenario's wind**, then kept for every loaded equilibrium
 *   (§19.12). Without wind this is `resolveL0`, unchanged (§19.16).
 * - **`H_K` is `F_x` at `K`**, the component along the horizontal A–B axis (#127 Q31) — not the
 *   horizontal norm, not the total tension; `T_K = |F|` at `K` is the tension de pose. Two drivers,
 *   two readings, never substituted.
 * - **A reversal is never resolved by picking a root.** Every reading taken while bracketing must
 *   move in the driver's direction beyond its noise band; otherwise the answer is `no-convergence`
 *   with `reason: "non-monotone"` (Q24). A local round trip proves no global uniqueness.
 * - **No cap on the slack.** The tests scan to `1,10·chord`; that window is not an installation
 *   limit, and none is applied here.
 */

import type { AnchorSide, Result, SpanGeometry, TightnessSpec } from "./parameterise.ts";
import type { LineAero, SolveError, SpatialSpanInput, SpatialState, SpatialWarm } from "./types.ts";

import { PARAMETERISE, refuseGeometry, resolveL0, tightnessFloor } from "./parameterise.ts";
import { residualTolerance } from "./solve.ts";
import { isAeroNil } from "./spatial-load.ts";
import { unloadedReadings } from "./spatial-sample.ts";
import { SPATIAL, solveSpatial } from "./spatial-solve.ts";

/** §19.10's constants. None is physical. */
export const SPATIAL_POSE = {
  /** The relative bracket on `L₀` at which Illinois stops (§19.10). */
  bracketTolerance: 1e-10,
  /** Evaluations the root search may spend before the bracket is called unresolved. */
  maxEvaluations: 200,
  /** The flèche's noise band, m — §19.9's refinement bar on a length. */
  sagNoise: 1e-5,
} as const;

/** The pose under wind: the unstretched length the driver resolved, and the unloaded state at it. */
export type SpatialPose = { readonly L0: number; readonly state: SpatialState };

type InverseSpec = Exclude<TightnessSpec, { mode: "length" }>;

/** One tightness driver as §19.10's search reads it. */
type Driver = {
  field: "H_target" | "T_target" | "D_target";
  target: number;
  read: (state: SpatialState) => number;
  /** The quantity falls as `L₀` grows from the floor: tensions do, the flèche does not. */
  falling: boolean;
  /** The tension de pose turns back up on a very slack line: only its taut branch is searched. */
  turns: boolean;
  boundKind: "min" | "max";
  /** The noise band at `L₀`, in the driver's own quantity (§19.10). */
  noise: (L0: number) => number;
};

function driverOf(spec: InverseSpec, span: SpanGeometry, side: AnchorSide): Driver {
  // §19.10: a length error `ε` reads `≈ EA·ε/L₀` in tension, and the inner solves are polished
  // to `10⁻³·tol(L)`.
  const tensionNoise = (L0: number) =>
    (span.EA * SPATIAL.polishFactor * residualTolerance(span.L)) / L0;
  if (spec.mode === "tension") {
    return {
      field: "H_target",
      target: spec.H_target,
      read: side === "A" ? (s) => s.HA : (s) => s.HB,
      falling: true,
      turns: false,
      boundKind: "max",
      noise: tensionNoise,
    };
  }
  if (spec.mode === "anchor") {
    return {
      field: "T_target",
      target: spec.T_target,
      read: spec.side === "A" ? (s) => s.TA : (s) => s.TB,
      falling: true,
      turns: true,
      boundKind: "max",
      noise: tensionNoise,
    };
  }
  return {
    field: "D_target",
    target: spec.D_target,
    read: (s) => unloadedReadings(s).sag.value,
    falling: false,
    turns: false,
    boundKind: "min",
    noise: () => SPATIAL_POSE.sagNoise,
  };
}

function targetOf(spec: InverseSpec): number {
  if (spec.mode === "tension") return spec.H_target;
  if (spec.mode === "anchor") return spec.T_target;
  return spec.D_target;
}

const FIELD = { tension: "H_target", anchor: "T_target", sag: "D_target" } as const;

/** A solved length the search has visited: the continuation's warm starts come from these. */
type Visit = { L0: number; value: number; state: SpatialState; warm: SpatialWarm };

const nonMonotone = (residual: number): SolveError => ({
  kind: "no-convergence",
  attempts: 1,
  residual,
  reason: "non-monotone",
});

/**
 * §19.7's drivers resolved to `L₀` under the Scenario's wind, and the unloaded spatial state there.
 *
 * - **No wind applied**: `resolveL0`, unchanged, and the closed-form state (§19.16).
 * - **`length`**: `L₀` as given — §5.4's floor still refuses — solved under the wind.
 * - **`tension`** (`H_K`), **`anchor`** (`T_K`), **`sag`** (`D`): §19.10's inversion.
 *
 * Refusals: a target beyond the floor's reading is `invalid-input` in the driving field, with the
 * **spatial** reading at the floor as its bound; an inner solve that fails is its own error; a
 * reversal is `no-convergence{reason:"non-monotone"}`; a target under the tension de pose's
 * minimum is `no-convergence{reason:"unreachable"}` (« Cible inatteignable »); a bracket that cannot
 * close is `no-convergence{reason:"unresolved"}`.
 *
 * @param side the tensioning anchor `K` the `tension` driver is read at; `anchor` carries its own.
 */
export function resolveSpatialL0(
  spec: TightnessSpec,
  span: SpanGeometry,
  aero: LineAero | null,
  side: AnchorSide,
): Result<SpatialPose, SolveError> {
  const unloaded = (L0: number): SpatialSpanInput => ({
    L: span.L,
    h: span.h,
    L0,
    w: span.w,
    EA: span.EA,
    strength: span.strength,
    aero,
    rider: null,
  });
  const at = (L0: number, warm?: SpatialWarm): Result<SpatialPose, SolveError> => {
    const solved = solveSpatial(unloaded(L0), warm);
    return solved.ok ? { ok: true, value: { L0, state: solved.state } } : solved;
  };

  if (isAeroNil(aero) || spec.mode === "length") {
    const plane = resolveL0(spec, span);
    return plane.ok ? at(plane.value) : plane;
  }

  const geometry = refuseGeometry(span);
  if (geometry) return { ok: false, error: geometry };
  const target = targetOf(spec);
  if (!Number.isFinite(target) || target <= 0) {
    return {
      ok: false,
      error: {
        kind: "invalid-input",
        field: FIELD[spec.mode],
        value: target,
        bound: 0,
        boundKind: "min",
      },
    };
  }

  const driver = driverOf(spec, span, side);
  const visits: Visit[] = [];
  const visit = (L0: number): Result<Visit, SolveError> => {
    let nearest: Visit | undefined;
    for (const v of visits) {
      if (nearest === undefined || Math.abs(v.L0 - L0) < Math.abs(nearest.L0 - L0)) nearest = v;
    }
    const solved = solveSpatial(unloaded(L0), nearest?.warm);
    if (!solved.ok) return solved;
    const v = { L0, value: driver.read(solved.state), state: solved.state, warm: solved.warm };
    visits.push(v);
    return { ok: true, value: v };
  };
  /** `> 0` on the floor's side of the target, `≤ 0` past it. */
  const gap = (value: number) => (driver.falling ? value - driver.target : driver.target - value);

  // 1. The floor (§5.4, geometric): its reading is the attainable bound, under this wind.
  const floor = tightnessFloor(span);
  const atFloor = visit(floor);
  if (!atFloor.ok) return atFloor;
  if (gap(atFloor.value.value) < 0) {
    return {
      ok: false,
      error: {
        kind: "invalid-input",
        field: driver.field,
        value: target,
        bound: atFloor.value.value,
        boundKind: driver.boundKind,
      },
    };
  }
  if (gap(atFloor.value.value) === 0)
    return { ok: true, value: { L0: floor, state: atFloor.value.state } };

  // 2. Seed and bracket: the plane engine's `L₀` for the same target, then the slack doubled.
  const chord = Math.hypot(span.L, span.h);
  const minimumSlack = chord * PARAMETERISE.seedSlackFraction;
  const seed = resolveL0(spec, span);
  let upper = seed.ok && seed.value > floor ? seed.value : floor + minimumSlack;
  let previous = atFloor.value;
  let before = previous;
  let bracket: { lo: Visit; hi: Visit } | null = null;
  for (let doubling = 0; doubling <= PARAMETERISE.maxDoublings && bracket === null; doubling++) {
    const reached = visit(upper);
    if (!reached.ok) return reached;
    const v = reached.value;
    if (gap(v.value) <= 0) {
      if (!driver.turns && reversed(driver, previous, v))
        return { ok: false, error: nonMonotone(gap(v.value)) };
      bracket = { lo: previous, hi: v };
      break;
    }
    if (driver.turns && v.value > previous.value + driver.noise(v.L0)) {
      const taut = tautBranch(driver, before, v, visit);
      if (!taut.ok) return taut;
      bracket = taut.value;
      break;
    }
    if (!driver.turns && reversed(driver, previous, v))
      return { ok: false, error: nonMonotone(gap(v.value)) };
    before = previous;
    previous = v;
    upper = chord + 2 * Math.max(upper - chord, minimumSlack);
  }
  if (bracket === null) {
    return {
      ok: false,
      error: {
        kind: "no-convergence",
        attempts: PARAMETERISE.maxDoublings,
        residual: gap(previous.value),
        reason: "unresolved",
      },
    };
  }

  // 3. Illinois false position, safeguarded by bisection, to a relative bracket of 10⁻¹⁰.
  let { lo, hi } = bracket;
  let fLo = gap(lo.value);
  let fHi = gap(hi.value);
  let side_ = 0;
  let width = hi.L0 - lo.L0;
  for (let k = 0; k < SPATIAL_POSE.maxEvaluations; k++) {
    if (fHi === 0 || hi.L0 - lo.L0 <= SPATIAL_POSE.bracketTolerance * hi.L0) {
      const best = Math.abs(gap(lo.value)) < Math.abs(gap(hi.value)) ? lo : hi;
      return { ok: true, value: { L0: best.L0, state: best.state } };
    }
    let m = (lo.L0 * fHi - hi.L0 * fLo) / (fHi - fLo);
    // Every third step, a bracket that has not halved is bisected: Illinois's guarantee.
    if (!(m > lo.L0 && m < hi.L0) || (k % 3 === 2 && hi.L0 - lo.L0 > width / 2)) {
      m = (lo.L0 + hi.L0) / 2;
    }
    if (k % 3 === 2) width = hi.L0 - lo.L0;
    const reached = visit(m);
    if (!reached.ok) return reached;
    const v = reached.value;
    const fm = gap(v.value);
    // §19.10's run-time guard: a reading between the two ends lies between their readings.
    const band = driver.noise(v.L0);
    if (fm > gap(lo.value) + band || (!driver.turns && fm < gap(hi.value) - band)) {
      return { ok: false, error: nonMonotone(fm) };
    }
    if (fm > 0) {
      lo = v;
      fLo = fm;
      if (side_ === 1) fHi /= 2;
      side_ = 1;
    } else {
      hi = v;
      fHi = fm;
      if (side_ === -1) fLo /= 2;
      side_ = -1;
    }
  }
  return {
    ok: false,
    error: {
      kind: "no-convergence",
      attempts: SPATIAL_POSE.maxEvaluations,
      residual: Math.min(Math.abs(gap(lo.value)), Math.abs(gap(hi.value))),
      reason: "unresolved",
    },
  };
}

/** A reading that moved against the driver's direction beyond its noise band (§19.10). */
function reversed(driver: Driver, from: Visit, to: Visit): boolean {
  const band = driver.noise(to.L0);
  return driver.falling ? to.value > from.value + band : to.value < from.value - band;
}

/** `(√5 − 1)/2` — the golden section. Arithmetic, not physics. */
const GOLDEN = (Math.sqrt(5) - 1) / 2;

/**
 * §19.10 item 4: the tension de pose falls from the floor, bottoms out and rises again. Its minimum
 * lies between `before` and `after`; a golden-section search walks toward it and stops at the
 * first length that already reads at or under the target, which closes the bracket on the taut
 * branch. A target under the minimum is unreachable.
 */
function tautBranch(
  driver: Driver,
  before: Visit,
  after: Visit,
  visit: (L0: number) => Result<Visit, SolveError>,
): Result<{ lo: Visit; hi: Visit }, SolveError> {
  let lower = before.L0;
  let upper = after.L0;
  const read = (L0: number) => visit(L0);
  let near = read(upper - GOLDEN * (upper - lower));
  if (!near.ok) return near;
  let far = read(lower + GOLDEN * (upper - lower));
  if (!far.ok) return far;
  for (let k = 0; k < PARAMETERISE.maxBisections; k++) {
    if (near.value.value <= driver.target)
      return { ok: true, value: { lo: before, hi: near.value } };
    if (far.value.value <= driver.target) return { ok: true, value: { lo: before, hi: far.value } };
    if (upper - lower <= PARAMETERISE.bracketTolerance * upper) break;
    if (near.value.value < far.value.value) {
      upper = far.value.L0;
      far = near;
      near = read(upper - GOLDEN * (upper - lower));
      if (!near.ok) return near;
    } else {
      lower = near.value.L0;
      near = far;
      far = read(lower + GOLDEN * (upper - lower));
      if (!far.ok) return far;
    }
  }
  const least = Math.min(near.value.value, far.value.value);
  return {
    ok: false,
    error: {
      kind: "no-convergence",
      attempts: PARAMETERISE.maxBisections,
      residual: least - driver.target,
      reason: "unreachable",
    },
  };
}
