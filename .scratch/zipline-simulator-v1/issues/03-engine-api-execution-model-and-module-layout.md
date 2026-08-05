# Engine API, execution model and module layout

Type: grilling
Status: resolved
Blocked by: —
Map: [Zip-line simulator v1](../map.md)

## Question

What is the public shape of the simulation engine, and how does the React app drive it?

This is the architectural spine — the contract between settled physics and unsettled UI.
Everything downstream reads its types.

Settle:

1. **The solve function.** What does one call look like? `docs/simulation-theory.md` §4.1
   fixes the physics inputs as `(L, h, L₀, w, EA)` and the unknowns as `(H, V₀)`; §6.1 adds
   a point load `P` at material coordinate `s_P`. Name the input type, the output type, and
   decide whether the unloaded solve and the loaded solve are one function with an optional
   load or two functions. Decide where the §7 parameterisation modes live — inside the
   engine as alternative entry points, or in a caller that converts everything to `L₀`
   first (§7 says `L₀` is the single internal state variable).
2. **The sweep.** §6.2 wants the rolling rider swept over `s_D ∈ (0, L₀)` at 100–500 steps,
   warm-started so each Newton solve converges in 1–3 iterations. Decide: does the app
   **precompute the whole sweep** whenever parameters change, so the slider is a cheap index
   lookup into an array of `SweepStep`? Or does it **solve on demand** per slider position?
   The precompute answer also yields the anchor-tension envelope and the loaded-sag envelope
   for §11 clearance for free, which the on-demand answer does not. Weigh that.
3. **Where it runs.** Main thread, or a Web Worker? Do not decide this on feel — decide the
   *criterion* now and the answer against the prototype later (this is flagged as fog on the
   map). At minimum, settle whether the API is synchronous or Promise-based, because
   retrofitting async across the app later is expensive.
4. **Result shape.** What one `SweepStep` carries. §6.2 step 3 lists
   `(x_D, z_D, H, V₀, T_A, T_B, θ(x_D))`. Confirm or extend: does it also carry the sampled
   cable polyline for rendering, or does rendering call a separate `sampleCable(state, n)`?
   Where does the cable get discretised, and at what resolution?
5. **Failure as a value.** §5.4 gives a failure taxonomy — singular Jacobian, deep slack,
   oscillating residual, non-convergence after retries — and §4.3 adds degenerate branches
   (near-taut, slack limit, ground contact). Decide whether the engine throws or returns a
   discriminated union, and name the error cases. §4.3 is explicit that ground contact must
   be *detected and reported*, never iterated into.
6. **Module layout and test layout.** Where the engine lives (`src/lib/sim/`? one file per
   §-section?), how families A and B stay on separate code paths as
   `docs/conventions/simulation.md` requires, and where the §15 fixtures live.
   `docs/conventions/testing.md` explicitly asks for the file layout and naming convention
   to be recorded once chosen — record it there when this resolves.

## Context

Read `docs/simulation-theory.md` §4, §5, §6, §7 and §15 before answering. §15 is the
fixture set the engine must reproduce (F1, Z1–Z8) and it constrains the API: the tests need
to reach the Jacobian and the level-span shortcut, not only the top-level solve.

There is a mild circularity with
[Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) — resolve it
by treating the §4/§6 physics inputs as the engine's contract, and letting the UI parameter
model map onto them. The engine does not know about UI parameterisation modes; a thin
adapter does.

Note the app-layer vocabulary this ticket invents (`SweepStep`, `SolveResult`, and friends)
belongs in `CONTEXT.md` per the `/domain-modeling` skill — §1 of the theory covers the
physics vocabulary but not these.

## Answer

Resolved by grilling, 2026-08-05. Signatures below are the contract; downstream tickets
read their types from here.

### 1. One core solver, loads as an array

```ts
solveSpan(input: SpanInput): SolveResult
// SpanInput  = { L, h, L0, w, EA, loads: PointLoad[] }
// PointLoad  = { P: number; s: number }   // material coordinate — §6.2's primary variable
```

No unloaded/loaded split. §6.1 is decisive: with `n` loads at *given* material coordinates
the unknowns stay `(H, V₀)` and the equations stay `x(L₀)=L, z(L₀)=h`; the unloaded case is
`loads: []`. One Newton, one Jacobian assembler, one convergence path to fixture.

- The §4.1 **level-span shortcut** (`V₀ = −wL₀/2` exactly, fixtures Z1/Z2) is an internal
  fast path guarded on `h === 0 && loads.length === 0` — not public API, but a named export
  from its module because §15 requires tests to reach it directly.
- `solveAtHorizontalPosition` is **separate** — §6.1 case 2 is a different problem (extra
  unknown `s_P`, extra equation `x(s_P) = x_D`), resolved by outer 1-D bisection on the
  monotone `s_P` per the theory, calling `solveSpan` in its loop.
- `loads` stays an **array** even though the UI exposes exactly one rider. §6.1's `n`-load
  generality costs nothing; the multi-rider *UI* remains out of scope.

