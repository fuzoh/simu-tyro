# P3 · Delete the prototype

Stage: P3
Status: open
Blocked by: 02, 10, 29
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 10 (P3) ·
[Amendments](../AMENDMENTS.md) **B**

## Delivers

Deletion of `src/routes/prototype.profile-view.tsx` **and** `src/routes/-prototype-07/` (nine files),
letting `@tanstack/router-plugin` regenerate `src/routeTree.gen.ts`.

## Gate — three items, none of them optional

1. **Ticket 02 + ticket 10 done** — §15's fixtures are Vitest cases and the bench runs from
   `bun run bench`.
2. **Ticket 29's measurements taken** — the three pixel budgets, the banner heights 44 / 60 / 76 px,
   the View Strip's label widths. These are computed from the prototype's Tailwind classes, **not
   rendered**, and they are the only numbers in the layout contract not measured on the artifact.
   Amendment B makes them `agent-browser` scripts, so unlike the spec's manual version they **survive
   the prototype** — but they must still be *taken* while it stands.
3. **The first-run auto-fit VE confirmed at ≈ ×1,5** on a 1080×420 plot, inside the Plot Aspect Band
   and clear of the ×1 floor — also ticket 29.

The first two gates exist because **the evidence dies with the artifact**; the third because the
prototype is the only place the comparison can still be made.

## Notes

- **A build today ships the prototype as a public route** — `src/routeTree.gen.ts:12` still carries it.
  That is why deletion is *sequenced* rather than indefinitely deferred.
- **Never hand-edit `src/routeTree.gen.ts`.** Delete the files and let the plugin regenerate.
- **Do NOT lift `src/routes/-prototype-07/solver.ts` into `src/lib/sim/`.** Not only because ticket 07
  laid it out so it could not be mistaken for a head start — lifting it means **rewriting** it:

  | The prototype has | The contract needs |
  | --- | --- |
  | `SpanInput = { L, h, L0, w, EA, P?, sP? }` — one load, flattened | `loads: PointLoad[]` |
  | no Jacobian export | `jacobian.ts` as its own file, because §15 asserts its partials |
  | no `resolveL0`, no `Z6` | §7's three modes and the bound re-emitted in the driving quantity |
  | `SolveError` without `bound` / `boundKind` | the amended payload — « Tension impossible » is unwritable without it |
  | no `verdict.ts`, no `materials/` | §10, §13.1's K-factors, §13.2's `EA = k·MBL`, the §10.4 gate |
  | one file | eleven modules by concept, each citing its § in a header comment |

- **`check.ts`'s only remaining use is as a checklist** — it records exactly which fixtures were
  verified and to what error. It is not a value source.
- The prototype's *measurements* are quoted throughout the spec and survive deletion; its *code* does
  not need to.
