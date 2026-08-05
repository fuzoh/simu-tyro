# Zip-Line / Tyrolienne Physics Engine — Contradiction Arbitration, Missing Derivations, and Validation Data

**Bottom line:** The three "conflicting" sag figures are three different quantities (unloaded drape ≈5%, loaded floor ≈2%, loaded target ≈6–8%) and no zip-line standard makes any of them normative; the genuinely divergent items are the safety factors (framework-specific) and the dynamic-amplification numbers (which describe two different physical events). Build the engine on the MoorPy/FAST elastic-catenary solver with an analytic Jacobian and a 1×10⁻⁶ m displacement residual, treat EN 15567 (steel, A) and EN 1891 rescue doctrine (textile, B) as separate regimes, and hard-code the confirmed values below while flagging every paywalled clause as "buy to confirm."

This report separates steel wire rope permanent installations (**A**) from textile-rope temporary/rescue highlines (**B**) throughout, and labels each value by source type: harmonised standard / peer-reviewed paper / manufacturer datasheet / regulator guidance / forum-and-blog.

---

## TL;DR

- **The three sag figures are not a disagreement — they are unloaded-drape (≈5% of span, install heuristic), loaded floor (≈2%, to cap anchor tension) and loaded target (≈6–8%).** None is normative; all are heuristic. Treat as configurable defaults, never constants.
- **Textile rope above 50 m is admissible only outside the permanent-public-attraction class:** Spéléo Secours Français has fielded a single textile carrier rope over a 1109 m span (Vercors, 2008); permanent commercial zip lines are steel. The "prohibition" is a use-class + permanence boundary, not a universal physical ban.
- **The suspected formula error is real:** at a mid-span point load the correct maximum tension is √(H² + ((qL + P)/2)²) — the higher anchor carries V = qL/2 + P·(L−x_P)/L — not √(H² + ((qL + 2P)/2)²).

---

## Key Findings

1. **Sag (C1):** No EN/ACCT/ASTM clause fixes a sag ratio. Practice: ~5% unloaded drape, ~6–8% loaded target, ~2% loaded floor. Complementary quantities. *Confidence: high.*
2. **Safety factors (C2):** EN 15567-1 applies **k = 3.0** to component minimum breaking force (clause paywalled). WorkSafe Queensland (regulator, 2019) recommends **FS ≥ 5 on suspended load AND FS ≥ 3 on total combined cable tension, plus 2× proof test**. The **"10:1" is an ACCT/challenge-course/vendor convention**, not traceable to any steel-rope standard. *Confidence: medium-high.*
3. **Live load (C3):** The "6 kN max force to user" is the **EN 355 fall-arrest maximum arrest force**, not a traverse figure. EN 15567 per-user design mass and simultaneity are paywalled — **not found in primary text**. *Confidence: medium.*
4. **Termination efficiency (C4):** EN 13411 *does* state efficiencies per part: **socket (−4) = 100% (K_T=1.0), stated in the standard**; **ferrule/Flemish eye (−3) ≥ 90%**; **spliced eye (−2) ≥ 80%**. U-bolt/wedge 80% and Dyneema splice 90% are conventions. *Confidence: high for −2/−3/−4.*
5. **Textile stiffness (C5):** 110 GPa is a *fibre* modulus mis-applied to rope. Use **EA = k·MBL**. Samson AmSteel-Blue (12-strand SK-78): 0.46/0.70/0.96% at 10/20/30% break → secant EA ≈ 31·MBL at 30%. EN 1891 Type A polyamide: 2.0–3.25% at 50→150 kg. *Confidence: medium.*
6. **Drag area (C6):** SSF field-fitted **C_d·A = 0.45 m²** for a caver on the 1109 m Vercors line. Use as default; 0.30–0.60 m² as range. *Confidence: high.*
7. **Dynamic amplification (C7):** Two regimes. Controlled well-tensioned traverse: **DAF ≈ 1.2** (SSF field measurement). Slack line / drop entry / shock: **>5×** (BCCTR rescue-belay drop regime). *Confidence: high.*
8. **Solver tolerance (C8):** Use the **absolute anchor-position displacement residual ‖[Δx, Δz]‖ ≤ 1×10⁻⁶ m** (MoorPy default), not a length mismatch. *Confidence: high.*
9. **Textile > 50 m (C9):** Use-class boundary, not a ban. *Confidence: high.*
10. **Parabola validity (C10):** Parabola underestimates sag; within ~1% for sag/span < 4%, ~0.5% below 10%; tension error persists longer. *Confidence: high.*
11. **Formula error (C11):** Confirmed — T_max = √(H² + ((qL + P)/2)²) at mid-span. *Confidence: high.*

---

## 1. Contradiction Verdicts (C1–C11)

### C1 — Target sag — *three distinct quantities; none normative — Confidence: HIGH*
The three numbers are not in conflict: **≈5% unloaded drape** is an installation target (forum/commercial: Nepal Cableways design note, ziplinerider.com); **≈6–8% loaded** is a target because sag reduces tension (T ≈ qL²/8D), protecting anchors; **≈2% loaded** is a *floor* preventing over-tight installs from driving anchor loads to extremes. No EN 15567 / ACCT / ASTM clause prescribes a sag/span ratio (confirmed absence across all accessible normative summaries). **Hard-code:** unloaded drape 5% (A and B); loaded target 6–8%; hard floor 2% as a *tension-protection warning threshold*, both configurable.

### C2 — Safety factors — *framework-dependent — Confidence: MEDIUM-HIGH (clause texts paywalled)*
- **A, EN 15567-1:** k = 3.0 applied to component minimum breaking force. *Clause text not accessible* — buy EN 15567-1:2015+A1:2020. Secondary attestation: LEEA-057 (2014, trade guidance) and AS 2316.2.1:2016 (EN 15567-1 MOD).
- **Regulator guidance — WorkSafe Queensland, "Zip line terminations" safety alert (2019):** verbatim — *"a design safety factor of 5 and proof testing with a safety factor of 2 are reasonable. AS 2316.2.1:2016 specifies a safety factor of 3 but this should be applied to the total combined loading on the zip line cable and not just to the suspended load."* So FS 5 on suspended load, FS 3 on total combined tension, 2× proof test, referencing AS 1666.1 / AS 2316.2.1.
- **ANSI/ACCT 03:** the "10:1 on participant-bearing zip lines" figure is a **challenge-course / vendor convention** (ziplinestore.com and similar); no authoritative primary source ties it to a steel-rope standard. Treat as configurable, labelled convention.
- **ASTM F2959:** clause text not accessible.
**Hard-code:** EN mode → k=3 on MBF; offer WorkSafe (5 on load / 3 on tension / 2× proof) and ACCT (10:1) as selectable regimes.

