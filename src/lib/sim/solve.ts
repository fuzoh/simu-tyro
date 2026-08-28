/**
 * §5's damped Newton — `docs/simulation-theory.md` §5 (the iteration, §5.1's damping and retry
 * policy, §5.2's two seeds, §5.3's tolerance, §5.4's failure table), §4.3 (the degenerate
 * branches), §4.1 (the residual's geometry) and §2 (frame, signs, units). Underlying reference
 * reports: `docs/references/simulation tyrolienne.md` (numerics, MoorPy/GHTyro precedents) and
 * `algo simulation tyrolienne.md` §7 (the parabolic seed) — but **no value is transcribed from
 * either**: §14 records which of their worked examples are fabricated, and §15 is the only
 * fixture source. Every constant below is quoted from § 2's « Solver constants » table, which
 * quotes the theory doc.
 *
 * Rules this module exists to keep:
 *
 * - **Failure is a value, never a throw.** A sweep that loses step 137 keeps the other 259, so
 *   every refusal leaves here as a `SolveError` — « voir § 2 — le contrat du moteur ». Three
 *   kinds and no more: most of §5.4 is an internal remedy that *succeeds* and reports a
 *   {@link SolveNote}.
 * - **Terrain never enters.** §4.3's « ground contact » row is `evaluateClearance`'s
 *   `contact: "rider" | "cable"`, not a branch here; that is what keeps a solve failure
 *   reproducible from six numbers.
 * - **`no-convergence` and `slack-limit` are guards, not paths.** Measured across 349 440
 *   solves inside the admissible envelope, neither fires and `reseeded` fired 0 times. Their
 *   tests are **injected** with `vi.mock` on `jacobian.ts`, never hunted with pathological
 *   inputs, and never by widening this module's signatures — « voir § 11 — plan de test ».
 * - **`solveSpan(input, warmStart?)` is contract.** The damping branch, the seeds, the
 *   straight-bar fallback and the two bounds are **named module exports** because §15 and § 11
 *   require tests to reach them directly, exactly as `levelSpanShortcut` is; none of them is
 *   re-exported from `index.ts`.
 * - **The engine is dependency-free and SI** — `m`, `N`, `N/m`; `s` is the unstretched material
 *   coordinate from A, `z` is positive up, and `V₀ < 0` on a sagging span.
 */

import type { CableShape } from "./catenary.ts";
import type { SolveError, SolveNote, SolveResult, SpanInput, SpanState } from "./types.ts";

import { inSOrder, levelSpanShortcut, xAt, zAt } from "./catenary.ts";
import { jacobianAt } from "./jacobian.ts";

/** The `(H, V₀)` pair Newton iterates on — §4.1's two unknowns, and `warmStart`'s shape. */
export type Iterate = { H: number; V0: number };

/**
 * § 2's « Solver constants », quoted from the theory doc. Two of the seven are this module's own
 * pragmatic choice because §5 fixes no number for them — see the field comments.
 */
export const SOLVER = {
  /** §5.3's tolerance on the anchor-position residual `‖(Δx, Δz)‖`, m. */
  tolerance: 1e-6,
  /** §5.3's « spans ≲ 1000 m » crossover, beyond which the tolerance scales with `L`. */
  toleranceScaleSpan: 1000,
  /** §5.1's retry policy: re-seed and retry, **≤ 5 attempts**. */
  maxAttempts: 5,
  /**
   * §5.1's `MaxIter`, per attempt. §5 names the cap without fixing it; 100 is ~5× the worst
   * iteration count measured on the §15 rows, so a real stall still re-seeds rather than
   * grinding.
   */
  maxIterations: 100,
  /**
   * How many times §5.1's line search may halve `α` before the attempt is over. §5 says « halve
   * until the residual norm decreases » without a floor; 20 halvings is `α ≈ 10⁻⁶`, below which
   * a step cannot move a converging iterate by more than the tolerance anyway.
   */
  maxHalvings: 20,
  /** §5.1's cap on step growth — MoorPy `dsolve2`'s `a_max`. */
  stepGrowthCap: 1.2,
  /** §4.3's near-taut / low-weight branch: `w·L₀/H < 10⁻⁴` ⇒ straight elastic bar. */
  nearTautRatio: 1e-4,
  /** §4.3's slack limit: floor the horizontal stiffness at `0.01·|w|` (MoorPy `slack_kx`). */
  slackStiffnessFactor: 0.01,
} as const;

/**
 * §5.3's convergence bar: **absolute anchor-position error in metres**, `1×10⁻⁶ m` for spans
 * ≲ 1000 m and `1×10⁻⁶·L` scaled beyond — quoted, not chosen, and deliberately not smoothed into
 * a continuous `L/1000` ramp that §5.3 does not state.
 */
