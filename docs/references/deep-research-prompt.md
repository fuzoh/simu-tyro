# Deep research prompt — zip-line simulation engine, closing the algorithmic gaps

> Paste everything below the horizontal rule into deep-research mode.

---

## Mission

I am building the physics engine of a zip-line (French: *tyrolienne*) simulator. It must
compute, for spans of 50 m to ~2000 m: cable/rope statics, the sag profile loaded and
unloaded, the traversing rider's trajectory, ground clearance, anchor reactions, arrival
speed and braking, and equipment sizing. **Two families must be supported at parity:**

- **A — steel wire rope**, permanent installations (high-ropes course / commercial zip
  line, European framework NF EN 15567).
- **B — textile rope**, temporary installations (scouting, caving/mountain rescue
  highlines, releasable tensioning head, EN 1891 semi-static rope).

I already hold four internal engineering reports covering the ground listed under
"Already established". **Do not re-derive or re-explain those.** Your job is exclusively
to (1) arbitrate the contradictions in §1, (2) supply the missing derivations, laws and
measured constants in §2–§5, and (3) find validation data and reference implementations
in §6.

## Already established — do not spend effort restating these

- Catenary `y = C·cosh(x/C)`, `C = H/q`; arc length `S = 2C·sinh(L/2C)`; `T = q·y`;
  `ΔT = q·Δy`; T max at the higher anchor.
- Inclined-span (Pewsey/Winkelman) closed forms for `L_b`, `S`, mid-span sag `D`, `T_max`.
- Parabolic approximation `D = qL²/(8H)`, `T_max = √(H² + (qL/2)²)`, Taylor arc length.
- Irvine's elastic catenary (*Cable Structures*, MIT Press 1981, pp. 16–20) parameterised
  by unstretched arc coordinate `s ∈ [0, L₀]`:
  `x(s) = (H₀/w)[asinh((V₀+ws)/H₀) − asinh(V₀/H₀)] + H₀s/(EA)`
  `z(s) = (H₀/w)[√(1+((V₀+ws)/H₀)²) − √(1+(V₀/H₀)²)] + (ws/EA)(V₀/w − s/2)`
  with `H(s)=H₀`, `V(s)=V₀+ws`, `T=√(H₀²+V²)`; two BCs `x(L₀)=L`, `z(L₀)=h` solved by
  Newton–Raphson on `(H₀,V₀)`.
- The point load splits the cable into two elastic-catenary segments; `H` continuous,
  `V` jumps by `P`, geometric continuity at the load node.
- Taut two-straight-segment approximation: `R₁ = P·L₂/L`, `H = P·L₁·L₂/(L·f)`,
  `T_i = √(H² + R_i²)`.
- `s = s₀(1 + T/EA)`; wire rope has an *apparent* modulus ≈60 % of the constituent wire.
- Newton–Raphson as the primary solver; bisection for 1-D sub-problems; shooting;
  catenary finite elements; dynamic relaxation / lumped mass-spring as the bridge to
  dynamics.
- Rider dynamics skeleton: `m·dv/dt = mg·sinθ − F_friction − F_drag`;
  `F_drag = ½ρC_dAv²`; `R(x) = (1+z'²)^{3/2}/|z''|`; `F_c = mv²/R`;
  `l_brake = v²/(2·G·g)`.
- Normative landscape: EN 15567-1/-2, EN 13411-1..6, EN 12385, ISO 4309, EN 12927-6,
  EN 1891, EN 12278, EN 795, EN 12841, ANSI/ACCT 03-2019, ASTM F2959/F2291, ANSI B77.1.
- Named leads I already know of and want *pursued*, not merely re-listed: pycatenary,
  MoorPy (NREL), MoorDyn / FAST `catenary` subroutine, Irvine 1981, Impollonia et al.
  2011, Costello & Phillips (US Bureau of Mines), Spéléo Secours Français CVT, Petzl
  Tech Tips, GHTyro, Nepal Cableways "Zipline Design Calculation".

## Hard rules for this research

1. **Primary sources or explicit downgrade.** For every number: name the source, its
   type (harmonised standard / peer-reviewed paper / manufacturer datasheet / regulator
   guidance / forum-and-blog), and its date. If a value only exists in commercial or
   forum material, say so in that entry — do not launder it.
