# 32 — Verify shared-link lifecycle in browser

**What to build:** Follow every meaningful incoming-link path through address-bar rewrite and rendered Scenario. Valid links restore faithfully, partial links complete literally, ignored keys remain disclosed long enough to explain rewrite, and contradictory links refuse as whole.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Full shared URL restores all Scenario values, including representable invalid value such as negative span, without silent repair.
- [x] Partial URL fills omitted values from First-Run Scenario while preserving every supplied value literally.
- [x] Unknown key is ignored, named in dismissible strip, and absent from canonical address after rewrite.
- [x] Two Tightness Drivers produce whole-link refusal at HTTP 200 rather than merged Scenario.
- [x] « Ouvrir l’application sans ce lien » returns to clean app on same route.
- [x] Copied link reproduces current valid Scenario and never includes synthesized refusal marker.
- [x] Browser procedure and any required fixtures are repeatable; pure defects gain unit regressions where possible. — procedure recorded and re-run end to end twice with identical results; the one pure defect found (`scenarioToSearch` key order for textile `mu`) is **fixed** with a colocated regression, voir *Fix pass, 2026-08-14* below.

---

## Comments

### Environment, 2026-08-14

`HeadlessChrome/151.0.0.0` (`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 … Safari/537.36`),
`agent-browser 0.34.0`, session `scoutech-t32`, Linux (cachyOS). Viewport **set** with
`agent-browser set viewport 1440 900` and **read back** `innerWidth × innerHeight = 1440 × 900`.
Dev server the orchestrator started, `http://localhost:3000/`, confirmed with
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200`. Every HTTP status below is
`curl`'s, never the rendered page. Every URL below is `agent-browser get url` / `location.href` read
back **after** the load, never the URL that was typed. `localStorage.clear()` precedes each case, so
no result leans on a Session.

Gates, all run from the repo root after the browser work:

```
bun run typecheck        → tsc --noEmit, exit 0
bun run lint-type-aware  → oxlint --type-aware --type-check, exit 0
bun run test             → vitest run: 39 files, 1268 tests passed, exit 0
```

No `bunx oxfmt --write`: the only file this run touched is this ticket, and markdown is in
`.oxfmtrc.json`'s `ignorePatterns`. **Nothing under `src/` was changed** — this run is read-only there
by mandate.

### Item 1 — full link, all values, negative span, no repair

Arrival URL (manual + steel, every key of the active configuration, `L` negative):

```
/?v=1&u=kN&use=tempo&reg=en15567&L=-5&h=-24&za=10&zb=8&lo=160&fam=ac&d=14&r0=1960&cst=tc
 &ta=serre&tb=cosse&na=0.8&nb=0.9&mp=95&hr=1.9&daf=1.3&x=40
```

`curl` **200**. `get url` after hydration is **byte-identical** to the arrival URL — no rewrite, no
strip (`Une partie du lien` / `Champs absents` both absent). Restored values, read off the DOM by `id`:

| control | value | control | value |
| --- | --- | --- | --- |
| `rail-L` | `-5,0` | `rail-h` | `-24,0` |
| `rail-zA` / `rail-zB` | `10,0` / `8,0` | `rail-L0` | `160,00` |
| `family` radio | `steel` (checked) | `rail-cst` | `fibre-core` |
| `rail-d` / `rail-r0` | `14,0` / `1960` | `rail-regime` | `en15567` |
| `rail-ta` / `rail-tb` | `serre-cables-etrier` / `cosse-oeil-flamand` | `rail-etaA` / `rail-etaB` | `0,80` / `0,90` |
| `rail-mp` / `rail-hRider` / `rail-DAF` | `95` / `1,9` / `1,3` | `rail-xD` | `40,0` |
| `Unité de force` | `kN` | `usage` | `TEMPORAIRE` |

The invalid span arrives as § 8's committed-invalid state, not as a repair: banner
`⛔ 1 erreur bloquante — aucun résultat` + `voir la première`, the field message « Portée — une
longueur strictement positive est requise » echoing **`Valeur : −5,0 m.`**, `Aucun résultat — portée
invalide.` in **three** suppressed regions, and both plots reading « … aucun tracé possible. » `x=40`
is **not** clamped and not rewritten, which is `clampX`'s documented no-op for `L ≤ 0`.

Second full link, textile family with a `mu` override and a non-daN display unit:

```
/?v=1&u=kgf&use=tempo&reg=secours10&L=180&h=-12&za=9&zb=7&te=250&mu=0.16&fam=tx&cls=hmpe
 &mbl=3000&k=22&ta=epissure&tb=huit&na=0.85&nb=0.7&mp=110&hr=2&daf=1.25&x=90
