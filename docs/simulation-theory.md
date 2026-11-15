# Zip-line simulation — consolidated theory & algorithm reference

> **Pour comprendre le modèle pas à pas, en français, commencez par le
> [guide](guide/README.md)** : il définit chaque notion avant de l'utiliser, explique chaque
> formule et la suit sur un exemple chiffré, et renvoie ici, paragraphe par paragraphe, pour le
> détail. Ce fichier-ci est la référence exacte du moteur, en anglais ; les « § » des infobulles
> du simulateur désignent ses paragraphes, dont la numérotation ne change pas.

**Status.** Definitive theory file for the Scoutech physics engine. Consolidates the four
French reference reports and the two deep-research runs, arbitrates their contradictions,
and records only values whose provenance is known. It is the contract the implementation
satisfies: the engine under `src/lib/sim/` cites its sections, and its §15 fixtures are the
engine's tests. The step-by-step guide (`docs/guide/`) explains it and adds nothing to it.

**Scope.** Spans 50 m – ~2000 m, two families at parity:

- **Family A — steel wire rope**, permanent installations (EN 15567 framework).
- **Family B — textile rope**, temporary installations (scouting, caving/mountain-rescue
  highlines, EN 1891 + rescue doctrine).

A and B are **separate physical models**. They must not share a code path unchecked
(`docs/conventions/simulation.md`).

---

## 0. How to read this file — sources and trust levels

### 0.1 Source keys

| Key         | Document                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `[R1 …]`    | `docs/references/research-one.md` (deep-research run 1, C/B numbering)                          |
| `[R2 …]`    | `docs/references/research-two.md` (deep-research run 2, C/B numbering)                          |
| `[ALGO §n]` | `docs/references/algo simulation tyrolienne.md`                                                 |
| `[SIM]`     | `docs/references/simulation tyrolienne.md` (prose blob — cite by quoted phrase, find with `rg`) |
| `[CABLE]`   | `docs/references/tyrolienne sur cable.md` (idem)                                                |
| `[CORDE]`   | `docs/references/tyrolienne sur corde.md` (idem)                                                |
| `[PROMPT]`  | `docs/references/deep-research-prompt.md` (gap analysis, C1–C11 / B1–B16 definitions)           |

### 0.2 Trust tags

Every number below carries one of:

| Tag               | Meaning                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[VERIFIED-NUM]`  | Recomputed in this consolidation (2026-08-05) with an independent solver, cross-validated against **MoorPy 1.3.0** (`moorpy.Catenary.catenary`, NREL). Agreement ≥ 6 significant figures. See §15.                                                                                                                                                       |
| `[STD-ATTESTED]`  | Standard clause text quoted/attested through open secondary sources; standard itself may be paywalled.                                                                                                                                                                                                                                                   |
| `[FIELD:SSF]`     | Instrumented field measurement, Spéléo Secours Français (Vercors 2008 campaign, 1109 m line), quoted verbatim in [R2]. Highest-confidence empirical constants in this file.                                                                                                                                                                              |
| `[DATASHEET]`     | Manufacturer CE/product data (traceable product + document named).                                                                                                                                                                                                                                                                                       |
| `[REGULATOR]`     | Open regulator guidance (WorkSafe Queensland 2019), quoted verbatim in [R2].                                                                                                                                                                                                                                                                             |
| `[CONVENTION]`    | Industry practice; no primary text found. Configurable, never hard-coded as regulatory.                                                                                                                                                                                                                                                                  |
| `[UNVERIFIED:R1]` | Asserted only by research-one with exact-looking clause numbers/values that research-two explicitly reports as _paywalled / not found_, or that failed numeric recomputation. **Do not ship as a default without independent confirmation.** R1 demonstrably fabricated fixtures (§14), so its uncorroborated precision is treated as plausible filling. |
| `[PAYWALLED]`     | Value lives in a paid standard; buy-to-confirm. Listed in §16.                                                                                                                                                                                                                                                                                           |

**Binding rule** (`docs/conventions/simulation.md`): coefficients tagged `[PAYWALLED]`,
`[CONVENTION]` or `[UNVERIFIED:R1]` may appear in the UI as _labelled, configurable
defaults with warnings_ — never as silent constants, and never presented as normative.

---

## 1. Vocabulary — ubiquitous language (FR ↔ EN)

One vocabulary for code, docs and UI. French terms appear in the reference reports;
English identifiers are canonical for code.

| FR (reports)                          | EN (canonical)                           | Symbol                          | SI unit |
| ------------------------------------- | ---------------------------------------- | ------------------------------- | ------- |
| tyrolienne                            | zip line                                 | —                               | —       |
| portée                                | span (horizontal)                        | `L`                             | m       |
| dénivelé                              | elevation difference (B relative to A)   | `h`                             | m       |
| corde (chord)                         | chord                                    | `√(L²+h²)`                      | m       |
| flèche                                | sag (max depth below chord)              | `D`                             | m       |
| garde au sol                          | ground clearance                         | `h_clear`                       | m       |
| longueur non tendue                   | unstretched length (state variable)      | `L₀`                            | m       |
| longueur tendue                       | stretched arc length                     | `S`, coordinate `σ`             | m       |
| abscisse matérielle                   | unstretched material coordinate          | `s ∈ [0, L₀]`                   | m       |
| prétension                            | pretension (installed tension, no rider) | `H` or `T`                      | N       |
| tension horizontale                   | horizontal tension component             | `H`                             | N       |
| poids linéique                        | weight per unit unstretched length       | `w = μ·g`                       | N/m     |
| masse linéique                        | mass per unit length                     | `μ`                             | kg/m    |
| raideur axiale                        | axial stiffness                          | `EA`                            | N       |
| charge de rupture (CMU/MBR)           | minimum breaking force/load              | `MBF` (steel) / `MBL` (textile) | N       |
| coefficient de sécurité               | safety factor                            | `k`, `FS`                       | —       |
| rendement de terminaison              | termination efficiency                   | `η_t`                           | —       |
| coefficient d'amplification dynamique | dynamic amplification factor             | `DAF`                           | —       |
| ancrage / amarrage                    | anchor / rigging attachment              | —                               | —       |
| chariot / poulie                      | trolley / pulley (sheave)                | —                               | —       |
| fluage                                | creep                                    | `ΔL₀(t)`                        | m       |
| allongement de construction           | construction stretch / bedding-in        | —                               | —       |
| âme (métallique)                      | (steel) core — IWRC vs fibre core FC     | —                               | —       |
| toron                                 | strand                                   | —                               | —       |
| chaînette (élastique)                 | (elastic) catenary                       | —                               | —       |

`MBR` (reports) ≡ `MBF` (EN 12385 wording, steel) ≡ `MBL` (rope industry, textile). Use
`MBF` for A, `MBL` for B in code.

---

## 2. Frames, sign conventions, units

All SI. One global frame, fixed here once — **the sign conventions below are the ones the
verified fixtures (§15) assume; deviations are detectable by fixture failure.**

- Left anchor `A = (0, 0)`; right anchor `B = (L, h)`; `x` horizontal toward B, `z` up.
  `h < 0` means B lower than A.
- `s ∈ [0, L₀]` is the **unstretched** material coordinate from A. Elasticity:
  a material element `ds` has stretched length `dp = (1 + T/EA)·ds` [PROMPT; ALGO §4].
- `H > 0` — horizontal component of tension, constant along the span when all applied
  loads are vertical.
- `V(s)` — vertical component of the tension the `s⁺` side exerts on the `s⁻` side.
  Self-weight gives `V(s) = V₀ + w·s`; a downward point load `P` at `s_P` adds `+P` for
  `s > s_P`. **For a sagging span `V₀ < 0`** (low point at `s* = −V₀/w`).
- Tension magnitude `T(s) = √(H² + V(s)²)`. `T` is maximal at the higher anchor
  [ALGO §2].
- The cable pulls anchor A with force `(H, V₀)` and anchor B with `(−H, −V_B)` where
  `V_B = V(L₀)`; report anchor loads as magnitudes `T_A = √(H²+V₀²)`,
  `T_B = √(H²+V_B²)`.

### 2.1 Known convention trap (detected numerically)

The elastic-catenary `z(s)` as printed in [ALGO §4] and [PROMPT] —
`z(s) = (H/w)[√(1+((V₀+ws)/H)²) − √(1+(V₀/H)²)] + (ws/EA)(V₀/w − s/2)` —
**mixes two sign conventions**: the transcendental part uses `V(s) = V₀ + w·s`
(V₀ at the _lower_/left end), while the elastic term `(V₀/w − s/2)` belongs to Irvine's
original convention `V(s) = V₀ − w·s` (V₀ at the _top_). The internally consistent form
is derived in §4. The error is small (−5.0 mm on fixture F1) but fails any 10⁻⁶ m
fixture. `[VERIFIED-NUM]` — fixture F1 (§15) discriminates the two.

MoorPy's frame maps to ours as: anchor = A, fairlead = B, `V_fairlead = V_B`,
`V_anchor = V₀`, `EXF/EZF` residuals identical to §4's after substitution
`V = V₀ + wL₀` [R2 B1; verified by the §15 cross-run].

---

## 3. Model hierarchy and validity map

Three model tiers [ALGO §2–§4, §10]:

1. **Parabola** (`D = qL²/8H`, `T_max = √(H² + (qL/2)²)`) — initial guesses and
   preliminary sizing only [ALGO §3].
2. **Rigid (inextensible) catenary** `y = C·cosh(x/C)`, `C = H/q`; arc
   `S = 2C·sinh(L/2C)`; `T = q·y` [ALGO §2]. Useful for closed-form checks and the
   `EA → ∞` limit test.
3. **Elastic catenary (Irvine 1981)** parameterised by `L₀` — the definitive engine
   (§4). Handles both families, all load cases, all parameterisation modes.

### 3.1 Parabola error vs exact catenary `[VERIFIED-NUM]`

Definition used (state it in any test): same `q`, `H`, `L`, level span, inextensible;
truth = catenary. Computed exactly (2026-08-05), resolves the C10 disagreement:

| sag/span `D/L` | sag error | `T_max` error | arc-length error |
| -------------- | --------- | ------------- | ---------------- |
| 1.0 %          | −0.013 %  | −0.000 %      | −0.000 %         |
| 3.0 %          | −0.120 %  | −0.003 %      | −0.000 %         |
| 5.0 %          | −0.330 %  | −0.025 %      | −0.001 %         |
| 8.0 %          | −0.835 %  | −0.155 %      | −0.008 %         |
| 10.0 %         | −1.289 %  | −0.356 %      | −0.020 %         |
| 12.5 %         | −1.978 %  | −0.791 %      | −0.046 %         |

Negative = parabola _underestimates_ (true catenary hangs lower — confirmed [R2 C10],
Southwire _Overhead Conductor Manual_ basis). [R1 C10]'s table matches these values;
[R2 C10]'s larger figures (">5 % tension error at 10 %") did **not** reproduce under
this definition — likely a different comparison (see ledger §14). Since the parabola
under-predicts sag, using it for clearance is **non-conservative**.

**Engine rule:** parabola allowed only as solver seed and for `D/L ≤ 3 %` preliminary
displays; elastic catenary is authoritative everywhere. (Threshold from the table:
at 3 % all errors < 0.15 %.)

---

## 4. Core model — Irvine elastic catenary

Source: Irvine, _Cable Structures_ (1981) via [ALGO §4], [PROMPT], [R1 B1], [R2 B1];
form below re-derived and `[VERIFIED-NUM]` (fixtures F1, Z1–Z3 agree with MoorPy 1.3.0
to ≥ 6 s.f.).

### 4.1 Governing equations

Unknowns `(H, V₀)`, given `(L, h, L₀, w, EA)`:

```
V(s) = V₀ + w·s ,   T(s) = √(H² + V(s)²)

x(s) = H·s/EA + (H/w)·[ asinh(V(s)/H) − asinh(V₀/H) ]
z(s) = (s/EA)·(V₀ + w·s/2) + (H/w)·[ √(1+(V(s)/H)²) − √(1+(V₀/H)²) ]
```

Derivation of the elastic terms: `dx/ds = H/T + H/EA`, `dz/ds = V/T + V/EA`, then
`∫₀ˢ V/EA ds' = (s/EA)(V₀ + ws/2)`. This fixes the trap in §2.1.

Boundary conditions: `x(L₀) = L`, `z(L₀) = h`. Two equations, two unknowns —
Newton–Raphson [ALGO §4, §7].

**Level-span shortcut** `[VERIFIED-NUM]`: for `h = 0`, symmetry gives exactly
`V₀ = −w·L₀/2` (fixtures Z1, Z2 return it to 10 digits). The solve reduces to one
equation in `H`. Use as fast path and as a unit test.

### 4.2 Analytic Jacobian `[VERIFIED-NUM]`

With `V₁ = V₀ + wL₀`, `T₀ = √(H²+V₀²)`, `T₁ = √(H²+V₁²)`:

```
∂x/∂H  = L₀/EA + (1/w)·[asinh(V₁/H) − asinh(V₀/H)] − (1/w)·[V₁/T₁ − V₀/T₀]
∂x/∂V₀ = (1/w)·[H/T₁ − H/T₀]
∂z/∂H  = ∂x/∂V₀                      (symmetry — assert it in tests)
∂z/∂V₀ = (1/w)·[V₁/T₁ − V₀/T₀] + L₀/EA
```

Matches [R1 B1]'s partials (R1's partials are correct even though its `z` fixture value
is not) and is the compact equivalent of MoorPy's `Catenary.py` transcription in
[R2 B1]. Verified against finite differences to |Δ| < 2×10⁻⁹ (fixture F1).

### 4.3 Degenerate cases and fallbacks

From MoorPy's production branches [R2 B1, B4] — adopt the same structure:

- **Near-taut / low-weight** (`w·L₀/H < 10⁻⁴`): `asinh` ratios ill-conditioned → switch
  to Taylor expansion [R1 B1] or a straight elastic-bar element
  `T₀ = (d/L₀ − 1)·EA`, `d = chord` [R2 B1].
- **Slack limit** (`H → 0`): floor the horizontal stiffness (MoorPy `slack_kx = 0.01·|w|`)
  to avoid a singular Jacobian [R2 B1/B4].
- **Ground contact** (cable touches terrain): split at touchdown into hanging + resting
  sub-segments (MoorPy ProfileType 0/2/7, pycatenary equivalent) [R2 B4]. For zip lines
  this is an _error state_ (clearance already violated), but the solver must not blow up:
  detect `z(s) < z_ground(x(s))` and report, don't iterate into it.
- **Negative `H` iterate**: clamp `H > 0` during Newton (damping in §5).

---

## 5. Solver specification

### 5.1 Newton–Raphson with damping

`[Yₙ₊₁] = [Yₙ] − α·J⁻¹·r`, residual `r = (x(L₀)−L, z(L₀)−h)` in **metres**.

- Step damping: halve `α` until the residual norm decreases (simple line search), cap
  step growth (MoorPy `dsolve2` uses `a_max = 1.2`) [R2 B1/B4]. Keep `H > 0`.
- Retry policy: on non-convergence after `MaxIter`, re-seed and retry (≤ 5 attempts —
  GHTyro precedent) [R2 B4].

### 5.2 Initial guess

- Parabolic seed: `H ≈ w·L²/(8·D_est)` with `D_est` from slack:
  `D_est = √(3·L·(L₀−chord)/8)` (level) [ALGO §7; R2 B5]; `V₀ ≈ −w·L₀/2 + h·H/L`.
- Peyrot–Goulois seed (MoorPy default, better near taut):
  `λ₀ = √(3·((L₀²−h²)/L² − 1))`, `H₀ = max(|w·L/(2λ₀)|, tol)`,
  `V₀,B = (w/2)·(h/tanh λ₀ + L₀)` [R2 B1; Peyrot & Goulois 1979].

### 5.3 Convergence criterion (C8 resolved)

**Residual = absolute anchor-position error `‖(Δx, Δz)‖` in metres.
Tolerance = `1×10⁻⁶ m` absolute for spans ≲ 1000 m, or `1×10⁻⁶·L` scaled beyond.**
This is MoorPy's definition and default [R2 C8] and what the §15 fixtures assume. It is
_not_ the geometric-vs-mechanical length mismatch: a length residual `ε` maps to a
tension error ≈ `EA·ε/L₀`, so length-based tolerances must scale with `EA` [R2 C8].
The `10⁻³ m` figure floating in the old reports is insufficient for long-span stiffness
convergence; both research runs agree on `10⁻⁶` [R1 C8, R2 C8].

### 5.4 Failure-mode diagnostics

| Symptom                      | Cause                                             | Remedy                                      |
| ---------------------------- | ------------------------------------------------- | ------------------------------------------- |
| Singular / ill-conditioned J | near-taut `H → ∞`                                 | straight-bar fallback (§4.3)                |
| `H → 0`, J singular          | deep slack                                        | stiffness floor, or report "line on ground" |
| Oscillating residual         | Newton overshoot                                  | damping `α ↓` (§5.1)                        |
| No convergence after retries | bad parameters (e.g. `L₀ < chord/(1+T_break/EA)`) | input validation, §7 brackets               |

[R2 B4 (MoorPy/GHTyro precedents); R1 B4 table is consistent — treat its exact
`ERR_*` naming as free to change.]

---

## 6. Point load — two-segment system, and the rolling rider