### 2. §7 modes resolve to `L₀` above the solver

```ts
resolveL0(spec: TightnessSpec, span: SpanGeometry): Result<number, SolveError>
```

Rejected: three engine entry points (`solveForTension`, `solveForSag`, …). One adapter,
one solve path. `L₀` becomes **materialised, first-class state**, which buys three things:
switching from "target 250 daN" to "direct `L₀`" pre-fills the length just achieved; the
§15 fixture surface stays small; and §9's `ΔL₀` story (thermal, creep) composes later only
because `L₀` is a value rather than an implementation detail of three solvers.

### 3. Result shape — three layers, scalars only in storage

The enabling fact: given `(H, V₀)`, §4.1's `x(s)`/`z(s)` are **closed-form**. Cable
geometry is cheap to regenerate and wasteful to store.

1. `SpanState` — `{ H, V0, VB, TA, TB, Tmax, L0, w, EA, iterations }`. Inputs echoed so it
   is self-sufficient for sampling; kills the "sampled with the wrong `w`" bug class.
2. `sampleCable(state, n): Point[]` — separate, pure, analytic. **No polyline inside any
   result object**: 240 steps × ~200 render points would churn ~50k points per parameter
   change to display one.
3. `SweepStep` — §6.2 step 3 exactly: `{ sD, xD, zD, H, V0, TA, TB, theta }`.

**§11 clearance stays out of the sweep**, as a reducer over it:

```ts
evaluateClearance(steps, terrain, hRider)
  → { hMin, atX, atStepIndex, contact: "none" | "rider" | "cable", perStep }
```

Because sampling is analytic, the second pass costs nothing and buys the seam: statics is
**terrain-free**, so the §15 fixtures need no terrain stub, and terrain enters the engine at
exactly one point. Anchor-tension and loaded-sag envelopes are likewise reductions over
`steps`, never stored fields.

### 4. Sweep precomputed; slider is an index lookup

Three consumers all need the *whole* traverse regardless: §11's clearance minimum is global
over rider positions; §10's verdict needs the worst tension over the traverse (§8.3); and
§6.2's warm-start is inherently sequential (1–3 iterations only when marching `s_D` in
order). On-demand solving would pay a cold or arbitrarily-warm start per slider frame *and*
still precompute the traverse for the verdict — it solves the traverse twice.

Grid: **240 uniform steps** (`SWEEP_STEPS`, exposed so the prototype can compare 100 vs
500) **plus ~10 geometrically-spaced steps inside the outer 2% at each end**, honouring
§6.2's refine-near-ends where `θ` and `T_A` change fastest. **Endpoints excluded** —
`s_D = 0` is the rider standing on the platform, not a state worth a slider stop. Grid is
**deterministic from `(L₀, n)`**; a step array that depends on the results is one you
cannot fixture.

Recorded fallbacks, not built: coarse-live/fine-on-release sweep (has a real hazard — a
coarse sweep can miss the worst clearance point and flash green); adaptive refinement
around the discovered minimum (`h_clear` is flat near its minimum, so the *value* is
already right at 2 m granularity, and adaptivity makes runs non-reproducible).

### 5. Engine synchronous forever; the app's access to it is async-shaped

Engine core: plain sync pure functions, no knowledge that workers exist — which is what
makes §15 a set of one-line Vitest assertions with no async and no worker harness in jsdom.

App boundary: one hook, `useSweep(params) → { status: "ready" | "computing", steps,
envelopes, stale }`, backed today by a sync call that never reports `computing`. The cost
of the unused state is ~zero because **stale-while-recomputing rendering is needed anyway**
(a pretension drag must keep drawing the last good profile, not blank the chart) — it is the
same machinery a worker would need. Retrofitting async later would touch every call site.

**Worker criterion**, to be answered against the ticket-07 prototype and nowhere else:

> Move the sweep to a Web Worker iff p95 wall time of one full `sweep()` — 240 steps plus
> end tails, 1000 m span, worst-conditioned case (deep slack or near-taut, where §5.1
> damping and §5.2 retries bite) — exceeds **8 ms**: half a 60 Hz frame, leaving the rest
> for React reconciliation and `d3-shape` path generation.

Rejected third option: time-sliced main-thread sweep. It makes the sweep
interruptible-and-partial, and the safety verdict cannot consume a partial envelope.

**This revises decision 3's terrain seam.** A closure cannot be structured-cloned across a
worker boundary, so terrain crosses as **data**:

```ts
type Terrain =
  | { kind: "flat"; z: number }
  | { kind: "profile"; xs: Float64Array; zs: Float64Array }   // ticket 06 fills this
zGroundAt(terrain: Terrain, x: number): number                // pure, linear interp
```

Same single seam, same "GPX never reaches the solver" property, and faster in the clearance
inner loop than a megamorphic callback.

### 6. Failure as a value — three error kinds

Two reframings of §5.4 first:

