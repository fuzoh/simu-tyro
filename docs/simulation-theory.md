# Zip-line simulation — consolidated theory & algorithm reference

**Status.** Definitive theory file for the Scoutech physics engine. Consolidates the four
French reference reports and the two deep-research runs, arbitrates their contradictions,
and records only values whose provenance is known. No app code exists yet; this file is
the contract the implementation must satisfy.

**Scope.** Spans 50 m – ~2000 m, two families at parity:

- **Family A — steel wire rope**, permanent installations (EN 15567 framework).
- **Family B — textile rope**, temporary installations (scouting, caving/mountain-rescue
  highlines, EN 1891 + rescue doctrine).

A and B are **separate physical models**. They must not share a code path unchecked
(`docs/conventions/simulation.md`).

---

## 0. How to read this file — sources and trust levels

### 0.1 Source keys

| Key | Document |
| --- | --- |
| `[R1 …]` | `docs/references/research-one.md` (deep-research run 1, C/B numbering) |
| `[R2 …]` | `docs/references/research-two.md` (deep-research run 2, C/B numbering) |
| `[ALGO §n]` | `docs/references/algo simulation tyrolienne.md` |
| `[SIM]` | `docs/references/simulation tyrolienne.md` (prose blob — cite by quoted phrase, find with `rg`) |
| `[CABLE]` | `docs/references/tyrolienne sur cable.md` (idem) |
| `[CORDE]` | `docs/references/tyrolienne sur corde.md` (idem) |
| `[PROMPT]` | `docs/references/deep-research-prompt.md` (gap analysis, C1–C11 / B1–B16 definitions) |

### 0.2 Trust tags

Every number below carries one of:

| Tag | Meaning |
| --- | --- |
| `[VERIFIED-NUM]` | Recomputed in this consolidation (2026-08-05) with an independent solver, cross-validated against **MoorPy 1.3.0** (`moorpy.Catenary.catenary`, NREL). Agreement ≥ 6 significant figures. See §15. |
| `[STD-ATTESTED]` | Standard clause text quoted/attested through open secondary sources; standard itself may be paywalled. |
| `[FIELD:SSF]` | Instrumented field measurement, Spéléo Secours Français (Vercors 2008 campaign, 1109 m line), quoted verbatim in [R2]. Highest-confidence empirical constants in this file. |
| `[DATASHEET]` | Manufacturer CE/product data (traceable product + document named). |
| `[REGULATOR]` | Open regulator guidance (WorkSafe Queensland 2019), quoted verbatim in [R2]. |
| `[CONVENTION]` | Industry practice; no primary text found. Configurable, never hard-coded as regulatory. |
| `[UNVERIFIED:R1]` | Asserted only by research-one with exact-looking clause numbers/values that research-two explicitly reports as *paywalled / not found*, or that failed numeric recomputation. **Do not ship as a default without independent confirmation.** R1 demonstrably fabricated fixtures (§14), so its uncorroborated precision is treated as plausible filling. |
| `[PAYWALLED]` | Value lives in a paid standard; buy-to-confirm. Listed in §16. |

**Binding rule** (`docs/conventions/simulation.md`): coefficients tagged `[PAYWALLED]`,
`[CONVENTION]` or `[UNVERIFIED:R1]` may appear in the UI as *labelled, configurable
defaults with warnings* — never as silent constants, and never presented as normative.

---

## 1. Vocabulary — ubiquitous language (FR ↔ EN)

One vocabulary for code, docs and UI. French terms appear in the reference reports;
English identifiers are canonical for code.

