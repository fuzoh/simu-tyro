# A4 · `url/p1.ts` — the trace payload codec

Stage: A4
Status: done
Blocked by: 17, 18
Spec: [v1 build spec](../../zipline-simulator-v1/spec.md) § 8, § 11

## Delivers

`src/lib/url/p1.ts` — `encodeP1` / `validateP1` / `decodeP1`. Format `p1.<base64url>`: delta +
zigzag varint, centimetres, **altitude quantised by ceiling**, straightness carried as a scalar
`dev` instead of `Easting`/`Northing`. Hand-rolled and **synchronous**.

## Gate

| Assertion | Value |
| --- | --- |
| URL cost on the three real traces, exact | **910 / 859 / 897** characters |
| synthetic 200-point spans at 1000 / 1500 / 2000 m | **1065 – 1071** |
| whole URL with the readable keys | **≤ 2000** |
| `d` round-trips | **bit-for-bit exact** |
| altitude error | **≤ 0,010 m** |
| altitude is never lower than the original, every row | `z_decoded ≥ z_original` |
| `decodeP1(encodeP1(t))` re-encodes to the identical string | idempotent |
| `dev` round-trips, sentinel included | — |
| point count unchanged | 200 in, 200 out |
| `validateP1` | valid ⇒ returned **verbatim**; garbage ⇒ throws |
| oversize | a hand-authored 4 812-point trace refuses at « Copier le lien » |

## Notes

- **Synchronous because `validateSearch` is** — which rules out `DecompressionStream` outright and
  keeps terrain off an async boundary the engine design fought to avoid.
- **The trace is embedded, not omitted**, because `L`/`h` are *derived* from anchor placements: a link
  without terrain describes **no span at all**.
- **The ceiling rule is the assertion that matters most.** It makes the one lossy step provably
  safe-side, and `z_decoded ≥ z_original` is what catches someone "fixing" ceiling to nearest.
- **No resampling to shrink the payload.** Resampling was killed for making a coarse import
  indistinguishable from a fine one; shrinking here smuggles it back in.
- **`dev` must survive a link, sentinel included** — otherwise every shared trace degrades to
  « rectitude non vérifiable » and the recipient loses a disclosure the sender had.
- **Oversize refuses rather than degrades.** A terrain-less link of an imported scenario is a
  *different* scenario. The filename does not travel — the receiving side reads
  « tracé reçu par lien ».
- **The `p1.` sentinel is not cosmetic**: the default `parseSearch` JSON-parses every value, so an
  all-digit base64 payload would **silently lose precision**.
- **Decode timing (2,3–2,5 µs) belongs in `p1.bench.ts`, not in a test.** A microsecond assertion in
  CI is a flake generator.
- Stations `sa` / `sb` are full-precision scalars, so `L = sb − sa` is unaffected by cm quantisation.

## Comments

**Done.** `src/lib/url/p1.ts` — `encodeP1` / `validateP1` / `decodeP1`, plus `fitsLinkBudget`,
`P1_PREFIX`, `URL_BUDGET_CHARS` and the `P1Error` refusal (`illisible` · `hors-budget`) — with
`p1.test.ts` (48 cases) and `p1.bench.ts` beside it. Status flipped during ticket 20's fix round:
the deliverable and its gate table were already in the tree and green, only the board was stale.
