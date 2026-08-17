# URL state schema and persistence

Type: grilling
Status: resolved
Blocked by: — (04, 05, 06 resolved)
Map: [Zip-line simulator v1](../map.md)
Reads: [ticket 04](./04-span-and-rigging-parameter-model.md) — the field table is the state to
serialise, plus two display preferences that also persist: the force unit (daN/kN/kgf) and the
active Tightness Spec mode. Note that `L`/`h` are _inputs_ in manual mode and _derived_ in
imported mode, so what the URL carries differs by terrain source.

## Question

What exactly goes in the URL, what goes in localStorage, and what happens to a shared link
whose terrain came from a file on someone else's disk?

The map fixes the approach — URL search params for shareable state, localStorage for the
last session, the imported trace stays local. This ticket designs it.

Settle:

1. **The search-param schema.** Every parameter from
   [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) and
   [Material spec model](./05-material-spec-model.md), with its key name, encoding and
   precision. Decide between readable keys (`span=250&h=-40`) and a single opaque encoded
   blob. Readable keys are debuggable and hand-editable; a blob is shorter and versionable.
   Decide how floats are rounded — full precision makes ugly URLs, rounding makes a shared
   link produce slightly different numbers than the sender saw.
2. **Validation on the way in.** TanStack Router validates search params. Decide the
   validation library or hand-rolled validators, and — more importantly — decide what
   happens when a link carries a value that is out of range or a key the app no longer
   knows. Fall back to a default silently, or tell the user the link was partly ignored?
3. **Schema versioning.** A shared link outlives the schema that made it. Decide whether a
   version key ships in v1 and what the upgrade path looks like, or explicitly accept
   breakage and say so.
4. **The trace and the URL.** **Ticket 06 measured it: 10.4 KB / 200 rows**, so a trace cannot
   ride in a search param — a shared link necessarily loses the terrain unless something else
   carries it. Decide the behaviour: does the link carry the anchor _placements_ and fall back
   to the straight anchor-base ground line, does it embed the trace compressed, or does it
   refuse to encode an import-derived geometry at all? Decide what the recipient sees —
   silently different terrain is the worst answer available, and it is worse here than it looks:
   ticket 06 makes `L` and `h` *derived* from the trace, so losing the terrain silently changes
   the span itself, not just the ground under it.
5. **localStorage.** What is stored, under what key, and how it interacts with the URL when
   both are present. Precedence matters: a user clicking a shared link should see the link's
   scenario, not their own last session. Decide whether the trace itself is cached there
   (10.4 KB is trivially within quota — the question is staleness and privacy, not size), and
   how big a trace is allowed to be before that changes.
6. **The write side.** When does the URL update — on every keystroke, on blur, debounced?
   Every keystroke pollutes browser history; debounced risks a stale link when the user
   copies the address bar. Decide, including whether updates replace or push history
   entries, and whether the browser back button meaningfully undoes a parameter change.

## Context

Read `docs/conventions/routing.md` — TanStack Start with SSR and file-based routing,
`rsc: false`. Check the current TanStack Router search-param API with `ctx7` before
committing to a design; do not rely on remembered API shapes.

Depends on the parameter and material tickets for the field list, and on
[CSV profile import and anchor placement](./06-csv-profile-import-and-anchor-placement.md)
for how a placement is expressed once terrain exists.

**Inherited from ticket 06** (§3, §9) — the state shape is already fixed, and it was chosen
partly to keep this ticket's options open:

```ts
profile = { d: Float64Array, z: Float64Array }   // file coordinates, immutable
anchorA = { station, height }
anchorB = { station, height }
// L, h and the engine's Terrain are all derived — never stored
```

Because the profile is kept in **file coordinates** rather than translated, all three options
in sub-question 4 remain available: the original bytes are always recoverable, so the trace can
be re-serialised, hashed for a reference, or dropped without corrupting anything. Had the
import translated and sliced eagerly, only the lossy option would have survived.

