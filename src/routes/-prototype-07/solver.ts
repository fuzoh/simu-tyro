/**
 * THROWAWAY PROTOTYPE — wayfinder ticket 07 (Profile visualisation prototype).
 * NOT the v1 implementation. Do not import from app code. Ticket 03 owns the real
 * `src/lib/sim/` design; this file exists only to put real numbers behind the chart.
 *
 * Physics: docs/simulation-theory.md §4.1 (Irvine elastic catenary), §4.2 (analytic
 * Jacobian), §5 (damped Newton + seeds), §6.1 (point load, two segments), §6.2 (sweep
 * over material coordinate s_D), §11 (ground clearance).
 */

export type Terrain =
  | { kind: "flat"; z: number }
  | { kind: "profile"; xs: Float64Array; zs: Float64Array };

export type SpanInput = {
  L: number;
  h: number;
  L0: number;
  w: number;
  EA: number;
  /** Rider load in N, applied at material coordinate sP. Omit for the unloaded line. */
  P?: number;
  sP?: number;
};

type FullInput = { L: number; h: number; L0: number; w: number; EA: number; P: number; sP: number };

type Warm = { H: number; V0: number };

export type SpanState = {
  H: number;
  V0: number;
  VB: number;
  TA: number;
  TB: number;
  Tmax: number;
  L0: number;
  w: number;
  EA: number;
  P: number;
  sP: number;
  iterations: number;
  residual: number;
};

export type SweepStep = {
  sD: number;
  xD: number;
  zD: number;
  H: number;
  V0: number;
  TA: number;
  TB: number;
  /** Local cable slope at the rider, radians, signed (negative = descending). */
  theta: number;
};

const asinh = Math.asinh;

/** §4.1 — position of material point s, one segment starting with vertical Va. */
function segEnd(H: number, Va: number, w: number, EA: number, len: number) {
  const Vb = Va + w * len;
  const Ta = Math.hypot(H, Va);
  const Tb = Math.hypot(H, Vb);
  const dx = (H * len) / EA + (H / w) * (asinh(Vb / H) - asinh(Va / H));
  const dz = (len / EA) * (Va + (w * len) / 2) + (Tb - Ta) / w;
  return { dx, dz, Vb, Ta, Tb };
}

/** §4.2 — analytic partials of one segment's end offset wrt (H, Va). */
function segJac(H: number, Va: number, w: number, EA: number, len: number) {
  const Vb = Va + w * len;
  const Ta = Math.hypot(H, Va);
  const Tb = Math.hypot(H, Vb);
  const dVT = (Vb / Tb - Va / Ta) / w;
  return {
    dxdH: len / EA + (asinh(Vb / H) - asinh(Va / H)) / w - dVT,
    dxdV: (H / Tb - H / Ta) / w,
    dzdH: (H / Tb - H / Ta) / w,
    dzdV: dVT + len / EA,
  };
}

/** End-to-end offset (and Jacobian) for the whole line, 1 or 2 segments (§6.1). */
function endpoint(H: number, V0: number, inp: FullInput) {
  const { L0, w, EA, P, sP } = inp;
  if (P === 0 || sP <= 0 || sP >= L0) {
    const s = segEnd(H, V0, w, EA, L0);
    const j = segJac(H, V0, w, EA, L0);
    return { x: s.dx, z: s.dz, VB: s.Vb, TA: s.Ta, TB: s.Tb, j, node: null };
  }
  const s1 = segEnd(H, V0, w, EA, sP);
  const V0plus = s1.Vb + P;
  const s2 = segEnd(H, V0plus, w, EA, L0 - sP);
  const j1 = segJac(H, V0, w, EA, sP);
  const j2 = segJac(H, V0plus, w, EA, L0 - sP);
  return {
    x: s1.dx + s2.dx,
    z: s1.dz + s2.dz,
    VB: s2.Vb,
    TA: s1.Ta,
    TB: s2.Tb,
    // dV0plus/dV0 = 1, dV0plus/dH = 0 -> partials simply add
    j: {
      dxdH: j1.dxdH + j2.dxdH,
      dxdV: j1.dxdV + j2.dxdV,
      dzdH: j1.dzdH + j2.dzdH,
      dzdV: j1.dzdV + j2.dzdV,
    },
    node: { x: s1.dx, z: s1.dz, Vminus: s1.Vb, Vplus: V0plus },
  };
}

export type SolveResult =
  | { ok: true; state: SpanState }
  | { ok: false; kind: "no-convergence" | "slack-limit"; residual: number };

/** §5.2 seeds. */
function seed(inp: FullInput) {
  const { L, h, L0, w, P, sP } = inp;
  const chord = Math.hypot(L, h);
  const slack = Math.max(L0 - chord, 1e-6);
  const Dest = Math.sqrt((3 * L * slack) / 8);
  const Wtot = w * L0 + P;
  const H = Math.max((Wtot * L) / (8 * Math.max(Dest, 1e-3)), 1e-2);
  const V0 = -(w * L0) / 2 - P * (1 - sP / L0) + (h * H) / L;
  return { H, V0 };
}