```

`curl` **200**, address bar unchanged, no strip. `rail-cls=hmpe`, `rail-MBL=3059`,
`rail-muTextile=0,1600`, `rail-k=22,0`, `rail-H_target=254,9`, `rail-ta=epissure-longue-hmpe`,
`rail-tb=noeud-de-huit`, `rail-etaA/B=0,85 / 0,70`, `rail-xD=90,0` — the two forces are the URL's daN
re-read in **kgf** (3000 daN → 3059 kgf, 250 daN → 254,9 kgf), which is § 7's « forces are daN in the
URL, `u` is display-only ».

Checked deliberately, because it would have been a silent repair: `daf=1.25` displays as `1,3` at § 3
display precision, and the **state keeps 1,25**. After editing `#rail-L` to `185` the debounced write
publishes `…&daf=1.25&x=90` — the rounded display never re-enters the bag.

### Item 2 — partial link completes literally

Arrival `/?L=250&h=-40&fl=8` — `curl` **200**. Address after the load-time rewrite:

```
/?v=1&u=daN&use=perm&L=250&h=-40&za=12&zb=12&fl=8&fam=ac&d=12&r0=1770&cst=iwrc&ta=cosse&tb=cosse
 &na=0.9&nb=0.9&mp=120&hr=2.1&daf=1.2&x=125
```

The three supplied values survive **literally** — `rail-L=250,0`, `rail-h=-40,0`,
`rail-D_target=8,00`; the completion did **not** substitute § 9's `fl=6`. Everything omitted is § 9's
value (`za`/`zb` 12,0 · `mp` 120 · `hr` 2,1 · `daf` 1,2 · `d` 12,0 · `r0` 1770 · `cst` âme métallique ·
`ta`/`tb` cosse · `na`/`nb` 0,90 · `u` daN · `use` perm), `reg` stays **absent** (`rail-regime=""`,
« — choisir — »), and the strip names each completed value:

```
Champs absents du lien, complétés depuis le scénario par défaut : unité de force daN · type
d'installation permanente · hauteur d'ancrage A 12,0 m · hauteur d'ancrage B 12,0 m · famille de
ligne acier · diamètre nominal 12,0 mm · grade 1770 · construction âme métallique · terminaison A
Cosse à sertir / œil Flamand (EN 13411-3) · terminaison B Cosse à sertir / œil Flamand (EN 13411-3) ·
rendement de terminaison A 0,90 · rendement de terminaison B 0,90 · masse du passager 120 kg ·
enveloppe passager 2,1 m · coefficient dynamique 1,2 · position du passager 125,0 m.
L'adresse a été corrigée pour indiquer les valeurs utilisées.
```

`x` completes to **125,0 m = L/2 of the completed span**, not the constant 75,0 —
`completeFromDefaults`'s one documented non-literal completion (« it selects a *view*, and a viewpoint
off the end of the span is worse than a moved viewpoint »), and the strip prints the number the
recipient got.

### Item 3 — unknown key ignored, named, gone from the address

Arrival `/?L=250&h=-40&fl=8&xy=zz&za=abc` — `curl` **200**, and `curl -L` reports `redirects=0`, so no
server-side 307 removed anything before the client saw it. First strip sentence, verbatim:

```
Une partie du lien a été ignorée : clé inconnue « xy » ; « za » n'était pas un nombre (hauteur
d'ancrage A ignorée).
```

