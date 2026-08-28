/**
 * The §15 seed set — `docs/simulation-theory.md` §15, « Verified numerical fixtures ».
 *
 * The **only** fixture source for the engine. Values were regenerated 2026-08-05 from an
 * independent elastic-catenary implementation and cross-validated against MoorPy 1.3.0
 * (≥ 6 s.f. agreement); they are quoted here to the 6 s.f. §15 publishes.
 *
 * Rules this module exists to keep:
 *
 * - **Never transcribe a value from `docs/references/`.** §14 of the theory file records which
 *   worked examples are fabricated — R1's `z(L₀) = 24.84`, its two-segment and sweep examples,
 *   its pycatenary and SSF tables, and R2's transcribed MoorPy pairs. §15's own « Excluded
 *   fixtures » list is never ported.
 * - **`Z7` (thermal, §9) and `Z8` (dynamics, §12) are absent on purpose** — that physics is out
 *   of v1 scope. Add them with the feature, not before.
 * - **Provenance is a field, not a comment.** `FixtureSource` keeps the two classes apart at the
 *   type level: a `simulation-theory.md §15 …` row is MoorPy-cross-validated physics, a
 *   `[MEASURED] …` row is this app's own output at a moment in time. They assert at different
 *   tiers (see `TOLERANCE`), so treating them alike invites tightening the wrong one.
 * - **No import from `src/lib/sim/`.** The fixtures are plain data and stay free of engine types
 *   and schema stubs, so a fixture can never be re-derived from the code it is meant to check.
 *   Each `in` block mirrors §15's stated inputs exactly; a test composes the `SpanInput` it needs.
 *
 * Frame and units are §2's: SI throughout, `s` the unstretched material coordinate, `z` positive
 * up, `h` the far anchor's height relative to the near one.
 */

/** A §15 row: MoorPy-cross-validated physics. Asserted at `TOLERANCE.solvedScalar`. */
type TheorySource = `simulation-theory.md §15 ${string}`;

/** A resolved ticket's own measurement, 3–4 s.f. Asserted at `TOLERANCE.measured`. */
type MeasuredSource = `[MEASURED] ${string}`;

export type FixtureSource = TheorySource | MeasuredSource;

export type Fixture = {
  readonly source: FixtureSource;
  readonly in: Readonly<Record<string, number>>;
  readonly out: Readonly<Record<string, number>>;
  /** Values a correct implementation must **not** produce — carried rejections, not outputs. */
  readonly rejected?: Readonly<Record<string, number>>;
};

/**
 * The four tolerance tiers of § 11, because they measure four different things. The « assert at
 * `1e-3` for now » TODO is discharged: §5.3 fixes the solver's tolerance and a solver at that
 * tolerance was measured against every ported fixture at ≤ 4×10⁻⁶ relative.
 */
export const TOLERANCE = {
  /** Relative, on `H`, `V0`, `VB`, `TA`, `TB`, `Tmax`, `L0`, `zD`, `sP`, `sigmaD`. */
  solvedScalar: 4e-6,
  /**
   * Relative, on anything sourced from a `[MEASURED]` row rather than from §15 — and **floored at
   * the half-ulp of the recorded value's own last digit**, `max(1e-3·|expected|, 0,5·10⁻ᵈ)` for a
   * value recorded to `d` decimals. This constant is the relative half; the assertion supplies
   * `d`. Voir `docs/conventions/testing.md` — *Tolerance*: `1e-3` on a garde recorded as « 0,40 m »
   * is ±0,4 mm, four digits out of a two-decimal record. At 3–4 s.f. the relative half dominates,
   * so the floor never loosens a row that has the digits.
   */
  measured: 1e-3,
  /** Absolute — §15's own bar for the analytic Jacobian against finite differences. */
  jacobianVsFiniteDifference: 2e-9,
  /** Absolute — §15's own bar for global force balance on point-load cases. */
  forceBalance: 1e-10,
  /** Significant figures — §15's own bar for the `EA → 10¹⁴` inextensible limit. */
  inextensibleSignificantFigures: 7,
} as const;

/**
 * Positions of scanned extrema are limited by the sample spacing, not by the solver: the bar is
 * **absolute, twice the spacing**. 0,10 m at `Z1`'s `n = 2000` over 100 m; 0,06 m at `Z3`'s
 * `n = 4000` over 120 m.
 */
export function scannedPositionTolerance(spanMetres: number, samples: number): number {
  return (2 * spanMetres) / samples;
}

/**
 * §4.2 makes `∂x/∂V₀` and `∂z/∂H` the same expression, so §15 publishes one number for both.
 * One literal, two names — the fixture cannot disagree with itself, and `jacobian.test.ts`
 * asserts the engine's two partials as an **equality**, not against a tolerance.
 */
const F1_MIXED_PARTIAL = -4.55088e-3;

