/**
 * The frozen engine declarations — « v1 build spec » § 2, *Public types*.
 *
 * Physics provenance: `docs/simulation-theory.md` §4 (elastic catenary), §5 (damped Newton and
 * its failure branches), §6 (point loads, the rolling sweep), §10 (verdict) and §11 (ground
 * clearance); the underlying reference reports are `docs/references/simulation tyrolienne.md`
 * (statics, numerics), `tyrolienne sur cable.md` (steel) and `tyrolienne sur corde.md`
 * (textile). **No formula and no number is transcribed here** — this module declares shapes
 * only, so nothing in it can drift from the theory doc.
 *
 * Rules this module exists to keep:
 *
 * - **These are a contract, not a draft.** § 2 is the output of a resolved decision ticket; a
 *   signature that feels awkward is not licence to redesign it. Alternatives already rejected:
 *   an unloaded/loaded solver split, three inverse entry points, a polyline field on a result,
 *   clearance as a sweep field, terrain as a closure, failure as a throw.
 * - **The engine is dependency-free.** Plain TypeScript declarations, no valibot: schemas live
 *   at the boundaries (URL, CSV, forms, Session), never inside `src/lib/sim/`.
 * - **The engine is SI.** `m`, `N`, `N/m`, `rad`; `g = 9,81` is fixed and unexposed. The force
 *   selector (daN / kN / kgf) and the `EA`-in-MN carve-out are display concerns that never
 *   cross this boundary.
 * - **Results are scalars only** — a `SpanState` plus analytic `sampleCable(state, n)`, never a
 *   stored polyline. That is what keeps clearance a *reducer* over the sweep and the solver
 *   terrain-free.
 */

/** A point load on the line. `s` is the **unstretched material coordinate** (§6.2's variable). */
export type PointLoad = {
  /** Load, N. */
  P: number;
  /** Material coordinate of the load along the unstretched cable, m. */
  s: number;
};

/**
 * One span posed to the solver. `loads: []` **is** the unloaded case: §6.1 keeps the unknowns at
 * `(H, V₀)` and the equations at `x(L₀) = L`, `z(L₀) = h` whatever `n` is, so there is one
 * Newton, one Jacobian assembler and one convergence path. The list stays a list although the
 * v1 UI exposes exactly one rider — §6.1's `n`-load generality costs nothing.
 */
export type SpanInput = {
  /** Horizontal span between anchors, m. */
  L: number;
  /** Far anchor's height relative to the near one, m; negative = descending. */
  h: number;
  /** Unstretched cable length, m. */
  L0: number;
  /** Weight per unit length, N/m (`w = μ·g`). */
  w: number;
  /** Axial stiffness, N. */
  EA: number;
  /** Point loads, `[]` for the unloaded line. */
  loads: PointLoad[];
  /**
   * Breaking load `MBF` | `MBL`, N — **optional**, and the one field § 2's code block does not
   * list. §5.4's chord bound is `L₀ > chord/(1 + T_break/EA)`: it needs `EA` **and** the breaking
   * load, and the spec is explicit that evaluating it in the form « would re-derive physics in
   * the UI. It stays in the engine — which obliges `solveSpan`'s pre-check to carry the §5.4
   * chord bound and report it as `invalid-input{field:"L0"}` with its violated bound ». That
   * obligation is unimplementable through the other five fields, and `warmStart` is the only
   * other parameter the frozen `solveSpan(input, warmStart?)` signature has.
   *
   * Optional, so every call site § 2 fixes still type-checks unchanged and the six required
   * fields stay exactly as § 2 writes them; `DerivedMaterial` — « what the solver consumes » —
   * already carries `strength` beside `w` and `EA`, so the app has it at hand. **Omitted, the
   * §5.4 pre-check does not run**: `catenary.ts` and `jacobian.ts` never read it, and the
   * material-free §15 fixtures stay material-free.
   */
  strength?: number;
};