| FR (reports) | EN (canonical) | Symbol | SI unit |
| --- | --- | --- | --- |
| tyrolienne | zip line | — | — |
| portée | span (horizontal) | `L` | m |
| dénivelé | elevation difference (B relative to A) | `h` | m |
| corde (chord) | chord | `√(L²+h²)` | m |
| flèche | sag (max depth below chord) | `D` | m |
| garde au sol | ground clearance | `h_clear` | m |
| longueur non tendue | unstretched length (state variable) | `L₀` | m |
| longueur tendue | stretched arc length | `S`, coordinate `σ` | m |
| abscisse matérielle | unstretched material coordinate | `s ∈ [0, L₀]` | m |
| prétension | pretension (installed tension, no rider) | `H` or `T` | N |
| tension horizontale | horizontal tension component | `H` | N |
| poids linéique | weight per unit unstretched length | `w = μ·g` | N/m |
| masse linéique | mass per unit length | `μ` | kg/m |
| raideur axiale | axial stiffness | `EA` | N |
| charge de rupture (CMU/MBR) | minimum breaking force/load | `MBF` (steel) / `MBL` (textile) | N |
| coefficient de sécurité | safety factor | `k`, `FS` | — |
| rendement de terminaison | termination efficiency | `η_t` | — |
| coefficient d'amplification dynamique | dynamic amplification factor | `DAF` | — |
| ancrage / amarrage | anchor / rigging attachment | — | — |
| chariot / poulie | trolley / pulley (sheave) | — | — |
| fluage | creep | `ΔL₀(t)` | m |
| allongement de construction | construction stretch / bedding-in | — | — |
| âme (métallique) | (steel) core — IWRC vs fibre core FC | — | — |
| toron | strand | — | — |
| chaînette (élastique) | (elastic) catenary | — | — |

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
(V₀ at the *lower*/left end), while the elastic term `(V₀/w − s/2)` belongs to Irvine's
original convention `V(s) = V₀ − w·s` (V₀ at the *top*). The internally consistent form
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
| --- | --- | --- | --- |
| 1.0 % | −0.013 % | −0.000 % | −0.000 % |
| 3.0 % | −0.120 % | −0.003 % | −0.000 % |
| 5.0 % | −0.330 % | −0.025 % | −0.001 % |
| 8.0 % | −0.835 % | −0.155 % | −0.008 % |
| 10.0 % | −1.289 % | −0.356 % | −0.020 % |
| 12.5 % | −1.978 % | −0.791 % | −0.046 % |

Negative = parabola *underestimates* (true catenary hangs lower — confirmed [R2 C10],
Southwire *Overhead Conductor Manual* basis). [R1 C10]'s table matches these values;
[R2 C10]'s larger figures (">5 % tension error at 10 %") did **not** reproduce under
this definition — likely a different comparison (see ledger §14). Since the parabola
under-predicts sag, using it for clearance is **non-conservative**.

**Engine rule:** parabola allowed only as solver seed and for `D/L ≤ 3 %` preliminary
displays; elastic catenary is authoritative everywhere. (Threshold from the table:
at 3 % all errors < 0.15 %.)

---

## 4. Core model — Irvine elastic catenary

Source: Irvine, *Cable Structures* (1981) via [ALGO §4], [PROMPT], [R1 B1], [R2 B1];
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
  this is an *error state* (clearance already violated), but the solver must not blow up:
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
*not* the geometric-vs-mechanical length mismatch: a length residual `ε` maps to a
tension error ≈ `EA·ε/L₀`, so length-based tolerances must scale with `EA` [R2 C8].
The `10⁻³ m` figure floating in the old reports is insufficient for long-span stiffness
convergence; both research runs agree on `10⁻⁶` [R1 C8, R2 C8].

### 5.4 Failure-mode diagnostics

| Symptom | Cause | Remedy |
| --- | --- | --- |
| Singular / ill-conditioned J | near-taut `H → ∞` | straight-bar fallback (§4.3) |
| `H → 0`, J singular | deep slack | stiffness floor, or report "line on ground" |
| Oscillating residual | Newton overshoot | damping `α ↓` (§5.1) |
| No convergence after retries | bad parameters (e.g. `L₀ < chord/(1+T_break/EA)`) | input validation, §7 brackets |

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
cable. Tension *magnitudes* on both sides of the node are generally unequal; the
tangential imbalance is precisely the force that accelerates the rider along the line
(§12). Do not impose `T₁ = T₂` at the node.

### 6.2 Sweep variable for the rolling rider (B3 resolved)

Both research runs agree [R1 B3, R2 B3], settling the handoff's biggest open question:

**Primary sweep variable = unstretched material coordinate `s_D` of the trolley contact
point.** The split `L₀₁ = s_D`, `L₀₂ = L₀ − s_D` is then fixed per step, and each sweep
step is a standard fixed-node solve (§6.1). The split is a *consequence* of trolley
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
3. **Target unloaded sag** `D_target`: seed `H ≈ wL²/(8D_target)` [ALGO §3], refine `H`
   against the exact catenary sag, then mode 2. (Loaded-sag targets: same loop around the
   §6.1 solve.)