Unknown key first, then the unrepresentable value naming the field it displaced — the two salvageable
kinds, told apart. Address after rewrite is the canonical bag with **no `xy`** and `za` at § 9's `12`:

```
/?v=1&u=daN&use=perm&L=250&h=-40&za=12&zb=12&fl=8&fam=ac&d=12&r0=1770&cst=iwrc&ta=cosse&tb=cosse
 &na=0.9&nb=0.9&mp=120&hr=2.1&daf=1.2&x=125
```

Dismissal: `find role button click --name "Masquer ce message"` → the strip unmounts
(`/Une partie du lien/.test(document.body.innerText) === false`), no auto-hide involved. Reloading the
**now-clean** URL (`curl` **200**) produces no strip at all, which is the reason dismissal needs no
persistence.

### Item 4 — two Tightness Drivers refuse whole, at 200

Every combination, each loaded then waited on `--text "Ce lien ne peut pas être ouvert."`:

| arrival | `curl` | rendered | address after load |
| --- | --- | --- | --- |
| `?v=1&L=150&h=-18&fl=6&te=300` | **200** | refusal surface | unchanged, no `refused` key |
| `?v=1&L=150&h=-18&fl=6&lo=151` | **200** | refusal surface | unchanged, no `refused` key |
| `?v=1&L=150&h=-18&te=300&lo=151` | **200** | refusal surface | unchanged, no `refused` key |
| `?v=1&L=150&h=-18&fl=6&te=300&lo=151` | **200** | refusal surface | unchanged, no `refused` key |

Rendered text, whole page: `Scoutech | Ce lien ne peut pas être ouvert. | Flèche, prétension et
longueur non tendue : deux valeurs de tension dans le même lien. | Ouvrir l'application sans ce lien`.
**Not a merged Scenario**: `document.querySelectorAll("input,select").length === 0` and no Rail section
renders, so no driver was silently dropped and completed from our defaults. The shell and its header
stand. The triple-driver case was re-run **three times** after an unrelated server restart — `200` and
the refusal each time.

Two neighbouring refusal classes, taken for contrast (same mechanism, same status): `?v=3&L=150` →
« Version de schéma inconnue (v = 3). », `?v=1&L=150&h=-18&fl=6&tr=%40%40%40` → « Tracé illisible. »,
both **200**, both with a `refused`-free address bar. That is amendment E / probe 6 holding in the
browser: `keepRefusalOutOfTheAddressBar` keeps the synthesised marker out of the merge, so no
`refused=%7B%22kind%22…` reaches the address bar or a copied link.

### Item 5 — « Ouvrir l'application sans ce lien »

From the `v=3` refusal, `history.length` read **before** the click and after: `35 → 35` — `replace`,
never `push`. After `find role link click --name "Ouvrir l'application sans ce lien"`:
`location.href === "http://localhost:3000/"`, refusal gone, no strip, and
`performance.getEntriesByType("navigation").length === 1` with an unchanged `performance.timeOrigin` —
**same route, same document**, a client-side navigation and not a reload. The app that lands is § 9's:
`rail-L=150,0` · `rail-h=-18,0` · `rail-D_target=6,00` · `za`/`zb` `12,0` · `mp` `120` · `hr` `2,1` ·
`daf` `1,2` · `xD` `75,0` · `rail-regime=""`. Same result from the two-driver refusal.

Recorded because it is the composition of two spec'd rules and a reader will otherwise call it a bug:
with a **Session present** (`scoutech:session:v1`, written after an `L=300` link), the same action
lands on bare `/` and restores **the Session** — `rail-L=300,0` — because bare `/` *means* « restore
the Session » (§ 8). The refusal copy's « the app is not empty, it opens on the first-run scenario » is
therefore exact only for a first-time visitor. No repair, no strip, nothing announced; not filed as a
defect.

### Item 6 — the copied link

