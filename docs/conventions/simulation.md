# Simulation math & safety factors

**Do not invent formulas, coefficients or safety factors.** Every number in the
simulation engine must trace back to one of the reference reports below.

## Reference reports

Long French engineering reports in `docs/references/`:

| File | Covers |
| --- | --- |
| `simulation tyrolienne.md` | Catenary/parabolic sag, statics of the unloaded line, non-linear material behaviour, rider dynamics, numerical algorithms, cross-section rendering |
| `tyrolienne sur cable.md` | Steel-cable spans >50 m: NF EN 15567, MBR, safety coefficients, anchor sizing, rigging setups |
| `tyrolienne sur corde.md` | Textile-rope spans >50 m: vector statics, rope material strength, work-at-height and technical-rescue regulation |

These are single-blob prose with inline numbered sections and **no markdown
headings** — `rg` for the term you need (e.g. `rg -i 'coefficient de sécurité'
docs/references/`) rather than reading top-to-bottom.

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
