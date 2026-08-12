# A5 · `url/schema.ts` — `validateSearch` and the salvage table

Stage: A5
Status: open
Blocked by: 16, 17, 19
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 8, § 11 ·
[Amendments](../AMENDMENTS.md) **D**

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

Only the three refusal classes throw: unknown `v`, `tr` undecodable or oversize, two tightness drivers
present.

## Gate

`src/lib/url/schema.test.ts`, table-driven:

- **refusal** — `v` unknown, `tr` undecodable or oversize, **two tightness drivers present** — throws
  with `error.routerCode === 'VALIDATE_SEARCH'`;
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
