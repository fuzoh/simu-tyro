# A9 · The Rail's input half and the three gates

Stage: A9
Status: done
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

## Comments

**Built.** Four pure modules under `src/lib/rail/` and two components, plus five reducer actions and
the wiring in `app.tsx`:

| File | Carries |
| --- | --- |
| `src/lib/rail/fields.ts` | § 3's field table (label, error label, precision row, tier-one rule, warning band, gate), `parseDecimal`, § 7's message table, `commitField` / `displayField`, and `fieldSchema` — the valibot Standard Schema TanStack Form validates with |
| `src/lib/rail/gates.ts` | **the three gates** as predicates over a `ScenarioDraft`, § 7's culprit table (grandeur × mode), the four Fix Actions, `blockingSummary` and `saisieEnCours` |
| `src/lib/rail/values.ts` | form text ⇄ canonical state: `railValues`, `applyField`, `withOverride` / `clearOverride`, `switchTightness` |
| `src/lib/rail/deduced.ts` | `Valeurs déduites` — the rider-free chain (material, `resolveL0`, one unloaded solve) plus the stale-Override badge |
| `src/components/rail/controls.tsx` · `inputs.tsx` | the affordances, and the five groups + `Valeurs déduites` assembled over one `useForm` |
| `src/lib/app/state.ts` (edited) | `scénario/réinitialisé`, `matériau/famille`, `tracé/importé` · `retiré` · `réutilisé` — the five actions that touch more than one property of the state object |
| `src/components/app/app.tsx` (edited) · `docs/conventions/ui.md` | the Rail Header's controls and the two filled sections; a *Forms* section stating the two non-negotiable boundaries |

**The gate matrix is asserted one input at a time** in `gates.test.ts` — `L`, `m_p`, the driving
tightness field and the Material Spec on **Solve**; hauteurs A/B, the stations and `h_rider` on
**Clearance**; régime, both terminations and `DAF` on **Verdict** — with the three consequences, the
family-first ordering, and the check that a Clearance breach leaves Solve standing so the cable
still draws. Suite **909 → 1043**.

Three results worth naming, because none of them is a restatement of the ticket:

- **The whole of § 9's `VALEURS DÉDUITES` block reproduces from the app's own chain, as frozen
  strings**: 9074 daN · 6,90 MN · 0,5465 kg/m · 0,536 daN/m · 151,08 m · 151,64 m · 253,5 daN ·
  6,00 m **(à x 74,8 m)** · 4,00 % · 2,90 % MBF. `deduced.test.ts` asserts all ten as string
  equalities, in the first-run lock's idiom. The sag *position* is the one scanned value (2400
  samples of `sampleCable`); the alternative was re-deriving §4.1's `x(s)` in the app.
- **« Régime choisi » struck from the solve tier is visible on the first screen**: the only breach is
  the Verdict Gate, the summary reads « ⛔ 1 erreur bloquante — aucun verdict », and the chart draws.
  Confirmed in the real app.
- **Store → form synchronisation compares against the previous *state* rendering, never against the
  field's text.** The obvious version — sync whenever the text differs — erases a committed-invalid
  « −5 » the instant it blurs, which destroys the evidence § 7's ⛔ message quotes. Found by driving
  the app rather than by a unit test; the code now carries the reason.

Nine judgement calls, all where the spec is silent or loose:

- **A new directory, `src/lib/rail/`**, rather than folding the gates into `src/lib/app/`. A10's
  output half joins it; the components sit in `src/components/rail/`.
- **The ⛔ template echoes the value at the row's display precision.** § 7's table prints « Valeur :
  0 m » for a 2-decimal row and « 0 kg/m » for a 4-decimal one; those are the same class of loose
  rendering as « T max 817 daN », and § 3's precision table has exactly one implementation — so the
  message reads « Valeur : 0,00 m ». Same call for the station bound, « 0,0 – 224,0 m ».
- **The echoed sign is § 3's typographic minus**, matching § 7's own strings, while `formatValue`
  keeps its hyphen: a field value has to be re-typeable on a keypad, a message does not.
- **Three fields carry a second name for the ⛔ template** (`Masse` → « Masse du passager »,
  `Raideur relative EA/MBL` → « Raideur relative k », `Rendement η` → « Rendement de terminaison A »),
  because a label sits under a group heading that supplies the context a message must carry itself.
- **`η_A` / `η_B` take the generic `> 0` rule and the standard template.** § 7's table has no row for
  them; it only says « requis (Verdict Gate) ».
- **Warning copy for `h`, the anchor heights and `d` is written here.** § 3 gives the conditions, § 4
  gives `L`'s string, and § 7 records that warning copy is deliberately absent from its table.
- **`k`'s reasoned empty message is class-scoped**: polyester reads « aucune valeur publiée pour le
  polyester », HMPE and PA read the plain « valeur requise ». § 3's reason is about polyester alone.
- **In imported mode the anchor heights move to the Solve Gate**, because `h` derives from them there
  — § 7's culprit table row « `h` importé ». In manual mode they stay Clearance's.
- **The three steel derived rows are editable at all times**, showing override-or-formula, because
  § 3 draws them as fields with a reset control: typing is what creates the override and
  « Recalculer » is what drops the key. Emptying one reads « valeur requise » rather than acting as
  an implicit reset.

