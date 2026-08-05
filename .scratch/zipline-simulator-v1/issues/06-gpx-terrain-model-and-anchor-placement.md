# GPX terrain model and anchor placement

Type: grilling
Status: open
Blocked by: — (01 resolved)
Map: [Zip-line simulator v1](../map.md)

## Question

How does an imported GPX track become the ground under the line, and how does the user
place the two anchors on it?

Settle:

1. **Trackpoints to `z_ground(x)`.** The engine's §11 clearance criterion needs a ground
   elevation as a function of horizontal position `x`. Decide the transform: cumulative
   haversine distance along the track as `x`, or projection of each point onto the straight
   A→B chord? These agree only for a perfectly straight track — and the map rules curved
   tracks out of scope, so decide which assumption the app *makes* and what it does when
   the track violates it (silently accept, warn, or reject with a straightness metric).
2. **Resampling and smoothing.** Raw GPS traces have irregular point spacing and noisy
   barometric elevation. Does the app resample to a uniform grid, and at what spacing? Note
   that §11 requires an inner minimum over *all* `x`, not just under the rider — terrain
   bumps between the rider and the anchors matter — so the grid resolution is a correctness
   concern, not just a cosmetic one. Decide whether smoothing is offered, and if so whether
   it is on by default (smoothing a real bump away is non-conservative for clearance).
3. **The origin.** `x = 0` is the left anchor A in the §2 frame, but the GPX track has its
   own start. Decide how the two relate. The user places anchors by *distance from the
   track start* — so the terrain array and the engine frame have different origins and
   something must translate. Name that translation and where it lives.
4. **Anchor placement.** Per the map, anchors are placed as *distance along the profile* +
   *height above the profile at that point*. Derive `L` and `h` from that: `L` is the
   horizontal distance between the two placements, `h` the difference of
   `terrain(d) + height`. Confirm this matches how
   [Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) frames
   geometry, and reconcile if not.
5. **Edge cases.** Anchors placed outside the track extent. Anchor B before anchor A.
   Both anchors at the same distance. A track shorter than 50 m. A track kilometres long
   with the zip line occupying 200 m of it — does the chart show the whole track or crop to
   the span plus a margin? Decide the crop rule.
6. **Terrain as one concept, two sources.** The map fixes flat ground at anchor-base level
   as the pre-GPX baseline. Define the single terrain type both sources produce, so
   §11 clearance has one code path. Decide what happens to manually-entered geometry when a
   GPX is imported — is it overwritten, or does the import adopt the existing `L` and `h`?
7. **Removing the GPX.** Can the user clear an imported track and go back to flat ground?
   What happens to the anchor placements.
8. **Partial elevation — handed down from
   [GPX parsing in the browser](./01-gpx-parsing-in-the-browser.md).** The map says a file
   without `<ele>` is rejected, but that research confirmed `<ele>` is optional
   *per trackpoint* in both the GPX 1.0 and 1.1 schemas — so a file can carry elevation on
   some points and not others. Decide: reject when **any** point lacks it, or only when
   **all** do (interpolating the gaps)? The parse sketch provisionally takes the strict
   any-point reading; confirm or overturn it. Interpolating a gap invents ground that isn't
   measured, which for a clearance tool is the non-conservative direction.

## Context

Read `docs/simulation-theory.md` §11 (the clearance criterion and why the inner minimum over
all `x` exists), §2 (the frame: A at origin, `h < 0` means B lower), and §4.3 (ground
contact is an error state the solver must detect and report, never iterate into).

[GPX parsing in the browser](./01-gpx-parsing-in-the-browser.md) is **resolved**: plain
`DOMParser` plus a hand-written ~50-line mapper, no library. Start from its answer and its
failure taxonomy — don't redo the survey. Note in particular that `DOMParser` never throws
on malformed XML (it returns a document containing a `parsererror` element), so every
failure this ticket defines has to be an explicit check.

Scope reminders from the map: elevation is required and a file without `<ele>` is rejected;
there are no network calls, so no DEM fallback; curved tracks and any map view are out of
scope.
