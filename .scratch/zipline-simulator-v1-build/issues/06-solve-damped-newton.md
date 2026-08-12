# E4 · `solve.ts` — the damped Newton solver

Stage: E4
Status: open
Blocked by: 05
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 2, § 11

## Delivers

`src/lib/sim/solve.ts` — §5's damped Newton iteration, §5.2's seeds and re-seed cap, §5.3's
tolerance, §4.3's branches, and the `invalid-input` path for §5.4's chord bound.

## Gate

| Case | Value |
| --- | --- |
| `Z1` | `H = 1423.94 N`, `V₀ = −251.250 N`, `V_B = +251.250 N`, `T_max = 1445.94 N` |
| `Z2` | `H = 1442.11 N`, `V₀ = −510.000 N`, `T_A = T_B = 1529.63 N`, `z_min = −8.75376 m` |
| `Z3` | `H = 1286.38 N`, `V₀ = −468.701 N`, `V_B = +141.299 N`, `T_A = 1369.11 N`, `T_B = 1294.12 N`, **and `T_A > T_B`** |
| invariant | `V₀ = −w·L₀/2` for `h = 0`, `loads: []` — **exact**, it is `levelSpanShortcut`'s whole claim |
| invariant | symmetry, and `EA → ∞` |
| refusal | `L₀` **197,404 m** on a 200 m level span and **987,02 m** on 1000 m raise `invalid-input{field:"L0"}` — assert `bound` and `boundKind`, not just the kind |

Solved scalars at **4×10⁻⁶** relative. §5.3's tolerance is `1×10⁻⁶ m` absolute for spans ≲ 1000 m,
`1×10⁻⁶·L` beyond.

## Notes

- **The §5.4 chord bound *is* the breaking load.** At the floor `L₀`, `T_max` reaches 100,0 % MBF
  (200 m) and 101,1 % (1000 m) — so there is no reachable state where a line solves cleanly and the
  verdict says rupture. This is why the failure is a refusal with an attainable bound and **no fix
  button**, not a safety verdict.
- **Most of §5.4 is internal remedies that *succeed*.** Only three failures are real kinds; damping
  and re-seeding are notes, not failures.
- **Deep slack converges** — it is not a failure. `L₀` 400 m on a 200 m span lands at garde
  −169,67 m with `contact: "cable"`, which is a clearance verdict (ticket 09 here), not
  `slack-limit`.
- `no-convergence` and `slack-limit` are **unreachable inside the admissible envelope** (measured:
  349 440 solves, `reseeded` 0, near-taut condition 0). Their tests are **injected** via `vi.mock`
  on the collaborator — never hunted with pathological inputs, and never by widening the public
  signature. Voir § 11.
- The `damped` note fires in 0,6 % of iterations in aggregate; test it by calling the damping branch
  directly, since it is a named module export.