Mutations of `L₀` over time — thermal (§9.1), construction stretch and creep (§9.2) —
enter as `ΔL₀` and re-solve. That is the payoff of the `L₀` parameterisation.

---

## 8. Loads, dynamic amplification, load cases

### 8.1 Rider design load (C3)

- `6.0 kN` is the **EN 355 fall-arrest maximum arrest force** — it bounds the arrest /
  energy-absorber subsystem, *not* zip-line traverse tension `[STD-ATTESTED via
  Bethancourt et al. 2020 + SATRA; R1 C3 and R2 C3 agree on scope]`.
- Per-user design mass/force in EN 15567-1: `[PAYWALLED]`. [R1 C3] asserts
  `m_p = 120 kg → P = 1.177 kN` (Clause 4.1.2) plus Eurocode-style partial factors
  `γ_G = 1.35, γ_Q = 1.50, γ_W = 1.50` — [R2 C3] reports these as *not found in primary
  text* ⇒ `[UNVERIFIED:R1]`. The legacy "0.8 kN conventional / 1.2 kN option" has no
  found provenance either [R2 C3].
- **Engine default:** rider mass a free input (default 120 kg, labelled "unconfirmed
  EN 15567 design mass — buy standard"), `P = m_p·g`. Simultaneity: single rider per
  span by default; multi-load solver exists (§6.1) for explicit multi-user scenarios.

### 8.2 Dynamic amplification factor (C7 resolved — two regimes)

| Regime | DAF | Source |
| --- | --- | --- |
| Controlled step-off traverse on a tensioned line | **≤ 1.2** ("surtension de 120 % maximum de la valeur de la charge appliquée") | `[FIELD:SSF]` verbatim [R2 C7] |
| Drop/shock entry, slack line, rescue-belay drop | up to **> 5×** static | BCCTR drop-test regime [R2 C7] |
| Intermediate (mid-span drop 1.6–2.2; impact braking 1.8–3.2) | interpolation | `[UNVERIFIED:R1 C7]` |

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
lateral blow-out are **out of scope for v1** (2-D vertical-plane model); record as open
question, not silently ignored (§16).

---

## 9. Time-dependent changes of state (all as `ΔL₀`)

### 9.1 Thermal (B9)

`ΔL₀ = L₀ · α · ΔT`, then re-solve (§7). Coefficients:

| Material | α (1/K) | Tag |
| --- | --- | --- |
| Galvanised steel wire rope | `+1.2×10⁻⁵` | [R1 B9]+[R2 B9] agree |
| Stainless wire rope | `+1.6×10⁻⁵` | [R2 B9] |
| HMPE (Dyneema) | `−1.2×10⁻⁵` (contracts on heating) | sign confirmed [R2 B9]; magnitude [R1 B9], `[UNVERIFIED:R1]` |
| Polyamide | positive, ~`+3×10⁻⁵` claimed | `[UNVERIFIED:R1]`; behaviour dominated by moisture/creep [R2 B9] |

Worked example `[VERIFIED-NUM]` (fixture Z7): 200 m level span, `w = 5 N/m`,
`EA = 10⁷ N`, `L₀ = 200.05 m`, `ΔT = +30 K`:
steel → `L₀ = 200.1220 m`, `H` 6717 → 5890 N, sag `D` 3.721 → 4.245 m (+0.524 m);
HMPE (α<0) → `L₀ = 199.9780 m`, `H` 6717 → **7850 N**, sag 3.721 → 3.184 m.
A hot day *tightens* an HMPE line — check the safety margin at `T_max`, not at install.
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

Selectable *regimes*, each labelled with provenance; no blending:

| Regime | Rule | Tag |
| --- | --- | --- |
| **EN 15567-1** (A, EU) | `k = 3.0` on component MBF vs max total line tension | `[STD-ATTESTED]` secondary (LEEA-057, AS 2316.2.1 MOD); clause text `[PAYWALLED]` [R2 C2] |
| **WorkSafe QLD 2019** (A, AUS) | `FS ≥ 5` on suspended load **and** `FS ≥ 3` on total combined cable tension, **plus 2× proof test** | `[REGULATOR]` verbatim [R2 C2]; also relayed [ALGO §Key-Findings-5] |
| **ACCT / challenge-course "10:1"** | 10:1 on participant-bearing lines | `[CONVENTION]` — not traceable to primary text [R2 C2]. ⚠ [R1 C2] instead claims ANSI/ACCT 03-2019 = **5:1** (Section F.2.4): conflict, both `[PAYWALLED]` — unresolved, see §14/§16 |
| **Rescue textile "10:1"** (B) | 10:1 static system practice; EN 1891 label "max recommended load = 1/10 nominal" | `[CONVENTION]` + label attestation [R2 §4]; NFPA attribution `[UNVERIFIED:R1]` |

Allowable tension: `T_allow = η_t · MBF / k` — termination efficiency multiplies MBF
before the factor [R1 C4; consistent with EN 13411 logic].

### 10.2 Termination efficiency `η_t` (C4)

| Termination | `η_t` | Tag |
| --- | --- | --- |
| Metal/resin socket (EN 13411-4) | **1.00** | `[STD-ATTESTED]` — standard's own scope text, quoted [R2 C4] |
| Ferrule / Flemish eye (EN 13411-3) | **0.90** (≥ 90 % MBF; fatigue ≥ 80 % after 75k cycles) | `[STD-ATTESTED]` clause 6.2 quoted [R2 C4]; "95 %" is vendor optimism |
| Spliced eye (EN 13411-2) | **0.80** | `[STD-ATTESTED]` [R2 C4] |
| U-bolt grips (EN 13411-5) / wedge socket (−6) | **0.80** | `[CONVENTION]` — clause text not accessed [R2 C4]; [R1 C4]'s clause cites `[UNVERIFIED:R1]`. ⚠ Grips "shall not be used where the rope supports persons" (WorkSafe QLD / AS 2076) `[REGULATOR]` — engine must warn |
| HMPE long-bury splice | **0.90** | `[DATASHEET/CONVENTION]` (Samson; CI 1500 per [R1]) |

### 10.3 Knot & splice efficiency, textile (B16)

| Termination | PA (EN 1891) | HMPE | Tag |
| --- | --- | --- | --- |
| Sewn/spliced eye | 0.90–0.95 | 0.90–0.95 (mandatory) | `[CONVENTION]` both runs |
| Figure-eight loop | **0.60–0.80** (R2: 60–70 %, R1: 75–80 % — unresolved range; default to the conservative 0.60) | 0.25–0.50 — **prohibited** (slips; "tied knots may severely reduce the breaking strength", Samson) | `[CONVENTION]`+`[DATASHEET]` [R2 B16, R1 B16] |
| Bowline | 0.55–0.70 | prohibited | `[CONVENTION]` |

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

`h_rider` default 2.1 m `[CONVENTION]` (§6.3). Normative EN 15567 free-space/fall-space
numbers, lateral wind corridor and design wind speed: `[PAYWALLED]` — [R1 B12]'s
"≥ 2.0 m, 1.0→1.5 m corridor at 28.3 m/s wind" are `[UNVERIFIED:R1]` (R2: *not found*).
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

Along the frozen trajectory `z_D(x_D)` with local slope `θ` [ALGO §10]:

```
m·dv/dt = m·g·sinθ − F_friction − F_drag ∓ F_brake
F_drag = ½·ρ·C_dA·(v ± v_wind)²
F_friction = F₀ + k_v·v          (trolley, see below)
F_c = m·v²/R,  R = (1+z'²)^{3/2}/|z''|   (usually < 2 % — include optionally [ALGO §10.4])
```

Constants:

- **`C_dA = 0.45 m²` default** (range 0.30–0.60 configurable) — SSF back-fit on the
  instrumented 1109 m line `[FIELD:SSF]` [R2 C6]. ⚠ [R1 C6]'s posture table (supine
  0.08–0.12 m²) **contradicts the SSF measurement for a supine caver** and is
  `[UNVERIFIED:R1]` (§14). Posture-dependence: keep as a configurable multiplier, not
  R1's numbers.