**Inherited from [Results panel](./08-results-panel-and-provenance-warnings.md)** — two new pieces
of state, one of them with an unusual absence semantic.

- **`Régime de sécurité`** — one of five enumerated entries (EN 15567-1 · WorkSafe QLD 2019 ·
  ACCT 10:1 · ANSI/ACCT 03-2019 5:1 · Secours textile 10:1). There is **no free `k`**, so this
  serialises as an enum, never a number. It has **no default** (ticket 04), which makes it the one
  field whose *absence from a URL is legitimate state* — « — choisir — », not a fallback to be
  filled in. A shared link that omits it must not silently acquire a regime.
- **`Coefficient dynamique`** (`DAF`, default 1,2) — a plain number, new to ticket 04's field
  table.

Also note ticket 08 §5's availability coupling: *Secours textile 10:1* is invalid under steel or
`PERMANENTE`. A URL carrying that combination is a restorable-but-invalid state, the same class of
problem as ticket 05's retained-across-flip material specs.

## Answer

Resolved by grilling, 2026-08-12, over two rounds. API facts checked against `ctx7`
(`/tanstack/router`) and against the installed source in
`node_modules/@tanstack/router-core/dist/esm/searchParams.js` — not from memory, per the
ticket's own instruction.

### 0. The governing principle — the URL is a typing boundary, not a validation boundary

One rule answers sub-question 2 and both hazards inherited into this ticket:

> The URL restores state **faithfully, including invalid state**. Validation is the app's job,
> and it is the *same* validation whether the state was typed or arrived in a link.

The parser rejects only what is **unrepresentable** — not a finite number, not a member of the
enum, a key the schema does not know. Nothing else. So:

- `L=-5` loads into the field and lights up ticket 04 §7's existing form validation.
- `reg=secours10&fam=ac` — forbidden by ticket 08 §5 — **arrives invalid** and raises that
  ticket's blocking error with its one-click fix, exactly as if the user had clicked into the
  state.
- An `L₀` violating §5.4's chord bound because the sender's link was textile and the recipient
  flipped to steel (ticket 05 §7) surfaces as `invalid-input{field:"L0"}` from the engine.

Two reasons, and neither is laziness. Ticket 04 §7 fixed **two tiers with one source of truth
each**; re-checking hard ranges in the URL parser would make three tiers with the same rule
living in two of them. And silently repairing an arriving link produces a scenario **neither
party ever saw** — which is the failure this ticket already names as the worst answer available,
landing in the one field ticket 08 pins first in its aggregate list.

The same principle governs the write side (§7) and the refusal path (§4): **a link is applied
whole or refused whole**; individual keys are dropped only when the remainder still describes a
complete line.

### 1. Readable keys, not a blob — and two structural tricks

Flat, readable search params. A blob buys shortness we do not need (~200 chars before the trace)
and versionability that costs four characters otherwise (§3). It costs the two things this app
trades on: a corrupt blob loses everything where a corrupt key loses one field, and **a URL you
cannot read is a URL you cannot check** — indefensible in a tool whose entire ethos is that no
number arrives without provenance.

```
/?v=1&u=daN&use=perm&reg=en15567&L=250&h=-40&za=4&zb=2.5
  &fl=6.0&fam=ac&d=12&r0=1770&cst=iwrc&ta=manchon&tb=cosse&na=1&nb=0.9
  &mp=120&hr=2.1&daf=1.2&x=120
```

**The tightness driver is encoded by which key is present** — `fl=` / `te=` / `lo=` — never by a
`tm=mode` key plus a value. Ticket 04 §3 fixed that exactly one of the three is state; three
value keys would let a URL carry *contradictory* tightness, and a `tm`+`tv` pair is unreadable by
hand. Presence-encoding makes contradiction detectable (two present ⇒ drop both, report) and
removes a key.

**The terrain source is inferred from the presence of `tr`**, not stated. This extends ticket 05
§7's rule — "the URL carries only the *active* family's spec" — from material to terrain:

> **The URL carries the active configuration and never a retained alternate.**

So an imported link has `tr`/`sa`/`sb` and no `L`/`h`; a manual link has `L`/`h` and no `tr`.
`fam` stays explicit, because a URL with no line keys at all still needs a family.

#### The key table

| Clé | Grandeur | Unité / jeton | Présence |
| --- | --- | --- | --- |
| `v` | version de schéma | entier | absente ⇒ 1 ; inconnue ⇒ refus (§3) |
| `u` | unité de force affichée | `daN` \| `kN` \| `kgf` | **affichage seul** (§2) |
| `use` | type d'installation | `perm` \| `tempo` | toujours |
| `reg` | régime de sécurité | `en15567` \| `wsqld` \| `acct10` \| `ansi5` \| `secours10` | **absence = « — choisir — »** |
| `L` | portée | m | mode manuel seul |
| `h` | dénivelé | m | mode manuel seul |
| `sa` `sb` | stations A / B | m, coordonnées fichier | mode importé seul |
| `za` `zb` | hauteurs d'ancrage A / B | m | toujours |
| `fl` \| `te` \| `lo` | flèche cible / prétension cible / longueur non tendue | m / daN / m | **exactement une** |
| `fam` | famille de ligne | `ac` \| `tx` | toujours |
| `d` | diamètre nominal | mm | acier |
| `r0` | grade | `1770` \| `1960` | acier |
| `cst` | construction | `tc` \| `iwrc` | acier |
| `mbf` `ea` `mu` | valeurs déduites surchargées | daN, daN, kg/m | acier — **absence = non surchargée** |
| `cls` | classe de corde | `hmpe` \| `pa` \| `pes` | textile |
| `mbl` | charge de rupture | daN | textile |
| `mu` | masse linéique | kg/m | textile (même clé, sémantique fixée par `fam`) |
| `k` | raideur relative `EA/MBL` | — | textile |
| `ta` `tb` | terminaisons A / B | `manchon`·`cosse`·`epissure`·`coin`·`serre` (acier) · `oeil`·`epissure`·`huit`·`chaise` (textile) | toujours |
| `na` `nb` | `η_t` A / B | — | toujours |
| `mp` | masse passager | kg | toujours |
| `hr` | enveloppe passager | m | toujours |
| `daf` | coefficient dynamique | — | toujours |
| `x` | position du passager `x_D` | m, repère de portée `[0, L]` | toujours |
| `tr` | tracé | `p1.<base64url>` | mode importé seul |

`mu` serves both families deliberately: it is the same physical quantity, and `fam` already fixes
whether it is an override or a direct input. `epissure` appears under both families for the same
reason.

**Absence carries three distinct meanings in this schema and never a fourth** — see §5.

### 2. Forces in the URL are always daN; `u` is display-only

Ticket 04 §5 put the force unit in the URL as a display preference. If the URL's *numbers* also
followed the selector, `u` would become semantic: hand-editing `u=daN`→`u=kN` would make the line
100× tighter — the precise error class ticket 05 §8 refused a carve-out to avoid.

Ticket 04 §5's own stated property is the argument: **a display control must be provably
physics-neutral.** That property has to hold at the serialisation boundary too, or it quietly
stops holding exactly where a URL is hand-edited. So forces serialise in **daN, fixed** — the
field table's unit, French rigging practice, and exactly ×10 N so lossless — and `u` changes no
number's meaning anywhere.

**Cross-check finding, and an amendment to ticket 05.** Ticket 05 §8 rejected all carve-outs from
the global selector ("strict global wins"), but its own §2 table renders **`EA` in MN** while
`MBF` is in daN. That is an undeclared carve-out. It survives — §8's argument was about *eyeball
comparability* (437 daN read against 90,7 kN), and `EA` is never compared to a tension by eye,
being three orders of magnitude larger and consumed only inside ratios — but it must be **stated
as a carve-out with that reason**, not left as an inconsistency for ticket 10 to trip over.
Ticket 05 amended accordingly. In the URL, `ea` is daN like every other force.