export function residualTolerance(L: number): number {
  return L <= SOLVER.toleranceScaleSpan ? SOLVER.tolerance : SOLVER.tolerance * L;
}

/**
 * §4.3's slack limit as a floor on `H`, N: `0.01·|w|`, MoorPy's `slack_kx`. Newton's `H` is kept
 * strictly above it (§4.3's « clamp `H > 0` »), and a line search that cannot leave it is the
 * `slack-limit` refusal — the line is lying down.
 */
export function horizontalTensionFloor(w: number): number {
  return SOLVER.slackStiffnessFactor * Math.abs(w);
}

/**
 * §5.4's chord bound, m: `L₀ > chord/(1 + T_break/EA)`, with `chord = √(L² + h²)`.
 *
 * **The floor _is_ the breaking load**: at it, the straight elastic bar `T = (chord/L₀ − 1)·EA`
 * reaches `T_break` exactly, which is why the refusal it produces carries an attainable bound
 * and no fix action — there is no reachable state where a line solves cleanly and the verdict
 * says rupture.
 */
export function chordBoundFloor(span: { L: number; h: number; EA: number }, strength: number) {
  return Math.hypot(span.L, span.h) / (1 + strength / span.EA);
}

/**
 * §4.3's near-taut / low-weight test: the `asinh` ratios are ill-conditioned below `10⁻⁴`.
 *
 * **Read on the stretched side only** — ticket 37 defect 5, decided rather than deleted. The
 * fallback this gates is {@link straightBarIterate}, which exists only where `L₀ < chord`, so
 * {@link solveSpan} can take it there and nowhere else. On a *slack* line `w·L₀/H` has a floor set
 * by the line's own elastic stretch (0,120 at the shipped rope's `EA` 6,9 MN on a level 100 m span
 * at `L₀ = chord + 10⁻⁹`, 2,29×10⁻³ at 1 TN), so § 4.3's threshold is first reachable near
 * `EA` 10¹⁵ N — and where it *is* reached Newton converges unaided. No slack twin is owed.
 */
export function isNearTaut(w: number, L0: number, H: number): boolean {
  return (w * L0) / H < SOLVER.nearTautRatio;
}

/**
 * §4.3's straight elastic bar, `T₀ = (d/L₀ − 1)·EA` with `d = chord` — the near-taut fallback's
 * closed form, and the seed for a stretched line (`L₀ < chord`) that no sag-based seed covers.
 *
 * The axial force acts along the chord, so `H = T·L/d`; self-weight splits evenly between the
 * ends, which is why `V₀ = T·h/d − w·L₀/2` returns §4.1's exact `−w·L₀/2` on a level span rather
 * than hanging the whole weight on A.
 *
 * @returns `null` when the line is slack (`L₀ ≥ chord`), where the bar carries no tension.
 */
export function straightBarIterate(input: SpanInput): Iterate | null {
  const chord = Math.hypot(input.L, input.h);
  const T = (chord / input.L0 - 1) * input.EA;
  if (!(T > 0) || !Number.isFinite(T)) return null;
  return { H: (T * input.L) / chord, V0: (T * input.h) / chord - (input.w * input.L0) / 2 };
}

/** What {@link dampedStep} did with one Newton direction. */
export type DampedStep = {
  /** The accepted iterate, or `from` unchanged when nothing was accepted. */
  next: Iterate;
  /** `‖r‖` at {@link next}, m. */
  norm: number;
  /** The fraction of the Newton step that was accepted. */
  alpha: number;
  /** `α` was halved at least once — §5.1's `damped` note. */
  damped: boolean;
  /** Nothing was accepted **and** every candidate sat at the `H` floor — §4.3's `H → 0`. */
  floored: boolean;
  /** `false` when no `α` decreased the residual: the attempt is over and must re-seed. */
  accepted: boolean;
};

/**
 * §5.1's line search: `[Yₙ₊₁] = [Yₙ] − α·J⁻¹·r`, **halving `α` until the residual norm
 * decreases**, keeping `H` above §4.3's floor.
 *
 * A named export, and the only way the `damped` note is testable: it fires in 0,6 % of
 * iterations in aggregate, so a test that waits for an input to provoke it asserts nothing —
 * « voir § 11 — plan de test ».
 *
 * @param from the current iterate.
 * @param step the full Newton direction `−J⁻¹·r`, already capped for growth.
 * @param norm `‖r(from)‖`, the value the candidate has to beat.
 * @param normAt evaluates `‖r‖` at a candidate — §5.3's residual, in metres.
 * @param hFloor §4.3's floor on `H`; a candidate at or below it is refused, not clamped, so the
 *   clamp is enforced *through* the damping §4.3 points at rather than beside it.
 */