Clipboard **read** is unavailable here (`NotAllowedError: Failed to execute 'readText' … Read
permission denied`, both via `eval` and `agent-browser clipboard read`), so the copied string was
captured by **instrumenting the write**: `navigator.clipboard.writeText = (t) => { window.__copied = t;
… }` in the page, then `find role button click --name "Copier le lien"`. Labelled: this measures what
the app hands the clipboard, not the OS clipboard.

Path taken through a refusal on purpose, so a leaked marker would show: two-driver refusal →
« Ouvrir l'application sans ce lien » → `fill #rail-L 300` → `press Tab`. The debounced write puts the
state in the address bar, and the button reports « Lien copié. » with

```
http://localhost:3000/?v=1&u=daN&use=perm&L=300&h=-18&za=12&zb=12&fl=6&fam=ac&d=12&r0=1770
&cst=iwrc&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&daf=1.2&x=75
```

`copied === location.href` → **true**; `/refused/.test(copied)` → **false**. Opening that href in a
**cleared** browser (`localStorage.clear()`, `curl` **200**) reproduces the Scenario and its outputs
exactly — `rail-L=300,0` · `h=-18,0` · `fl=6,00` · `x=75,0` · `mp=120`, `T max (traversée) 1763,0 daN`,
`Garde min (traversée) 0,75 m` — with the address bar **unchanged** (nothing dropped, nothing
completed) and no strip.

### Item 7 — repeatability, and the one pure defect

The procedure is the nine URLs above plus these commands; every case was driven twice, once before and
once after an unrelated dev-server restart, with identical results:

```
agent-browser --session scoutech-t32 set viewport 1440 900
agent-browser --session scoutech-t32 eval "localStorage.clear()"
curl -s -o /dev/null -w '%{http_code}' <url>
agent-browser --session scoutech-t32 open <url>
agent-browser --session scoutech-t32 wait --text "Paramètres"                          # app cases
agent-browser --session scoutech-t32 wait --text "Ce lien ne peut pas être ouvert."    # refusals
agent-browser --session scoutech-t32 get url
```

No fixture is needed: this ticket's journeys carry no CSV import — `tr` is exercised only as an
**undecodable** payload, `tr=%40%40%40`, which needs no file.

**Pure defect, minor, reported and not fixed** — `scenarioToSearch` emits `mu` out of canonical order
for a textile scenario. Measured at the pure seam:

```
emitted  : v,u,use,reg,L,h,za,zb,te,fam,cls,mbl,mu,k,ta,tb,na,nb,mp,hr,daf,x
canonical: v,u,use,reg,L,h,za,zb,te,fam,mu,cls,mbl,k,ta,tb,na,nb,mp,hr,daf,x
```

`CANONICAL_KEYS` puts `mu` **before** `cls`/`mbl`; the write side puts it after `mbl`, so
`src/lib/url/schema.ts`'s own claims — « The rewrite emits the full canonical bag in exactly this
order » and « Keys are inserted in `CANONICAL_KEYS` order, which *is* the emitted query string's
order » — are false for the one key that is not family-scoped. Visible in the browser as
`…&cls=hmpe&mbl=3000&mu=0.16&k=22…` after a write. **No user-visible consequence found**: `differs()`
compares content, so a canonically ordered incoming link fires no rewrite (verified — the textile link
above arrived with `mu` before `fam` and was left alone), and every copied link is ordered the same way
as every other. It is an ordering/documentation divergence in a module whose docstring makes the order
a promise, and it is expressible as one `node` test
(`Object.keys(scenarioToSearch(textileScenarioWithMuOverride))` against `CANONICAL_KEYS`). The fix
phase owns both the choice — reorder the writer, or narrow the docstring — and the regression.

Item 7 therefore stays **unticked**: the procedure half is observed, the « pure defects gain unit
regressions » half cannot be discharged from a read-only run. `Status` stays `claimed` for that one
reason; items 1–6 all pass.

### Limitations of this host, stated plainly

- **Clipboard read is denied** in this headless Chrome. Item 6's copied string is an instrumented
  `writeText`, not an OS clipboard read.