2. **Paywalled standards.** EN 15567-1, ANSI/ACCT 03-2019, ASTM F2959, EN 13411 and
   EN 12385 are paid texts. Where you cannot read the clause, say *"clause text not
   accessible"* and instead report the best secondary attestation with its provenance
   and the exact clause number to buy. Never invent a clause number or a value.
3. **No plausible filling.** "Not found" is a valid, useful answer and I want it stated
   explicitly per question. A confidently wrong constant is far more costly to me than a
   gap.
4. **Codable form.** Every formula must arrive with: symbol table, SI units, sign and
   frame conventions, validity domain, and — critically — **at least one fully worked
   numerical example with input values and expected outputs to 4 significant figures**,
   so I can turn it directly into a unit-test fixture.
5. **Separate A (steel) from B (textile)** whenever the answer differs. Never give a
   single blended value for both.
6. **Flag where a statement's validity is conditional** (permanent vs temporary, public
   vs professional-rescue, jurisdiction) rather than reporting it as universal.

---

## §1 — Contradictions in my existing reports: arbitrate them

For each: state which reading is correct, under what conditions each is being asserted,
and the source that settles it. If genuinely unsettled in the literature, say so and give
the range plus the safe default for a design tool.

**C1 — Target sag.** My reports variously prescribe: unloaded initial drape ≈5 % of span;
sag under maximum load ≥2 % of span (as a *floor*, to protect anchors); sag under load
≈8 % of span (as a *target*). Are these three different quantities (unloaded vs loaded,
floor vs target), or a real disagreement? What sag ratio does actual zip-line engineering
practice specify, and is any figure normative or purely heuristic?

**C2 — Safety factors.** Conflicting: (a) EN 15567-1 imposes k = 3.0 on MBR; (b) FS ≥ 5
on the suspended load **and** FS ≥ 3 on total cable tension, plus a 2× proof test
(WorkSafe Queensland, referencing AS 1666.1 / AS 2316.2.1); (c) FS 3–5 on total tension;
(d) an unverified "10:1" from vendor sites. Resolve: for EN 15567-1, **which quantity**
does the factor apply to (suspended load, total tension, or MBR of the component), what
is the number, and which clause? Same for ANSI/ACCT 03-2019 and ASTM F2959. Is the
"10:1" traceable to any primary text at all?

**C3 — Design live load per user.** One report gives 0.8 kN conventional per user with a
suggested 1.2 kN option; another mentions a 6.0 kN maximum force transmissible to the
user. What does EN 15567-1 actually specify for (i) design mass/force per user, (ii) the
maximum number of simultaneous users assumed on one line, (iii) load-combination rules
(pretension + static + dynamic + wind), and (iv) the 6 kN limit's scope (arrest systems
only, or the zip line itself)?

**C4 — Termination efficiency.** My reports give: pressed aluminium ferrule EN 13411-3 at
both 90 % and "up to 95 %"; resin socket EN 13411-4 = 100 %; U-bolt clips EN 13411-5 =
80 %; wedge socket EN 13411-6 = 80 %; locked splice on Dyneema = 90 %. Does EN 13411
itself state efficiency factors, or are these industry conventions? Give the defensible
values with sources, per part of the standard.

**C5 — Effective axial stiffness of textile rope.** Direct contradiction: one report
tabulates E = 110 GPa for **Dyneema SK78 rope** and 90 GPa for DM20; another states that
braided-rope modulus is far below fibre modulus (fibre 109–132 GPa). Braided-rope E of
110 GPa is implausible. Give **measured axial stiffness of finished rope**, preferably in
the rope-industry convention `EA = k · MBL` (dimensionless k), for: 12-strand and braided
HMPE 10–13 mm; EN 1891 Type A polyamide 10.5–11 mm; polyester semi-static. State at what
load fraction and which cycle (first loading vs bedded-in) each figure applies.

**C6 — Rider drag area.** Conflicting: `C_d·A ≈ 0.40 m²` versus `C_d ∈ {0.2, 0.4, 0.6}`
(prone / semi-seated / seated) with `A ∈ 0.25–0.5 m²`, i.e. `C_d·A ∈ 0.05–0.30 m²`.
Give measured or wind-tunnel-derived `C_d·A` for a harnessed human in seated and
supine zip-line postures.