### 3. Precision — refuse the trade, and round earlier

The ticket frames this as full precision (ugly) versus rounding (a recipient who sees different
numbers than the sender). Both horns are avoidable, because **the URL carries only inputs, and
inputs are typed at field precision** — `12`, `120`, `1,2`, `6,0`.

The only inputs that are *not* typed are those pre-filled from a computed read-out: ticket 04
§3's mode switch (`Tension`→`Longueur` pre-fills `L₀` from the 201,84 read-out) and ticket 05
§5's «recalculer» on a stale override. So the rule moves upstream of serialisation:

> **A prefill writes the *displayed* value into state, never the underlying float.**

201,84 enters state; 201,8412773 never does. The URL is then exact by construction and short by
construction, and **there is no rounding decision left to make** — serialisation is verbatim.

Stated cost: this makes each field's display precision load-bearing *state* rather than
cosmetics, and no ticket owned per-quantity display precision. Handed to ticket 10 as an assembly
obligation — a formatting table, mechanically derivable from the field tables' units and hard
ranges now that the rule is fixed. Nothing left to decide there, only to tabulate.

**Amended 2026-08-12** by
[First-run scenario and defaults](./14-first-run-scenario-and-defaults.md): "nothing left to
decide there, only to tabulate" is wrong. The table is a **measured sensitivity decision**, not a
mechanical derivation from units and hard ranges — `L₀` is the sharp case. At the first-run line,
1 decimal (151,6 vs 151,644 m) costs 0,21 m of flèche and 0,20 m of garde, **8 % of the shipped
clearance margin**; 2 decimals costs 0,02 m. `L₀` needs 2 decimals in the table ticket 10 owns.

#### Schema versioning

**`v=1` ships**, with **absent ⇒ v1** and **unknown ⇒ refuse the whole link**. No upgrade path:
there is no v0 to upgrade from, and speculative migration code rots unexercised. What the key
buys is that in v2 an old link is *distinguishable* from a corrupt one, so v2 can refuse honestly
(« lien créé par une version antérieure ») instead of silently misreading — a capability that
does not exist without it. Absent ⇒ v1 keeps hand-authored `?L=250&h=-40` working, which §1's
readability argument would otherwise be wasted on.

### 4. Refusal, dropping, and rewriting the address bar

Throwing from `validateSearch` replaces the route component with `errorComponent` and sets
`error.routerCode = 'VALIDATE_SEARCH'` (verified). That is a full-page outcome — right for a
worthless link, wrong for one bad field.

| Cas | Comportement |
| --- | --- |
| `v` inconnue | **refus complet** — `errorComponent`, « Ouvrir l'application vide » |
| `tr` indécodable ou hors budget | **refus complet** — sans tracé il n'y a pas de portée (§6) |
| `fl` et `lo` tous deux présents | les deux ignorés, bandeau |
| clé inconnue, ou valeur non représentable | clé ignorée, bandeau |
| valeur hors plage, combinaison invalide | **appliquée telle quelle** (§0) |

The undecodable-trace refusal follows from §6's premise: ticket 06 makes `L` and `h` *derived*,
so a partial application would fabricate geometry the sender never entered.

**Amended 2026-08-12** by [Validation and error-state UX](./11-validation-and-error-state-ux.md):
the `fl` et `lo` tous deux présents row above is wrong. Ticket 14 §8 elected completing an absent
tightness driver from the first-run defaults, so dropping both keys no longer leaves the field
blank for the user to fill — it silently completes to Flèche 6,0 m, and every number on screen then
rests on our default tension rather than the sender's. That fails §4's own criterion for a partial
drop, « only when the remainder still describes a complete line ». Row now reads: **`fl` et `lo`
tous deux présents (two or more tightness drivers) ⇒ refus complet**, same treatment as an
undecodable trace, not a partial drop.

