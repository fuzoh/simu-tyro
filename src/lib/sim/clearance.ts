/**
 * §11's ground-clearance criterion — `docs/simulation-theory.md` §11 (`h_clear(x; x_P) = z_cable
 * − z_ground − h_rider`, minimised over `x` then over `x_P`), §6.2 (the sweep this reduces over),
 * §6.3 (`h_rider` and the trolley footprint) and §4.1 (the geometry each step is sampled from).
 * Underlying reference reports: `docs/references/simulation tyrolienne.md` (garde au sol, coupe
 * en travers) and `tyrolienne sur cable.md` (espace libre) — but **no value is transcribed from
 * either**: §14 records which of their worked examples are fabricated, and EN 15567's free-space
 * numbers are `[PAYWALLED]`, so this module ships **no clearance threshold at all**. It reports a
 * distance; §10's verdict is what judges it.
 *
 * Rules this module exists to keep:
 *
 * - **A reducer over the sweep, never a sweep field.** Clearance is the one place terrain enters
 *   the engine, which is what keeps every §15 fixture free of a terrain stub and the solver
 *   terrain-free — voir § 2 — le contrat du moteur.
 * - **It takes the span, not only the steps.** A `SweepStep` carries `(H, V₀)` but not `L₀`, `w`,
 *   `EA` or the rider's `P`, and the reducer has to rebuild the cable those four describe 260
 *   times. The argument list is ticket 03's sketch completed on its own stated ground (« a state
 *   self-sufficient for sampling »), not a widened signature.
 * - **The inner minimum runs over the whole line, not under the rider.** The loaded low point
 *   tracks the trolley, but terrain may rise where the cable is not lowest, so the worst point
 *   steps sideways onto a bump the rider has already passed. Under-the-rider-only was rejected
 *   measurably: it reads positive while that same rider position is in violation a few metres
 *   away, which the aggregate `h_min` then contradicts.
 * - **The rider's own node is always evaluated.** § 11 fixes the worst point per load position
 *   **at `x = x_P`**, and the loaded low point is the trolley's **kink** — a corner in `z_cable`,
 *   not a sag. No grid uniform in `s` lands on it, and reading its two neighbours across a convex
 *   cable is optimistic by 20–29 mm on a 150 m span and by 0,57 m on 200 m of slack (the nine
 *   150 m rows' own re-take, `__fixtures__/theory-15.ts`; « 19–27 » was the pre-re-take estimate
 *   ticket 37's review retracted). So `s_D` is
 *   merged into every step's sample set: **one extra sample per step**, not a denser grid, so the
 *   frame budget is untouched — the scan runs `samplesPerStep + 2` evaluations per step, and the
 *   tripwire below is the *grid*, which is unchanged at 60. Ticket 37 defect 1; ticket 09's own
 *   residual bound was argued for the convexity and never covered the kink.
 * - **Vertex-only evaluation, on *both* sets of vertices, and nobody densifies either.** The scan
 *   reads the sampled polyline's own vertices **and the terrain's own sample points** — voir § 4,
 *   « `evaluateClearance` scan[s] at the terrain's own sample points ». Both halves are load-
 *   bearing and neither is a densification: § 4's ≈5 mm bound is derived *per terrain segment*
 *   (`h_clear` is convex there only because `z_ground` is linear there), so skipping the terrain's
 *   vertices does not miss millimetres, it misses whole features — a 200-point profile on a 150 m
 *   span carries a vertex every 0,75 m against the cable's ≈2,5 m, and a ridge between two cable
 *   vertices reads as clear ground. `samplesPerStep` 60 against the sweep's 240 is the measured
 *   pair, and `260 × 60` is the bench tripwire — this reducer is the larger half of the frame
 *   budget (p95 ≤ 1,7 ms against `sweep()`'s ≤ 0,6 ms). The terrain half adds at most § 4's
 *   200-point export ceiling per step, and **nothing at all** for manual ground, whose two points
 *   are the cable's own ends.
 * - **Ground contact is a clearance verdict, never a solve failure.** Deep slack *converges*, so
 *   a line lying down surfaces here as `contact: "cable"` rather than as a `SolveError`. The two
 *   contact kinds stay separate because they are different classes of claim: « Câble au sol » is
 *   bare geometry, « Enveloppe passager traversée » is true only **given `h_rider`** and carries
 *   that convention's « non confirmé » chip.
 * - **The Zones d'ancrage are left out of what is judged, and only of that** (#106). Near an anchor
 *   the passager is still, or already, on the platform, and the garde there is the anchor height
 *   less the envelope by construction — in a V valley the traverse minimum always lands there and
 *   says nothing about the crossing. So a rider position `x_P` and a point `x` of the line or the
 *   ground count toward `hMin`, `atX`, `contact` and `perStep` only outside `[0, z] ∪ [L − z, L]`.
 *   The zone length `z` is a `[CONVENTION]` with no normative source (`simulation-theory.md` §11),
 *   so it is the caller's argument and this module ships no value for it; `z = 0` is no zone at
 *   all and reproduces every figure from before the zones, bit for bit. The scan itself is
 *   unchanged — same vertices, same order — and `whole` keeps the reduction over everything, so
 *   Avancé can still print what the zones hide. The judged fields add the line **at** `x = z` and
 *   `x = L − z`, one root-find of `x(s)` per edge and step: the judged interval is open, and where
 *   the garde rises away from a zone its minimum is the limit at the edge, which a sample a grid
 *   spacing past it read optimistic by centimetres (§11). `2z ≥ L` leaves nothing to judge, and so does a
 *   gap between the zones narrower than one sweep step (`atStepIndex` −1 while `whole` has one);
 *   refusing either is the Rail's gate, not this reducer's.
 * - **The engine is dependency-free, synchronous and SI** — `m`, `N`, `N/m`; `z` positive up,
 *   `x` measured from anchor A.
 */

