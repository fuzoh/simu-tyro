# E11 · `index.ts` — the public barrel

Stage: E11
Status: open
Blocked by: 04, 05, 06, 07, 08, 09, 11, 12, 13
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2

## Delivers

`src/lib/sim/index.ts` — the one path app code imports.

## Gate

**No deep import into `src/lib/sim/**` from anywhere outside it.** Add the check as a lint rule or a
test, not as a convention nobody enforces.

## Notes

- Eleven modules by concept, **each citing its § in a header comment** — the layout is
  `src/lib/sim/` by concept, and the A/B separation sits at `materials/steel.ts` vs
  `materials/textile.ts`.
- The barrel is what lets terrain cross as **cloneable data**, which keeps the worker door open even
  though ticket 10 measured that we do not need one.
- `solveSpan(input, warmStart?)` and the rest are **contract**. A test-only third parameter to make a
  guard reachable is the tail wagging the dog — inject with `vi.mock` on the collaborator instead.