**Dropped keys are reported and the address bar is rewritten on load.** The router rebuilds the
URL from validated search on the next navigation (`_includeValidateSearch: true` in
`buildLocation`), so an unknown key otherwise survives until the user's first edit and then
vanishes with no signal. Instead: one `replace` navigation to the validated search immediately at
load, paired with a dismissible banner naming what was ignored. The address bar then always holds
exactly the state the app holds — the alternative lets the user copy a URL still carrying keys
their own app ignored. Banner wording and placement belong to ticket 11.

**Amended 2026-08-12** by [App shell and routing shape](./13-app-shell-and-routing-shape.md) §4:
the mechanism stated above is measured false, while the decision it supports is unchanged and
strengthened. That rebuild is gated on `router.options.search?.strict`, which stays unset in this
app — so an unknown key does **not** survive-then-vanish; it persists in the address bar
indefinitely. **Rewrite-on-load is the only thing that ever cleans it.** The rewrite still works
under `search.strict = false` because a navigation whose `search` is a plain object replaces the
whole bag rather than merging with the raw one. Ticket 10 must not reproduce the wording above.

#### No `stripSearchParams`, no router-level codec override

**Every key that has a value is stated, even at its default.** Absence already means two things
that are *not* defaults — `reg` absent is « — choisir — » (ticket 04 §8), and `mbf`/`ea`/`mu`
absent means *not overridden*, which differs from "equal to the formula value" (ticket 05 §5).
Adding "absent = default" as a third meaning makes absence unreadable in exactly the field ticket
08 pins first. Second argument: `mp=120` and `hr=2.1` are **Unconfirmed Defaults**. A link that
states them records what the sender actually computed with; a link that omits them says
"whatever your build thinks the unattested number is" — the inverse of the map's binding
provenance rule. 200 characters is not a problem worth creating an ambiguity to solve.

The router's default `parseSearch`/`stringifySearch` are **kept** — one less global concern for
ticket 13. They are better than they look: `defaultParseSearch = parseSearchWith(JSON.parse)`
JSON-parses each value with a raw-string fallback, so `L=250` arrives as the number `250` and
`use=perm` as the string `"perm"` (JSON.parse throws, value passes through unquoted).

**But there is one sharp hazard, and §6's payload walks straight into it.** A base64url string
drawn from `[A-Za-z0-9-_]` that happens to be all digits, or shaped like `-123` or `1e5`, **is
valid JSON and arrives as a number with its precision destroyed**. Improbable at 700 characters,
entirely plausible for a three-point hand-authored CSV. Hence the `p1.` sentinel in §6: one
character, JSON.parse throws on it forever. Schema rule: **no key may take a value that
JSON-parses to something other than what was meant** — which bites only `tr`, since every enum
token is alphabetic.

### 5. The regime's absence, and a hole this ticket exposes

`reg` is **optional with no default**, and its absence is state — « — choisir — », never a
fallback to be filled in. It must not appear in any defaults object or `stripSearchParams` map.

Which forces a question no ticket owned: **there is no verdict state for "no regime chosen."**
Ticket 04 §8 gave the field no default; ticket 08 §6 defined five verdict states and **all five
presuppose a regime**, since its grammar rule requires naming the chosen regime inside the
sentence. Making absence legitimate *shared* state is what forces it, but the hole is not
URL-specific — ticket 14's first run opens in the same state.

**It is not a sixth verdict state.** `Indéterminé` is defined as "styled as neither pass nor
fail" and concerns a sweep that partly failed to converge; here nothing was attempted. So the
banner is **absent**, replaced by a prompt — « Choisissez un régime de sécurité pour obtenir un
verdict ». Recorded here as a finding; presentation handed to ticket 11, with a note to
ticket 14.

### 6. The trace — embedded, compressed, exact

