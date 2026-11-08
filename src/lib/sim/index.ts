/**
 * The engine's public barrel — « v1 build spec » § 2 (*Module layout*: « `index.ts` public barrel
 * — the only path app code imports from ») over `docs/simulation-theory.md` §§4–7, §10, §11 and
 * §13, which are the sections the eleven modules below carry one apiece. This file re-exports and
 * **declares nothing**: it holds no constant, no formula and no type of its own, so there is
 * nothing here for §14's fabricated-value ledger to reach and nothing to keep in step with a
 * theory §.
 *
 * Rules this module exists to keep:
 *
 * - **One import path, enforced.** No file outside `src/lib/sim/` may reach past this barrel;
 *   `index.test.ts` walks `src/` and fails on a deep specifier, because the ticket asked for a
 *   check rather than a convention nobody enforces. Inside the engine, modules keep importing
 *   each other directly — a barrel in the middle of the dependency graph is how `import/no-cycle`
 *   starts firing.
 * - **The surface is § 2's *Function surface*, not every module's exports.** Three names are
 *   deliberately absent although their modules export them: `levelSpanShortcut`, `sweepGrid` and
 *   the Jacobian are « internal API with a public name » — named exports so §15's tests can reach
 *   them directly, *« not part of `index.ts` »* in § 2's own words. Nothing in the app needs
 *   them: `sweep()` returns its own grid on `SweepResult.grid`, and the shortcut is a fast path
 *   `solveSpan` takes by itself.
 * - **Terrain crosses as cloneable data.** `Terrain` is a union of plain objects and typed
 *   arrays, and every engine entry point here takes and returns values that structured-clone.
 *   Ticket 10 measured that v1 needs no Web Worker; this is what keeps that door open anyway —
 *   voir § 2, *Execution model*.
 * - **Synchronous, pure, dependency-free and SI.** Forces in newtons, lengths in metres, angles
 *   in radians. Valibot lives at the app's boundaries — URL, CSV, forms, Session — and never
 *   inside `src/lib/sim/`, which is why this barrel exports plain TypeScript declarations and no
 *   schema.
 * - **Failure is a value, never a throw.** `SolveResult` and `Result<number, SolveError>` carry
 *   the three `SolveError` kinds. The `RangeError`s `sampleCable`, `sweepGrid` and
 *   `evaluateClearance` raise are caller bugs — a non-integer sample count, a non-empty
 *   `loads` — not physics failures, and they are not part of this contract.
 */

// —— types.ts — § 2's *Public types*, the frozen declarations ————————————————————————————————
export type {
  ClearanceResult,
  DerivedMaterial,
  MaterialSpec,
  PointLoad,
  SolveError,
  SolveNote,
  SolveResult,
  SpanInput,
  SpanState,
  SweepResult,
  SweepStep,
  Terrain,
} from "./types.ts";

// —— catenary.ts — §4.1 closed form ————————————————————————————————————————————————————————
// `levelSpanShortcut` stays module-local by § 2: a fast path, not a call site.
export { sampleCable } from "./catenary.ts";

// —— solve.ts — §5 damped Newton, §5.2 seeds and retries, §4.3 degenerate branches ——————————
// `Iterate` is `solveSpan`'s optional warm start; a caller cannot name that parameter without it.
export type { Iterate } from "./solve.ts";
// `SOLVER` because A11's `[ Copier le diagnostic ]` payload prints §5.3's **tolerance beside the
// residual**: the tolerance is L-scaled past 1000 m, so a residual without it cannot be
// interpreted — which is the very reason § 7 keeps both off the screen and both in the clipboard.
// It is the constants table, not a formula: nothing about it invites re-deriving physics upstairs.
export { SOLVER, solveSpan } from "./solve.ts";

// —— loads.ts — §6.1's point load at a typed horizontal position ————————————————————————————
export { solveAtHorizontalPosition } from "./loads.ts";

// —— sweep.ts — §6.2 grid, march and warm start ——————————————————————————————————————————————
// `SWEEP` because the UI prints `résolus / grid.length` and § 2's `260 × 60` guard rail is the
// product of this constant and `CLEARANCE`; `sweepGrid` because `SweepResult.grid` already is it.
//
// `sweepStep` because A8's **typed** rider position gets § 5's exact §6.1-case-2 solve rather than
// a snap, and the chart is written against a `SweepStep`: `solveAtHorizontalPosition` returns the
// state, and this turns it into the same `(x_D, z_D, T_A, T_B, θ)` record the sweep publishes. It
// is not one of § 2's three withheld names — the app genuinely needs it, and the alternative was
// re-deriving §4.1's `dz/dx = V/H` in a component, which is the « physics in the UI » § 5 forbids.
export { SWEEP, sweep, sweepStep } from "./sweep.ts";