- **Most §5.4 rows are internal remedies, not failures.** Damping an oscillating residual
  (§5.1), the straight-bar fallback at `w·L₀/H < 10⁻⁴` (§4.3), the `H → 0` stiffness floor,
  clamping negative `H` iterates — the solver does these and then *succeeds*. They are
  notes, not errors.
- **Exceeding `MBF` is not a solve failure.** A line strung too tight solves perfectly and
  returns a huge `H`; §10 then says unsafe. Physics succeeding while safety fails is the
  correct split, and it keeps `MBF`, `η_t` and regime `k` out of the solver entirely.

```ts
type SolveResult =
  | { ok: true; state: SpanState; notes: SolveNote[] }
  | { ok: false; error: SolveError }

type SolveError =
  | { kind: "invalid-input"; field: string; value: number }        // non-finite/non-positive L₀,w,EA,L — pre-check
  | { kind: "no-convergence"; attempts: number; residual: number } // after §5.2's ≤5 re-seeds
  | { kind: "slack-limit"; hFloored: number }                      // §4.3 H→0: the line is lying down

type SolveNote = "near-taut-fallback" | "damped" | "reseeded"
```

Ground contact is **not** a `SolveError` — it surfaces in `evaluateClearance` as
`contact: "rider"` (the 2.1 m envelope is violated) or `contact: "cable"` (the cable is in
the dirt). This satisfies §4.3's "detect and report, don't iterate into it" without the
solver ever seeing terrain.

Union rather than throw, because of the sweep: if step 137 fails you want the other 239 and
you want to know *where* the failing band is. Throwing means `try/catch` in the hot loop and
discards partial results.

```ts
type SweepResult = {
  steps: SweepStep[]
  failures: { index: number; sD: number; error: SolveError }[]
  coverage: number   // solved / requested
}
```

`coverage` is carried into the verdict: a green verdict computed from 60% of the traverse
must not render as green.

### 7. Module layout

```
src/lib/sim/
  index.ts          public barrel — the only path app code imports from
  types.ts          SpanInput SpanState PointLoad SweepStep SolveResult SolveError Terrain MaterialSpec
  catenary.ts       §4.1 x(s) z(s), level-span shortcut, sampleCable
  jacobian.ts       §4.2 analytic partials (own file: §15 asserts ∂z/∂H = ∂x/∂V₀ and FD agreement)
  solve.ts          §5 damped Newton, §5.2 seeds + retries, §4.3 degenerate branches
  loads.ts          §6.1 multi-segment V(s), solveAtHorizontalPosition
  sweep.ts          §6.2 grid + march + warm-start
  parameterise.ts   §7 resolveL0
  terrain.ts        Terrain union + zGroundAt      ← ticket 06 fills this
  clearance.ts      §11 evaluateClearance
  verdict.ts        §10 regimes, T_allow = η_t·MBF/k, use-class gate
  materials/
    steel.ts        §13.1 K-factors, EA = E_app·C·d², mass factor
    textile.ts      §13.2 EA = k·MBL
```

Files named by concept; each carries a header comment citing its `simulation-theory.md` §
plus the underlying reference report, per `docs/conventions/simulation.md`.

**Where the A/B separation actually goes.** `simulation.md`'s "must not share a code path
unchecked" cannot mean two catenary solvers — the elastic catenary sees `(w, EA)` as
numbers and §15's fixtures are material-free. The separation belongs where the physics
genuinely differs: `materials/steel.ts` and `materials/textile.ts` share **no** base
module, no common helper and no `materials/index.ts` barrel; each derives
`{ w, EA, strength }` independently from its own spec, and `MaterialSpec` is a discriminated
union on `family`. The §10.4 use-class gate (`PERMANENT ⇒ steel only`) is hard validation in
`verdict.ts`. Everything downstream of derivation is legitimately shared.

### 8. Test and fixture layout — recorded in the conventions doc

Written to [docs/conventions/testing.md](../../../docs/conventions/testing.md), which had a
standing request for it: colocated `*.test.ts`, one per source file; fixtures in
`src/lib/sim/__fixtures__/theory-15.ts` exporting `F1` and `Z1`–`Z6`, each with a `source`
field; assert at `1e-3` relative with one TODO to tighten; never transcribe from
`docs/references/` (§14); assert the invariants (`∂z/∂H = ∂x/∂V₀`, level-span symmetry,
`EA → ∞` limit) alongside the values, since those catch the §2.1 sign-convention trap that
fixture values alone let through.

**`Z7` (thermal, §9) and `Z8` (dynamics, §12) are excluded** — their physics is out of scope
for v1.

### 9. Vocabulary

App-layer terms created here are recorded in [CONTEXT.md](../../../CONTEXT.md) (new file):
Span, Tightness Spec, Material Spec, Terrain, Span State, Solve, Sweep, Sweep Step,
Coverage, Verdict, Safety Regime, Rider Envelope, Rider Contact, Cable Contact, Unconfirmed
Default. Physics vocabulary stays in theory §1 and is not duplicated.
