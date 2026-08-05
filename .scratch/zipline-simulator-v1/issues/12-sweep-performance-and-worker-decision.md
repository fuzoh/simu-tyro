# Sweep performance measurement and the Web Worker decision

Type: task
Status: open
Blocked by: 07
Map: [Zip-line simulator v1](../map.md)

## Question

Measure the sweep, then apply the criterion. Nothing to decide by argument — ticket 03 fixed
the criterion precisely so that this ticket is arithmetic.

> Move the sweep to a Web Worker iff p95 wall time of one full `sweep()` — 240 steps plus
> the end tails, 1000 m span, worst-conditioned case (deep slack or near-taut, where §5.1
> damping and §5.2 retries bite) — exceeds **8 ms**: half a 60 Hz frame, leaving the rest for
> React reconciliation and `d3-shape` path generation.

Do:

1. Measure against the ticket-07 prototype, not a synthetic harness — React reconciliation
   and SVG path generation are inside the frame budget the criterion is set against.
2. Measure `SWEEP_STEPS` at 100, 240 and 500 (§6.2's stated range) so the constant is chosen
   on data rather than inherited from ticket 03's guess.
3. Measure the worst-conditioned cases specifically, not the happy path: deep slack
   (approaching §4.3's `H → 0` floor) and near-taut (`w·L₀/H < 10⁻⁴`, the straight-bar
   branch), where iteration counts and re-seeds are highest.
4. Report p95, not mean — a stutter is a tail event.
5. Apply the criterion and record the answer.

Record whichever way it lands, including the measured numbers: the answer needs to survive
into the build spec, and "we measured 3 ms, main thread is fine" is what stops the question
being reopened on feel later.

## Context

Graduated from the map's fog. Ticket 03 decided the engine is **synchronous and pure
forever**, with async confined to the `useSweep(params) → { status, steps, envelopes, stale }`
seam — so this ticket cannot change the engine's shape, only what sits behind that hook.

If it lands on "worker": terrain already crosses as cloneable data
(`Terrain = { kind: "flat" } | { kind: "profile"; xs; zs }`), which was chosen in ticket 03
precisely to keep this option open. Nothing else in the sweep's inputs or outputs is a
closure.

If it lands on "main thread": the coarse-live/fine-on-release fallback stays unbuilt, and the
hazard that ruled it out (a coarse sweep can miss the worst clearance point and flash a green
verdict) is worth carrying into the spec as a warning against reintroducing it casually.