/** §5.1 — damped Newton on (H, V0); residual is the anchor-position error in metres. */
export function solveSpan(input: SpanInput, warmStart?: Warm): SolveResult {
  const inp: FullInput = { P: 0, sP: 0, ...input };
  const { L, h } = inp;
  const tol = L > 1000 ? 1e-6 * L : 1e-6;
  const guesses: Array<Warm> = [];
  const s0 = warmStart ?? seed(inp);
  guesses.push(s0);
  if (warmStart) guesses.push(seed(inp)); // §5.2 retry policy: fall back to the cold seed
  for (const f of [0.4, 2.5, 0.15, 6]) guesses.push({ H: s0.H * f, V0: s0.V0 });

  let best = Number.POSITIVE_INFINITY;
  for (const g of guesses) {
    let H = Math.max(g.H, 1e-3);
    let V0 = g.V0;
    let e = endpoint(H, V0, inp);
    let rx = e.x - L;
    let rz = e.z - h;
    let norm = Math.hypot(rx, rz);
    for (let it = 1; it <= 60; it++) {
      if (norm < tol) {
        const TA = e.TA;
        const TB = e.TB;
        return {
          ok: true,
          state: {
            H,
            V0,
            VB: e.VB,
            TA,
            TB,
            Tmax: Math.max(TA, TB, Math.hypot(H, e.node?.Vplus ?? 0)),
            L0: inp.L0,
            w: inp.w,
            EA: inp.EA,
            P: inp.P,
            sP: inp.sP,
            iterations: it,
            residual: norm,
          },
        };
      }
      const { dxdH, dxdV, dzdH, dzdV } = e.j;
      const det = dxdH * dzdV - dxdV * dzdH;
      if (!Number.isFinite(det) || Math.abs(det) < 1e-30) break;
      const dH = -(dzdV * rx - dxdV * rz) / det;
      const dV = -(dxdH * rz - dzdH * rx) / det;
      let alpha = 1;
      let accepted = false;
      for (let k = 0; k < 25; k++) {
        const Ht = Math.max(H + alpha * dH, 1e-4);
        const Vt = V0 + alpha * dV;
        const et = endpoint(Ht, Vt, inp);
        const nx = et.x - L;
        const nz = et.z - h;
        const nn = Math.hypot(nx, nz);
        if (Number.isFinite(nn) && nn < norm) {
          H = Ht;
          V0 = Vt;
          e = et;
          rx = nx;
          rz = nz;
          norm = nn;
          accepted = true;
          break;
        }
        alpha /= 2;
      }
      if (!accepted) break;
    }
    best = Math.min(best, norm);
  }
  return { ok: false, kind: "no-convergence", residual: best };
}

/** §4.1 sampled analytically — never stored in a result object (ticket 03 decision 3). */
export function sampleCable(state: SpanState, n: number): Float64Array {
  const { H, V0, w, EA, L0, P, sP } = state;
  const out = new Float64Array(2 * (n + 1));
  const loaded = P !== 0 && sP > 0 && sP < L0;
  const s1 = loaded ? segEnd(H, V0, w, EA, sP) : null;
  const V0plus = s1 ? s1.Vb + P : 0;
  for (let i = 0; i <= n; i++) {
    const s = (L0 * i) / n;
    if (!loaded || s <= sP) {
      const e = segEnd(H, V0, w, EA, Math.max(s, 1e-12));
      out[2 * i] = e.dx;
      out[2 * i + 1] = e.dz;
    } else {
      const e = segEnd(H, V0plus, w, EA, s - sP);
      out[2 * i] = s1!.dx + e.dx;
      out[2 * i + 1] = s1!.dz + e.dz;
    }
  }
  return out;
}

/** Rider node position + local slope, from a solved loaded state. */
export function riderNode(state: SpanState) {
  const { H, V0, w, EA, sP } = state;
  const s1 = segEnd(H, V0, w, EA, sP);
  return { xD: s1.dx, zD: s1.dz, theta: Math.atan2(s1.Vb, H) };
}

/** §6.2 — deterministic grid: uniform steps + geometric tails, endpoints excluded. */
export function sweepGrid(L0: number, n: number, tailSteps = 10): Float64Array {
  const inner: number[] = [];
  for (let i = 1; i <= n; i++) inner.push((L0 * i) / (n + 1));
  const tail = 0.02 * L0;
  const head: number[] = [];
  const foot: number[] = [];
  for (let i = 1; i <= tailSteps; i++) {
    const f = 2 ** -(tailSteps - i); // geometric, densest at the anchor
    head.push(tail * f);
    foot.push(L0 - tail * f);
  }
  return Float64Array.from([...head, ...inner, ...foot.reverse()].sort((a, b) => a - b));
}

