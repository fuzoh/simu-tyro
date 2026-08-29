# Scoutech v1 — build backlog

Execution of [the v1 build spec](../zipline-simulator-v1/spec.md), **as amended** by
[AMENDMENTS.md](./AMENDMENTS.md) — read that first, it supersedes the spec in seven places. One ticket
per stage of the spec's **§ 10 — Implementation order**. Original final three tickets were split for
fresh-context delegation on 2026-08-13: **36 tickets** now live in `issues/`, numbered in dependency
order.

**37 and 38 are review tickets, not build stages.** They come from the post-v1 algorithmic code
review of 2026-08-15 (fixed point = root) and amend what tickets 06, 09, 11, 13 and 25 delivered:
[37](./issues/37-engine-correctness-fixes.md) carries the five confirmed defects — one of which makes
the garde read-out optimistic — and [38](./issues/38-engine-review-refinements.md) the dedupe and
shape judgement calls. The review re-derived the § 15 fixtures independently and **every value
reproduces**; neither ticket questions the solved shape.

**39 is an investigation ticket.** [39](./issues/39-clearance-strip-investigation.md) opened the
« Garde au sol » strip — a reported *surprising curve* and *wrong-looking scale*. The curve's W is
measured as physical **and as a property of straight two-point terrain**: it reproduces on a textile
line and on none of the three imported profiles, where the garde has one interior minimum off
mid-span. The scale is now **quantised with a permanently reserved negative band** (`clearanceDomain()`
in `contract.ts`), so the zero line no longer sits on the frame's bottom edge and no longer jumps when
the first step goes negative. **Only item 5 remains open**, blocked on
[37](./issues/37-engine-correctness-fixes.md): the §11 scan's noise is *visible* in the drawn curve —
55 direction reversals where the shape has two — and re-measuring it before 37 lands would date the
figure.

**42–46 are the second algorithmic review's tickets, opened 2026-08-29** (point fixe = racine, revue
de correction algorithmique sur `src/lib/sim/**` et ses consommateurs). Le solveur lui-même est
re-vérifié et **toutes les valeurs de § 15 reproduisent** (F1, Z1–Z7), le Jacobien § 4.2 différencie
bien son résidu, `unloadedSag` est la solution exacte de `V(s) = H·h/L`, et le réducteur § 11 tombe à
**0,7 mm** d'un balayage de référence à 4 000 points sur terrain droit et à **0,05 mm** sur un profil
accidenté. Rien ici ne conteste la forme résolue. Ce que la revue a trouvé :

- [42](./issues/42-eta-termination-efficiency-unbounded.md) — **`η_t` n'a pas de plafond.** Saisir
  « 90 » au lieu de « 0,90 » — la faute de qui lit « ≥ 90 % MBF » dans § 10.2 — fait passer la ligne
  livrée de « Hors limites » à « Dans les limites » avec un `T adm` **neuf fois** la charge de
  rupture. Le seul défaut de la série qui retourne un verdict.
- [43](./issues/43-headline-fs-reads-the-wrong-end.md) — la ligne de tête « FS effectif » lit
  l'ancrage le plus **tendu**, qui n'est pas le moins **favorable** dès que `η_A ≠ η_B` : 9,78 en
  tête contre 6,24 dans la cellule qui décide.
- [44](./issues/44-governing-cell-ranks-fs-not-margin.md) — `governingCell` départage sur `FS` brut
  et non sur la marge `FS / k`, donc sous WorkSafe QLD le bandeau nomme le critère qui n'est pas le
  plus contraignant. **Le cas se produit sur la ligne livrée**, et un test le fixe comme attendu.
- [45](./issues/45-near-taut-fallback-drops-point-loads.md) — le repli § 4.3 jette les charges
  ponctuelles et rend `ok: true` sur un résidu de 76 mm, soit 76 000 × la tolérance § 5.3.
- [46](./issues/46-steel-k-docblock-cites-refuted-triple.md) — le docblock de `STEEL.K` cite comme
  `[STD-ATTESTED]` le triplet 6 mm que § 14 #21 réfute. Provenance seule ; aucun nombre ne bouge.