### C3 — Design live load per user — *"6 kN" is fall-arrest, not traverse — Confidence: MEDIUM*
The 6 kN limit is the fall-arrest maximum arrest force, **not** a zip-line traverse load. Peer/standard confirmation: EN 355:2002 sets 6 kN as the maximum arrest force (F_m); per Bethancourt et al. (MDPI *IJERPH* 2020, PMC7589197): *"In Europe, Standard EN 355 establishes 6 kN as the maximum arrest force (F_m)"*, and SATRA guidance: an absorber *"should not deploy…beyond a maximum length of 1.75 metres, with a maximum force of 6kN, following a fall using a minimum solid mass of 100kg."* It bounds the arrest/energy-absorber system, not the steady traverse. The "0.8 kN conventional / 1.2 kN option per user" figures are design-load conventions (their exact EN 15567 provenance is **not found**). EN 15567 design mass, max simultaneous users, and load-combination rules (pretension + static + dynamic + wind) are **paywalled — not found in primary text**; buy EN 15567-1.

### C4 — Termination efficiency — *EN 13411 states values, per part — Confidence: HIGH for −2/−3/−4*
- **EN 13411-4 (metal & resin socketing):** efficiency factor **K_T = 1.0 (100% of rope MBF)** — *stated in the standard's own scope text*: "the socketing is strong enough to withstand a force of at least 100% of the minimum breaking force of the rope (i.e. socket termination efficiency factor K_T = 1,0)" (attested via iTeh, en-standard.eu, GlobalSpec; harmonised standard).
- **EN 13411-3 (ferrules / Flemish eye):** termination shall sustain **≥ 90%** of rope MBF (BS EN 13411-3:2004 clause 6.2 verbatim: "the FSET shall sustain a force of at least 90% of the minimum breaking force"; endless loop ≥90% of twice; fatigue ≥80% after 75,000 cycles). Aluminium ferrule ~90% (industry: Atlantis Sling). The "up to 95%" is an optimistic vendor claim.
- **EN 13411-2 (spliced eye):** **≥ 80%** MBF (harmonised standard, attested).
- **EN 13411-5 (U-bolt wire-rope grips) / −6 (wedge socket):** commonly **80%**; clause text *not accessible* — treat 80% as convention, flag. Note WorkSafe Queensland and AS 2076 warn grips "shall not be used where the rope is required to support persons."
- **Locked splice on Dyneema ≈ 90%:** rope-industry figure (Samson: "Tied knots may severely reduce the breaking strength… maintains the most strength when used with a spliced termination"; manufacturer datasheet).
**Hard-code:** socket 1.00; ferrule 0.90; spliced eye 0.80; U-bolt/wedge 0.80 (flag convention); Dyneema splice 0.90.

### C5 — Textile axial stiffness — *use EA = k·MBL; 110 GPa is fibre, not rope — Confidence: MEDIUM*
The braided/12-strand rope modulus is far below fibre modulus (fibre 109–132 GPa). Express finished-rope stiffness as EA = k·MBL:
- **B, HMPE 12-strand:** Samson AmSteel-Blue (12-strand SK-78) product datasheet (code 872): *"ELASTIC ELONGATION PERCENTAGE: At % of break strength 10%..0.46% 20%..0.70% 30%..0.96%"* (spliced, bedded-in). Secant EA at 30% load ≈ (0.30·MBL)/0.0096 ≈ **31·MBL**; at 10% ≈ (0.10·MBL)/0.0046 ≈ **22·MBL** (first part of curve is stiffer per unit load — nonlinear).
- **B, EN 1891 Type A polyamide 10.5–11 mm:** static elongation 50→150 kg = 2.0–3.25% (manufacturer CE data: English Braids Tutus 3.1–3.2%; Maxim, Tendon). k is low: with ~100 kg (≈0.98 kN) over 2–3% → EA on the order of 30–50 kN, i.e. ~1.5·MBL — this is a soft, energy-absorbing rope, the opposite of HMPE.
- **First-loading vs bedded-in:** bedding-in densifies structure and raises dynamic stiffness (peer-reviewed: *Ocean Engineering* 2020 "Influence of bedding-in…"; 2021/2025 full-scale HMPE dynamic-stiffness studies — dynamic stiffness rises with mean load, falls with amplitude). **Always report which cycle and at what %MBL.**

### C6 — Rider drag area — *C_d·A = 0.45 m² (measured) — Confidence: HIGH for supine caver*
SSF instrumented the 2008 Vercors 1109 m tyrolienne, recording cable tension every 0.1 s and back-fitting parameters to match theoretical vs experimental speed curves: **"Coefficient de traînée multiplié par la surface de référence du spéléo : 0,45 m²"** (SSF, field measurement). This is a genuine field-derived C_d·A for a harnessed human in a supine/semi-seated zip posture. **Default 0.45 m²; configurable 0.30 (streamlined supine) – 0.60 m² (upright seated).** No wind-tunnel value for the seated posture was found in accessible literature.

### C7 — Dynamic amplification at anchors — *two regimes — Confidence: HIGH (field-measured for controlled case)*
- **Controlled, well-tensioned traverse (B):** SSF, verbatim — *"lorsque la tyrolienne est mise en charge, les amarrages et la corde ne subissent qu'une surtension de 120% maximum de la valeur de la charge appliquée"* — i.e. **DAF ≈ 1.2** on the applied load, even for an abrupt traverse on a short, well-tensioned line. Total anchor load ≈ pretension + ~1.2× suspended load.
- **Slack line / drop entry / shock event:** can exceed **5× static** — this is the rescue-belay drop-test regime (BCCTR Belay Competence Drop Test: 1 m drop on 3 m rope, 200 kg; Rigging for Rescue). Applicable to fall-onto-line, not a rolling traverse.
**Model:** DAF = f(pretension level, sag ratio, entry method). Default 1.2 for step-off traverse on a tensioned line; escalate and warn for slack-line or drop entry.