/** F1 — Irvine forward evaluation + analytic Jacobian, taut rising segment. */
export const F1 = {
  source: "simulation-theory.md §15 F1",
  in: { H: 5000, V0: 1000, w: 5, EA: 1e7, L0: 100 },
  out: {
    /** m */
    xAtL0: 97.0329,
    /** m */
    zAtL0: 24.2392,
    /** m/N */
    dxdH: 1.16024e-3,
    /** m/N */
    dxdV0: F1_MIXED_PARTIAL,
    /** m/N — the same expression as `dxdV0` (§4.2). */
    dzdH: F1_MIXED_PARTIAL,
    /** m/N */
    dzdV0: 1.82564e-2,
  },
  rejected: {
    /** §2.1's sign trap: a mixed convention returns a plausible 24.2342 for `z(L₀)`. */
    zAtL0MixedConvention: 24.2342,
    /** §14 ledger #1: R1's fabricated `z(L₀)`. */
    zAtL0R1: 24.84,
  },
} as const satisfies Fixture;

/** Z1 — unloaded level span, mild slack (MoorPy-confirmed). */
export const Z1 = {
  source: "simulation-theory.md §15 Z1",
  in: { L: 100, h: 0, L0: 100.5, w: 5, EA: 1e7 },
  out: {
    /** N */
    H: 1423.94,
    /** N — exactly `−w·L₀/2`, which is `levelSpanShortcut`'s whole claim. */
    V0: -251.25,
    /** N */
    VB: 251.25,
    /** N */
    Tmax: 1445.94,
    /** m — scanned extremum, `TOLERANCE.solvedScalar` on the value. */
    zMin: -4.39987,
    /** m — scanned extremum, `scannedPositionTolerance` on the position. */
    xAtZMin: 50.0,
  },
} as const satisfies Fixture;

/** Z2 — unloaded level span, deep slack (MoorPy-confirmed). */
export const Z2 = {
  source: "simulation-theory.md §15 Z2",
  in: { L: 100, h: 0, L0: 102, w: 10, EA: 1e7 },
  out: {
    /** N */
    H: 1442.11,
    /** N — exactly `−w·L₀/2`. */
    V0: -510.0,
    /** N */
    TA: 1529.63,
    /** N — equal to `TA` by symmetry. */
    TB: 1529.63,
    /** m */
    zMin: -8.75376,
  },
} as const satisfies Fixture;

/** Z3 — unloaded inclined span, B lower (MoorPy-confirmed, mirrored run). */
export const Z3 = {
  source: "simulation-theory.md §15 Z3",
  in: { L: 120, h: -15, L0: 122, w: 5, EA: 1e7 },
  out: {
    /** N */
    H: 1286.38,
    /** N */
    V0: -468.701,
    /** N */
    VB: 141.299,
    /** N — upper anchor, and the maximum: `TA > TB`. */
    TA: 1369.11,
    /** N */
    TB: 1294.12,
    /** m — sag below the chord. */
    D: 7.0811,
    /** m — approximate by §15's own « x ≈ 59.7 »; a scanned position. */
    xAtD: 59.7,
    /** m — the low point sits below B. */
    zMinMinusH: -1.5476,
  },
} as const satisfies Fixture;

/** Z4 — mid-span point load (rider), level span. */
export const Z4 = {
  source: "simulation-theory.md §15 Z4",
  in: { L: 100, h: 0, L0: 100.5, w: 10, EA: 1e7, P: 1177, xD: 50 },
  out: {
    /** m — material coordinate of the load, `= L₀/2` by symmetry. */
    sP: 50.25,
    /** N */
    H: 7898.16,
    /** N */
    V0: -1091.0,
    /** N — C11's corrected reaction form, `(w·L₀ + P)/2`. */
    VB: 1091.0,
    /** m — the node's height. */
    zD: -5.31434,
    /** N */
    TA: 7973.16,
    /** N — equal to `TA` by symmetry. */
    TB: 7973.16,
  },
} as const satisfies Fixture;

/**
 * Z5 — rolling-rider sweep step, material coordinate. Same line as `Z4`, trolley moved along it.
 * `σ_D ≠ s_D ≠ x_D` is the point of the case: 60,20 against 60,15 against 59,96.
 */
export const Z5 = {
  source: "simulation-theory.md §15 Z5",
  in: { L: 100, h: 0, L0: 100.5, w: 10, EA: 1e7, P: 1177, sD: 60.15 },
  out: {
    /** N */
    H: 7765.67,
    /** N */
    V0: -973.369,
    /** m — the node's horizontal position. */
    xD: 59.9578,
    /** m */
    zD: -5.19064,
    /** m — stretched arc position, which `check.ts` never asserted. */
    sigmaD: 60.1969,
  },
} as const satisfies Fixture;

/**
 * The §5.4 chord bound on the shipped 12 mm IWRC 1770 line — the **one** `SolveError` state
 * reachable from real input, and a `[MEASURED]` row rather than a §15 one: it is this app's own
 * envelope measurement, recorded in the build spec's § 2 (« la borne §5.4 _est_ la charge de
 * rupture ») and § 7, not MoorPy-cross-validated physics. Asserted at `TOLERANCE.measured`.
 *
 * The two `TmaxRatio` rows are the point of the case: at the floor the line is *at* its breaking
 * load, which is why the refusal carries an attainable bound and no fix action.
 */