**C7 — Dynamic amplification at anchors.** Conflicting: "total anchor load = initial
tension + 100–130 % of suspended mass" versus "a 100 kg payload can produce an
instantaneous tension >5× its static value". Give a defensible **dynamic amplification
factor** (or DAF model) for a rider entering/traversing/being braked on a zip line, as a
function of pretension level, sag ratio, entry method (step-off vs drop) and braking
event. Prefer instrumented field or lab measurements.

**C8 — Solver tolerance.** My reports state both `1e-3 m` and `1e-6 m` as the convergence
threshold, and are ambiguous about *which* residual is measured (anchor-position error
vs length mismatch `|S_geom − S_meca|`). What residual definition and tolerance do
published cable solvers use, and how should tolerance be scaled to span and EA to be
dimensionally sane?

**C9 — Is textile rope admissible above 50 m?** One report: textile rope is "strictly
prohibited" for permanent installations over 50 m (creep, elongation, pulley-friction
melting). Another documents SSF textile single-rope highlines at 800 m, 1122 m and
2205 m. Delimit precisely: what is prohibited, by which text, for which use class
(permanent public attraction vs temporary rescue/expedition vs work-at-height), in which
jurisdictions?

**C10 — Parabola validity.** Thresholds given as 5 %, 8 % and 12.5 % sag/span. Give the
quantified error of the parabolic approximation vs the exact catenary — for sag, for
`T_max` and for arc length — as a function of sag/span and of `Δz/L`, with a table. Note
that the parabola *under*estimates sag; confirm and quantify.

**C11 — Suspected formula error.** One report gives, at mid-span,
`T_max = √(H² + ((q·l + 2P)/2)²)`, while its own vertical-reaction analysis
(`V = q·l/2 + P·(L−x_P)/L`) yields `√(H² + ((q·l + P)/2)²)` at `x_P = L/2`. Which is
right? Give the correct closed form for `T_max` under a point load at arbitrary `x_P`
with self-weight, for both level and inclined anchors, and show the derivation.

---

## §2 — Missing algorithmic detail

**B1 — Analytical Jacobian of Irvine's elastic catenary.** Give the four partial
derivatives `∂x(L₀)/∂H₀`, `∂x(L₀)/∂V₀`, `∂z(L₀)/∂H₀`, `∂z(L₀)/∂V₀` in explicit closed
form for the two equations above, with the published source (MoorDyn/FAST `catenary`,
MoorPy, OrcaFlex theory manual, or a paper). Include the special cases where the
derivative degenerates.

**B2 — Canonical two-segment (point-load) system.** State the standard formulation: what
are the unknowns and how many (is it 3 — `H`, `V₀`, and the unstretched split `L₀₁` — or
4?), what are the matching equations, what is the Jacobian, and what published paper
(Impollonia et al. 2011, or better) gives it explicitly. Extend to `n` point loads if a
general formulation exists.

**B3 — The correct sweep variable for a rolling rider.** This is my biggest open
modelling question. The trolley *rolls along* the cable, so the material particle of
cable beneath it changes continuously; the split of unstretched length `L₀₁ + L₀₂ = L₀`
is therefore not a free parameter chosen by the user but a consequence of the trolley's
position. Should the sweep parameter be horizontal `x_D`, **stretched** arc position `σ`,
or **unstretched** material coordinate `s_D`, and what is the exact kinematic constraint
linking them? How do published moving-load-on-suspended-cable formulations handle this —
specifically the **cable-crane / forest skyline / aerial ropeway** literature, where a
carriage traversing an elastic catenary with a payload is the core problem? Name the
governing equations they use.

**B4 — Solver robustness.** Documented initial-guess strategies for the elastic catenary
(beyond `C ≈ √(L³/(24(S−L)))` and `H ≈ qL²/(8D)`); continuation/homotopy or
parameter-stepping schemes for the near-taut limit (`H → large`, ill-conditioned
Jacobian) and the slack limit (`H → 0`); line-search or trust-region damping for Newton
on these equations; treatment of the slack/ground-contact case (cable resting on terrain
— pycatenary supports this: what is its algorithm?); and the known failure modes with
their diagnostics.

