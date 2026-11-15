/**
 * Sampling a spatial state, and the unloaded line's readings — `docs/simulation-theory.md` §19.8
 * (« sampling is a function, not a stored polyline »; cubic Hermite between nodes), §19.7 (the
 * flèche, the rise of a lifted line, the lateral offset and the écart maximal à A–B) and §19.11
 * (what sampling returns).
 *
 * Rules this module exists to keep:
 *
 * - **Re-shot, never stored.** A shooting state is sampled by re-running its own shot — same `N`,
 *   same pieces, same `F_A` — so the nodes are bit-identical to the accepted solve. A closed-form
 *   state is sampled from §4.1's `x(s)`, `z(s)` on the same pieces, `y ≡ 0`.
 * - **Readings between nodes are of the integrator's order.** Cubic Hermite on `r` and
 *   `dr/dS = λ·F/T`, both known at every node; an extremum is read on that interpolant, never on a
 *   chord of two nodes. At the trolley's node, a corner, it is read on the node itself.
 * - **Combined at each point, then maximised.** The écart maximal à A–B is
 *   `max √(drop² + y²)` over one point of the line at a time — never two maxima taken at different
 *   abscissae combined (#127 Q10, Q30).
 */

import type { SpanState, SpatialState } from "./types.ts";

import { verticalTensionAt, xAt, zAt, type CableShape } from "./catenary.ts";
import { GOLDEN_SECTION, unloadedSag } from "./parameterise.ts";
import { nodeCountOf, pieceSteps, Shooter, ShotNodes } from "./shoot.ts";
import { planeInput } from "./spatial-solve.ts";

/**
 * A sampled spatial state: one entry per node in ascending `S`, the trolley's node twice — `S_P⁻`
 * at `node`, `S_P⁺` at `node + 1`. `F` is the internal force of §19.2, `T = |F|`.
 */
export type SpatialSamples = {
  readonly S: Float64Array;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly Fx: Float64Array;
  readonly Fy: Float64Array;
  readonly Fz: Float64Array;
  readonly T: Float64Array;
  /** The axial stiffness, N — `dr/dS = (1 + T/EA)·F/T` at a node needs it. */
  readonly EA: number;
  /** Index of `S_P⁻`, or `−1` unloaded. */
  readonly node: number;
};

/** One extremum read on the line: its value and the abscissa it is read at, m. */
export type Reading = { readonly value: number; readonly atX: number };

/**
 * §19.7's readings of one line (§19.11):
 *
 * - `sag` — the flèche `D`, the greatest vertical drop below A–B, never negative;
 * - `rise` — the greatest height above A–B, `0` when the line never rises over it;
 * - `lateral` — the signed `y` of greatest `|y|` (`> 0` to the left of A → B);
 * - `ecart` — the écart maximal à A–B, `max √(drop² + y²)`.
 *
 * `atX` is `NaN` where the value is nil everywhere — there is no point to name.
 */
export type SpatialReadings = {
  readonly sag: Reading;
  readonly rise: Reading;
  readonly lateral: Reading;
  readonly ecart: Reading;
};

/** §19.8's sampling of a state: its own shot re-run, or §4.1 on the same pieces. */
export function sampleSpatial(state: SpatialState): SpatialSamples {
  const { input } = state;
  const sP = input.rider === null ? null : input.rider.sP;
  const pieces = pieceSteps(state.steps, input.L0, sP);
  let nodes: ShotNodes;
  if (state.method === "shooting") {
    nodes = new ShotNodes(nodeCountOf(pieces));
    new Shooter(input, state.steps).run(state.FA.x, state.FA.y, state.FA.z, nodes);
  } else {
    nodes = closedFormNodes(state, pieces);
  }
  const count = nodes.count;
  const T = new Float64Array(count);
  // The shot's own `|F|`, written as it does, so that `T` at the node is `T⁻` and `T⁺` exactly.
  const { Fx, Fy, Fz } = nodes;
  for (let i = 0; i < count; i++) T[i] = Math.sqrt(Fx[i] * Fx[i] + Fy[i] * Fy[i] + Fz[i] * Fz[i]);
  return {
    S: nodes.S,
    x: nodes.x,
    y: nodes.y,
    z: nodes.z,
    Fx: nodes.Fx,
    Fy: nodes.Fy,
    Fz: nodes.Fz,
    T,
    EA: input.EA,
    // `S_P⁻` closes the first piece.
    node: sP === null ? -1 : pieces[0],
  };
}