export const CHORD_BOUND = {
  source: "[MEASURED] spec § 2 — « la borne §5.4 est la charge de rupture »",
  in: {
    /** N/m — 12 mm IWRC 1770, `μ = 0,5465 kg/m`. */
    w: 0.5465 * 9.81,
    /** N */
    EA: 6.9e6,
    /** N */
    MBF: 90740,
  },
  out: {
    /** m — `chord/(1 + MBF/EA)` on a 200 m level span. */
    floor200: 197.404,
    /** `T_max / MBF` at that floor: 100,0 %. */
    TmaxRatio200: 1.0,
    /** m — the same floor on a 1000 m level span. */
    floor1000: 987.02,
    /** `T_max / MBF` at that floor: 101,1 %. */
    TmaxRatio1000: 1.011,
    /**
     * N — « Prétension maximale atteignable : **9 074 daN** » (spec § 2's re-emission table and
     * § 7's « Tension impossible » copy): the same one floor, read in the **tension** quantity.
     * Recorded in daN to 0 decimals, which is the precision an assertion may read it at.
     */
    HMaxAttainable200: 90740,
    /**
     * m — « Flèche minimale atteignable : **0,29 m** », 0,15 % de la portée: the same one floor,
     * read in the **flèche** quantity. Spec § 7's « Tension impossible » table.
     */
    DMinAttainable200: 0.29,
    /** m — the same bound on a 1000 m span: 7,21 m, 0,72 % de la portée. */
    DMinAttainable1000: 7.21,
  },
} as const satisfies Fixture;

/** Z6 — inverse problem: `L₀` from a target pretension. §7 mode 2. */
export const Z6 = {
  source: "simulation-theory.md §15 Z6",
  in: { L: 100, h: 0, w: 10, EA: 1e7, HTarget: 2451 },
  out: {
    /** m */
    L0: 100.67,
    /** N — the forward re-solve at `L0`. */
    H: 2451.0,
    /** m — sag at the resolved `L₀`. */
    D: 5.1164,
    /** m — §7's closed-form seed: a valid seed, not the answer. */
    closedFormSeed: 100.669,
  },
} as const satisfies Fixture;

/**
 * A §11 clearance measurement. `Fixture` cannot hold it: `contact` is the one recorded output
 * that is **not a number**, and hiding it in a comment would put the two contact kinds — two
 * separate verdicts (voir § 5 — « Les deux natures de contact sont deux verdicts distincts »)
 * — outside the type that carries provenance.
 */
export type ClearanceCase = {
  readonly source: MeasuredSource;
  readonly in: Readonly<Record<string, number>>;
  readonly out: Readonly<Record<string, number>>;
  readonly contact: "none" | "rider" | "cable";
};

/**
 * The line every clearance row below is measured on: the shipped first-run scenario, 12 mm IWRC
 * 1770 steel, a 120 kg rider and manual ground.
 *
 * `w` and `EA` are the **displayed** steel chain (`μ` 0,5465 kg/m, `EA` 6,90 MN), the same two
 * numbers `CHORD_BOUND` carries, not §13.1's un-rounded `E_app·C·d²`: reproducing that chain here
 * would duplicate `materials/steel.ts` (which does not exist yet) inside a fixture, and the
 * rounding moves garde by 3×10⁻⁴ m — two orders below the `[MEASURED]` bar.
 *
 * **Every garde below was re-taken on 2026-08-28** — ticket 37 defect 1, `s_D` forced into
 * §11's sample set so the rider's own kink is evaluated. The scan as shipped read the two
 * neighbours of that vertex across a convex cable, so **every figure moved down**: by 20,18 to
 * 29,30 mm on the nine 150 m rows, 18,27 mm on the 200 m / −25 m one and 569,44 mm on the
 * deep-slack one. Each row's own move is recorded beside it, as the *exact* difference between the
 * two scans rather than against this table's rounded record — a delta formed from a rounded value
 * carries ±5 mm of that rounding and would be a number with no reason. The re-take is the
 * *conservative* direction throughout, and no row moved up. The `x` of the traverse minimum moved with it —
 * on straight two-point ground the worst point now **is** the rider's own position.
 */
const FIRST_RUN_LINE = {
  /** m */
  L: 150,
  /** m — the far anchor below the near one. */
  h: -18,
  /** N/m — `μ·g`, `μ` 0,5465 kg/m. */
  w: 0.5465 * 9.81,
  /** N — 6,90 MN. */
  EA: 6.9e6,
  /** N — 120 kg rider, `g = 9,81`. */
  P: 1177.2,
  /** m — §11's `[CONVENTION]` envelope, `1,5 + 0,6`. */
  hRider: 2.1,
  /** m — anchor height above its own base, both ends; ground is the straight line between them. */
  anchorHeight: 12,
  /** Uniform sweep steps — 260 grid points. */
  sweepSteps: 240,
  /** §11's inner scan, samples per step. */
  samplesPerStep: 60,
} as const;

