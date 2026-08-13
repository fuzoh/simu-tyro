# Amendments to the v1 build spec

**2026-08-12, by the repo owner.** Four decisions taken *after* [the spec](../zipline-simulator-v1/spec.md)
was assembled. They **supersede** the spec where they collide, and the spec's affected paragraphs
point here. Everything else in the spec stands.

This file is the single source of truth for these four. Do not copy their content into a ticket —
tickets link here.

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
