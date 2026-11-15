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

import type { WindField } from "./wind-profile.ts";

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
 * Three error kinds for the plane engine, and a fourth — `outside-model` — that only §19's spatial
 * engine produces under wind, because most of §5.4 succeeds as an internal remedy (see
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
  | {
      kind: "no-convergence";
      attempts: number;
      residual: number;
      /**
       * Why, when the spatial engine knows (§19.10–§19.11): `"attempts"` every seed spent;
       * `"non-monotone"` a tightness driver reversed beyond its noise band, never resolved by
       * picking a root; `"unresolved"` a bracket that could not close; `"unreachable"` a target
       * under the taut branch's minimum. Absent from the plane engine's own failures.
       */
      reason?: "attempts" | "non-monotone" | "unresolved" | "unreachable";
    }
  | { kind: "slack-limit"; hFloored: number }
  /**
   * §19.11's second « incompatible configuration »: the line, under an applied wind, needs §8.4's
   * field outside `[0, L]` — at `x` — where it has no value. The engine does not extrapolate it.
   * Never produced without wind.
   */
  | { kind: "outside-model"; reason: "wind-abscissa"; x: number };

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
 *
 * **What is judged leaves the two Zones d'ancrage out** (#106): a rider position `x_P` and a point
 * `x` of the line or of the ground count only outside `[0, z] ∪ [L − z, L]`. With `z = 0` there is
 * no zone and every field reads exactly as it did before the zones. {@link ClearanceResult.whole}
 * is the same reduction with nothing left out, which judges nothing.
 */
export type ClearanceResult = {
  /**
   * Least ground clearance over the traverse outside the Zones d'ancrage, m; negative means
   * contact. `+∞` when no rider position falls outside them.
   */
  hMin: number;
  /** Horizontal position of that minimum, m. */
  atX: number;
  /** Index into the sweep's `steps` at which it occurs; −1 when no position is judged. */
  atStepIndex: number;
  /**
   * Which envelope is violated outside the Zones d'ancrage, if any — two contact kinds, two
   * separate verdicts. A contact inside a zone is no contact.
   */
  contact: "none" | "rider" | "cable";
  /**
   * Per-step clearance minimum over the points of the line outside the Zones d'ancrage, m; one
   * entry per sweep step, judged or not — a step inside a zone still has a line to draw.
   */
  perStep: Float64Array;
  /** Horizontal position of each per-step minimum, m. */
  perStepX: Float64Array;
  /** Per step, `1` when the cable itself is under the ground at a point outside the zones. */
  perStepCable: Uint8Array;
  /** Per step, `1` when the rider's own `x_P` is outside the Zones d'ancrage — a judged step. */
  perStepJudged: Uint8Array;
  /**
   * §11 over **every** rider position and every point, the zones included — what the minimum was
   * before the zones. Shown on Avancé beside the judged one, and judged by nothing.
   */
  whole: { hMin: number; atX: number; atStepIndex: number };
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
       * Nominal diameter, mm — **absent** when nobody typed one. Without wind no formula reads it;
       * under an applied wind it is the line's aerodynamic diameter (§19.4) and **required**:
       * `lineAeroOf` refuses its absence as `invalid-input{field:"d"}`, never a guessed diameter.
       */
      d?: number;
    };

/** What the solver consumes, whichever family produced it. Units: N/m, N, N. */
export type DerivedMaterial = { w: number; EA: number; strength: number };

// —— §19 — spatial quasi-static statics under gravity and wind (#127) ————————————————————————————
//
// Additive: every declaration above keeps its meaning, and the plane engine's results are §19's
// whenever no wind is applied (§19.16). Frame `(x, y, z)`: `x` horizontal A → B, `y` horizontal to
// the left of the travel, `z` up; `A = (0, 0, 0)`, `B = (L, 0, h)` (§19.2).

/** A vector of the spatial frame, SI. A plain object, so a result still structured-clones. */
export type Vec3 = { readonly x: number; readonly y: number; readonly z: number };

/**
 * §19.4's aerodynamic description of one carrying member under the Scenario's wind. `null` where an
 * input takes `LineAero | null` means **no wind applied** — speed 0, or no bearing because a
 * Position is missing — and the engine then evaluates the closed form (§19.8).
 */
export type LineAero = {
  /** §8.4's field: the speed at mid-span, the « from » azimuth and the profile. */
  readonly field: WindField;
  /** The line's bearing A → B, degrees clockwise from north — read outside the engine. */
  readonly bearing: number;
  /** `ρ`, kg/m³ — the Scenario's `airDensityOf`, the descent's own (§19.4). */
  readonly rho: number;
  /** The declared aerodynamic diameter, **m** (§19.4), constant during a calculation. */
  readonly d: number;
  /** `C_D⊥`, the member family's adopted normal-drag coefficient (§19.4). */
  readonly CDn: number;
};

/**
 * §19.5–§19.6's rider as the line receives it. `weight` is the whole `m·g`; `share` is `1/n_c`, the
 * fraction of the **whole** rider vector — weight and static wind force — one member carries (`1`
 * for the « one member carries all » case). The member's own `w` and wind are never shared.
 */
export type RiderLoad = {
  /** `m·g`, N — the whole rider, whatever the number of members. */
  readonly weight: number;
  /** `1/n_c` (§19.6), in `(0, 1]`. */
  readonly share: number;
  /** The vertical gabarit `h_rider`, m — the ellipsoid of §19.5 is deduced from it. */
  readonly hRider: number;
};

/** One span posed to §19's spatial solver. `rider: null` is the unloaded line. */
export type SpatialSpanInput = {
  /** Horizontal span, m. */
  readonly L: number;
  /** B's height above A, m. */
  readonly h: number;
  /** Unstretched length, m. */
  readonly L0: number;
  /** Weight per unstretched metre, N/m — never divided between members (§19.6). */
  readonly w: number;
  /** Axial stiffness, N. */
  readonly EA: number;
  /** Breaking load, N — §5.4's chord bound runs when present, as in {@link SpanInput}. */
  readonly strength?: number;
  /** The line's aerodynamics under the Scenario's wind, or `null` when no wind is applied. */
  readonly aero: LineAero | null;
  /** The rider held at the unstretched coordinate `sP`, or `null`. */
  readonly rider: (RiderLoad & { readonly sP: number }) | null;
};

/** §19.5's ellipsoid semi-axes, m: `a` along `x` (depth), `b` along `y` (width), `c` along `z`. */
export type Ellipsoid = { readonly a: number; readonly b: number; readonly c: number };

/** The trolley's node of a loaded spatial state (§19.11). */
export type SpatialNode = {
  /** The node's unstretched coordinate `S_P`, m. */
  readonly sP: number;
  /** The node `r_D = (x_D, y_D, z_D)`, m. */
  readonly rD: Vec3;
  /** `|F(S_P⁻)|` and `|F(S_P⁺)|`, N — nothing makes them equal (§19.3). */
  readonly Tminus: number;
  readonly Tplus: number;
  /**
   * `F(S_P⁻)`, N — the internal force on the A side of the trolley, whose norm is `T⁻`. The slope
   * of the coupe's projection at the node is `atan2(F_z⁻, F_x⁻)`, §6.2's `θ` read on the same side.
   */
  readonly Fminus: Vec3;
  /** The external force the rider puts on this member, `P_rider/n_c`, N (§19.6). */
  readonly Pext: Vec3;
};

/**
 * §19.11's spatial state: one equilibrium, scalars and echoed inputs only — sampling re-runs the
 * same shot from them (§19.8), so no polyline is stored.
 */
export type SpatialState = {
  /** `closed-form`: §4–§7 evaluated, no wind applied; `shooting`: §19.8's integration. */
  readonly method: "closed-form" | "shooting";
  /** The inputs, echoed. */
  readonly input: SpatialSpanInput;
  /** §19.8's resolution `N` the state was shot at — the sampler re-shoots with it. */
  readonly steps: number;
  /** `F(0)`, N — the force the line exerts on A, so also A's reaction. */
  readonly FA: Vec3;
  /** `F(L₀)`, N — B's reaction is `−F_B`. */
  readonly FB: Vec3;
  /** `|F_A|`, `|F_B|`, N. */
  readonly TA: number;
  readonly TB: number;
  /** The greatest `|F|` over the nodes, both sides of the trolley included, N. */
  readonly Tmax: number;
  /** `F_x(0)` and `F_x(L₀)`, N — §19.7's `H_A`, `H_B`; equal without wind. */
  readonly HA: number;
  readonly HB: number;
  /** The trolley's node, or `null` unloaded. */
  readonly node: SpatialNode | null;
  /** The rider's ellipsoid, or `null` unloaded. */
  readonly ellipsoid: Ellipsoid | null;
  /** `‖r(L₀) − B‖` reached, m. */
  readonly closure: number;
  /** Newton iterations spent, every attempt included. */
  readonly iterations: number;
};

/** Failure is a value (§19.11); `warm` is what a caller continues from — `F_A` and the Jacobian. */
export type SpatialSolveResult =
  | { ok: true; state: SpatialState; warm: SpatialWarm }
  | { ok: false; error: SolveError };

/**
 * §19.8's seed (1): the previous solution's `F_A`, and its last Jacobian `∂R/∂F_A` (row-major, 9
 * entries) when the caller has one — a sweep carries both from one position to the next.
 */
export type SpatialWarm = { readonly FA: Vec3; readonly jacobian: readonly number[] | null };

/** One solved slot of §19.12's sweep: the position's state scalars. */
export type SpatialStep = {
  /** Rider's unstretched coordinate, m. */
  readonly sD: number;
  /** The trolley's node, m. */
  readonly rD: Vec3;
  readonly FA: Vec3;
  readonly FB: Vec3;
  readonly TA: number;
  readonly TB: number;
  readonly Tmax: number;
  readonly HA: number;
  readonly HB: number;
  readonly Tminus: number;
  readonly Tplus: number;
  /** `F(S_P⁻)`, N — {@link SpatialNode.Fminus}. */
  readonly Fminus: Vec3;
  /** The external force on this member at the node, N. */
  readonly Pext: Vec3;
};

/** §19.12's slot: a solved step, or `null` — a hole, whose failure is in `failures`. */
export type SpatialSlot = SpatialStep | null;

/**
 * §19.12's sweep: **one slot per grid position, in grid order, holes kept**. Nothing is compacted;
 * `coverage < 1` makes the Verdict indéterminé (§19.14).
 */
export type SpatialSweepResult = {
  /** `sweepGrid(L₀, n)` — 260 positions at the default `n`. */
  readonly grid: Float64Array;
  /** `slots[i]` belongs to `grid[i]`. */
  readonly slots: readonly SpatialSlot[];
  /** The holes, by grid index, with their failure. */
  readonly failures: readonly { index: number; sD: number; error: SolveError }[];
  /** `solved / grid.length`. */
  readonly coverage: number;
  /** The unloaded input swept — `L₀` included — echoed so a slot can be re-sampled. */
  readonly input: SpatialSpanInput;
  /** The rider swept. */
  readonly rider: RiderLoad;
  /** §19.8's `N` every slot was shot at. */
  readonly steps: number;
};