Two smaller ones. **« Flèche à vide » is absent while `Flèche` is the driver** — § 3's `Présent
quand` column says « hors mode Flèche », and § 9's sketch showing it anyway is the looser of the two.
And the **force selector shipped** in the Rail Header beside the reset menu, because every force
field the Rail renders reads through it and it is the one control that demonstrates « le changement
d'unité n'écrit jamais dans l'état ».

Left standing on purpose, for the tickets that own them: the banner slot (A11 — `blockingSummary`
and `saisieEnCours` are exported ready for it), the « Aucun résultat » cause line echoed in each
suppressed region (A11), « Copier le lien » with the debounced URL and Session writes, and the
narrow-screen reflow of the file-identity line's four states at 390 px (A12 · A13).

Gates green: `typecheck`, `lint-type-aware`, `test` (**1043**, was 909).

**Fix round (review 1).** Three findings fixed, one declined; suite **1043 → 1050**.

- **`NumericRow` was declared inside `RailInputs`** — a new component type on every render, and
  `useStore(form.store)` re-renders on every keystroke, so React remounted each `<input>` and the
  caret was lost after one character. It is now a **module-scope component** reading a
  `RailRowContext`, like `Group`, `FileControls`, `TerminationRow` and `DerivedRow` already were.
  Measured after the fix, in dev **and** on a production build: « 1250 » typed into `Portée` keeps
  the same DOM node, `document.activeElement` and a caret at offset 4.
- **A family flip now swaps the terminations with the spec** — § 3 retains the inactive one
  « overrides *and* terminations included », and the whitelist is scoped by family, so a steel
  `cosse` surviving onto a rope was a picker value its own option list did not contain (the control
  silently showed option 0). `RetainedMaterial` became `{ spec, terminations }` in the Session
  schema, and `FIRST_RUN_RETAINED_TEXTILE` ships « Œil cousu / épissuré » 0,90 at both ends. The
  two `[CONVENTION]` chips on `η_A`/`η_B` now appear with the flip.
- **`x_D` clamps in imported mode too, and the note is driven by the clamp event.** `applyField`
  clamped against `Infinity` behind a trace, and against a possibly non-positive `L` in manual mode;
  the clamp now runs against `spanLength` (`Portée`, or `s_B − s_A`) on `L`, `s_A`, `s_B`, `x_D`,
  « Inverser A et B » and the three terrain reducer actions, through one `applyGeometry` seam. The
  note compares **what was asked for against what landed** instead of looking for an out-of-span
  value in state — which, state being clamped on the way in, could only ever fire where nothing
  moved. The View Strip's effect on that dead condition is gone; its typed path keeps its own note,
  and `commit` returns the value that *entered* state, so a refused position snaps to the span's end
  rather than reading back « 500,0 ».
- **A span still being typed does not drag the viewpoint** (judgement call, § 3 silent). Live commit
  means « 100 » into `Station B` goes through « 1 », and clamping on that intermediate left `x_D` at
  1,0 m on the 100 m span the user actually typed. The clamp lands when the edit lands — the same
  carve-out the store→form sync already makes for the field under the caret — so state can hold an
  out-of-span `x_D` only while that field holds focus, which is « Saisie en cours », where the scene
  clamps the drawing and A11's URL write is suspended anyway.
- **The §10.3 reason moved out of `Picker`** into the row's full-width note slot, **one per row**
  rather than one per disabled option. Inside the control cell a 224 px paragraph left the label
  column 23 px and « Terminaison A » painted over the reason it is meant to sit beside; the label
  now measures 87 px against an 81 px text run at 1440×900.
- **Declined:** the em dash in « ⛔ Régime « Secours textile — 10:1 » indisponible avec un câble
  acier. ». § 6's régime table spells the label *with* the dash and the message interpolates that
  one label; § 7's message-table row omitting it is the looser of the two, the same class of loose
  rendering as « Valeur : 0 m » against § 3's precision table above.

Gates green after the round: `typecheck`, `lint-type-aware`, `test` (**1050**).

**Spec-drift correction (chunk 4 audit).** Two things, both § 9's and § 8's rather than judgement
calls:

- **An absent régime raised a `BlockingError`, and it must not.** § 9 is explicit — « `Régime de
  sécurité` at « — choisir — » is **not** an empty required field » — and § 8's banner ranks make
  the consequence structural: rank 1 pre-empts rank 4, so a blocking error on the shipped scenario
  makes the neutral no-regime prompt (`NO_REGIME_BANNER`) unreachable **forever** and A11 cannot
  implement the precedence at all. `GateReport` gained `noRegime`; the Verdict Gate is now
  suppressed by `errors` **or** that flag, while `errors`, `worst` and `blockingSummary` stay
  derived from the list alone. The first screen therefore carries no « ⛔ 1 erreur bloquante —
  aucun verdict » and the picker no « valeur requise » — verified live. The régime × famille/usage
  clash keeps its `BlockingError` and its `[ Choisir un autre régime ]`: that one **is** § 8's
  message-table row.
- **The Rail Header ships § 9's own sketch.** « Copier le lien » (built from state, never from the
  address bar, refusing an oversize `tr` with « Tracé trop volumineux pour un lien (N points).
  Partagez le fichier CSV. ») and « Effacer la session » behind a `confirm` that warns harder when
  the cached Trace arrived by link. « Réinitialiser le scénario » now also navigates to bare `/`
  with `replace: true`. The debounced writes behind them are ticket 22's; the pure halves are
  `src/lib/app/persist.ts` and are unit-tested in `node`.

Two judgement calls the correction needed, both where the spec is loose:

- **The oversize count groups with a narrow no-break space** — « 4 812 » — because a plain space
  lets the number wrap into « 4 » and « 812 points ». Same class of call as « Valeur : 0,00 m »
  above.
- **A reset navigates to bare `/`, and ≈400 ms later the writer republishes the canonical
  first-run bag.** § 9's `replace: true` is honoured and § 7's « the address bar always holds
  exactly the state the app holds » is honoured; only the load-time bare `/` is sacred, because
  there it *means* « restore the Session ».
