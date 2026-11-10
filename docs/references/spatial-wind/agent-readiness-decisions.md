# Agent-readiness decisions

Maintainer-approved decisions from the follow-up grilling session. Research reports contain proposals, not approvals; this record distinguishes settled choices from open details. No implementation or issue-state change is authorized by this record alone.

## Wind profile — #120

- **Q1 — accepted:** central plateau at maximum wind speed, decreasing smoothly toward both anchors. Exposed width means plateau length, not a bell-curve width.
- **Q2 — accepted:** width is a percentage of horizontal span, with metres displayed alongside. Changing span preserves the percentage.
- **Q3 — accepted:** width range 0–90%. Zero gives a smooth central peak without a plateau; the upper bound leaves transition regions.
- **Q4 — accepted:** remembered default width 50%, default attenuation zero (uniform wind). Reset to uniform preserves width.
- **Q5 — accepted:** handle right increases width; handle up increases endpoint attenuation, reducing endpoint wind speed without changing central speed. Display endpoint speed explicitly.

- **Q6 — accepted:** raised-cosine shoulders connect plateau to anchors with continuous slope; this is a prescribed scenario shape, not a valley-airflow prediction.
- **Q7 — accepted:** endpoint attenuation ranges from 0–100% of speed. Endpoint speed is central speed multiplied by one minus attenuation; 100% permits zero wind at anchors as a user assumption. Attenuation does not directly scale force.

## Spatial tension drivers and sag — #127

- **Q8 — accepted:** retain the horizontal-tension driver as the force component along horizontal A→B at the tensioning anchor, on the unloaded line under scenario wind. Rapport V uses that same value. This component is not assumed constant along the line and is distinct from total anchor tension and horizontal-force magnitude.
- **Q9 — accepted:** flèche remains the maximum vertical drop below straight A–B, excluding lateral displacement.
- **Q10 — accepted:** display an additional « écart maximal à A–B »: at each position along the horizontal span, combine vertical and lateral offsets from A–B using their Euclidean norm, then take the maximum. Do not combine independent maxima from different positions. This is not shortest perpendicular distance to an inclined A–B. Vertical flèche remains the installation driver; combined displacement is a result only.

## Aerodynamic scope — #127

- **Q11 — experimental path accepted:** after research found insufficient evidence to justify negligible lift/axial drag, maintainer approved an isolated spatial-solver experiment with explicit configurable loads and sensitivity comparisons with/without both effects. Ticket #134 is `enhancement` / `ready-for-agent`. Production coefficient defaults and any final omission remain unresolved; hypothetical sensitivity values are not validated product properties.
- **Q12 — accepted:** retain the existing descent drag model for v1; introduce the ellipsoid aerodynamic model for static wind loading only. Document the distinct approximations rather than implying one validated aerodynamic model covers both.

Other issue decisions remain as recorded in their latest maintainer-approved comments; research recommendations do not supersede them.