/**
 * The opening screen's garde. Measured on the run parameters § 9 fixes — `sweep(input, P, 240)`,
 * `evaluateClearance(…, 60)`, `h_rider` 2,1 m — and it is the one row that pins **all four**
 * outputs at once: the value, its `x`, the contact state and the violation count.
 *
 * `atRiderX` is not decoration either: the worst point sits **on** the rider's own position now
 * (0,9 m away before ticket 37's re-take), which is well inside the « relabel only beyond
 * `max(1 m, 1 % of span)` » rule, so the clearance cell must not rename itself on first paint.
 * The two coincide because § 4's manual ground is a straight line: on an imported profile they
 * separate again, which is the whole of what ticket 41 settled.
 */
export const FIRST_RUN_CLEARANCE = {
  source:
    "[MEASURED] ticket 37 §1 — « Garde min (traversée) 2,42 m à x 74,4 m » (re-take of ticket 14 §1's 2,44 m à x 74,1 m)",
  in: { ...FIRST_RUN_LINE, L0: 151.644 },
  out: {
    /** m — 2,442178 before the rider node entered the scan; 23,06 mm lower, conservative. */
    hMin: 2.42,
    /** m — where the traverse minimum sits; 74,1170 before, +0,314 m along the line. */
    atX: 74.4,
    /** m — the rider's own `x` at that step. It **is** `atX` now: the kink is the worst point. */
    atRiderX: 74.4,
    /** Sweep steps whose own minimum is negative. */
    stepsInViolation: 0,
    /** The traverse solved whole. */
    coverage: 1,
  },
  contact: "none",
} as const satisfies ClearanceCase;

/**
 * Finding 1 — **dénivelé buys no clearance**. Tilting the chord tilts the manual ground plane by
 * the same amount, so `h` cancels out of the difference and 44 m of it moves garde by 21 cm. The
 * slope survives ticket 37's re-take intact: the four rows dropped by 23,00 / 23,06 / 23,23 /
 * 23,70 mm, so the 0 → −60 m difference moved by 0,7 mm and reads 21 cm either way — the *finding*
 * is a property of the geometry, not of the scan's resolution.
 *
 * The four `L₀` are measured beside the four gardes; re-deriving them from the flèche target
 * would substitute this build's inverse for the one that took the measurement.
 */
export const CLEARANCE_VS_DENIVELE = {
  source: "[MEASURED] ticket 14 §1 — « le dénivelé ne gagne aucune garde »",
  in: FIRST_RUN_LINE,
  out: {
    /** m at `h` 0, `L₀` 150,583 m — 2,457865 before the re-take, 23,00 mm lower. */
    h0: 2.43,
    L0AtH0: 150.583,
    /** m at `h` −18, `L₀` 151,644 m — 2,442178 before, 23,06 mm lower. */
    h18: 2.42,
    L0AtH18: 151.644,
    /** m at `h` −40, `L₀` 155,757 m — 2,366094 before, 23,23 mm lower. */
    h40: 2.34,
    L0AtH40: 155.757,
    /** m at `h` −60, `L₀` 161,998 m — 2,246617 before, 23,70 mm lower. */
    h60: 2.22,
    L0AtH60: 161.998,
  },
  contact: "none",
} as const satisfies ClearanceCase;

/**
 * Finding 1's other half — **garde moves metre-for-metre with flèche**. One metre of sag buys or
 * spends one metre of clearance, which is why 2,42 m is the figure worth shipping: the first
 * parameter a user touches moves the app's central output visibly. Ticket 37's re-take moved the
 * four rows down by 20,18 / 23,07 / 26,12 / 29,30 mm — **not** uniformly, so the slope is what has
 * to be checked rather than assumed: the three adjacent differences moved by +2,9 / +3,1 / +3,1 mm
 * and still read 0,948 / 1,002 / 1,040 m per metre of flèche. The unit slope survives to 3 mm.
 *
 * The driver is the **flèche à vide target**, not `L₀`; only `flèche 6` has its `L₀` on record
 * (151,644 m), which is what the other three are cross-checked through.
 */
export const CLEARANCE_VS_FLECHE = {
  source: "[MEASURED] ticket 14 §1 — « un mètre de flèche déplace la garde d'un mètre »",
  in: FIRST_RUN_LINE,
  out: {
    /** m at flèche à vide 5,0 m — 3,385605 before the re-take, 20,18 mm lower. */
    fleche5: 3.37,
    /** m at flèche à vide 6,0 m — the shipped line; 2,440163 before, 23,07 mm lower. */
    fleche6: 2.42,
    /** m at flèche à vide 7,0 m — 1,440832 before, 26,12 mm lower. */
    fleche7: 1.41,
    /** m at flèche à vide 8,0 m — 0,403679 before, 29,30 mm lower. */
    fleche8: 0.37,
    /** m — the `L₀` measured at flèche 6,0, the only one on record. */
    L0AtFleche6: 151.644,
  },
  contact: "none",
} as const satisfies ClearanceCase;

/**
 * `contact: "cable"` — **deep slack converges**, it is not a solver failure. `L₀` 400 m on a
 * level 200 m span with anchor bases at −4 / −2,5 m returns coverage 1,000 and a garde of
 * −170,24 m: a line lying down is « Câble au sol », a clearance verdict, never a `SolveError`.
 * This is the row ticket 37's re-take moved furthest — 569,44 mm — because 200 m of slack puts the
 * kink's corner far below the chord its two neighbours span.
 *
 * The same line at `L₀` 200,5 m is the shallower half of the same measurement, and it is already
 * `contact: "cable"` too — which is the point: `slack-limit` is unreachable from here.
 */