export type SweepResult = {
  steps: SweepStep[];
  failures: number;
  coverage: number;
  /** Wall time of this sweep, ms. */
  ms: number;
};

/** §6.2 trajectory algorithm — march s_D in order, warm-starting each solve. */
export function sweep(input: SpanInput, P: number, n = 240): SweepResult {
  const t0 = performance.now();
  const grid = sweepGrid(input.L0, n);
  const steps: SweepStep[] = [];
  let failures = 0;
  let warm: { H: number; V0: number } | undefined;
  for (let i = 0; i < grid.length; i++) {
    const sP = grid[i];
    const r = solveSpan({ ...input, P, sP }, warm);
    if (!r.ok) {
      failures++;
      warm = undefined;
      continue;
    }
    const st = r.state;
    const node = riderNode(st);
    steps.push({
      sD: sP,
      xD: node.xD,
      zD: node.zD,
      H: st.H,
      V0: st.V0,
      TA: st.TA,
      TB: st.TB,
      theta: node.theta,
    });
    warm = { H: st.H, V0: st.V0 };
  }
  return {
    steps,
    failures,
    coverage: steps.length / grid.length,
    ms: performance.now() - t0,
  };
}

/** Linear interpolation of terrain height at x. */
export function zGroundAt(t: Terrain, x: number): number {
  if (t.kind === "flat") return t.z;
  const { xs, zs } = t;
  if (x <= xs[0]) return zs[0];
  const last = xs.length - 1;
  if (x >= xs[last]) return zs[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const f = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return zs[lo] + f * (zs[hi] - zs[lo]);
}

export type ClearanceResult = {
  hMin: number;
  atX: number;
  atStepIndex: number;
  contact: "none" | "rider" | "cable";
  /** Per sweep step: worst clearance anywhere on the line for that rider position. */
  perStep: Float64Array;
  /** Where that per-step worst clearance sits, in metres from A. */
  perStepX: Float64Array;
  /** Per sweep step: true if the cable itself is under the terrain. */
  perStepCable: Uint8Array;
};

/**
 * §11 — h_clear(x; x_P) = z_cable − z_ground − h_rider, min over x then over x_P.
 * Reducer over the sweep, as ticket 03 fixed. Samples each step's cable analytically.
 */
export function evaluateClearance(
  input: SpanInput,
  P: number,
  steps: SweepStep[],
  terrain: Terrain,
  hRider: number,
  samplesPerStep = 60,
): ClearanceResult {
  let hMin = Number.POSITIVE_INFINITY;
  let atX = 0;
  let atStepIndex = 0;
  let cableInDirt = false;
  const perStep = new Float64Array(steps.length);
  const perStepX = new Float64Array(steps.length);
  const perStepCable = new Uint8Array(steps.length);
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const state: SpanState = {
      H: st.H,
      V0: st.V0,
      VB: 0,
      TA: st.TA,
      TB: st.TB,
      Tmax: 0,
      L0: input.L0,
      w: input.w,
      EA: input.EA,
      P,
      sP: st.sD,
      iterations: 0,
      residual: 0,
    };
    const pts = sampleCable(state, samplesPerStep);
    let stepMin = Number.POSITIVE_INFINITY;
    let stepMinX = 0;
    for (let k = 0; k <= samplesPerStep; k++) {
      const x = pts[2 * k];
      const z = pts[2 * k + 1];
      const above = z - zGroundAt(terrain, x);
      const c = above - hRider;
      if (above < 0) {
        cableInDirt = true;
        perStepCable[i] = 1;
      }
      if (c < stepMin) {
        stepMin = c;
        stepMinX = x;
        if (c < hMin) {
          hMin = c;
          atX = x;
          atStepIndex = i;
        }
      }
    }
    perStep[i] = stepMin;
    perStepX[i] = stepMinX;
  }
  return {
    hMin,
    atX,
    atStepIndex,
    contact: cableInDirt ? "cable" : hMin < 0 ? "rider" : "none",
    perStep,
    perStepX,
    perStepCable,
  };
}

/**
 * §6.1 case 2 — solve for the rider at a requested horizontal position.
 * Outer bisection on the material coordinate (x(s_P) is monotone in s_P), inner 2×2 Newton.
 */
export function solveAtX(input: SpanInput, P: number, xTarget: number): SolveResult {
  const { L0 } = input;
  let lo = 1e-4 * L0;
  let hi = (1 - 1e-4) * L0;
  let result: SolveResult = { ok: false, kind: "no-convergence", residual: Infinity };
  let warm: Warm | undefined;
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    const r = solveSpan({ ...input, P, sP: mid }, warm);
    if (!r.ok) return r;
    warm = { H: r.state.H, V0: r.state.V0 };
    result = r;
    const x = riderNode(r.state).xD;
    if (Math.abs(x - xTarget) < 1e-4) break;
    if (x < xTarget) lo = mid;
    else hi = mid;
  }
  return result;
}
