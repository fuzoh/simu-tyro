# Validation and error-state UX

Type: grilling
Status: open
Blocked by: — (08 resolved 2026-08-11)
Map: [Zip-line simulator v1](../map.md)
Reads: [ticket 04](./04-span-and-rigging-parameter-model.md) §7 — the two-tier split is fixed
(form owns non-physical checks, engine owns physics), including which rules land in which tier.
This ticket owns only how each state *renders*, plus the §10.4 blocking-error path.

## Question

What does the user see for each way this app can refuse to give an answer?

Graduated from the map's fog once
[Engine API, execution model and module layout](./03-engine-api-execution-model-and-module-layout.md)
fixed the failure taxonomy — the set is now closed and enumerable, which is what makes this
ticketable. Blocked by the results panel, because most of these states render *in place of*
a result.

Settle the presentation for each, in French, and where it appears (inline on the field, on
the chart, in the results panel, or as a blocking dialog):

1. `invalid-input` — a non-finite or non-positive geometry/material value. Field-level, and
   presumably prevented rather than reported.
2. `no-convergence` — the Newton solve gave up after §5.2's five re-seeds. Carries
   `attempts` and the final `residual`; decide whether the residual is shown (it is
   meaningful to a rigger: "3e-4 m, needed 1e-6") or hidden as noise.
3. `slack-limit` — §4.3's `H → 0`. The line is effectively lying on the ground. Is this an
   error or a legitimate "your line is far too slack" reading?
4. `contact: "rider"` — clearance negative, the rider strikes the ground. This is a
   *result*, not a failure: the chart still draws. How loudly does it fail?
5. `contact: "cable"` — the cable itself is in the dirt. Strictly worse than the above.
6. `coverage < 1` — a partial sweep. §10's verdict is computed from an incomplete envelope
   and **must not render as green**. Decide what a degraded verdict looks like, and the
   threshold below which no verdict is offered at all.
7. **Use-class rejection** — §10.4's hard gate: `PERMANENT` plus a textile Material Spec.
   Not a computation failure at all; the input combination is disallowed. Decide whether the
   textile option is disabled, or selectable-then-rejected with an explanation.
8. `L₀` below the physical floor — §5.4 notes `L₀ < chord/(1+T_break/EA)` needs tension above
   breaking. Note this straddles the engine/safety split decided in ticket 03: the solve
   itself succeeds and returns an enormous `H`, so this surfaces as a safety verdict, not a
   solver error. Confirm that is the right user-facing framing.

Also settle: do the `SolveNote`s (`near-taut-fallback`, `damped`, `reseeded`) surface to the
user at all, or are they diagnostics for a dev-only panel?

## Context

Failure taxonomy: ticket 03's answer, §6. Theory §4.3, §5.4, §10.4, §11.
The provenance-warning language lands in the results panel — ticket 08 — so match its tone
rather than inventing a second warning idiom.

**Inherited from [CSV profile import](./06-csv-profile-import-and-anchor-placement.md)** —
three things, one of them a structural problem this ticket has to solve.