### 6.1 Statics with the rider at a fixed material point (B2)

Global formulation (equivalent to the segment-pair of [ALGO §5], the 3-unknown form of
Impollonia et al. 2011 [R2 B2], and the 4-unknown form of [R1 B2] after eliminating the
node force by vertical equilibrium):

Downward point load `P` at material coordinate `s_P`:

```
V(s) = V₀ + w·s + P·𝟙[s > s_P]
```

with `x(s), z(s)` integrated piecewise by the §4.1 formulas (segment 2 restarts from the
node with start vertical `V₀⁺ = V₀ + w·s_P + P`). Unknowns and equations:

- **`s_P` given** (the natural case, §6.2): unknowns `(H, V₀)`; equations
  `x(L₀) = L`, `z(L₀) = h`. 2×2 Newton, Jacobian assembled from §4.2 per segment.
- **`x_D` given** (UI convenience): add unknown `s_P` and equation `x(s_P) = x_D`
  (3×3, or outer 1-D bisection on `s_P` — monotone, robust) `[VERIFIED-NUM]` (Z4).

Node outputs: `x_D = x(s_P)`, `z_D = z(s_P)` — the rider trajectory point.

**`n` point loads**: `V` jumps by `Pⱼ` at each `s_Pⱼ`; `n+1` segments; unknowns stay
`(H, V₀)` when all `s_Pⱼ` are given (multi-rider simultaneity case) [R2 B2].

**H continuity caveat**: `H` is continuous only while applied loads are vertical. Drag or
inertial horizontal components on the rider make `H` jump by `P_x` at the node — needed
only in the dynamic phase [R1 B2 includes `P_x`; engineering consequence of node
equilibrium].

**Trolley ≠ pulley**: the cable does not run over the trolley — the trolley rolls on the
cable. Tension _magnitudes_ on both sides of the node are generally unequal; the
tangential imbalance is precisely the force that accelerates the rider along the line
(§12). Do not impose `T₁ = T₂` at the node.

### 6.2 Sweep variable for the rolling rider (B3 resolved)

Both research runs agree [R1 B3, R2 B3], settling the handoff's biggest open question:

**Primary sweep variable = unstretched material coordinate `s_D` of the trolley contact
point.** The split `L₀₁ = s_D`, `L₀₂ = L₀ − s_D` is then fixed per step, and each sweep
step is a standard fixed-node solve (§6.1). The split is a _consequence_ of trolley
position, never a free parameter.

Kinematic chain linking the three candidate coordinates:

```
σ_D(s_D) = s_D + (1/EA)·∫₀^{s_D} T(s) ds      (stretched arc position — zero-slip rolling)
x_D(s_D) = x(s_D)                              (horizontal position)
```

If the UI sweeps by `x_D`, run the inner solve of §6.1-case-2. Precedents: forest-skyline
carriage analysis (Carson & Mann 1970 rigid-link lineage, SkylineXL/LoggerPC), ropeway
mechanics (Czitary), Mungan's single-segment zip-line closed form [R1 B3, R2 B3].

**Trajectory algorithm** (quasi-static, [ALGO §10 roadmap step 4]):

1. Grid `s_D` over `(0, L₀)` (uniform in `s_D`, ~100–500 steps; refine near ends).
2. Solve §6.1 per step (warm-start from previous step — Newton converges in 1–3 iters).
3. Record `(x_D, z_D, H, V₀, T_A, T_B, θ(x_D))`.
4. Outputs: rider trajectory `z_D(x_D)`, anchor-tension envelope over the traverse,
   loaded-sag envelope for clearance (§11), slope profile for dynamics (§12).

### 6.3 Rider suspension and trolley footprint (B8)

- Rider hangs `l_lanyard ≈ 1.0–1.8 m` below the cable; pendulum period
  `T_p = 2π√(l/g) ≈ 2.0–2.7 s`. Clearance subtracts the full static envelope
  `h_rider = l_lanyard + body-below-harness` — defaults `1.5 + 0.6 = 2.1 m`
  `[CONVENTION — no normative value found; R1 B8 default 2.1 m, R2 B8 suggests 1.2 m
suspension; expose as parameter]`.
- Two-sheave trolley wheelbase (~0.10–0.25 m) spreads the point load; for spans ≥ 50 m
  the correction is immaterial (wheelbase/span ≲ 0.3 %) — model the rider as a single
  point load [R2 B8; R1 B8 agrees].

---

## 7. Parameterisation modes and inverse problems (B5)

`L₀` is the single internal state variable [ALGO §6; handoff decision]. Three input
modes, all converted to `L₀`:

1. **`L₀` direct** → forward solve (§4/§5).
2. **Installed tension** `H_target` (or anchor `T_target`): solve `H(L₀) = H_target`.
   `H` is **strictly monotone decreasing in `L₀`** over the physical domain (more length
   → more sag → less tension) [R2 B5 — basis of stringing charts]; `[VERIFIED-NUM]` on
   fixture Z6's bracket. ⇒ safe bisection: lower bound `L₀ = chord` (tension huge),
   upper bound grown by doubling the slack until `H < H_target`.
   Closed-form seed `[VERIFIED-NUM]` (gives 100.669 on Z6, exact 100.66984):

   ```
   L₀ ≈ (L + w²L³/(24·H²)) · (1 − H/EA)        (level span; parabolic arc + uniform strain)
   ```

   ⚠ [R1 B5]'s printed formula `L₀ ≈ L/(1+H/EA)·(1 − w²L²/(24H²))` has the elastic and
   sag corrections **inverted** (yields `L₀ < chord`, unphysical) — refuted numerically
   (§14). Same framing as the mooring "pretension problem" and overhead-line
   "sag-tension/stringing" problem [R2 B5].

   **Anchor target** `T_target` (decision of 2026-11-08, #85 — what a dynamometer reads
   between the tensioning anchor and the Maestro): the monotonicity above is proven for `H`
   only. `T_A(L₀)` (or `T_B`) falls from the chord as `H` does, but `T = √(H² + V²)` (§2)
   keeps the weight of every metre added, so on a very slack line it bottoms out and rises
   again. The bisection runs on the **taut branch** — from the §5.4 floor to that minimum,
   located by golden-section search once a doubled slack reads higher than the step before
   it — and a target under the minimum is unreachable. Checked numerically, not
   cross-validated: `src/lib/sim/parameterise.test.ts` resolves the `T_A`/`T_B` of Z1–Z3
   back to their `L₀`.

3. **Target unloaded sag** `D_target`: seed `H ≈ wL²/(8D_target)` [ALGO §3], refine `H`
   against the exact catenary sag, then mode 2. (Loaded-sag targets: same loop around the
   §6.1 solve.)

Mutations of `L₀` over time — thermal (§9.1), construction stretch and creep (§9.2) —
enter as `ΔL₀` and re-solve. That is the payoff of the `L₀` parameterisation.

---

## 8. Loads, dynamic amplification, load cases

### 8.1 Rider design load (C3)

- `6.0 kN` is the **EN 355 fall-arrest maximum arrest force** — it bounds the arrest /
  energy-absorber subsystem, _not_ zip-line traverse tension `[STD-ATTESTED via
Bethancourt et al. 2020 + SATRA; R1 C3 and R2 C3 agree on scope]`.
- Per-user design mass/force in EN 15567-1: `[PAYWALLED]`. [R1 C3] asserts
  `m_p = 120 kg → P = 1.177 kN` (Clause 4.1.2) plus Eurocode-style partial factors
  `γ_G = 1.35, γ_Q = 1.50, γ_W = 1.50` — [R2 C3] reports these as _not found in primary
  text_ ⇒ `[UNVERIFIED:R1]`. The legacy "0.8 kN conventional / 1.2 kN option" has no
  found provenance either [R2 C3].
