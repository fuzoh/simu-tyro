/**
 * §19's rolling sweep — `docs/simulation-theory.md` §19.12 (one slot per grid position, holes kept,
 * the forward march then one reverse retry, the trajectory split at holes) over §6.2's grid, with
 * §19.6's sharing between two identical members.
 *
 * Rules this module exists to keep:
 *
 * - **Nothing is compacted.** `slots[i]` belongs to `grid[i]`; a position that did not converge is a
 *   `null` slot with its failure, never an interpolation, a neighbour or the plane model (Q24).
 * - **A retry is a full solve.** A hole is retried once, warm from the next solved position, to the
 *   same bars — not filled.
 * - **No wind is §6.2's sweep, lifted.** `sweep()` runs unchanged and each step becomes a slot, so
 *   every wind-free figure stays bit for bit (§19.16).
 * - **The rider position under wind is a slot.** The views and the descent read slots; moving the
 *   cursor solves nothing (§19.12).
 */

import type {
  RiderLoad,
  SpanInput,
  SpatialSlot,
  SpatialSpanInput,
  SpatialStep,
  SpatialSweepResult,
  SpatialState,
  SpatialWarm,
  SweepResult,
  SweepStep,
  SolveError,
  Vec3,
} from "./types.ts";

import { riderEllipsoid } from "./aero.ts";
import { isAeroNil } from "./spatial-load.ts";
import { SPATIAL, solveSpatialWith } from "./spatial-solve.ts";
import { sweep, sweepGrid, SWEEP } from "./sweep.ts";

const vec = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

/** The member's load at one position: `P_rider/n_c`'s weight part, N — §6.2's `riderP`. */
function riderP(rider: RiderLoad): number {
  return rider.share * rider.weight;
}

/** A solved state as its slot. */
function slotOf(state: SpatialState): SpatialStep {
  const node = state.node as NonNullable<SpatialState["node"]>;
  return {
    sD: node.sP,
    rD: node.rD,
    FA: state.FA,
    FB: state.FB,
    TA: state.TA,
    TB: state.TB,
    Tmax: state.Tmax,
    HA: state.HA,
    HB: state.HB,
    Tminus: node.Tminus,
    Tplus: node.Tplus,
    Fminus: node.Fminus,
    Pext: node.Pext,
  };
}

/**
 * §6.2's step as a slot: `F_A = (H, 0, V₀)`, the node in the plane, `T⁻` and `T⁺` from §6.1's
 * `V` either side of the node. `H` and `V₀` are carried unchanged, so a lifted slot re-samples
 * through §4.1 to the very numbers `sweep()` produced.
 */
function lift(step: SweepStep, input: SpanInput, P: number): SpatialStep {
  const { H, V0 } = step;
  const below = V0 + input.w * step.sD;
  const VB = V0 + input.w * input.L0 + P;
  return {
    sD: step.sD,
    rD: vec(step.xD, 0, step.zD),
    FA: vec(H, 0, V0),
    FB: vec(H, 0, VB),
    TA: step.TA,
    TB: step.TB,
    Tmax: Math.max(step.TA, step.TB),
    HA: H,
    HB: H,
    Tminus: Math.hypot(H, below),
    Tplus: Math.hypot(H, below + P),
    Fminus: vec(H, 0, below),
    Pext: vec(0, 0, -P),
  };
}

/**
 * §19.12's sweep of one member under the rider, on the `L₀` the pose resolved.
 *
 * @param input the **unloaded** member (`rider: null`), wind and `L₀` included.
 * @param rider the whole rider and this member's share (§19.6): `share` `1/2` for two identical
 *   members, `1` for the « one member carries all » case.
 * @param n §6.2's uniform step count; the grid adds its tails.
 * @throws RangeError when `input.rider` is not `null` — a caller bug, as `sweep()`'s loads are.
 */
export function sweepSpatial(
  input: SpatialSpanInput,
  rider: RiderLoad,
  n: number = SWEEP.steps,
): SpatialSweepResult {
  if (input.rider !== null) {
    throw new RangeError("sweepSpatial: input.rider must be null — the sweep places the rider");
  }
  const grid = sweepGrid(input.L0, n);
  const slots: SpatialSlot[] = Array.from({ length: grid.length }, () => null);
  const failures: { index: number; sD: number; error: SolveError }[] = [];
  const result = (): SpatialSweepResult => {
    failures.sort((a, b) => a.index - b.index);
    const solved = slots.reduce((count, slot) => count + (slot === null ? 0 : 1), 0);
    return {
      grid,
      slots,
      failures,
      coverage: solved / grid.length,
      input,
      rider,
      steps: SPATIAL.steps,
    };
  };

  if (isAeroNil(input.aero)) {
    const plane: SpanInput = {
      L: input.L,
      h: input.h,
      L0: input.L0,
      w: input.w,
      EA: input.EA,
      loads: [],
    };
    const P = riderP(rider);
    const swept = sweep({ ...plane, strength: input.strength }, P, n);
    // `sweep()` keeps its steps in grid order and its failures by index: rebuild the alignment.
    let k = 0;
    for (const failure of swept.failures) failures.push(failure);
    const holes = new Set(swept.failures.map((f) => f.index));
    for (let i = 0; i < grid.length; i++) {
      if (holes.has(i)) continue;
      slots[i] = lift(swept.steps[k++], plane, P);
    }
    return result();
  }

  // Each position accepted at `tol(L)`, as the plane sweep's are: §19.9 polishes the pose only.
  const at = (i: number, warm: SpatialWarm | undefined) =>
    solveSpatialWith({ ...input, rider: { ...rider, sP: grid[i] } }, warm, { polishFactor: 1 });

  // The forward march, each position warm from the last solved ones (§19.8 seed 1): their `F_A`
  // extrapolated linearly in `S_D` from the two last solved positions, and the last Jacobian.
  const warms: (SpatialWarm | undefined)[] = Array.from({ length: grid.length }, () => undefined);
  const failed: { index: number; error: SolveError }[] = [];
  let last = -1;
  let beforeLast = -1;
  for (let i = 0; i < grid.length; i++) {
    const solved = at(i, continuation(grid, warms, i, last, beforeLast));
    if (!solved.ok) {
      failed.push({ index: i, error: solved.error });
      continue;
    }
    slots[i] = slotOf(solved.state);
    warms[i] = solved.warm;
    beforeLast = last;
    last = i;
  }

  // One reverse retry per hole, warm from the next solved position — from B back, so a hole that
  // fills warms the one before it.
  for (let f = failed.length - 1; f >= 0; f--) {
    const { index, error } = failed[f];
    let next: SpatialWarm | undefined;
    for (let j = index + 1; j < grid.length && next === undefined; j++) next = warms[j];
    const retried = next === undefined ? null : at(index, next);
    if (retried?.ok) {
      slots[index] = slotOf(retried.state);
      warms[index] = retried.warm;
    } else {
      failures.push({
        index,
        sD: grid[index],
        error: retried?.ok === false ? retried.error : error,
      });
    }
  }
  return result();
}

