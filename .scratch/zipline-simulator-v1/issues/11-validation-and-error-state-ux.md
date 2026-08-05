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