- **The shared dev server went away twice mid-run** (`curl` → `000`, page → « localhost refused to
  connect »), which is why two early loads sat on the Skeleton past a 25 s wait. That is the host, not
  the app: with `200` confirmed, the same URLs resolved in **≈0,7 s**. One `bun run dev` was started
  during the outage, landed on port **3003** (3000 was taken again by then) and was stopped
  immediately; the orchestrator's server on 3000 was never touched.
- Not observed and not claimed: coarse pointer, soft keyboard, real touch — none of this ticket's items
  needs them.

### Fix pass, 2026-08-14 — the one pure defect, fixed

Fix agent, separate context. `HeadlessChrome/151.0.0.0`
(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 … Safari/537.36`), `agent-browser 0.34.0`,
session `scoutech-fix32`, viewport `1440 × 900`, the orchestrator's dev server on
`http://localhost:3000/` (`curl -s -o /dev/null -w '%{http_code}'` → `200`).

**Reproduced before touching anything.** At the pure seam — a `bun` script over `scenarioToSearch`
with a textile Scenario (`hmpe`, `MBL` 30000 N, `k` 22, `mu` 0,16):

```
emitted  : v,u,use,L,h,za,zb,fl,fam,cls,mbl,mu,k,ta,tb,na,nb,mp,hr,daf,x
canonical: v,u,use,L,h,za,zb,fl,fam,mu,cls,mbl,k,ta,tb,na,nb,mp,hr,daf,x
equal    : false
```

In the browser, arriving on item 1's textile URL then `fill #rail-L 185` + `press Tab`, the debounced
write put `…&fam=tx&cls=hmpe&mbl=3000&mu=0.16&k=22…` in the address bar — item 1's observation,
re-measured.

**One consequence this ticket did not find, and it is user-visible.** « Copier le lien » builds its
href through `canonicalLink`, which re-inserts in `CANONICAL_KEYS` order; the address bar receives
`scenarioToSearch`'s bag **as-is**, in *its* insertion order. So for a **textile** line the two
strings disagreed — `navigator.clipboard.writeText` instrumented exactly as in item 6:

```
copied : …&te=250&fam=tx&mu=0.16&cls=hmpe&mbl=3000&k=22&…
href   : …&te=250&fam=tx&cls=hmpe&mbl=3000&mu=0.16&k=22&…
same   : false
```

Item 6's `copied === location.href` → `true` held only because that journey is **steel**, where `mu`
is an absent override. § 7's « two links to the same Scenario are then string-identical, which is what
makes « Copier le lien » diffable » was false for every textile line.

**Fix, minimal, at the named seam** — `src/lib/url/schema.ts`, `scenarioToSearch`'s textile branch:
`out.mu` is inserted **before** `out.cls` / `out.mbl`, i.e. at its one slot in `CANONICAL_KEYS`. The
writer was the only consumer out of step: `salvageSearch`, `completeFromDefaults`, `canonicalLink` and
the order-lock test all already put `mu` between `ea` and `cls`. The alternative — moving `mu` in
`CANONICAL_KEYS` to after `mbl`, which § 7's key table also admits since it lists `mu` in **both** the
steel-override row and the textile group — was rejected as the larger change: it rewrites a
documented, test-locked list and four consumers' emitted order to accommodate one writer. No rename,
no widened signature, no narrowed docstring.

**Regression, `node` unit, colocated** — `src/lib/url/schema.test.ts`, « the emitted bag is in
canonical order, in both families »: `Object.keys(scenarioToSearch(s))` against
`CANONICAL_KEYS.filter(…)` **and** `` `/${defaultStringifySearch(search)}` === canonicalLink(search) ``,
over a textile Scenario with `mu`, a steel Scenario with all three overrides, and
`FIRST_RUN_SCENARIO`. The second assertion is the copy-button divergence stated at the seam, so it
cannot come back without the suite going red.

**Re-verified in the browser after the fix**, `localStorage.clear()` before each load:

| check | before | after |
| --- | --- | --- |
| address bar after `fill #rail-L 185` | `…&fam=tx&cls=hmpe&mbl=3000&mu=0.16&k=22…` | `…&fam=tx&mu=0.16&cls=hmpe&mbl=3000&k=22…` |
| `copied === location.href` | `false` | **`true`** |
| `/refused/.test(copied)` | `false` | `false` |

Unchanged, checked because the fix sits on the write side of the rewrite: the canonically ordered
incoming textile URL still fires **no** rewrite (`location.search` byte-identical to the arrival URL,
`rail-L` `180,0`, `rail-muTextile` `0,1600`, `rail-MBL` `3059` in kgf), and a partial textile link
`?L=250&h=-40&fl=8&fam=tx&cls=hmpe&mbl=3000&mu=0.16&k=22&xy=zz` still rewrites to
`?v=1&u=daN&use=perm&L=250&h=-40&za=12&zb=12&fl=8&fam=tx&mu=0.16&cls=hmpe&mbl=3000&k=22&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&daf=1.2&x=125`
with the ignored-key strip present and `xy` gone. `FIRST_RUN_LINK` stays **137** characters (steel,
`mu` absent), so § 7 / § 9's length lock is untouched.

Gates, from the repo root:

```
bunx oxfmt --write src/lib/url/schema.ts src/lib/url/schema.test.ts  → 2 files, exit 0
bun run typecheck                                                    → tsc --noEmit, exit 0
bun run lint-type-aware                                              → oxlint --type-aware, exit 0
bun run test                                                         → vitest run: 39 files, 1273 tests, exit 0
```

Nothing skipped: this ticket reported exactly one defect, it reproduced, and it is fixed with a
regression. Session `scoutech-fix32` closed; no other ticket file was touched. `Status` → `done`.

### Re-verification, 2026-08-14 — independent pass over the fix and the whole acceptance list

Re-verifier, separate context, **read-only on `src/`**. `HeadlessChrome/151.0.0.0`
(`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 … Safari/537.36`), `agent-browser 0.34.0`,
session `scoutech-t32-re`. Viewport **set** `1440 900` and **read back**
`{innerWidth: 1440, innerHeight: 900}`; host limits re-measured, not assumed —
`navigator.maxTouchPoints === 0`, `matchMedia('(pointer: coarse)').matches === false` (no item here
needs either). Orchestrator's dev server, `curl -s -o /dev/null -w '%{http_code}'
http://localhost:3000/` → `200`. `localStorage.clear()` before every load. Every URL below is
`location.href`/`location.search` **read back after** the load, never the URL typed.

Gates **re-run here**, not taken on report:

```
bun run typecheck        → tsc --noEmit, exit 0
bun run lint-type-aware  → oxlint --type-aware --type-check, exit 0, no diagnostics
bun run test             → vitest run: 39 files, 1288 tests passed, exit 0
```

`1288`, not the fix pass's `1273`: the same working tree carries the other browser tickets' fixes,
which added cases of their own. Nothing red. No `oxfmt` run — this pass touched only this file.

**The one defect is gone, at both seams it lived on.**

| check | fix pass's « after » | measured here |
| --- | --- | --- |
| `Object.keys(scenarioToSearch(textile+mu))` vs `CANONICAL_KEYS` | equal | `v,u,use,L,h,za,zb,fl,fam,mu,cls,mbl,k,ta,tb,na,nb,mp,hr,daf,x` — **equal** |
| same, steel + `mbf`/`ea`/`mu`, and `FIRST_RUN_SCENARIO` | equal | **equal** (`…cst,mbf,ea,mu,ta…`) |
| `/${defaultStringifySearch(bag)}` === `canonicalLink(bag)` | true | **true**, all three |
| address bar after `fill #rail-L 185` on the textile URL | `…&fam=tx&mu=0.16&cls=hmpe&mbl=3000&k=22…` | **identical** |
| `copied === location.href`, **textile** line | true | **true** (instrumented `writeText`) |

The regression **discriminates** — checked without touching `src/`, by rebuilding the pre-fix
insertion order by hand from the fixed bag (same content, `mu` re-inserted after `mbl`) and running
the test's two assertions over it: order equality `false`, `stringify === canonicalLink` `false`. And
it really runs: `bunx vitest run src/lib/url/schema.test.ts -t "canonical order" --reporter=verbose`
→ `✓ … > the emitted bag is in canonical order, in both families`.

**Nothing adjacent broke.** Steel with all three overrides (`?…&mbf=9074&ea=6900000&mu=0.5465&…`)
arrives **unrewritten**, and after `fill #rail-L 205` the address keeps `…cst=iwrc&mbf=9074&ea=6900000&mu=0.5465&ta=cosse…`
with `copied === location.href` **true**. The canonically ordered textile URL still fires **no**
rewrite. The partial textile link `?L=250&h=-40&fl=8&fam=tx&cls=hmpe&mbl=3000&mu=0.16&k=22&xy=zz`
rewrites to the fix pass's exact string, `xy` gone, strip reading « Une partie du lien a été ignorée :
clé inconnue « xy ». ».

**Acceptance list, re-walked end to end. All seven pass.**

1. **Full link, negative span, no repair** — the recorded steel URL, `curl` **200**, address
   **byte-identical** after hydration, no strip. Every value as recorded (`rail-L` `-5,0` ·
   `h` `-24,0` · `zA/zB` `10,0`/`8,0` · `L0` `160,00` · `d` `14,0` · `r0` `1960` ·
   `cst` `fibre-core` · `reg` `en15567` · `ta/tb` `serre-cables-etrier`/`cosse-oeil-flamand` ·
   `na/nb` `0,80`/`0,90` · `mp` `95` · `hr` `1,9` · `daf` `1,3` · `xD` `40,0`; checked radios
   `TEMPORAIRE`, `steel`). Committed-invalid, not repaired: `1 erreur bloquante` + `voir la première`,
   « ⛔ Portée — une longueur strictement positive est requise. Valeur : −5,0 m. », **three**
   `Aucun résultat — portée invalide.` regions, **two** « aucun tracé possible », `x=40` unclamped.
   Textile URL: `curl` **200**, unchanged address, `cls=hmpe` · `MBL` `3059` (kgf) · `mu` `0,1600` ·
   `k` `22,0` · `H_target` `254,9` · `daf` displays `1,3` while state keeps **1,25** (the debounced
   write publishes `daf=1.25`).
2. **Partial completes literally** — `?L=250&h=-40&fl=8`, `curl` **200**, rewrite string identical to
   the record; `L` `250,0` · `h` `-40,0` · `D_target` `8,00` survive literally (no `fl=6`
   substitution), `reg` stays `""`, `x` completes to `125,0` = L/2, and the « Champs absents… » strip
   names all sixteen completions verbatim as recorded.
3. **Unknown key** — `?L=250&h=-40&fl=8&xy=zz&za=abc`, `curl -L` → **200**, `num_redirects=0`. Strip:
   « Une partie du lien a été ignorée : clé inconnue « xy » ; « za » n'était pas un nombre (hauteur
   d'ancrage A ignorée). » `rail-zA` `12,0`; rewritten address carries **no `xy`**. Click
   « Masquer ce message » → strip unmounts (`/Une partie du lien/` `false`).
4. **Two Tightness Drivers refuse whole, at 200** — all four combinations re-driven: `curl` **200**
   each, `document.querySelectorAll('input,select').length === 0`, no `refused` in the address, text
   « Ce lien ne peut pas être ouvert. | Flèche, prétension et longueur non tendue : deux valeurs de
   tension dans le même lien. | Ouvrir l'application sans ce lien ». **12 further loads** of the
   two-driver triple after an app page: 12/12 refusals. Contrast classes hold too — `?v=3&L=150` →
   « Version de schéma inconnue (v = 3). », `?v=1&L=150&h=-18&fl=6&tr=%40%40%40` → « Tracé
   illisible. », both **200**, both `refused`-free.
5. **« Ouvrir l'application sans ce lien »** — from the `v=3` refusal, `history.length` **50 → 50**
   (`replace`), `performance.getEntriesByType('navigation').length` **1** and `timeOrigin` unchanged
   (same document, client-side), `location.href === "http://localhost:3000/"`, refusal gone, no strip,
   and § 9's scenario lands (`L` `150,0` · `h` `-18,0` · `D_target` `6,00` · `zA/zB` `12,0` ·
   `mp` `120` · `hr` `2,1` · `daf` `1,2` · `xD` `75,0` · `reg` `""`). Same from the two-driver refusal.