/**
 * A solved span. Inputs are **echoed** so the state is self-sufficient for sampling — it kills
 * the « sampled with the wrong `w` » bug class, and `loads` is echoed for exactly that reason:
 * `sampleCable` on a loaded state must know where the kink is, and the clearance reducer
 * rebuilds one `SpanState` per sweep step.
 */
export type SpanState = {
  /** Horizontal tension component, N — §4.1's first unknown. */
  H: number;
  /** Vertical reaction at the near anchor, N — §4.1's second unknown. */
  V0: number;
  /** Vertical reaction at the far anchor, N. */
  VB: number;
  /** Tension at the near anchor, N. */
  TA: number;
  /** Tension at the far anchor, N. */
  TB: number;
  /** Greatest tension along the line, N. */
  Tmax: number;
  /** Unstretched cable length, m — echoed input. */
  L0: number;
  /** Weight per unit length, N/m — echoed input. */
  w: number;
  /** Axial stiffness, N — echoed input. */
  EA: number;
  /** Point loads — echoed input, so a loaded state can be sampled on its own. */
  loads: PointLoad[];
  /** Newton iterations spent on this solve. */
  iterations: number;
};

/** One rolling-sweep step — §6.2 step 3, exactly. */
export type SweepStep = {
  /** Rider's material coordinate, m. */
  sD: number;
  /** Rider's horizontal position, m. */
  xD: number;
  /** Rider's height relative to the near anchor, m. */
  zD: number;
  /** Horizontal tension component, N. */
  H: number;
  /** Vertical reaction at the near anchor, N. */
  V0: number;
  /** Tension at the near anchor, N. */
  TA: number;
  /** Tension at the far anchor, N. */
  TB: number;
  /** Cable slope at the rider, rad; signed, negative = descending. */
  theta: number;
};

/**
 * The precomputed traverse. The grid is **deterministic from `(L₀, n)`** — a step array that
 * depends on the results is one you cannot fixture — and `grid.length` is **260** at the default
 * `n` (240 uniform steps plus 10 geometric tail steps per end, endpoints excluded), which is
 * also the denominator the UI prints.
 */
export type SweepResult = {
  /** Swept `s_D` values, m; length 260 at the default `n`. */
  grid: Float64Array;
  /** The solved steps, in grid order. */
  steps: SweepStep[];
  /** The steps that did not solve, with the grid index and `s_D` they failed at. */
  failures: { index: number; sD: number; error: SolveError }[];
  /** `solved / grid.length`. `coverage < 1` **suppresses** the verdict, it never qualifies it. */
  coverage: number;
};

/** Failure is a **value**, never a throw: a sweep that loses step 137 keeps the other 259. */
export type SolveResult =
  | { ok: true; state: SpanState; notes: SolveNote[] }
  | { ok: false; error: SolveError };

/**
 * Three error kinds, no more, because most of §5.4 succeeds as an internal remedy (see
 * {@link SolveNote}). Ground contact is **not** an error — it surfaces in `evaluateClearance` as
 * `contact: "rider" | "cable"`, which is what keeps terrain out of the solver. Exceeding `MBF`
 * is not one either: a line strung too tight solves perfectly and §10 then says unsafe.
 *
 * `bound` and `boundKind` are **not decoration**. Without them « Tension impossible » is
 * unwritable — the state degrades to quoting an `L₀` floor at a user editing a tension.
 * `resolveL0` catches `field: "L0"` and re-emits the bound in the **driving quantity**
 * (`D_target` / `H_target` / `T_target`), mapped forward through the same inversion that failed.
 */
export type SolveError =
  | {
      kind: "invalid-input";
      /** `"L0"` | `"w"` | `"EA"` | `"L"`, or `"D_target"` | `"H_target"` | `"T_target"` once re-emitted. */
      field: string;
      /** The offending value, in the field's own engine unit. */
      value: number;
      /** The attainable bound, in the field's own quantity — quoted once, never twice. */
      bound: number;
      /** Which side the bound is: a floor (`"min"`) or a ceiling (`"max"`). */
      boundKind: "min" | "max";
    }
  | { kind: "no-convergence"; attempts: number; residual: number }
  | { kind: "slack-limit"; hFloored: number };