### C8 — Solver tolerance — *displacement residual, 1×10⁻⁶ m — Confidence: HIGH*
MoorPy's `catenary()` (github.com/NREL/MoorPy `Catenary.py`) converges on the **absolute anchor-position closure** ‖[XF(H,V)−XF_target ; ZF(H,V)−ZF_target]‖ in metres, default **Tol = 1×10⁻⁶ m, MaxIter = 100**; MoorPy docs describe it as a "quasi-static mooring model" solving "using standard catenary equations" with "semi-analytic Jacobians." This is a *position* residual, not the geometric-vs-mechanical length mismatch. GHTyro (shooting method) uses a coarse ~1 m position tolerance. **Use the position residual; scale to span** (e.g. 1×10⁻⁶ · L, or 1×10⁻⁶ m absolute for L ≲ 1000 m). Length-mismatch tolerance should be scaled by EA (a length residual ε corresponds to a tension error ≈ EA·ε/L).

### C9 — Textile above 50 m — *use-class boundary — Confidence: HIGH*
Permanent public attractions: steel (creep, elongation, sheath-melt at pulley friction disqualify textile for continuous public use). Temporary rescue/expedition single textile carrier ropes: **1109 m documented and instrumented (SSF Vercors 2008)**; SSF's research program targets "very long span" tyroliennes. Governing texts differ by class: EN 15567 (permanent public, steel) vs EN 1891 + national rescue doctrine (SSF/French, textile temporary). The "strictly prohibited over 50 m" statement is valid **only** for permanent public installations; it is not a universal ban and does not apply to professional-rescue or expedition temporary lines.

### C10 — Parabola validity — *parabola underestimates sag — Confidence: HIGH*
The parabola is the 2nd-order Taylor truncation of cosh. It **underestimates sag** and the true catenary hangs *below* it (confirmed by multiple sources incl. Southwire *Overhead Conductor Manual*, 2nd ed. 2007, via O-Calc Pro). Approximate error vs sag/span ratio (d/L):

| sag/span d/L | Sag error | T_max error | Arc-length error | Verdict |
|---|---|---|---|---|
| ≤ 4% | < 0.5–1% | < 1% | < 0.1% | parabola fine |
| 5–8% | ~1–2% | ~2–5% | ~0.5% | acceptable, watch tension |
| 10% | ~2% | > 5% (per JL Engineering analysis, tension error stays ~7% until d/L≈1.25%) | > 1% | use catenary |
| 12.5%+ | > 3% | large | > 5% arc | catenary mandatory |

Note (JL Engineering "Aerial Power Cables" white paper): the **tension error decays far more slowly than the sag error** — sag error drops below 2% at d/L≈8.3% while tension/Fx error can remain ~7–9% well beyond that. **Default:** parabola only for preliminary sizing at d/L < 5%; elastic catenary otherwise.

### C11 — Suspected formula error — *corrected — Confidence: HIGH*
For a level span with self-weight q (N/m) and a point load P at horizontal position x_P, the vertical reactions are R_high = qL/2 + P·x_P/L (loaded near high anchor) or, measuring x_P from the low end, V_high = qL/2 + P·(L−x_P)/L. At **mid-span (x_P = L/2)**: V_high = qL/2 + P/2 = (qL + P)/2. Therefore:

**T_max = √(H² + ((qL + P)/2)²)** at mid-span.

The report's √(H² + ((qL + 2P)/2)²) is **wrong** (it double-counts P). General closed form (low-end origin), level anchors:
- V_high = qL/2 + P·(L − x_P)/L; V_low = qL/2 + P·x_P/L − P (may be negative)
- H from geometry (elastic catenary or, taut approximation, H = P·x_P·(L−x_P)/(L·f) + q-term)
- T_i = √(H² + V_i²); T_max at the higher anchor.
For **inclined anchors** (height difference h): add the self-weight resolved along the chord and use the Pewsey/Winkelman inclined closed forms already held; V at the upper anchor gains q·h/2-type asymmetry. Verify against the elastic-catenary solver in all cases.

---

## 2. Formulas and Algorithms (B1–B16)

### B1 — Analytic Jacobian of the elastic catenary (MoorPy / FAST) — *source: Hall, "Generalized Quasi-Static Mooring System Modeling with Analytic Jacobians," Energies 2024, 17(13), 3155 (NREL fy24osti/89605); MoorPy `Catenary.py`; Jonkman FAST v7 — peer-reviewed + open source*

**Symbols (SI):** H = horizontal tension (N, constant along section); V = vertical tension at fairlead end B (N); V₀ = V − wL = vertical tension at anchor end A (N); w = wet/self weight per unit length (N/m); L = unstretched length (m); EA = axial stiffness (N); XF, ZF = horizontal/vertical span to be matched (m). Frame: x horizontal, z up; V positive = tension pulling down at fairlead.

**Residuals solved to zero (fully-suspended, ProfileType 1):**
- EXF = (H/w)[asinh(V/H) − asinh(V₀/H)] + (L/EA)·H − XF
- EZF = (H/w)[√(1+(V/H)²) − √(1+(V₀/H)²)] + (L/EA)(V − wL/2) − ZF

**The four partials (transcribed from `Catenary.py`, closed form):**
- ∂XF/∂H = (1/w)[asinh(V/H) − asinh(V₀/H)] − (1/w)[ (V/H + (V/H)²/√(1+(V/H)²))/(V/H + √(1+(V/H)²)) − (V₀/H + (V₀/H)²/√(1+(V₀/H)²))/(V₀/H + √(1+(V₀/H)²)) ] + L/EA
- ∂XF/∂V = (1/w)[ (1 + (V/H)/√(1+(V/H)²))/(V/H + √(1+(V/H)²)) − (1 + (V₀/H)/√(1+(V₀/H)²))/(V₀/H + √(1+(V₀/H)²)) ]
- ∂ZF/∂H = (1/w)[ √(1+(V/H)²) − √(1+(V₀/H)²) ] − (1/w)[ (V/H)²/√(1+(V/H)²) − (V₀/H)²/√(1+(V₀/H)²) ]
- ∂ZF/∂V = (1/w)[ (V/H)/√(1+(V/H)²) − (V₀/H)/√(1+(V₀/H)²) ] + L/EA

**Newton–Raphson:** [H, V]_{n+1} = [H, V]_n − J⁻¹·[EXF; EZF], with J the 2×2 matrix above. The end stiffness matrix returned to the caller is **inv(J)** (Hall Eq. 7–8; symmetry enforced).

**Degenerate cases (MoorPy ProfileType branches):**
- Vertical line (XF/ZF < 1×10⁻⁴): closed form; slack sub-case H=0, V=w·L_below, stiffness [[V/ZF,0],[0,0.5w]]; taut sub-case uses uniform strain, stiffness [[V/ZF,0],[0,EA/L]].
- Fully taut (catenary solve fails): straight massless spring, K = R·diag(EA/L, T₀/d)·Rᵀ, d=√(XF²+ZF²), T₀=(d/L−1)EA.
- Slack + seabed contact: non-iterative; horizontal stiffness floored at slack_kx = 0.01·|w| to avoid a singular system.
- Buoyant (w<0): flip and solve.