10,4 KB / 200 rows cannot ride in a search param raw. The ticket's own framing narrows the three
options sharply: ticket 06 makes `L` and `h` **derived**, so a link that drops the trace does not
describe a coarser version of the span — it describes **no span at all**, and "fall back to the
straight anchor-base ground line" would mean fabricating a manual scenario the sender never
entered.

**Embed it.** The payload is the friendliest case imaginable — 200 monotone numbers — and
refusing would make the app's serious workflow unshareable while wasting a decision already made
for us: ticket 06 kept file coordinates canonical *specifically* to leave this option open.

Format `p1`, synchronous, base64url:

```
p1.<varint n><zigzag d[0]><zigzag Δd ×(n−1)><zigzag z[0]><zigzag Δz ×(n−1)><varint dev>
```

- Quantised to **cm**. Altitude by **ceiling, never nearest**, so shared terrain is never *lower*
  than the original and the single lossy step is provably safe-side — at a magnitude ticket 06
  already ruled beneath notice (its ≈5 mm convexity finding).
- **No resampling.** Ticket 06 rejected it for making a coarse import indistinguishable from a
  fine one; shrinking the payload by resampling would smuggle it back in through the side door.
- `dev` carries the **straightness verdict** (max lateral deviation, cm) as one scalar, with a
  sentinel for « rectitude non vérifiable ». `Easting`/`Northing` are *not* embedded — they would
  roughly double the payload, and they were only ever consumed by a check already performed at
  send time. Without this, every shared link would degrade into ticket 16's unverifiable state
  and the recipient would lose a disclosure the sender had.
- Grid quantisation does **not** touch `L`: stations ride as full-precision scalars `sa`/`sb`, and
  `L = sb − sa`.

Estimated ≈1,1–1,3 KB of URL for a general 200-point trace, ≈0,8 KB when `d` is uniform — which
is always, for a geoportal export (ticket 06: spacing is `length/199`). **This estimate must be
verified against ticket 06's two real traces during implementation** — an obligation on ticket 10,
not a settled number.

**Amended 2026-08-12** by [Assemble the v1 build spec](./10-assemble-the-v1-build-spec.md): the
estimate above is now **discharged, not merely estimated** — measured **910 / 859 / 897** URL
characters for the three real example traces (`example-profile-trace{1,2,3}.csv`; there are three,
not two, per ticket 16). Also measured: 1065–1071 chars for synthetic 200-point spans at
1000 / 1500 / 2000 m — ≈1,1–1,3 KB with the ~200 chars of readable keys, against the 2000-char
budget stated below. Decode 2,3–2,5 µs; altitude error ≤ 0,010 m; distance exact.

Why a hand-rolled synchronous codec rather than `CompressionStream('deflate-raw')`: **a hard
constraint found in the source.** `validateSearch` runs synchronously inside `buildLocation`, so
`DecompressionStream` cannot run inside it. The alternative — keeping the payload opaque in
validated search and decoding it asynchronously downstream — puts terrain behind a boundary the
whole app then has to model, when ticket 03 fought to keep the engine synchronous and ticket 12's
`useSweep` seam exists for *recompute*, not for "do we have ground yet". Deflate also buys little
on 200 monotone integers — that shape is what delta coding is for. Sync is additionally
fixture-testable in Vitest with no stream polyfill in jsdom, and decodes in ~200 iterations,
microseconds against ticket 12's 8 ms budget.

**Oversize:** the whole URL is budgeted at **2000 characters** — the limit chat clients, mail
and QR codes actually impose. Ticket 16 caps the geoportal export at 200 points, so only
hand-authored CSVs can exceed it. Checked at « Copier le lien », which then **refuses rather than
degrades**: « Tracé trop volumineux pour un lien (4 812 points). Partagez le fichier CSV. » A
terrain-less link of an imported scenario is not a weaker link, it is a different scenario — §0's
whole-or-nothing rule applied on the write side.