import type { CableShape } from "./catenary.ts";
import type { ClearanceResult, PointLoad, SpanInput, SweepStep, Terrain } from "./types.ts";

import { xAt, zAt } from "./catenary.ts";
import { zGroundAt } from "./terrain.ts";

/**
 * §11's scan resolution. It lives here rather than beside `SWEEP` because it is
 * `evaluateClearance`'s own default — but the guard rail is the **product** of the two, `260 ×
 * 60`: the sweep's step count and this scan multiply into the frame budget, so raising either
 * re-opens the bench.
 */
export const CLEARANCE = {
  /**
   * Samples per sweep step, giving `samplesPerStep + 1` **cable** vertices per step, on top of
   * whatever terrain vertices fall between them. 60 is the measured figure every first-run number
   * was taken at; the fidelity on offer above it was measured at ≈5 mm, which is the cable's own
   * convexity across one segment. It is not the terrain's resolution — that one is the file's,
   * and § 4 forbids resampling it in either direction.
   */
  samplesPerStep: 60,
} as const;

/**
 * §11, whole: `h_min = min over x_P of min over x of (z_cable(x; x_P) − z_ground(x) − h_rider)`,
 * evaluated on §6.2's sweep.
 *
 * Per step it rebuilds the step's cable from the span plus the step's own `(H, V₀, s_D)`, scans
 * it at `samplesPerStep + 1` vertices uniform in the **material** coordinate — the same grid
 * `sampleCable` lays down — **plus the step's own `s_D`**, merged in ascending order, **plus the
 * terrain's own sample points that fall between two of them** (§ 4), and records that step's worst
 * clearance and where it sits. The traverse minimum is the least of those.
 *
 * At a terrain vertex the ground is exact and the cable is read off the **chord** of the cable
 * segment bracketing it. `z_cable` is convex in `x`, so that chord sits above the cable by at most
 * that segment's own sag — the residual is bounded by the *cable* spacing rather than by the
 * terrain's, which is the property that matters: a feature the terrain resolves is *seen*, and only
 * its depth carries the error the whole scan already carries. Ticket 09 measured that residual at
 * **69 mm** on a 5 m ridge placed where the trolley kink passes and at **18,5 mm** on smooth
 * ground, and named the kink — the one vertex no uniform grid lands on — rather than the convexity
 * as its cause. With `s_D` in the sample set (ticket 37 defect 1) both re-measure at **0,13 mm**
 * and **0,00 mm**: what is left is § 4's unloaded convexity alone, and on smooth ground the
 * traverse minimum sits *on* a sampled vertex, so refining the grid 60 → 4000 recovers nothing.
 * Inverting `x(s)` per terrain vertex would be exact and would cost a root-find in the inner loop;
 * millimetres, for the half of the frame budget that scales.
 *
 * **`atX` and `perStepX` carry that same resolution, and ticket 09 recorded only the magnitude
 * trade.** They are always a *scanned* vertex — a cable vertex, the rider's node, a terrain point
 * or, with Zones d'ancrage, an edge `z` or `L − z` of the judged span — never an interpolated
 * argmin, so the **position** is quantised where the value is not. Measured on ticket 39 item 5 against a 600-sample scan of the same traverse: on § 4's straight two-point
 * ground `perStepX` is the rider's own node on 142 of 260 steps (209 of 260 on a textile line) and a
 * cable vertex `L₀ / 60` ≈ 2,53 m apart elsewhere, landing within **1,26 m** of the fine scan's
 * answer while the value it indexes moves at most **1,5 mm**; on all three imported profiles the
 * difference is **0,000 m**, because the governing point is a terrain vertex this scan evaluates
 * exactly. That is deliberate and it is what `chart/profile.tsx` draws its clearance dimension at:
 * `testing.md`'s « positions of scanned extrema » tier — absolute, 2× the sample spacing — is the
 * bar every caller asserts `atX` at, and buying more would cost the same inner-loop root-find for a
 * millimetre of value.
 *
 * The scan is written against `xAt` / `zAt` on one reused {@link CableShape} rather than through
 * `sampleCable`: the two are the same arithmetic on the same vertices, and 260 discarded
 * `Float64Array`s per parameter change are 260 allocations this reducer does not have to make.
 *
 * @param input the span **without** a rider — `riderP` is the load each step places, exactly as
 *   `sweep` requires, so the two cannot disagree about how many riders are on the line.
 * @param riderP the rider's design load, N, downward.
 * @param steps the solved steps from `sweep`, in grid order. The **failed** steps are absent by
 *   construction, so every array returned here is indexed by `steps`, not by the sweep grid —
 *   a partial sweep suppresses the verdict anyway (`coverage < 1`).
 * @param terrain the ground, as data. Manual ground is its two-point case — and those two points
 *   are the cable's own ends, so it contributes no extra evaluation at all.
 * @param hRider §6.3's passenger envelope, m — `[CONVENTION]` 2,1 m, and the reason the rider
 *   contact kind is a separate verdict that names its own value.
 * @param samplesPerStep vertices minus one per step; the default is the measured 60.
 * @param anchorZone the length `z` of each Zone d'ancrage, m, measured horizontally from its
 *   anchor — `[CONVENTION]`, the Scenario's. `0`, the default, is no zone: every rider position and
 *   every point is judged, as before #106. A rider position or a point at `x ≤ z` or `x ≥ L − z`
 *   is left out of the judged fields and kept in `whole`; the judged fields also read the line **at**
 *   `x = z` and `x = L − z`, the open interval's limits (§11). Last, after the scan's resolution, so
 *   no call written before the zones can read its sample count as a zone.
 * @returns `hMin` positive is clearance, negative is contact. An **empty** `steps` — a sweep that
 *   lost every step — has no minimum: `hMin` is the reducer's identity `+∞`, `atX` is `NaN` and
 *   `atStepIndex` is **−1**, which is the flag a caller checks rather than reading a garde off a
 *   traverse that never happened. Zones that leave no rider position outside them read the same
 *   way in the judged fields, while `whole` still has the traverse.
 * @throws RangeError when `input.loads` is not empty, or when `samplesPerStep` is not a positive
 *   integer — both are caller bugs of `sampleCable`'s class, not physics failures.
 */