/** The plane state a closed-form spatial state wraps — §4.1's `(H, V₀)` and its loads. */
export function planeStateOf(state: SpatialState): SpanState {
  const { input } = state;
  return {
    H: state.FA.x,
    V0: state.FA.z,
    VB: state.FB.z,
    TA: state.TA,
    TB: state.TB,
    Tmax: state.Tmax,
    L0: input.L0,
    w: input.w,
    EA: input.EA,
    loads: planeInput(input).loads,
    iterations: state.iterations,
  };
}

/** §4.1 on §19.8's pieces: the closed form's nodes, `F = (H, 0, V(S))`, `V` jumping at the node. */
function closedFormNodes(state: SpatialState, pieces: readonly number[]): ShotNodes {
  const plane = planeStateOf(state);
  const shape: CableShape = plane;
  const nodes = new ShotNodes(nodeCountOf(pieces));
  const { L0 } = plane;
  const sP = plane.loads.length === 0 ? null : plane.loads[0].s;
  const P = plane.loads.length === 0 ? 0 : plane.loads[0].P;
  let at = 0;
  let start = 0;
  for (let piece = 0; piece < pieces.length; piece++) {
    const n = pieces[piece];
    const end = sP !== null && piece === 0 ? sP : L0;
    const hS = (end - start) / n;
    for (let i = 0; i <= n; i++) {
      const S = i === n ? end : start + i * hS;
      // `verticalTensionAt` reads `S_P⁻` at the node itself; the second piece starts at `S_P⁺`.
      const V = verticalTensionAt(shape, S) + (piece === 1 && i === 0 ? P : 0);
      nodes.write(at++, S, xAt(shape, S), 0, zAt(shape, S), plane.H, 0, V);
    }
    start = end;
  }
  return nodes;
}

/** `dr/dS = (1 + T/EA)·F/T` at node `i`, component `F`. */
function slope(s: SpatialSamples, i: number, F: Float64Array): number {
  const T = s.T[i];
  return ((1 + T / s.EA) * F[i]) / T;
}

/**
 * The cubic Hermite interpolant of one coordinate on segment `i → i+1`, as the coefficients of
 * `c₀ + c₁·t + c₂·t² + c₃·t³`, `t ∈ [0, 1]`.
 */
function cubic(p0: number, m0: number, p1: number, m1: number): [number, number, number, number] {
  return [p0, m0, -3 * p0 - 2 * m0 + 3 * p1 - m1, 2 * p0 + m0 - 2 * p1 + m1];
}

/** {@link cubic}'s coefficients written into `out[at..at+3]`. */
function cubicInto(out: Float64Array, at: number, p0: number, m0: number, p1: number, m1: number) {
  out[at] = p0;
  out[at + 1] = m0;
  out[at + 2] = -3 * p0 - 2 * m0 + 3 * p1 - m1;
  out[at + 3] = 2 * p0 + m0 - 2 * p1 + m1;
}

function evalCubic(c: readonly number[], t: number): number {
  return c[0] + t * (c[1] + t * (c[2] + t * c[3]));
}