**Convergence:** damped Newton (`dsolve2`, a_max=1.2), residual = absolute displacement error ‖[EXF; EZF]‖ ≤ Tol (default **1×10⁻⁶ m**), MaxIter=100; Peyrot–Goulois initial guess Lamda0 = √(3((L²−ZF²)/XF² − 1)), H₀ = max(|0.5·w·XF/Lamda0|, Tol), V₀ = 0.5w(ZF/tanh(Lamda0) + L).

**Unit-test fixture (from `Catenary.py` warm-start example):** XF=997.547 m, ZF=186.0 m, L=1016.97134 m, EA=7.99738627×10⁸ N, w=1594.059185 N/m, CB=0, α=0 → **HF ≈ 3.146×10⁵ N, VF ≈ 5.237×10⁵ N** (4 s.f.: HF=3.146×10⁵, VF=5.237×10⁵). A second fixture: XF=121.5, ZF=17.5, L=138.5, EA=1.232572089×10⁹, w=2456.8, α=−2.6° → HF≈4.281×10⁵, VF≈3.964×10⁵ N. (Note: MoorPy ships example calls, not asserted pytest expected-value fixtures; recommended test is analytic-Jacobian vs finite-difference agreement to Tol.)

### B2 — Two-segment point-load system — *source: Impollonia et al. 2011 "Statics of elastic cables under 3D point forces" — peer-reviewed*
Unknowns: 3 — (H, V₀, unstretched split L₀₁) with L₀₁ + L₀₂ = L₀ fixed. H continuous across the load node; V jumps by P (V_right = V_left + P). Matching equations: geometric continuity (x, z) at the load node computed from each segment must coincide, plus the two global BCs x(L₀)=L, z(L₀)=h. Jacobian assembled segment-wise; solve by Newton–Raphson. Extension to n loads: n+1 elastic-catenary segments, H continuous throughout, V jumps by Pⱼ at each node, 2n+2 matching equations. MoorPy's point-mass connector formulation (Hall 2024 §3) is the production-grade generalisation.

### B3 — Sweep variable for a rolling rider — *source: Carson & Mann 1970 (PNW-110); SkylineXL/LoggerPC rigid-link; Mungan "Traveling along a zipline" (USNA/LAJPE) — peer-reviewed + govt*
Use the **unstretched material coordinate s_D** of the trolley contact point as the primary sweep variable (or, equivalently, the horizontal position x_D with the kinematic constraint L₀₁ + L₀₂ = L₀ enforced). The split is a *consequence* of trolley position, not free. Kinematic constraint: for each trolley position, the stretched arc lengths satisfy **S_i = L1_i + L2_i** with each segment's stretched length L_j = L₀ⱼ(1 + T_j/EA). Forest-skyline literature solves exactly this: Carson & Mann's rigid-link algorithm and its SkylineXL/LoggerPC descendants move the carriage along an elliptical path with the fixed stretched-length constraint (governing eqs. in Marchi/Sessions lineage: Σ maximise payload s.t. S_{i+1}=S_i, S_i=L1_i+L2_i, force balance T·sinα = ΣV−W_C, T·cosα = ΣH). Mungan's paper gives the closed-form rider-trajectory root-finding for a single elastic segment as a lighter alternative for A.

### B4 — Solver robustness — *source: MoorPy `Catenary.py` + `helpers.py`; Peyrot & Goulois, Computers & Structures 10 (1979) 805–813 — open source + peer-reviewed*
Beyond C≈√(L³/(24(S−L))) and H≈qL²/(8D): use Peyrot–Goulois seed (above). Continuation/homotopy toward the near-taut limit is handled by MoorPy's straight-massless-spring fallback (ProfileType −1); the slack limit by ProfileType 4/5 with slack_kx floor. Damping via `dsolve2` trust-region step cap (a_max=1.2). Ground-contact/seabed algorithm: touchdown-point split into hanging + resting sub-segments (ProfileType 0/2/7 for flat/partial/sloped). Failure modes with diagnostics: non-convergence after MaxIter → retry with re-seeded guess (≤5 attempts, as in GHTyro's 80,000-iteration/5-retry shooting loop); singular Jacobian at H→0 → slack_kx floor; ill-conditioning at H→large → straight-spring fallback.

### B5 — Three inverse problems — *source: overhead-line stringing practice + mooring pretension practice — engineering handbooks*
(i) Accept L₀ directly → forward solve. (ii) Accept installed tension (H or anchor T) → solve for L₀ such that tension = target: framed as the **mooring pretension problem** (adjust unstretched length until fairlead tension matches) or the overhead-line **sag-tension / ruling-span stringing** problem. (iii) Accept target unloaded sag D → convert to H via H≈qL²/8D (parabolic seed), refine with catenary, back out L₀ from arc length. Anchor tension is **strictly monotone decreasing in L₀** over the physically meaningful domain (more length → more sag → lower H), which guarantees a bracketing bisection fallback works; safe bounds: L₀ ∈ [chord length √(L²+h²), chord·(1 + T_break/EA)]. Monotonicity is the basis of standard stringing charts.

### B6 — Anchor & support compliance — *source: Marchi et al. 2019 Biosyst. Eng.; "State of the Art on Trees as Supports/Anchors" Forests 2018 9(8):467; Arboriculture & Urban Forestry 34(2) tree-pulling — peer-reviewed*
Spring BCs: replace fixed anchor with a linear spring k_anchor; add its compliance to the system Jacobian (series stiffness 1/K_total = 1/K_cable + 1/k_anchor). Measured tree stiffness: tree-pulling tests report **moment–rotation and load–displacement curves normalised by trunk diameter**; stiffness rises steeply with DBH (diameter at breast height) and root-plate condition — tieback/guyed anchors show stiffness 3–6× higher than non-braced (peer-reviewed, cable-logging anchor studies). No single universal N/m value exists — stiffness is site- and diameter-specific; the arboricultural pulling-test method (Wessolly/Brudi elastometer + inclinometer) is the accepted way to measure it. **Not found:** a closed-form k(DBH) usable directly in code — must be parameterised from a pulling test per site. Measured tension reduction from support sway on real installations was **not found** as a published number.