6. **The copied link** — same instrumented-`writeText` method, same journey **through a refusal**:
   two-driver refusal → escape link → `fill #rail-L 300` → `Tab`. « Lien copié. » shown,
   `copied === location.href` **true**, `/refused/.test(copied)` **false**. Reopening that href in a
   cleared browser (`curl` **200**) reproduces it exactly — address **unchanged**, no strip,
   `L` `300,0` · `h` `-18,0` · `fl` `6,00` · `x` `75,0` · `mp` `120`, `T max (traversée)`
   **1763,0 daN**, `Garde min (traversée)` **0,75 m**.
7. **Repeatable, and the pure defect now has its regression** — the whole procedure above was driven
   from scratch in this session; the pure defect is fixed, its regression exists, runs, and
   discriminates (above). Ticked.

**One observation, and it is spec'd behaviour, not a defect.** A *complete and valid* textile link
whose **key order** is not canonical (`…&fam=tx&cls=hmpe&mbl=3000&mu=0.16&k=22…`) is left exactly as
typed, so for that visit « Copier le lien » (canonical) and the address bar (as typed) differ as
strings — measured, `same: false`. That is § 7's « **Order alone never triggers a navigation.** A
hand-authored `?h=-40&L=250` with nothing dropped is left exactly as typed », because « firing a
`replace` for cosmetics would rewrite a URL the user is mid-way through editing ». § 7's
« string-identical » promise covers the strings the **app emits** (a rewrite, a copy) — which is
exactly what the fix restored. Nothing here needs a decision; recorded so a later reader does not file
it twice.