- **Trolley friction `F ≈ 15 N + 1.5·v`** (v in m/s) — SSF measured fit, Petzl Tandem
  Speed on textile `[FIELD:SSF]` [R2 B14]. Alternative constant-μ model
  `μ = μ₀·d/D + 2f/D ≈ 0.015–0.02` [ALGO §10.3] as fallback for steel; [R1 B14]'s
  per-product μ table is `[UNVERIFIED:R1]`. Steel-vs-textile and sheave-diameter
  dependence: not found [R2 B14] — open (§16).
- **Air density**: ISA model `ρ = p/(R_s·T)`,
  `p = 101325·(1 − 2.25577×10⁻⁵·h_alt)^5.2559 Pa`, `R_s = 287.05 J/(kg·K)`;
  ρ = 1.225 (sea level) / ≈1.06 (1500 m) / ≈0.96 kg/m³ (2500 m) [R1 §3, R2 §3 agree —
  standard atmosphere, safe to hard-code].

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
  `[UNVERIFIED:R1]`-plausible. The 2.5 g figure is *practice*, not normative [R2 B13;
  ALGO §10.5 says the same with the passenger-swing caveat].

Arrival-speed sanity fixture: fixture Z8 (§15) — terminal velocity on a 10° slope with
the SSF constants: `v_t = 19.845 m/s`.

