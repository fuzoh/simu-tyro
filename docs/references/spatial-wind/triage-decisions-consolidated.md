# Spatial wind — consolidated triage outcome

## Authority and scope

This documentation-only delivery archives research and issue contracts. Referenced experimental
artifacts under `experiments/`, their tests and pending theory additions are deliberately not
included. Numerical figures describe the inspected research worktree, not an experiment that
can be rerun from this documentation PR alone. Those artifacts require separate review.

Maintainer decisions Q24–Q43 are recorded on GitHub. The following published briefs are the implementation contracts; historical research proposals conflicting with them are superseded:

- [#120 — prescribed wind profile](https://github.com/fuzoh/simu-tyro/issues/120#issuecomment-6775389352)
- [#127 — spatial statics and one-way descent](https://github.com/fuzoh/simu-tyro/issues/127#issuecomment-6775389911)
- [#118 — common spatial projections](https://github.com/fuzoh/simu-tyro/issues/118#issuecomment-6775390540)

All three are `ready-for-agent`. Native dependencies: **#120 → #127 → #118**. This is development order, not permission to ship disconnected physics: Q34 requires coordinated activation. #120 can finish the field and prepared controls under tests before #127 consumes them; #118 completes the visible integration. No reverse dependency or cycle is intended.

#134 is linked as a sub-issue of #127, without a blocking edge and without automatic closure or prototype promotion. #124 stays deferred and `ready-for-human`; #133 remains untouched (`needs-info`) and does not block this version. #117 stays `ready-for-human`, blocked by the currently open agent queue per Q26. Future additions to that queue are not automatically new dependencies.

## Adopted model conventions

These are explicit modelling choices, **not experimentally validated product data or conservative bounds**:

- Line: normal drag only, `C_D⊥ = 1.2`, separate steel/textile constants. Declared diameter constant during a calculation. Omit additional lift and axial drag by choice, not by a finding of negligibility. Retain vertical components of projected normal drag. Missing textile diameter blocks the necessary nonzero-wind calculation rather than inventing a diameter or zero force.
- Static rider: full ellipsoid dimensions height `0.80 h`, transverse width `0.25 h`, depth along A–B `0.15 h`, where `h` is the existing full clearance gabarit. Bottom `h` below trolley, top `0.20 h`, centre `0.60 h`; fixed orientation, no relative lateral displacement or sway. These proportions are conventional, not anthropometric inference.
- Static rider force: horizontal along local prescribed wind, projected silhouette area, `C_D = 1.0`. No extra rider lift or couple. Omit separate trolley/lanyard wind area; retain full gabarit for clearance.
- Existing descent scalar drag law is unchanged. Static rider coefficient is not the descent `C_dA`; the descent velocity never feeds static loads. Wind projection must include the transverse component on a laterally sloped trajectory.
- Two identical carrying members split rider weight and rider wind force, not each member's own weight or distributed wind. Assumed sharing, no wake model; retain separate existing single-member-full-load case.
- Terrain profile extruded laterally, vertical clearance only; no claim of actual surveyed off-axis terrain or minimum obstacle distance.

## Pilots and unavailable results

- Pose tension: total unloaded tension at the tensioning anchor under scenario wind; solve L0 anew when that wind changes. Hold L0 throughout loaded positions.
- Sag target: maximum downward vertical offset from A–B, not combined spatial distance.
- H: longitudinal horizontal A–B component at the tensioning anchor, unloaded under scenario wind; not total anchor tension or a constant along the whole spatial line.
- Ratio V: existing passenger weight/H convention.
- Direct L0 remains a supported driver, not a forced fallback when the user does not know it.

Q33 is withdrawn. Neither local inverse round trips nor the experimental root counters prove global uniqueness. Numerical controls remain implementation acceptance work. No arbitrary 10% excess-length application cap was adopted.

Q24: an unavailable loaded position is not replaced with an old model or a neighbouring curve. Keep independent available results; preserve holes in trajectory. Incomplete traversal means indeterminate Verdict and no descent across missing segments. Nonconvergence is not proof of physical impossibility.

## Wind profile

Q25–Q29 fix symmetric smooth bell, no plateau, horizontal first derivatives at centre/endpoints, residual anchor speed, width at half-excess speed in percent span. Width 10–90%, default50%, step1pp; attenuation 0–100%, default0%. Right widens; up attenuates; direction handle stays unchanged. Uniform wind retains width without physical effect.

The nested trigonometric family in the #120 brief is a technically reviewed implementation proposal satisfying those constraints, not a measured valley profile. It is C¹; second derivative need not be bounded at narrow widths. No claim that it is the uniquely simplest family. It must be consumed consistently at local x, not represented as operative while calculations retain uniform wind.

## Review findings retained

The recovered inversion experiment has known diagnostic defects: reference-sample `crossings` is not a global root count; `secondCrossing` samples one distant length; refinement-inflated tolerance can mislabel an ill-conditioned ratio flat. The production brief expressly forbids relying on these as uniqueness evidence. The script/artifacts are historical experiment evidence, not production acceptance machinery.

The independent view/profile review rejected a visible-but-disconnected profile, identified the obsolete `along === 0` calm shortcut for spatial trajectories, and corrected a signed derivative-quotient comparison to absolute values. Research notes were amended accordingly.

No remaining aerodynamic product coefficient is left for an agent to invent. Numerical method, admissibility and tolerance justification remain technical work with explicit tests and stop conditions in #127. If actual ambiguity or an unsupported physical assumption blocks that work, report it; do not silently choose a new model.
