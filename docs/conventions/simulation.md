# Simulation math & safety factors

**Do not invent formulas, coefficients or safety factors.** Every number in the
simulation engine must trace back to one of the reference reports below.

## Reference reports

Long French engineering reports in `docs/references/`:

| File | Covers |
| --- | --- |
| `equilibre spatial vent.md` | Preparatory spatial-equilibrium note for issues #127, #120, #118 and #124; no engine coefficient |
| `simulation tyrolienne.md` | Catenary/parabolic sag, statics of the unloaded line, non-linear material behaviour, rider dynamics, numerical algorithms, cross-section rendering |
| `tyrolienne sur cable.md` | Steel-cable spans >50 m: NF EN 15567, MBR, safety coefficients, anchor sizing, rigging setups |
| `tyrolienne sur corde.md` | Textile-rope spans >50 m: vector statics, rope material strength, work-at-height and technical-rescue regulation |

These are single-blob prose with inline numbered sections and **no markdown
headings** — `rg` for the term you need (e.g. `rg -i 'coefficient de sécurité'
docs/references/`) rather than reading top-to-bottom.

## Served to the user

`docs/simulation-theory.md`, `algo simulation tyrolienne.md`, `research-two.md` and the four
reports above are rendered in the app at `/docs/<slug>` (`src/lib/docs/pages.ts`), and every
`§n.m` in the Rail's help and provenance copy links to the matching heading of
`simulation-theory.md`. **Renumbering a section of the theory file breaks those links** —
`src/lib/docs/refs.test.ts` catches it. The three prose reports were given markdown headings on
2026-09-23 so they render; their wording is unchanged and `rg` still works.

`docs/guide/` (#125) explains the reference step by step, in French, for a reader with school
mathematics: one chapter per part of the engine, each sub-chapter citing the § it explains, and a
worked example on the First-Run Scenario. **It adds nothing to the reference**: no formula,
coefficient or rule appears there first. A change to the physics or a shipped default updates the
reference, then the guide; `src/lib/docs/guide-examples.test.ts` recomputes the figures the guide
quotes and fails when they drift.

## Rules

- Read the relevant report **before** writing or changing simulation math,
  clearance logic, or safety-factor logic.
- Cable and rope are physically different models (steel is near-elastic, textile
  rope creeps and has much lower termination efficiency). Do not share a code path
  between them without checking both reports.
- When you implement a formula, cite its source in a comment: the report filename
  and the numbered section it came from.
- Termination efficiency, MBR and safety coefficients are regulatory values, not
  tunables. If a value is not in the references, ask — don't pick one.
- **The Vent's direction is geographic; the engine takes angles, never Positions.** `wd` is the
  azimuth the wind comes **from**, degrees clockwise from north (0 du nord, 90 d'est, 270 d'ouest).
  `windComponents(speed, from, bearing)` (`src/lib/sim/wind.ts`) takes that azimuth and the line's
  bearing A → B, and projects on `from − bearing`: 0° head wind, 90° from the right. The bearing is
  read off the Positions outside `src/lib/sim/` — `lineBearing` (`src/lib/scenario/geometry.ts`), the
  rhumb line the north-up map draws — and reaches every reader through the gates' `windBearing`
  (`src/lib/rail/gates.ts`), the one check behind « the Vent needs Positions ». Without a bearing
  nothing is projected: the ride and the Banane run without wind, the wind fields are disabled, and
  a carried Vent is kept as given with a notice — never a Blocking Error. Moving an anchor changes
  the components and never `wd`.
