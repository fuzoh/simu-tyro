# GPX parsing in the browser — library or DOMParser?

Type: research
Status: resolved
Blocked by: —
Findings: [research/01-gpx-parsing.md](../research/01-gpx-parsing.md)
Map: [Zip-line simulator v1](../map.md)

## Question

How should Scoutech turn an uploaded `.gpx` file into an array of
`{ lat, lon, ele }` trackpoints, entirely client-side with no network?

Settle:

1. **Library or hand-rolled?** Survey what exists on npm for GPX in TypeScript
   (`@tmcw/togeojson`, `gpxparser`, `gpx-parse`, `fast-xml-parser` + a thin mapper, or
   plain `DOMParser` from the browser). For each: bundle size, TS types quality,
   maintenance status, whether it works without Node built-ins, whether it runs under
   Vitest's jsdom environment, and licence.
2. **Does it survive SSR?** TanStack Start renders on the server. A library reaching for
   `window` or `DOMParser` at import time is disqualified unless the import is deferred to
   the client. Check this explicitly, don't assume.
3. **What GPX shapes exist in the wild?** `<trk>/<trkseg>/<trkpt>` versus `<rte>/<rtept>`
   versus bare `<wpt>`. Which does the app need to accept? Multiple `<trkseg>`? Multiple
   `<trk>`? GPX 1.0 versus 1.1 namespaces? Report what a typical export from Garmin,
   Strava, Komoot and IGN actually contains.
4. **Elevation.** Confirm `<ele>` is optional in the schema, and how each candidate
   surfaces its absence — `undefined`, `0`, or `NaN`. This matters: the map's scope
   decision is to **reject** files without elevation, and a library that silently
   substitutes `0` would defeat that check.
5. **Malformed input.** What each candidate does with a truncated file, a non-XML file
   renamed to `.gpx`, or a 20 MB track. The app must fail with a French error message,
   never throw into a blank screen.

Deliver a recommendation with a one-paragraph justification and a minimal code sketch of
the parse path, plus the failure taxonomy the app will need to render.

## Context

Consumed by [CSV profile import and anchor placement](./06-csv-profile-import-and-anchor-placement.md),
which decides how these trackpoints become `z_ground(x)`. Stay out of that question — this
ticket ends at a validated array of trackpoints.

> ⚠ **SUPERSEDED 2026-08-05.** That consumer pivoted from GPX to profile CSV, and **GPX is now
> out of scope for v1** (see the map). Nothing in this ticket gets built: v1 contains no
> `DOMParser`, no GPX mapper and no `parsererror` check. It is kept because the route was walked
> — the survey is what made the pivot cheap — and because it is the reference to start from if
> GPX ever returns as a fresh effort. Two of its findings did carry over in spirit rather than in
> code: absence must never collapse to `0` (the CSV parser's `Number.isFinite` guard per cell),
> and a parser that does not throw is not a parser that succeeded (the CSV taxonomy is likewise
> all explicit checks).

Constraints: bun, Vite 8, TypeScript 6 with `verbatimModuleSyntax`, no backend, no network
at runtime.

## Answer

Full detail with inline source citations in
[research/01-gpx-parsing.md](../research/01-gpx-parsing.md) (440 lines).

**Use plain `DOMParser` plus a hand-written mapper of roughly 50 lines. No GPX library.**

Zero bundle cost, zero dependencies, tolerant of both GPX namespaces, and its `NodeList`
output sidesteps the single-element-versus-array ambiguity that a generic XML library like
`fast-xml-parser` would push onto the mapper anyway.

Runner-up: `@tmcw/togeojson` — zero runtime dependencies and actively maintained, but it
still needs a `DOMParser`-produced `Document` underneath. It does not remove the
dependency; it adds a GeoJSON translation layer this app has no use for, plus a
`@types/geojson` typing wrinkle.

The two obvious candidates are both disqualified, and the reasons were found by reading
shipped source rather than READMEs:

- **`gpxparser@3.0.8` is SSR-poison.** Its source unconditionally runs
  `require('jsdom-global')()` at module load, so merely importing it pollutes Node
  globals. Confirmed by unpacking the tarball.
- **`gpx-parse@0.10.4` is dead** — untouched since 2016, and its default entry point
  requires the Node builtins `fs`, `http` and `https`.

Findings that change how the code must be written:

- **`<ele>` is optional in both GPX 1.0 and 1.1.** Read directly from the two XSDs, which
  mark it `minOccurs="0"`. This is what makes the map's reject-without-elevation decision
  a real code path rather than a formality.
- **No inspected library substitutes `0` for a missing elevation** — they use `null` or
  omit it. But `gpxparser`'s shipped `.d.ts` types `ele: number`, a type that lies about
  nullability. Worth knowing even though we are not using it.
- **Malformed XML never throws from `DOMParser`.** It returns a document containing a
  `parsererror` element, so the mapper has to check for one explicitly. Verified by
  actually running it against the `jsdom@28.1.0` already installed here, not just by
  citing MDN — which matters, because Vitest runs under that same jsdom.
- **`fast-xml-parser` does not validate by default.** `.parse(data)` silently returns
  garbage on malformed input; it needs `.parse(data, true)`. Found by reading
  `XMLParser.js`. A trap avoided rather than a decision taken.
- **No documented size ceiling in the File/Blob spec.** A 20 MB track is a
  show-a-loading-state concern, not a hard failure.

The findings file carries the TypeScript code sketch and the named failure taxonomy the UI
must render.

**Open questions carried forward:**

- **Reject on *any* point missing `<ele>`, or only when *all* points lack it?** Neither
  this ticket nor the map settles it, and the code sketch provisionally takes the strict
  any-point reading. This is a real decision and it is handed to
  [ticket 06](./06-csv-profile-import-and-anchor-placement.md). **Moot as of the CSV pivot** —
  every row of a profile CSV carries an altitude, so the partial-elevation case has no analogue;
  ticket 06 §8 replaced it with a row-level parse policy (reject the whole file, name the line).
- No measured parse time for a large (~20 MB) GPX.
- No real sample `.gpx` was obtained from Garmin, Strava, Komoot or IGN — vendor
  documentation only, no inspected files. IGN's own GPX export documentation: not found.
