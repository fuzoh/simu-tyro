# Profile CSV export — can it exceed 200 points?

Type: research
Status: open
Blocked by: — (06 resolved)
Map: [Zip-line simulator v1](../map.md)
Surfaced by: [CSV profile import and anchor placement](./06-csv-profile-import-and-anchor-placement.md) §2

## Question

Can the profile CSV export used as v1's terrain source be made to emit **more than 200
points**, and if so, how — a UI control, a URL parameter, an API endpoint, a different export
route?

Ticket 06 measured both example traces at **exactly 200 rows** despite different lengths
(183.4 m and 224.0 m), so the exporter samples a fixed count and spacing is `length/199`:

| Span | Exported spacing |
| --- | --- |
| 183 m | 0.92 m |
| 500 m | 2.5 m |
| 1500 m | 7.5 m |
| 2000 m | 10.0 m |

Resolution is therefore coarsest exactly where spans are longest. §11's clearance criterion
needs an inner minimum over *all* `x`, so a bump between two samples is invisible to the
calculation — ticket 06 decided the app discloses the measured spacing and warns above ~5 m
rather than resampling (which would invent no terrain knowledge while hiding the true
resolution).

**What this ticket decides is the warning's copy.** If the export can be made denser, the
warning can be actionable — "ré-exportez le profil avec plus de points" plus how. If it
cannot, the warning can only state the limitation, and a 2000 m span is simply stuck at 10 m
terrain resolution.

Settle:

1. **Is 200 a fixed constant or a default?** Look for a point-count or sample-count parameter
   on whatever endpoint backs the profile tool, and for any UI affordance that changes it.
2. **If it is parameterisable, what is the ceiling** and does the CSV export honour it, or
   only the on-screen chart / JSON response?
3. **Is there a different export route** — a documented API, a GeoJSON/JSON profile endpoint,
   a different geoportal tool — that returns denser samples for the same drawn line?
4. **What is the underlying DEM's own resolution?** A denser export is pointless below the
   DEM's native pixel size — if the terrain model is a 2 m or 0.5 m raster, that is the real
   floor, and it tells us whether 200 points is a genuine limitation at 500 m or already at
   the data's limit. (The 0.1 m altitude quantisation ticket 06 observed is a formatting
   artefact, not necessarily the DEM's precision.)
5. **Does any denser route still emit horizontal `Distance`?** Ticket 06 verified the current
   export's `Distance` is planimetric (183.4 reported vs 183.42 chord vs 263.9 m 3-D surface
   length). An alternative endpoint returning *surface* distance would inflate `L` by up to
   44 % on broken ground — so this must be re-verified per route, never assumed.

## Context

Source format and examples: `docs/references/example-profile-trace1.csv`,
`example-profile-trace2.csv` — `Distance;Altitude;Easting;Northing;Longitude;Latitude`, with
`Easting`/`Northing` in CH1903+/LV95. Produced by the Swiss federal geoportal's profile tool
(`map.geo.admin.ch`, outil Profil → export CSV).

Constraints on any answer: the app makes **no network calls at runtime** (map scope decision),
so this research affects only *documentation and warning copy* — how the operator should
export before importing. It must not turn into a runtime integration; that would be a
different destination.

Prefer primary sources: the geoportal's own API documentation, the service's OpenAPI/endpoint
description, or the network requests the profile tool itself makes. Vendor help pages are
acceptable but should be labelled as such. Record "not found" honestly rather than inferring
a parameter that may not exist.
