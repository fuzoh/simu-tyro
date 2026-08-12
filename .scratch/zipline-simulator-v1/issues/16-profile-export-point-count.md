# Profile CSV export — can it exceed 200 points?

Type: research
Status: resolved
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

## Answer

**200 is the maximum.** Answered directly by the user (2026-08-12) rather than by a research
subagent, so the provenance is *operator-attested, not documentation-verified* — recorded
plainly because this ticket's own §Context asks for honesty about sourcing. It is corroborated
from the other side by ticket 06's measurement: two traces of different lengths (183.4 m and
224.0 m) both at **exactly** 200 rows is the signature of a fixed sample count, not of a
default that happened to go unchanged twice.

Sub-questions 3 and 5 (an alternative denser export route, and whether it would still emit
*planimetric* `Distance`) were **not independently investigated** and are recorded as
unexamined rather than as negative findings. They stop being interesting under this answer:
with the geoportal capped, a denser route would be a different tool, and a different tool's
`Distance` semantics are the operator's problem at import time — which ticket 06 already
guarded by contract, not by trust.

### The consequence the ticket was written for: the warning is not actionable

This ticket existed to decide the warning's copy, and the answer removes the branch where it
could say *"ré-exportez avec plus de points"*. **The ceiling is structural**, so the copy states
a limitation instead of offering a remedy — and, critically, must say the limit is *per export*
rather than per line, or an operator will re-export hoping for a denser file and get the same
200 rows.

```
Profil importé · 200 points · pas max 7,5 m
⚠ Résolution du terrain grossière (pas > 5 m) — un relief entre deux
  points de mesure n'est pas vu par le calcul de garde au sol.
  L'export du géoportail est limité à 200 points quelle que soit la
  longueur : ré-exporter ne changera rien. Un profil plus dense doit
  venir d'une autre source.
```

Because spacing is `length/199`, the warning's ~5 m threshold is crossed at **≈ 1000 m** and
everything longer is stuck: 7,5 m at 1500 m, 10,0 m at 2000 m. So on the upper half of the
map's stated 50–2000 m range, coarse terrain is the **normal** state, not an exceptional one.

That is a new fact for ticket 08's warning tiers and it is **not resolved here**, because the
tier boundary is genuinely arguable: ticket 08 created the *ambient* tier for a warning that
fires always and therefore means nothing (textile `k`), and this one fires on the upper half of
the range — often, but conditionally, and it names a real blind spot in the clearance
calculation rather than an out-of-band coefficient. Ticket 08 placed it at ⚠ inside an
always-visible terrain block, which stands. Flagged to
[Validation and error-state UX](./11-validation-and-error-state-ux.md), which owns how each
state renders, as the place to confirm ⚠ rather than ambient now that the frequency is known.

### The one remedy that does exist, and how it interlocks with two earlier decisions

A denser profile can still be imported — it just cannot come from the geoportal. Ticket 06's
contract is **columns by name** (`Distance` + `Altitude` minimum, delimiter and decimal mark
auto-detected), which was chosen so a swapped `Altitude;Distance` file is unrepresentable, and
it has the side effect of making a **hand-authored or survey-derived two-column CSV a
first-class input**. That is the escape hatch for a 2000 m line whose operator needs better
than 10 m.

It lands the file in exactly the state ticket 08 built the third disclosure state for: no
`Easting`/`Northing`, so the straightness check cannot run, so
**ℹ « Rectitude non vérifiable (coordonnées absentes) »**. The three decisions interlock
cleanly — the denser-terrain remedy *is* the unverifiable-straightness case, and the operator
trading one for the other should be told so. Worth one sentence in the import documentation:
a denser profile buys clearance fidelity at the cost of the straightness check.

### Residual, deliberately not chased

**Sub-question 4 — the DEM's own resolution — is unanswered**, and it changes nothing this
map decides. It would sharpen the *explanation* (at 1500 m, is 7,5 m spacing discarding data
the terrain model actually holds, or already at the raster's floor?) but not the behaviour:
ticket 06 chose "use the file's own samples and disclose the measured spacing" precisely so the
app never has to know what the source could have provided. Recorded here rather than left
implicit, so nobody re-opens the ticket believing a decision hangs on it. If the copy is ever
rewritten to explain *why* the limit bites, that is the fact to go and get.
