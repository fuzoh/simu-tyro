# Amendments to the v1 build spec

**Opened 2026-08-12, by the repo owner**, with four decisions taken *after*
[the spec](../zipline-simulator-v1/spec.md) was assembled; **A–D** are those four. **E** was added
2026-08-13 on ticket 15's re-probe, and **F** and **G** on 2026-08-14 during A12. **H–K** were taken
2026-08-15, closing the last open decisions of the v1 build: the `pinned + x` row (**H**), the
published first-run VE (**I**), § 7's two scrub readings (**J**), and the keyboard's focus-into-view
with its companion ruling on `contract.test.ts` (**K**). **L** was taken 2026-08-16, on ticket 40's
UI-coherence pass, and moves § 5's B1 threshold. **M** was taken 2026-08-17, on ticket 41's second
strip report, and moves § 5's two strip captions, the read-out cell's label and its Layers list. They
**supersede** the spec where they collide, and the spec's affected paragraphs point here. Everything
else in the spec stands.

This file is the single source of truth for **all thirteen**. Do not copy their content into a ticket —
tickets link here. A build decision that amends the spec gets a letter here; one that only records
how a ticket was executed does not.

**The five user decisions of 2026-08-14 live in two letters, not five.** Chronologically: the zoom
gate (**G**), the plot cap (**F**), the short-laptop pin (**F**, cost 3), the peek re-enable
(**F**, cost 2) and the 16 px Rail fields (**G**, decision 5). Three of them close a cost the other
two opened, so they are recorded beside that cost rather than as letters of their own.

---

## A · Vitest is for unit tests only. No component tests.

**Supersedes** § 11's *App-layer tests* paragraph beginning « Component tests that do need a DOM »,
the per-file jsdom guidance in § 10 P0 and § 11's environment diff item, and the front matter's
« Vitest 4 + jsdom per file ».

- **The Vitest environment is `node`, always.** No `@vitest-environment` docblocks, no
  `@vitest-environment-options`, no per-file DOM.
- **Drop `jsdom`, `@testing-library/react` and `@testing-library/dom`** from `devDependencies`. They
  have no remaining consumer, and left installed they invite exactly the tests this amendment removes.
- `docs/conventions/testing.md`'s « Vitest 4 with jsdom » and « React component tests use
  `@testing-library/react` » lines are **deleted**, not softened.

**What this costs, stated plainly.** § 11 had already ruled that jsdom cannot decide layout, so no
layout coverage is lost — every pixel number was always a browser measurement. What *is* lost is
DOM-shape coverage of four states, which now have no automated check in CI: the Skeleton's content,
the refusal page at 200, « Saisie en cours », and « Aucun résultat ». Amendment B gives them a new
owner. **A state nobody scripts there is a state nobody checks** — that is the trade, and it is
deliberate.

**What this buys, and it is not only a subtraction.** Two seams have to become pure to stay testable,
and both are better for it:

1. **The dropped-keys reporter takes the raw query string as a parameter**, rather than reading
   `window.location` itself. That was the *only* reason § 11 wanted an
   `@vitest-environment-options` URL, and as a pure function it is a plain unit test.
2. **`readSession` / `writeSession` take the storage object**, rather than reaching for
   `localStorage` directly. Round-trip and version-key cases then need no DOM either.

Neither changes a decision — both are how the same rules survive a `node`-only suite.

---

## B · `agent-browser` owns point-to-point app testing

An agent drives the real app in a real browser. This is not a replacement for the unit suite; it
owns what the unit suite structurally cannot see.

- **A13 is delegated across [tickets 29–35](./issues/29-responsive-layout-browser-evidence.md).**
  Tickets 29–30 capture prototype-dependent evidence; tickets 31–35 own bounded browser journeys.
- Tickets 31–35 **inherit the four states** amendment A left without a check, plus the end-to-end
  walkthroughs no unit test spans (a link arriving, an import, a family flip, a régime chosen).
- Tickets 29–30 **take over § 10 A12's five « manual re-checks ».** `agent-browser` has a real layout
  engine, so the three pixel budgets, the banner heights, the View Strip's label widths, the
  first-run VE and the drag frame time become **scripted and repeatable** instead of hand-taken.
  This strictly improves them: the spec called them manual because it had no way to automate them.
- Ticket 36's deletion gate is unchanged in substance — it still requires those measurements — but
  they now arrive from scripts, and the scripts survive the prototype.

---

## C · TanStack versions: the actual latest, pinned

**Amends** § 13's *Shell, routing and versions* decision and ticket 15's version table. The
*mechanism* survives untouched — **pin exact versions, never `latest`** — only the chosen versions
change.

Published latest, resolved 2026-08-12:

| Package | Spec's measured version | Actual latest |
| --- | --- | --- |
| `@tanstack/react-router` | 1.170.18 | **1.170.27** |
| `@tanstack/react-start` | 1.168.34 | **1.168.44** |
| `@tanstack/router-plugin` | 1.168.23 | **1.168.30** |
| `router-core` (transitive) | 1.171.15 | record what `bun install` resolves |
| `start-server-core` (transitive) | 1.169.17 | record what `bun install` resolves |

**This is a patch bump, not a divergence** — which is the whole reason it is cheap. But § 8 rests on
five *measured* behaviours that contradict the documentation and are invisible to app code, so the
version change carries a **re-probe obligation, not an assumption**:

1. `{ key: undefined }` still makes the **server** 307-strip the key, even under `ssr: false`.
2. `defaultSsr` in `src/router.tsx` is still a silent no-op.
3. `Route.useSearch()` still returns raw ∪ validated at runtime while typed validated-only.
4. A thrown `validateSearch` still yields **200** under `ssr: false` (and 500 with SSR on).
5. `search.strict` still leaves unknown keys in the URL, so the load-time rewrite is still the only
   thing that cleans the address bar.

If any of the five has changed, that is not a version problem — it is a **§ 8 decision to re-open**,
and it belongs on a map, not in ticket 15.

---

## D · TanStack Form for forms, valibot for data validation

New dependencies: `@tanstack/react-form` **1.33.5**, `valibot` **1.4.2**. Both pinned like every
other dependency.

**Supersedes** § 8's « `validateSearch` is **hand-rolled — no zod** ». Valibot replaces the
hand-rolled parser. **The validator's four hard rules are unchanged and now constrain how valibot
may be used:**

- **No `transform`, anywhere in a URL schema.** `v.pipe(v.string(), v.transform(Number))` *is* the
  coercion the 307 measurement forbids — returning `String(1)` for `bad=1` produced a redirect. URL
  schemas validate shape and **return the value untouched**.
- **No range checks at the URL.** The URL is a **typing boundary, not a validation boundary**: an
  out-of-range but representable value is **valid** here and lights up the form's own validation
  later. `v.minValue` / `v.maxValue` do not appear in a URL schema.
- **Per-key salvage, not valid-or-throw.** One schema **per key**, applied per key, collecting the
  ignored ones — never one object schema that fails whole. Only the three refusal classes throw:
  unknown `v`, `tr` undecodable or oversize, two tightness drivers present.
- **Omit, never `undefined`**, and stay **synchronous and cheap** — it runs 3× per request.
  `v.safeParse` is sync, which is what makes valibot admissible here at all; `parseAsync` is not.

**Valibot lives at the boundaries only — URL, CSV, forms. Never inside `src/lib/sim/`.** The engine
stays dependency-free and its §15 fixtures stay free of schema stubs. Engine types remain plain
TypeScript declarations.

**TanStack Form owns the Rail's field state**, with two boundaries that are not negotiable:

- **The three gates are not form validators.** Solve / Clearance / Verdict are **cross-field
  predicates over the derived Scenario**; a form validator is per-field and would split one gate
  across seventeen fields, which is the « one rule living in two places » failure the spec spent § 7
  avoiding. Form validators own **exactly tier one** — what needs no physics.
- **§5.4's chord bound stays in the engine.** No form validator re-derives it, and « Tension
  impossible » remains an engine refusal surfaced by the UI, not a field error.

Three things this actively improves:

1. **« Saisie en cours » becomes library state.** `field.state.meta.isTouched` / `isBlurred` give the
   rule its focus-scoping directly — and § 13 flagged that rule as *untestable through the store
   alone*. As form state it is unit-testable, so amendment A costs it nothing.
2. **« nombre illisible » gets a natural home.** Field values are strings; the string→number step is
   an explicit schema step, and its failure *is* that message — the state `inputMode=decimal` creates.
3. **Valibot's `issues` carry paths**, which the culprit table (quantity × mode) and the 17-row
   message table map onto cleanly. **The French strings stay the spec's** — valibot's default messages
   never reach the UI.

One trap: **TanStack Form marks every field touched on submit**. This app has **no submit** — it is
live and continuous — so nothing may depend on that transition. Anything keyed on `isTouched` must
work without it ever firing.

---

## E · The refusal is a rendered state, not a thrown error — 200 survives

**2026-08-13, by the repo owner**, on the evidence of [ticket 15](./issues/15-pin-tanstack-versions.md)'s
re-probe. **Amends** § 8's refusal mechanism and the parts of § 7 and § 13 that name an
`errorComponent`. It changes **no user-visible behaviour** — that is the whole point of it.

