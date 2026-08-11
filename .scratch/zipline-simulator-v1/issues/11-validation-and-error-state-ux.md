# Validation and error-state UX

Type: grilling
Status: open
Blocked by: 08
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