/** The coefficients of `x`, `y`, `z` on segment `i → i+1`. */
function segment(s: SpatialSamples, i: number) {
  const dS = s.S[i + 1] - s.S[i];
  return {
    x: cubic(s.x[i], dS * slope(s, i, s.Fx), s.x[i + 1], dS * slope(s, i + 1, s.Fx)),
    y: cubic(s.y[i], dS * slope(s, i, s.Fy), s.y[i + 1], dS * slope(s, i + 1, s.Fy)),
    z: cubic(s.z[i], dS * slope(s, i, s.Fz), s.z[i + 1], dS * slope(s, i + 1, s.Fz)),
  };
}

/**
 * Segment `i → i+1`'s cubic coefficients, allocation-free: `x` in `out[0..3]`, `y` in `out[4..7]`,
 * `z` in `out[8..11]`, each as `c₀ + c₁·t + c₂·t² + c₃·t³` — the same interpolant as
 * {@link hermiteAt}, for a reader that evaluates it many times (§19.13's clearance).
 */
export function hermiteCoefficients(s: SpatialSamples, i: number, out: Float64Array): void {
  const dS = s.S[i + 1] - s.S[i];
  cubicInto(out, 0, s.x[i], dS * slope(s, i, s.Fx), s.x[i + 1], dS * slope(s, i + 1, s.Fx));
  cubicInto(out, 4, s.y[i], dS * slope(s, i, s.Fy), s.y[i + 1], dS * slope(s, i + 1, s.Fy));
  cubicInto(out, 8, s.z[i], dS * slope(s, i, s.Fz), s.z[i + 1], dS * slope(s, i + 1, s.Fz));
}

/**
 * §19.8's reading between two nodes: the point at `t ∈ [0, 1]` of segment `i → i+1` on the cubic
 * Hermite interpolant of `r` and `dr/dS`.
 */
export function hermiteAt(
  s: SpatialSamples,
  i: number,
  t: number,
): { x: number; y: number; z: number } {
  const c = segment(s, i);
  return { x: evalCubic(c.x, t), y: evalCubic(c.y, t), z: evalCubic(c.z, t) };
}

/** The `t ∈ [0, 1]` where the cubic `c` is greatest: an end, or a root of `c'` inside. */
function argmaxCubic(c: readonly number[]): number {
  let best = 0;
  let value = evalCubic(c, 0);
  const consider = (t: number) => {
    if (!(t > 0 && t < 1)) return;
    const v = evalCubic(c, t);
    if (v > value) {
      best = t;
      value = v;
    }
  };
  if (evalCubic(c, 1) > value) {
    best = 1;
    value = evalCubic(c, 1);
  }
  // `c'(t) = c₁ + 2c₂·t + 3c₃·t²`.
  const A = 3 * c[3];
  const B = 2 * c[2];
  const C = c[1];
  if (A === 0) {
    if (B !== 0) consider(-C / B);
  } else {
    const disc = B * B - 4 * A * C;
    if (disc >= 0) {
      const root = Math.sqrt(disc);
      // The cancellation-free pair of roots.
      const qq = -0.5 * (B + (B >= 0 ? root : -root));
      if (qq !== 0) consider(C / qq);
      consider(qq / A);
    }
  }
  return best;
}

/** Iterations of the golden-section search on a segment — `0,618⁸⁰` is far below an ulp of `t`. */
const GOLDEN_STEPS = 80;

/** The `t ∈ [0, 1]` where `f` is greatest, by golden section — `f` unimodal near its maximum. */
function argmaxGolden(f: (t: number) => number): number {
  let lo = 0;
  let hi = 1;
  let a = hi - GOLDEN_SECTION * (hi - lo);
  let b = lo + GOLDEN_SECTION * (hi - lo);
  let fa = f(a);
  let fb = f(b);
  for (let k = 0; k < GOLDEN_STEPS; k++) {
    if (fa < fb) {
      lo = a;
      a = b;
      fa = fb;
      b = lo + GOLDEN_SECTION * (hi - lo);
      fb = f(b);
    } else {
      hi = b;
      b = a;
      fb = fa;
      a = hi - GOLDEN_SECTION * (hi - lo);
      fa = f(a);
    }
  }
  const mid = (lo + hi) / 2;
  const candidates = [0, mid, 1];
  return candidates.reduce((best, t) => (f(t) > f(best) ? t : best), 0);
}