**What the re-probe found.** Amendment C's probe 4 came back **changed**: on the pinned tree, a thrown
`validateSearch` under `ssr: false` answers **HTTP 500**, where the tree § 8 measured answered 200.
Reproduced in dev and on a production build. TanStack rewrote the load path (`load-matches.js` →
`load-server.js`) and `applyFailure` now returns `status: 500`. This is not a version to nudge.

**The decision.** § 8 elected `ssr: false` partly *because* the refusal arrived at 200; § 7's refusal
copy (« nothing failed to load and the status line agrees ») rests on it, and § 13's crawler and
link-preview thin spot is written around it. Those commitments are kept. The **throw** is what goes.

- **`validateSearch` no longer throws** for § 8's three refusal classes — unknown `v`, `tr`
  undecodable or oversize, two tightness drivers present. It **salvages the refusal into the
  validated search** as a `refused` marker carrying the existing `RefusalKind`, and returns normally.
- **The index route renders the refusal surface as an ordinary component** when `search.refused` is
  set — still after a Skeleton frame, still leaving the shell and the back button intact, still the
  *index* route and never the root's. The status is **200** because nothing failed.
- **`LinkRefusal` survives as the carrier**, not as a thrown control-flow device: the kind, the
  message and `received` are what the marker holds, so the `node` unit tests keep asserting the
  refusal with no router in the room.
- **The other three probes are unchanged** and § 8's four validator rules (no `transform`, no range
  checks, per-key salvage, omit-never-`undefined`, synchronous) bind exactly as before. A refusal is
  still whole-link — it is checked on the **raw** bag before per-key salvage, and it suppresses the
  rest of the screen rather than merging with it.

**What this costs.** § 8's sentence naming the index route's `errorComponent` as the refusal's owner
is **struck**; the route may still declare one for genuine load failures, but no refusal reaches it.
Anything that asserted « a thrown `validateSearch` » as the mechanism now asserts the marker.

**Lands on** tickets **20** (rework: salvage instead of throw), **22** (render the refusal surface
from `search.refused`), **26** (banner precedence and the refusals), **29** (the walkthrough asserts
**200**, and it now genuinely is one).

---

## F · The plot's height is capped at § 5's reference chart column

**2026-08-14, by the repo owner**, on the evidence of
[ticket 28](./issues/28-constrained-height-and-keyboard-modes.md)'s item-1 browser verification.
**Amends** two paragraphs of § 5:

1. its aspect rule — *The layout contract — every band height is a function of width* — and therefore
   the single rule that spans 390 px and 1440 px;
2. *The ×1 floor is its own disclosed badge state*, whose « the third row is reachable **from the
   data, not from the box** » and « **the picture is never cut without the banner saying the line is
   on the ground** » stop holding **above** the reference column. Under the cap the clip is
   box-reachable on a healthy line — measured, and the whole of **cost 2** below.

It changes **nothing at or below § 5's reference desktop**: all three pixel budgets, their letterbox
margins and every narrow-screen number are byte-identical.

**What the re-drive found.** § 5 asserts two things that collide above its own reference desktop:
« every band height is a function of the chart column's inner width » — so the plot is
`0,42 × W_inner`, growing linearly and without bound — and budget C's **whole** block at 1440 × 900,
which leaves only a 43 px letterbox. Past 1440 px of viewport the block therefore outgrows any
viewport height, and condition (c) pins. Measured, every ordinary 16:9 desktop opened **with no chart
at all** beside hundreds of pixels of empty chart column: 1280 × 720, 1366 × 768, 1512 × 850,
1600 × 900 and 1920 × 1080 all `pinned` · `tight` with an 88 px header and 632–992 px of blank
column, **1920 × 1080 missing by 1,3 px**. « Afficher le profil » is a no-op there, because (c)
outranks the reveal. Nothing is wrong with the collapse — its arithmetic was exact to the pixel at six
widths. It is the aspect rule having no ceiling.

**The decision.** **The plot's height is `min(0,42 × W_inner, 463,68 px)`** — frozen at the value the
aspect rule reaches at § 5's own reference chart column (a **1152 px** column, `W_inner` **1104**;
`0,42 × 1104 = 463,68`, the figure ticket 29 measured byte-identically at 1440 × {700, 800, 900,
1000, 1200}). One `min()` in the shell's container-query custom properties and one `Math.min` in
`src/lib/layout/contract.ts`, both from the same constant — **no `useMediaQuery` branch, and no chart
dimension derived from a window height**: the rule still reads a width and nothing but a width, so
the Skeleton stays correct before any measurement.

- **Nothing at or below the reference moves.** The `min` is transparent at `W_inner` 342, 432 and
  1104, so budget A (block 540 · rail 124), budget B (561 · 463) and **budget C (856,3 · 43 px of
  letterbox)** are the unclamped rule's own arithmetic. Below B2 the widest column the layout can
  produce is 767 px — a 302 px plot — so the narrow arm cannot reach the ceiling at all.
- **The block is bounded for the first time.** Both width-derived terms have a ceiling now — the plot
  at 463,68 and the strip at § 5's own 200 — so the whole block plateaus at
  `44 + 76 + 463,68 + 200 + 44 + 52` = **879,68 px**, at every width, however wide.
- **VE follows the *obtained* aspect, never the target.** `plotAspect()` is the one function the
  band's height and the badge both read, so a capped plot can no longer be drawn with a z scale built
  for 0,42 — which would have pushed the cable out of the frame while the badge claimed an auto-fit.

**What it buys, measured** (`HeadlessChrome/151.0.0.0`, `agent-browser 0.34.0`, session `capF`, the
shared dev server reused and left running — `curl -s -o /dev/null -w '%{http_code}'` → **200** before
and after; every viewport set with `agent-browser set viewport` and **read back** from
`innerWidth`/`innerHeight`, every row taken after the client mount, geometry from
`getBoundingClientRect()`):

| viewport | colonne | bloc **avant** | bloc **après** | état après | reste | badge VE |
| --- | --- | --- | --- | --- | --- | --- |
| 390 × 664 | 390 | 539,625 | **539,625** | `whole` · `roomy` | rail 124,375 | ×1,9 |
| 768 × 1024 | 480 | 561,438 | **561,438** | `whole` · `roomy` | 462,563 | ×1,9 |
| **1440 × 900** | 1152 | 856,297 | **856,297** | `whole` · `roomy` | **43,703** | ×1,9 |
| 844 × 390 paysage | 556 | 44 (`compact`) | **44** (`compact`) | `compact` · `tight` | — | — |
| 1280 × 720 | 992 | 763,52 | 763,52 | `pinned` · `tight` | 632 vides | — |
| 1366 × 768 | 1078 | 813,40 | 813,40 | `pinned` · `tight` | 680 vides | — |
| 1512 × 850 | 1224 | 898,08 | 867,84 | `pinned` · `tight` | 762 vides | — |
| **1600 × 900** | 1312 | 946,88 | **879,672** | **`whole`** · `roomy` | 20,328 | ×1,6 |
| **1920 × 1080** | 1632 | 1081,28 | **879,672** | **`whole`** · `roomy` | 200,328 | ×1,3 |
| 2560 × 1440 | 2272 | 1350,08 | **879,672** | `whole` · `roomy` | 560,328 | ×1 — vraie échelle |
| **3440 × 1440** | 3152 | 1719,68 | **879,672** | **`whole`** · `roomy` | 560,328 | ×1 · câble hors cadre |

The « avant » column is ticket 28's own measured table where it took the row (1280 × 720 …
1920 × 1080, 2560 × 1440) and the pre-amendment arithmetic where it did not; the app reproduced its
632 px of empty column at 1280 × 720 to the pixel, so the two sessions agree. **Budget C is
identical, digit for digit, to the figure ticket 29 recorded before the amendment existed.**

**The « badge VE » column is the *first-run* scenario and nothing else** — it is the layout that is
being measured here, and VE is a function of the box *and* the line. Read alone it under-states the
clip: it prints « ×1 — vraie échelle » at 2560 px because *that* line still fits, while other perfectly
healthy lines are already cut at that width. Voir cost 2.

**What it costs, stated plainly — three costs, none of them hidden.**

1. **The obtained aspect falls with the width past the reference, and leaves the Plot Aspect Band's
   floor above a 1372,8 px column** (`463,68 / 0,35` = 1324,8 of `W_inner`, i.e. a ~1661 px
   viewport): 0,42 at 1104, 0,3943 at 1176, 0,3668 at 1264, 0,2927 at 1584, 0,2085 at 2224. **The
   band guards the rule, not the capped value** — and the direction is what makes that acceptable: a
   cap can only ever *lower* the aspect, and the band's dangerous half is its **ceiling**, the
   over-exaggeration the published ×5,5 bounds. A cap cannot reach it.
