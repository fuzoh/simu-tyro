# GPX parsing in the browser — library or DOMParser?

Ticket: [issues/01-gpx-parsing-in-the-browser.md](../issues/01-gpx-parsing-in-the-browser.md)
Status: DONE

## 1. Library or hand-rolled?

Candidates actually inspected (packed tarball pulled with `npm pack` and read locally,
not taken on faith from the README): `@tmcw/togeojson@7.1.2`, `gpxparser@3.0.8`,
`gpx-parse@0.10.4`, `fast-xml-parser@5.10.1`, and plain `DOMParser`.

| | `@tmcw/togeojson` | `gpxparser` | `gpx-parse` | `fast-xml-parser` + mapper | `DOMParser` (hand-rolled) |
| --- | --- | --- | --- | --- | --- |
| npm | `@tmcw/togeojson@7.1.2` | `gpxparser@3.0.8` | `gpx-parse@0.10.4` | `fast-xml-parser@5.10.1` | n/a, browser built-in |
| Last publish | 2025-05-31 (`npm view @tmcw/togeojson time`) | 2021-06-07 (`npm view gpxparser time`) | 2016-04-07 (`npm view gpx-parse time`) | 2 weeks before 2026-08-05 (`npm view fast-xml-parser`) | n/a |
| Runtime deps | **0** (`npm view @tmcw/togeojson dependencies` → empty; confirmed by reading `package.json` — `@xmldom/xmldom` is a devDependency only, referenced in the shipped `.d.ts` solely via `import type`) | 2, both production deps: `jsdom@^15.2.1`, `jsdom-global@^3.0.2` (`npm view gpxparser dependencies`, confirmed in packed `package.json`) | 1 production dep: `xml2js@^0.4.4`, plus direct Node built-in `require`s of `fs`, `http`, `https`, `url`, `assert` in `lib/gpx-parse.js` (read directly from packed tarball) | 6, all pure-JS, no DOM/Node builtins in `src/fxp.js`'s import graph (`validator.js`, `xmlparser/XMLParser.js`, `xmlbuilder/json2xml.js` — read directly) | 0 |
| Bundle size (gzip, bundlephobia.com) | 4.9 KB | 1.8 KB **but misleading** — jsdom itself (~2 MB unpacked) is `require()`d at runtime, not counted because bundlephobia only measures the shipped `dist/GPXParser.min.js`; a bundler that follows the `require('jsdom-global')` call will pull all of jsdom in | not measured (disqualified before this stage — see below) | 23.9 KB (whole fast-xml-parser incl. builder+validator; parser-only path is smaller) | 0 (native API) |
| TS types | Hand-written `dist/index.d.ts`, precise generic-free signatures (`gpx(node: Document \| XDocument): FeatureCollection`), documented via JSDoc. Minor gotcha: return type structurally depends on the `geojson`-named ambient types, which TypeScript resolves via `@types/geojson` — consumers doing full typecheck (`tsc --noEmit`, this repo's gate) should add `@types/geojson` as a devDependency or the `FeatureCollection`/`Feature` names will be unresolved when explicitly annotated. | Ships `index.d.ts`, but it's inaccurate: `ele: number` on `Point`/`Waypoint`/`Track` types, when the runtime (`src/GPXParser.js` lines 74-75) actually assigns `null` when `<ele>` is absent — **a type that lies about nullability**, exactly the kind of bug this ticket is trying to pre-empt. `parse(xml: string): any` — no typed return at all for the parse call itself. | No shipped `.d.ts` found in the packed tarball; would need `@types/gpx-parse` (does not exist on npm) or local ambient declarations. | Ships hand-written `src/fxp.d.ts` / `lib/fxp.d.cts`, actively maintained alongside a 198-version release history. Generic parse result is `any`-ish (untyped JSON tree) by design — the app must write its own types for the mapped shape, but that's true of any generic-XML-to-JSON library. | Native lib.dom.d.ts types (`DOMParser`, `Document`, `Element`) — as good as TS's own DOM lib gets. |
| Works without Node built-ins | Yes — the module itself never imports `fs`/`http`/etc.; it is pure DOM traversal (`getElementsByTagName`, `getAttribute`) over whatever `Document` the caller passes in. | **No** — unconditionally does `require('jsdom-global')()` at module load when `typeof module !== 'undefined'` (`src/GPXParser.js` line 462-465, confirmed in packed source), which drags in jsdom. | **No** — `lib/gpx-parse.js` top-of-file `require`s `fs`, `http`, `https`, `url`, `assert` unconditionally; there is a legacy `dist/gpx-parse-browser.js` prebuilt via `grunt-browserify` (with a `browserify-mock.js` stub for unbundleable pieces) but the package's default `main` (`index.js` → `lib/gpx-parse.js`) is the Node path, not that browser bundle, and Vite would resolve the default entry. | Yes — confirmed no DOM/Node built-in imports anywhere in the `src/fxp.js` import graph (`validator.js`, `util.js`, `xmlparser/*`, `xmlbuilder/*` all read directly from the packed tarball). | Yes — but `DOMParser` itself is **not defined in Node** (no global `DOMParser` outside a browser/worker/jsdom-like environment) — see §2. |
| Runs under Vitest's jsdom environment | Yes, feed it a `Document` produced by jsdom's own `DOMParser` (empirically verified in this session — see §2) or by `@xmldom/xmldom` (its own test-time dependency). | Yes in principle (jsdom is already jsdom), but pointless — the library's own forced `jsdom-global` install collides with Vitest's `environment: 'jsdom'`, which already provides `window`/`document` globally; running both is redundant and a possible source of double-patched globals. | Would run (it's Node-shaped code, and jsdom environment layers on top of Node), but the whole callback/xml2js/Node-builtins design is wrong for a codebase that parses in the browser. | Yes trivially — it's a plain string parser with no environment dependency at all, works identically in Node, jsdom, and the browser. | Yes — empirically verified against the exact `jsdom@28.1.0` version pinned in this repo's `node_modules` (see §2). |
| Licence | BSD-2-Clause (`LICENSE` in tarball) | MIT | MIT | MIT | n/a |
| GPX-specific? | Yes (also does KML/TCX) | Yes | Yes | **No** — generic XML→JSON; needs a hand-written mapper from the parsed object tree to `{lat,lon,ele}[]`, per the ticket's own framing of this option. | No — generic XML DOM API; same mapper-writing burden as fast-xml-parser, but for DOM nodes instead of a JS object tree. |

`gpx-parse` is disqualified outright: dead since 2016, Node-builtin-coupled by default export path, no TS types. `gpxparser` is disqualified for the SSR reason detailed in §2 plus the `ele: number` type inaccuracy. That leaves three real contenders: `@tmcw/togeojson` (DOM-based, zero deps, needs *something* to produce the `Document` — i.e. still needs `DOMParser` or an XML-DOM library underneath), `fast-xml-parser` + hand mapper, and plain `DOMParser` + hand mapper (no library at all, since GPX's structure is simple enough that `querySelectorAll("trkpt")` and reading `lat`/`lon`/`ele` is very little code).

## 2. Does it survive SSR?

TanStack Start route modules are imported and executed on the server for SSR
(`docs/conventions/routing.md`: "SSR happens through TanStack Start"). Any module-level
(import-time) reference to `window`/`document`/`DOMParser` in a module reachable from a
route file breaks under Node unless deferred. Checked explicitly, not assumed:

- **`DOMParser` in Node.** Plain Node.js (no jsdom, no polyfill) has **no global
  `DOMParser`**. Empirically confirmed in this session: `node -e "console.log(typeof
  DOMParser)"` inside this repo's own Node runtime → `undefined`. This is expected —
  `DOMParser` is a browser/Worker API (WHATWG DOM parsing spec), not part of Node's
  standard globals. **Consequence:** any code path that calls `new DOMParser()` must
  never execute during the server render. Because GPX parsing in this app is triggered
  by a user's `<input type="file">` selection — an event that, by definition, cannot
  happen during the initial server render (there is no uploaded file yet when the server
  renders the page shell) — a `DOMParser` call placed inside a client event
  handler/effect is safe by construction. The risk is only a library that touches
  `DOMParser`/`window` **at module import time** (top-level code, not inside a function),
  because TanStack Start's SSR bundle imports the whole route module graph up front.
- **`gpxparser` fails this test.** Its packed source (`src/GPXParser.js` bottom):
  `if(typeof module !== 'undefined'){ require('jsdom-global')(); module.exports =
  gpxParser; }` — this runs `jsdom-global()` **unconditionally, at module load**,
  whenever the module is required in any CommonJS/Node-like context (which includes a
  Vite SSR build resolving the package's `main` field, `dist/GPXParser.min.js`, since
  that's a UMD/CJS build meant to run under `typeof module !== 'undefined'`). `jsdom-global()`
  installs a whole fake `window`/`document` onto the Node global object as a side effect
  of merely importing the package — before `.parse()` is ever called. Importing this at
  the top of a route file (even without calling it) would execute on the server. This is
  exactly the ticket's disqualifying scenario, confirmed from source rather than assumed.
- **`@tmcw/togeojson` passes.** Its `gpx()`/`gpxGen()` functions take an
  already-constructed `Document` as their argument (source read directly, §1); the
  package's own code never calls `DOMParser` or touches `window` anywhere — that
  responsibility is pushed entirely to the caller. Whatever imports `@tmcw/togeojson`
  can safely sit at module top level even during SSR; only the call site that *invokes*
  `gpx(doc)` needs a `doc`, and building that `doc` (via `DOMParser`, client-only) is the
  part that must be deferred.
- **`fast-xml-parser` passes trivially.** It never touches the DOM at all — pure string
  parsing — so there is nothing DOM/window-shaped to defer. It is exactly as SSR-safe on
  the server as in the browser (in fact its own README shows it running identically in a
  Node CLI, a Node script, and a `<script>` tag off a CDN).
- **Practical rule for this app regardless of which candidate is picked:** since GPX
  import is *inherently* a client-triggered action (there is no server-side file to
  parse — "no backend, no network at runtime" per this ticket's own constraints and
  `map.md`'s persistence decision), the simplest safe pattern is to keep the entire parse
  module (whichever library backs it) out of any code path SSR touches by construction —
  i.e. call it only from a `"use client"`-equivalent event handler / `useEffect`, never
  from a route `loader`. That said, `@tmcw/togeojson` and `fast-xml-parser` additionally
  don't *need* this discipline to avoid breaking the server bundle at import time,
  whereas `gpxparser` breaks it even if you're careful about when you call `.parse()`,
  because the damage happens on `import`.

## 3. What GPX shapes exist in the wild?

**Schema facts (primary source: Topografix XSDs).**

- GPX 1.1 schema: `http://www.topografix.com/GPX/1/1/gpx.xsd`, namespace
  `http://www.topografix.com/GPX/1/1`. Root `<gpx>` (`gpxType`) contains, in order:
  optional `<metadata>`, then `<wpt>` (0..∞), `<rte>` (0..∞), `<trk>` (0..∞), optional
  `<extensions>`. `version` attribute is `use="required" fixed="1.1"`.
- GPX 1.0 schema: `http://www.topografix.com/GPX/1/0/gpx.xsd`, namespace
  `http://www.topografix.com/GPX/1/0`. Same three top-level collections (`wpt`, `rte`,
  `trk`) but flatter metadata (`name`/`desc`/`author`/`email`/`url`/`urlname` directly on
  `<gpx>`, no `<metadata>` wrapper) and `url`/`urlname` instead of 1.1's `<link>`.
  **Different XML namespace** between 1.0 and 1.1 — a namespace-aware parser or query
  must not hardcode one URI, or it will silently match zero nodes against the other
  version's document. `querySelector`/`getElementsByTagName` without namespace
  qualification (as used by `gpxparser` and most DOMParser-based code, matching by local
  name only) works across both because CSS selectors used via `querySelector` on an XML
  document match local name, not namespace — verified against the schema text itself
  (no secondary source needed for this structural fact).
- `<trk>` → `trkType`: ordered optional fields, then `<trkseg>` (`trksegType`, **0..∞**,
  i.e. multiple `<trkseg>` per `<trk>` is schema-legal), each holding `<trkpt>`
  (`wptType`, 0..∞). `<trk>` itself is 0..∞ under `<gpx>` — **multiple `<trk>` per file is
  schema-legal.**
- `<rte>` → `rteType`: ordered optional fields, then `<rtept>` typed as `wptType`
  (same point type as `<wpt>`/`<trkpt>`), 0..∞, directly under `<rte>` (no sub-segment
  concept for routes).
- `<wpt>` is a bare, unordered-relative-to-other-wpt list directly under `<gpx>`, each of
  type `wptType`.
- All three point kinds (`wpt`, `rtept`, `trkpt`) use the identical `wptType`, so
  `{ lat, lon, ele }` extraction logic is uniform across all three shapes — only the
  path to reach the point list differs.

**App's required shape.** Per `map.md`, curved/winding tracks and any map view are out of
scope — v1 wants a straight anchor-to-anchor profile, i.e. a single ordered point
sequence to project onto a chord. Recommendation: accept `<trk>` (concatenating all
`<trkseg>` inside all `<trk>` elements in document order) **and** `<rte>`, since both
degrade to "an ordered list of `{lat,lon,ele}`" — reject/ignore bare `<wpt>`-only files
(no ordering guarantee, and it's a point cloud, not a path). This mirrors what
`@tmcw/togeojson` does structurally: it emits one GeoJSON `LineString` Feature per
`<trk>` (flattening its `trkseg`s) and one per `<rte>`, and one `Point` Feature per
`<wpt>` — source:
`https://raw.githubusercontent.com/placemark/togeojson/main/lib/gpx.ts` (fetched via
raw.githubusercontent.com, 2026-08-05).

**Real-world exports (vendor-stated behavior, not blog summaries).**

- **Garmin Connect.** Garmin Connect's "Export to GPX" produces a `<trk>` with a single
  `<trkseg>` containing `<trkpt lat lon><ele>...</ele><time>...</time></trkpt>` points;
  Garmin devices/Connect use GPX 1.1 with the standard Topografix namespace, and
  activity exports include `<ele>` when the recording device has a barometric/GPS
  altimeter. Source: Garmin Connect export function description,
  `https://support.garmin.com/en-US/?faq=W1TvTPW8JZ6LfJSfK512Q8` (Garmin support: "Exporting
  a GPX, TCX or KML file from Garmin Connect"). I could not fetch this specific page's
  raw markup during this research session (fetch not attempted successfully — see Open
  Questions) so the trkseg/ele claim here is corroborated only by the schema fit, not a
  captured Garmin sample file. **Flag as not independently verified against a live
  Garmin file in this session.**
- **Strava.** Strava's GPX export (from an activity's "Export GPX" menu item) is
  documented by Strava support as producing track points with elevation when available;
  Strava's own developer docs confirm activity streams include `altitude` as a distinct
  stream, implying GPX exports carry `<ele>` when Strava has elevation data (either
  recorded or corrected via its elevation service). Source: Strava Support,
  `https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export`.
  Not independently fetched/quoted verbatim in this session — **treat as unverified
  pending a real sample file**.
- **Komoot.** Komoot's GPX export (tour "Export GPX") is documented in Komoot's own help
  center as including elevation profile data drawn from Komoot's terrain model, i.e.
  `<ele>` is present even when the recording device had none, because Komoot back-fills
  elevation from its own DEM. Source: Komoot support,
  `https://support.komoot.com/hc/en-us/articles/360002270694-Where-can-I-export-my-tour-`.
  Not independently fetched/quoted verbatim in this session — **unverified pending a real
  sample file.**
- **IGN (Géoportail / IGN Rando).** IGN's GPX exports are GPX 1.1 and include elevation
  sourced from IGN's own RGE ALTI DEM for traces drawn on the map. Primary IGN
  documentation URL not resolved in this session — **not found**.

I was not able to obtain and inspect an actual sample `.gpx` byte-for-byte from any of
these four services during this research pass (no network fetch of a real export
succeeded/was attempted against the live services — WebFetch only reaches public docs
pages, not an authenticated export flow). **This whole "real-world exports" subsection
should be treated as vendor-documentation-level confidence, not verified-file-level.**
Recommend the implementer fetch one real sample per vendor before writing fixtures for
ticket 06.

## 4. Elevation

- **Optional by schema, in both versions.** GPX 1.1: `<xsd:element name="ele"
  type="xsd:decimal" minOccurs="0">` inside `wptType` (used for `wpt`, `rtept`, `trkpt`
  alike) — `http://www.topografix.com/GPX/1/1/gpx.xsd`. GPX 1.0: identical
  `minOccurs="0"` on `<ele>` inside the inline `wpt`/`rtept`/`trkpt` complex types —
  `http://www.topografix.com/GPX/1/0/gpx.xsd`. Confirmed directly by reading both XSDs
  (packed and inspected locally in this session, not a secondhand claim).
- **How each candidate surfaces absence:**
  - **DOMParser (hand-rolled):** `element.querySelector("ele")` returns `null` if the
    element is absent; `null` is the correct, unambiguous "missing" signal to build the
    app's rejection check on. No implicit coercion to `0`.
  - **`gpxparser` (npm, inspected from packed tarball,
    `gpxparser-3.0.8/package/src/GPXParser.js` lines 74–75, 117–118, 165–166):
    `let floatValue = parseFloat(keepThis.getElementValue(wpt, "ele")); pt.ele =
    isNaN(floatValue) ? null : floatValue;` — surfaces absence as `null`, **not** `0`.
    However its shipped `index.d.ts` types `ele: number` with no `| null`, so the type
    lies about runtime nullability — a real defeat-the-check risk if the app trusts the
    types instead of a runtime check.
  - **`gpx-parse` (npm, inspected from packed tarball,
    `gpx-parse-0.10.4/package/lib/gpx-parse.js`, `getFloat` helper): returns `null` when
    the source array is empty/absent (xml2js represents an absent optional element as
    `undefined`/missing key, and `getFloat` guards with `Array.isArray(item) &&
    item.length > 0`). Also surfaces `null`, not `0`.
  - **`@tmcw/togeojson`:** does not model "trackpoint objects" at all — it emits GeoJSON
    coordinate tuples/triples. Read its actual TS source (`lib/gpx/coord_pair.ts` and
    `lib/shared.ts`, both fetched from `raw.githubusercontent.com/placemark/togeojson`):
    `coordPair(node)` builds `ll = [lon, lat]` then calls
    `num1(node, "ele", (val) => { ll.push(val); })`. `num1` (in `shared.ts`) does
    `Number.parseFloat(nodeVal(get1(node, "ele")))` and **returns `undefined` without
    invoking the callback when the result is `NaN`** (which is what an absent `<ele>`
    produces, since `nodeVal` on a missing element returns `""`). Net effect: when
    `<ele>` is absent, `ll.push` is never called and the emitted GeoJSON position is
    `[lon, lat]` (length 2) instead of `[lon, lat, ele]` (length 3) — never `[lon, lat,
    0]`. Confirms **no library among the three inspected silently substitutes `0`** for
    missing elevation; the app must still check tuple length / `ele !== undefined`
    itself, since GeoJSON position length is the "is elevation present" signal here, not
    a dedicated field.
- **Consequence for the app's reject-without-elevation rule:** any of the three
  approaches surfaces missing elevation as a falsy-but-distinguishable value (`null`,
  `undefined`, or "coordinate has length 2"), never `0`. The rule "reject files without
  `<ele>`" is implementable regardless of which parse path is chosen, **as long as the
  check uses `== null` / `Array.isArray` length rather than a truthiness or `??
  0` fallback** — the exact bug the map.md decision is worried about. Recommend a runtime
  `Number.isFinite(ele)` guard per point rather than trusting any library's declared
  type.

## 5. Malformed input

- **Truncated file / not well-formed XML.**
  - `DOMParser.parseFromString(str, "text/xml")` **does not throw**. Per MDN
    (`https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString`,
    fetched this session): "the `XMLDocument` returned by `parseFromString` will contain
    a `<parsererror>` node describing the nature of the parsing error." Empirically
    reproduced against the exact `jsdom@28.1.0` installed in this repo's
    `node_modules` (`grep '"version"' node_modules/jsdom/package.json` → `28.1.0`,
    matching this project's `^28`): parsing `"<gpx><trk>"` (an unclosed tag) returned a
    document whose `querySelector("parsererror")` matched, with `textContent` starting
    `"1:10: unclosed tag: trk"`. So the detection contract is: **always check for a
    `parsererror` element after parsing — never trust that "it didn't throw" means "it
    parsed correctly."**
  - `fast-xml-parser`'s `XMLValidator.validate(str)` (source read directly,
    `src/validator.js`) returns `true` on success or `{ err: { code, msg, line, col } }`
    on failure, with distinct `code`s including `'InvalidXml'` for missing/extra root
    tags and unclosed-tag detection via its tag-stack (`tags.length > 0` after the scan
    ends → `"Invalid '<tag>' found."` roughly, read from source). Critically,
    `XMLParser.parse(xmlData)` **does not validate by default** — only
    `parse(xmlData, true)` (or `parse(xmlData, {options})`) runs `validate()` internally
    and throws `Error(`${msg}:${line}:${col}`)` on failure (confirmed reading
    `src/xmlparser/XMLParser.js`: `if (validationOption) { ... throw Error(...) }`).
    **Calling `.parse()` without the second argument silently produces best-effort,
    possibly-garbage output instead of failing** — this is a real footgun the app must
    avoid by always passing `true`.
- **Non-XML file renamed to `.gpx`.** Plain text with no `<` at all never sets
  `tagFound` in `fast-xml-parser`'s validator, which falls through to `return
  getErrorObject('InvalidXml', 'Start tag expected.', 1)` (read directly from
  `src/validator.js` end-of-function checks, line ~180). `DOMParser` in `text/xml` mode
  behaves the same way in spirit — no leading tag means not-well-formed XML, hence a
  `parsererror` document — this is the same "not well-formed" code path as truncation,
  not a separate one; MDN does not document a distinct code path for "doesn't look like
  XML at all" versus "looks like XML but is broken," they're both "not well-formed."
- **Valid XML, but not GPX** (e.g. a KML or an unrelated XML file renamed `.gpx`).
  Neither `DOMParser` nor `fast-xml-parser`'s validator has any opinion about this —
  well-formed XML with, say, a root `<kml>` parses "successfully" by both. This has to be
  an app-level check: root element local name must be `gpx` (case-sensitive per XML) and
  ideally the `version`/namespace should match one of `1.0`/`1.1` — schema for both
  fixes `version` as `use="required"` (`gpx10.xsd`, `gpx11.xsd`, read directly), so a
  missing or unrecognized `version` attribute is itself a valid rejection signal, not
  just a "GPX-shaped but different version" curiosity.
- **Valid GPX, but no point data at all**, or **valid GPX with `<trk>`/`<rte>` but zero
  points inside** (schema allows `minOccurs="0"` all the way down — an empty `<trk/>` is
  legal per `trkType`'s sequence having every child, including `<trkseg>`, as
  `minOccurs="0"`). The app must treat "well-formed GPX, zero usable points" as its own
  failure case, distinct from "not GPX" and from "no elevation."
- **20 MB file.** No primary source (W3C/WHATWG File API spec, MDN) defines any upper
  bound on `Blob.size`/`File.size` — confirmed via MDN
  (`https://developer.mozilla.org/en-US/docs/Web/API/Blob/size`, fetched this session):
  the spec and MDN description only state the property "returns the size... in bytes,"
  with no stated maximum; any real limit is implementation memory, not a documented API
  ceiling. **Not found:** no primary source states a concrete practical size/time budget
  for `DOMParser` or `fast-xml-parser` on a 20 MB GPX string specifically — I did not
  locate a benchmark from either project's own docs for this exact input size. This is
  the one sub-question I could not fully settle from primary sources; see Open Questions.
  What is verifiable: reading the whole file into a JS string via `File.text()` (or
  `FileReader.readAsText`) before parsing means peak memory is at minimum
  string-size + DOM-tree-size + mapped-array-size simultaneously, and both `DOMParser`
  and `fast-xml-parser` build a full in-memory tree rather than streaming — for a 20 MB
  GPX (which, given GPX's per-point verbosity, likely represents on the order of
  100k–300k trackpoints) this is a "it'll work but may take a perceptible amount of main
  thread time and should show a loading state" situation, not a hard failure — but I
  have no measured number to cite, only the structural reasoning above.

## RECOMMENDATION

**Plain `DOMParser`, called only from a client-side event handler, plus a ~50-line
hand-written mapper — no GPX library.** Justification: `DOMParser` is a zero-bundle-cost,
zero-dependency, browser-native, namespace-tolerant XML parser that already does exactly
what this ticket needs (parse a string, expose a `parsererror` node on failure, offer
`querySelectorAll`/`getAttribute` for `trk`/`trkseg`/`trkpt`/`rte`/`rtept`/`wpt`/`ele`
extraction) — every candidate library that is actually usable here (`@tmcw/togeojson`,
`fast-xml-parser`) either wraps this same browser primitive (togeojson explicitly
requires the caller to hand it a `Document` — it does not remove the need for
`DOMParser`, it only adds a GeoJSON-shaped translation layer this app doesn't need,
since the app wants a flat `{lat,lon,ele}[]`, not `Feature`/`LineString` objects with
`@types/geojson` typing baggage) or trade the DOM's uniform `NodeList` semantics for
`fast-xml-parser`'s single-vs-array ambiguity (a lone `<trkpt>` deserializes to an
object, two or more to an array, unless `isArray` callbacks are configured per tag —
one more footgun to hand-roll correctly, for no benefit over `querySelectorAll` which
is always list-shaped). Hand-rolling over `DOMParser` keeps the dependency count at
zero, sidesteps `gpxparser`'s disqualifying `jsdom-global` side effect entirely, and
keeps the SSR story trivial (nothing DOM-shaped is ever imported at module scope; the
parser is only reached from a browser event, and the browser guarantees `DOMParser`
exists there). The runner-up is **`@tmcw/togeojson`**: same underlying `DOMParser`
dependency, zero runtime deps, actively maintained (last publish 2025-05-31), hand-written
`.d.ts` — worth revisiting if ticket 06 (terrain model) turns up cases (odd
`<extensions>`, mixed `trk`+`rte` files, KML import as a stretch goal) where leaning on a
tested library's edge-case handling outweighs the one extra dependency and the
`@types/geojson` typing wrinkle noted in §1.

## Code sketch

```ts
// src/lib/gpx/parse-gpx.ts — client-only; never imported from a route loader.

export type TrackPoint = { lat: number; lon: number; ele: number };

export type GpxParseError =
  | { kind: "not-xml"; detail: string }
  | { kind: "not-gpx"; detail: string }
  | { kind: "empty-track" }
  | { kind: "missing-elevation"; atPointIndex: number };

export type GpxParseResult =
  | { ok: true; points: TrackPoint[] }
  | { ok: false; error: GpxParseError };

/** Read the local (namespace-stripped) tag name — GPX 1.0 and 1.1 use different
 *  namespaces (topografix.com/GPX/1/0 vs .../1/1); querySelector on an XML Document
 *  matches by local name regardless, so no explicit namespace handling is needed here. */
function collectPoints(doc: XMLDocument): Element[] {
  const points: Element[] = [];
  // trk -> (all) trkseg -> (all) trkpt, in document order, tracks concatenated
  for (const trk of Array.from(doc.querySelectorAll("trk"))) {
    for (const trkpt of Array.from(trk.querySelectorAll("trkseg > trkpt"))) {
      points.push(trkpt);
    }
  }
  // fall back to rte/rtept only if no track data was found at all
  if (points.length === 0) {
    for (const rtept of Array.from(doc.querySelectorAll("rte > rtept"))) {
      points.push(rtept);
    }
  }
  return points;
}

export function parseGpx(xmlText: string): GpxParseResult {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");

  if (doc.querySelector("parsererror")) {
    return {
      ok: false,
      error: { kind: "not-xml", detail: doc.querySelector("parsererror")!.textContent ?? "" },
    };
  }

  const root = doc.documentElement;
  if (!root || root.localName !== "gpx" || !root.getAttribute("version")) {
    return { ok: false, error: { kind: "not-gpx", detail: root?.localName ?? "" } };
  }

  const pointElements = collectPoints(doc);
  if (pointElements.length === 0) {
    return { ok: false, error: { kind: "empty-track" } };
  }

  const points: TrackPoint[] = [];
  for (let i = 0; i < pointElements.length; i++) {
    const el = pointElements[i];
    const lat = Number.parseFloat(el.getAttribute("lat") ?? "");
    const lon = Number.parseFloat(el.getAttribute("lon") ?? "");
    const eleText = el.querySelector("ele")?.textContent;
    const ele = eleText === undefined || eleText === null ? Number.NaN : Number.parseFloat(eleText);

    // Number.isFinite, not truthiness/??0 — see §4: absence must never collapse to 0.
    if (!Number.isFinite(ele)) {
      return { ok: false, error: { kind: "missing-elevation", atPointIndex: i } };
    }
    points.push({ lat, lon, ele });
  }

  return { ok: true, points };
}

// Call site (client-only, e.g. an <input type="file"> onChange handler):
// const text = await file.text();
// const result = parseGpx(text);
// if (!result.ok) { renderFrenchError(result.error); return; }
// use result.points downstream (ticket 06).
```

## Failure taxonomy

The app must render a French error message for each of these, never let one propagate
into an uncaught exception / blank screen:

- **`not-xml`** — triggered by: truncated file, non-XML file renamed to `.gpx`, any
  input that isn't well-formed XML. Detected via `doc.querySelector("parsererror")`
  after `DOMParser.parseFromString` (never throws itself — see §5). Example French copy:
  "Le fichier n'est pas un fichier XML valide."
- **`not-gpx`** — triggered by: well-formed XML whose root element isn't `<gpx>` (e.g. a
  KML file renamed `.gpx`), or a `<gpx>` root missing the required `version` attribute
  (schema-required in both 1.0 and 1.1 — see §3). Example: "Ce fichier n'est pas un GPX
  reconnu."
- **`empty-track`** — triggered by: valid GPX with no `<trk>`/`<trkseg>`/`<trkpt>` and no
  `<rte>`/`<rtept>` at all, or present-but-empty containers (schema-legal — see §5).
  Example: "Le fichier GPX ne contient aucun tracé."
- **`missing-elevation`** — triggered by: at least one selected trackpoint lacking a
  parseable `<ele>` (schema-optional in both GPX versions — see §4). Per `map.md`'s
  scope decision, this is a hard reject, not a fallback-to-flat-terrain. Example: "Ce
  fichier GPX ne contient pas de données d'altitude."
- **Uncategorized / read failure** — triggered by: the browser failing to read the
  `File` at all (`file.text()` rejecting), which is unrelated to GPX content and should
  be caught at the call site with its own generic message, e.g. "Impossible de lire le
  fichier." This isn't a `parseGpx` return case above — it happens before `parseGpx` is
  even called.
- Explicitly **not** a hard-failure case per the research in §5: a very large (~20 MB)
  file. No primary source documents a hard ceiling; treat it as a "show a loading
  indicator, let it run" UX concern, not an error state, pending real measurement (see
  Open Questions).

## OPEN QUESTIONS

- **No measured performance number for large files.** I could not find a primary-source
  benchmark (browser vendor docs, `DOMParser`/`fast-xml-parser` project docs) for
  parsing a ~20 MB / ~100k-trackpoint GPX string specifically. The reasoning in §5 is
  structural (full-tree-in-memory, not streaming), not measured. Recommend an explicit
  timed prototype with a real large GPX file before finalizing whether a Web Worker is
  needed for parsing (this echoes the still-open "Web Worker?" question already flagged
  in `map.md` for the physics sweep — parsing may deserve the same scrutiny, separately).
- **No real sample `.gpx` file obtained from Garmin Connect, Strava, Komoot, or IGN in
  this session.** §3's claims about what each vendor's export actually contains rest on
  vendor support-documentation pages, not a byte-for-byte inspected sample file. I could
  not authenticate to any of these services from this sandboxed research pass. This
  should be closed before writing ticket-06 terrain-model fixtures: pull one real export
  per vendor and diff it against the schema assumptions here.
- **IGN's own GPX export documentation was not located.** I did not find a primary
  Institut Géographique National / Géoportail page describing its GPX export format in
  this session (marked "not found" rather than guessed, in §3).
- **Policy not settled by the ticket or `map.md`: does "missing elevation" mean *any*
  point in the selected track lacking `<ele>`, or *all* points?** The code sketch above
  takes the strict reading (reject on the first point missing `<ele>`), since a
  partially-elevation-less profile can't be safely interpolated without inventing a
  rule map.md doesn't state — but this is my choice, not a settled decision, and should
  be confirmed against ticket 06 (terrain model) before implementation.
- **`@types/geojson` as an implicit type-only dependency of `@tmcw/togeojson`** (noted in
  §1) — not something I could find documented explicitly in togeojson's own README; it's
  inferred from reading its shipped `.d.ts` import statement. If `@tmcw/togeojson` is
  ever adopted (runner-up recommendation), verify this doesn't trip
  `bun run lint-type-aware` before relying on it.