/**
 * §19.7's four readings on any sampled line, read on the Hermite interpolant. A named export for
 * its tests (the closed form's flèche, a hand-built line); {@link unloadedReadings} is the
 * caller's entry.
 *
 * @param span B's position `(L, h)`: A–B is the straight reference no calculation moves.
 */
export function readExtrema(
  s: SpatialSamples,
  { L, h }: { L: number; h: number },
): SpatialReadings {
  const count = s.S.length;
  const drop = (x: number, z: number) => (h * x) / L - z;
  // Each a greatest positive value and where it is read: drop below A–B, height above it, `+y`
  // and `−y`. Zero is the floor of every one — a quantity nil everywhere names no point.
  const sag = { value: 0, atX: Number.NaN };
  const rise = { value: 0, atX: Number.NaN };
  const left = { value: 0, atX: Number.NaN };
  const right = { value: 0, atX: Number.NaN };
  const raise = (best: { value: number; atX: number }, f: number[], cx: number[]) => {
    const t = argmaxCubic(f);
    const value = evalCubic(f, t);
    if (value > best.value) {
      best.value = value;
      best.atX = evalCubic(cx, t);
    }
  };
  let ecartNode = -1;
  let ecartNodeValue = 0;

  for (let i = 0; i < count; i++) {
    const e = drop(s.x[i], s.z[i]) ** 2 + s.y[i] ** 2;
    if (e > ecartNodeValue) {
      ecartNodeValue = e;
      ecartNode = i;
    }
  }

  for (let i = 0; i + 1 < count; i++) {
    if (!(s.S[i + 1] > s.S[i])) continue; // the trolley's node, twice
    const c = segment(s, i);
    const d = c.x.map((cx, k) => (h * cx) / L - c.z[k]);
    raise(sag, d, c.x);
    raise(
      rise,
      d.map((v) => -v),
      c.x,
    );
    raise(left, c.y, c.x);
    raise(
      right,
      c.y.map((v) => -v),
      c.x,
    );
  }
  const lateral: Reading =
    left.value >= right.value ? left : { value: -right.value, atX: right.atX };

  let ecart: Reading = { value: 0, atX: Number.NaN };
  if (ecartNode >= 0) {
    ecart = { value: Math.sqrt(ecartNodeValue), atX: s.x[ecartNode] };
    // The maximum lies on one of the two segments around the greatest node.
    for (const i of [ecartNode - 1, ecartNode]) {
      if (i < 0 || i + 1 >= count || !(s.S[i + 1] > s.S[i])) continue;
      const c = segment(s, i);
      const e2 = (t: number) =>
        drop(evalCubic(c.x, t), evalCubic(c.z, t)) ** 2 + evalCubic(c.y, t) ** 2;
      const t = argmaxGolden(e2);
      const value = Math.sqrt(e2(t));
      if (value > ecart.value) ecart = { value, atX: evalCubic(c.x, t) };
    }
  }
  return { sag, rise, lateral, ecart };
}

/**
 * §19.7's readings of the unloaded line under the Scenario's wind: flèche, rise, lateral offset
 * and écart maximal à A–B. Without wind the flèche is `unloadedSag`'s, bit for bit (§19.16).
 */
export function unloadedReadings(state: SpatialState): SpatialReadings {
  const span = { L: state.input.L, h: state.input.h };
  const readings = readExtrema(sampleSpatial(state), span);
  if (state.method !== "closed-form" || state.input.rider !== null) return readings;
  const exact = unloadedSag(planeStateOf(state), span);
  return { ...readings, sag: { value: exact.D, atX: exact.atX } };
}
