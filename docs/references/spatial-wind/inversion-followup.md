# Spatial tightness inversion — recovered numerical investigation

## Status and scope

The research agent stopped on repeated provider-capacity errors before delivering its interpretation. The parent recovered and reran its experiment successfully. This note records checked artifacts and limitations, **not a completed proof of uniqueness or a production solver specification**.

Task: [#127](https://github.com/fuzoh/simu-tyro/issues/127), decisions Q30–Q33. Q33 was withdrawn: users must not be required to know unstretched length as a fallback. No production physics or coefficient is adopted here.

## Availability of experimental artifacts

This documentation-only PR does **not** include the experimental scripts, generated tables,
the pending #134 theory addition, or its tests. The paths below describe artifacts inspected
in the research worktree; they are not reproducible from this PR alone. They require a
separate reviewed experimental delivery. The diagnostic defects recorded here remain open;
this report is not an endorsement of that code for production.

## Reproduction and evidence

```sh
bun experiments/spatial-inversion-followup/sweep.ts
```

Sources of the findings below:

- `experiments/spatial-inversion-followup/sweep.ts`: grid, controls, classification and local inverse tests.
- `experiments/spatial-inversion-followup/summary.json`: aggregate reports and individual controls.
- `experiments/spatial-inversion-followup/curves.csv`: sampled curves and convergence flags.
- `experiments/spatial-inversion-followup/failures.csv`: primary-grid failures.
- `experiments/spatial-inversion-followup/roundtrip.csv`: local inverse tests.
- `experiments/spatial-aero-134/solve.ts` and `matrix.ts`: underlying experimental solver and sensitivity inputs, not validated production coefficients.
- `docs/simulation-theory.md` §15: reference fixtures used by controls.

The rerun returned exit code zero. All 16 reported fixture checks passed (Z1, Z2, Z3, Z6). There are 304 parameter cases and 11,552 primary length samples. **203 failed primary samples across 36 cases**, not 203 failed cases. Primary discretization uses 80 steps; selected roles receive 160-step refinement. Failure counts do not enumerate all refined samples: `main()` explicitly records primary failures only.

There are 770 local inverse round trips, 769 reported converged. The failed trip is the extreme near-parallel axial probe `extreme|textile-ea-half|level|near-parallel|30|axial-flip-1`, driver `vrB`, target about 62,798. A large ratio near small H needs conditioning analysis; this failure is not evidence that users must supply L0.

## Important interpretation limits

### H and total anchor tension are different quantities

The zero-wind Z1 sweep reports decreasing HA/HB but nonmonotonic TA/TB over its full length grid. The grid deliberately extends from almost taut to **200 m excess unstretched length per 100 m chord**; Z1's sampled sag reaches approximately 133 m. This is not representative evidence of ambiguity in ordinary zip-line installation settings.

It does mean that an argument about monotonic H cannot simply be reused as an argument about total anchor tension over arbitrary lengths. Before claiming a practical multi-root problem, establish the admissible installation domain and verify roots within it. Do not turn this observation into a new user-facing refusal or length-entry requirement.

### A reported second crossing is not yet an established physical ambiguity

Exactly one round-trip record flags `secondCrossing`: extreme textile, crosswind 30 m/s, lift probe +2, sag target approximately **2.57e-10 m**. That target is below the experiment's sag tolerance floor of 1e-4 m. It therefore cannot establish two distinct meaningful sag solutions. Sag is a nonnegative downward measure; uplift and a near-zero floor require explicit treatment rather than interpreting numerical sign changes as physical roots.

### Local round trips are not global uniqueness tests

The round-trip routine brackets near a known source length. Recovering a nearby target verifies local numerical behavior; it does not rule out remote roots or alternative equilibrium branches. Likewise, sampled monotonicity is evidence on a finite grid, not a theorem.

### Sensitivity coefficients remain hypothetical

Lift/axial probes and stiffness variations inherited from #134 are not measurements, confidence bounds or production defaults. Unsuccessful solves must remain unavailable. Neither a numerical failure nor a cold/warm initialization discrepancy proves absence of physical equilibrium.

## Independent review of recovered evidence

An independent reviewer checked the artifacts and performed selected re-solves. The product caution above stands, but several experimental diagnostics must **not** be used as proof of root count:

- `crossings` counts crossings at the reference sample, not all preimages over a target grid. Near-zero plateaus can be skipped entirely. A value of zero or one is not a uniqueness result.
- `secondCrossing` checks a single distant length against an absolute residual tolerance; it does not search for a second root. Its sole positive flag is the near-zero sag floor already discussed.
- `tauFor` can inflate tolerance until a strongly varying, ill-conditioned ratio is labelled flat. The extreme `vrB` record spans about 0.029–62,798 with tolerance about 445,000. Such a result must be marked unresolved, not physically flat. The absolute floors are numerical experiment controls, not physical tolerances or validated product accuracy.
- A non-finite ratio at non-positive H serializes to a null residual. It needs an explicit diagnostic; null does not identify the cause. Non-positive H makes the positive ratio driver invalid, but this alone does not prove absence of equilibrium for other drivers.
- The downward sag floor is intentional under Q30. On an uplift probe, the cable can be metres above the chord while reported downward sag is approximately zero. Round trips below the experiment's 1e-4 m sag floor do not establish distinct physical solutions. Do not describe zero downward sag as meaning the line cannot be above the chord.

The reviewer found no H rebound exceeding 0.01 N in the sampled non-extreme cases restricted to L0 ≤ 1.10 × chord; H remained positive there. This **analysis window is not an adopted installation limit**, and a finite grid cannot exclude narrower reversals. No primary failures occurred in the four control and 100 decision-role cases. Across the full grid, total anchor tension turns must remain distinct from H turns; existing production parameterisation already distinguishes `anchor.turns` from `tension.turns`.

Cold/warm comparison discrepancies were at most approximately 7.3e-5 N in the artifacts. This does not establish global branch uniqueness. No new user-facing length fallback, arbitrary 10% cap, or general impossibility claim follows from this review. Q33 remains withdrawn.

Before using another sweep as evidence, replace the misleading root diagnostics, classify refinement-limited results as unresolved, and report non-finite ratios and refined failures explicitly. No full matrix rerun is required merely to retain Q33's withdrawn status.

## Work still required before implementation brief

1. Independently review the experimental solver, admissibility checks, signs at A/B and refinement/classification logic.
2. Define the installation domain for inverse targets using physical and existing application constraints, not an arbitrary claim that all sampled extreme slack is usable.
3. Establish a robust bracketing/continuation strategy for each driver, including total anchor tension separately from longitudinal H, and handling near-zero sag and H.
4. Verify roots and any apparent reversals with tighter numerical controls; distinguish actual alternate roots from clipping, failed intervals and tolerance-scale noise.
5. Keep Q24 failure behavior and Q33's withdrawn status. Only bring a new product decision to the maintainer if a real ambiguity within the intended domain is established.

## Repository checks

Parent ran `bun run typecheck`, `bun run lint-type-aware`, `bun run test:ci` and full `bun run test`: all passed after recovering the experiment. Initial `format:check` found only compact generated `summary.json`. Parent changed its writer to pretty JSON with a trailing newline and formatted only `sweep.ts` and `summary.json`; `format:check` then passed. No production source, existing #134 experiment or existing dirty theory document was modified by this recovery.

Passing repository checks is not independent scientific validation. This report intentionally leaves the inversion research **partial**, rather than inferring a production guarantee from unfinished analysis.