export const GROUND_CONTACT_CABLE = {
  source: "[MEASURED] spec § 7 — « le mou profond converge » (ELECTIONS §0.2, ticket 14 §1)",
  in: {
    L: 200,
    h: 0,
    w: FIRST_RUN_LINE.w,
    EA: FIRST_RUN_LINE.EA,
    P: FIRST_RUN_LINE.P,
    hRider: FIRST_RUN_LINE.hRider,
    /** m — anchor A's base, below the anchor. */
    zBaseA: -4,
    /** m — anchor B's base. */
    zBaseB: -2.5,
    /** m */
    L0: 400,
    /** m — the shallower slack on the same line. */
    L0Shallow: 200.5,
  },
  out: {
    /** m at `L₀` 400 — −169,667110 before the re-take, 569,44 mm lower. */
    hMin: -170.24,
    /** m at `L₀` 200,5 — −7,587399 before, 23,12 mm lower. */
    hMinShallow: -7.61,
    /** Both slacks solve whole. */
    coverage: 1,
  },
  contact: "cable",
} as const satisfies ClearanceCase;

/**
 * `contact: "rider"` — the cable clears the ground and the **passenger envelope** does not. The
 * intuitively realistic anchor pair (A 12 m on a platform, B 6 m at the arrival) on a 200 m /
 * −25 m span at flèche 6,0 m, which is exactly why it is not the shipped scenario.
 *
 * A separate verdict from « Câble au sol », because the claim is only true **given `h_rider`** —
 * it names the 2,1 m value and carries its « non confirmé » chip.
 */
export const GROUND_CONTACT_RIDER = {
  source:
    "[MEASURED] ticket 37 §1 — « hauteurs 12/6, flèche 6,0 ⇒ −1,55 m » (re-take of ticket 14 §1's −1,53 m)",
  in: {
    L: 200,
    h: -25,
    w: FIRST_RUN_LINE.w,
    EA: FIRST_RUN_LINE.EA,
    P: FIRST_RUN_LINE.P,
    hRider: FIRST_RUN_LINE.hRider,
    /** m — anchor A's height above its base. */
    anchorHeightA: 12,
    /** m — anchor B's height above its base. */
    anchorHeightB: 6,
    /** m — the flèche à vide target that fixes `L₀`. */
    fleche: 6,
  },
  out: {
    /** m — −1,530257 before the re-take, 18,27 mm lower. */
    hMin: -1.55,
    /** The traverse solves whole; only the clearance fails. */
    coverage: 1,
  },
  contact: "rider",
} as const satisfies ClearanceCase;

/**
 * A §13.1 steel derivation. `Fixture` cannot hold it: `construction` is the one recorded input
 * that is **not a number**, and it is the input that selects `K` — hiding it in a comment would
 * put the A-family's only discrete choice outside the type that carries provenance.
 *
 * The `in` block doubles as the **single transcription point** for §13.1's factors: the module
 * declares its own, and `steel.test.ts` checks the two agree. A `[MEASURED]` row rather than a
 * §15 one — §13.1 has no MoorPy cross-validation, and the shipped numbers are ticket 14's record
 * of this app's own chain.
 */
export type SteelCase = {
  readonly source: MeasuredSource;
  readonly in: Readonly<Record<string, number>>;
  readonly construction: "fibre-core" | "iwrc";
  readonly out: Readonly<Record<string, number>>;
};

/** A §13.2 textile derivation. `ropeClass` is hoisted for the same reason `construction` is. */
export type TextileCase = {
  readonly source: MeasuredSource;
  readonly in: Readonly<Record<string, number>>;
  readonly ropeClass: "hmpe" | "pa-en1891a" | "polyester";
  readonly out: Readonly<Record<string, number>>;
};

/**
 * The shipped steel line — 12 mm, `R₀` 1770, 6×19 âme métallique — and the whole §13.1 chain it
 * produces. Every other measured row in this file rides on its `w` and `EA`.
 *
 * `MBF` is recorded twice on purpose. `MBFDisplayed` is the daN read-out at its display precision
 * (0 decimals), which is what a prefilled override holds in state; `MBFFormula` is what the
 * formula returns un-rounded, which is what the stale-Override badge compares against. The two
 * differ by 0,02 daN — under a millionth — and that gap is the reason the comparison runs at
 * display precision rather than on floats.
 */