export function evaluateClearance(
  input: SpanInput,
  riderP: number,
  steps: SweepStep[],
  terrain: Terrain,
  hRider: number,
  samplesPerStep: number = CLEARANCE.samplesPerStep,
  anchorZone: number = 0,
): ClearanceResult {
  if (input.loads.length !== 0) {
    throw new RangeError(
      `evaluateClearance: input.loads must be [], got ${input.loads.length} load(s)`,
    );
  }
  if (!Number.isInteger(samplesPerStep) || samplesPerStep < 1) {
    throw new RangeError(
      `evaluateClearance: samplesPerStep must be a positive integer, got ${samplesPerStep}`,
    );
  }

  const { L0 } = input;
  const count = steps.length;
  const perStep = new Float64Array(count);
  const perStepX = new Float64Array(count);
  const perStepCable = new Uint8Array(count);
  const perStepJudged = new Uint8Array(count);

  // The two Zones d'ancrage, as the open interval between them: `x` is judged when `zoneEnd < x <
  // zoneStart`. With no zone the bounds are the infinities, so every `x` passes — the cable's own
  // end vertices included, which may sit an ulp outside `[0, L]`.
  const zoned = anchorZone > 0;
  const zoneEnd = zoned ? anchorZone : Number.NEGATIVE_INFINITY;
  const zoneStart = zoned ? input.L - anchorZone : Number.POSITIVE_INFINITY;
  // The judged interval is open, so its infimum is the limit at its two edges — a **boundary**
  // minimum wherever the garde rises away from the zone, as in a valley falling from the anchor,
  // with a non-zero slope there. No sample lands on an edge, and the first one past it reads up to
  // a grid spacing late, optimistic by the garde's slope times that distance. So each step also
  // reads the line **at** `x = z` and `x = L − z` (`edgeClearance`), in the judged fields only:
  // `whole` keeps the no-zone reduction vertex for vertex. Zones that meet have no interval and no
  // edge.
  const edges = zoned && zoneEnd < zoneStart;

  // One cable, re-posed per step: only `H`, `V₀` and the trolley's material coordinate move.
  const rider: PointLoad = { P: riderP, s: 0 };
  const shape: CableShape = { H: 0, V0: 0, w: input.w, EA: input.EA, loads: [rider] };

  // The terrain's own sample points, hoisted out of the inner loop. `flat` has none — it is one
  // segment over the whole line, so the cable's vertices already are the scan § 4 asks for.
  const ground = terrain.kind === "profile" ? terrain : null;
  const groundCount = ground === null ? 0 : ground.xs.length;

  let hMin = Number.POSITIVE_INFINITY;
  let atX = Number.NaN;
  let atStepIndex = -1;
  let wholeMin = Number.POSITIVE_INFINITY;
  let wholeAtX = Number.NaN;
  let wholeAtStepIndex = -1;

  // « Câble au sol » is the outer verdict: the cable under the terrain always puts the envelope
  // under it too, so the two kinds nest and the bare-geometry one wins.
  let cableInGround = false;

  for (let i = 0; i < count; i++) {
    const step = steps[i];
    shape.H = step.H;
    shape.V0 = step.V0;
    rider.s = step.sD;

    let stepMin = Number.POSITIVE_INFINITY;
    let stepMinX = Number.NaN;
    let stepWhole = Number.POSITIVE_INFINITY;
    let stepWholeX = Number.NaN;

    // § 11 fixes the worst point per load position **at `x = x_P`**, and `s_D` is never on the
    // uniform grid — it is the arc the trolley has travelled, the grid is equal divisions of
    // `L₀`. So the kink is **merged into** the ascending sample sequence rather than replacing a
    // sample: `insertAt` is how many uniform samples precede it, and the scan runs one sample
    // longer. Ascending order is what the terrain cursor below relies on, and a `s_D` that lands
    // on a grid point simply evaluates that point twice — a minimum is idempotent.
    const sD = rider.s < 0 ? 0 : rider.s > L0 ? L0 : rider.s;
    // `⌈s_D·n/L₀⌉` is the insertion index, corrected against the grid values themselves rather
    // than trusted: the two expressions round differently, so for an `s_D` within an ulp of a grid
    // point the ceiling can name the index on the wrong side and the emitted sequence would step
    // back ≈10⁻¹⁴ m. Measured at 6 cases in 100 005 `(s_D, n)` combinations — physically nil, but
    // the forward terrain cursor below is documented as relying on ascending order, so the order
    // is made true rather than nearly true. Each guard moves at most one index.
    let insertAt = Math.ceil((sD * samplesPerStep) / L0);
    while (insertAt > 0 && (L0 * (insertAt - 1)) / samplesPerStep > sD) insertAt--;
    while (insertAt < samplesPerStep && (L0 * insertAt) / samplesPerStep < sD) insertAt++;

    // `x(s)` is strictly increasing (`dx/ds = H/T > 0`, and `H > 0` on every solved step), so the
    // terrain's vertices are consumed once per step by a forward cursor rather than searched for.
    let g = 0;
    let xPrev = 0;
    let zPrev = 0;
    let sPrev = 0;

    for (let k = 0; k <= samplesPerStep + 1; k++) {
      // The uniform sample this position carries, or `-1` for the kink itself. The last uniform
      // vertex is `L₀` exactly, so the scan closes on the far anchor rather than on a rounding of
      // it — `sampleCable`'s own end condition.
      const j = k < insertAt ? k : k === insertAt ? -1 : k - 1;
      const s = j === -1 ? sD : j === samplesPerStep ? L0 : (L0 * j) / samplesPerStep;
      const x = xAt(shape, s);
      const z = zAt(shape, s);
      const above = z - zGroundAt(terrain, x);
      const clear = above - hRider;
      if (clear < stepWhole) {
        stepWhole = clear;
        stepWholeX = x;
      }
      if (x > zoneEnd && x < zoneStart) {
        if (above < 0) perStepCable[i] = 1;
        if (clear < stepMin) {
          stepMin = clear;
          stepMinX = x;
        }
      }

      // The other half of § 4's scan: the terrain's own sample points **strictly inside** this
      // cable segment. A vertex that coincides with a cable vertex is already evaluated above —
      // which is why two-point manual ground, whose two points are the cable's own ends, costs
      // nothing and reproduces every measured figure bit for bit. The cable is read off the
      // segment's chord, which sits above the convex cable by that segment's own sag — the
      // residual is bounded by the *cable* spacing, never by the terrain's, so a feature the file
      // resolves is always seen. Voir the function's own docblock for the measured magnitude.
      if (ground !== null && k > 0) {
        const { xs, zs } = ground;
        while (g < groundCount && xs[g] <= xPrev) g++;
        const dx = x - xPrev;
        for (; g < groundCount && xs[g] < x; g++) {
          const xg = xs[g];
          const zChord = dx > 0 ? zPrev + ((xg - xPrev) / dx) * (z - zPrev) : z;
          const aboveG = zChord - zs[g];
          const clearG = aboveG - hRider;
          if (clearG < stepWhole) {
            stepWhole = clearG;
            stepWholeX = xg;
          }
          if (xg > zoneEnd && xg < zoneStart) {
            if (aboveG < 0) perStepCable[i] = 1;
            if (clearG < stepMin) {
              stepMin = clearG;
              stepMinX = xg;
            }
          }
        }
      }

      // The judged interval's two edges, each where the scan first steps past it: `x(s)` is
      // strictly increasing, so a step's line crosses each edge once, between two samples.
      if (edges && k > 0) {
        for (let e = 0; e < 2; e++) {
          const edge = e === 0 ? zoneEnd : zoneStart;
          if (!(xPrev <= edge && x > edge)) continue;
          const aboveE =
            zAt(shape, sAtX(shape, edge, sPrev, xPrev, s, x)) - zGroundAt(terrain, edge);
          const clearE = aboveE - hRider;
          if (aboveE < 0) perStepCable[i] = 1;
          if (clearE < stepMin) {
            stepMin = clearE;
            stepMinX = edge;
          }
        }
      }

      xPrev = x;
      zPrev = z;
      sPrev = s;
    }

    perStep[i] = stepMin;
    perStepX[i] = stepMinX;
    // Strictly less, so the traverse minimum is reported at the **first** step that reaches it.
    if (stepWhole < wholeMin) {
      wholeMin = stepWhole;
      wholeAtX = stepWholeX;
      wholeAtStepIndex = i;
    }
    // A rider position inside a zone is on the platform: its line is drawn, and judges nothing.
    if (!(step.xD > zoneEnd && step.xD < zoneStart)) continue;
    perStepJudged[i] = 1;
    if (perStepCable[i] === 1) cableInGround = true;
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
 * The material coordinate where a step's line stands at abscissa `target`, between two scanned
 * samples that bracket it — `x(sLo) = xLo ≤ target ≤ xHi = x(sHi)`. `x(s)` is strictly increasing
 * and smooth but for the trolley's kink, so the Illinois variant of regula falsi converges in a few
 * evaluations from the chord's own guess, and stops within a nanometre.
 */
function sAtX(
  shape: CableShape,
  target: number,
  sLo: number,
  xLo: number,
  sHi: number,
  xHi: number,
): number {
  let lo = sLo;
  let hi = sHi;
  let fLo = xLo - target;
  let fHi = xHi - target;
  if (fLo === 0) return lo;
  if (fHi === 0) return hi;
  let side = 0;
  let s = lo;
  for (let it = 0; it < 60; it++) {
    s = (lo * fHi - hi * fLo) / (fHi - fLo);
    const f = xAt(shape, s) - target;
    if (Math.abs(f) < 1e-9) return s;
    if (f > 0) {
      hi = s;
      fHi = f;
      if (side === 1) fLo /= 2;
      side = 1;
    } else {
      lo = s;
      fLo = f;
      if (side === -1) fHi /= 2;
      side = -1;
    }
  }
  return s;
}