export function dampedStep(
  from: Iterate,
  step: Iterate,
  norm: number,
  normAt: (at: Iterate) => number,
  hFloor: number,
): DampedStep {
  let alpha = 1;
  let evaluated = 0;
  for (let halvings = 0; halvings <= SOLVER.maxHalvings; halvings++) {
    const next = { H: from.H + alpha * step.H, V0: from.V0 + alpha * step.V0 };
    if (next.H > hFloor) {
      evaluated++;
      const candidate = normAt(next);
      if (candidate < norm) {
        return {
          next,
          norm: candidate,
          alpha,
          damped: halvings > 0,
          floored: false,
          accepted: true,
        };
      }
    }
    alpha /= 2;
  }
  return { next: from, norm, alpha, damped: true, floored: evaluated === 0, accepted: false };
}

/**
 * §5.2's seeds, in the order they are tried — at most {@link SOLVER.maxAttempts} of them, one per
 * attempt of §5.1's retry policy.
 *
 * Peyrot–Goulois first (MoorPy's default, better near taut), then the parabolic seed, then
 * §4.3's straight bar for a stretched line; the list is padded with rescalings of the first seed
 * so a re-seed is always a genuinely different starting point. A `warmStart` — the sweep marches
 * with one — goes in front of all of them.
 *
 * Both §5.2 forms are stated for the unloaded line. A point load enters exactly as §6.1 says it
 * does: the total vertical load becomes `w·L₀ + ΣP` and the reactions split it, so with
 * `loads: []` each expression collapses to §5.2's verbatim.
 */
export function seedIterates(input: SpanInput, warmStart?: Iterate): Iterate[] {
  const { L, h, L0, w } = input;
  const chord = Math.hypot(L, h);
  const P = input.loads.reduce((sum, load) => sum + load.P, 0);
  const seeds: Iterate[] = [];
  const push = (H: number, V0: number) => {
    if (Number.isFinite(H) && Number.isFinite(V0) && H > 0) seeds.push({ H, V0 });
  };

  if (warmStart) push(warmStart.H, warmStart.V0);

  // §5.2's Peyrot–Goulois seed: λ₀ = √(3·((L₀²−h²)/L² − 1)), H₀ = max(|w·L/(2λ₀)|, tol),
  // V₀,B = (w/2)·(h/tanh λ₀ + L₀). Real only on a slack line, which is where it is wanted.
  //
  // `V₀` comes out of §5.2's `V_B` through §6.1's identity `V_B = V₀ + w·L₀ + ΣP`, inverted —
  // so **the whole of ΣP**, not half of it. The symmetric split below is the other family: there
  // `−(w·L₀ + ΣP)/2` is the consistent form, and reading one factor across is what ticket 37
  // defect 2 closed.
  const excess = (L0 * L0 - h * h) / (L * L) - 1;
  if (excess > 0) {
    const lambda = Math.sqrt(3 * excess);
    const VB = (w / 2) * (h / Math.tanh(lambda) + L0);
    push(Math.max(Math.abs((w * L) / (2 * lambda)), SOLVER.tolerance), VB - w * L0 - P);
  }

  // §5.2's parabolic seed: H ≈ w·L²/(8·D_est), D_est = √(3·L·(L₀−chord)/8),
  // V₀ ≈ −w·L₀/2 + h·H/L.
  if (L0 > chord) {
    const D = Math.sqrt((3 * L * (L0 - chord)) / 8);
    const H = ((w * L + P) * L) / (8 * D);
    push(H, -(w * L0 + P) / 2 + (h * H) / L);
  }

  // §4.3's straight elastic bar — the only seed defined when the line is stretched, not slack.
  // `− ΣP/2` is the **bar's own** derivation, not §6.1's inversion: it splits the self-weight
  // evenly between the ends, so `bar.V0 − ΣP/2` is exactly `T·h/d − (w·L₀ + ΣP)/2`.
  const bar = straightBarIterate(input);
  if (bar) push(bar.H, bar.V0 - P / 2);

  const base = seeds[0] ?? { H: Math.max(w * L, 1), V0: -(w * L0 + P) / 2 };
  if (seeds.length === 0) seeds.push(base);
  for (const factor of [0.25, 4, 1 / 16, 16]) {
    if (seeds.length >= SOLVER.maxAttempts) break;
    push(base.H * factor, base.V0);
  }
  return seeds.slice(0, SOLVER.maxAttempts);
}