export const STEEL_12MM_IWRC_1770 = {
  source: "[MEASURED] ticket 14 §3 — « MBF 9074 daN, EA 6,90 MN, μ 0,5465 kg/m »",
  in: {
    /** mm — §13.1's formulas are mm-based, like § 3's field. */
    d: 12,
    /** N/mm² */
    R0: 1770,
    /** EN 12385-4 6×19 âme métallique, `[STD-ATTESTED]`. */
    K: 0.356,
    /** EN 12385-4 6×19 âme textile, `[STD-ATTESTED]`. */
    KFibreCore: 0.33,
    /** Pa — pinned midpoint of §13.1's 100–130 GPa apparent rope modulus. */
    EApp: 115e9,
    /** Pinned midpoint of §13.1's 0.384–0.449 metallic-area factor. */
    C: 0.4165,
    /** Pinned midpoint of §13.1's 0.359–0.400 nominal-mass factor. */
    W: 0.3795,
    /** m/s² — fixed and unexposed. */
    g: 9.81,
  },
  construction: "iwrc",
  out: {
    /** N — the daN read-out at display precision, 9074 daN. */
    MBFDisplayed: 90740,
    /** N — un-rounded, 9073,98 daN: the stale-Override badge's input. */
    MBFFormula: 90739.8,
    /** N — 6,897 MN, displayed 6,90 MN. */
    EA: 6.897e6,
    /** N — the MN read-out at display precision, 2 decimals. */
    EADisplayed: 6.9e6,
    /** kg/m */
    mu: 0.5465,
    /** N/m — `μ·g`, displayed 0,536 daN/m. */
    w: 5.361,
  },
} as const satisfies SteelCase;

/**
 * §13.2's stiffness convention, `EA = k·MBL`, at the HMPE default `k = 22` — the arithmetic § 3
 * states when it explains why `EA` stays read-only: « my rope has `k = 22` » and « my rope has
 * `EA = 2200 kN` » must not be two editable claims about one quantity.
 *
 * **No rope ships**, so there is no shipped `MBL` to pin: every product row in `docs/references/`
 * is compromised (§13.2) and one invented `MBL` decides the verdict. The 100 kN here is the
 * illustrative load § 3's own worked line uses, not a default.
 *
 * The per-class `k` defaults are recorded beside it because `Classe de corde` drives exactly two
 * things, and this is one of them. Polyester is **absent, not zero**: §13.2 places it only
 * « between the two » and R1's `k = 25–35` is refuted, so the field ships blank and required.
 */
export const TEXTILE_STIFFNESS = {
  source: "[MEASURED] spec § 3 — « EA = k·MBL » : k 22, MBL 100 kN ⇒ EA 2200 kN",
  in: {
    /** N — illustrative, never a shipped default. */
    MBL: 100000,
    /** `EA/MBL`, §13.2's HMPE figure at 10 % MBL, `[DATASHEET]`. */
    k: 22,
    /** m/s² */
    g: 9.81,
  },
  ropeClass: "hmpe",
  out: {
    /** N — 2200 kN. */
    EA: 2.2e6,
    /** §13.2's HMPE default, spliced and bedded-in at 10 % MBL. */
    kHmpe: 22,
    /** §13.2's EN 1891 type A polyamide figure at the CE band. */
    kPaEn1891a: 1.5,
  },
} as const satisfies TextileCase;

/**
 * A §10 verdict measurement. `Fixture` cannot hold it: the recorded outputs that decide the
 * screen — the five verdict states of § 6 — are **not numbers**, and a state hidden in a comment
 * would put « dans les limites » and « hors limites » outside the type that carries provenance.
 *
 * `states` is keyed by the régime (or the variant) it belongs to, and its literals are written
 * out rather than imported: the fixtures stay engine-type-free, exactly as `ClearanceCase`'s
 * `contact` is. The keys are `verdict.ts`'s own `VerdictState` spellings, so a test comparing the
 * two directly stops compiling the day either side drifts.
 */
export type VerdictCase = {
  readonly source: MeasuredSource;
  readonly in: Readonly<Record<string, number>>;
  readonly out: Readonly<Record<string, number>>;
  /** Values a correct implementation must **not** produce — carried rejections, not outputs. */
  readonly rejected?: Readonly<Record<string, number>>;
  readonly states: Readonly<
    Record<
      string,
      "dans-les-limites" | "marge-faible" | "hors-limites" | "refuse-usage-interdit" | "indetermine"
    >
  >;
};

/**
 * The opening screen's verdict, régime by régime. Every force is recorded **in daN at 0
 * decimals** by ticket 14 and stored here in newtons, so the `[MEASURED]` floor for these rows is
 * a half-ulp of 0,5 daN = **5 N** — `d = −1` in newtons, which the assertion supplies. It only
 * ever binds on `reserve`: a difference of two four-figure numbers has none of their digits, and
 * `1e-3` relative on « −111 daN » would demand a precision the subtraction never had.
 *
 * Four régimes on **one unchanged line**, because the spread is the teaching: `k = 3` reads
 * « dans les limites » and `k = 10` reads « hors limites » with no parameter touched. The shipped
 * line is *allowed* to fail the strictest entry — do not up-size the cable to buy a green.
 *
 * `T_A > T_B` here, so **FS_A governs** and `T max` names anchor A: the same line demonstrates
 * the per-end grid without asymmetric hardware. And the suspended-load cell is scored the one way
 * that can ever bind (see `rejected`).
 */