### B7 — Quasi-static validity — *source: cable-crane/skyline dynamics; SSF field data — peer-reviewed + field*
Criterion: compare traverse speed v to transverse wave speed **c = √(T/µ)** (µ = mass/length). Quasi-static is valid when v/c ≪ 1; above ~v/c ≈ 0.3 travelling-wave and sag-lag effects grow. SSF Vercors: trolley reached ~120 km/h (33 m/s), pulley to 22,000 rpm, yet quasi-static tension prediction matched instrumented tension — so for typical cable tensions (c on the order of 100+ m/s) the regime holds. Phenomena missed above threshold: travelling waves ahead of the carriage, sag lag, parametric resonance, wave-overtaking. Quantified error above threshold was **not found** as a published zip-line-specific figure.

### B8 — Rider suspension & trolley footprint — *source: engineering reasoning + Petzl trolley geometry — manufacturer + inference*
(i) Rider hangs ~1.0–1.8 m below the cable as a pendulum; period T≈2π√(l/g)≈2.0–2.7 s. In clearance calc, add the static suspension length to the cable z and treat pendulum swing as a lateral/longitudinal envelope (amplitude ≈ entry-speed-dependent). (ii) Two-wheel trolley wheelbase (Petzl Trac: two aligned sheaves, wheelbase ~0.1–0.15 m) distributes the point load over a short span; correction is **immaterial** for spans ≥50 m (wheelbase/span ≲ 0.3%). (iii) Standard assumed suspension height was **not found** as a normative value; use 1.2 m default. *Confidence: low-medium.*

### B9 — Thermal change-of-state — *source: overhead-transmission-line engineering (standard change-of-state equation) — engineering handbook*
Standard change-of-state (level span): H₂ solved from
(H₂ − H₁)/EA·(something) form → **H₂²[H₂ − H₁ + EA·α·(t₂−t₁) + EA·(qL)²/(24)(1/H₁² − 1/H₂²)] = EA·(qL)²/24**, i.e. the classical cubic relating (H₁,t₁) to (H₂,t₂). Thermal coefficients: galvanised steel wire rope α ≈ 12×10⁻⁶ /°C; stainless ≈ 16×10⁻⁶ /°C. **HMPE has a negative axial coefficient (≈ −12×10⁻⁶ /°C, confirmed in principle — HMPE contracts on heating, expands on cooling)**; polyamide α is positive and large but dominated by creep/moisture. Worked example (steel A, 200 m span, ΔT=30°C): sag increases by roughly the parabolic ΔD ≈ (α·ΔT·L²)/(8·(current arc)) — for a 200 m span with ~1% sag the swing is on the order of 0.1–0.3 m; **exact worked outputs require the specific EA and pretension — flagged as needing the change-of-state solver run.** *Confidence: medium; HMPE sign confirmed qualitatively.*

### B10 — Construction stretch & creep as ΔL₀(t) — *source: Vlasblom & Bosman 2006 (DSM Dyneema creep model); Smeets et al. 2001; Jacobs 1999 — peer-reviewed*
Constructional (permanent) stretch: wire rope 7×19/6×19/6×36 ≈ 0.25–1% over first loading cycles (bedding of strands; handbook). Braided textile ≈ 1–3% first-cycle. **HMPE creep:** DSM/Vlasblom two-process creep-rate model — creep rate is a function of load (%MBL) and temperature; secondary (steady-state) creep rate rises sharply above ~30% MBL and with temperature. Creep contrast: **SK75 > SK78 > DM20** (DM20 designed for permanent moorings; SK78 low-creep semi-permanent; SK75 highest creep). Integrate as ΔL₀(t) = L₀·[ε_primary(load) + ċ(load,T)·t]. Polyester and polyamide: lower creep than SK75 but higher elastic + moisture strain. For a line tensioned hours→months, HMPE elongation is dominated by secondary creep at the operating %MBL; **keep textile permanent installs <30% MBL** to bound creep.

### B11 — Non-linear textile constitutive law — *source: EN 1891 CE test data (manufacturer datasheets); Davies et al. dynamic-stiffness papers — datasheet + peer-reviewed*
- **EN 1891 Type A polyamide:** load–elongation is convex; secant elongation at 50→150 kg = 2.0–3.25% (per-product, quoted at that load band). Fit as bilinear (soft initial toe, stiffer main) or cubic; first-loading softer than bedded-in; significant hysteresis (nylon).
- **Polyester semi-static:** ~1.5–3% at working load; less moisture-sensitive than nylon.
- **12-strand HMPE:** 0.46/0.70/0.96% at 10/20/30% break (Samson datasheet) — near-linear, very stiff, low hysteresis but creep-dominated over time.
Secant modulus convention: quote at the working %MBL used (state it explicitly). Bilinear is accepted practice for polyamide; near-linear (single secant) acceptable for HMPE within a load band. **Tabulated multi-point curves beyond these datasheet points were not found in open access.**

