/**
 * §11's clearance over §19's sweep — `docs/simulation-theory.md` §19.13 (the profile under A–B
 * extruded sideways, `z_terrain(x, y) = z_profil(x)`; a vertical garde with the whole gabarit; every
 * terrain vertex and every zone edge the line crosses, read on the Hermite interpolant) and §11
 * (the reduction, the Zones d'ancrage, the two contact kinds).
 *
 * Rules this module exists to keep:
 *
 * - **Aligned to the grid.** The per-step arrays have one entry per grid position, like the sweep's
 *   slots; a hole reads `NaN` and is judged by nothing. The minimum is over the solved positions
 *   only, and is not established over the traverse when one is missing (§19.13–§19.14).
 * - **Extruded, not surveyed.** The ground under a displaced point is the profile at its `x` — a
 *   hypothesis, not the ground actually overflown; no garde on a side slope, no 3-D obstacle
 *   distance (#118, Q16).
 * - **`x(S)` need not be monotone under wind**, so a zone edge is evaluated at every crossing
 *   between two nodes, not at the first.
 * - **No wind is §11's `evaluateClearance`, unchanged** — its figures, bit for bit (§19.16).
 */

import type { ClearanceResult, SpatialSweepResult, SweepStep, Terrain } from "./types.ts";

import { CLEARANCE, evaluateClearance } from "./clearance.ts";
import { isAeroNil } from "./spatial-load.ts";
import { hermiteCoefficients, sampleSpatial } from "./spatial-sample.ts";
import { slotState } from "./spatial-sweep.ts";
import { zGroundAt } from "./terrain.ts";

/** Iterations of the safeguarded false position that finds `t` where the interpolant crosses `x`. */
const CROSSING_STEPS = 60;

/** `c₀ + c₁·t + c₂·t² + c₃·t³` from `c[at..at+3]`. */
function cubicAt(c: Float64Array, at: number, t: number): number {
  return c[at] + t * (c[at + 1] + t * (c[at + 2] + t * c[at + 3]));
}

/**
 * The `t ∈ [0, 1]` where a segment's Hermite `x(t)` (coefficients `c[0..3]`) equals `target`, its
 * two ends bracketing it — Illinois false position, safeguarded by bisection.
 */
function crossing(c: Float64Array, target: number): number {
  let lo = 0;
  let hi = 1;
  let fLo = cubicAt(c, 0, 0) - target;
  let fHi = cubicAt(c, 0, 1) - target;
  if (fLo === 0) return 0;
  if (fHi === 0) return 1;
  let side = 0;
  let t = 0.5;
  for (let k = 0; k < CROSSING_STEPS; k++) {
    t = (lo * fHi - hi * fLo) / (fHi - fLo);
    if (!(t > lo && t < hi)) t = (lo + hi) / 2;
    const f = cubicAt(c, 0, t) - target;
    if (Math.abs(f) <= 1e-12 || hi - lo < 1e-15) return t;
    if (f > 0 === fHi > 0) {
      hi = t;
      fHi = f;
      if (side === 1) fLo /= 2;
      side = 1;
    } else {
      lo = t;
      fLo = f;
      if (side === -1) fHi /= 2;
      side = -1;
    }
  }
  return t;
}