/**
 * Internal remedies the solver applies **and then succeeds**: §4.3's straight-bar fallback at
 * `w·L₀/H < 10⁻⁴`, §5.1's damping, §5.2's re-seed. Diagnostics only — **no `SolveNote` ever
 * reaches the UI**; they exist for the `[ Copier le diagnostic ]` payload.
 */
export type SolveNote = "near-taut-fallback" | "damped" | "reseeded";

/**
 * Terrain crosses as **data**, never a closure: a closure cannot be structured-cloned, and data
 * also beats a megamorphic callback in the clearance inner loop.
 *
 * `flat` stays in the union although v1's UI never emits it — manual-mode ground is the straight
 * line between the two anchor bases, which emits the **2-point case** of `profile`
 * (`xs: [0, L]`, `zs: [zBaseA, zBaseB]`). `flat` remains useful for fixtures. Rejected: an `x0`
 * offset field, which would put an offset in the clearance inner loop.
 */
export type Terrain =
  | { kind: "flat"; z: number }
  | { kind: "profile"; xs: Float64Array; zs: Float64Array };

/**
 * §11's reduction over the sweep. It is a **reducer, not a sweep field**: the §15 fixtures need
 * no terrain stub, and terrain enters the engine at exactly one point.
 */
export type ClearanceResult = {
  /** Least ground clearance over the whole traverse, m; negative means contact. */
  hMin: number;
  /** Horizontal position of that minimum, m. */
  atX: number;
  /** Index into the sweep's `steps` at which it occurs. */
  atStepIndex: number;
  /** Which envelope is violated, if any — two contact kinds, two separate verdicts. */
  contact: "none" | "rider" | "cable";
  /** Per-step clearance minimum, m; one entry per sweep step. */
  perStep: Float64Array;
  /** Horizontal position of each per-step minimum, m. */
  perStepX: Float64Array;
  /** Per step, `1` when the minimum is the cable's rather than the rider's. */
  perStepCable: Uint8Array;
};

/**
 * The material **input** spec, a discriminated union on `family` — not the derived numbers:
 * steel derives from geometry, textile transcribes from a datasheet. Both specs are retained
 * across a family flip. Overrides are **steel-only and per value**. Termination efficiency
 * `η_t` is deliberately absent: it is one picker per end, consumed by the verdict only, because
 * the engine already reports `T_A` and `T_B` separately.
 */
export type MaterialSpec =
  | {
      family: "steel";
      /**
       * Nominal diameter, **mm** — § 3's field table (`Diamètre nominal | d | mm`, default
       * `12,0`) and §13.1's `MBF [kN] = K·d²·R₀/1000` are both mm-based. The SI-in-metres rule
       * above governs the *span* quantities the solver consumes, not this input spec: passing
       * `0.012` here would scale `MBF` and `EA` by 10⁻⁶.
       */
      d: number;
      /** Tensile grade, MPa (= N/mm², § 3's unit for the same field). */
      R0: 1770 | 1960;
      construction: "fibre-core" | "iwrc";
      /** Per-value overrides of the derived numbers; `MBF` in N, `EA` in N, `mu` in kg/m. */
      overrides?: { MBF?: number; EA?: number; mu?: number };
    }
  | {
      family: "textile";
      ropeClass: "hmpe" | "pa-en1891a" | "polyester";
      /** Minimum breaking load, N — from the datasheet. */
      MBL: number;
      /** Linear mass, kg/m. */
      mu: number;
      /** Stiffness factor, `EA = k·MBL`. */
      k: number;
      /**
       * Nominal diameter, mm — **absent** when nobody typed one. Informational: no formula reads it,
       * the tensioning work that needs it does.
       */
      d?: number;
    };

/** What the solver consumes, whichever family produced it. Units: N/m, N, N. */
export type DerivedMaterial = { w: number; EA: number; strength: number };