42, 45 et 46 sont `ready-for-agent` ; 43 et 44 sont `ready-for-human`, parce que chacun remet en
cause une phrase que § 6 fixe explicitement.

**41 re-opened the strip's *quantity*, not 39's reading, and closed 2026-08-17.**
[41](./issues/41-clearance-curve-plots-the-envelope.md) came from a second user report of the same
day: the curve rises while the passenger descends at both ends, the dimension line is not under the
passenger, the y axis tops out at 10 m on a line whose passenger arrives 17,9 m above the ground, and
the curve goes flat while the passenger climbs three metres. **One cause:** the strip plots § 11's
*inner minimum over the whole line* on an axis that reads « selon la position du passager ». The
engine is right and 39's W is still physical. **The curve kept its quantity** — putting the garde
under the passenger on the same linear axis is refuted by measurement, not by layout: on
`example-profile-trace1.csv` at ancrages 12 / 2 every one of the 260 rider positions violates, the
envelope minimum runs −0,36 m against a ridge while the passenger flies a valley at +62,6 m, and one
shared domain leaves the zero crossing **0,2 px** tall at the reference column. What landed instead is
**shape B+**: the strip's caption, `aria` and the read-out cell now name the *line's* minimum
(« Garde min. ligne »), and the passenger's own garde is drawn where it is metrically true — a second
clearance dimension on the **profile** at `x_D`, self-hiding under the same
`max(1 m, 1 % de la portée)` bit that relabels the cell. It carries **amendment M**, because § 5 fixes
both caption strings verbatim and the cell's label in five places. `src/lib/sim/**` untouched.

**40 is a presentation ticket.** [40](./issues/40-ui-coherence-and-shadcn-density.md) is the UI
coherence pass — eight DOM text sizes, a `font-mono` bound to no loaded font, fifteen hand-rolled
buttons beside a `src/components/ui/` holding one component nobody renders, and an un-tokenised
warning colour. It settles **one density scale** and moves the chrome onto **shadcn components in
their small variants**. It changes nothing in `src/lib/`, and it does **not** re-open the five
load-bearing sizes it lists — amendment G's 16 px numeric field and § 5's 44 px touch budget
foremost.

## The fourteen amendments, in one line each