/** Tier one, and §5.4's chord bound — every refusal `solveSpan` makes before iterating. */
function refuse(input: SpanInput): SolveError | null {
  const positives: [string, number][] = [
    ["L", input.L],
    ["L0", input.L0],
    ["w", input.w],
    ["EA", input.EA],
  ];
  for (const [field, value] of positives) {
    if (!Number.isFinite(value) || value <= 0) {
      return { kind: "invalid-input", field, value, bound: 0, boundKind: "min" };
    }
  }
  // `h` is signed — only its finiteness is a refusal, and it is one: a NaN anchor height
  // poisons the residual instead of failing.
  if (!Number.isFinite(input.h)) {
    return { kind: "invalid-input", field: "h", value: input.h, bound: 0, boundKind: "min" };
  }
  // §5.4's chord bound, when the caller knows the breaking load. `invalid-input{field:"L0"}`
  // **never** means « nombre invalide » here: it is « Tension impossible », and `resolveL0`
  // re-emits this bound in the driving quantity.
  const strength = input.strength;
  if (strength !== undefined && Number.isFinite(strength) && strength > 0) {
    const floor = chordBoundFloor(input, strength);
    if (input.L0 < floor) {
      return {
        kind: "invalid-input",
        field: "L0",
        value: input.L0,
        bound: floor,
        boundKind: "min",
      };
    }
  }
  return null;
}

/** One attempt of §5.1's iteration, from one seed. */
type Attempt = {
  ok: boolean;
  iterate: Iterate;
  /** The residual it finished on, m. */
  norm: number;
  iterations: number;
  /** How many iterations §5.1's line search had to damp. */
  damped: number;
  /** The attempt died against §4.3's `H` floor rather than merely failing to converge. */
  slack: boolean;
};

/**
 * §5.1's damped Newton from one seed.
 *
 * `fixedV0` is §4.1's level-span shortcut: for `h = 0` and `loads: []`, symmetry gives `V₀`
 * **exactly** and `z(L₀) ≡ 0` for every `H`, so the 2×2 system collapses to one equation in `H`
 * — one unknown, one residual component, and a `V₀` that is exact rather than converged.
 */
function runNewton(
  input: SpanInput,
  seed: Iterate,
  tol: number,
  hFloor: number,
  fixedV0: number | null,
): Attempt {
  const { L, h, L0, w, EA } = input;
  const loads = inSOrder(input.loads);
  const shapeAt = (at: Iterate): CableShape => ({ H: at.H, V0: at.V0, w, EA, loads });
  const residualAt = (at: Iterate) => {
    const shape = shapeAt(at);
    return { rx: xAt(shape, L0) - L, rz: zAt(shape, L0) - h };
  };
  const normAt = (at: Iterate) => {
    const r = residualAt(at);
    return Math.hypot(r.rx, r.rz);
  };

  let at: Iterate = { H: Math.max(seed.H, hFloor), V0: fixedV0 ?? seed.V0 };
  let r = residualAt(at);
  let norm = Math.hypot(r.rx, r.rz);
  let iterations = 0;
  let damped = 0;
  let slack = false;
  let previousLength: number | null = null;

  while (norm > tol && iterations < SOLVER.maxIterations) {
    iterations++;
    const J = jacobianAt(shapeAt(at), L0);

    let step: Iterate;
    if (fixedV0 !== null) {
      if (!Number.isFinite(J.dxdH) || J.dxdH === 0) break;
      step = { H: -r.rx / J.dxdH, V0: 0 };
    } else {
      // §4.2's 2×2 inverse lives here, not in `jacobian.ts`: the singularity test is Newton's
      // business, which is what lets § 11 mock a singular matrix in.
      const det = J.dxdH * J.dzdV0 - J.dxdV0 * J.dzdH;
      if (!Number.isFinite(det) || det === 0) break;
      step = {
        H: -(J.dzdV0 * r.rx - J.dxdV0 * r.rz) / det,
        V0: -(J.dxdH * r.rz - J.dzdH * r.rx) / det,
      };
    }
    if (!Number.isFinite(step.H) || !Number.isFinite(step.V0)) break;

    // §5.1's cap on step growth (MoorPy `dsolve2`'s `a_max`), measured against the step the
    // previous iteration actually took.
    let length = Math.hypot(step.H, step.V0);
    if (previousLength !== null && length > SOLVER.stepGrowthCap * previousLength) {
      const scale = (SOLVER.stepGrowthCap * previousLength) / length;
      step = { H: step.H * scale, V0: step.V0 * scale };
      length *= scale;
    }

    const taken = dampedStep(at, step, norm, normAt, hFloor);
    if (taken.damped) damped++;
    if (!taken.accepted) {
      slack = taken.floored;
      break;
    }
    at = taken.next;
    norm = taken.norm;
    previousLength = taken.alpha * length;
    r = residualAt(at);
  }

  return { ok: norm <= tol, iterate: at, norm, iterations, damped, slack };
}