---

## 13. Material data

Parameters in fixtures are illustrative and need no provenance; **shipped material
defaults do** — that is the boundary between test inputs and engineering data.

### 13.1 Family A — steel wire rope

- **MBF**: `MBF [kN] = K · d² · R₀ / 1000` (d in mm, grade R₀ in N/mm²) with EN 12385-4
  factors: 6×19 class `K = 0.330` (fibre core) / `0.356` (steel core); attested examples
  6 mm 6×19: 12.9 kN (1770 FC), 14.4 kN (1770 IWRC), 21.0 kN (1960 FC)
  `[STD-ATTESTED]` [R2 B15]. Full 10–20 mm tables: `[PAYWALLED]` — compute from K.
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
first loading) — never a fibre modulus (C5 resolved: 110 GPa is the *fibre* figure,
finished braid is far softer [R1 C5, R2 C5 agree]).

| Rope class | `k = EA/MBL` | Band / cycle | Tag |
| --- | --- | --- | --- |
| 12-strand HMPE (SK78, AmSteel-Blue) | **≈ 22 @ 10 % MBL, ≈ 31 @ 30 % MBL** (elongation 0.46/0.70/0.96 % at 10/20/30 % MBL) | spliced, bedded-in | `[DATASHEET]` Samson 872, arithmetic verified [R2 C5]. [R1]'s `k = 40 ± 5` ⇒ `[UNVERIFIED:R1]` |
| EN 1891 Type A polyamide 10.5–11 mm | **≈ 1.5** (EA ≈ 30–50 kN) at the CE band | 50→150 kg static (elongation 2.0–3.25 %) | `[DATASHEET]` CE data, arithmetic verified: 0.98 kN / 0.03 ≈ 33 kN [R2 C5]. ⚠ [R1]'s `EA = 18·MBL` (≈ 450 kN) contradicts its own 2.8–3 % elongation rows — refuted (§14) |
| Polyester semi-static | between the two (~1.5–3 % at working load) | — | `[DATASHEET]`-level only [R2 B11]; R1's `k = 25–35` `[UNVERIFIED:R1]` |

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