**Host limitations, measured and labelled.**

- **Clipboard read stays denied** in this headless Chrome; every copied string above is an
  instrumented `navigator.clipboard.writeText`, i.e. what the app hands the clipboard, not an OS
  clipboard read.
- **The dev server intermittently leaves a load on the Skeleton.** Measured on the
  refusal → `localStorage.clear()` → refusal sequence: **5 of 12** iterations still showed the
  Skeleton (section labels, `document.getElementById('rail-L') === null`, no console error beyond
  `[vite] connected`) after an 8 s wait; one such load was still on the Skeleton at **+28 s** and had
  resolved to the correct refusal when re-read later. Isolated loads of the same URL hydrate in
  **549–658 ms** (3/3), and 14/14 plus 12/12 loads in the quieter probes refused correctly. Vite dev
  transform contention with the other browser agents on the shared server, not app behaviour: the
  refusal is always correct **once hydrated**, and the Skeleton is § 8's spec'd pre-hydration state.
  A production build would settle it; nothing was changed to chase it.
- **Procedure note for whoever re-runs this:** `wait --text "Paramètres"` now **times out** on a
  hydrated page — the Rail's section labels render uppercase (`PARAMÈTRES`) and `innerText` reflects
  the `text-transform`, so the mixed-case string only matches the Skeleton. Wait on
  **« Copier le lien »** for app cases and « Ce lien ne peut pas être ouvert. » for refusals.
- Not observed, not claimed: coarse pointer, real touch, soft keyboard. None of this ticket's items
  needs them.

Session `scoutech-t32-re` closed; no other session touched, the orchestrator's server left running.
Nothing under `src/` was modified by this pass. **`Status` stays `done`** — all seven acceptance items
observed passing here, and the single reported defect is confirmed fixed with a discriminating
regression.
