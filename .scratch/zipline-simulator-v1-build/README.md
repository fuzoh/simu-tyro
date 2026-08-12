# Scoutech v1 — build backlog

Execution of [the v1 build spec](../zipline-simulator-v1/spec.md), **as amended** by
[AMENDMENTS.md](./AMENDMENTS.md) — read that first, it supersedes the spec in four places. One ticket
per stage of the spec's **§ 10 — Implementation order**, plus one the amendments added: **29 tickets**
in `issues/`, numbered in stage order.

## The four amendments, in one line each

| | Amendment | Lands on |
| --- | --- | --- |
| **A** | Vitest is **unit-only** — `node` environment always, no component tests, `jsdom` and `@testing-library/*` removed | 01, 20, 21, 22, 26, 27 |
| **B** | **`agent-browser`** owns point-to-point app testing, and takes over § 10 A12's five manual re-checks | **29** (new), 22, 26, 27, 28 |
| **C** | TanStack versions are the **actual latest, still pinned** — with a re-probe of § 8's five measured behaviours | 15, 22 |
| **D** | **`@tanstack/react-form`** for forms, **valibot** for data validation — valibot replaces the hand-rolled `validateSearch` under § 8's four unchanged rules | 15, 18, 20, 21, 24, 26 |

**The spec is the contract.** These tickets carry the stage's deliverable, its gate and the
non-obvious constraints that stage would otherwise get wrong — they never restate the spec's
tables. Where a ticket says « voir § N », open the spec.

## Where this comes from

Planning happened on [the wayfinder map](../zipline-simulator-v1/map.md): sixteen decision
tickets, all resolved, frontier empty. Nothing in this backlog re-opens a decision. If a stage
turns out to need one, that is a new question and belongs on a map, not in a build ticket.

## Standing rules that outlive any one ticket

- **The fixture is written first and fails, then the module makes it pass.** `docs/simulation-theory.md`
  §15 is the TDD seed set, one group per engine stage. No stage is finished with a red case from
  an earlier one.
- **Never transcribe a value from `docs/references/`** — §14 records which worked examples are
  fabricated. §15 or a `[MEASURED]` ticket citation, nothing else.
- **`src/routes/-prototype-07/solver.ts` is never lifted into `src/lib/sim/`.** The prototype is a
  primary source for *measurements*, not a head start on code — voir § 10 P3.
- Gate every stage on `bun run typecheck` and `bun run lint-type-aware` (`AGENTS.md`).
- Never edit `src/routeTree.gen.ts`; never hand-write `src/components/ui/**`.
- **Vitest is unit-only, `node` environment.** If a check needs a DOM or a layout, it is not a Vitest
  case — it belongs to [ticket 29](./issues/29-agent-browser-point-to-point-pass.md).
- **Valibot lives at the boundaries only** — URL, CSV, forms, Session. **Never inside `src/lib/sim/`**:
  the engine stays dependency-free and its §15 fixtures stay free of schema stubs.
- **The engine owns physics validation, the form owns tier one.** §5.4's chord bound is never
  re-derived in a form validator, and the three gates are cross-field predicates over the derived
  Scenario, not per-field validators.

## Stage order and dependencies

| # | Stage | Ticket | Blocked by |
| --- | --- | --- | --- |
| 01 | P0.1 | Test harness and the `testing.md` diff (unit-only, `node`) | — |
| 02 | P0.2 | The §15 fixture module | 01 |
| 03 | E1 | `types.ts` — the frozen engine declarations | 01 |
| 04 | E2 | `catenary.ts` — §4.1 geometry and `sampleCable` | 02, 03 |
| 05 | E3 | `jacobian.ts` — §4.2 analytic partials | 04 |
| 06 | E4 | `solve.ts` — the damped Newton solver | 05 |
| 07 | E5 | `loads.ts` — the point load and §6.1 | 06 |
| 08 | E6 | `sweep.ts` — the rolling sweep and `coverage` | 07 |
| 09 | E7 | `terrain.ts` + `clearance.ts` — §11 ground clearance | 08 |
| 10 | E7b | The bench, ported out of the prototype | 09 |
| 11 | E8 | `materials/steel.ts` and `materials/textile.ts` | 03 |
| 12 | E9 | `parameterise.ts` — §7 inverse modes | 06, 11 |
| 13 | E10 | `verdict.ts` — §10 regimes and the criteria × ends grid | 08, 11 |
| 14 | E11 | `index.ts` — the public barrel | 04–13 |
| 15 | A0 | Pin versions (actual latest) + re-probe the five router behaviours | — |
| 16 | A1 | `FIRST_RUN_SCENARIO` and its formatted-string lock | 14, 15 |
| 17 | A2 | Quantity formatting — the display-precision table | 15 |
| 18 | A3 | CSV parse → `Trace`, and the seven parse failures | 09, 15 |
| 19 | A4 | `url/p1.ts` — the trace payload codec | 17, 18 |
| 20 | A5 | `url/schema.ts` — `validateSearch` and the salvage table | 16, 17, 19 |
| 21 | A6 | `session/session.ts` — the `localStorage` Session | 15, 16 |
| 22 | A7 | The app shell — one route, `ssr: false`, the Skeleton | 20, 21 |
| 23 | A8 | The Chart Block — `SharedX`, both charts, VE | 14, 16, 22 |
| 24 | A9 | The Rail's input half and the three gates (TanStack Form + valibot) | 17, 23 |
| 25 | A10 | The Rail's output half — `Résultats`, verdict, provenance | 13, 24 |
| 26 | A11 | The error surfaces — banner precedence and the refusals | 25 |
| 27 | A12 | Narrow-screen reflow | 26 |
| 28 | P3 | Delete the prototype | 02, 10, 29 |
| 29 | A13 | The `agent-browser` point-to-point pass | 27 |

Three cross-stage couplings that the table cannot show, all argued in § 10 P2:

- **A2 before A4 and A5, and A1's *test* after A2.** Display precision is load-bearing *state*,
  not formatting — a prefill writes the **displayed** value into state, and the stale-Override
  badge compares at display precision. So A1's ticket ships the constant; the eleven frozen
  strings only lock once A2 exists.
- **A9 wires its gates field by field**, not as a later pass, and « régime choisi » is **struck**
  from the solve tier — so the app must open verdict-less and still compute. That is a property of
  how A9 is built, not something A11 bolts on.
- **A13's measurements *are* P3's deletion gate.** They can only be taken while the prototype still
  stands — which is why the last build ticket blocks the deletion ticket, not the other way round.
- **Ticket 15's five router re-probes gate A7 onward.** If one comes back changed, that is a § 8
  decision to re-open on a map, not a version to nudge.