// —— terrain.ts — the engine's only terrain seam ————————————————————————————————————————————
export { zGroundAt } from "./terrain.ts";

// —— clearance.ts — §11's reducer over the sweep ————————————————————————————————————————————
export { CLEARANCE, evaluateClearance } from "./clearance.ts";

// —— parameterise.ts — §7's inverse modes, resolved above the solver ————————————————————————
// `unloadedSag` is the app's, not only `resolveL0`'s: § 6 displays « flèche à vide » and §8.2's
// sag-ratio warnings are scored on it through `lineWarnings`, and nothing else can compute it.
export type { AnchorSide, Result, SpanGeometry, TightnessSpec } from "./parameterise.ts";
export { resolveL0, unloadedSag } from "./parameterise.ts";

// —— verdict.ts — §10's regimes, `T_allow = η_t·MBF/k` and the §10.4 use-class gate ——————————
// The engine returns data and the app owns every sentence. The two predicates are the pickers'
// availability rules, and `regimeMismatch` is the first one as data, so the app words a disabled
// régime's reason without a second copy of `requires`. `lineWarnings` is § 6's warning tier as
// identifiers, régime-free because it fires on a screen with no verdict.
//
// `allowableTension` stays withheld — `VerdictCell.Tadm` already carries that number, and a second
// caller of the formula is a second place §10 can drift.
//
// `amplifiedTension` **is** exported, and the reason is A10's reduced row set: § 9 prints « T max
// 928 daN » — the amplified envelope — **with no régime chosen**, and with no régime
// `evaluateVerdict` is by contract not called at all, so `EndEnvelope.Tdaf` does not exist to read.
// The app therefore has exactly one caller (`@/lib/rail/results.ts`), which uses it in **both**
// states rather than switching between two paths, and `results.test.ts` asserts it agrees with
// `evaluateVerdict`'s own envelope on the shipped line — the drift this withholding guarded against
// is the drift that test now watches.
//
// `scanTensionEnvelope` is exported for the same row and the same caller, and ticket 38 is why:
// the Rail used to re-implement the worst-tension-per-end scan, so a régime-model change could
// break the agreement from either side. The scan now has **one** owner; what the second caller
// still owns is § 9's presentation choice, not the maximum.
export type {
  CellState,
  Criterion,
  CriterionBasis,
  EndEnvelope,
  LineWarningInput,
  ObligationId,
  ProvenanceTag,
  RefusalId,
  Regime,
  RegimeId,
  RegimeMismatch,
  TensionEnvelopeScan,
  Termination,
  TerminationId,
  VerdictCell,
  VerdictInput,
  VerdictResult,
  VerdictState,
  VerdictWarningId,
} from "./verdict.ts";
export {
  amplifiedTension,
  evaluateVerdict,
  isFamilyAllowed,
  isRegimeAvailable,
  lineWarnings,
  REGIMES,
  regimeMismatch,
  scanTensionEnvelope,
  TERMINATIONS,
  VERDICT,
} from "./verdict.ts";

// —— materials/ — §13.1 and §13.2, no shared base, no `materials/index.ts` ——————————————————
// The A/B separation is the file split, and it survives the barrel: each family is re-exported
// from its own module, and adding a `materials/index.ts` between them is the tidying § 2 forbids.
// `steelFormula` beside `resolveSteelValues` because § 3's stale-Override badge compares the two.
export type { SteelSpec, SteelValues } from "./materials/steel.ts";
export { STEEL, deriveSteel, resolveSteelValues, steelFormula } from "./materials/steel.ts";
export type { TextileSpec } from "./materials/textile.ts";
export { TEXTILE, deriveTextile } from "./materials/textile.ts";

// —— wind.ts — the wind projected on the line, per #6 and the speed-model research (#8) ——————
export type { WindComponents } from "./wind.ts";
export { kmhToMs, msToKmh, windComponents } from "./wind.ts";

// —— dynamics.ts — §12.2's point mass along the frozen trajectory, §12.1's validity (#89) ——————
// `DYNAMICS` because the app ships its defaults and labels them, and §12.1's threshold is its.
export type {
  QuasiStatic,
  Ride,
  RideEnd,
  RideInput,
  RidePath,
  RideSample,
  TrolleyFriction,
} from "./dynamics.ts";
export { airDensity, DYNAMICS, quasiStaticRatio, ride, ridePath } from "./dynamics.ts";
