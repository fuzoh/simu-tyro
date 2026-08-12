# A9 · The Rail's input half and the three gates

Stage: A9
Status: open
Blocked by: 17, 23
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 3, § 4, § 7 ·
[Amendments](../AMENDMENTS.md) **D**

## Delivers

The Rail's input half — `Paramètres` in five groups (**Usage · Géométrie · Ligne · Tension de la
ligne · Passager**) then `Valeurs déduites` — with the full field table's labels, units, hard ranges
and warning thresholds, and **the three named gates wired field by field**. Field state is
**`@tanstack/react-form`**; per-field validators are **valibot** schemas (Standard Schema).

## Where the library boundary sits — two lines that are not negotiable

- **The three gates are not form validators.** Solve / Clearance / Verdict are **cross-field
  predicates over the derived Scenario**; a form validator is per-field and would split one gate across
  seventeen fields — the « one rule living in two places » failure § 7 exists to prevent. Form
  validators own **exactly tier one**: what needs no physics.
- **§5.4's chord bound stays in the engine.** No form validator re-derives it. « Tension impossible »
  remains an engine refusal that the UI surfaces, never a field error.

Two things the library makes cleaner rather than just different:

- **« Saisie en cours » rides on `field.state.meta.isTouched` / `isBlurred`** — the spec had flagged
  that rule as untestable through the store alone; as form state it is unit-testable.
- **« nombre illisible » is the string→number schema step failing** — exactly the state
  `inputMode=decimal` creates, where `type=number` silently emptied the field.

**One trap: TanStack Form marks every field touched on submit — and this app has no submit.** It is
live and continuous, so nothing may depend on that transition; anything keyed on `isTouched` must work
without it ever firing.

## Gate

The **gate matrix** as predicates over a Scenario:

- **Solve** — `L`, `h`, the driving tightness field, family + Material Spec, the §10.4 family × usage
  rule, `m_p`;
- **Clearance** — hauteurs d'ancrage A / B, terrain, `h_rider`;
- **Verdict** — régime, both terminations, `DAF`.

## Notes

- **Gates go in with the fields, not as a later pass.** A field built without its gate is a field
  written twice — and **« régime choisi » is struck from the solve tier**, so the app must open
  verdict-less and still compute. That is a property of how this stage is built, not something A11
  bolts on.
- **Three fields of one group land in three different gates** — `m_p` (Solve, it is the single
  `PointLoad`'s magnitude), `h_rider` (Clearance), `DAF` (Verdict). That is itself the evidence the
  split was right.
- **Manual mode types `L` and `h` directly**; import mode places anchors as (station, height above
  profile) with `L` / `h` as **read-outs**. Two framings deliberately: `solveSpan` wants exactly
  `(L, h)`, and forcing the import framing onto manual mode would make every metre of dénivelé come
  from tower height.
- **Hard ranges must run on derived values in import mode.** They were hung on *fields*, but `L`/`h` are
  derived there — otherwise `L = 0` returns `invalid-input{field:"L"}` pointing at something
  uneditable. Attribute the error to a **station** field.
- **Tightness Spec is a segmented control with exactly one editable field**, the other two deduced.
  Three editable fields with a driver radio was rejected: every keystroke can flip the model's meaning.
- **§10.4 shows textile disabled *with its reason*** under `PERMANENTE`; the switch path is a **blocking
  error with a one-click fix**, never a silent auto-switch that would discard the Material Spec. Both
  Material Specs are **retained across a family flip** — which is why textile→steel can raise
  `invalid-input{field:"L0"}` (`T_break/EA` ≈ 0,013 steel vs ≈ 0,67 PA).
- **Validation splits in two tiers with one source of truth each**: the form checks only what needs no
  physics; §5.4's chord bound stays in the engine and is never re-derived here.
- **Régime de sécurité has no default** — absence means « — choisir — ».
- **Unconfirmed Defaults carry a « non confirmé » chip** with provenance in a popover; editing one flips
  the chip but never clears the aggregate entry.
- **Géométrie carries three controls no earlier ticket owned**: « Importer un profil… » (**a button, not
  a drop zone**), « Retirer le tracé », and the file-identity line — which has **four** states, the
  fourth being « Réutiliser ce tracé ». **Nobody has laid that line out with four states at 390 px.**
- **`x_D` is a Passager field**: « Position du passager », m, hard `0 ≤ x ≤ L`, no warning, **clamps on
  every path** with a transient inline note, initial mid-span.
- **« Réinitialiser le scénario » removes the Trace as terrain source and keeps it cached** — otherwise
  Portée would read the trace's 183,4 m after a reset, and the cache would be dead weight without a
  re-add path. It discards a 20-field scenario with **no undo and no confirmation**; « Copier le lien »
  is the only mitigation.
- **The per-field microcopy has never been read aloud by a French rigger.** The register was chosen for
  consistency, not validated — « une hauteur négative n'existe pas » in particular is a stylistic bet.
  Cheap to revise, and revising it touches nothing structural.