**Metadata that does not travel:** the source **filename** and import date. The filename is the
only weakly-identifying string in the payload — geoportal exports get named after sites — and it
reproduces nothing. Ticket 06's provenance block keeps everything it needs: point count and max
spacing are derivable from the payload, straightness rides in `dev`. The "which file" line
becomes a **distinct state, « tracé reçu par lien »**, rather than a blank or a stale name.
localStorage keeps the filename, since that is the user's own session.

### 7. localStorage, and the write side

**Precedence: any recognised scenario key present ⇒ the URL wins wholesale. Bare `/` ⇒ restore
the session.** Never a merge — a merge yields the recipient's rope on the sender's span, a third
scenario nobody authored, which is §0's failure in a new costume.

Stored under one key `scoutech:session:v1` — **the version is in the key**, so a schema change is
a clean miss rather than a parse error.

One deliberate asymmetry, which is really ticket 05 §7's position restated rather than a new
rule: **localStorage holds both Material Specs and the retained manual geometry; the URL holds
only the active one.** localStorage is *your session*; the URL is *this line*.

- The **trace is always cached** (10,4 KB is nothing, and losing terrain on refresh would be the
  app's worst possible refresh behaviour). On quota failure, store the scenario without it and
  say so.
- Debounced ≈1 s write; **post-mount read only**. The SSR-mismatch mechanism itself stays
  ticket 13's sub-question 4 — this only names the constraint.
- A « Effacer la session » control ships, since the cached trace is the one piece of user data
  the app retains.

**Write side: `replace: true` always, ≈400 ms debounce, plus an explicit « Copier le lien » that
flushes pending state synchronously before copying.** The copy button dissolves the ticket's
stated dilemma outright — once copying does not go through the address bar, debounce grain stops
being a correctness question and becomes a performance one.

**Back is not undo.** Rejected on a stronger ground than history clutter: history restores search
params but **not** the retained inactive Material Spec (ticket 05 §7) or the retained manual
geometry (ticket 06 §5), so Back would land the user in a state subtly different from the one
they left, silently — §0's failure a third time. Real undo needs a real stack; that is a feature,
not a side effect, and it is out of v1.

`x` (rider position) is in the URL, debounced with everything else: ticket 07 made the read-out
strip position-dependent — the clearance cell reports the worst clearance *for the current rider
position*, with the dimension line drawn where that minimum sits — so a link without `x` does not
reproduce what the sender was looking at. Nothing safety-bearing rides on it, since the Verdict
is position-independent by CONTEXT.md's definition.

Layer toggles (« ligne à vide », « corde A–B ») are **localStorage-only**. They change what is
drawn, never how a number reads — which is the line `u` sits on the other side of.

### 8. What this hands forward

| Ticket | Obligation created here |
| --- | --- |
| [10](./10-assemble-the-v1-build-spec.md) | per-quantity **display precision table** (§3) · verify the `p1` payload size against ticket 06's two real traces (§6) · carry ticket 05's `EA`-in-MN carve-out as *declared* (§2) |
| [11](./11-validation-and-error-state-ux.md) | the ignored-keys banner (§4) · the refusal page for an unknown `v` / undecodable trace (§4) · **no-regime ⇒ no verdict banner, a prompt instead** (§5) · invalid combinations arriving *already* invalid rather than being entered (§0) |
| [13](./13-app-shell-and-routing-shape.md) | hand-rolled `validateSearch` (no zod) · **no router-level codec override** (§4) · rewrite-on-load `replace` navigation (§4) · post-mount localStorage read (§7) · `validateSearch` runs on the server too, so the codec must be isomorphic |
| [14](./14-first-run-scenario-and-defaults.md) | first run opens with **no regime**, so §5's prompt is the first-run banner state too |
| [05](./05-material-spec-model.md) | amended: `EA` in MN is a declared carve-out from §8's strict-global rule |

**Amended `CONTEXT.md`** with **Scenario** and **Session** — the distinction this ticket created
between what a link carries and what the browser remembers.