**1. The derived-value attribution problem (§7).** Ticket 04 hung every hard range on a
**field**: `L > 0` finite, `h` finite. But in imported mode `L` and `h` are *derived read-outs*
— so those checks have nothing to attach to, and yet they must still run. They have to be
evaluated on the derived values and **attributed back to whichever station field can fix them**.
Concretely: `station B = station A` yields `L = 0`, reaches `solveSpan`, and returns
`invalid-input{field:"L"}` pointing at a field the user cannot edit. Ticket 04's two-tier split
(form checks what needs no physics; the engine owns §5.4's chord bound) survives intact — but
tier one now needs a notion of *which input is culpable for a derived value*, which it did not
before. This generalises past terrain: any read-out under **Valeurs déduites** can go
out of range while every editable field is individually valid.

**2. Blocking errors carrying a one-click fix.** Ticket 06 chose
`⛔ L doit être > 0 — l'ancrage B est avant l'ancrage A.  [ Inverser A et B ]` over silently
auto-normalising, because auto-swapping A and B flips `h`'s sign — the same
no-silent-reinterpretation rule ticket 04 applied at the §10.4 family gate. Ticket 04 also gave
the family switch a one-click fix. That is now **two instances**, so this ticket should decide
whether a fix-action is a general affordance of the error component or an ad-hoc addition per
error.

**3. The import failure taxonomy**, which needs a home in whatever error surface this ticket
designs — it is a file-level failure, so it belongs to neither the form nor the engine:

| Kind | French copy |
| --- | --- |
| `colonnes-manquantes` | « Colonnes Distance et Altitude introuvables. » |
| `aucune-donnée` | « Le fichier ne contient aucune ligne de données. » |
| `trop-peu-de-points` | « Au moins 2 points sont nécessaires. » |
| `valeur-non-numérique` | « Valeur illisible ligne 47, colonne Altitude. » |
| `distance-non-croissante` | « La distance décroît à la ligne 112. » |
| `distance-dupliquée` | « Deux altitudes à la même distance, ligne 88. » |
| `lecture-impossible` | « Impossible de lire le fichier. » |
| *(non-blocking)* | « ⚠ Distances peut-être en km plutôt qu'en mètres ? » |

Also settled there and not re-openable: a typed station outside the trace **blocks**, while a
dragged marker **clamps** — so the same constraint has a blocking presentation on one input path
and no error state at all on the other. Worth checking that this ticket's error model can express
that asymmetry, since ticket 07 established the same split for rider position.

**Inherited from [Results panel](./08-results-panel-and-provenance-warnings.md)** — four things,
two of which *close* questions this ticket was asking.

**1. Item 6 is answered, not this ticket's to decide.** `coverage < 1` yields a fifth verdict
state, **« Indéterminé — 209 des 240 pas résolus »**, which **suppresses** the verdict instead of
degrading it — so the "threshold below which no verdict is offered" question dissolves: there is
no threshold, any `coverage < 1` is indeterminate. The reasoning is worth carrying: the steps
that fail to converge are the ill-conditioned ones, which is where the worst tension lives, so a
verdict on the solved 87 % is biased optimistic *by construction*. It is also explicitly **not**
routed here as a solve failure — a partial sweep is a complete solve of an incomplete traverse —
so this ticket renders it as a *verdict* state, styled as neither pass nor fail, with the
converged margins still shown under the traverse-scope caveat.

**2. Item 2 of this ticket's §2 is answered too.** Regime-disabled-by-`Type d'installation` is now
a **third** blocking-error-with-one-click-fix instance (after ticket 04's family gate and ticket
06's `Inverser A et B`). Three instances settles it: the fix-action is a **general affordance of
the error component**, not an ad-hoc addition per error.

**3. Five verdict states to render**, and the banner is one sentence naming the governing
criterion:

| État | Action de l'utilisateur |
| --- | --- |
| Dans les limites | rien |
| Marge faible (`FS_eff < 1,1·k`) | augmenter la marge |
| Hors limites | changer la conception |
| **Refusé — usage interdit** | changer la quincaillerie |
| Indéterminé | aucun chiffre disponible |

`Refusé` is the one to be careful with: it is **§10.2's grips prohibition surviving an ample
margin** — `FS effectif 8,0` against `k = 3` and still refused — so it is neither `Hors limites`
(nothing about limits is at issue) nor a loud warning above a pass. The three passing/failing
states must be visually distinct from each other; `Marge faible` is **not** green with a note.

**4. The warning ladder is three tiers and thinner than this ticket's item list implies** —
`ambiant` (plain text, no ⚠: textile `k` out of band, which fires *always* on zip lines, so an
alarm would mean nothing) · `avertissement` (⚠ inline on the row: > 30 % MBL, `flèche/portée`
< 3 %) · `verdict` (the banner). Of sub-question 6's original six items, span-outside-50–2000 m is
ticket 04's form warning, HMPE knots never reach a warning (ticket 05 disables the option), and
only the solver failure modes are this ticket's. Match the tone: the verdict never says
« conforme »/« non conforme » and always names the chosen regime inside the sentence — a second
error idiom that claimed conformity anywhere would undo that.