/** § 2's `SpanState`: the solved pair, the reactions it implies, and the echoed inputs. */
function toState(input: SpanInput, at: Iterate, iterations: number): SpanState {
  const P = input.loads.reduce((sum, load) => sum + load.P, 0);
  const VB = at.V0 + input.w * input.L0 + P;
  const TA = Math.hypot(at.H, at.V0);
  const TB = Math.hypot(at.H, VB);
  return {
    H: at.H,
    V0: at.V0,
    VB,
    TA,
    TB,
    // §2: `V(s)` is monotone increasing in `s` — self-weight plus §6.1's upward jumps — so
    // `|V|`, and with `H` constant `T`, is greatest at one of the two ends.
    Tmax: Math.max(TA, TB),
    L0: input.L0,
    w: input.w,
    EA: input.EA,
    loads: [...input.loads],
    iterations,
  };
}

/**
 * §5's damped Newton on `r = (x(L₀) − L, z(L₀) − h)` — the engine's one statics entry point, for
 * the unloaded line and the loaded one alike (`loads: []` **is** the unloaded case).
 *
 * The order of business, each step of it a § the spec fixes:
 *
 * 1. Tier-one refusals and §5.4's chord bound — before a single iteration, because both are
 *    statements about the input rather than about the iteration.
 * 2. §4.3's near-taut fallback, decided on the straight bar's own `H`: below `w·L₀/H = 10⁻⁴` the
 *    `asinh` ratios are ill-conditioned and the bar *is* the answer. A **stretched-line branch by
 *    construction** — there is no bar on a slack one — voir {@link isNearTaut}.
 * 3. §5.2's seeds, tried in order, each one a §5.1 attempt with damping and §4.3's `H` clamp —
 *    at most five, which is §5.1's retry policy.
 *
 * @param warmStart the previous step's `(H, V₀)`; §6.2's sweep marches with one, and it is tried
 *   ahead of §5.2's seeds rather than instead of them, so a bad warm start costs an attempt and
 *   never an answer.
 */
export function solveSpan(input: SpanInput, warmStart?: Iterate): SolveResult {
  const refusal = refuse(input);
  if (refusal) return { ok: false, error: refusal };

  const notes: SolveNote[] = [];
  const tol = residualTolerance(input.L);
  const hFloor = horizontalTensionFloor(input.w);

  const bar = straightBarIterate(input);
  if (bar && isNearTaut(input.w, input.L0, bar.H)) {
    notes.push("near-taut-fallback");
    return { ok: true, state: toState(input, bar, 0), notes };
  }

  // §4.1's level-span shortcut: `null` unless `h === 0 && loads.length === 0`, in which case
  // `V₀ = −w·L₀/2` is exact and Newton only has to find `H`.
  const fixedV0 = levelSpanShortcut(input);
  const seeds = seedIterates(input, warmStart);

  let iterations = 0;
  let best = Infinity;
  let slack = false;
  for (let attempt = 0; attempt < seeds.length; attempt++) {
    const run = runNewton(input, seeds[attempt], tol, hFloor, fixedV0);
    iterations += run.iterations;
    best = Math.min(best, run.norm);
    // One note per occurrence: the `[ Copier le diagnostic ]` payload prints « damped×12 », and
    // a deduplicated array could not say 12.
    for (let i = 0; i < run.damped; i++) notes.push("damped");
    if (run.ok) {
      if (attempt > 0) notes.push("reseeded");
      return { ok: true, state: toState(input, run.iterate, iterations), notes };
    }
    // « Any », not « the last »: §4.3's `H → 0` is a diagnosis about the line, and an attempt
    // that collapsed onto the floor has made it. A later seed diverging some other way does not
    // un-make it — and both kinds render « Calcul impossible » regardless.
    slack ||= run.slack;
  }

  // §4.3 splits the two singular ends: `H → 0` is the line lying down, everything else is
  // §5.1's exhausted retry policy. Both render « Calcul impossible ».
  if (slack) return { ok: false, error: { kind: "slack-limit", hFloored: hFloor } };
  return { ok: false, error: { kind: "no-convergence", attempts: seeds.length, residual: best } };
}