/** The first index of a sorted `xs` whose value is strictly greater than `x`. */
function firstAbove(xs: Float64Array, x: number): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * §19.13's clearance over a spatial sweep.
 *
 * @param swept the sweep, holes included.
 * @param terrain §11's profile under A–B, extruded sideways.
 * @param hRider the whole vertical gabarit, m — the ellipsoid lies within it (Q40).
 * @param anchorZone the Zones d'ancrage's width, m (§11, #106).
 */
export function evaluateSpatialClearance(
  swept: SpatialSweepResult,
  terrain: Terrain,
  hRider: number,
  anchorZone: number = 0,
): ClearanceResult {
  const count = swept.grid.length;
  const perStep = new Float64Array(count).fill(Number.NaN);
  const perStepX = new Float64Array(count).fill(Number.NaN);
  const perStepCable = new Uint8Array(count);
  const perStepJudged = new Uint8Array(count);

  if (isAeroNil(swept.input.aero)) {
    return planeClearance(swept, terrain, hRider, anchorZone, {
      perStep,
      perStepX,
      perStepCable,
      perStepJudged,
    });
  }

  const { L } = swept.input;
  const zoned = anchorZone > 0;
  const zoneEnd = zoned ? anchorZone : Number.NEGATIVE_INFINITY;
  const zoneStart = zoned ? L - anchorZone : Number.POSITIVE_INFINITY;
  const edges = zoned && zoneEnd < zoneStart ? [zoneEnd, zoneStart] : [];
  const ground = terrain.kind === "profile" ? terrain : null;

  let hMin = Number.POSITIVE_INFINITY;
  let atX = Number.NaN;
  let atStepIndex = -1;
  let wholeMin = Number.POSITIVE_INFINITY;
  let wholeAtX = Number.NaN;
  let wholeAtStepIndex = -1;
  let cableInGround = false;
  const segment = new Float64Array(12);

  for (let i = 0; i < count; i++) {
    const state = slotState(swept, i);
    if (state === null) continue;
    const s = sampleSpatial(state);

    let stepMin = Number.POSITIVE_INFINITY;
    let stepMinX = Number.NaN;
    let stepWhole = Number.POSITIVE_INFINITY;
    let stepWholeX = Number.NaN;
    let cable = 0;
    /** One point of the line over the extruded ground at `zg`. */
    const point = (x: number, z: number, zg: number) => {
      const above = z - zg;
      const clear = above - hRider;
      if (clear < stepWhole) {
        stepWhole = clear;
        stepWholeX = x;
      }
      if (x > zoneEnd && x < zoneStart) {
        if (above < 0) cable = 1;
        if (clear < stepMin) {
          stepMin = clear;
          stepMinX = x;
        }
      }
    };

    const nodes = s.S.length;
    for (let k = 0; k < nodes; k++) point(s.x[k], s.z[k], zGroundAt(terrain, s.x[k]));
    for (let k = 0; k + 1 < nodes; k++) {
      if (!(s.S[k + 1] > s.S[k])) continue; // the trolley's node, twice
      const x0 = s.x[k];
      const x1 = s.x[k + 1];
      const lo = Math.min(x0, x1);
      const hi = Math.max(x0, x1);
      let coefficients = false;
      const zAtX = (x: number) => {
        if (!coefficients) hermiteCoefficients(s, k, segment);
        coefficients = true;
        return cubicAt(segment, 8, crossing(segment, x));
      };
      // The terrain's own vertices strictly inside this segment, read on the interpolant.
      if (ground !== null) {
        for (let g = firstAbove(ground.xs, lo); g < ground.xs.length && ground.xs[g] < hi; g++) {
          point(ground.xs[g], zAtX(ground.xs[g]), ground.zs[g]);
        }
      }
      // Every crossing of a zone edge, wherever `x(S)` turns.
      for (const edge of edges) {
        if (!(lo < edge && edge < hi)) continue;
        // Read exactly on the edge, the judged interval's limit, as §11's own edge reading does.
        const above = zAtX(edge) - zGroundAt(terrain, edge);
        if (above < 0) cable = 1;
        if (above - hRider < stepMin) {
          stepMin = above - hRider;
          stepMinX = edge;
        }
      }
    }

    perStep[i] = stepMin;
    perStepX[i] = stepMinX;
    perStepCable[i] = cable;
    if (stepWhole < wholeMin) {
      wholeMin = stepWhole;
      wholeAtX = stepWholeX;
      wholeAtStepIndex = i;
    }
    const xD = (swept.slots[i] as NonNullable<(typeof swept.slots)[number]>).rD.x;
    if (!(xD > zoneEnd && xD < zoneStart)) continue;
    perStepJudged[i] = 1;
    if (cable === 1) cableInGround = true;
    if (stepMin < hMin) {
      hMin = stepMin;
      atX = stepMinX;
      atStepIndex = i;
    }
  }

  return {
    hMin,
    atX,
    atStepIndex,
    contact: cableInGround ? "cable" : hMin < 0 ? "rider" : "none",
    perStep,
    perStepX,
    perStepCable,
    perStepJudged,
    whole: { hMin: wholeMin, atX: wholeAtX, atStepIndex: wholeAtStepIndex },
  };
}

/**
 * No wind: §11's `evaluateClearance` on the solved steps, unchanged, its per-step arrays and indices
 * moved onto the grid's positions.
 */
function planeClearance(
  swept: SpatialSweepResult,
  terrain: Terrain,
  hRider: number,
  anchorZone: number,
  arrays: Pick<ClearanceResult, "perStep" | "perStepX" | "perStepCable" | "perStepJudged">,
): ClearanceResult {
  const { input, rider } = swept;
  const P = rider.share * rider.weight;
  const steps: SweepStep[] = [];
  const index: number[] = [];
  swept.slots.forEach((slot, i) => {
    if (slot === null) return;
    const H = slot.FA.x;
    const V0 = slot.FA.z;
    steps.push({
      sD: slot.sD,
      xD: slot.rD.x,
      zD: slot.rD.z,
      H,
      V0,
      TA: slot.TA,
      TB: slot.TB,
      theta: Math.atan2(V0 + input.w * slot.sD, H),
    });
    index.push(i);
  });
  const plane = evaluateClearance(
    { L: input.L, h: input.h, L0: input.L0, w: input.w, EA: input.EA, loads: [] },
    P,
    steps,
    terrain,
    hRider,
    CLEARANCE.samplesPerStep,
    anchorZone,
  );
  const { perStep, perStepX, perStepCable, perStepJudged } = arrays;
  for (let k = 0; k < steps.length; k++) {
    perStep[index[k]] = plane.perStep[k];
    perStepX[index[k]] = plane.perStepX[k];
    perStepCable[index[k]] = plane.perStepCable[k];
    perStepJudged[index[k]] = plane.perStepJudged[k];
  }
  const gridIndex = (k: number) => (k < 0 ? -1 : index[k]);
  return {
    ...plane,
    atStepIndex: gridIndex(plane.atStepIndex),
    perStep,
    perStepX,
    perStepCable,
    perStepJudged,
    whole: { ...plane.whole, atStepIndex: gridIndex(plane.whole.atStepIndex) },
  };
}