/**
 * §19.8's seed (1) along the march: the last solved position's Jacobian, and its `F_A` moved by the
 * secant through the two last solved positions to `grid[i]`. A predictor of the continuation —
 * Newton still owns the answer, and a seed that fails costs one attempt (§19.8).
 */
function continuation(
  grid: Float64Array,
  warms: readonly (SpatialWarm | undefined)[],
  i: number,
  last: number,
  beforeLast: number,
): SpatialWarm | undefined {
  const a = last < 0 ? undefined : warms[last];
  if (a === undefined) return undefined;
  const b = beforeLast < 0 ? undefined : warms[beforeLast];
  if (b === undefined) return a;
  const f = (grid[i] - grid[last]) / (grid[last] - grid[beforeLast]);
  return {
    FA: vec(
      a.FA.x + f * (a.FA.x - b.FA.x),
      a.FA.y + f * (a.FA.y - b.FA.y),
      a.FA.z + f * (a.FA.z - b.FA.z),
    ),
    jacobian: a.jacobian,
  };
}

/**
 * The state of slot `i`, rebuilt for sampling — **no solve**: the slot's `F_A` and the sweep's
 * echoed input are all §19.8's re-shot needs. `null` on a hole.
 */
export function slotState(result: SpatialSweepResult, i: number): SpatialState | null {
  const slot = result.slots[i];
  if (slot === null || slot === undefined) return null;
  const { input, rider } = result;
  return {
    method: isAeroNil(input.aero) ? "closed-form" : "shooting",
    input: { ...input, rider: { ...rider, sP: slot.sD } },
    steps: result.steps,
    FA: slot.FA,
    FB: slot.FB,
    TA: slot.TA,
    TB: slot.TB,
    Tmax: slot.Tmax,
    HA: slot.HA,
    HB: slot.HB,
    node: {
      sP: slot.sD,
      rD: slot.rD,
      Tminus: slot.Tminus,
      Tplus: slot.Tplus,
      Fminus: slot.Fminus,
      Pext: slot.Pext,
    },
    ellipsoid: riderEllipsoid(rider.hRider),
    // The slot keeps the position's scalars, not its solve's diagnostics.
    closure: Number.NaN,
    iterations: 0,
  };
}

/**
 * §19.12's trajectory — the lieu du chariot: the solved `r_D` in grid order, **split into runs at
 * every hole**, so no segment bridges a position that did not converge. Each run lists its grid
 * indices; it is the locus of successive trolley positions, not the shape of one loaded line.
 */
export function trajectoryRuns(result: SpatialSweepResult): number[][] {
  const runs: number[][] = [];
  let run: number[] = [];
  for (let i = 0; i < result.slots.length; i++) {
    if (result.slots[i] === null) {
      if (run.length > 0) runs.push(run);
      run = [];
      continue;
    }
    run.push(i);
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

/**
 * §19.11's coupe projection of a sweep, as §6.2's {@link SweepResult}: one {@link SweepStep} per
 * **solved** slot, in grid order, with the holes in `failures` and `coverage` unchanged — the shape
 * the Verdict's scan, the coupe and the strip already read. Per slot: `x_D`, `z_D` the node's own;
 * `T_A`, `T_B` the reactions' norms; `H` and `θ` read on the A side of the trolley, `F_x⁻` and
 * `atan2(F_z⁻, F_x⁻)` — the slope of the line's `(x, z)` projection at the node; `V₀ = F_z(0)`.
 *
 * A projection, not a second result: `y` and the lateral forces stay on the spatial slots. Without
 * wind every slot is §6.2's step lifted, so this returns `sweep()`'s own steps, bit for bit (§19.16).
 */
export function planeSweep(result: SpatialSweepResult): SweepResult {
  const steps: SweepStep[] = [];
  for (const slot of result.slots) {
    if (slot === null) continue;
    steps.push({
      sD: slot.sD,
      xD: slot.rD.x,
      zD: slot.rD.z,
      H: slot.Fminus.x,
      V0: slot.FA.z,
      TA: slot.TA,
      TB: slot.TB,
      theta: Math.atan2(slot.Fminus.z, slot.Fminus.x),
    });
  }
  return {
    grid: result.grid,
    steps,
    failures: result.failures.map((failure) => ({ ...failure })),
    coverage: result.coverage,
  };
}