export const FIRST_RUN_VERDICT = {
  source: "[MEASURED] ticket 14 §1 et §5 — « FS effectif 8,80 (A) / 9,06 (B) »",
  in: {
    ...FIRST_RUN_LINE,
    /** m */
    L0: 151.644,
    /** N — 9074 daN, the displayed §13.1 chain. */
    MBF: 90740,
    /** §8.2's `[FIELD:SSF]` step-off ceiling. */
    DAF: 1.2,
    /** Cosse à sertir / œil Flamand at both ends, `[STD-ATTESTED]`. */
    etaA: 0.9,
    /** The same termination at anchor B — deliberately symmetric. */
    etaB: 0.9,
  },
  out: {
    /** N — 263,4 daN, one unloaded solve and not a per-step quantity. */
    TvideA: 2634,
    /** N — 253,7 daN. */
    TvideB: 2537,
    /** N — 817,1 daN, the **static** traverse maximum at anchor A. */
    TstaticA: 8171,
    /** N — 793,5 daN. */
    TstaticB: 7935,
    /** N — 927,9 daN, `T_vide + DAF·(T_chargé − T_vide)`: the figure the verdict judges. */
    TdafA: 9279,
    /** N — 901,5 daN. */
    TdafB: 9015,
    /** N — 111 daN, § 6's « ↳ majoration dynamique » at the governing end. */
    amplificationA: 1110,
    /** `η_A·MBF / T_DAF,A` — the headline, and the governing cell on this line. */
    FSA: 8.8,
    /** `η_B·MBF / T_DAF,B` — higher, so anchor B does not govern. */
    FSB: 9.06,
    /** `min(η_A, η_B)·MBF / [DAF·(T_chargé − T_vide)]` = 0,9·9074 / 664,5 — one cell, not two. */
    FSSuspendedLoad: 12.29,
    /** N — 2722 daN, `η·MBF/k` at `k = 3,0`. */
    TadmK3: 27220,
    /** N — 1633 daN at `k = 5,0`. */
    TadmK5: 16330,
    /** N — 817 daN at `k = 10`. */
    TadmK10: 8170,
    /** N — +1794 daN before `T adm` at `k = 3,0`, taken at the least favourable end. */
    reserveK3: 17940,
    /** N — **−111 daN** at `k = 10`: the reserve goes negative while `FS effectif` is unchanged. */
    reserveK10: -1110,
    /** The traverse solves whole, so nothing is suppressed. */
    coverage: 1,
  },
  rejected: {
    /**
     * `MBF / P` — the reading an implementer makes naturally of « FS ≥ 5 on suspended load ».
     * It scores **77** on the shipped line and can therefore never bind, which would silently
     * delete the two-criterion régime that is the whole reason §10.1 has one.
     */
    bareStrengthOverRiderLoad: 77,
  },
  states: {
    /** `k = 3,0` on total tension, `[STD-ATTESTED]`. */
    en15567: "dans-les-limites",
    /** Both criteria clear; total tension governs at 8,80 against the suspended load's 12,29. */
    worksafeQld: "dans-les-limites",
    /** `k = 5,0`, `[UNVERIFIED:R1]` — the other half of the ledger's ACCT contradiction. */
    ansiAcct5: "dans-les-limites",
    /** `k = 10`, `[CONVENTION]` — 8,80 is short, and the shipped line is allowed to read this. */
    acct10: "hors-limites",
  },
} as const satisfies VerdictCase;

/**
 * **Up-sizing one step does not buy a green** — the measured cost of the alternative § 9 rejected,
 * and the only row that reaches the fifth verdict state. The shipped line under ACCT 10:1 at
 * `d` 12 mm reads 8,80 « hors limites »; `d` 14 mm reads **10,79**, which clears `k = 10` and
 * still trips `FS_eff < 1,1·k`, so it is **« Marge faible »** — green everywhere needs `d` ≥ 16 mm.
 *
 * Same line otherwise: `L` 150, `h` −18, flèche à vide cible 6,00 m, `R₀` 1770, 6×19 **âme
 * métallique**, `DAF` 1,2, cosse à sertir at both ends. The construction is a discrete pick and
 * not a number, so it is stated here rather than in `in` — voir `STEEL_12MM_IWRC_1770`.
 * `L₀` is *not* recorded per diameter on purpose: §13.1 scales `w` and `EA` by the same `d²`, so
 * the flèche target resolves to one `L₀` for all three.
 */
export const UPSIZING_MARGIN = {
  source: "[MEASURED] spec § 9 — « d 14 mm donne FS 10,79 — encore Marge faible »",
  in: {
    /** m — the shipped span. `w` and `EA` are **not** carried over: both scale with `d²`. */
    L: FIRST_RUN_LINE.L,
    /** m */
    h: FIRST_RUN_LINE.h,
    /** N — the 120 kg rider. */
    P: FIRST_RUN_LINE.P,
    /** Uniform sweep steps — 260 grid points. */
    sweepSteps: FIRST_RUN_LINE.sweepSteps,
    /** mm — one step up from the shipped 12 mm. */
    d14: 14,
    /** mm — the first diameter that is green everywhere. */
    d16: 16,
    /** N/mm² */
    R0: 1770,
    /** m — the shipped tightness target, unchanged across the three diameters. */
    Dtarget: 6,
    /** §8.2's step-off ceiling. */
    DAF: 1.2,
    /** Cosse à sertir / œil Flamand at both ends. */
    eta: 0.9,
    /** The régime all three are judged against — ACCT 10:1, `[CONVENTION]`. */
    k10: 10,
  },
  out: {
    /** `FS effectif` at `d` 14 mm — clears `k = 10`, trips `1,1·k`. */
    FS14: 10.79,
    /** `FS effectif` at `d` 16 mm. */
    FS16: 12.71,
  },
  states: {
    /** 10,79 against `k` 10: a pass with no margin left for what this tool does not know. */
    d14: "marge-faible",
    /** 12,71 clears the 11,0 band. */
    d16: "dans-les-limites",
  },
} as const satisfies VerdictCase;