- **Engine default:** rider mass a free input (default 120 kg, labelled "unconfirmed
  EN 15567 design mass — buy standard"), `P = m_p·g`. Simultaneity: single rider per
  span by default; multi-load solver exists (§6.1) for explicit multi-user scenarios.
- **Brins porteurs** `[CONVENTION]` (decisions of 2026-11-08 on issues #4 and #69): with
  two load-bearing members, both are strictly identical — same unloaded tension — and the
  trolley shares the rider 50/50, so each member is one §6.1 span under `P/2` plus its own
  weight. The vertical gap between them is constant and enters no computation. The split is
  **not validated**: in the 2026-11-01 field trial (`docs/mesures dynamometre/`) the
  instrumented lower line carried more than half. The app therefore also reports one member
  under the whole `P` — « cas défavorable » — which the verdict never reads.

### 8.2 Dynamic amplification factor (C7 resolved — two regimes)

| Regime                                                       | DAF                                                                           | Source                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------ |
| Controlled step-off traverse on a tensioned line             | **≤ 1.2** ("surtension de 120 % maximum de la valeur de la charge appliquée") | `[FIELD:SSF]` verbatim [R2 C7] |
| Drop/shock entry, slack line, rescue-belay drop              | up to **> 5×** static                                                         | BCCTR drop-test regime [R2 C7] |
| Intermediate (mid-span drop 1.6–2.2; impact braking 1.8–3.2) | interpolation                                                                 | `[UNVERIFIED:R1 C7]`           |

Total anchor load ≈ `pretension + DAF × suspended load` [R2 C7]. **Engine:** default
`DAF = 1.2` for step-off traverse `[FIELD:SSF]` ([R1] proposes 1.25 — configurable);
warn and escalate for drop entry or taut lines (`sag < 3 %` stiffens the response
[R1 C7], directionally consistent with the > 5× regime).

### 8.3 Load combination

Normative EN 15567 combination rules (pretension + static + dynamic + wind):
`[PAYWALLED]` — [R1 C3]'s `E_d = γ_G·T_pre + γ_Q·(T_user·DAF) + γ_W·F_wind` is
`[UNVERIFIED:R1]` (plausible Eurocode shape, no found clause). Until confirmed, the
engine reports the physical envelope (worst `T` over the traverse, §6.2) times the
selected safety regime (§10.1), with the combination formula exposed and labelled.

### 8.4 Wind

Design wind speed and lateral corridor: `[PAYWALLED]` (§16). Drag on the cable itself and
lateral blow-out were **out of scope for v1** (2-D vertical-plane model); §19 is the contract of
the spatial statics that replaces that model under wind (#127): normal drag on the line, the
rider's static wind force, the lateral offset in metres and the garde under wind.

**Prescribed wind profile along the line** (issue #120). The entered wind may carry a _profile_:
how its speed varies between the anchors. It is a **scenario the user prescribes, never a valley
forecast**: no relief, no meteorology and no measured shelter enters it, and it is no conservative
envelope. It has two typed parameters and one fixed shape, and it carries no trust tag of §0.2
because it holds no physical coefficient and no safety factor. It scales the **speed** of the
wind; the direction is the same along the whole line.

| Parameter                         | Symbol | Meaning                                                                                                                                        | Domain      | Step | Default |
| --------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---- | ------- |
| largeur à mi-atténuation (width)  | `w`    | % of the horizontal span between the two points where the speed is halfway between the mid-span speed and the anchor speed                       | `[10, 90]`  | 1    | 50      |
| atténuation aux ancrages          | `a`    | how far the speed at both anchors sits below the mid-span speed, % of that speed: 0 is a **uniform wind**, 100 a wind that is nil at the anchors | `[0, 100]`  | 1    | 0       |

With `ξ = x/L ∈ [0, 1]` on §2's horizontal abscissa (`L > 0`; never the material coordinate `s`,
the stretched arc or the chord), `χ = |2ξ − 1|`, `λ = w/100` and `α = a/100`:

```
p    = ln 2 / ln(1/λ)
h(t) = sin²(π·t/2)
φ(ξ) = cos²( (π/2)·h(χ^p) )
U(ξ) = V·[ (1 − α) + α·φ(ξ) ]
```

`V` is the entered wind speed, which is the speed **at mid-span**; `U` is in the unit `V` is
entered in, and is converted to SI where the physics reads it. What the shape guarantees, each
derivable from the four lines above:

- `φ(1/2) = 1` and `φ(0) = φ(1) = 0`: `U = V` at mid-span and `U = V·(1 − α)` at both anchors.
- `φ` depends on `χ` alone: the profile is **symmetric** about mid-span.
- `φ` decreases strictly from mid-span to each anchor: **monotone, no plateau**. The maximum is
  one point, not an interval.
- `φ = 1/2` exactly where `χ = λ`, i.e. at `ξ = (1 ± λ)/2`, since `λ^p = 1/2`: the two half-gap
  points are `w` % of the span apart, so the width typed is the width measured, and there
  `U = V·(1 − α/2)`. The exponent `p` is 1 at `w = 50`.
- **Zero slope at mid-span and at both anchors over the whole width domain.** At the anchors for
  every `p > 0`; at mid-span because `1 − φ ~ χ^(4p)`, which needs `p > 1/4`, i.e. `λ > 1/16` —
  below the domain's 10 %.
- The family is **C¹ and no more**: `φ''` is unbounded at mid-span for widths 10–24 % (`p < 1/2`).
  A solver reading `U` must not assume a bounded second derivative.
- `α = 0` gives `U ≡ V` **exactly**, whatever `w`: the width is kept and has no effect. `V = 0`
  gives `U ≡ 0`.

The field is **one field for every reader**: the line being posed, the line under wind and the
rider read the same `U` at their own `x`, whatever their height or lateral position, and the
deflection of the line does not move it. It is **evaluated locally** — never replaced by its mean
over the span, and never turned into one multiplier on a force. `x` outside `[0, L]` is outside
its domain: a reader handles that case itself, explicitly, and the fractional power is never
extrapolated.

Both parameters are **read at the whole percent they print as**: a link may hold `ww=50.4`, kept
as given, and the profile judged and evaluated is the 50 % every screen shows. A value outside
its domain is kept as given and refused by the Wind Gate — never clamped, never read as a
uniform wind. This is the app's one reading of a percent between two steps — §12.2's target has
it, and every gate judges a value as its field prints it, so the value a message echoes is the
value refused. What it costs: a percent typed by hand into a link is read up to half a point
from what the link carries — `ww=90.4` is 90 % and passes, `wa=0.4` is the uniform wind — where
the preparatory note (`docs/references/spatial-wind/wind-profile-contract-followup.md` §3.2)
evaluated `ww=50.5` as held. The fields and the profile's handle write whole percents only.

**Engine:** `src/lib/sim/wind-profile.ts` evaluates `φ`, `U` and the local wind vector. **Every
reader consumes it where it acts** (activated by #141): the line's normal drag at the `x` of
each integration stage (§19.4), the rider's static force at `x_D` (§19.5), the descent at the
passager's `x` (§19.15) — never a mean speed over the span. The rose's reading names the
mid-span speed, a display. The activation is a switch (`WIND_PROFILE_ACTIVE`); turned off, the
app would accept a uniform wind only and **refuse a non-uniform profile at the Wind Gate** — it
never computes under a uniform wind what a link entered as a profile. A field read outside
`[0, L]` is §19.8's `outside-model`, never a clamp of the line. This shape is the one adopted for
#120; it is not to be swapped for another curve silently.

---

## 9. Time-dependent changes of state (all as `ΔL₀`)

### 9.1 Thermal (B9)

`ΔL₀ = L₀ · α · ΔT`, then re-solve (§7). Coefficients:

| Material                   | α (1/K)                            | Tag                                                              |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| Galvanised steel wire rope | `+1.2×10⁻⁵`                        | [R1 B9]+[R2 B9] agree                                            |
| Stainless wire rope        | `+1.6×10⁻⁵`                        | [R2 B9]                                                          |
| HMPE (Dyneema)             | `−1.2×10⁻⁵` (contracts on heating) | sign confirmed [R2 B9]; magnitude [R1 B9], `[UNVERIFIED:R1]`     |
| Polyamide                  | positive, ~`+3×10⁻⁵` claimed       | `[UNVERIFIED:R1]`; behaviour dominated by moisture/creep [R2 B9] |

Worked example `[VERIFIED-NUM]` (fixture Z7): 200 m level span, `w = 5 N/m`,
`EA = 10⁷ N`, `L₀ = 200.05 m`, `ΔT = +30 K`:
steel → `L₀ = 200.1220 m`, `H` 6717 → 5890 N, sag `D` 3.721 → 4.245 m (+0.524 m);
HMPE (α<0) → `L₀ = 199.9780 m`, `H` 6717 → **7850 N**, sag 3.721 → 3.184 m.
A hot day _tightens_ an HMPE line — check the safety margin at `T_max`, not at install.
The classical overhead-line change-of-state cubic [R2 B9] is redundant here: the
`ΔL₀ + re-solve` route is exact within the model.

### 9.2 Construction stretch and creep (B10)

`L₀(t) = L₀,init + ΔL₀,construction + ΔL₀,creep(t)` [R1 B10, R2 B10 agree on form].

- Construction (bedding-in), one-off: wire rope `0.25–1 %` of length over first loading
  cycles; braided textile `1–3 %` first cycles `[CONVENTION — handbook figures, both
runs; R1's tighter "0.25–0.5 % within 200 cycles" unsourced]`.
- **HMPE creep** (DSM/Vlasblom model lineage): creep rate grows with load (%MBL) and
  temperature; secondary creep rises sharply above ~30 % MBL. Grade contrast
  **SK75 > SK78 > DM20** (DM20/SK99 for permanent tension) [R2 B10, peer-reviewed
  lineage]. R1's quantified rates (SK78 ≈ 0.3 %/yr at 20 °C / 20 % MBL; Arrhenius
  `n ≈ 3.2–3.8`, `Q ≈ 120 kJ/mol`) are `[UNVERIFIED:R1]` — plausible from the Vlasblom
  papers but not confirmed this pass.
- Polyamide/polyester: less creep than SK75, more elastic + moisture strain [R2 B10].
- **Design rule:** keep textile lines below **30 % MBL** standing tension to bound creep
  [R2 B10]; surface `ΔL₀(t)` in the UI as re-tension advisories, not silent state.

---

## 10. Safety framework (regulatory — not tunable)

### 10.1 Safety-factor regimes (C2)

Selectable _regimes_, each labelled with provenance; no blending:

| Regime                             | Rule                                                                                                | Tag                                                                                                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **EN 15567-1** (A, EU)             | `k = 3.0` on component MBF vs max total line tension                                                | `[STD-ATTESTED]` secondary (LEEA-057, AS 2316.2.1 MOD); clause text `[PAYWALLED]` [R2 C2]                                                                                            |
| **WorkSafe QLD 2019** (A, AUS)     | `FS ≥ 5` on suspended load **and** `FS ≥ 3` on total combined cable tension, **plus 2× proof test** | `[REGULATOR]` verbatim [R2 C2]; also relayed [ALGO §Key-Findings-5]                                                                                                                  |
| **ACCT / challenge-course "10:1"** | 10:1 on participant-bearing lines                                                                   | `[CONVENTION]` — not traceable to primary text [R2 C2]. ⚠ [R1 C2] instead claims ANSI/ACCT 03-2019 = **5:1** (Section F.2.4): conflict, both `[PAYWALLED]` — unresolved, see §14/§16 |
| **Rescue textile "10:1"** (B)      | 10:1 static system practice; EN 1891 label "max recommended load = 1/10 nominal"                    | `[CONVENTION]` + label attestation [R2 §4]; NFPA attribution `[UNVERIFIED:R1]`                                                                                                       |

Allowable tension: `T_allow = η_t · MBF / k` — termination efficiency multiplies MBF
before the factor [R1 C4; consistent with EN 13411 logic].

### 10.2 Termination efficiency `η_t` (C4)

| Termination                                   | `η_t`                                                  | Tag                                                                                                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Metal/resin socket (EN 13411-4)               | **1.00**                                               | `[STD-ATTESTED]` — standard's own scope text, quoted [R2 C4]                                                                                                                                                       |
| Ferrule / Flemish eye (EN 13411-3)            | **0.90** (≥ 90 % MBF; fatigue ≥ 80 % after 75k cycles) | `[STD-ATTESTED]` clause 6.2 quoted [R2 C4]; "95 %" is vendor optimism                                                                                                                                              |
| Spliced eye (EN 13411-2)                      | **0.80**                                               | `[STD-ATTESTED]` [R2 C4]                                                                                                                                                                                           |
| U-bolt grips (EN 13411-5) / wedge socket (−6) | **0.80**                                               | `[CONVENTION]` — clause text not accessed [R2 C4]; [R1 C4]'s clause cites `[UNVERIFIED:R1]`. ⚠ Grips "shall not be used where the rope supports persons" (WorkSafe QLD / AS 2076) `[REGULATOR]` — engine must warn |
| HMPE long-bury splice                         | **0.90**                                               | `[DATASHEET/CONVENTION]` (Samson; CI 1500 per [R1])                                                                                                                                                                |

### 10.3 Knot & splice efficiency, textile (B16)

| Termination       | PA (EN 1891)                                                                                  | HMPE                                                                                               | Tag                                           |
| ----------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Sewn/spliced eye  | 0.90–0.95                                                                                     | 0.90–0.95 (mandatory)                                                                              | `[CONVENTION]` both runs                      |
| Figure-eight loop | **0.60–0.80** (R2: 60–70 %, R1: 75–80 % — unresolved range; default to the conservative 0.60) | 0.25–0.50 — **prohibited** (slips; "tied knots may severely reduce the breaking strength", Samson) | `[CONVENTION]`+`[DATASHEET]` [R2 B16, R1 B16] |
| Bowline           | 0.55–0.70                                                                                     | prohibited                                                                                         | `[CONVENTION]`                                |

EN 1891 Type A test: figure-eight must hold 15 kN for 3 min — a **pass threshold**, not
an efficiency [R2 B16]. The old report's "10.5 mm with knot ≈ 31 kN" is refuted as
implausible [R2 B16, PROMPT B16].

### 10.4 Use-class gate (C9 resolved)

The "textile prohibited > 50 m" statement is a **use-class boundary, not a physical
ban** [R1 C9, R2 C9, both HIGH]:

- **Permanent public attractions** → Family A (steel) only. Textile disqualified by
  creep, UV/abrasion, and pulley friction-melt (HMPE melts ~144–152 °C, below the
  EN 1891 > 195 °C material floor) [R2 §3].
- **Temporary rescue/expedition** (professional supervision, limited lifespan) →
  Family B admissible at any documented span (SSF: 1109 m Vercors 2008 instrumented
  `[FIELD:SSF]`; 2205 m Millau claimed [PROMPT §5.7, R1 C9 — span list itself from the
  original reports]).

**Engine rule:** `installation_type = PERMANENT` ⇒ steel only (hard validation);
`TEMPORARY_RESCUE` ⇒ textile allowed with the B-family warnings (creep, %MBL cap,
splice-only HMPE).

---

## 11. Ground-clearance criterion (B12)

Correct envelope — global minimum over rider positions `[R1 B12 and R2 B12 agree on the
math]`:

```
h_clear(x; x_P) = z_cable(x; x_P) − z_ground(x) − h_rider
h_min = min over x_P of  min over x of  h_clear(x; x_P)
```

The loaded low point tracks the rider, so per load position the worst point is at
`x = x_P` — but adjacent-terrain bumps require the inner min over all `x` (terrain may
rise where the cable is not lowest) [R2 B12]. Evaluate on the §6.2 sweep: per step,
scan `h_clear` along the discretised profile.

**Zones d'ancrage** `[CONVENTION]` (#106). Within a horizontal distance `z` of either
anchor the passager is still, or already, on the platform, and the garde there is the
anchor height less `h_rider` by construction — in a V valley the global minimum above
always lands beside an anchor. Nothing is judged in the two closed zones `[0, z]` and
`[L − z, L]`: a rider position counts only for `z < x_P < L − z`, and within it only the
points `z < x < L − z` of the line and of the ground enter the inner minimum. That reduced
`h_min` is what the garde exigée, Rider Contact, Cable Contact and the violating bands
read; the same minimum with nothing left out is still computed and shown, judged by
nothing. `z` is the same at both ends, 10 m by default with no normative source
(EN 15567 stays `[PAYWALLED]`); `z = 0` is no zone and reproduces every figure above bit
for bit. Two zones that meet (`2z ≥ L`) leave nothing to judge and are a Blocking Error;
so are zones whose gap holds no sweep step (`2z` within one step spacing, ≈ `L₀/241`, of
`L`), since the reduction is over the sweep's own `x_P` and its judged minimum is then empty.

The inner interval is open, so its minimum is an infimum: where the garde rises away from a zone —
a valley falling from the anchor faster than the line — it is the **limit at the edge**, `x → z⁺`
(or `x → (L − z)⁻`), a boundary minimum with a non-zero slope. No sample of the scan lands there,
and the first one past the edge reads up to one spacing late — 2 to 9 cm optimistic on a 150 to
435 m line, measured against a 4800-step, 600-sample scan. So each step also evaluates the line
**at** `x = z` and `x = L − z`, inverting `x(s)` between the two samples that bracket the edge;
the judged minimum is then the edge's own value, to the nanometre in `x`, at any scan resolution,
and its `atX` reads exactly `z`. Only the judged fields read the edges: the minimum with nothing left
out keeps its vertices. `z = 0` has no edge, which is why it stays bit-exact. What stays at the scan's
resolution is the outer minimum over `x_P`, on the sweep's own load positions, as for every `z`.

`h_rider` default 2.1 m `[CONVENTION]` (§6.3). Normative EN 15567 free-space/fall-space
numbers, lateral wind corridor and design wind speed: `[PAYWALLED]` — [R1 B12]'s
"≥ 2.0 m, 1.0→1.5 m corridor at 28.3 m/s wind" are `[UNVERIFIED:R1]` (R2: _not found_).
Ship them only as labelled placeholders with a "buy EN 15567-1" warning.

---

## 12. Rider dynamics and braking

### 12.1 Quasi-static validity (B7)

Plan (validated): solve statics per trolley position, run a point mass along the frozen
trajectory [ALGO §10; handoff]. Validity criterion: traverse speed vs transverse wave
speed `c = √(T/μ)`; quasi-static holds for `v/c ≲ 0.2` `[R1 B7]` – `0.3` `[R2 B7]` —
**use 0.2 as the warning threshold** (conservative of the two). Above it: sag lag,
travelling waves, parametric resonance [both]. Empirical support: SSF Vercors reached
~33 m/s with quasi-static tension matching instrumented tension `[FIELD:SSF]` [R2 B7]
(typical `c` ≥ 100 m/s). Quantified error above threshold: not found — open (§16).

### 12.2 Equation of motion

Along the frozen trajectory `z_D(x_D)` with local slope `θ` [ALGO §10], a point mass: statics
first, then the rider as a concentrated mass on that trajectory, integrated as an ODE. Two open
publications make the same split independently of the SSF — Vladić, Jojić, Đokić 2020
(DOI 10.5937/imk2004089v, §4.2) and Jojić, Vladić, Đokić 2025 (DOI 10.46793/til2025.193j,
eq. 18) — read in research #8 (`07-vitesse-passager.md`):

```
m·dv/dt = m·g·sinθ − F_friction − F_drag ∓ F_brake
F_drag = ½·ρ·C_dA·v_rel·|v_rel|,   v_rel = v − u_∥·cosθ
F_friction = F₀ + k_v·v          (textile, see below)
F_friction = μ·N,  N = m·g·cosθ  (steel fallback, see below)
F_c = m·v²/R,  R = (1+z'²)^{3/2}/|z''|   (usually < 2 % — include optionally [ALGO §10.4])
```

`θ` is taken positive downhill here, and friction and drag oppose the motion. **Wind enters as a
longitudinal scalar closure using wind projected on the tangent** (research #8): `u_∥` is the horizontal wind's component along
the line's plan direction (tail wind positive) and `u_∥·cosθ` its projection on the tangent. The
published `(v ± v_wind)²` is the collinear special case; putting the whole entered wind speed in the
`±` does not implement this scalar closure. The current equation omits the direct effect of the
cross component; this is not a general physical claim that crosswind cannot change rider speed.
A spatial quadratic force uses the full relative-air-speed norm before tangent projection and may
therefore change longitudinal drag under crosswind. Neither that vector law nor an isotropic use
of the SSF `C_dA` calibration is validated here. See the preparatory
[rider aerodynamics review](references/spatial-wind/rider-aerodynamics-review.md), §5; the spatial
line shape is separately out of this equation (§16 item 13).

Outputs, once the trajectory and the constants are given (research #8): speed and acceleration
along the span, the **Point d'arrêt** — where the speed returns to zero and the local slope, wind
included, no longer overcomes the trolley's friction at rest — the arrival speed when B is reached
(no braking), and the duration. The rider **starts from rest at A** (controlled departure). The
Point d'arrêt is computed first without wind, then with the entered wind. Not outputs: lateral
deflection, dynamic cable tension, braking. With two Brins porteurs the trajectory is that of one
member loaded at `P/2` (§6.1), and the mass that rides it is the whole `m`. All of it is an
**estimation**, and is labelled so; §12.1's `v/c` check runs over every ride.

Constants — every one editable and labelled, none silent:

- **`C_dA = 0.45 m²` default** — SSF back-fit on the instrumented 1109 m line `[FIELD:SSF]`
  [R2 C6], read on the SSF « Instrumentation » page via research #8: one campaign, a harnessed
  caver, a textile rope, an unnamed pulley — not a seated park rider, not a steel cable. The
  range 0.30–0.60 is not on the SSF page: it bounds the editable field and is `[CONVENTION]`, not a
  measurement. ⚠ [R1 C6]'s posture table (supine 0.08–0.12 m²) **contradicts the SSF measurement
  for a supine caver** and is `[UNVERIFIED:R1]` (§14). Posture-dependence: keep as a configurable
  multiplier, not R1's numbers.
- **Trolley friction on textile: `F ≈ 15 N + 1.5·v`** (`F₀ = 15 N`, `k_v = 1.5 kg/s`, v in m/s)
  — SSF measured fit on textile `[FIELD:SSF]` [R2 B14], weight-independent in its published form.
  The SSF page names no pulley model (research #8): an earlier attribution of this fit to a
  named pulley, inherited from [R2], is withdrawn. One trolley's `F₀` is applied whatever the
  number of Brins porteurs; whether two sheaves add two `F₀` is not established (research #8).
- **Trolley friction on steel: `F = μ·N`, `N = m·g·cosθ`, `μ = 0.015`** — no open figure separates
  steel from textile, so steel does not share the SSF law (research #8). It takes the constant-μ
  fallback `μ = μ₀·d/D + 2f/D ≈ 0.015–0.02` [ALGO §10.3] at its low end; that formula has no open
  primary source, so the value is `[CONVENTION]` and an Unconfirmed Default with its warning.
  Jojić 2025 publishes the same `f·N` form (with the centrifugal term in `N`, omitted here as in
  the `F_c` line) without a value of `f`. [R1 B14]'s per-product μ table is `[UNVERIFIED:R1]`.
  Steel-vs-textile and sheave-diameter dependence: not found [R2 B14] — open (§16).
- **Air density**: ISA model `ρ = p/(R_s·T)`,
  `p = 101325·(1 − 2.25577×10⁻⁵·h_alt)^5.2559 Pa`, `T = 288.15 − 0.0065·h_alt K`,
  `R_s = 287.05 J/(kg·K)`;
  ρ = 1.225 (sea level) / ≈1.06 (1500 m) / ≈0.96 kg/m³ (2500 m) [R1 §3, R2 §3 agree —
  standard atmosphere, safe to hard-code]. Read at the imported profile's mean altitude; 1.225
  without a profile; shown, and editable.
- **Not shipped**: a 95 % trolley efficiency as a speed loss, and the local reports' `C_w` and `μ`
  tables (research #8).

**Inverse — the height of B for a target farthest point (#121).** The ride gives three distinct
quantities along the span: the **farthest point** reached toward B over the whole motion (the
largest `x` of the ride, a turning point), the **distance left to B** from there, and the Point
d'arrêt. A rider who swings back rests tens of metres short of where he turned (shipped line with
B raised 17.6 m: farthest point 134.6 m, Point d'arrêt 79.8 m), so the Point d'arrêt is never what
an inverse is held to; and a ride that reaches B has reached it wherever it rests afterwards. The
inverse searched is: A fixed, the variation `Δ` of B's height for which the farthest point of the
ride **with the entered wind** is at a target share of the span. No formula of its own — each trial
is this file's whole chain run again on the span with `h + Δ` and B's Anchor Height `+ Δ` (the
ground stays where it is): §7's Tightness Driver resolved afresh, §6.2's sweep, then the ride above.
The search walks a 0.1 m grid of heights and answers with the lowest one that keeps the farthest
point on the target or short of it; the candidate is then recomputed with §11 and with the ride
without wind as a comparison. Bounds: `z_B + Δ ≥ 0` and `h + Δ ≤ L` (45°). It refuses, with its
reason and no height, when the target is outside its domain, when no height within the bounds
reaches it, when the chain stops solving on the way (§5.4), when the farthest point jumps over the
target between two neighbouring heights (more than 5 % of `L` short), when §11 is not judged, or
when the candidate touches the known terrain outside the Zones d'ancrage. It is an **estimation**
like the ride it is built on, applies nothing, re-judges neither the Verdict nor the garde exigée,
and says nothing of a B moved elsewhere: another foot stands on another ground. What the kept
Tightness Driver does to the line is printed with the proposal rather than judged: the unstretched
length before and after, and — whenever the driver is not the pretension itself — the unloaded
tension at the tensioning anchor before and after (a typed `L₀` is not re-cut, so B's whole move
goes into that tension: shipped line with `L₀` typed at 151.20 m, B raised 18.4 m, 4381 N → 1851 N).

The target's domain is **50–93 % of the span, whole percents, 90 % shipped** — `[CONVENTION]`,
decided with #121. B and the targets close to it are excluded (the arrival is what the inverse avoids); under
mid-span the rider turns back before half the line. A link may carry a target between whole
percents (`cib=93.4`); it is kept as given and **read at the whole percent it prints as**, so the
domain judges, and the search is held to, the same 93 % every Page shows. Measured `[MEASURED]` 2026-11-13 on seven
lines, every whole target from 50 to 98 %: a height is found for each (0.1 m grid, farthest point
0.4 % of `L` short of the target at most on lines of 150 m and more, 1.8 % on the 50 m one), in
about 10 ms each on the development machine. What the upper bound is worth is read off two variations of the candidate — the low
end of the `C_dA` field's band, and a light tail wind:

| Line (span, `h`, driver) | `Δ` for 90 % | Farthest point of the 90 % candidate with `C_dA` 0.30 / with a 10 km/h tail wind | Lowest target whose candidate reaches B under either |
|---|---|---|---|
| steel 50 m, −5 m, pretension 2634 N | +4.9 m | 90.7 % / 92.4 % | 99 % |
| steel 150 m, −18 m, pretension 2634 N (shipped) | +17.6 m | 92.2 % / 93.4 % | 99 % |
| HMPE rope 150 m, −18 m, pretension 2634 N | +15.7 m | 92.2 % / 93.8 % | 98 % |
| steel 300 m, −25 m, sag 9 m | +18.4 m | 93.9 % / 94.8 % | 97 % |
| steel 500 m, −40 m, sag 15 m | +20.2 m | 95.1 % / 95.2 % | 96 % |
| steel 1000 m, −80 m, sag 30 m | +10.2 m | 96.2 % / 95.2 % | 94 % |
| steel 2000 m, −160 m, sag 60 m | −28.0 m | 94.8 % / 94.3 % | 96 % |

So 99 % is short of B on paper only — on every line the tail wind turns it into an arrival — and
from 300 m of span on, a target of 94–97 % is already within the model's own sensitivity of B.
Only up to 93 % did both variations leave the rider short of B on all seven lines: **93 % is the
upper bound** (`REACH.targetBand.max`), and a target above it is refused. A ±20 kg change of the rider's mass moves
the 90 % candidate's farthest point by 1–4 % of the span. None of this is a stopping guarantee:
braking stays §12.3's, and out of this inverse.

### 12.3 Braking (B13)

- **Eddy-current (zipSTOP class)**: force rises with velocity, monotone then saturating
  (Lenz) — curves proprietary `[R2 B13]`. Rated envelopes `[DATASHEET]`: zipSTOP
  15–150 kg, ≤ 36 km/h (1:1) / ≤ 60 km/h (2:1); IR 24–60 km/h; SPEED ≤ 72 km/h with
  mandatory external 2:1. [R1 B13]'s `F = c_eddy·v·R²` with `c_eddy = 120–180 N/(m/s)`
  is `[UNVERIFIED:R1]` — its own worked example yields 6.85 g, above every stated limit
  (§14). Model eddy brakes as a user-supplied force–velocity curve with the rated
  envelope as validation.
- **Bungee/elastic**: size `½k·x²` to absorb `½m·v²` over the stroke, worst case =
  heaviest × fastest [R2 B13].
- **Gravity brake (uphill tail)**: terminal rise `≥ v²/(2g)` + rolling/drag margin
  [R2 B13].
- **Deceleration limits**: keep sustained deceleration ≤ **2.5–3 g** and arrest length
  `l_brake = v²/(2·G·g)` [ALGO §10.5; R2 B13]. ASTM F2291 exact g/axis/duration limits:
  `[PAYWALLED]`; the "6 g < 200 ms / 2.5 g sustained (+X)" split is
  `[UNVERIFIED:R1]`-plausible. The 2.5 g figure is _practice_, not normative [R2 B13;
  ALGO §10.5 says the same with the passenger-swing caveat].

Arrival-speed sanity fixture: fixture Z8 (§15) — terminal velocity on a 10° slope with
the SSF constants: `v_t = 19.845 m/s`.

---

## 13. Material data

Parameters in fixtures are illustrative and need no provenance; **shipped material
defaults do** — that is the boundary between test inputs and engineering data.

### 13.1 Family A — steel wire rope

- **MBF**: `MBF [kN] = K · d² · R₀ / 1000` (d in mm, grade R₀ in N/mm²) with EN 12385-4
  factors: 6×19 class `K = 0.330` (fibre core) / `0.356` (steel core) `[STD-ATTESTED]`
  [R2 B15]. Full 10–20 mm tables: `[PAYWALLED]` — compute from K. The transcribed 6 mm
  6×19 triple — 12.9 kN (1770 FC), 14.4 kN (1770 IWRC), 21.0 kN (1960 FC) — does **not**
  reproduce from these K-factors and is demoted to `[UNVERIFIED:R2]` (§14 #21):
  `K · d² · R₀ / 1000` gives 21.03 kN (1770 FC), 22.68 kN (1770 IWRC), 23.28 kN
  (1960 FC), under the same K-factors whose 10 mm cross-check just below reproduces
  exactly. The quoted "21.0 (1960 FC)" is in fact the 1770 FC computation, mislabelled;
  12.9/14.4 kN match no `(K, R₀)` pairing tried. `MBF` is what the verdict divides by, so
  the computed triple is what ships, not the transcription.
  ⚠ [R1 B15]'s per-diameter MBL table is inconsistent with these K-factors
  (e.g. 10 mm 7×19 1770 listed 65.8 kN vs `K·d²·R₀ ≈ 58–63 kN`) ⇒ `[UNVERIFIED:R1]`.
- **Stiffness**: apparent rope modulus ≈ 60 % of wire ⇒ `E_app ≈ 100–130 GPa`
  [ALGO §8; R2 B15 (Feyrer/Costello lineage)]; `EA = E_app · C · d²` with metallic-area
  factor `C = 0.384–0.449` [R2 B15]. ⚠ [R1 B15]'s EA column implies `E > 190 GPa`
  (above solid steel) — physically impossible for stranded rope ⇒ refuted (§14).
- **Sheave bending**: minimum `D/d ≈ 20–25` for zip service `[CONVENTION]` [R2 B15];
  efficiency formula `η = 1 − 0.5/√(D/d)` `[CONVENTION — handbook rule, attribution
unverified; R1 B15]`.
- Mass per metre: nominal-mass factor `W = 0.359–0.400` (kg/100 m per mm²-convention of
  EN 12385-4) `[STD-ATTESTED]` [R2 B15]; α thermal §9.1; discard criteria: ISO 4309 /
  EN 12927-6 (paid — inspection module later).

### 13.2 Family B — textile rope

Stiffness convention: **`EA = k · MBL`**, quoting the load band and cycle (bedded-in vs
first loading) — never a fibre modulus (C5 resolved: 110 GPa is the _fibre_ figure,
finished braid is far softer [R1 C5, R2 C5 agree]).

| Rope class                          | `k = EA/MBL`                                                                         | Band / cycle                             | Tag                                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12-strand HMPE (SK78, AmSteel-Blue) | **≈ 22 @ 10 % MBL, ≈ 31 @ 30 % MBL** (elongation 0.46/0.70/0.96 % at 10/20/30 % MBL) | spliced, bedded-in                       | `[DATASHEET]` Samson 872, arithmetic verified [R2 C5]. [R1]'s `k = 40 ± 5` ⇒ `[UNVERIFIED:R1]`                                                                            |
| EN 1891 Type A polyamide 10.5–11 mm | **≈ 1.5** (EA ≈ 30–50 kN) at the CE band                                             | 50→150 kg static (elongation 2.0–3.25 %) | `[DATASHEET]` CE data, arithmetic verified: 0.98 kN / 0.03 ≈ 33 kN [R2 C5]. ⚠ [R1]'s `EA = 18·MBL` (≈ 450 kN) contradicts its own 2.8–3 % elongation rows — refuted (§14) |
| Polyester semi-static               | between the two (~1.5–3 % at working load)                                           | —                                        | `[DATASHEET]`-level only [R2 B11]; R1's `k = 25–35` `[UNVERIFIED:R1]`                                                                                                     |

- **Non-linear law (B11)**: PA is convex with hysteresis — bilinear (soft toe + stiffer
  main) or cubic fit, first loading softer than bedded-in; HMPE near-linear in-band,
  creep-dominated over time [R2 B11]. **PA stiffness at highline working loads
  (≫ 150 kg) is an open gap** — the CE band value under-stiffens the model; tabulated
  multi-point curves not found in open access [R2 B11] (§16). [R1 B11]'s cubic
  `T(ε) = 120.5ε + 450.2ε² − 1200ε³ kN` is `[UNVERIFIED:R1]` and its own worked example
  mis-evaluates the polynomial (§14).
- **Temperature**: EN 1891 requires melting point > 195 °C (PA/polyester qualify); HMPE
  melts ~144–152 °C → friction-melt risk at pulleys, not EN 1891-compliant [R2 §3].
- Creep grades & %MBL cap: §9.2. Knots/splices: §10.3.
- Product-level rows (Beal/Petzl/Marlow/Cousin in [R1 §3]; English Braids/Maxim/Tendon
  in [R2 §3]): treat every row as `[DATASHEET-claimed]` and **re-pull the datasheet
  before shipping as a default** — R1's reliability is compromised, and the two runs
  even disagree on trolley specs (Petzl Trac Guide 60 km/h [R1] vs 25 m/s = 90 km/h
  [R2], §14).

### 13.3 Anchors & support compliance (B6)

Spring boundary conditions: replace the fixed anchor with linear springs `K_x, K_z`;
residuals become `x(L₀) = L − H·(1/K_x,A + 1/K_x,B)` etc., Jacobian gains the compliance
diagonal [R1 B6, R2 B6 — same math]. Series stiffness `1/K_tot = 1/K_cable + 1/K_anchor`.

Stiffness **values**: no universal published `k(DBH)` for trees — site- and
diameter-specific; measured by pulling tests (Wessolly/Brudi method); guyed/tied-back
anchors 3–6× stiffer than unbraced [R2 B6, peer-reviewed]. [R1 B6]'s numeric ranges
(tree 1.5–4×10⁵ N/m, guyed pole 0.5–1.2×10⁶ N/m, "sway reduces peak tension 8–15 %")
are `[UNVERIFIED:R1]` — usable as order-of-magnitude UI placeholders only, clearly
labelled. Rigid-anchor model is the v1 default (conservative for tension). EN 15567-1
Annex A (arboricultural assessment): content `[PAYWALLED]`.

---

## 14. Arbitration ledger — research-one vs research-two

Rulings where the two runs (or a run and recomputation) disagree. **General finding:
R1 presents fabricated precision** — its "worked examples" fail recomputation, its
"measured" validation table conflicts with the SSF-published facts, and it quotes exact
clause values from standards it simultaneously lists as paywalled. R2 is
source-disciplined ("not found" stated explicitly) but made transcription errors.
**Policy: R2 > R1 on provenance; recomputation > both on numbers.**

| #   | Item                                                                                          | R1                                         | R2                                                                                                     | Ruling                                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Irvine fixture z(L₀) (B1)                                                                     | 24.84 m                                    | —                                                                                                      | **24.2392 m** `[VERIFIED-NUM]` (F1). R1's partials correct, its z wrong                                                                                                                                                                                  |
| 2   | Two-segment fixture (B2)                                                                      | H = 4125 N, L₀₁ = 50.12                    | —                                                                                                      | **H = 7898.16 N, L₀₁ = 50.25** `[VERIFIED-NUM]` (Z4); R1 values violate its own equilibrium equation                                                                                                                                                     |
| 3   | Sweep fixture (B3)                                                                            | x_D = 60.08, z_D = −4.120                  | —                                                                                                      | **x_D = 59.9578, z_D = −5.1906** `[VERIFIED-NUM]` (Z5)                                                                                                                                                                                                   |
| 4   | Inverse-problem fixture + closed form (B5)                                                    | L₀ = 100.2; formula `L/(1+H/EA)·(1−…)`     | bracket/monotonicity only                                                                              | **L₀ = 100.6698** `[VERIFIED-NUM]` (Z6); R1 formula has inverted corrections                                                                                                                                                                             |
| 5   | "pycatenary built-in fixture" (R1 §6)                                                         | H = 1289.4, D = 9.854                      | —                                                                                                      | **H = 1442.105, D = 8.7538** `[VERIFIED-NUM]` (Z2, MoorPy-confirmed). R1 fixture internally inconsistent                                                                                                                                                 |
| 6   | MoorPy fixture transcription (R2 B1/§6)                                                       | —                                          | HF = 3.146×10⁵, VF = 5.237×10⁵                                                                         | **Refuted by running MoorPy 1.3.0**: fully-suspended solution is HF = 3.7838×10⁶, VF = 1.5263×10⁶ (CB=0 seabed variant 3.7499×10⁶). The quoted pair was evidently the example's warm-start _seed_. Rule: **never transcribe fixtures — regenerate them** |
| 7   | SSF validation table (R1 §6: Vercors/Millau/Saint-Martory with sag/tension/speed values)      | full numeric rows                          | "SSF publishes method, not numeric tables online"; Vercors = 1109 m, pretension ≤ 220/145 daN, ~33 m/s | **R1 table treated as fabricated**: span 1122 vs documented 1109 m, pretension 8.5 kN vs SSF's verbatim ≤ 2.2 kN, arrival 22.4 vs ~33 m/s. **Do not use as regression data.** Real data: contact SSF/CVT (§16)                                           |
| 8   | PA rope stiffness (C5)                                                                        | `EA = 18·MBL` (~450 kN)                    | `EA ≈ 1.5·MBL` (~30–50 kN)                                                                             | **R2** — 0.98 kN over 2–3 % ⇒ EA ≈ 33–49 kN; R1's value contradicts its own elongation rows by ×10                                                                                                                                                       |
| 9   | Supine rider drag (C6)                                                                        | C_dA = 0.08–0.12 m²                        | SSF measured 0.45 m² for supine caver                                                                  | **R2/SSF** `[FIELD:SSF]`; R1's supine row incompatible with the only field measurement                                                                                                                                                                   |
| 10  | ANSI/ACCT safety factor (C2)                                                                  | 5:1 (Section F.2.4)                        | "10:1 is vendor convention; ACCT text not accessible"                                                  | **Unresolved — `[PAYWALLED]`**. Offer both, labelled unconfirmed                                                                                                                                                                                         |
| 11  | EN 15567 numbers (C1/C3/B12: 120 kg, γ-factors, 2.0 m clearance, wind corridor, clause 4.3.x) | asserted with clause numbers               | "paywalled — not found in primary text"                                                                | **`[UNVERIFIED:R1]`** across the board; buy-to-confirm list §16                                                                                                                                                                                          |
| 12  | Parabola error table (C10)                                                                    | small errors (−0.33 % @5 %)                | larger (">5 % tension @10 %")                                                                          | **R1's table confirmed** by recomputation (§3.1) under the same-H definition; R2's tension figures didn't reproduce — flagged as different/unstated definition                                                                                           |
| 13  | Textile knot efficiency fig-8 PA (B16)                                                        | 75–80 %                                    | 60–70 %                                                                                                | Unresolved range **0.60–0.80**; default conservative 0.60                                                                                                                                                                                                |
| 14  | Wire-rope MBF/EA table (B15)                                                                  | per-diameter table                         | K-factors only                                                                                         | **K-factors** `[STD-ATTESTED]`; R1 table inconsistent with them (MBF) and impossible (EA ⇒ E > steel)                                                                                                                                                    |
| 15  | R1 B11 cubic worked example                                                                   | T(0.03) = 3.888 kN                         | —                                                                                                      | Polynomial actually evaluates to **3.988 kN** — R1 mis-evaluates its own fit                                                                                                                                                                             |
| 16  | Eddy-brake law (B13)                                                                          | `F = c_eddy·v·R²`, worked example → 6.85 g | monotone-saturating, proprietary                                                                       | **R2**; R1's example exceeds every deceleration limit it itself states                                                                                                                                                                                   |
| 17  | Petzl Trac Guide max speed                                                                    | 60 km/h                                    | 25 m/s (= 90 km/h)                                                                                     | `[DATASHEET]` conflict — re-pull datasheet before shipping                                                                                                                                                                                               |
| 18  | Tree-anchor stiffness (B6)                                                                    | numeric ranges                             | "no universal value exists"                                                                            | **R2**; R1 ranges = placeholders only                                                                                                                                                                                                                    |
| 19  | DAF default                                                                                   | 1.25                                       | 1.2 (SSF measured ceiling)                                                                             | Default **1.2** `[FIELD:SSF]`, configurable; regimes §8.2                                                                                                                                                                                                |
| 20  | Solver tolerance normalisation (C8)                                                           | `10⁻⁶` normalised by span                  | `10⁻⁶ m` absolute (MoorPy default)                                                                     | Compatible: absolute ≤ 1000 m, scaled beyond (§5.3)                                                                                                                                                                                                      |
| 21  | 6 mm 6×19 attested MBF triple (B15)                                                           | —                                           | 12.9 kN (1770 FC), 14.4 kN (1770 IWRC), 21.0 kN (1960 FC)                                               | **Refuted by recomputation**: `K·d²·R₀/1000` with the shipped K-factors gives 21.03/22.68/23.28 kN — the same K-factors whose 10 mm cross-check (58–63 kN) reproduces exactly. Quoted "21.0 (1960 FC)" is the 1770 FC value, mislabelled; 12.9/14.4 kN match no `(K, R₀)` pairing. `[UNVERIFIED:R2]`; the computed triple ships, not the transcription                                                  |

---

## 15. Verified numerical fixtures (Vitest seed set)

Generated 2026-08-05 during this consolidation. Method: independent minimal
elastic-catenary implementation (pure Python, equations exactly as §4, damped Newton,
tol 10⁻⁹ m) cross-validated against **MoorPy 1.3.0** `moorpy.Catenary.catenary()`
(numpy 2.5.1); agreement ≥ 6 s.f. on every cross-checked case. Additional invariants
checked: analytic Jacobian vs finite differences (< 2×10⁻⁹), `EA → 10¹⁴` limit vs
closed-form inextensible catenary (7 s.f.), level-span symmetry `V₀ = −wL₀/2`, global
force balance on point-load cases (10⁻¹⁰). All inputs are **illustrative test values**,
not material recommendations. Frame: §2. Values to 6 s.f. — assert at `1e-3` relative
until the production solver's own tolerance is tuned, then tighten.

MoorPy cross-check call used (fairlead = B, `CB = −1000` forces the fully-suspended
profile since zip spans dip below the lower anchor):

```python
from moorpy.Catenary import catenary
catenary(XF=L, ZF=h, L=L0, EA=EA, W=w, CB=-1000)  # returns (HA, VA, HB, VB, info)
```

### F1 — Irvine forward evaluation + analytic Jacobian

In: `H = 5000 N, V₀ = +1000 N, w = 5 N/m, EA = 10⁷ N, L₀ = 100 m` (taut rising segment)

| Out              | Value                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `x(L₀)`          | **97.0329 m**                                                                                |
| `z(L₀)`          | **24.2392 m** (detects the §2.1 sign trap: mixed convention gives 24.2342; R1 claimed 24.84) |
| `∂x/∂H`          | **1.16024×10⁻³ m/N**                                                                         |
| `∂x/∂V₀ = ∂z/∂H` | **−4.55088×10⁻³ m/N**                                                                        |
| `∂z/∂V₀`         | **1.82564×10⁻² m/N**                                                                         |

### Z1 — Unloaded level span, mild slack (MoorPy-confirmed)

In: `L = 100, h = 0, L₀ = 100.5, w = 5, EA = 10⁷`

Out: `H = 1423.94 N`, `V₀ = −251.250 N` (= −wL₀/2 exactly), `V_B = +251.250 N`,
`T_max = 1445.94 N`, low point `z_min = −4.39987 m` at `x = 50.0`.

### Z2 — Unloaded level span, deep slack (MoorPy-confirmed)

In: `L = 100, h = 0, L₀ = 102, w = 10, EA = 10⁷`

Out: `H = 1442.11 N`, `V₀ = −510.000 N`, `T_A = T_B = 1529.63 N`,
`z_min = −8.75376 m`.

### Z3 — Unloaded inclined span (MoorPy-confirmed, mirrored run)

In: `L = 120, h = −15 (B lower), L₀ = 122, w = 5, EA = 10⁷`

Out: `H = 1286.38 N`, `V₀ = −468.701 N`, `V_B = +141.299 N`,
`T_A = 1369.11 N` (upper anchor, max) > `T_B = 1294.12 N`;
sag below chord `D = 7.0811 m` at `x ≈ 59.7`; low point below B: `z_min − h = −1.5476 m`.

### Z4 — Mid-span point load (rider), level span

In: `L = 100, h = 0, L₀ = 100.5, w = 10, EA = 10⁷, P = 1177 N at x_D = 50`

Out: `s_P = 50.2500 m` (= L₀/2, symmetry), `H = 7898.16 N`, `V₀ = −1091.00 N`,
`V_B = +1091.00 N` (= (wL₀+P)/2, checks C11's corrected reaction form),
node `z_D = −5.31434 m`, `T_A = T_B = 7973.16 N`.

### Z5 — Rolling-rider sweep step, material coordinate

In: Z4 line, trolley at `s_D = 60.15 m`

Out: `H = 7765.67 N`, `V₀ = −973.369 N`, node `x_D = 59.9578 m`, `z_D = −5.19064 m`,
stretched arc position `σ_D = 60.1969 m`.

### Z6 — Inverse problem: `L₀` from target pretension

In: `L = 100, h = 0, w = 10, EA = 10⁷, H_target = 2451 N`

Out: `L₀ = 100.670 m` (forward re-solve gives H = 2451.000, sag `D = 5.1164 m`).
Closed-form seed of §7 gives 100.669 — valid seed.

### Z7 — Thermal change of state (§9.1)

In: `L = 200, h = 0, w = 5, EA = 10⁷, L₀ = 200.05, ΔT = +30 K`

| Material (α)      | `L₀'`     | `H`                   | sag `D`           |
| ----------------- | --------- | --------------------- | ----------------- |
| steel (+1.2×10⁻⁵) | 200.122 m | 6717.1 → 5889.8 N     | 3.7211 → 4.2447 m |
| HMPE (−1.2×10⁻⁵)  | 199.978 m | 6717.1 → **7849.6 N** | 3.7211 → 3.1835 m |

### Z8 — Terminal velocity, SSF constants (§12.2)

In: slope `θ = 10°`, `m = 90 kg`, `g = 9.81`, `ρ = 1.225`, `C_dA = 0.45 m²`,
`F_friction = 15 + 1.5·v`

Out: drive `= 153.314 N`, `v_t = 19.8449 m/s = 71.44 km/h`
(root of `0.275625·v² + 1.5·v + 15 = 153.314`).

### C11 closed form (analytic fixture)

Level span, `q` self-weight, point load `P` at `x_P`:
`V_high = qL/2 + P·(L−x_P)/L`; at mid-span `T_max = √(H² + ((qL+P)/2)²)`. The old
report's `(qL+2P)/2` **double-counts P** — both runs concur [R1 C11, R2 C11], and Z4's
`V_B = 1091.00 = (10·100.5 + 1177)/2` confirms numerically (with `qL₀` since weight is
per unstretched length). Inclined case: solve elastically (§6.1) rather than trusting
taut closed forms; use them as seeds only.

### Excluded fixtures (do not port into tests)

R1 B2/B3/B5/B11/B13 worked examples, R1's pycatenary and SSF §6 tables (ledger #2–5, 7,
15, 16); R2's transcribed MoorPy pairs (ledger #6) — regenerate from MoorPy directly if
needed; R2's second MoorPy fixture (`XF = 121.5…`) involves seabed contact — not
zip-applicable.

---

## 16. Open questions / gap register

Per `docs/conventions/simulation.md`: these stay open — no value gets invented.

**Buy-to-confirm (paywalled clause values)** [R2 §7]:

1. EN 15567-1:2015+A1:2020 — design user mass & simultaneity, load combinations, exact
   safety-factor clause, free-space/fall-space geometry, wind corridor + design wind
   speed, Annex A tree-anchor method. (All values currently shown from [R1] are
   `[UNVERIFIED:R1]` placeholders.)
2. ANSI/ACCT 03-2019 — participant-line safety factor (5:1 vs 10:1 conflict, ledger #10).
3. ASTM F2959 / F2291 — deceleration g/axis/duration limits.
4. EN 13411-5/-6 — U-bolt / wedge-socket efficiency clause values.
5. EN 12385-4 — per-diameter MBF tables 10–20 mm (or keep computing via K-factors).

**Data gaps (research/measurement needed)**:

6. PA (EN 1891) stiffness at highline working loads ≫ CE band; multi-point
   load–elongation curves (bilinear/cubic fit coefficients) [R2 B11].
   6b. **HMPE `k` is attested only _above_ the operative band.** §13.2 quotes `k ≈ 22 @ 10 %
MBL` / `≈ 31 @ 30 % MBL`, but a zip line is strength-sized for shock and rescue, not
   standing tension: a 200 m span on 100 kN-MBL HMPE with a 120 kg rider runs at **≈ 0.6 %
   MBL standing and ≈ 6.3 % MBL loaded** (computed 2026-08-05, illustrative `μ = 0.075 kg/m`,
   6 m target sag). Since the elongation rows (0.46 / 0.70 / 0.96 % at 10 / 20 / 30 % MBL)
   put the bedding-in toe in the _first_ 10 % MBL, the true secant `k` below 10 % MBL is
   **lower than 22** — so `k = 22` over-stiffens the model at zip-line loads. Sub-10 % MBL
   load–elongation data not found in open access. Distinct from item 6: that is PA _above_
   its band, this is HMPE _below_ its band. Engine copes by shipping `k` as an editable
   field with a permanent out-of-band warning driven by the computed `%MBL`
   (ticket 05 of `.scratch/zipline-simulator-v1/`).
7. Real validation dataset: SSF/CVT Vercors numeric series (tension log, theodolite sag
   points) — contact SSF; R1's table is unusable (ledger #7). Also GHTyro's built-in
   "Pierre Rias" dataset as a cross-solver case [R2 §6].
8. Tree-anchor stiffness `k(DBH)` — site pulling tests only [R2 B6].
9. Trolley rolling resistance on steel vs textile, sheave-diameter dependence [R2 B14].
10. Quantified quasi-static error above `v/c` threshold [R2 B7].
11. Normative rider suspension height (h_rider) [R2 B8].
12. HMPE/PA thermal α magnitudes and creep-rate constants (confirm Vlasblom numbers)
    [§9.1, §9.2].
13. Lateral wind model (blow-out corridor) — out of v1 scope, needed for EN compliance
    view [§8.4]. §19 now computes the line's lateral offset under the Scenario's wind with adopted
    conventions; the normative design wind and corridor stay `[PAYWALLED]`. Preparatory evidence and limits, without new coefficients:
    `docs/references/equilibre spatial vent.md` (2026-11-09; issues #127, #120, #118, #124).
    §18 is the contract of the isolated experiment that compares normal drag alone with an added
    lift and an added axial drag on the line (#134): sensitivity probes, no coefficient adopted.
14. Eddy-brake force–velocity curves (manufacturer data or bench measurement) [§12.3].
15. Petzl Technical Institute quantified highline test reports; US Army FM rope-bridge
    sag-tension tables [R2 §7].
16. Conflicting datasheet claims to re-pull: Petzl Trac Guide max speed (ledger #17),
    all product rows in [R1 §3] / [R2 §3].

---

## 17. Implementation roadmap hook

Staged plan stays as [ALGO §10]/handoff: parabola prototype → inclined rigid catenary →
**elastic catenary + Jacobian (§4–§5) → point load (§6.1) → rolling sweep (§6.2) →
inverse modes (§7) → clearance (§11) → dynamics & braking (§12)** — with §15 fixtures as
the TDD seed and §14/§16 as the guard rails on every constant. Steel (§13.1) and textile
(§13.2) stay separate modules behind the §10.4 use-class gate.

---

## 18. Experimental spatial statics under wind — lift and axial drag probes (#134)

**Status.** The contract of one **isolated numerical experiment**, `experiments/spatial-aero-134/`,
written before its code. It is **not part of the engine**: nothing under `src/` reads it, it
replaces no solver, and it changes neither the descent drag of §12.2, the Verdict nor any safety
factor. #127 owns the production spatial statics and adopted normal drag alone on the line; this
section exists so that the effect of **adding** a lift and an axial drag can be compared with
that choice on identical cases. No number below carries a trust tag of §0.2, because none is a
value of the engine: §18.4 gives each its own class. Nothing here may be read as a product
coefficient, a realistic interval, a conservative bound or a promise of safety.

### 18.1 Scope

- **Statics only.** One line between two fixed anchors, under its weight, a prescribed uniform
  horizontal wind and, optionally, a static rider held at the trolley. No vibration, vortex
  shedding, galloping, gust or inertial feedback of the descent (#124).
- **One material law**: §4's constant `EA`. Steel and textile enter as two sets of `w`, `EA` and
  declared diameter `d` — data, not two code paths of the engine.
- **The rider's load is one prescribed vector**, identical in every aerodynamic model: its weight
  share on the member computed. The experiment gives the rider no wind area, so it does not
  depend on #127's ellipsoid.
- **A uniform wind.** §8.4's profile is not exercised: every element reads the same velocity.
- **Carrying members.** A line with two identical Brins porteurs is computed as **one** member
  carrying its own weight and wind whole and half the rider's weight (§8.1's 50/50 sharing,
  `[CONVENTION]`); no wake between the members is modelled.

### 18.2 Frame and equilibrium

§2's frame with a third axis: `x` horizontal from A to B, `z` up, and **`y` horizontal to the left
of the travel A → B**, so that `(x, y, z)` is right-handed. A is the origin, B is `(L, 0, h)`. `S`
is the unstretched material coordinate from A (§2's `s`), `0 ≤ S ≤ L₀`. SI throughout.

`F(S)` is the internal force that the `S⁺` side exerts on the `S⁻` side; `T = |F|`, the unit
tangent of the stretched line is `t = F/T` (pointing from A to B), and the stretch is
`λ = 1 + T/EA`. With `q₀` the distributed external load **per unstretched metre**:

```
dF/dS = −q₀
dr/dS = λ·t
q₀    = (0, 0, −w) + λ·(f_n + f_L + f_a)
```

`f_n`, `f_L` and `f_a` are §18.3's forces **per stretched metre**, which is why they take the
factor `λ`; `w` is per unstretched metre and does not. The boundary conditions are `r(0) = A` and
`r(L₀) = B`. A static rider held at `S_P` puts the external force `P_ext` on the line there:

```
r(S_P⁺) = r(S_P⁻)
F(S_P⁺) − F(S_P⁻) = −P_ext          P_ext = (0, 0, −m·g/n)
```

with `n` the number of carrying members. The line pulls anchor A with `F(0)` and anchor B with
`−F(L₀)`: those are the reactions the experiment reports. Integrating over the line gives the two
global balances that §18.6 checks:

```
F(L₀) − F(0) + ∫₀^L₀ q₀ dS + P_ext = 0
r_B × F(L₀) + ∫₀^L₀ r × q₀ dS + r_P × P_ext = 0          (moments about A)
```

Without wind this is §4 and §6.1: `F = (H, 0, V₀ + w·S)` up to the rider, whose weight `P` adds to
the vertical component beyond it.

### 18.3 Aerodynamic closure of the line

`u` is the velocity of the air **relative to the element, pointing where the air goes**. The line
is static, so `u` is the wind: `u = (u_along, u_across, 0)` with the components of
`windComponents` (`src/lib/sim/wind.ts`) — `u_along > 0` a tail wind, `u_across > 0` a wind from
the right of the travel. With `ρ` the air density and `d` the declared diameter:

```
u_t = u·t                         u_n = u − u_t·t
f_n = ½·ρ·C_D⊥·d·|u_n|·u_n                         normal drag
f_L = ½·ρ·C_L ·d·|u_n|·(t × u_n)                   lift, « binormal » law
f_L = ½·ρ·C_L ·d· u_t ·(t × u_n)                   lift, « yaw-odd » law
f_a = ½·ρ·C_t ·d·|u_t|·u_t·t                       axial drag
```

| Force | Direction                                   | Reference speed          | Reference length | Unit |
| ----- | ------------------------------------------- | ------------------------ | ---------------- | ---- |
| `f_n` | along `u_n`, orthogonal to `t`              | `\|u_n\|`                | `d`              | N/m  |
| `f_L` | along `t × u_n`, orthogonal to `t` and `u_n` | `\|u_n\|`, or `√(\|u_t\|·\|u_n\|)` | `d`     | N/m  |
| `f_a` | along `t`, on the side the air goes         | `\|u_t\|`                | `d`              | N/m  |

All three are per metre of **stretched** line and on the **declared diameter**, constant during
a calculation; none is on the wetted perimeter — a skin-friction coefficient `C_f` on `π·d` is
`C_t = π·C_f` here. `|t × u_n| = |u_n|`, so no term divides by a speed: `u_n = 0` or `u_t = 0`
gives a zero force, not a normalised null vector.

**Three forces, never one counted twice.** On a deflected line `f_n` has a vertical component:
that is the projection of the normal drag and it stays in `f_n`
(`docs/references/spatial-wind/line-aerodynamics-review.md` §3.3). The lift is a separate force,
orthogonal to both `t` and `u_n`. On a level line in a pure wind from the right, `t = (1, 0, 0)`
and `u = (0, U, 0)`: `t × u_n = (0, 0, U)`, so `C_L > 0` lifts the line and `C_L < 0` presses it
down; a wind from the left reverses both.

**The lift's orientation is a hypothesis, in two parts.**

- _Its sign._ The wind alone does not determine on which side of the plane `(t, u_n)` a stranded
  line is pushed: the lay does. `C_L` is therefore **signed**, and every magnitude is run with
  both signs. The sign stands for no real construction.
- _Its dependence on the yaw._ The « binormal » law is the closure the archived notes wrote
  (`line-lift-axial-drag-significance.md` §3): a magnitude `½·ρ·|C_L|·d·|u_n|²` whatever the yaw,
  greatest in a pure crossflow. The « yaw-odd » law is added here because of a symmetry, **derived
  and not measured**: a uniform helical strand is mapped onto itself by a half-turn about a
  transverse axis that meets it, and a line many lay lengths long is, on average over its roll,
  unchanged by a half-turn about the direction of `u_n`. That half-turn leaves `u_n` as it was,
  reverses `u_t`, and reverses any force along `t × u_n`: the mean lift of such a line is **odd
  in `u_t`** and **nil in a pure crossflow**. `u_t·|u_n|` is the lowest product with that parity;
  it claims nothing about a magnitude, and at 45° of yaw both laws give the same magnitude for
  the same `|C_L|`. Neither law is asserted to be a real rope's — an idealised helix is not a
  worn 6×19 or a braided sheath.

**The axial drag follows the air.** The archived notes write `f_a` « opposed to the axial
component of `u` » (`line-lift-axial-drag-significance.md` §3,
`production-aerodynamics-followup.md` §4.1). With `u` the velocity of the air relative to the
line — the convention under which `f_n` is along `+u_n` — a drag is along the relative flow, so
the experiment takes `+|u_t|·u_t·t`: a tail wind pulls the line toward B and raises the tension
at A. The opposite sign would make the air push upstream. This is a correction of sign with
respect to those notes, **flagged for the maintainer**, not a new physical claim; it changes
which anchor gains tension, not a magnitude.

### 18.4 Coefficients — classes, not values of the engine

| Quantity | Values run                         | Class                         | What it is                                                                                                                                                                  |
| -------- | ---------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `C_D⊥`   | `1.2`, every model                 | published, **not transferable** | order of magnitude of a smooth cylinder below its critical Reynolds number and of other stranded constructions; #127's adopted convention (Q35). No 6×19 and no dry textile rope was measured |
| `C_L`    | `0`; `±0.05`; `±0.2`; `±0.5`       | **sensitivity probe**         | chosen to explore the response under both laws of §18.3. No transferable measurement exists (`production-aerodynamics-followup.md` §4)                                    |
| `C_t`    | `0`; `0.02`; `0.1`                 | **sensitivity probe**         | chosen to explore the response. No usable measurement exists (ibid.)                                                                                                        |
| `ρ`      | `1.225 kg/m³`                      | convention                    | §12.2's sea-level density                                                                                                                                                   |

A **sensitivity probe** is neither a realistic interval nor a bound: a result obtained with one
says how the equilibrium responds **if** the coefficient had that value, and nothing about
whether it does. The four models compared are: normal drag alone (the reference); normal + lift
(both laws, three magnitudes, both signs); normal + axial drag (two magnitudes); normal + lift +
axial (the binormal law crossed with the axial probes). The line properties, geometries, wind
directions and speeds are inputs of the experiment, listed with their own provenance in
`experiments/spatial-aero-134/cases.ts` and in the report it generates; the wind speeds are
illustrations, not design winds.

### 18.5 Numerical method and outputs

**Shooting from A.** The unknown is `F_A = F(0)`, three numbers. §18.2's equations are integrated
from A by the classical fourth-order Runge–Kutta rule with a fixed step in `S` — `N = 240` steps
along the line, split between the two sides of the rider into even numbers of equal steps in
proportion to their unstretched lengths, the rider's jump applied at its node. The residual is
the anchor closure `R(F_A) = r(L₀) − B`.

**Damped Newton.** `R = 0` is solved by Newton's method with a Jacobian by central finite
differences (step `10⁻⁶·|F_A|`) and §5.1's line search: the step is halved until `‖R‖` decreases.
The first seed is the plane line of the engine under the weight and the rider,
`F_A = (H, 0, V₀)` from `solveSpan` — exact without wind. Iteration stops at `‖R‖ ≤ 10⁻¹⁰ m`,
when no shorter step decreases `‖R‖`, or after 60 iterations; the case is **accepted** if `‖R‖`
is within §5.3's bar
(`10⁻⁶ m` up to 1000 m of span) and is otherwise a **failure, reported as such** with the closure
reached — never replaced by a neighbouring case or by the plane line. A trial along which the
tension vanishes is refused, not clamped. A non-convergence is a numerical statement, not a
physical impossibility.

**Outputs**, all read on the solved nodes:

| Output                 | Definition                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| reactions              | `F(0)` on A, `−F(L₀)` on B, N, three components                                                                                  |
| `T_A`, `T_B`, `T_max`  | `\|F(0)\|`, `\|F(L₀)\|`, greatest `\|F\|` over the nodes, both sides of the rider included                                       |
| flèche                 | greatest vertical drop below the straight line A–B, `max(h·x/L − z)`, never negative (Q9); a rise above A–B is reported beside it |
| déport latéral         | the lateral offset `y` of greatest magnitude, **signed**                                                                         |
| écart maximal à A–B    | `max over the line of √((h·x/L − z)² + y²)` — combined **at each abscissa, then maximised** (Q10); not a shortest distance to A–B |
| garde verticale        | `min over the line of z − z_ground(x) − h_gabarit`, on the ground profile **extruded sideways** (Q16) and the whole gabarit of §6.3 |
| distributed loads      | mean over the stretched length and greatest nodal value of `\|f_n\|`, `\|f_L\|`, `\|f_a\|`, N/m; each mean also as a share of `w`, taken on the same metre |

**The share of the self-weight is like for like.** `f` is per stretched metre and `w` per
unstretched metre, so `f/w` would set two different metres against each other. The share is
§18.2's own comparison, `λ·|f|` against `w`, both per unstretched metre:

```
share = (1/L₀)·∫₀^L₀ λ·|f| dS / w = mean of |f| over the stretched length × (Σ/L₀) / w
```

with `Σ = ∫₀^L₀ λ dS` the stretched length. `Σ/L₀`, the mean stretch, is reported beside the
loads. It exceeds 1 by the mean of `T/EA`: about a thousandth on the matrix's steel line, several
hundredths on its textile line.

An extremum is read between the nodes: inside a smooth piece, the vertex of the parabola through
three consecutive nodes wherever it lies between them; at the rider's node, which is a corner,
the node itself. The garde is a vertical clearance over an extruded profile: it is no clearance from the
real ground off the A–B axis.

**Two names.** « Écart maximal à A–B » is the glossary's term and Q10's; #134's brief wrote it
« écart combiné maximal à A–B ». « Déport latéral » is the brief's name for the lateral offset
this experiment computes in metres. The interface calls a computed lateral offset « écart
latéral » (§19.7, GLOSSARY) and keeps « déport » among the words to avoid; the qualitative Banane
it was once kept apart from is gone (#118). The experiment's tables are not the interface and
settle nothing.

**On a ground parallel to A–B the garde adds nothing to the flèche.** The matrix's prescribed
ground is a straight line a fixed height under each anchor, so
`garde = (anchor height − h_gabarit) − flèche` on every line and the difference of garde between
two models is the difference of flèche with the opposite sign. The report says so where it holds
and then prints the garde's difference in metres alone: a percentage of that garde would be a
share of a height the scenario chose.

### 18.6 Controls and tolerances

**The bars are fixed here, from the controls alone, before any difference between two aerodynamic
models is read.** A case over a bar is a failure that stays in the tables, never a difference.

| Check, on every solved case                                   | Bar                                         | Why that bar                                                                    |
| ------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| anchor closure `‖r(L₀) − B‖`                                  | §5.3: `10⁻⁶ m` (`10⁻⁶·L` beyond 1000 m)     | the engine's own                                                                |
| global force balance of §18.2                                 | `10⁻⁶ N`                                    | the loads are re-integrated by Simpson's rule, a second quadrature of what RK4 integrated; three orders under the force floor below |
| global moment balance about A                                 | `10⁻⁶ N·m` per metre of chord               | the force bar times its lever arm                                               |
| rider's jump `‖F(S_P⁺) − F(S_P⁻) + P_ext‖`                    | `10⁻⁶ N`                                    | as the force balance                                                            |
| continuity `‖r(S_P⁺) − r(S_P⁻)‖`                              | `10⁻⁹ m`                                    | the node is shared: anything else is a defect                                   |
| refinement: gap between `N` and `2N` steps, on every length and on every force reported — each reaction as the norm of its vector gap | `10⁻⁵ m`, `10⁻⁴ N`     | RK4 is of order 4: the gap is 15/16 of the coarse error, so the finer line, the one reported, is well inside it |

A difference between two models is **read only between two cases that both passed**, and is
called **resolved** only above a floor of `10⁻⁴ m` and `10⁻³ N` — ten times the refinement bars.
Resolved means distinguishable from the numerical error; it does not mean significant for an
installation. A difference under the floor is written nowhere as a number: the report prints
« < plancher », the tables leave the cell empty and flag it. A relative difference is given only where the reference is at least `0.1 m` or
`10 N`: below, the percentage would be a ratio to nearly nothing and the absolute value stands
alone.

**Controls of the prototype itself**, each with an expected value that does not come from it:

1. _No-wind return to §15._ Z1–Z5 with every aerodynamic coefficient at zero: `H`, `V₀`, `V_B`,
   `T_A`, `T_B`, `T_max`, the sag or the node's position within `4×10⁻⁶` relative — the
   solved-scalars tier of `docs/conventions/testing.md` — and Z3's sag, which §15 prints to five
   figures, within half a unit of its last.
2. _No-wind return to the plane engine_ on every calm case of the matrix, same bar; and every
   variant of a calm case identical to the reference within the floor.
3. _Normal drag alone, no weight, pure crossflow, level span._ The load is normal to the line, so
   `T` is constant and, with `p = ½·ρ·C_D⊥·d·U²` and `Σ = (1 + T/EA)·L₀` the stretched length, the
   line is a catenary of parameter `T/p` in the horizontal plane:
   `L = (2T/p)·asinh(p·Σ/(2T))`, déport `= (T/p)·(√(1 + (p·Σ/(2T))²) − 1)`.
4. _Lift alone (binormal law), no weight, pure crossflow, level span._ The line stays in the
   vertical plane, where the load `p = ½·ρ·|C_L|·d·U²` is normal and of constant magnitude: a
   circular arc of radius `R = T/p`, `L = 2R·sin(Σ/(2R))`, rise `= R·(1 − cos(Σ/(2R)))`.
5. _Axial drag alone, no weight, wind along a level span._ The line is straight:
   `T_A − T_B = ½·ρ·C_t·d·|U|·U·L`, positive in a tail wind.
6. _A uniform load vector._ A constant lateral load `p_y` per unstretched metre on a level span,
   with no aerodynamic term: the line is §4's plane catenary under `w' = √(w² + p_y²)`, tilted by
   `atan(p_y/w)` about A–B — §15's Z1 with `w = 3`, `p_y = 4`.
7. _Mirror._ Reversing `u_across` together with the sign of `C_L` mirrors the line in the plane
   `y = 0`: same tensions, same flèche, opposite déport, within the refinement bars.

Controls 3–5 are asserted at `10⁻⁸` relative: the closed forms are exact and the integration
leaves less. Controls 2 and 7 read the matrix's own rows; the mirror is taken on the row with the
most to mirror — the largest lift with the largest axial drag, on a loaded, inclined case under
the strongest wind that is both across and along the line. **A control that cannot be made — its
line has no equilibrium, or the matrix holds no case for it — is a failed control, never an
omitted one. If a control fails, the report gives the diagnostic and draws no conclusion on the
physics.**

### 18.7 The two installation conventions

**Main comparison — identical unstretched length.** For each line and geometry, `L₀` is resolved
**once, by the engine, without wind**, from the line's tension de pose at anchor A (§7), and is
then the same for every wind, load state and model. Same installation, same anchors, same other
inputs: what differs between two columns is the added force and nothing else. No length is
recomputed.

**Separate comparison — identical tension de pose.** #127's tension de pose is read on the
unloaded line under the scenario's wind. Here, for each line, geometry, wind **and model**, the
experiment solves the `L₀` at which the unloaded line reads the same total tension at A under
that wind and that model, **reports that length**, and solves the unloaded and the loaded line at
it. A model that changes the pose describes another installation; these rows live in their own
table and are never merged with the main comparison. The length is solved at `2N` steps, the
count the rows are reported at. The length is searched on the taut branch
from the no-wind length (§7: `T_A(L₀)` is not monotone on a very slack line); a target that
cannot be bracketed is a reported failure, and a root found is local — nothing claims it unique.

**Reference and differences.** In both tables every model is compared with normal drag alone on
the same case under the same convention: `Δ = value − reference`, and `Δ/|reference|` only under
§18.6's rule. A flèche, a déport or a garde can be nil or change sign: the absolute difference is
the result, the percentage a convenience. The length a model needs in the separate comparison is
compared the same way: `ΔL₀` is taken between two unloaded lines that both passed, read only
above the length floor, and given without a percentage.

**What the experiment cannot conclude.** That a probe moves a result says the equilibrium is
sensitive to that coefficient at that size; that it does not says so for that size only. Neither
supports adopting a coefficient, omitting a force as negligible, or bounding an error on a real
product: those need measurements the open sources do not provide, and a decision of the
maintainer.

---

## 19. Spatial quasi-static statics under gravity and wind (#127)

**Status.** The mathematical contract of the production spatial statics, written before its code
as #127's first acceptance criterion requires. It extends §2–§7 and §11–§12 to a line that leaves
the vertical plane of A–B under wind; without wind it **is** §4–§7, §11 and §12.2 (§19.16). It
applies the maintainer's consolidated decisions on #127 (Q1–Q43, the « Agent Brief — moteur
spatial » comment and the confirmation of the first delivery's scope), on #118 (projections,
Q16, Q24, Q34) and on #141 (activation of §8.4's profile). Where an earlier note of
`docs/references/spatial-wind/` proposes otherwise, those decisions prevail. Unlike §18 this is
the engine, not an experiment: nothing here is read from `experiments/spatial-aero-134/`, whose
prototype only showed that the method of §19.8 converges on its matrix.

**What it does not claim.** The three aerodynamic numbers of §19.4–§19.5 are **conventions
adopted by the maintainer** (#127 Q36, Q38, Q39, Q43): reproducible reference values, not product
measurements, not conservative bounds, not validated. They carry no §0.2 trust tag and are not
user-editable — #127 Q36 explicitly chose an internal documented value over a new input, which
is the maintainer's exception to §0.2's binding rule for these three numbers. A numerical
agreement in §19.17 validates the scheme, never the physics. No safety factor, no Verdict rule
and no DAF changes here (§19.14).

### 19.1 Scope

- **Quasi-static equilibria, one-way coupling** (#127 §1). For each rider position the line is in
  static equilibrium under its own weight, the wind on the line and, when loaded, the rider held
  motionless at the trolley. The rider's weight and static wind force are transmitted whole to
  the line — the holding is part of the idealisation, the trolley is not a free roller in
  equilibrium. No line inertia, vibration, oscillation, sway, rotation of the rider (#124 stays
  out). The descent speed never feeds back into a shape or a tension (§19.15).
- **One wind for the whole Scenario** (#127 §2): the same field for the pose, every loaded
  equilibrium and the descent. Horizontal, one direction, speed uniform or modulated by §8.4's
  profile.
- **One material law**: §4's constant `EA`, `λ = 1 + T/EA` (#127 §3, #133 out of scope). Steel and
  textile keep their separate parameter chains.
- **Line aerodynamics: normal drag alone** (#127 Q35 and the confirmation of the first delivery).
  The extra lift and the axial drag of §18 are **omitted by decision, not because they are
  negligible**; §18's sensitivity probes show they can move tensions and garde and supply no
  coefficient. The vertical component of the projected normal drag is kept (§19.4).
- **Out of scope**: wake between two members, contraction of the diameter under tension, gusts and
  forecasts, the lanyard's and the pulley's own wind area (Q41), a rider lift or couple (Q42),
  surveyed off-axis terrain and 3-D obstacle distances (Q16), a dynamic correction of the line's
  energy (§19.15).

### 19.2 Frame, coordinates and units

§2's frame with a third axis, the one §18.2 and `windComponents` (`src/lib/sim/wind.ts`) already
use (#127 brief « Forces et propriétés »; `docs/references/spatial-wind/agent-readiness-solver.md`
§2):

- `x` horizontal from A toward B, `z` up, **`y` horizontal to the left of the travel A → B**;
  `(x, y, z)` is right-handed. `A = (0, 0, 0)`, `B = (L, 0, h)`.
- `S ∈ [0, L₀]` is §2's unstretched material coordinate `s` from A, the sweep variable of §6.2.
  The stretched arc `σ` is a reading, never an unknown.
- `F(S)` is the internal force the `S⁺` side exerts on the `S⁻` side, `T = |F|` the tension, and
  `t = F/T` the unit tangent of the stretched line, oriented from A to B.
- The line pulls anchor A with `F(0)` and anchor B with `−F(L₀)`: those are the **reactions**.
- The wind velocity is `u = (u_x, u_y, 0)`, the velocity of the air, pointing where the air goes.
  At an abscissa `x` it is `windAt(field, x, L, bearing)` (`src/lib/sim/wind-profile.ts`, §8.4):
  `u_x = along` (> 0 a tail wind), `u_y = across` (> 0 a wind from the right of the travel, which
  pushes toward `+y`). The meteorological « from » azimuth is converted **once**, by
  `windComponents`; no reader inverts it again.
- The engine takes angles, never Positions (`docs/conventions/simulation.md`): the bearing A → B is
  an input, read outside the engine.

SI throughout: N, m, kg, m/s, kg/m³. Diameters typed in mm are converted to metres where the
physics reads them. Two lengths per metre are kept apart: `w` and `q₀` are **per unstretched
metre**, the aerodynamic `f_n` is **per stretched metre** (§19.4).

Without wind, `y ≡ 0` and `F = (H, 0, V(S))` with §2's `V`: the signs are §2's, so §15's fixtures
read unchanged.

### 19.3 Material equilibrium, extension law and the trolley's jump

On each piece between two point loads:

```
dF/dS = −q₀(S)
dr/dS = λ·t = (1 + T/EA)·F/T
```

with `q₀` the distributed external load per unstretched metre (§19.4) and boundary conditions
`r(0) = A`, `r(L₀) = B`. A rider held at the material point `S_P` applies the external force
`P_ext` (§19.5–§19.6) there:

```
r(S_P⁺) = r(S_P⁻)                    (the node is shared)
F(S_P⁺) − F(S_P⁻) = −P_ext           (node equilibrium)
```

With `P_ext = (0, 0, −P)` this is §6.1's `V(s) = V₀ + w·s + P·𝟙[s > s_P]`. A horizontal component
of `P_ext` makes the matching component of `F` jump too, as §6.1's « H continuity caveat » already
says; nothing imposes `T⁺ = T⁻` (§6.1, « Trolley ≠ pulley »). Global balance over the line:

```
F(L₀) − F(0) + ∫₀^L₀ q₀ dS + P_ext = 0
r_B × F(L₀) + ∫₀^L₀ r × q₀ dS + r_P × P_ext = 0         (moments about A)
```

These two identities are not used to solve; they are oracles of §19.17.

**Extension law** (#127 §3): `ε = T/EA`, `EA` constant, from the material chain of §13 —
`deriveSteel` or `deriveTextile` — unchanged. It is the law the engine already codes, not a
universal textile law (#127, « Recherche technique »). The aerodynamic diameter `d` is the
declared one, **constant during a calculation**: no contraction under tension (#127 §3: omitted
and documented, not claimed negligible).

### 19.4 Loads on the line — self-weight and normal drag

```
q₀ = (0, 0, −w) + λ·f_n
u_n = u − (u·t)·t
f_n = ½·ρ·C_D⊥·d·|u_n|·u_n              N per stretched metre
```

- `w = μ·g`, per unstretched metre, as §2. With two members it is **not** divided (§19.6).
- `f_n` is the normal drag on the declared diameter `d`, along the component of the wind normal to
  the local tangent (#127 Q38). It is per metre of **stretched** line; an unstretched element
  `dS` is `λ·dS` long once stretched, hence the factor `λ` in `q₀` (#127 brief: « conversion vers
  longueur matérielle explicite »). `|u_n| = 0` gives `f_n = 0` without normalising a null vector.
- `f_n` is generally **not horizontal**: on a line inclined in a wind that is not along it, `u_n`
  has a vertical component and that component is kept (#127 Q35). It is the projection of the
  normal drag, not the extra lift §19.1 omits.
- `u` is read **at the `x` of each evaluation** — every integration stage of §19.8 — from
  `windAt`, never as a mean over the span and never as one multiplier on a force (§8.4). The
  field depends on `x` alone: not on `y`, not on `z`, not on `S`, and it does not move with the
  deflected line (#127 §3).
- `ρ` is the Scenario's air density, the same value §12.2's descent reads (`airDensityOf`:
  the typed value, else §12.2's ISA at the profile's mean altitude, else 1.225 kg/m³). No second
  density.

| Constant | Value | Class | Source |
| --- | --- | --- | --- |
| `C_D⊥`, steel line | `1.2` | adopted convention | #127 Q36, Q38: reproducible cylinder reference, already §18.4's; not a measured 6×19 or IWRC value, not conservative |
| `C_D⊥`, textile line | `1.2` | adopted convention | #127 Q38: same initial value, **a separate parameter** so the two can evolve apart |
| `d`, steel | nominal diameter of the steel spec, mm → m | input | §13.1 |
| `d`, textile | the optional `d` of the textile spec, mm → m | input, **required under wind** | #127 Q37, §19.11 |

**Missing textile diameter** (#127 Q37). When the wind is applied (speed > 0 and a bearing) on a
textile line whose `d` is absent, every result under wind is **unavailable**, with the diameter
named as the field to complete. The engine never invents a diameter and never replaces `f_n` by
zero; the plane line is not shown in its place. Without wind nothing reads `d` and today's
behaviour stands.

### 19.5 The static rider — ellipsoid, projected area and force

The rider is a solid ellipsoid of fixed orientation, deduced from the existing vertical gabarit
`h_rider` (§6.3) with no new input (#127 Q23, Q39, Q40):

| Axis | Full dimension | Semi-axis | Direction |
| --- | --- | --- | --- |
| height | `0.80·h_rider` | `c = 0.40·h_rider` | vertical `z` |
| width | `0.25·h_rider` | `b = 0.125·h_rider` | transverse `y` |
| depth | `0.15·h_rider` | `a = 0.075·h_rider` | along A–B, `x` |

Its bottom is `h_rider` below the trolley, its top `0.20·h_rider` below it, its centre
`0.60·h_rider` below it, on the trolley's vertical — no lateral offset from the trolley, no sway,
no rotation (Q40). For `h_rider = 2.10 m`: 1.68 × 0.525 × 0.315 m, centre 1.26 m below the trolley.
These proportions are an **adopted silhouette convention**, not anthropometry and not an inference
from the gabarit, which also holds the pulley and the lanyard (Q39). The whole gabarit is still
what §11 subtracts for the garde (§19.13).

**Projected area.** The area of the ellipsoid's shadow on a plane of unit normal
`n = (n_x, n_y, n_z)` is `A(n) = π·√(b²c²·n_x² + a²c²·n_y² + a²b²·n_z²)`. The static wind is
horizontal, `n = u/|u|`:

- head or tail wind (`n = ±e_x`): `A = π·b·c`, the ellipse height × width (Q42);
- side wind (`n = ±e_y`): `A = π·a·c`, the ellipse height × depth;
- oblique: the formula, which is the geometric projection Q42 asks for.

For `h_rider = 2.10 m`: `π·0.2625·0.84 = 0.6927 m²` face on, `π·0.1575·0.84 = 0.4156 m²` side on.
Doubling `h_rider` multiplies every area by 4 (Q39).

**Static force** (#127 Q42, Q43):

```
F_rider = ½·ρ·C_D·A(u/|u|)·|u|²·(u/|u|) = ½·ρ·C_D·π·c·√(b²·u_x² + a²·u_y²)·u
```

along the local horizontal wind, with `u = u(x_D)` read at the trolley's own abscissa (the centre
is on the trolley's vertical and the field does not depend on `z`). The second form divides by no
speed: `u = 0` gives `F_rider = 0`, with no direction to normalise. No lift, no couple, no own
area for the lanyard and the pulley (Q41, Q42). The descent speed does not enter (Q12, §19.15).

| Constant | Value | Class | Source |
| --- | --- | --- | --- |
| `C_D`, static rider | `1.0` | adopted convention | #127 Q43: reproducible reference on the projected area; **distinct** from the line's 1.2 and from §12.2's descent `C_dA` |
| ellipsoid proportions | `0.80 / 0.25 / 0.15 · h_rider` | adopted convention | #127 Q39 |
| placement | bottom at `h_rider`, centre at `0.60·h_rider` below the trolley | adopted convention | #127 Q40 |

The rider's load on the whole line is `P_rider = (F_rider,x, F_rider,y, −m·g)`.

### 19.6 Two identical carrying members

§8.1's `[CONVENTION]` extended to the full rider vector (#127 §4, brief « Deux lignes porteuses
identiques »): with `n_c` carrying members, assumed to share the same properties, `L₀`, mechanical
geometry and exposure, **one** member is computed with

```
P_ext = P_rider / n_c          (half the weight **and** half the static wind force when n_c = 2)
q₀    = §19.4's, whole          (its own weight and its own distributed wind, never divided)
```

No wake, no aerodynamic interaction. The sharing is **assumed**: not established by measurement,
not presented as conservative (§8.1's field trial already saw the lower line carry more than half).
The existing « one member carries all » case is kept separately: the same member under the whole
`P_rider`, tensions only, never read by the Verdict. A non-symmetric case is never disguised as
50/50. The tension de pose is per member (§19.7).

### 19.7 Installation and the five tightness drivers

**One installation, one wind** (#127 §2, brief « Installation et cinq pilotes »). The line is
posed without the rider under the Scenario's wind, then locked: no slipping, no force regulation.
A driver resolves the unstretched length `L₀` **once, under that wind**; that `L₀` is kept for
every loaded equilibrium (§19.12) and every view. Changing the wind describes a new installation:
with any driver but `L₀`, `L₀` is resolved afresh. `L₀` and a tension are never imposed together.
Each driver below is read on the **unloaded** spatial line under the Scenario's wind, at the
**tensioning anchor** `K ∈ {A, B}` (§7, #85) where an anchor is involved:

| Driver | Quantity held at the target | Without wind |
| --- | --- | --- |
| Longueur non tendue | `L₀` itself — the fixed input | §7 mode 1 |
| Tension de pose | `T_K = \|F(0)\|` (K = A) or `\|F(L₀)\|` (K = B): the total tension a dynamometer reads, **per carrying member** | §7's anchor target |
| Tension horizontale `H` | `H_K = F_x(0)` (K = A) or `F_x(L₀)` (K = B): the component **along the horizontal A–B axis** (#127 Q31) | §7's `H_target` |
| Flèche à vide | `D = max over the line of (h·x/L − z)`, the greatest **vertical** drop below A–B, never negative (#127 Q30) | §7's `D_target` |
| Rapport V | `P/H` with §19's `H_K` — mapped to an `H` target outside the engine, the current sharing convention unchanged (#127 Q32) | today's mapping |

- `H_K` is **not** the horizontal norm `√(F_x² + F_y²)` and not the total tension; it is not
  constant along a line under a horizontal distributed load and nothing assumes it is. Both
  readings are positive on a usual line whichever side is tensioned: at A the line pulls A toward
  B (`F_x(0) > 0`), at B it pulls B toward A (reaction `−F(L₀)`, so `F_x(L₀) > 0`).
- The flèche ignores `y`. The lateral reading is separate (§19.11): the greatest `|y|`, signed,
  and the **écart maximal à A–B**, `max over x of √((h·x/L − z)² + y²)`, combined at each abscissa
  then maximised (#127 Q10, Q30) — never two maxima taken at different abscissae combined.
- A **lifted** line (drop ≤ 0 everywhere, possible under a drag with an upward component) reads
  `D = 0` and reports its rise above A–B beside it. `D = 0` means « no downward drop », not « the
  line lies on A–B ».
- The tension de pose read back is shown whatever the driver (#127 Q33's withdrawal: the user
  wants to know how to tension, not to know `L₀`). The `L₀` driver remains available and is never
  imposed as a fallback.

The inversion method and its uniqueness checks are §19.10.

### 19.8 Numerical method

**Choice: shooting from A on the anchor force.** The unknown is `F_A = F(0) ∈ ℝ³`. §19.3's
system is integrated from `r(0) = A` to `S = L₀`; the residual is the anchor closure
`R(F_A) = r(L₀) − B`, in metres — §5.3's quantity in three dimensions. Why this method:

- the load depends on the unknown tangent (§19.4) and, under §8.4's profile, on the unknown `x`:
  the frozen-load reduction to rotated plane catenaries is exact only for a prescribed constant
  load vector (`agent-readiness-solver.md` §4.1) and would need an outer load iteration whose
  converged residual must be checked by integration anyway;
- three unknowns whatever the number of pieces, the trolley's jump applied in passing;
- the readiness study's option 1 for tangent-dependent loads (`agent-readiness-solver.md` §4.2),
  and the method the #134 prototype ran on its matrix without a failure on representative cases.

**Integration.** Classical fourth-order Runge–Kutta in `S`, fixed step. The line is cut at the
rider's node into pieces; each piece of unstretched length `ℓ_i` receives
`N_i = max(2, 2·round(N·ℓ_i/(2·L₀)))` equal steps — even, so Simpson's rule applies to the
controls — with **`N = 240`** by default (§19.9). At the node the jump `F⁺ = F⁻ − P_ext(x_D)` is
applied, with `x_D = x(S_P)` the integrated abscissa of the node: the rider's wind is read where
the trolley actually is. The wind is evaluated at the `x` of every RK4 stage.

A trial shot is **refused, never clamped** (the line search then shortens the step) when:

- `T` falls below `0.01·|w|` newtons at any stage — the number of §4.3's slack floor
  (`SOLVER.slackStiffnessFactor`), now on the tension magnitude; no new coefficient;
- a value is not finite;
- under an applied wind, a stage's `x` leaves `[0, L]`, where §8.4's field has no value: the engine
  does not extrapolate it.

**Trials past the span** (an implementation rule, #127 Step A). The third refusal above applies
to the line an attempt **ends** on, not to its trials. A Newton trial may visit an `F_A` whose
line runs past B (a slack line under a wind along A → B) while the converged line does not;
refusing that trial starved the line search, which could not cross `x = L`. So, during a trial
only, a stage whose `x` lies outside `[0, L]` reads the field at the nearest anchor and the shot
records the abscissa. A stage within `m = 10·tol(L)` of an anchor (`SHOT.domainMargin`) is that
anchor within the last RK4 stage's rounding and records nothing. The line an attempt ends on is
shot again and checked: if it recorded an abscissa it is **not accepted**, and the next seed runs;
when every attempt ends so, the result is `outside-model` (§19.11). No reported equilibrium reads
the wind outside the span; the anchor's value only lets the search pass through.

**Newton's method.** `R(F_A) = 0` by damped Newton:

- **Jacobian** `J = ∂R/∂F_A` by central finite differences, step `δ = 10⁻⁶·max(|F_A|, 1 N)` per
  component (a relative step near `ε_machine^(1/3)`, which balances the `O(δ²)` truncation and the
  `O(ε/δ)` round-off of a central difference). Between two such evaluations, Broyden's rank-one
  update of the last accepted `J`; a full finite-difference `J` is recomputed at the start of each
  attempt and whenever a Broyden direction fails §5.1's line search. Along a sweep, the previous
  position's last `J` is the next position's first. 3×3 linear solve with partial pivoting; a
  singular `J` ends the attempt.
- **Line search** §5.1: the step is halved until `‖R‖` decreases, at most 20 halvings
  (`SOLVER.maxHalvings`); a refused shot counts as no decrease.
- **Stop**: `‖R‖ ≤ tol(L)` (§19.9) accepts; at most 100 iterations per attempt and 5 attempts
  (`SOLVER`'s values, unchanged).
- **Seeds, in order** (continuation, then §5.2): (1) the caller's warm start — the previous sweep
  position, or the nearest length already solved by the pose inversion; (2) the plane solution of
  the same span under the weight alone and the vertical part of `P_ext`, `F_A = (H, 0, V₀)`, exact
  without wind; (3) that seed with the lateral component `F_y = (∫ p_y dS + P_ext,y)/2` estimated
  on the straight chord — the symmetric share of the lateral load; (4)–(5) §5.2's parabolic and
  Peyrot–Goulois seeds lifted as `(H, 0, V₀)`. A seed that fails costs one attempt; it never
  becomes an answer.

**The plane case is the closed form.** When the aerodynamic load is identically nil — no wind
applied (speed 0, or no bearing because a Position is missing) — `q₀ = (0, 0, −w)` and `P_ext` is
vertical: §19.3 reduces exactly to §4.1 and §6.1, whose closed form **is** the solution. The engine
then evaluates §4–§7 as today and reports it in §19.11's spatial result with `y ≡ 0`. This is not
a fallback: a calculation under wind that fails is never answered by the closed form (Q24, §19.11).

**Sampling is a function, not a stored polyline** (§2 of `src/lib/sim/types.ts`). A state stores
`F_A` and its inputs; sampling the line re-runs the **same** deterministic shot (same `N`, same
pieces), so the sampled nodes are bit-identical to the accepted solve. Between two nodes, a reading
uses the cubic Hermite interpolant on `r` and `dr/dS = λ·t`, both known at the nodes — of the
integrator's own order. Extrema (flèche, rise, lateral offset, écart, garde) are read on that
interpolant; at the rider's node, a corner, on the node itself.

### 19.9 Tolerances and resolution

Fixed here, before any result is interpreted (#127 brief, acceptance « tolérances »):

| Quantity | Bar | Why |
| --- | --- | --- |
| anchor closure `‖r(L₀) − B‖` | `tol(L) = 10⁻⁶ m` up to 1000 m of span, `10⁻⁶·L` beyond (`residualTolerance`) | §5.3's, extended to the 3-D norm; MoorPy's default |
| closure of the pose inversion's inner solves | polished to `10⁻³·tol(L)` when Newton still decreases `‖R‖`, accepted at `tol(L)` | a length error `ε` reads `≈ EA·ε/L₀` in tension (§5.3): at `tol(L)` the driver would carry `≈ 0.05 N` of noise on a 150 m steel line, enough to fake a reversal (§19.10) |
| refinement: `N` against `2N`, every length reported | `10⁻⁵ m`, ×`L/1000` beyond 1000 m | RK4 is of order 4, so the gap is 15/16 of the coarse error; a hundredth of a millimetre, two orders under the display's centimetre — §18.6's bar |
| refinement: every force reported (each reaction as the norm of its vector gap) | `max(10⁻⁴ N, 10⁻⁹·T_max)` | §18.6's absolute bar, with a relative floor for long, heavily tensioned lines |
| return to the plane engine, shot without wind against §4–§6 | `4×10⁻⁶` relative on the solved scalars | the solved-scalar tier of `docs/conventions/testing.md` |
| global force balance, rider jump (controls, §19.17) | `10⁻⁶ N` | §18.6's; Simpson re-integration of `q₀` on the shot's nodes |
| moment balance about A | `10⁻⁶ N·m` per metre of chord | §18.6's |
| node continuity | `10⁻⁹ m` | the node is shared |

**Resolution `N = 240`** is the default because §18's prototype met the refinement bars with it on
spans of 50–435 m, and because the sweep already counts 240 steps (§6.2): the same order of
cost per line. It is **held** only while the refinement bars pass on §19.17's matrix, which
includes the longest bench span (1500 m); if a cell fails, `N` is raised and the bar is kept —
never the reverse. A bar loose enough to make a varying result look flat is forbidden (#127,
acceptance « ne pas masquer bruit de raffinement »). These are numerical bars; no product accuracy
follows from them.

**Cost.** One loaded position costs a few shots of `N` RK4 steps (warm start, Broyden). The cost
of a representative windy sweep is measured on the bench cells and recorded with its resolution in
`docs/performance/spatial-sweep.md`; the wind-free cells keep §5's closed form and their existing
budget. Nothing is solved on a cursor move: the rider's position under wind is an index into the
sweep (§19.12).

### 19.10 Inverting the drivers, and uniqueness

`L₀` is resolved from a target by §7's structure, every evaluation a spatial solve of the unloaded
line under the Scenario's wind:

1. **Floor.** §5.4's chord bound `L₀ > chord/(1 + strength/EA)` is geometric and does not depend on
   the wind. The driver is read at the floor; a target beyond that reading is `invalid-input` in
   the driving field, with **the spatial reading at the floor** as its bound — it changes with the
   wind, and no wind-free bound is reused.
2. **Seed and bracket.** The seed is the plane engine's `L₀` for the same target without wind
   (§7). The bracket grows by doubling the slack from there, as `bracketL0` does, each solve warm
   from the nearest solved length (continuation).
3. **Root.** Illinois false position, safeguarded by bisection, to a relative bracket of
   `10⁻¹⁰` on `L₀` — with §19.9's polished inner solves, the driver's numerical noise is then far
   under the bracket's effect.
4. **The tension de pose is not monotone.** As in §7, `T_K(L₀)` falls from the floor, bottoms out on
   a very slack line and rises again: the search stays on the **taut branch**, from the floor to
   the minimum located by golden section once a doubled slack reads higher than the step before;
   a target under the minimum is unreachable (`no-convergence`, « Cible inatteignable »).

**Uniqueness is checked, not assumed** (#127 Q33's clarification; the brief's acceptance on the
five drivers). The monotonicity of `H` in `L₀` is proven only for vertical loads (§7) and is not
extrapolated:

- **At run time**, every driver reading taken while bracketing must move in the driver's expected
  direction — `H_K` falling, `D` rising, `T_K` falling on the taut branch — beyond the driver's
  noise band (`EA·10⁻³·tol(L)/L₀` for a tension, `10⁻⁵ m` for the flèche). A reversal outside that
  band is **never resolved by picking a root**: the result is `no-convergence` with the diagnostic
  « driver not monotone » (§19.11), and Q24 applies.
- **In the tests**, the driver is scanned densely over `L₀` from the floor to `1.10·chord` on the
  matrix of §19.17 — steel and textile, level and inclined, wind along, across and oblique, at
  several speeds — and asserted monotone beyond its noise band; every target is round-tripped
  direct → inverse. The `1.10·chord` window is a **test window, not an installation limit**: the
  run-time inversion has no cap (no 10 % rule was adopted). A local round trip proves no global
  uniqueness, and §18's prototype counters (`crossings`, `secondCrossing`) are not used as root
  counts (`docs/references/spatial-wind/inversion-followup.md`). If a real reversal shows up in the
  domain of use, it is reported to the maintainer, not arbitrated in code.
- **Three situations kept apart** (brief, acceptance on the drivers): `H` against the total tension
  (two drivers, two readings, never substituted); a flèche of zero on a lifted line against a
  target of zero (`D = 0` is a floor of the reading, §19.7); an ill-conditioned rapport V — a
  very small `H` target, where `L₀` moves much for little `H` — against an absent equilibrium. An
  inner solve that fails is an absent equilibrium (its own error); a bracket that cannot shrink the
  driver gap below the noise band is « unresolved », reported as such, never as flat.

### 19.11 Result contract and unavailability

**A spatial state** (`SpatialState`, one equilibrium) holds scalars and its echoed inputs, so that
§19.8's sampling runs on the state alone:

- the method: `closed-form` (§19.8's plane case) or `shooting`;
- `L, h, L₀, w, EA`, the load (wind field, bearing, `ρ`, `d`, `C_D⊥`), the rider's `S_P`, `P_ext`
  and the ellipsoid's semi-axes when loaded;
- `F_A = F(0)` and `F_B = F(L₀)`; the reactions `F_A` on A and `−F_B` on B (N, three components);
- `T_A = |F_A|`, `T_B = |F_B|`, `T_max` the greatest `|F|` over the nodes, both sides of the rider
  included; `H_A = F_x(0)`, `H_B = F_x(L₀)`;
- when loaded, the trolley node `r_D = (x_D, y_D, z_D)` and the two tensions `T⁻`, `T⁺` at it;
- the closure reached and the iteration count.

Sampling returns, per node, `S, x, y, z, T` (the rider's node twice, `S_P⁻` and `S_P⁺`). The
unloaded line's readings: the flèche `D` and its `x`, the rise above A–B, the signed lateral
offset of greatest `|y|` and its `x`, the écart maximal à A–B and its `x` (§19.7).

**Status.** A solve returns either a state or a failure, as a value (`SolveResult`), never a throw
mid-sweep. Two classes of failure, which the interface keeps distinct (#127 Q24):

| Class | Kind | When | What it says |
| --- | --- | --- | --- |
| **incompatible configuration** | `invalid-input` | a non-finite or out-of-domain input, `L₀` under the floor, a target beyond the floor's reading, a textile `d` missing under wind | the configuration is outside what the model accepts, with the field and its bound |
| | `outside-model` | the converged line, or every attempt, needs §8.4's wind outside `[0, L]` | the line leaves the span where the field is defined; the model does not extrapolate it |
| **not converged** | `no-convergence` | attempts exhausted (closure reached, iterations, seeds), a driver not monotone, a target unreachable on the taut branch | the calculation did not converge **at this position**; it proves no physical impossibility |
| | `slack-limit` | every attempt ends refusing on §19.8's tension floor | the line is too slack for the solver |

No failure is replaced by an invented shape, an interpolation, a neighbouring position, or the
plane model (Q24). A failed pose produces no `L₀`, hence no sweep and no descent — today's rule.

**Projections, for the views** (#118). Every view projects the same coordinates and recomputes
neither a force nor a shape: the coupe reads `(x, z)`, the vue de dessus `(x, y)`, the 3-D view
places `(x, y, z)` on the earth by the A → B bearing — `x` along it, `y` to its left, `z` above
anchor A's altitude — without geodesic interpolation between mechanical nodes. Node order is kept,
including stretches where `x` decreases. Four traces, each with its own availability: the unloaded
line, the loaded line at the chosen position (holding its trolley node), the trajectory (§19.12)
and the straight A–B reference, which no calculation moves. The qualitative Banane is not a
projection and does not survive the spatial results (#118).

One projector serves the vue de dessus and the 3-D view (`earthFrame`, `src/lib/map/vue-3d.ts`):
`x / L` of the way from Position A to Position B, `y` metres to the left of A → B square to it on
the local plane, so `y = 0` is the straight line between the Positions. The vue de dessus draws the
traces only where the line stands on the earth — both Positions and the profil between them, the
3-D view's own condition — since on any other two points `x` and `y` would not be the line's; its
plain drawing scales `y` by the drawn length of A–B over `L`. The loaded line carries the trolley's
node among its vertices in both methods: §19.8's nodes hold it, and §4.1's even samples get it
inserted.

### 19.12 Sweep contract

- The grid is §6.2's `sweepGrid` in `S_D`, unchanged (260 positions by default), on the `L₀` the
  pose resolved under the Scenario's wind.
- The march runs from A to B, each position warm-started from the last solved one (§19.8 seed 1).
  A position that fails is retried once at the end of the march warm-started from the next solved
  position (reverse continuation) — a full solve to the same bars, not an interpolation.
- The warm start of a position is the secant extrapolation of the two previous solved `F_A` in
  `S_D` (the previous one alone at the start of a run) and the previous position's last Jacobian.
  A seed is a guess, never an answer: the position is solved to `tol(L)`.
- Sweep positions are accepted at `tol(L)`; the polished closure of §19.9 is the pose inversion's
  alone, where a driver is differenced across lengths.
- The result keeps **one slot per grid position, in grid order, holes included**: a solved slot
  holds the position's state scalars (`S_D`, `r_D`, `F_A`, `T_A`, `T_B`, `T_max`, `T⁻`, `T⁺`,
  `H_A`, `H_B`); a failed slot holds its failure (§19.11). Nothing is compacted
  (brief, « sans compacter les trous »).
- `coverage = solved slots / grid length`.
- The **trajectory** — the lieu du chariot — is the sequence of solved `r_D` in grid order, split
  into runs at every hole; no segment bridges a hole. It is the locus of successive trolley
  positions, **not** the shape of one loaded line (#127 §1, #118).
- Under wind, the rider's chosen position is a **slot of the sweep**: moving the cursor selects a
  slot and samples its stored state (§19.8), it solves nothing. A hole selected shows no loaded
  line (§19.11, Q24). Without wind the closed-form placement of §6.1 is unchanged.

### 19.13 Clearance on the extruded terrain

**Terrain** (#127 §5 and #118, Q16): the mechanical ground is §11's profile under A–B extruded
sideways, `z_terrain(x, y) = z_profil(x)` — no cross-slope, not moved with the line. It is a
**hypothesis**, not a measurement of the ground actually overflown; the 3-D relief drawn behind
the scene is not the mechanical ground.

§11's definitions are kept, with the spatial nodes:

```
h_clear(S; S_D) = z(S; S_D) − z_profil(x(S; S_D)) − h_rider
h_min = min over solved S_D of  min over S of  h_clear(S; S_D)
```

read on the loaded line's nodes and its Hermite interpolant (§19.8), including at every terrain
vertex `x_k` the line passes over. The rider's own garde is `z_D − z_profil(x_D) − h_rider`, at
the displaced trolley, with the **whole gabarit** subtracted vertically (Q40: the ellipsoid lies
within it). Rider Contact and Cable Contact keep §11's meaning. §11's Zones d'ancrage apply to
`x(S)` and to `x_D`; since `x(S)` need not be monotone under wind, an edge `x = z` or `x = L − z`
is evaluated at **every** crossing found between two nodes, not at the first. This is a vertical
clearance on an extruded profile: no garde guaranteed on a side slope, no minimum distance to 3-D
obstacles (#118).

With holes, the minimum is over the solved positions only and is **not** established over the
traverse (§19.14).

### 19.14 Verdict

The Verdict's rules, safety factors, DAF and departure majoration are **unchanged** (#127 brief,
acceptance « aucun changement implicite »). It reads the spatial tensions — `T_A`, `T_B`, `T_max`
per solved slot, and the unloaded `T_A`, `T_B` under wind as `T_vide` — and §19.13's garde.
**A sweep with `coverage < 1` makes the Verdict indéterminé** (Q24): the maximal tension and the
minimal garde are not established over the whole traverse. The solved positions stay readable.
The words say that the calculation did not converge at those positions, never that the case
cannot exist or is physically impossible.

### 19.15 Descent on the trolley's locus

§12.2's ride runs on the spatial locus (#127 brief « Descente et terrain »): the polyline A, the
solved `r_D` in grid order, B; it requires `coverage = 1` — **no descent across a hole** (Q24). On
each segment, `t` is the unit tangent of the locus, and along it:

```
m·dv/dt = −m·g·t_z − F_friction − F_drag,t
v_rel,t = v − u(x)·t
F_drag,t = ½·ρ·C_dA·v_rel,t·|v_rel,t|
```

- `u(x)` is §19.2's wind **read at the rider's current `x`** by `windAt`, not once per ride;
  `t_z < 0` downhill. On a locus in the vertical plane (`t_y = 0`) this is §12.2's
  `v_rel = v − u_∥·cos θ` exactly; with `t_y ≠ 0` the crosswind enters:
  `v_rel,t − (v − u_x·t_x) = −u_y·t_y`. The « along = 0 hence calm » shortcut no longer holds.
- `C_dA`, friction laws and their constants are §12.2's, unchanged — not the static ellipsoid's
  `C_D`, not an isotropic `|u_rel|` law, no centrifugal term (#127 Q12). The steel law's normal
  force is `N = m·g·√(t_x² + t_y²)`, §12.2's `m·g·cos θ` for the locus's inclination to the
  horizontal.
- §12.1's `v/c` reads `T = |F|` at the node (the upstream side), which is `H/cos θ` without wind.
- The comparison « sans vent » is the same Scenario with its wind set to zero — pose, sweep and ride
  — not the windy locus ridden in still air.

**Energy limitation** (#127 §1). The ride runs on a locus frozen from successive static
equilibria. It does not account for the gravitational and elastic exchanges with the deformable
line; the reduction that would (`docs/references/spatial-wind/quasi-static-energy-review.md`) is
valid only on the sweep's own equilibria and is **not** added to the equation — no silent
correction. On a frozen locus without friction or drag the integrator conserves `½mv² + mgz`
(§19.17). The descent stays an estimation (§12.2); no dynamic peak and no newly validated `v/c`
threshold follow from it (#124 deferred).

### 19.16 Return to the plane engine without wind

Without wind applied — speed 0, or no bearing — every result is §4–§7, §11 and §12.2's, **bit for
bit**: the closed form is evaluated (§19.8), `y ≡ 0`, `H_A = H_B = H`, `T_K` is §7's anchor
tension, `D` is `unloadedSag`, the locus is §6.2's, the ride §12.2's with `u = 0`. §15's fixtures
and the `[MEASURED]` app fixtures therefore hold unchanged. The shooting integrator, forced on the
same cases with a nil wind, must agree with them within §19.9's solved-scalar tier: that is the
check that §19.8's resolution is sufficient, not a second definition.

### 19.17 Controls — oracles that do not come from the code under test

Each control's expected value comes from a closed form, a §15 fixture or an invariant
(`docs/conventions/testing.md`):

1. **No-wind return**: shooting with a nil wind against F1, Z1–Z5 at `4×10⁻⁶` relative; the plane
   path against §15 bit for bit.
2. **Inextensible limit**: `EA → 10¹⁴` against `y = C·cosh(x/C)` in the plane of a constant load,
   7 significant figures as §15.
3. **Uniform load vector**: §15's Z1 (`w = 5`) with its load split into a vertical `w = 3` and a
   constant lateral `p_y = 4` per unstretched metre, no aerodynamics (§18.6 control 6): the line
   is Z1's catenary tilted by `atan(p_y/w)` about A–B — Z1's `T_A`, `T_max`, a flèche `0.6` and a
   lateral offset `0.8` of Z1's sag, signed toward `+y`.
4. **Weightless crossflow** (normal drag alone, level span, pure crosswind): `T` constant and, with
   `p = ½·ρ·C_D⊥·d·U²`, `Σ = (1 + T/EA)·L₀`: `L = (2T/p)·asinh(p·Σ/(2T))`, lateral offset
   `(T/p)·(√(1 + (p·Σ/(2T))²) − 1)`, at `10⁻⁸` relative.
5. **Balances**: global force and moment balance, rider jump, node continuity at §19.9's bars, on
   loaded inclined cases under oblique wind and a non-uniform profile.
6. **Mirror**: `u_y → −u_y` gives `y → −y`, the same tensions, flèche and garde.
7. **Two members**: the shared calculation equals a single member under `P_rider/2` with its whole
   `q₀`; the « one carries all » case equals a single member under `P_rider`.
8. **Rider area**: §19.5's face, side and 45° areas computed by hand; doubled `h_rider` ×4; nil wind
   gives a nil force; a wind nearly along the line gives a force nearly along `x`.
9. **Refinement**: `N` against `2N` on the bench cells under wind, §19.9's bars.
10. **Drivers**: direct → inverse round trips on all five, the monotone scans of §19.10, `H_K`
    distinct from `T_K` under crosswind, a lifted line reading `D = 0`.
11. **Profile consumed**: a non-uniform profile gives a different line from the uniform wind of the
    same mid-span speed, and the same line as a uniform wind when `a = 0`.
12. **Descent**: on a vertical-plane locus §12.2 and Z8 are retrieved; with `t_y ≠ 0`,
    `v_rel,t − (v − u_x·t_x) = −u_y·t_y`; without friction and drag `½mv² + mgz` is conserved.
13. **Unavailability**: an injected non-convergence leaves a hole, `coverage < 1`, an indéterminé
    Verdict and no ride; a textile line without `d` under wind is unavailable on `d`.

Rare failure kinds are injected (`vi.mock`), not hunted, as `solve.test.ts` does.

### 19.18 Limits

- A quasi-static succession of equilibria: no vibration, gust, galloping, rider sway or dynamic
  tension (#124).
- Normal drag alone on the line; lift and axial drag omitted by decision (§19.1, §18).
- Three adopted conventions (`C_D⊥ = 1.2` twice, `C_D = 1.0`, the ellipsoid of §19.5): reproducible,
  not measured, not conservative.
- Constant `EA`, constant diameter.
- Two members share the rider's load 50/50 by assumption, without wake.
- Extruded terrain: vertical garde only; no off-axis survey, no 3-D obstacle distance.
- One-way descent on a frozen locus, energy exchanges with the line not accounted.
- Numerical agreement with closed forms and §15 is a validation of the scheme, not an experimental
  validation; the results are **not** presented as reliable for sizing beyond what §10's existing
  framework already says.