| # | Item | R1 | R2 | Ruling |
| --- | --- | --- | --- | --- |
| 1 | Irvine fixture z(L₀) (B1) | 24.84 m | — | **24.2392 m** `[VERIFIED-NUM]` (F1). R1's partials correct, its z wrong |
| 2 | Two-segment fixture (B2) | H = 4125 N, L₀₁ = 50.12 | — | **H = 7898.16 N, L₀₁ = 50.25** `[VERIFIED-NUM]` (Z4); R1 values violate its own equilibrium equation |
| 3 | Sweep fixture (B3) | x_D = 60.08, z_D = −4.120 | — | **x_D = 59.9578, z_D = −5.1906** `[VERIFIED-NUM]` (Z5) |
| 4 | Inverse-problem fixture + closed form (B5) | L₀ = 100.2; formula `L/(1+H/EA)·(1−…)` | bracket/monotonicity only | **L₀ = 100.6698** `[VERIFIED-NUM]` (Z6); R1 formula has inverted corrections |
| 5 | "pycatenary built-in fixture" (R1 §6) | H = 1289.4, D = 9.854 | — | **H = 1442.105, D = 8.7538** `[VERIFIED-NUM]` (Z2, MoorPy-confirmed). R1 fixture internally inconsistent |
| 6 | MoorPy fixture transcription (R2 B1/§6) | — | HF = 3.146×10⁵, VF = 5.237×10⁵ | **Refuted by running MoorPy 1.3.0**: fully-suspended solution is HF = 3.7838×10⁶, VF = 1.5263×10⁶ (CB=0 seabed variant 3.7499×10⁶). The quoted pair was evidently the example's warm-start *seed*. Rule: **never transcribe fixtures — regenerate them** |
| 7 | SSF validation table (R1 §6: Vercors/Millau/Saint-Martory with sag/tension/speed values) | full numeric rows | "SSF publishes method, not numeric tables online"; Vercors = 1109 m, pretension ≤ 220/145 daN, ~33 m/s | **R1 table treated as fabricated**: span 1122 vs documented 1109 m, pretension 8.5 kN vs SSF's verbatim ≤ 2.2 kN, arrival 22.4 vs ~33 m/s. **Do not use as regression data.** Real data: contact SSF/CVT (§16) |
| 8 | PA rope stiffness (C5) | `EA = 18·MBL` (~450 kN) | `EA ≈ 1.5·MBL` (~30–50 kN) | **R2** — 0.98 kN over 2–3 % ⇒ EA ≈ 33–49 kN; R1's value contradicts its own elongation rows by ×10 |
| 9 | Supine rider drag (C6) | C_dA = 0.08–0.12 m² | SSF measured 0.45 m² for supine caver | **R2/SSF** `[FIELD:SSF]`; R1's supine row incompatible with the only field measurement |
| 10 | ANSI/ACCT safety factor (C2) | 5:1 (Section F.2.4) | "10:1 is vendor convention; ACCT text not accessible" | **Unresolved — `[PAYWALLED]`**. Offer both, labelled unconfirmed |
| 11 | EN 15567 numbers (C1/C3/B12: 120 kg, γ-factors, 2.0 m clearance, wind corridor, clause 4.3.x) | asserted with clause numbers | "paywalled — not found in primary text" | **`[UNVERIFIED:R1]`** across the board; buy-to-confirm list §16 |
| 12 | Parabola error table (C10) | small errors (−0.33 % @5 %) | larger (">5 % tension @10 %") | **R1's table confirmed** by recomputation (§3.1) under the same-H definition; R2's tension figures didn't reproduce — flagged as different/unstated definition |
| 13 | Textile knot efficiency fig-8 PA (B16) | 75–80 % | 60–70 % | Unresolved range **0.60–0.80**; default conservative 0.60 |
| 14 | Wire-rope MBF/EA table (B15) | per-diameter table | K-factors only | **K-factors** `[STD-ATTESTED]`; R1 table inconsistent with them (MBF) and impossible (EA ⇒ E > steel) |
| 15 | R1 B11 cubic worked example | T(0.03) = 3.888 kN | — | Polynomial actually evaluates to **3.988 kN** — R1 mis-evaluates its own fit |
| 16 | Eddy-brake law (B13) | `F = c_eddy·v·R²`, worked example → 6.85 g | monotone-saturating, proprietary | **R2**; R1's example exceeds every deceleration limit it itself states |
| 17 | Petzl Trac Guide max speed | 60 km/h | 25 m/s (= 90 km/h) | `[DATASHEET]` conflict — re-pull datasheet before shipping |
| 18 | Tree-anchor stiffness (B6) | numeric ranges | "no universal value exists" | **R2**; R1 ranges = placeholders only |
| 19 | DAF default | 1.25 | 1.2 (SSF measured ceiling) | Default **1.2** `[FIELD:SSF]`, configurable; regimes §8.2 |
| 20 | Solver tolerance normalisation (C8) | `10⁻⁶` normalised by span | `10⁻⁶ m` absolute (MoorPy default) | Compatible: absolute ≤ 1000 m, scaled beyond (§5.3) |

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

| Out | Value |
| --- | --- |
| `x(L₀)` | **97.0329 m** |
| `z(L₀)` | **24.2392 m** (detects the §2.1 sign trap: mixed convention gives 24.2342; R1 claimed 24.84) |
| `∂x/∂H` | **1.16024×10⁻³ m/N** |
| `∂x/∂V₀ = ∂z/∂H` | **−4.55088×10⁻³ m/N** |
| `∂z/∂V₀` | **1.82564×10⁻² m/N** |

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

| Material (α) | `L₀'` | `H` | sag `D` |
| --- | --- | --- | --- |
| steel (+1.2×10⁻⁵) | 200.122 m | 6717.1 → 5889.8 N | 3.7211 → 4.2447 m |
| HMPE (−1.2×10⁻⁵) | 199.978 m | 6717.1 → **7849.6 N** | 3.7211 → 3.1835 m |

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
    view [§8.4].
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