/**
 * **One invented `MBL` decides the verdict** — the measurement that is why no rope ships. The
 * same 1109 m HMPE line, the same tightness target and the same splice at both ends: 100 kN reads
 * « dans les limites » and 60 kN reads « hors limites », and nobody published either number.
 *
 * The line itself is ledger #7's territory: only the 1109 m span, the ≤ 220 daN pretension and the
 * ~33 m/s are attested for SSF Vercors, so every other input here is **illustrative and recorded
 * as such** — this row exists to pin the verdict's sensitivity, never to ship a scenario.
 */
export const TEXTILE_VERDICT_PAIR = {
  source: "[MEASURED] ticket 14 §3 et §9 — « MBL 100 kN ⇒ 11,94 · 60 kN ⇒ 7,63 »",
  in: {
    /** m — the one attested figure of the line. */
    L: 1109,
    /** m — illustrative. */
    h: -150,
    /** kg/m — illustrative. */
    mu: 0.075,
    /** §13.2's HMPE stiffness convention, `EA = k·MBL`. */
    k: 22,
    /** N — 220 daN, the tightness target; `[FIELD:SSF]` quotes it as an instrumented pretension. */
    Htarget: 2200,
    /** N — the 120 kg rider. */
    P: 1177.2,
    /** §8.2's step-off ceiling. */
    DAF: 1.2,
    /** Épissure longue HMPE at both ends, `[DATASHEET/CONVENTION]`. */
    eta: 0.9,
    /** N — the higher of the two invented breaking loads. */
    MBLHigh: 100000,
    /** N — the lower one, on the same line. */
    MBLLow: 60000,
    /** m/s² */
    g: 9.81,
  },
  out: {
    /** `FS effectif` at `MBL` 100 kN. */
    FSHigh: 11.94,
    /** `FS effectif` at `MBL` 60 kN — the verdict flips here, and only the datasheet moved. */
    FSLow: 7.63,
    /** m — flèche à vide at 100 kN; `EA = k·MBL` moves with `MBL`, so the geometry shifts. */
    sagHigh: 52,
    /** m — flèche à vide at 60 kN. */
    sagLow: 51.9,
    /** The régime both are judged against: Secours textile 10:1, `[CONVENTION]`. */
    k10: 10,
  },
  states: {
    /** 11,94 clears `k = 10` and its `1,1·k` margin band. */
    mblHigh: "dans-les-limites",
    /** 7,63 does not clear `k = 10`. */
    mblLow: "hors-limites",
  },
} as const satisfies VerdictCase;

/**
 * **A taut line always shows two warnings at once, and that is not a bug.** The minimum attainable
 * flèche/portée is 0,15 % at 200 m and 0,72 % at 1000 m — both at §5.4's chord bound, which *is*
 * the breaking load — so §8.2's `< 3 %` ⚠ fires across the whole feasible taut band, **together
 * with** the clause that invalidates the DAF's own measurement regime. Neither is a duplicate of
 * the other: one qualifies `flèche / portée`, the other qualifies the `DAF` figure.
 *
 * The two `L₀` are `CHORD_BOUND`'s, re-read as the tightest line the engine will solve at all.
 */
export const TAUT_LINE_WARNINGS = {
  source: "[MEASURED] spec § 11 — « 0,15 % à 200 m, 0,72 % à 1000 m, toutes deux à la borne »",
  in: {
    /** N/m — the shipped steel line's own weight. */
    w: FIRST_RUN_LINE.w,
    /** N */
    EA: 6.9e6,
    /** N — 9074 daN. */
    MBF: 90740,
    /** N — the 120 kg rider. */
    P: FIRST_RUN_LINE.P,
    /** §8.2's step-off ceiling, unchanged — the clause is about the *line*, not the value. */
    DAF: 1.2,
    /** m — a level 200 m span. */
    LShort: 200,
    /** m — §5.4's floor there, at `T_max` = 100,0 % MBF. */
    L0Short: 197.404,
    /** m — a level 1000 m span. */
    LLong: 1000,
    /** m — §5.4's floor there, at 101,1 % MBF. */
    L0Long: 987.02,
  },
  out: {
    /** Flèche/portée at the 200 m floor — 0,15 %. */
    sagRatioShort: 0.0015,
    /** Flèche/portée at the 1000 m floor — 0,72 %. */
    sagRatioLong: 0.0072,
    /** §8.2's threshold, 3 % of the span. */
    threshold: 0.03,
    /** Warnings raised on either line: the `< 3 %` ⚠ **and** the DAF-regime clause. */
    warningCount: 2,
  },
  states: {},
} as const satisfies VerdictCase;
