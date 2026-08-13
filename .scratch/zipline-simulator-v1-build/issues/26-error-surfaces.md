# A11 · The error surfaces — banner precedence and the refusals

Stage: A11
Status: done
Blocked by: 25
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 7, § 11 ·
[Amendments](../AMENDMENTS.md) **A**, **B**, **D**

## Delivers

The app's whole error vocabulary: the banner with its **four ranks and exactly one occupant**, the
per-gate summaries, the **17-row** tier-one message table, « nombre illisible », the **culprit table
keyed by (quantity × mode)**, the seven import failures inline under the file control, the three
refusal states with their bounds, `[ Copier le diagnostic ]`, **« Saisie en cours »**, « Aucun
résultat », the « clé ignorée » strip, and `Indéterminé`'s **gaps in the scrub track**.

## Gate

Injected refusals — `vi.mock` on the collaborator, never a widened signature — plus the banner as a
**pure reducer** (one occupant, four ranks) and the message and culprit tables as table-driven cases.

## Notes

- **Four invariants are the error contract**, each with its reason beside it or it gets "simplified"
  later: no hard check ever renders only on a read-out · **no error message asserts an act** (button
  labels describe their effect) · no verdict ever stands on numbers it was not computed from · the
  banner slot holds exactly one occupant.
- **The banner names the worst gate breached** — « aucun résultat » / « garde au sol indisponible » /
  « aucun verdict » — because a bad `DAF` beside a printed `Garde min` would make one copy contradict
  the screen.
- **Three surfaces, and the mapping is what users see**: `no-convergence` and `slack-limit` both render
  **« Calcul impossible »** (one surface, two kinds, same user action); `invalid-input{field:"L0"}`
  renders **« Tension impossible »** with its attainable bound and **no fix button**; `resolveL0`'s
  bracket failure renders **« Cible inatteignable »** naming the *target*.
- **« Tension impossible » is the hardest refusal in the app**, because the §5.4 chord bound *is* the
  breaking load — no unambiguous repair exists, so no fix button does either. Its mode-specific bounds
  (0,29 m, 9 074 daN) **depend on ticket 12's re-emission capability**; skip that and the two messages
  are unwritable and the state degrades to quoting an `L₀` floor at a user editing a tension.
- **Two things that look like refusals and are not**: deep slack **converges** (garde −169,67 m,
  `contact: "cable"`) and is the « Câble au sol » *verdict*; and a line lying down is never
  `slack-limit`.
- **« nombre illisible » is a state `inputMode=decimal` creates** — `type=number` silently emptied the
  field instead.
- **The seven import failures leave the current terrain untouched** and are prefixed with the file
  name.
- **`Indéterminé` punches gaps in the scrub track**, where « — » is the only legal glyph: the pointer
  skips them, and a typed `x` inside a gap still solves exactly.
- **The three refusal states have no natural fixture** — `no-convergence` and `slack-limit` are
  unreachable inside the admissible envelope, so the gap rendering, the pointer skip and the
  typed-`x`-in-a-gap solve are specified against a state nobody has produced. A wrong guess about what
  `failures[]` looks like in practice would be caught by no fixture.
- **Rejections to keep rejected**: no residual on screen · **no `SolveNote` ever surfaces** (349 440
  instrumented solves, `reseeded` 0, near-taut 0) · no dev panel · no dashes for absent values · no
  « ouvrir malgré tout » · no persisted strip dismissal · no second equivalent beside a quoted bound.
- **« Saisie en cours » is focus-scoped**, so a blurred or never-filled required field is « Aucun
  résultat » with no stale picture: the chart **freezes rather than dims**, and scrubbing goes **inert**,
  because a stale Sweep must not be used to *generate* new stale numbers. Amendment D gives it a home:
  TanStack Form's `field.state.meta.isTouched` / `isBlurred`, so the **rule** is a unit test here while
  the **screen behaviour** — freeze, inert scrubbing, suppressed URL write — is ticket 31's. It still
  has no representation in the URL or the Session, so it cannot be restored or shared.
- **The 17-row message table and the culprit table are the spec's French strings**, keyed off valibot's
  issues — never rendered from valibot's default messages.
- **Four surfaces here have no CI check** and belong to ticket 31: the Skeleton's content, the refusal
  page at 200, « Saisie en cours » on screen, and « Aucun résultat ». Everything expressible as a pure
  function — the banner reducer, both tables, the three refusals' bounds — stays in Vitest.
- **The geometry-invalid exception is scoped to `L` / `h` / station failures.** If a later change gives
  the plots a fallback domain, « Portée invalide — aucun tracé possible » becomes dead copy nobody
  removes.
- The `<noscript>` surface gets **one sentence and that is the whole story** — the engine is client-side
  by contract, so the app cannot degrade further. It had better be right.