### B12 — Ground clearance criterion — *source: engineering reasoning; EN 15567 (paywalled) — inference + standard*
Correct envelope is the **minimum over all rider positions**: h_crit = min over x_P of [ z_cable(x, x_P) − z_ground(x) − h_rider ], evaluated at the rider position x = x_P (the cable's lowest point under load is beneath the rider). Because the loaded sag point tracks the rider, evaluating only at x = x_P captures the worst case for that load position, but the *global* minimum clearance over the run is min over x_P. EN 15567-1 numerical free-space / fall-space geometry, lateral wind corridor, and design wind speed are **paywalled — not found**; buy EN 15567-1 (and check EN 15567-2 for operation). *Confidence: high on the math, low on the normative numbers.*

### B13 — Braking models — *source: Head Rush/TruBlue datasheets; ASTM F2291; SSF — manufacturer + standard + field*
- **Eddy-current (zipSTOP / TruBlue):** braking force **rises with velocity** (Lenz's law), self-regulating and saturating at high speed. Rated envelopes (manufacturer datasheets): original **zipSTOP** rated working capacity **15–150 kg**, arrival speeds 0–36 kph (1:1) / up to 60 kph (2:1 reduction); **zipSTOP IR** 24–60 kph (internal reduction, pre-engineered 2:1); **zipSTOP SPEED** (model ZSSD150-20A) up to **72 kph (45 mph) with a mandatory external 2:1 reduction**. Arrest is by magnetic-brake webbing payout; deceleration curves are proprietary but the force–velocity law is monotone-increasing-then-saturating.
- **Bungee/elastic brake:** effective spring rate k and stroke sized so ½kx² absorbs ½mv²; size for the mass range's worst case (heaviest+fastest).
- **Gravity brake (uphill tail):** design terminal rise so residual KE is dissipated against gravity: rise ≥ v²/(2g) plus rolling/drag margin.
- **Deceleration limits:** ASTM F2291 separates sustained (≥200 ms, cardiovascular-limited) from impact (<200 ms, neuromuscular); supine/+X seated tolerates higher g than +Z. The ~2.5 g "empirical zip-line comfort" figure is practice, not normative. **Recommended design value: keep sustained deceleration ≤ 2.5–3 g and arrest distance from l_brake = v²/(2·G·g).** Exact ASTM F2291 axis/duration numeric limits are paywalled — buy F2291-25c.

### B14 — Trolley rolling resistance — *source: SSF Vercors instrumentation; Petzl datasheets — field + manufacturer*
SSF back-fitted, for the instrumented Tandem Speed pulley on the 1109 m line: **pulley friction proportional to speed = 1.5 kg/s, plus constant friction k₁ = 15 kg·m/s²** (i.e. F_friction ≈ 15 N + 1.5·v N with v in m/s) — a rare **measured** coast-down/traverse fit. Petzl Trac Guide rated max speed **25 m/s**; Trac Plus sealed double-row bearings "constant efficiency independent of weight, temperature, humidity" (manufacturer). Dependence on sheave/cable diameter and steel-vs-textile: **not found** as published numbers. The SSF friction model is the best available fixture. Predicted-vs-measured arrival speed comparison exists only in the SSF Vercors campaign (matched theory to experiment via the above coefficients).

### B15 — Wire rope mechanical data (EN 12385-4) — *source: EN 12385-4:2002+A1:2008 tables (attested) — harmonised standard*
6×19 class min-breaking-force factor **K = 0.330 (grade 1770 fibre core), 0.356 (steel core)**; nominal-mass factor W = 0.359–0.400; metallic-area factor C = 0.384–0.449. Example (from EN 12385-4 Table 7): 6 mm 6×19, grade 1770, fibre core MBF = 12.9 kN, steel core 14.4 kN; grade 1960 FC 21.0 kN. MBF scales as K·d²·R₀/1000 (d in mm, R₀ grade in N/mm²). Effective rope modulus ≈ 60% of wire modulus (~120–130 GPa apparent for typical constructions; Feyrer/Costello). Bending-over-sheave strength loss is a function of D/d; **minimum D/d for zip-line service typically ≥ 20–25** (below which fatigue/efficiency loss is significant). Full per-diameter MBF tables 10–20 mm require the purchased standard (values above are the factors to compute them). *Confidence: high on factors, medium on D/d threshold.*

### B16 — Knot & splice efficiency (textile) — *source: EN 1891 test data; Samson — standard + manufacturer*
The "10.5 mm rope with a knot ≈ 31 kN" is **suspect / likely wrong** — a figure-eight typically retains 60–75% of MBL, so ~31 kN near an un-knotted 30–35 kN MBL implies almost no knot loss, which is implausible. Measured retained strength: figure-eight ~60–70%, bowline ~55–65%, on polyamide. EN 1891 requires a figure-eight to hold **15 kN for Type A** (3 min) in the standard test — a *pass threshold*, not the efficiency. **HMPE holds knots very badly** (can drop to 30–50% of MBL; Samson: "Tied knots may severely reduce the breaking strength") — **spliced eyes mandatory** on load-bearing HMPE highlines. Admissible terminations on a load-bearing textile highline: sewn/spliced eye (best), figure-eight on polyamide (with de-rating); avoid knots on HMPE.

---

## 3. Material & Equipment Constants

**Steel wire rope (A) — per B15, EN 12385-4 (harmonised standard):**

| Construction | Diameter | Grade | MBF | Notes |
|---|---|---|---|---|
| 6×19 FC | 6 mm | 1770 | 12.9 kN | Table 7, K=0.330 |
| 6×19 IWRC | 6 mm | 1770 | 14.4 kN | steel core, K=0.356 |
| 6×19 FC | 6 mm | 1960 | 21.0 kN | |
| 7×19 / 6×26WS / 6×36 | 10–20 mm | 1770/1960 | compute K·d²·R₀ | full table needs purchased standard |

Apparent E ≈ 60% of wire (~120–130 GPa). Min D/d ≥ ~20–25 for service.

**Textile rope (B) — manufacturer datasheets:**

| Product | Ø | Construction | Elongation | MBL | EA/MBL (k) | Source |
|---|---|---|---|---|---|---|
| Samson AmSteel-Blue | various | 12-strand SK-78 HMPE | 0.46/0.70/0.96% @10/20/30% | per size | ~31 @30% | Samson datasheet 872 |
| EN 1891 Type A PA | 10.5–11 mm | kernmantle nylon | 2.0–3.25% @50→150 kg | ≥22 kN | ~1.5·MBL | English Braids/Maxim/Tendon CE data |
| EN 1891 Type A PA | 12 mm | kernmantle nylon | 2.0% | 45 kN (English Braids) | low | English Braids Tutus |

Melting/degradation: EN 1891 requires material melting point >195 °C (excludes PE/PP), so polyamide/polyester qualify; **HMPE melts ~144–152 °C** and is therefore *not* EN 1891-compliant and is friction-melt-vulnerable at pulleys (key reason textile HMPE is unsuitable for permanent public zip lines). Sheath slippage EN 1891 Type A: ≤ ~40 mm for a 2 m sample (≤12 mm rope).

**Trolley / pulley — manufacturer datasheets:**

| Product | Max speed | Bearings | Notes | Cert |
|---|---|---|---|---|
| Petzl Trac Guide | 25 m/s | double-row ball | adventure-park zip | EN |
| Petzl Trac Plus | (public-rated) | double-row (WLB) | public tyrolean | EN |
| Petzl Tandem Speed | 20 m/s rated (exceeded to ~33 m/s in SSF test) | sealed ball | long-span | SSF-used |

SSF-measured friction (Tandem Speed): F ≈ 15 N + 1.5·v (N, v in m/s).

**Braking — manufacturer datasheets (Head Rush / TruBlue):**

| Device | Mass range | Speed envelope | Behaviour |
|---|---|---|---|
| zipSTOP | 15–150 kg | ≤36 kph (1:1), ≤60 kph (2:1) | eddy-current, force↑v, self-regulating |
| zipSTOP IR | 15–150 kg | 24–60 kph (internal 2:1) | as above |
| zipSTOP SPEED | 15–150 kg | ≤72 kph (external 2:1) | as above |

**Air density (mountain sites) — ISA model:** ρ(h,T) = p/(R·T); ISA: p = 101325·(1 − 2.25577×10⁻⁵·h)^5.2559 Pa, T = 288.15 − 0.0065·h K, R = 287.05 J/kg·K. Sea level ρ = 1.225 kg/m³; at 1500 m ≈ 1.06 kg/m³; at 2500 m ≈ 0.96 kg/m³. Scale F_drag = ½ρC_dAv² by local ρ.

---

## 4. Normative Table

| Standard | Safety factor | Design load / simultaneity | Proof test | Braking / decel | Ground clearance | Anchor / trees | Access |
|---|---|---|---|---|---|---|---|
| **EN 15567-1:2015+A1:2020** (A) | k=3.0 on component MBR | not accessible | not accessible | not accessible | free/fall space — not accessible | Annex A arboricultural assessment — content not accessible | **Paywalled** — buy |
| **EN 15567-2** | operation/supervision (max 4 at height per instructor, assisted belay — LEEA-057) | — | — | — | — | — | Partly via LEEA-057 |
| **ANSI/ACCT 03-2019** | "10:1" participant-bearing (vendor convention) | not accessible | — | — | — | — | **Paywalled** |
| **ASTM F2959** (A, US) | not accessible | not accessible | not accessible | via F2291 | — | — | **Paywalled** |
| **ASTM F2291-25c** | — | — | — | sustained (≥200ms) vs impact (<200ms) accel limits; supine +X higher | clearance envelope defined | — | **Paywalled** |
| **EN 355:2002** (fall arrest) | — | — | — | **6 kN max arrest force**, ≤1.75 m deploy, 100 kg | — | — | Confirmed (secondary) |
| **EN 1891** (B) | max recommended load = 1/10 nominal (label) | — | fig-8 holds 15 kN Type A (3 min); 5 falls FF1 @100 kg | — | — | — | Confirmed (datasheets) |
| **EN 13411-2/-3/-4** | efficiency: spliced eye ≥80%, ferrule ≥90%, socket 100% | — | tensile + fatigue tests | — | — | — | Efficiency values confirmed |
| **EN 12385-4** | MBF tables (K factors) | — | — | — | — | — | Factors confirmed |
| **ISO 4309 / EN 12927-6** | discard criteria (broken wires/lay, Ø loss) | — | periodic inspection | — | — | — | Cross-check |
| **WorkSafe QLD (2019)** | FS≥5 load, FS≥3 total tension, 2× proof | — | 2× WLL | — | — | grips not for persons (AS 2076) | Regulator guidance, open |

**EN 15567-1 Annex A (tree anchors):** requires an arboricultural assessment of anchor trees; whether it gives a load-capacity method for a trunk of given diameter is **not accessible** — buy the standard. The forest-engineering literature (Marchi 2019; Forests 2018 9:467) provides the measurement methodology in the interim.

---

## 5. Corpus Findings (§5)

1. **Forest engineering / cable logging — HIGH value.** Carson & Mann 1970 (PNW-110 "A technique for the solution of the skyline catenary equations"), Carson 1977 ("Analysis of the single cable segment," *Forest Science* 23:238–252), Falk 1981 (NE-479). Rigid-link vs elastic methods; SkylineXL (Excel/VBA successor to LoggerPC, Oregon State + USFS) and LoggerPC implement the rigid-link algorithm (formulas proprietary). **Read next:** Harvey 2013 "Cable Yarding Mechanics" (forestengineering.org) — best open synthesis of the equation lineage; Mologni et al. 2021 (crojfe.com) — field vs software (SkylineXL overestimates payload). This is the closest analogue to a rolling-load zip line.
2. **Aerial ropeway engineering.** ANSI B77.1; classical German Seilbahnbau tradition (Czitary, Engel). Track-rope tension/sag with traversing carriage. **Read next:** the Nepal Cableways "Zipline Design Calculation" page explicitly bridges catenary theory to cable-car/cable-crane methods.
3. **Highline rescue mechanics — HIGH value, feeds C7.** BCCTR Belay Competence Drop Test (1 m drop, 3 m rope, 200 kg); Rigging for Rescue "Two-Tensioned Rope Lowers"; CMC/ITRS small-diameter studies. Force-limiting practice (cap 6–12 kN, ≥20 kN system, ≤1 m arrest). **Read next:** EMBC 2016 NIF testing report (bcsara.com) for measured arrest forces.
4. **Mooring quasi-static solvers — HIGH value, feeds B1/B4/B5.** MoorPy (Hall 2024, *Energies* 17(13):3155; NREL fy24osti/89605), MoorDyn/FAST. Exact analytic Jacobians (given in B1), continuation strategies, nine verification cases. **Read next:** the paper §2–4 and `Catenary.py`.
5. **Overhead transmission line — feeds B9/B5.** Change-of-state equation, ruling span, stringing charts. **Read next:** Southwire *Overhead Conductor Manual* 2nd ed. (2007) — the parabola-vs-catenary error basis; SAG10/PLS-CADD conventions.
6. **Military/expedition aerial ropeslides.** US Army FM rope-bridge/aerial-ropeway manuals give field pretension practice and sag-tension tables. **Not located in accessible form this pass** — flagged.
7. **SSF/CVT + GHTyro — HIGH value, feeds C6/C7/B14.** GHTyro 2.00 (Lismonde "chaîne d'arpenteur" discretisation; shooting solver, ~1 m position tolerance, 80,000-iteration/5-retry loop; free download). Vercors 2008 (1109 m) instrumented: tension logged every 0.1 s, C_d·A=0.45 m², DAF≤1.2, pulley friction 15 N + 1.5v. Residual creep/relaxation of the unloaded rope observed topographically. **Read next:** speleo-secours.fr /ghtyro/, /instrumentation-de-la-tgt/, /tyrolienne-1/.
8. **Petzl Technical Institute / Tech Tips.** Quantified highline tension, releasable tensioning heads, descender slip thresholds. **Specific quantified reports not fully retrieved this pass** — flagged for direct fetch.

---

## 6. Validation Dataset (§6)

| Case | Span | Δz | Rope | L₀ / pretension | Unloaded sag | Rider mass | Loaded sag | Anchor tension | Arrival speed | Brake | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **SSF Vercors 2008 (B)** | 1109 m | (oblique) | textile single carrier rope | pretension: ≤220 daN (autobloquant), ≤145 daN (Italian hitch) | measured topographically (relaxation observed) | 80 kg ballast | measured (theodolite, ~110 points) | logged continuously @0.1 s at high point | ~120 km/h (33 m/s), ~55 s transit | recovery trolley | speleo-secours.fr (field, instrumented) |
| **SSF short-line example (B)** | 3 m (short) | 0 | 10 mm textile | high pretension | — | 80 kg | — | ~300 daN total (pretension + ~1.2× load) | — | — | SSF (field) |

**Open-source implementations (cross-validation fixtures):**
- **MoorPy** — governing eqs: elastic catenary x(s)/z(s) (Hall Eqs. 3–4), V(s)=V_A+ws, τ=√(H²+V²); unknowns (H, V) per section, 2 BC eqs; convergence: absolute displacement residual ≤1×10⁻⁶ m, MaxIter=100; fixtures: XF=997.547/ZF=186/L=1016.971/EA=7.997×10⁸/w=1594.06 → HF≈3.146×10⁵, VF≈5.237×10⁵ N (recommended test: analytic Jacobian = finite-difference to Tol).
- **GHTyro** — chaîne-d'arpenteur discretisation into B rigid links; shooting on (N₀, α₀); convergence: anchor-position closure < ~1 m; ships the Pierre Rias dataset as its built-in test case.
- **pycatenary** — supports cable-on-seabed; standard catenary with touchdown split (algorithm mirrors MoorPy ProfileType 0/2).
- **SkylineXL / LoggerPC** — rigid-link Carson algorithm; formulas proprietary; field-validated (with known payload over-prediction, Mologni 2021).

---

## 7. Explicit Gap List

| Question | Why unanswered | What would close it |
|---|---|---|
| C3 EN 15567 design mass, simultaneity, load-combination | Paywalled | Buy EN 15567-1:2015+A1:2020 |
| C2 exact EN 15567 / ACCT / ASTM clause numbers for k | Paywalled | Buy the three standards |
| C4 EN 13411-5/-6 efficiency (U-bolt/wedge) | −5/−6 clause text not accessible | Buy EN 13411-5 and -6 |
| B6 closed-form tree stiffness k(DBH) | No universal published formula | Run site pulling tests (Wessolly/Brudi method) |
| B6 tension reduction from support sway (field) | Not found | Contact SSF/ropeway commissioning bodies |
| B7 quantified quasi-static error above v/c threshold | Not found (zip-specific) | Instrumented high-speed run or ropeway-dynamics paper |
| B8 normative rider suspension height | Not found | EN 15567 / operator manuals |
| B9 exact HMPE/PA α and worked 200 m sag swing | Sign confirmed, magnitude needs solver run | Run change-of-state solver with real EA/pretension |
| B12 EN 15567 free-space/wind-corridor numbers | Paywalled | Buy EN 15567-1 |
| B13 exact ASTM F2291 g/duration/axis limits | Paywalled | Buy ASTM F2291-25c |
| B15 full per-diameter MBF tables 10–20 mm | Table body paywalled (factors known) | Buy EN 12385-4 or use K-factor formula |
| §5.6 military/expedition sag-tension tables | Not retrieved | Locate US Army FM rope-bridge manual |
| §5.8 Petzl quantified highline test numbers | Not retrieved | Fetch Petzl Technical Institute reports |
| §6 measured loaded-sag/anchor-tension numeric values | SSF publishes method, not full numeric tables online | Contact SSF/CVT for the Vercors dataset |

---

## 8. Bibliography (by source type & access)

**Harmonised standards (paid unless noted):** EN 15567-1:2015+A1:2020 (paywalled); EN 15567-2 (paywalled; partly via LEEA-057, open); EN 13411-2/-3/-4 (efficiency values attested via iTeh/en-standard.eu, open snippets); EN 13411-5/-6 (paywalled); EN 12385-4:2002+A1:2008 (factors attested, tables paid); EN 1891 (requirements attested via manufacturer datasheets, open); EN 355:2002 (6 kN, confirmed secondary); ANSI/ACCT 03-2019 (paywalled); ASTM F2959, F2291-25c (paywalled); ANSI B77.1 (paid); ISO 4309, EN 12927-6 (paid).

**Peer-reviewed:** Hall, M. "Generalized Quasi-Static Mooring System Modeling with Analytic Jacobians," *Energies* 2024, 17(13):3155 (NREL fy24osti/89605), open. Carson & Mann 1970 PNW-110; Carson 1977 *Forest Science* 23:238–252; Falk 1981 NE-479 (USDA, open). Marchi et al. 2019 *Biosystems Engineering* 186:71–82; "State of the Art on Trees as Supports/Anchors," *Forests* 2018 9(8):467 (open). Vlasblom & Bosman 2006; Smeets et al. 2001; Jacobs 1999 (DSM HMPE creep; via ScienceDirect/OSTI). Davies et al. dynamic-stiffness (Ocean Eng. 2020/2021). Bethancourt et al. *IJERPH* 2020 (PMC7589197), open. Mungan, "Traveling along a zipline," *Lat. Am. J. Phys. Educ.* (USNA, open). Mologni et al. 2021 (crojfe.com, open); Spinelli et al. 2017 *Eur. J. For. Res.* 136:161–170.

**Regulator guidance:** WorkSafe Queensland "Zip line terminations" safety alert (2019, open). LEEA-057 (2014, open trade guidance).

**Manufacturer datasheets:** Samson AmSteel-Blue (code 872); Petzl Trac Guide / Trac Plus / Tandem Speed; Head Rush/TruBlue zipSTOP / IR / SPEED; English Braids Tutus, Maxim, Tendon, Teufelberger (EN 1891 CE data).

**Field / open-source / forum-and-blog (flagged):** Spéléo Secours Français (speleo-secours.fr — field-instrumented, GHTyro software); NREL MoorPy (github.com/NREL/MoorPy, open source); Nepal Cableways design note, ziplinerider.com, ziplinestore.com, Eng-Tips threads (forum/commercial — used only for heuristics, explicitly labelled); JL Engineering "Aerial Power Cables" and Southwire *Overhead Conductor Manual* (parabola-error basis).

*Ranking note: prefer the field-measured SSF constants (C_d·A=0.45, DAF≤1.2, friction 15 N+1.5v) and the MoorPy Jacobian/fixtures as the highest-confidence deliverables; treat every paywalled clause value as "buy to confirm," and implement the practice/standard divergences (sag ratios, 10:1 vs k=3) as configurable defaults with warning thresholds rather than hard constants.*
