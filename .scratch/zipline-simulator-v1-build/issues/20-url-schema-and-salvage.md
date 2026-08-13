# A5 · `url/schema.ts` — `validateSearch` and the salvage table

Stage: A5
Status: done
Blocked by: 16, 17, 19
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 8, § 11 ·
[Amendments](../AMENDMENTS.md) **D**, **E**

## Delivers

`src/lib/url/schema.ts` — the ~30 **readable flat keys** in canonical order, `validateSearch`, the
salvage table, and link completion from `FIRST_RUN_SCENARIO`. Built with **valibot**, not hand-rolled
(amendment D supersedes § 8's « no zod » on this point).

## How valibot may be used here — the four hard rules constrain it

- **One schema per key, applied per key.** Never one object schema that fails whole: the required
  behaviour is **per-key salvage with a report**, not valid-or-throw.
- **No `transform`, anywhere.** `v.pipe(v.string(), v.transform(Number))` *is* the coercion the 307
  measurement forbids. Schemas validate shape and **return the value untouched**.
- **No `minValue` / `maxValue`.** The URL is a **typing boundary, not a validation boundary** — an
  out-of-range but representable value is **valid here** and lights up the form's own validation later.
- **`v.safeParse` only.** Sync is what makes valibot admissible at all; `parseAsync` is not, because
  `validateSearch` runs synchronously inside `buildLocation`.

Only the three refusal classes refuse the link whole: unknown `v`, `tr` undecodable or oversize, two
tightness drivers present. **Amendment E: they no longer *throw*** — the refusal is salvaged into
the validated search as a `refused` marker and `validateSearch` returns normally, because a throw
answers HTTP 500 on the pinned tree. It stays whole-link: checked on the **raw** bag before per-key
salvage, and it suppresses the rest of the bag rather than merging with it.

## Gate

`src/lib/url/schema.test.ts`, table-driven:

- **refusal** — `v` unknown, `tr` undecodable or oversize, **two tightness drivers present** — comes
  back as `search.refused`, carrying the `RefusalKind`, the message and `received`, with nothing
  else in the bag and nothing thrown (amendment E; before it, a throw with
  `error.routerCode === 'VALIDATE_SEARCH'`);
- an unknown or unrepresentable key is **ignored and named**;
- an out-of-range but representable value is **applied as-is**;
- recognised absent keys are **completed from `FIRST_RUN_SCENARIO`**, with `reg` and `mbf`/`ea`/`mu`
  exempt;
- the first-run URL is **141 characters**, exact.

## Notes

- **The URL is a typing boundary, not a validation boundary.** A link restores state *faithfully,
  including invalid state*: `L = −5` lights up the form's own validation, and `reg=secours10&fam=ac`
  arrives already invalid and raises the § 6 blocking error exactly as clicking into it would.
  Re-checking ranges here would make three tiers with one rule living in two, and silently repairing
  a link yields a scenario **neither party ever saw**.
- **Applied whole or refused whole.** Keys are dropped only when the remainder still describes a
  complete line.
- **The tightness driver is encoded by *which key is present*** (`fl` / `te` / `lo`) — three value keys
  could carry contradictory tightness. Two drivers arriving at once is a contradiction, not a
  preference, and the link is refused whole.
- **The terrain source is inferred from `tr`.** The URL carries the **active configuration, never a
  retained alternate**.
- **Forces serialise in daN always**, so `u=daN`→`u=kN` in a hand-edited URL must not make a line
  100× tighter.
- **`tr` is validated structurally and kept verbatim** — decoding is a memoised *client* derivation,
  never inside `validateSearch`.
- **Purity is a review rule, not a test**: `validateSearch` runs **3× per request** inside a
  swallowing `catch {}`. Hard rules — **omit, never `undefined`** (`{key: undefined}` makes the
  *server* 307 the key away before any client code runs, even under `ssr: false`), never coerce, stay
  cheap.
- `stripSearchParams` was rejected: absence already means « — choisir — » **and** *not overridden*,
  and a fourth meaning would make it unreadable in the field the app pins first. `mp=120` is an
  Unconfirmed Default, so a link must record what the sender actually computed with.
- **Partial recognised links are completed literally.** Measured: `?L=250&h=-40` with `fl=6.0` lands
  clear at garde 1,25 m with an honest 2,40 % ⚠, while a "smart" 4 %-of-span completion lands at
  −2,39 m — on the ground.
- Write side is **`replace` always**, and the URL is **write-only after the load-time seed**.
- **The dropped-keys reporter takes the raw query string as a parameter**, never reading
  `window.location` itself — amendment A removed the jsdom environment that would otherwise be needed,
  and as a pure function this is a plain unit test.
- **Valibot's default messages never reach the UI.** Its `issues` carry paths, which is useful for
  mapping onto the salvage report; the French strings are the spec's.

## Comments

**Done.** `src/lib/url/schema.ts` + `schema.test.ts` (55 cases, table-driven); suite 664 → 719, all
three gates green. Written in this fix round — the review found the ticket's deliverable entirely
absent from the tree.

- **Surface**: `CANONICAL_KEYS` (§ 7's key table, 32 keys, in its order, `mu` once), the token
  tables and `terminationIdFromToken`, `ValidatedSearch`, `validateSearch`, `salvageSearch`,
  `reportDroppedKeys(rawQuery)`, `parseLinkSearch`, `hasScenarioKey`, `completeFromDefaults`,
  `scenarioToSearch`, `canonicalLink`, `FIRST_RUN_LINK`, and the `LinkRefusal` error carrying
  `routerCode` + `kind` + `received`.
- **Amendment D held literally**: one valibot schema per key applied per key with `v.safeParse`, no
  `transform`, no `minValue`/`maxValue`, keys omitted rather than set to `undefined`.
- **The first-run link is 137 characters, not 141** — the one place this deviates from a stated
  gate, and it is a measurement, not a preference. § 9's *printed* URL spells `fl=6.0` and `x=75.0`,
  and that string is **not emittable**: the spec keeps the router's default codecs, where
  `stringifySearchWith(JSON.stringify, JSON.parse)` renders the number `6` as `6` and the string
  `"6.0"` as `%226.0%22`. § 3 says the same from the other side — « padding is display-only … so the
  URL serialises `6` ». 141 − those four padding characters = 137, asserted alongside the exact
  string and both absence meanings (`reg`, `mbf`/`ea`/`mu`), which is what the count exists to lock.
- **Two drivers is counted on the *raw* bag**, before per-key validation, so `?fl=abc&lo=151.64`
  refuses: § 7 says two present keys « are not a bad value but two contradictory models ».
- **`v` is not a scenario key** — `/?v=1` keeps bare-`/` semantics and restores the Session.
- **Inactive-configuration keys leave the completed bag silently** (an `L` beside a `tr`, a `d`
  under `fam=tx`): the strip's two salvage kinds stay two, and with a trace present `L` is derived,
  so nothing the line needs is removed.
- **`fam=tx` completes no rope.** `MBL` and `μ` arrive blank and required — § 9's family-flip state
  — because the retained textile spec is the Session's, not the Scenario's.
- **Scenario reconstruction is deliberately *not* here.** A `fam=tx` link cannot produce a valid
  `Scenario` (its `MaterialSpec` takes numbers, and § 9 ships `MBL`/`μ` blank), so bag → store
  hydration belongs to A7 with the draft state; this ticket owns the bag layer and the token tables
  A7 reads.
- `LinkRefusal` carries `routerCode` itself: `@tanstack/react-router` 1.170.27 has no `routerCode`
  and wraps a thrown `validateSearch` in its own `SearchParamError` with ours as `cause`, so the
  refusal page (ticket 26) reads `error.cause`.

**Spec-drift correction (§ 3 / § 7).** Nothing changed here: `scenarioToSearch`'s `daN()` was already
right about state holding newtons, and now that A2's formatter is on newtons too it is the **single**
N → daN conversion in the codebase — the write side of the URL and nowhere else.

**Rework onto amendment E — 2026-08-13.** The refusal is now a **returned marker, never a throw**.
No user-visible behaviour changed; all three gates green (suite 768, `schema.test.ts` 55 → 61 cases).

- `validateSearch` / `salvageSearch` never throw for the three refusal classes. A refused link comes
  back as `{ refused }` and **nothing else** — whole-link is kept by short-circuiting the per-key
  loop, so `dropped` is empty and `reportDroppedKeys` returns `[]`: there is no strip beside a
  refusal, only the refusal surface.
- **`LinkRefusal` survives as the carrier** — same `kind` (`RefusalKind`), `message` and `received` —
  but as a **plain object type rather than an `Error` subclass**, because it now travels inside the
  validated search, which the router may stringify or dehydrate, and only a JSON-shaped value
  survives that intact. `REFUSAL_KINDS` was added beside it (the four reason lines as data, which
  ticket 26 maps to copy) and `isLinkRefusal` as its guard.
- **`routerCode` is gone.** It existed only because the router wrapped a *thrown* `validateSearch` in
  its own `SearchParamError`; with no throw there is no wrapper and no `error.cause` to read, and a
  field spelling « the validator threw » on a marker that never throws is a lie a later reader would
  act on. No consumer existed — tickets 22 and 26 are still open — so removing it costs nothing;
  ticket 26 reads `search.refused.kind`.
- **The marker is re-entrant**, which is a router requirement rather than tidiness: `buildLocation`'s
  search middleware returns `{ ...incoming, ...validated }` and validates that merge again, so a
  marker dropped as an unknown key on the second run would flip the refusal off. `refuse()` therefore
  returns a structurally valid incoming `refused` unchanged. Accepted consequence: a hand-written
  `?refused={"kind":"tracé-illisible","message":"…"}` is honoured. A query string can only carry
  JSON, so no `instanceof` check could tell the two apart, and forging a refusal of your own link
  buys nothing. Anything failing the guard is an ordinary unknown key, named in the strip.
- **`completeFromDefaults` short-circuits on a refused bag** (returns it untouched, `completed: []`).
  Judgement call where the spec is silent: completion is the one operation that would turn « refused
  whole » into exactly the silent repair § 7 forbids — a scenario built entirely out of our defaults,
  which nobody authored. `canonicalLink` needed no guard: it emits `CANONICAL_KEYS` only, so the
  marker structurally cannot reach the address bar (asserted).
- `docs/conventions/routing.md`'s probe-4 paragraph was updated: the measurement stands, but its
  « nothing may assume 200 » rule is replaced by the decision that re-took it — **never throw from a
  `validateSearch` for anything the app means to render**, and the refusal answers 200 because
  nothing fails.

**Fix round — the marker *did* reach the address bar. 2026-08-13.** The review was right and the
claim of structural impossibility was wrong. Measured against the pinned tree with a throwaway
router: `applySearchMiddleware` returns `{ ...incoming, ...validated }`, `buildLocation`
stringifies **every** key of that merge — not only `CANONICAL_KEYS` — and `loadServerRoute` rebuilds
the canonical location on every document request and 307s when the href differs. `/?v=3` therefore
landed on `/?v=3&refused=%7B%22kind%22%3A%22version-inconnue%22…`, which « Copier le lien » would
have shipped. `canonicalLink` was never on that path, so asserting the invariant through it was
vacuous.

- **`keepRefusalOutOfTheAddressBar`** — a `SearchMiddleware<ValidatedSearch>` exported from
  `schema.ts` — removes the marker from the merge. Fixed at the one place that decides the href,
  and it costs the refusal surface nothing: `matchRoutes` runs **no** search middleware, so
  `Route.useSearch().refused` still carries it and amendment E's « the index route renders the
  refusal surface when `search.refused` is set » stands unchanged. The rebuilt href then equals the
  incoming one key-for-key — « refused whole » spelled in the address bar: nothing repaired,
  nothing added. Hand-rolled rather than `stripSearchParams(["refused"])`, which also feeds
  `meta.removedAny` and the `retainSearchParams` machinery this app has no use for.
- **Installing it is ticket 22's obligation**, recorded there as a note; the underlying rule is
  recorded as **probe 6** in `docs/conventions/routing.md`: *a `validateSearch` may return keys it
  received; a key it invents lands in the address bar.* `refused` is the app's only synthesised key.
- **The gate is now asserted through a real router** (`createRouter` + `createMemoryHistory` +
  the same `buildLocation({ _includeValidateSearch: true })` call `loadServerRoute` makes), with a
  **control case** that omits the middleware and asserts the 307 the middleware exists to prevent.
  Still a `node` unit test under amendment A: a location is built, nothing renders.
- **`isLinkRefusal` now checks `received`** too (presence, not definedness — the value is
  `unknown`). A hand-written `?refused={"kind":"version-inconnue","message":"x"}` used to be typed
  `LinkRefusal` while ticket 26's « version de schéma inconnue (v = … ) » quoted `undefined`, with
  no type error to warn anyone. The guard now promises exactly what the type declares.
- Ticket 22's « the refusal page is the index route's `errorComponent` » note was marked struck by
  amendment E, which it had outlived.

Gates green: `typecheck`, `lint-type-aware`, `test` (suite 774, `schema.test.ts` 61 → 67 cases).