| | Amendment | Lands on |
| --- | --- | --- |
| **A** | Vitest is **unit-only** — `node` environment always, no component tests, `jsdom` and `@testing-library/*` removed | 01, 20, 21, 22, 26, 27 |
| **B** | **`agent-browser`** owns point-to-point app testing, and takes over § 10 A12's five manual re-checks | **29–35**, 22, 26, 27, 28, 36 |
| **C** | TanStack versions are the **actual latest, still pinned** — with a re-probe of § 8's five measured behaviours | 15, 22 |
| **D** | **`@tanstack/react-form`** for forms, **valibot** for data validation — valibot replaces the hand-rolled `validateSearch` under § 8's four unchanged rules | 15, 18, 20, 21, 24, 26 |
| **E** | The refusal is a **rendered state, not a thrown error** — C's re-probe found a thrown `validateSearch` now answers 500, so the throw goes and **200 survives** | 20, 22, 26, 29 |
| **F** | § 5's plot height is **capped at the reference chart column** (`min(0,42 × W_inner , 463,68 px)`) — nothing at or below the reference desktop moves, the block is bounded, and the **peek control is re-enabled where the cap is what cuts the cable** | 28, 29, 30 |
| **G** | § 5's keyboard piece 2 is **gated on `visualViewport.scale`** — a pinch is no longer read as a keyboard — and the Rail's numeric fields go to **16 px** so iOS no longer auto-zooms them | 28, 35, 27, 29 |
| **H** | § 5's **`pinned + x`** row is read **literally**: it keeps its caret through the first press, and every control in the 44 px row is a legal touch target — **no sentence of § 5 changes**, the tree was failing claims § 5 already makes | 27, 35 |
| **I** | The published first-run **VE is ×1,86**, not ≈ ×1,5 — the spec's figure was arithmetic from two superseded inputs; the app was right and the line was stale | 30, § 13, `testing.md` |
| **J** | Two § 7 scrub-track readings, settled together: « Aucun résultat » **keeps its track** (inertness is scoped to *L'exception géométrique* and « Saisie en cours »), and **a scrub is a prefill** — `roundToDisplay("x_D", …)` | 31, 26 |
| **K** | The keyboard's **focus-into-view belongs to the platform** — the focus-then-inset ordering is accepted, not fixed | 35 |
| **L** | The app ships **no mono face**, and **B1 moves to 624 px** — the normative type, radius, colour and control rules move to [`docs/conventions/ui.md`](../../docs/conventions/ui.md) | 40, 23 |
| **M** | The strip's curve names the **line's** minimum (« Garde min. ligne », captions and `aria` verbatim), and the **rider's** garde is a second, self-hiding dimension line on the **profile** at `x_D` | 41, 23, 25 |
| **N** | In **`compact`** the banner slot and the read-out slot are two cells of **one** row, so **the banner is the cause line** — the chevron-only read-out under « Aucun résultat » is correct, and a valueless « Garde min. ligne » is rejected. **No code changed** | 31 |

**A–D are 2026-08-12; E is 2026-08-13; F and G are 2026-08-14; H–K are 2026-08-15; L is 2026-08-16;
M is 2026-08-17; N is 2026-08-28**, and F and G each carry more than one user decision, recorded beside
the cost they close rather than as letters of their own. Amendment F's costs 2 and 3 and amendment G's
decision 5 are **settled**, not open questions.

**H, K and N change no code and no string** — each is a *reading* of the contract recorded so the
question stops being re-opened: H and K found the tree failing claims the spec already made, and N
rules the `compact` read-out slot correct as shipped. **J changed one line of code and two headings**;
the headings are the reason ticket 26's « Saisie en cours » bullet carries a correction note rather
than the rule it was written with.

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
  case — it belongs to browser tickets [29–35](./issues/29-responsive-layout-browser-evidence.md).
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
| 27 | A12.1 | Pinned Safety Header for Rail navigation | 26 |
| 28 | A12.2 | Constrained-height and keyboard safety modes | 27 |
| 29 | A13.1 | Responsive-layout browser evidence | 28 |
| 30 | A13.2 | Chart-fidelity and drag-performance evidence | 28 |
| 31 | A13.3 | Shell and suppressed-output browser pass | 26 |
| 32 | A13.4 | Shared-link browser pass | 26 |
| 33 | A13.5 | Trace lifecycle browser pass | 28 |
| 34 | A13.6 | Material and regime browser pass | 26 |
| 35 | A13.7 | Narrow-keyboard browser pass | 28 |
| 36 | P3 | Retire the profile prototype | 02, 10, 29, 30 |

Three cross-stage couplings that the table cannot show, all argued in § 10 P2:

- **A2 before A4 and A5, and A1's *test* after A2.** Display precision is load-bearing *state*,
  not formatting — a prefill writes the **displayed** value into state, and the stale-Override
  badge compares at display precision. So A1's ticket ships the constant; the eleven frozen
  strings only lock once A2 exists.
- **A9 wires its gates field by field**, not as a later pass, and « régime choisi » is **struck**
  from the solve tier — so the app must open verdict-less and still compute. That is a property of
  how A9 is built, not something A11 bolts on.
- **A13.1 and A13.2 measurements *are* P3's deletion gate.** They can only be taken while the
  prototype still stands. Functional browser passes 31–35 do not gate deletion; only evidence that
  dies with artifact does.
- **Tickets 31, 32 and 34 can start immediately.** Their desktop journeys do not depend on A12;
  responsive and keyboard passes 29, 30, 33 and 35 wait for ticket 28.
- **Ticket 15's five router re-probes gate A7 onward.** If one comes back changed, that is a § 8
  decision to re-open on a map, not a version to nudge.