**B5 — The three inverse problems.** I want the tool to accept any of: unstretched length
`L₀`, installed tension (`H` or `T` at an anchor), or target unloaded sag `D` — and
convert internally to `L₀`. For each: give the published solution algorithm, prove or
cite **monotonicity** (is anchor tension strictly monotone decreasing in `L₀`? over what
domain?), give safe bracketing bounds for a bisection fallback, and cite the standard
"find `L₀` such that anchor tension = `T_target`" routine (this is a standard
mooring-line pretension problem and an overhead-line stringing problem — give both
framings).

**B6 — Anchor and support compliance.** All my formulations assume perfectly rigid
anchors. Real installations anchor to living trees, guyed poles and ballast blocks, all
of which deflect and thereby reduce tension. How is boundary compliance introduced into
the catenary system (spring boundary conditions, and the modified Jacobian)? Give
measured or published **stiffness values**: lateral stiffness of a living tree at a
typical attachment height as a function of trunk diameter; stiffness of a guyed timber
pole; measured tension reduction attributable to support sway on real installations.

**B7 — Validity of the quasi-static assumption.** My plan is "solve statics at each
trolley position, then run a point mass along that frozen trajectory". Give the published
criterion for when cable transverse dynamics may be neglected: compare traverse speed `v`
to the transverse wave speed `c = √(T/µ)`; give the `v/c` threshold and the quantified
error incurred above it; identify what phenomena the quasi-static model necessarily
misses (travelling waves ahead of the carriage, sag lag, parametric resonance, the "wave
overtaking" regime). Sources from ropeway/cable-crane dynamics or moving-load-on-cable
literature.

**B8 — Rider suspension and trolley footprint.** (i) The rider hangs ~1.0–1.8 m below the
cable on lanyards and swings as a pendulum: give the pendulum period/amplitude coupling
to cable motion, and how this is handled in clearance calculations. (ii) A real trolley
has two wheels at a finite wheelbase, so the "point" load is distributed over that base
and the cable does not truly kink: is the correction ever material, and what is its
magnitude? (iii) Standard assumed rider suspension height below the cable, with source.

**B9 — Thermal state change.** Completely absent from my reports. Give the standard
**cable equation of state / change-of-state equation** from overhead-transmission-line
engineering (which relates `(H₁, T₁)` to `(H₂, T₂)` for a change of temperature and/or
load on a span), in a form applicable here, plus: coefficient of thermal expansion for
galvanised and stainless wire rope, and the thermal behaviour of HMPE and polyamide rope
(HMPE's coefficient may be negative — confirm). Worked example: sag change of a 200 m
span over a 30 °C daily swing, both materials.

**B10 — Construction stretch and creep as changes to `L₀`.** I model `L₀` as the
fundamental state variable, so permanent elongation must appear as `ΔL₀(t)`. Give:
quantified constructional stretch for 7×19 / 6×19 / 6×36 wire rope and for braided
textile rope (as % of length, and over how many load cycles); and a **quantitative creep
law for HMPE** (the DSM/Vlasblom creep-rate model: creep rate as a function of load as
% MBL and of temperature), including the creep contrast between SK75, SK78 and the
creep-optimised grades (DM20/SK99/DM20 XBO), and how to integrate it into `ΔL₀(t)` for a
line left tensioned for hours or months. Same for polyamide and polyester.

**B11 — Non-linear textile constitutive law.** I need more than a constant `EA` for rope.
Give published **stress–strain (or load–elongation) curves** for EN 1891 Type A polyamide
10.5–11 mm, polyester semi-static, and 12-strand HMPE — ideally as tabulated points or
polynomial fits usable in code. Cover: first-loading vs bedded-in curves, hysteresis on
unloading, load-history dependence, and the convention used for a **secant modulus**
(at what % MBL is it conventionally quoted?). State whether a bilinear or cubic fit is
the accepted engineering practice.

**B12 — Ground clearance criterion.** Is the correct safety envelope
`h_critique(x) = min over x_P of (z_cable(x, x_P) − z_ground(x) − h_rider)`, or must
clearance be evaluated only at the rider's own position (`x = x_P`) since the rider is
the only thing that can strike the ground? Both appear in my notes. Also: what does
EN 15567-1 numerically require for free space / fall space below and beside a zip line,
and what lateral corridor must be kept clear for wind-induced deviation (with the design
wind speed to assume)?

**B13 — Braking models.** Give quantitative models, not descriptions: (i) eddy-current
brake (ZipStop / zipSTOP IR class) — the force–velocity law (is `F ∝ v`? saturating?),
published deceleration curves, arrest distance vs entry speed and mass, and its rated
mass/speed envelope; (ii) bungee/elastic brake — effective spring rate, stroke, and how
to size for a mass range; (iii) gravity brake (uphill tail) — the design method for
sizing the terminal rise; (iv) the **deceleration limits**: my note says ~2.5 g empirical
zip-line practice while ASTM F2291 permits up to 6 g in +X seated — give the actual
normative g-limits, axis conventions and duration limits from ASTM F2291 / EN 15567, and
the recommended design value.

**B14 — Trolley rolling resistance, measured.** My only figure comes from a hoisting
formula (`µ = µ₀·d/D + 2f/D`, giving µ ≈ 0.015–0.02). Give **measured** rolling
resistance / coast-down data for real zip trolleys (Petzl Trac, Tandem Speed, CMC Rapid
Transit and similar), and its dependence on load, sheave diameter, cable diameter, and
on steel cable vs textile rope. Also: measured arrival speeds vs predicted, if any
published comparison exists.

**B15 — Wire rope mechanical data.** Per construction (7×19, 6×19 IWRC, 6×36) and per
diameter 10–20 mm: metallic area factor (fill factor), mass per metre, minimum breaking
force per EN 12385-4 for 1770/1960 MPa grades, and published **axial stiffness EA or
effective E** with the measurement source. Plus the strength efficiency loss from bending
over a trolley sheave as a function of D/d, and the minimum D/d for zip-line service.

**B16 — Knot and splice efficiency, textile.** One report states a 10.5 mm rope has
"breaking strength with a knot ≈31 kN" which looks close to the un-knotted MBL and is
therefore suspect. Give measured retained-strength percentages for figure-eight, bowline
and bunny-ear knots, and for spliced eyes, on polyamide EN 1891 and on HMPE (HMPE holds
knots badly — quantify). State which terminations are admissible on a load-bearing
highline.

---

## §3 — Material and equipment constants I still need

Deliver as tables, one row per real product or construction, with source per row.
Where a value is a range, say what drives the range.

- Steel wire rope: as per B15.
- Textile rope: diameter, construction, mass/m, MBL, EA (or `EA/MBL`), static elongation
  at 50–150 kg per EN 1891 test, sheath slippage, melting/degradation temperature.
- Trolley/pulley: rated max speed, compatible diameters, sheave diameter, bearing type,
  efficiency, certification.
- Braking hardware: mass/speed envelope, arrest distance, force–velocity behaviour.
- Air: density model vs altitude and temperature (I will simulate mountain sites).

## §4 — Normative values I need pinned down

For each of EN 15567-1:2015+A1:2020, EN 15567-2, ANSI/ACCT 03-2019, ASTM F2959 (and
F2291 where invoked), and the work-at-height/rescue framework relevant to temporary
textile highlines (EN 795, EN 1891, EN 12841, plus French/Swiss rescue doctrine):

1. Safety factor — value, and the quantity it multiplies.
2. Design user load and simultaneity assumptions.
3. Proof-test requirement and periodicity.
4. Braking requirements and permitted decelerations / arrival speeds.
5. Minimum ground clearance and free-space geometry.
6. Slope limits, if any are normative.
7. Anchor design requirements (including trees — EN 15567-1 Annex A arboricultural
   assessment: what does it actually require, and does it give a load-capacity method
   for a trunk of given diameter?).
8. Inspection intervals and wire-rope discard criteria cross-check against ISO 4309 and
   EN 12927-6.

State clause numbers. Where the text is paywalled, say so explicitly and give the best
attested secondary value with its provenance.

## §5 — Corpora I suspect are underexploited — mine them explicitly

I believe the following literatures solve *exactly* my problem (a carriage carrying a
point load traversing an inclined elastic catenary, with sag, clearance and tension
analysis) and are far more mature than the recreational zip-line material. Search them
directly and report their governing equations, algorithms and validation cases:

1. **Forest engineering / cable logging (skyline analysis).** USDA Forest Service and
   forest-engineering literature on skyline tension and payload analysis, deflection
   under a travelling carriage, clearance over terrain; named programs and their
   documented equations (e.g. Carson & Studier-lineage cable-logging analysis programs,
   LOGGERPC, SkylineXL, and equivalents). This is the closest analogue to a zip line and
   has decades of field-validated practice, including the "rigid link"/"elastic" skyline
   solution methods.
2. **Aerial ropeway / cableway engineering (téléphérique, Seilbahn).** Track-rope
   tension and sag analysis with a traversing carriage, ANSI B77.1, and the classical
   ropeway design texts (Czitary, Engel, and the German *Seilbahnbau* tradition).
3. **Highline rescue mechanics.** Instrumented tests by technical-rescue bodies —
   notably BCCTR (British Columbia Council of Technical Rescue) highline test data,
   CMC Rope Rescue Manual highline chapter, tension-analysis "T-method", NFPA-context
   research — which are the best source for measured highline tensions and DAF (my C7).
4. **Mooring-line / offshore quasi-static solvers.** For B1/B4/B5: MoorPy, MoorDyn,
   OrcaFlex theory documentation — the exact Jacobians and continuation strategies.
5. **Overhead transmission line engineering.** For B9 and B5: the change-of-state
   equation, stringing-chart methods, ruling span, and sag-tension software conventions.
6. **Temporary aerial ropeslides in military/expedition manuals.** Sag-tension design
   tables and pretension practice for field-erected rope crossings.
7. **Spéléo Secours Français CVT publications** and the **GHTyro** software: their model,
   assumptions, and above all any published instrumented measurements from the Vercors
   (1122 m, 2008), Millau (2205 m, 2013) and Saint-Martory (800 m, 2024) lines.
8. **Petzl Technical Institute / Tech Tips** quantified test reports on highline
   tensions, releasable tensioning heads, and descender slip thresholds.

## §6 — Validation data (highest value deliverable)

I need to validate my engine against reality, not only against another formula. Find and
report **complete measured cases** — each row needs enough fields to be a regression
test:

> span, elevation difference, cable/rope spec (construction, diameter, mass/m, MBL),
> unstretched length or installed pretension, measured unloaded sag, rider mass,
> measured loaded sag, measured anchor tension, measured arrival speed, braking system.

Prioritise instrumented cases. Partial rows are still valuable — report what exists and
mark the missing fields. Include, if available: dynamometer readings from real
installations, SSF/CVT test campaigns, skyline field measurements, ropeway commissioning
data, and any published "predicted vs measured" comparison for a zip-line or skyline
solver.

Additionally: for each open-source implementation you find (pycatenary, MoorPy, MoorDyn,
skyline programs, others), report its **exact governing equations, its unknown/equation
structure, its convergence criterion, and any built-in test cases with expected numeric
outputs** — those become my cross-validation fixtures.

## §7 — Deliverable format

Structured Markdown, in English, in this order:

1. **Contradiction verdicts** — one block per C1–C11: verdict, conditions of validity,
   source, confidence (high/medium/low), and the value I should hard-code.
2. **Formulas and algorithms** — one block per B1–B16: symbol table, equations, units and
   conventions, validity domain, worked numerical example with expected outputs to 4 s.f.,
   source.
3. **Material and equipment tables** (§3), source per row.
4. **Normative table** (§4): standard × requirement × value × clause × accessibility.
5. **Corpus findings** (§5): per corpus, what it solves, its method, and the specific
   citation to read next.
6. **Validation dataset table** (§6).
7. **Explicit gap list** — every question you could not answer, why (paywalled, no
   public data, genuinely open research), and what would be needed to close it (buy
   standard X; run test Y; contact body Z).
8. **Bibliography** with, per entry, source type and access status.

Rank each item's confidence. Prefer one well-sourced number over three unsourced ones.
Where practice and standards diverge, report both and say which I should implement as the
default and which as a configurable warning threshold.