2. **VE falls with it, down to the ×1 floor on a wide enough screen** — the first-run scenario reads
   ×1,9 at the reference, ×1,3 at 1920 px and ×1 at 2560. That is **never a compression**: VE is
   `max(autofit, 1)`, and the floor is its own **disclosed badge state**, « ×1 — vraie échelle », with
   the peek control already in force. At 3440 px the same scenario reaches badge row 3, « · câble hors
   cadre »: the belly leaves the frame *and says so*, while the printed « Garde min » — § 5's
   non-positional signal — keeps carrying the number.

   **And this is the cost that touches a *disclosure*, not an aesthetic, so it is written out rather
   than left to the table above** (added 2026-08-14, on review, by the same decision — the cap is not
   re-opened, its record is completed). § 5 says the third badge row is « reachable **from the data,
   not from the box** » and calls itself self-limiting: « every case reachable inside the admissible
   envelope is already a ground-contact case, so **the picture is never cut without the banner saying
   the line is on the ground** ». **Under the cap that is no longer true.** The clip condition is
   `clamped ∧ plotAspect × xSpan < zDataSpan` (`contract.ts`'s `exaggeration`), which on § 5's `1,1 L`
   domain is exactly **`plotAspect < 1 / (1,24 k)`** — a pure function of the *box* once the cap
   holds the plot at 463,68 px, since `plotAspect = 463,68 / W_inner`. So per scenario the clip opens
   at `W_inner = 574,96 × k`, and the flatter the line the wider the column it takes: **`k` 3,696 —
   § 5's own z3 row, one of the published seven — clips from `W_inner` 2125,1 (a ~2461 px viewport)**,
   which is why `src/lib/layout/contract.test.ts` asserts `true-scale-clipped` for it at `W_inner`
   2224. **This is distinct from the band-floor crossing of cost 1** (a 1372,8 px column): crossing
   the floor only flattens the drawing, it does not cut it.

   **Measured, on a mainstream monitor, on a line with metres to spare** (same session and method as
   the table above; viewport set then read back from `innerWidth`/`innerHeight`, geometry from
   `getBoundingClientRect()`): at **2560 × 1440**, scenario **`L` 200 m · `h` −40 m · `z_a` = `z_b` =
   12 m · flèche à vide 6 m** (`?L=200&h=-40&za=12&zb=12&fl=6`) — column 2272, `W_inner` 2224, block
   **879,672**, `whole` · `roomy` — the badge reads **« Éch. verticale ×1 — vraie échelle · câble hors
   cadre »**, « Garde min (traversée) » **1,83 m** and the View Strip's « Garde min » **1,89 m**, with
   **no ground contact and no verdict banner at all** (« Choisissez un régime de sécurité pour obtenir
   un verdict »). The screenshot shows anchor A's tower and the cable's upper end cut off at the top
   of the plot frame. Its clip onset was bracketed by sweeping the width: **absent at 2290 × 1440**
   (`W_inner` 1954, aspect 0,2373) and **present at 2300 × 1440** (`W_inner` 1964, aspect 0,2361), so
   this line's `k` ≈ 3,41 and it starts being cut from a **~2295 px viewport** — *below* 2560, and
   below the 3440 px the table records.

   **What mitigates it is what it is, and it is not a banner.** The clip is disclosed by **badge row
   3** — chart furniture, recomputed every render — plus § 5's **non-positional** printed « Garde min »,
   which is the number a clearance decision is actually taken on. What is *gone* above the reference is
   § 5's argument that the two always arrive together with a ground-contact verdict. Whether that is
   enough on a wide screen — and whether the peek control, disabled exactly when the clamp holds,
   should be re-enabled there — is a **§ 5 question, deliberately not answered inside this
   amendment**: it would be a third decision, and the cap was decided without it on the table.
   **That decision was since taken — voir « ADDRESSED » immediately below.**

   ### Cost 2 · **ADDRESSED — the user's decision 4, 2026-08-14**

   **The peek control is re-enabled exactly where the cap is what cuts the cable**, so there is a way
   to see the whole cable on a wide screen, alongside badge row 3 and the printed « Garde min ». The
   cap itself is **not re-opened**: budget C, the plateau, the drawn aspect and every number in the
   table above are untouched, and the resting VE is still `max(autofit, 1)`.

   - **What the scope is, and why it is exactly this.** The clip condition is
     `plotAspect × xSpan < zDataSpan`, so the same line measured against § 5's own target aspect says
     **what cut it**: `"data"` when 0,42 would have cut it too — § 5's « mou profond » row, still
     self-limiting and still arriving with « Câble au sol » — and `"box"` when the line is **whole at
     0,42** and cut only under the cap. `src/lib/layout/contract.ts` publishes that as `ClipCause`, and
     `peekMode(clamp)` is the enable predicate: `"true-scale"` unclamped (§ 5's row 1, untouched),
     `"off"` for row 2 (nothing is cut, so nothing can be revealed) **and for the data clip** (the cut
     is the line's own truth), `"fit"` for the box clip alone. It is a pure function of the clamp
     state — but **not of the three-row badge state**, which cannot carry the extra bit and stays
     three rows: § 5's badge table is unchanged.
   - **What the hold shows, and what it costs.** The only scale that can put a cut cable back inside a
     frozen box is the auto-fit the ×1 floor is refusing — the x domain may not be widened (§ 5) and
     the plot may not read the window height (§ 5, this amendment) — so the `"fit"` hold draws
     `autofit`, i.e. **below true scale**. That is the one drawing in the app under ×1, and it **says
     so in the badge** in every case: « Éch. verticale ×0,7 — sous la vraie échelle · câble entier »,
     against the resting row's « ×1 — vraie échelle · câble hors cadre ». The control's own label
     follows what pressing it does — « voir tout le câble » in that mode, « ×1 vraie échelle »
     everywhere else.

     **What « transient » does and does not mean here — corrected 2026-08-14, on review.** An earlier
     draft of this row read « a transient, never persisted, never the resting scale », and the middle
     clause is the only one that is unqualified: the peek has **no Session key and no URL key, so a
     reload always comes back at `max(autofit, 1)`**. It is **not** a hold on every path. § 5 gives the
     control **toggle** semantics from the keyboard in *both* pointer modes and under
     `(pointer: coarse)` (`view-strip.tsx`: `onKeyDown` flips, `onPointerDown` flips under
     `coarsePointer()`, and only the fine-pointer arm has `onLostPointerCapture`), so on those paths the
     `"fit"` drawing **latches until the next press** — measured at 2560 × 1440 on
     `?L=200&h=-40&za=12&zb=12&fl=6`: `focus` + one `Space` leaves `aria-pressed="true"` and
     « ×0,7 — sous la vraie échelle · câble entier » standing indefinitely, a second `Space` releases
     it. That is the path this row's own evidence was taken on, so the claim had to move rather than the
     code: a rigger *can* leave a 0,7× drawing resting on screen, and what answers it is the badge,
     which never stops naming the factor and « sous la vraie échelle ».

     **The latch is released when the mode leaves `"fit"`**, and that was a real defect, fixed here
     (2026-08-14): the flag was only *masked* while `ve.peek === "off"`, never cleared, so a latched
     peek survived an excursion through the off band and **re-armed** on the way back — measured on the
     same scenario, `Space`, then `set viewport 2000 1440` (control disabled, `aria-pressed="false"`,
     badge « ×1 — vraie échelle »), then `set viewport 2560 1440` → « ×0,7 — sous la vraie échelle ·
     câble entier » again, `aria-pressed="true"`, `document.activeElement !== button`, **no input in
     between**. An unbidden *compression* is the direction § 5 calls worse than exaggeration, « because
     it reads safe ». `chart-block.tsx` now clears the flag during render when the mode goes `"off"`
     (React's « adjust state on new props » path — no effect, no extra commit); the fine-pointer arm was
     already covered by `onLostPointerCapture`, and was verified to end at the resting badge on the same
     trip.

     **The same defect had a second door, and it is closed too — 2026-08-15, session `closefix`.** The
     mode-keyed reset above runs *after* `chart-block.tsx`'s two empty-band returns, which never reach
     `ve` at all: § 8's *exception géométrique* and the not-yet-measured first frame render `EmptyBands`,
     where the View Strip — the control and its `aria-pressed` — **is not in the DOM**. A flag that
     outlives a window in which its own control does not exist comes back armed with nothing to have
     pressed it. Measured at 2560 × 1440 on `?L=200&h=-40&za=12&zb=12&fl=6`: `focus` + `Space`
     (« ×0,7 — sous la vraie échelle · câble entier », `aria-pressed="true"`), then `#rail-L` = `0`
     (« Portée invalide — aucun tracé possible », **no badge and no control at all**), then `#rail-L` =
     `200` → « ×0,7 — sous la vraie échelle · câble entier », `aria-pressed="true"`,
     `document.activeElement` still `#rail-L`, **nobody having pressed the control**. `chart-block.tsx`
     now clears the flag during render *before* those returns as well —
     `if (peeking && (width === null || frame === null)) setPeeking(false)` — and the same trip re-run
     lands on « ×1 — vraie échelle · câble hors cadre », `aria-pressed="false"`. § 5's own semantics are
     unmoved on the same host and the same scenario: `Space`/`Space` still toggles (`true` then `false`),
     the off-band excursion 2560 → 2000 → 2560 still ends released, and `mouse down` / `mouse up` still
     holds then releases.
     **Both resets re-verified independently — 2026-08-15, session `doc3verify`**, same host
     (`HeadlessChrome/151.0.0.0`, the shared dev server reused and left running), viewport set then
     **read back** from `innerWidth`/`innerHeight` — 2560 × 1440, `maxTouchPoints` 0 and
     `(pointer: coarse)` false, so the coarse arm stays **named, not measured** — on
     `?L=200&h=-40&za=12&zb=12&fl=6`, by an agent that did not write the fix. Four trips on the tree as
     it now stands: `focus` + `Space` → « ×0,7 — sous la vraie échelle · câble entier »,
     `aria-pressed="true"`; the off-band excursion 2560 → 2000 → 2560 ends « ×1 — vraie échelle · câble
     hors cadre », `aria-pressed="false"`, `activeElement` `BODY`; `#rail-L` = 0 (badge **and** control
     both absent from the DOM) then `#rail-L` = 200 ends released the same way, `activeElement` still
     `#rail-L`; and `Space` / `Space` toggles while `mouse down` / `mouse up` holds then releases. **No
     claim in this row moved** — it is the same behaviour, taken a second time.

   - **No banner occupant, deliberately.** Box-clipping gets **no rank** in the banner: tickets 26 and
     27 froze four ranks and a single occupant, and that alternative was rejected. Measured, the
     verdict slot is untouched — it still reads « Choisissez un régime de sécurité pour obtenir un
     verdict » through the whole gesture.
   - **Also rejected**: widening the Plot Aspect Band and leaning on the badge alone (it weakens a
     § 5 safety sentence without giving the reader anything back).

   **Measured** (`HeadlessChrome/151.0.0.0`, `agent-browser 0.34.0`, session `peek`, the shared dev
   server reused and left running — `curl` → **200**; viewports set then **read back** from
   `innerWidth`/`innerHeight`, geometry from `getBBox()`/`getBoundingClientRect()`; the control driven
   the **keyboard** way, `focus` + `Space`, which is § 5's toggle semantics in both pointer modes —
   this host reports `maxTouchPoints 0` and `(pointer: coarse) false`, so the coarse path is **named,
   not measured**):

   | viewport · scénario | badge au repos | contrôle | câble au repos | câble maintenu | badge maintenu |
   | --- | --- | --- | --- | --- | --- |
   | **2560 × 1440** · `?L=200&h=-40&za=12&zb=12&fl=6` | « ×1 — vraie échelle · câble hors cadre » | **« voir tout le câble », actif** | `y` **−3 … 401,4** dans un cadre 28 … 491,68 — **coupé**, pylône A tronqué | **72,9 … 360,5 — entier**, les deux pylônes complets | « ×0,7 — sous la vraie échelle · câble entier » |
   | **3440 × 1440** · premier lancement | « ×1 — vraie échelle · câble hors cadre » (la ligne de la table ci-dessus) | **« voir tout le câble », actif** | **−22,3 … 316,6 — coupé** | **72,9 … 297,5 — entier** | « ×0,7 — … · câble entier » |
   | **2560 × 1440** · « mou profond », `?L=200&h=-18&za=12&zb=12&lo=400` | idem, mais coupe **`data`** | « ×1 vraie échelle », **désactivé** | — | — | — |
   | **1440 × 900** · premier lancement | « Éch. verticale ×1,9 » | « ×1 vraie échelle », actif | entier | — | — |
   | **390 × 664** · premier lancement | « Éch. verticale ×1,9 » | « ×1 » (abrégé), actif | entier | — | — |

   « Garde min (traversée) » **1,83 m** and the View Strip's « Garde min » **1,89 m** read identically
   before, during and after the hold at 2560 × 1440 — the printed number is non-positional, so the peek
   cannot move it — and **2,44 / 2,48 m** at 1440 × 900 and 3440 × 1440, byte-identical to tickets 29
   and 30. The 1440 × 900 and 390 × 664 rows are the evidence that **nothing at or below the reference
   moved**: the cap is transparent there, so `"fit"` is unreachable below § 5's reference column at any
   scenario.

   **The latch, and the resurrection defect it hid — session `fixdec-7cbe9071d13d`, 2026-08-14**, same
   host, same shared dev server, viewports set then read back from `innerWidth`/`innerHeight`, all on
   `?L=200&h=-40&za=12&zb=12&fl=6`. The « off band » below is 2000 × 1440: the clamp still holds, so the
   control is disabled, but nothing is cut. `HEAD` is the tree before this fix.

   | trip | après le geste | dans la bande « off » (2000) | de retour à 2560 |
   | --- | --- | --- | --- |
   | `focus` + `Space` — clavier, **`HEAD`** | « ×0,7 — sous la vraie échelle · câble entier », `aria-pressed="true"` | désactivé, `aria-pressed="false"`, « ×1 — vraie échelle » | **« ×0,7 — sous la vraie échelle · câble entier », `aria-pressed="true"`, `activeElement !== button`, aucune saisie entre les deux** — le drapeau **se ré-arme** |
   | `focus` + `Space` — clavier, **corrigé** | idem | idem | **« ×1 — vraie échelle · câble hors cadre », `aria-pressed="false"`** — la tenue est **relâchée** |
   | `mouse down` sur le contrôle — pointeur fin, `HEAD` **et** corrigé | « ×0,7 … câble entier », `aria-pressed="true"` | désactivé, `aria-pressed="false"` | `mouse up`, puis 2560 : **« ×1 — vraie échelle · câble hors cadre »** — `onLostPointerCapture` couvrait déjà ce bras, et lui seul |
   | `Space`, `Space` — aller-retour sans redimensionnement, corrigé | « ×0,7 … câble entier », `aria-pressed="true"` | — | 2ᵉ `Space` : **« ×1 — vraie échelle · câble hors cadre »**, `aria-pressed="false"` — la bascule § 5 est intacte |
   | `mouse down` / `mouse up` sur place, corrigé | maintenu « ×0,7 … câble entier » | — | relâché « ×1 — … · câble hors cadre » — la tenue § 5 est intacte |

   **What this does *not* fix, stated plainly.** It addresses the **cut** of cost 2, not the
   **flattening** of cost 1: the obtained aspect still leaves the Plot Aspect Band's floor above a
   1372,8 px column, and the peek does not restore it — while held it draws flatter still. That
   crossing therefore remains what cost 1 already argued it was — **disclosed and directional, not made
   acceptable by this decision**: a cap can only ever lower the aspect, the band's dangerous half is
   its ceiling, and the ×1 floor refuses compression at rest. Cost 1's own justification stands
   unchanged and un-strengthened; cost 2's missing *disclosure* is what closed.

   **Where it lives**: `src/lib/layout/contract.ts` (`ClipCause`, `PeekMode`, `peekMode`,
   `Exaggeration.clipCause` / `.peek`, `peekBadgeLabel`), `src/components/chart/chart-block.tsx` (the
   drawn VE and the held badge) and `src/components/chart/view-strip.tsx` (the control's label and
   `disabled`), with the predicate's `node` coverage in `src/lib/layout/contract.test.ts`.
   **Ticket 30's item 2 note and ticket 28's constat 2 both close with « le peek est désactivé quand le
   clamp tient » — true when they were written, and superseded here for the `"box"` clip only.**
3. **Three short desktops still open pinned, and no cap can rescue them** — 1280 × 720, 1366 × 768
   and 1512 × 850. The arithmetic is closed rather than open: the first two have chart columns
   *narrower* than the reference (992 and 1078), so a ceiling low enough to reach them (≤ 352,96 px at
   `W_inner` 944, against blocks of 763,52 and 813,40) also lowers budget C's 463,68; and 1512 × 850
   asks for a block ≤ 850 at a column **wider** than budget C's, which a non-decreasing rule cannot
   deliver — even freezing the strip too, the tightest bound available, leaves budget C's own
   856,32 px, still 6,32 px too tall. **Preserving budget C is what forbids those three rows.** A
   viewport shorter than its own block is what the Pinned Safety Header is for, and that is the
   answer they get.

   ### Cost 3 · **SETTLED BY THE USER, 2026-08-14 — decision 3. NO CODE CHANGE.**

   **Budget C is untouchable, and those three viewports open with the Pinned Safety Header — which is
   what it exists for.** 1280 × 720, 1366 × 768 and 1512 × 850 are **settled policy, not an
   outstanding gap**: the arithmetic above is the whole answer and this row is closed. The reason it
   cannot be closed any other way is that their chart columns are **narrower** than § 5's reference
   column, so their plots already sit under any ceiling at or above 463,68 px — fitting them would
   require lowering the cap **below budget C's own value**.

   Two options were named and **rejected**, and they are rejected rather than unexplored:

   - **Lowering the cap** — it moves the spec's own reference desktop and invalidates budget C's
     evidence in tickets 27, 28 and 29.
   - **Making the cap height-aware** — § 5 and ticket 28 *forbid* a chart height derived from window
     height; that is the ×5,02 defect this whole section exists to refuse.

   Nothing in the code, the tickets' measured tables or budget C moves for this decision. Recorded
   here so it is not re-opened as an unresolved gap.

**Rejected, with their measured costs.**

- **Keep § 5's rule as written** — five common 16:9 desktops ship with no chart at all, 1920 × 1080
  by 1,3 px, and « Afficher le profil » cannot answer it.
- **Restore the literal `MIN_RAIL` term at every width** (ticket 28's reading (ii)) — budget C's
  856,3 against `900 − 120 = 780` **collapses the spec's own reference desktop**, and 1600 × 900 goes
  straight back to pinned. So the `MIN_RAIL` asymmetry **stays, and this amendment settles it**: the
  Rail's floor is owed where the Rail is *under* the block, and the shell's own chrome where it is
  *beside* it (ticket 31's D3). The cap shrinks the disagreement — with the block bounded at 879,68
  the two readings now agree on every viewport at least 999,68 px tall, 1920 × 1080 included — but
  they still part company over budget C, which is the whole point.
- **Scope (c) to below B2** (reading (iii)) — restores the clipping ticket 28 removed: at 844 × 390
  the bands sum to 593 px inside a 390 px `overflow-hidden` column, « Garde min » cut out of the
  viewport with nothing to scroll to reach it.
- **Feed the plot the height available instead** — the ×5,02 defect this section exists to refuse, and
  the aspect-0,1601 landscape case with five of seven scenarios compressed.
- **Cap the *aspect* at the band floor rather than freezing the plot** (`max(463,68 , 0,35 × W_inner)`)
  — keeps the obtained aspect inside the band, but the block resumes growing at `416 + 0,35 × W_inner`
  and **loses an ultrawide outright**: 1502,4 px against 1440 at a 3440 × 1440 monitor, which the
  freeze keeps whole with 560 px to spare.
- **Freeze the strip at its reference 176,64 as well** — gains 23,36 px of block budget (a 856,32 px
  plateau, budget C's shape frozen exactly), and re-opens § 5's *deliberate* strip clamp, whose 200 px
  ceiling « exists to bound » over-feeding rather than to be lowered, and whose growth is a bigger
  scrub track. The strip was already bounded; the plot was the unbounded term. **One rule changed, not
  two.**

**Lands on** tickets **28** (item 1, which now holds against the amended rule), **29** (the three
budgets and the 1440 × {700 … 1200} invariance re-measure identically; the wide arm is new evidence)
and **30** (the badge prints the *obtained* aspect's VE, unchanged at every width ≤ the reference —
and above it, cost 2's box-reachable « câble hors cadre », which is the badge evidence that ticket
carries; **its aspect-band item is qualified there**, since the obtained aspect leaves § 5's
[0,35 ; 0,50] band above a 1372,8 px column).

---

## G · The zoom gate — a pinch is not a keyboard

**2026-08-14, by the repo owner**, on the evidence of
[ticket 28](./issues/28-constrained-height-and-keyboard-modes.md)'s keyboard verification. **Amends** § 5's
*Keyboard, four pieces* — **piece 2**, the `visualViewport` listener that writes `--kb` — and through
it § 5's « `compact` fires when `--kb > 0` », which is the rule piece 2 drives.

It changes **no layout number**. At `scale` 1 the gate is arithmetically transparent — asserted over a
48-combination sweep — so every measured row in tickets 27, 28 and 29 stands unmoved.

**The defect, measured twice independently.** `src/components/app/use-viewport.ts` computes § 5's
piece 2 verbatim — `layoutHeight − visualViewport.height − offsetTop` — and `compactRequired` fires on
**any** inset at all, with no threshold, which is § 5's own wording and is asserted as a unit case
(`--kb` 1 at a 2000 px height). But `visualViewport.height` **also shrinks with `scale`**, so a
*pinch* is arithmetically indistinguishable from a keyboard. The viewport meta permits zoom
(`src/routes/__root.tsx`: no `maximum-scale`, no `user-scalable=no`), so on a phone **pinch-zooming
the chart deleted the chart** — the one gesture whose entire intent is « montre-moi mieux cette
image ».

**The decision: the measurement is closed to scale.** `keyboardInsetOf` returns **0 whenever
`visualViewport.scale !== 1`**. § 5's formula is left **verbatim below the gate**, and the gate is a
named condition (`const zoomed = scale !== 1`) carrying its reason in prose, so the zero reads as
deliberate rather than as arithmetic that drifted.

- **The seam became a parameter, not a DOM.** `keyboardInsetOf(reading)` is a pure function over four
  numbers (`layoutHeight` · `visualHeight` · `offsetTop` · `scale`) that `measure()` calls with the
  property reads — amendment A's own move, the same one the dropped-keys reporter and `readSession`
  made, so the gate is `node`-testable with no router and no layout in the room.
- **Nothing else moved.** No change to `fitsWholeBlock`, `compactRequired`, `availableHeight`,
  `collapseState`, `contract.ts`, any stylesheet or any component; `src/lib/layout/collapse.ts` is
  untouched, so its ban on the identifier `visualViewport` (asserted by `contract.test.ts`) still
  holds and « one file reads a window height » still names exactly `use-viewport.ts`.

**Rejected, with their reasons.**

- **Scale-correcting the arithmetic** (`layoutHeight − visualHeight × scale − …`) — it would diverge
  from the formula § 5 writes word for word, in the single place in the app that reads a viewport.
- **Giving `compactRequired` a floor** — § 5 says « no threshold » in as many words (« `compact` fires
  when `--kb > 0` »), and a floor breaks the unit case already asserted (`--kb` 1 at a 2000 px
  height).

**What it costs, stated plainly.** A real keyboard opened on a page that is **already zoomed** reads
an inset of 0: the Rail loses its `--kb` bottom padding and the `compact` row does not fire for that
keyboard. Where `interactive-widget=resizes-content` is honoured the layout viewport shrank anyway and
nothing is owed — it is the **older-iOS fallback** that pays, in exchange for every pinch on every
platform no longer deleting the picture. Reproduced deliberately in the browser and asserted as a unit
case, so nobody re-discovers it as a bug.

**The cost was requalified on review, and it was worse than « corner case ».** « Already zoomed » was
the **ordinary iOS focus path** in this app, because two in-repo facts collided: every Rail field
computed **12 px** (`text-xs`; measured at 390 × 844, **26 of 27** `input`/`select` under 16 px) and
the meta permits zoom. WebKit zooms a user-scalable page **in** on focus of a sub-16 px field and does
**not** zoom back out on blur — so on the very build the `--kb` fallback exists for, the **first tap
into any Rail field** set `scale ≠ 1` and § 5's piece 2 was gone for the rest of the session. The
WebKit rule itself is **named, not measured**: no iOS device in this environment, the standing limit
§ 13 already declares.

### Decision 5, 2026-08-14 — 16 px Rail numeric fields remove the trigger

**Taken by the user, and shipped.** The Rail's numeric fields carry `text-base` — **16 px computed** —
in `NumericInput` (`src/components/rail/controls.tsx`). iOS only auto-zooms an input whose computed
font size is **below** 16 px, so this removes the trigger *at the source* while **leaving pinch-zoom
available** to users who need it. Measured after the change on this host (`HeadlessChrome/151.0.0.0`;
390 × 844 and 1440 × 900 agree, since a computed font size does not read a viewport): **15 / 15 Rail
numeric fields at 16 px, box unchanged 80 × 28.**

**Rejected**: `maximum-scale=1` — it would retire the pinch defect and the gate along with it, but it
takes page zoom away from a user who needs it to read a chart, an accessibility loss § 5 never priced
— and accepting the cost explicitly, which was the third candidate ticket 35 tabled.

**The gate itself does not move.** It answers the pinch, which is a real gesture on every platform,
and decision 5 does not make a pinch distinguishable from a keyboard.

**The residual, stated honestly — the trigger is reduced, not eliminated.**

- **A user who has pinch-zoomed manually before focusing a field still reads a 0 inset**, and loses
  keyboard detection for the rest of that session exactly as the cost above describes. The gate is a
  property of `scale`, not of how the scale got there. What decision 5 removed is the app *causing*
  that state by itself on its own default path; the cost as originally written stands for every other
  path.
- **Ten of the Rail's 26 form controls remain at 12 px** — six `select` (`rail-regime`, `rail-r0`,
  `rail-cst`, `rail-ta`, `rail-tb`, the material class) and four `radio`. Whether a `select`
  auto-zooms is **named, not measured**, like the WebKit rule itself; the mitigation is universally
  documented against `input, select, textarea`, so a 12 px `select` may zoom on focus — and the first
  control § 7's first-run banner pushes a user toward is `rail-regime`. **Extending 16 px to
  `Picker` / `Choice` was not taken**: decision 5 names « Rail numeric fields », and a `select`'s box
  is `max-w-40` / `max-w-44` rather than `w-20`, so it would move Rail widths — electing it would be a
  policy nobody has decided.
- **The View Strip's `x` field stays at 11 px** (`src/components/chart/view-strip.tsx`): not a Rail
  field, not covered, so typing directly into it can still set `scale ≠ 1`.

**Decision 5's accepted cost is real work, and it was carried out.** Larger field text moves rail
heights that tickets 27, 28 and 29 measured, so those measurements were **re-taken, not left stale** —
isolated with a throwaway counterfactual stylesheet restoring `text-xs`'s own metrics (`font-size:
12px; line-height: 16px; padding: 0 8px`), measured, then removed. The outcome is that **not one
budget moves**: `h-7` is a 28 px border box and `text-base`'s 24 px line height grows *inside* it.
That is a measured result, not an assumption the decision was allowed to make in advance.

**Lands on** tickets **28** (the gate, its cost, the before/after table at every scale, and twelve
`node` cases in `src/components/app/use-viewport.test.ts`), **35** (the § 5 question this closes —
answer (α), with the residual above), and **27 · 29** (decision 5's re-measurement addenda, which is
where « not one budget moves » is evidence rather than a claim). In § 13 it sharpens the thin spot
« the `interactive-widget` / `visualViewport` pair is untested here »: the pair is still unmeasured on
a device, but the app no longer hands it a zoomed page by default.

---

## H · The `pinned + x` row is read literally: it keeps its caret, and its controls keep 44 px

**2026-08-15, by the repo owner**, on the evidence of
[ticket 27](./issues/27-pinned-safety-header.md)'s item 4 and
[ticket 35](./issues/35-narrow-keyboard-browser-pass.md)'s defects 2, 3 and 4. **Interprets** § 5's
fourth collapse state — « **pinned + x** : idem, plus la View Strip, **tant que le champ `x` a le
focus** » — and § 5's « the row is 44 px tall, **so** every control in it is a legal touch target ».

**It changes no sentence of § 5.** That is the point of both halves: each defect was the shipped tree
failing to support a claim § 5 makes, not § 5 making the wrong claim.

**Defect 1 — the first press from `pinned + x` never ran its handler.** The Rail's « Position du
passager » holds the caret and the Chart Block keeps the View Strip *because of that focus*. Pressing
anything the strip renders — its two layer toggles, « ×1 », or the pinned header's chevron 44 px
below — fires `mousedown`, **whose default action is the focus shift**: the Rail field blurs, the
state falls to `pinned`, the row unmounts mid-gesture, the cells row shifts up 44 px, and by `mouseup`
the cursor is over a Rail control. Chrome then dispatches `click` to the common ancestor
(`click: DIV`, never the button). Measured on a **fine** pointer and again under matched
`(pointer: coarse)` emulation; a second press always worked, which is what made it read to a user as
« press twice ».

**The decision: cancel the focus shift, do not widen the scope.** `keepCaret` — one
`event.preventDefault()` on `mousedown`, in `src/lib/layout/collapse.ts` beside `REVEAL_LABEL`, wired
at the four call sites. Focus never leaves the `x` field, so nothing collapses, and § 5's « tant que
le champ `x` a le focus » stays true **as written**.

- **Rejected: widening the `pointerdown` latch** to the row and the chevron. It re-reads that sentence
  as « tant qu'un contrôle de la rangée est pressé » — a spec widening — **and** obliges inventing a
  release rule (`pointerup` + `pointercancel` + `lostpointercapture`), which is stuck-open on a
  platform where buttons take no focus. Ticket 27 refused to invent it, correctly.
- **Rejected: keeping the View Strip in `pinned` unconditionally** — `pinned` becomes 164 px instead
  of 120 at narrow, spending 44 px out of `MIN_RAIL` and contradicting § 5's own height table, where
  the two are different states.
- **Rejected: committing on `pointerdown`** — ordinary button semantics go (no cancelling by dragging
  off), and hold-to-peek already owns `pointerdown` on fine pointers.
- **Rejected: changing nothing** — the dead press lands in the exact state § 5 minted `pinned + x`
  for.

**The accepted cost, stated:** those four controls no longer take focus from a pointer press, which
is what Safari does with buttons anyway, so a pointer user keeps tabbing from wherever the caret
already was. The keyboard path is untouched, and the strip's own `x` keeps its `pointerdown` latch —
it is the one control § 5 *does* scope, and the one that must genuinely take the focus.

**Defect 2 — the row's controls were 32 px, and « ×1 » was 29,8 px wide.** § 5's « the row is 44 px
tall, so every control in it is a legal touch target » is an **inference**, and `h-8` is 32 px on
every pointer type (the app's one `@media (pointer: coarse)` rule is the rider's stroke width).
Separately, § 5's own abbreviation arithmetic budgets **44 px of width** for « ×1 »
(`59 + 48 + 44 + 128 + 24 = 303`) and the shipped control was **29,8**.

**The decision: make the inference true rather than restate it.** The visual stays 32 px — growing it
to 44 leaves the 44 px row no padding — and the **hit box** reaches 44 through an empty `::after`
bled 6 px past each edge, the same trick § 5 already uses for the rider's transparent stroke. The `x`
field gets `self-stretch` instead, because an overlay there would swallow the click that places the
caret. « ×1 » returns to the 44 px width § 5 budgeted, out of the row's measured 53,6 px of `ml-auto`
slack — so the width was a spec figure *missed*, not a spec figure changed.

**Found while verifying, and fixed here: the coarse peek toggle could never stick.** § 5 specifies
« Toggle under `(pointer: coarse)` », but `onLostPointerCapture` released the peek unguarded while its
sibling `onPointerUp` guards with `!coarsePointer()`. A touch pointer gets *implicit* capture, so
`pointerdown` toggled the peek on and `lostpointercapture` forced it off before the frame — measured
from `whole`, with nothing focused, so it was never a `pinned + x` symptom at all. Ticket 35's coarse
leg saw the symptom and attributed it to the lost press. The guard now matches its sibling.

**Coverage.** All of it is layout and event ordering, so **amendment B** owns it: verified in
`agent-browser` on both pointer types (CDP touch emulation, `(pointer: coarse)` true,
`maxTouchPoints` 5). **No `node` guard**, deliberately — a test asserting the handlers' presence could
only match `.tsx` source text, which **amendment K**'s companion ruling on `contract.test.ts`
declines. `keepCaret`'s docblock carries the reason, and says in as many words that it is
load-bearing and invisible.

---

## I · The published first-run VE is ×1,86, not ≈ ×1,5

**2026-08-15, by the repo owner**, on the evidence of
[ticket 30](./issues/30-chart-fidelity-and-drag-evidence.md)'s item 1. **Amends** the spec's re-check
line in **four places** and `docs/conventions/testing.md` in one.

**The app draws ×1,86290 at aspect 0,42000, to five places, at every width** — reproduced three times
by ticket 30 and once more on 2026-08-15 against the shipped tree (badge « Éch. verticale ×1,9 », plot
1152 × 463,68 at 1440 × 900). The spec's ≈ ×1,5 was arithmetic from **two superseded inputs**: a
157,5 m x-domain (1,05 L, which ticket 06 widened to the shared 1,1 L = 165 m) and a 1080 × 420 plot
box (aspect 0,3889, which the elected width-derived rule can never produce). `0,42 × 165 ÷ 37,2 =
1,86290`. **The app was right and the published line was stale.**

**The decision: publish what the app draws, with its qualifier.** « auto-fit VE **×1,86** at aspect
0,42 on the 1,1 L domain (badge « ×1,9 »), at and below § 5's reference chart column ». Both numbers,
because `testing.md`'s line is a measurement target while the badge is what a human reads off screen;
the width qualifier because **amendment F**'s cap lowers the drawn aspect above a 1372,8 px chart
column, where VE falls to ×1 by 2560 px. **The 1080 × 420 box is dropped**, being unreachable under
the elected rule.

- **Rejected: keeping ×1,5 and re-opening the x-domain or the aspect.** Self-refuting on § 5's own
  guards — 157,5 m breaks the shared domain the two charts' alignment depends on, and a true ×1,5
  needs aspect **0,3389**, *below* the Plot Aspect Band's 0,35 floor.
- **Rejected: leaving both and annotating.** A live safety document would carry a number no build
  reproduces.

**One record corrected while settling this.** A handoff claimed amendment F's ×1,9 at 1440 × 900 was
contradicted by « a later reading of ×1,4 on the same host », unreconciled. **No such reading
exists**: every recorded first-run badge in the repo is ×1,9, and the only other figure — ×1,2 — is
ticket 30's `D_target` 6 leg *after* a scenario change, which is not the first-run screen. There was
nothing to reconcile.

**Lands on** `spec.md` (four sites), `docs/conventions/testing.md`, ticket 30 item 1, and
`src/lib/layout/contract.test.ts`, whose first-run case already asserted the app's identity and whose
docblock had been carrying « reconciling it is an open spec decision ».

---

## J · Two § 7 readings about the scrub track, settled together

**2026-08-15, by the repo owner**, on the evidence of
[ticket 31](./issues/31-shell-and-suppressed-output-browser-pass.md)'s **D1** and its « Left open for
the user ». **Amends** § 7's « Aucun résultat » heading and *L'exception géométrique*, and adds a
scrub to § 7's *round earlier*.

**Reading 1 — the track stays live under « Aucun résultat ».** Three sentences of the contract said
the track stays live and two said it goes inert. The two that said inert were **headings describing a
sub-case**: § 7's own « … et la seule piste de scrub inerte », and « Saisie en cours »'s « the app's
second inert scrub track ». Read as properties of the whole state they make the other three false;
read as what they are, all five are true at once.

**The decision: « Aucun résultat » keeps its scrub track — pointer and typed `x` alike — and
inertness is scoped to the two states that earn it.** In this state the **geometry is still valid and
the cable is drawn**; only rider dynamics failed. `x` selects a *view*, which § 3 already says, so
scrubbing moves a viewpoint over a cable the app can draw. The two inert states are **L'exception
géométrique** (structural: no `x` domain exists to point into) and **« Saisie en cours »** (transient:
lasts exactly as long as the caret). This is what ships, so **no code changed** — the headings did.
The « glisser pour déplacer » label stays truthful and the typed `x` is answered the same way, which
is what makes the three questions one decision.

- **Rejected: inert under any blocking error.** It contradicts § 7's « the strip is the app's only
  pointer input path and **it may never stop being one** », and it still needs the NaN guard, so it
  buys nothing the geometric exception was not already buying.

**Reading 2 — a scrub is a prefill.** A pointer scrub wrote `x=44.28985507246377` into the URL while
the field displayed « 44,3 ». § 7's *Precision — refuse the trade, and round earlier* says « a prefill
writes the **displayed** value into state, never the underlying float » and names the tightness switch
and « Recalculer » as the only inputs that are not typed. **A scrub is the third**, and the rule did
not say which side of the line it fell on.

**The decision: it is a prefill.** `roundToDisplay("x_D", …)` in `scrub()` — the same primitive every
other prefill uses — applied *after* the sweep-step snap, so what state holds is what the strip
prints. Verified: the field reads « 41,3 » and the URL carries `x=41.3`. At 1500 m the correction is
under 0,05 m, a twenty-fourth of a pixel, so the snap keeps its whole purpose. **The typed path is
untouched** — a typed position is exact, and § 5 says so.

- **Rejected: leaving it verbatim** — 17-digit addresses, and two links to the same visible position
  differ.
- **Rejected: rounding at serialisation for `x` alone** — contradicts « round earlier » in as many
  words.

---

## K · The keyboard's focus-into-view belongs to the platform

**2026-08-15, by the repo owner**, on the evidence of
[ticket 35](./issues/35-narrow-keyboard-browser-pass.md)'s defect 1 and its re-verification.
**Amends** ticket 35's acceptance item 2 and settles the § 5 *Keyboard, four pieces* question left
open beside piece 3.

**What was measured.** The `scroll-pb-[var(--kb,0px)]` fix closed the leg where a field is focused
*under* an inset that is already up — 181,5 px of clipping down to nothing at 390 × 664. What it does
not close is the **device ordering**: focus first, keyboard second, where `aside.scrollTop` is
bit-identical across the inset's arrival because nothing re-runs the centring. Two options survived:
**(a)** re-run the centring on an inset change, **(b)** leave it to the platform.

**The decision: (b), recorded as accepted rather than fixed.** Every mobile browser has scrolled the
focused editable into view on keyboard open since long before `visualViewport`; the `--kb` fallback
exists to give the Rail **bottom padding** on platforms that ignore `interactive-widget`, not to
replace focus-into-view. Option (a) adds a trigger § 5's piece 3 does not have, and would have to
decide whether it may move the Rail under a finger mid-gesture. **This host cannot fire the platform
behaviour to prove it either way**, and that is stated rather than converted into a measurement.

**Accepted with it: the `#rail-xD` residual.** Its `scroll-margin-top` *is* `--pinned-clearance`,
164 px in `pinned-x`, so its scroll-margin box is 192 px against a 164 px (390 × 664) or 150 px
(landscape) viewing region, and `block: 'center'` pushes the field **13,5 / 20,5 px** past the fold.
Accepted because **the clipped control is the redundant copy**: in `pinned-x` the View Strip is fully
visible 44 px above it, carrying the same `x` value and editable — which is the entire reason § 5
minted that state. It is a residual and not a regression: without the scroll padding the same
postures clip by 181,5 and 140,5 px.

**Ticket 35 item 2 is reworded to the elected policy and ticked.** Its previous wording — « leaves
usable Rail space **rather than covering focused field** » — encoded the assumption this amendment
rejects, that the app owns focus-into-view. Leaving it unticked would file a decision as a defect.

**A companion ruling, recorded here because it has no other home: `contract.test.ts`'s source-text
assertions.** They split in two. The **prohibition and uniqueness greps** (no `useMediaQuery(`
anywhere · `matchMedia(` in exactly one file · one file reads a window height · no `vh` unit in a
chart band) lock architectural rules, are formatter-proof, and are exactly what a `node` suite can
check — **kept as they are**. The **class-string matches** assert rendered markup by source text and
had already been rewritten once to survive `oxfmt`'s class sorting — **kept in intent, but they no
longer match sorted class lists**: the Rail's `--kb` guard now splits that element's own class list
on whitespace, which the formatter is free to reorder and rewrap, and which cannot be satisfied by
the two tokens merely being *discussed* in the comment above the element. **No new source-text
assertion is added**, which is why amendment H's fix carries a docblock and browser evidence instead
of a guard.

---

## L · The app ships no mono face, and B1 moves to 624 px

**Taken 2026-08-16**, on the user report that opened
[ticket 40](./issues/40-ui-coherence-and-shadcn-density.md) (« multiple fonts, multiple input and
text sizes, different paddings ») and the interview that followed it.

**Supersedes** § 5's B1 threshold — « largeur de la **colonne graphique** < 600 px » in the
breakpoint table, the « ≈605 px for five cells » derivation beside it, and the 600 px figure in the
§ 13 acceptance row. **B1 is now 624 px.**

**The normative rules live in [`docs/conventions/ui.md` § *Design defaults*](../../docs/conventions/ui.md)**,
not here — three type sizes, the mono rule, `--radius: 0`, `--warning`, the two-padding /
three-gap rhythm, the 28 px control height, `.touch-44`, and « every control comes from `ui/` ».
This letter records the **two decisions that amend the spec** and the **one correction** that
changes what a future reader should believe.

### 1 · No bundled mono, and what that costs B1

Ticket 40 § 2 offered two options and recommended bundling a variable mono, on the argument that
`contract.ts:69`'s width budget deserves a font it can be true about. **The elected option is the
other one:** `--font-mono: ui-monospace, monospace`, no dependency, no ~40 kB, and digits that
differ by platform **on purpose**.

That is not free, and the price is paid here rather than hidden. § 5 derives B1 from a **0,6 em**
advance: a nine-character value (« 12345 daN ») at `font-mono text-lg` needs ~97 px, plus 24 px of
`px-3`, so five cells need ≈605 px — and the table then wrote the threshold as **600**, five pixels
*under* its own requirement. With the face unbound, the realistic ceiling is **0,62 em** — Liberation
Mono, DejaVu Sans Mono, Menlo, Courier New — which gives

> `(9 × 18 × 0,62 + 24) × 5 ≈ 622 px`

and the threshold is set to **624**, above its requirement rather than under it. A wider guard
(0,65 em → 650) was rejected: it spends two rows of header on laptop widths that fit today, for a
face a bare `monospace` keyword does not resolve to.

**This moves `src/lib/`,** which ticket 40's own gate forbade. The gate is amended with the letter:
`src/lib/layout/contract.ts` and `contract.test.ts` move **for this re-derivation and nothing else**.
Leaving 600 in place would be knowingly shipping a constant derived from a font assumption the same
commit chose to break.

### 2 · Three DOM type sizes, not four

Ticket 40 proposed four roles, the first being an 11 px `--text-2xs` token replacing the 10/11 px
mix across 50 sites. **Elected: three** — 12 / 16 / 18 — with annotation ranking below body by
`text-muted-foreground` and weight. At one step apart, 11 px against 12 px is a rank signal no
reader can resolve, and a token minted for it is a fourth size the next diff will treat as licence
for a fifth. The two locked sizes (§ 7.1's 16 px iOS floor, § 7.3's 18 px header cells) are
unchanged; `text-sm` and `text-xl` leave the app entirely, error screens included.

### 3 · The correction: the jitter ticket 40 describes cannot happen

§ 2 argued that « the moment the scrub changes 2,44 to 2,4 the column jitters », and prescribed
`tabular-nums`. **Both halves are wrong, and the second was nearly implemented.**

`src/lib/format/quantity.ts` renders every quantity through `toFixed(displayDecimals(id))` and
documents the property in its own header — « a row at 2 decimals renders « 6,00 », never « 6 » ».
A value cannot lose a decimal. What *can* move a column is the **integer** digit count (817,1 →
1017,1), which no formatter setting fixes. And `tabular-nums` is inert against either: mono is
fixed-advance by definition.

**Elected: right-align the value columns and accept the digit-count residual.** No `min-w`
reservation — a 288 px rail does not spend permanent pixels against a value that may never appear —
and **no `tabular-nums`**, because a rule whose stated reason is false is a rule the next reader
deletes for the wrong reason. Anyone re-opening column stability reads this paragraph first: the
defect it names is not the defect § 2 named.

---

## M · The strip's curve names the *line's* minimum, and the rider's garde is the profile's

**Taken 2026-08-17**, on the second user report about the « Garde au sol » strip and the four
decisions that closed [ticket 41](./issues/41-clearance-curve-plots-the-envelope.md) (« the graph
rises while the passenger gets closer to the floor »).

**Supersedes**, all in § 5:

| | § 5 says | Now |
| --- | --- | --- |
| the strip's two captions, **verbatim** | « Garde au sol (m) selon la position du passager — glisser pour déplacer » above B1, « Garde au sol (m) — glisser » below | « **Garde min. de la ligne** (m) selon la position du passager — glisser pour déplacer », « **Garde min. de la ligne** (m) — glisser ». The `aria-label` follows: « Garde au sol **minimale de la ligne** selon la position du passager » |
| the read-out cell's label — both budget diagrams, the `pinned` and `compact` rows, the three-column wrap sketch, and § 6's relabel | « Garde min », « Garde min (à x 1010 m) » | « **Garde min. ligne** », « **Garde min. ligne** (à x 1010 m) » |
| *Layers — a fixed always-on set*, « Always on: … **the clearance dimension line** » | one dimension line | **two**, the second self-hiding — voir 2 below |

**Not superseded, and load-bearing:** the Rail's « Garde min (traversée) », the read-out row's
« à la position du passager », and § 5's « Garde min and its position qualifier are non-negotiable at
every width ». All three stand, and the rename **sharpens** the scope discipline § 6 rests on rather
than touching it — `ligne` reduces over `x`, `traversée` over `x_P`.

### 1 · Why the strings moved: the curve and the cell were being read as the rider's own garde

The strip plots §11's **inner minimum over the whole line** at each rider position, and the read-out
cell prints that same number. The axis it sits on and the row above it read « selon la position du
passager » / « à la position du passager » — which means *for* that position, and was read as *under*
that passenger. Four reported symptoms follow from that one reading, and ticket 41 measures all four.
The engine is right: §11's reducer, its §15 fixtures and the aggregate `h_min` the verdict judges are
untouched, and so is `clearanceDomain`.

### 2 · Why the second quantity is a dimension line on the profile, not a second stroke in the strip

**The two quantities are not the same order of magnitude, and one linear axis destroys the smaller
one.** The strip's own y domain fed the envelope alone, against a domain that also admits the garde
under the rider — the envelope curve's drawn height, same strip, same width:

| Scenario | column | envelope-only | shared axis |
| --- | --- | --- | --- |
| ancrages 12 / 20 | 390 | 14,9 px | 7,5 px |
| violating 12 / 6 | 390 | 42,5 px | 14,2 px |
| `example-profile-trace1.csv`, ancrages 12 / 2 | 1152 | 60,8 px | **0,2 px** |

On that imported profile all 260 rider positions violate, the envelope minimum runs −0,36 m against a
ridge, and the rider flies a valley at **+62,6 m**. § 5's deciding argument for the whole Chart Block
is that « **a zero crossing is categorical** »; a shared axis leaves that crossing a flat line on the
floor of the strip, so **it may not be shared**. `clearanceDomain`'s input stays the quantity the curve
draws — feeding it one and drawing another is the defect ticket 41 opened.

The rider's own garde goes where it is metrically true instead: a **second clearance dimension line on
the profile at `x_D`**, which already has a z scale, the ground and the rider. It self-hides on
`rider.relabel` — § 5's own `max(1 m, 1 % de la portée)` bit — so the ordinary mid-span case draws one
dimension under one plain label, exactly as § 5 wrote it, and the drawing and the label fire together.

**No leader between the two dimensions, and that is measured rather than a taste.** Both dimensions'
tops lie on *one* curve — the cable offset down by `h_rider` — so any straight connector between them
is a **chord of the cable**: measured at **7,63 px** from the `stroke-2` cable with the rider at an
anchor, ≈2,4 px once the plot scales to 390 px. § 5's « a tint plus an edge, never a texture over the
subject » is the same instinct one level down.

**No printed number for it, at any width.** § 5 fixes five read-out cells and killed in-plot read-outs
for occlusion — « C's follow-the-rider tooltip covers the cable it describes » — so a sixth cell would
re-open B1, the `pinned` row and the `compact` row for one number. The dimension line carries it.

---

## N · En `compact`, le bandeau **est** la ligne de cause

**2026-08-28, by the repo owner**, on the evidence of
[ticket 31](../archive/zipline-simulator-v1-build/31-shell-and-suppressed-output-browser-pass.md)'s
« One consequence of D2's fix a reviewer should still rule on » — the last question
**F1** left standing. **Amends nothing.** It *reads* § 5's `compact` row and § 6's « — » discipline
together and records that what ships is right, so the question stops being open.

**What was measured.** `compact` under « Aucun résultat » at 390 × 400 (`data-fit="tight"`,
`data-collapse="compact"`): banner slot `x 0 y 0 310 × 44` carrying « ⛔ 1 erreur bloquante — aucun
résultat  [ voir la première ] », read-out slot `x 310 y 0 80 × 44` whose only visible content is the
chevron. The cause line is `compact:hidden`, and since **D2** the five cells are text-less rather
than valueless labels.

**The reading that made it look like a gap.** § 5's `compact` row promises « « Garde min » en ligne »
and § 6's discipline gives a blocked state « une ligne de cause qui traverse la rangée ». Read as
promises about *the read-out slot*, `compact` under « Aucun résultat » keeps neither.

**The decision: read them as promises about the row, which in `compact` is shared.** `compact` is the
one place the band stack stops being a stack — the banner slot and the read-out slot are two cells of
**one** 44 px row (`shell.tsx:349-354`, `shell.tsx:430-438`). The banner is spending that row on the
blocking cause, in the row § 5 gives the cause. So « une ligne de cause qui traverse la rangée » is
**satisfied by the banner**, and « « Garde min » en ligne » is a promise about the state where there
*is* a Garde min. The chevron is the correct residual: it is the way back to the read-out, and it is
the only thing in that slot that still means something under a blocking error.

- **Rejected: a valueless « Garde min. ligne » in the chevron slot.** It reinstates exactly what
  **D2** removed, and [amendment M](#m--the-strips-curve-names-the-lines-minimum-and-the-riders-garde-is-the-profiles)
  moved that label in five places precisely so it names the **line's** minimum — printing that name
  with no number under a blocking error invites the misread M was closing.
- **Rejected: the read-out slot yields its width to the banner in this state.** It takes away the
  chevron, i.e. the only route back to the read-out, to buy 80 px for a message that already fits.
- **No code changed, and no string moved.** Unlike J, this amendment has no counterpart in the spec's
  headings either: § 5 and § 6 are both correct as written under the row reading.

## O · « Rapport V » is a fourth tightness driver, the field chips move to `Provenance`, and chips open on hover

**Decided 2026-09-23**, on three user requests of the same day, after the 423,5 m textile report that
prompted [ticket 41](./issues/41-clearance-curve-plots-the-envelope.md)'s strip reversal.

**1 · A fourth driver, `vr`.** « Rapport V » is `P / H` — the passenger's design load `m_p·g` over the
horizontal pretension. It is what decides how deep the loaded line folds under the rider, and it is
the quantity the user reasons in on a light rope, where `H` alone says nothing until it is compared to
`P`. It is **the app's, not the engine's**: `TightnessDraft` (`scenario/types.ts`) adds
`{ mode: "ratio", ratio }` beside the engine's three, and `engineTightness` (`scenario/tightness.ts`)
resolves it to `{ mode: "tension", H_target: m_p·g / ratio }` before `resolveL0` sees it, in both
`deduced.ts` and `scene.ts`. `src/lib/sim/**` is untouched and `TightnessSpec` still has three modes.
§ 7's key table gains `vr` after `lo`; the **exactly-one-present** rule and the `deux-directeurs`
refusal extend to it unchanged. The field is `vRatio`, « Rapport V cible », `> 0`, 2 decimals, gate
`solve`; culprit row `L0/mode Rapport V`. A prefill on mode switch writes `m_p·g / H` from the
read-out at the field's grain. Changing `m_p` in this mode changes `H` — that is the point of the
mode, and the deduced `Prétension` row shows the result.

**2 · No « ⚠ non confirmé » chip beside a field.** The eight inline warning chips (`k`, `η_A`, `η_B`,
`m_p`, `h_rider`, `EA`, `μ`, textile `EA`) are removed from the input and deduced rows. The
`Provenance` aggregate is unchanged and remains the one place those chips live; the neutral chips
(« §8.2 », « [STD-ATTESTED] », « valeur saisie », « la formule ») stay where they were.

**3 · Chip popovers open on hover, and on focus.** `Chip` is no longer a `<details>` disclosure. The
badge is in the tab order and the detail is shown under `group-hover` / `group-focus-within`, with
`aria-describedby` binding the two, so a keyboard user loses nothing.
