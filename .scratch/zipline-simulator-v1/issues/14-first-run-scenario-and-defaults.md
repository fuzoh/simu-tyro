# First-run scenario and default values

Type: grilling
Status: open
Blocked by: — (05, 07 resolved)
Map: [Zip-line simulator v1](../map.md)

## Question

What is in the form the first time the app opens, and does a worked example ship?

Graduated from the map's fog once
[Span and rigging parameter model](./04-span-and-rigging-parameter-model.md) fixed the field
list. That ticket deliberately settled every field's label, unit, hard range and warning
threshold but **not** its initial value, because the first screen also depends on the
Material Spec (ticket 05) and on what the visualisation prototype (ticket 07) shows.

Settle:

1. **The scenario numbers.** Portée, dénivelé, hauteur d'ancrage A and B, the default
   Tightness Spec mode and its target value, and the default Material Spec. They must form a
   _coherent, solvable, green-verdict_ line — the first thing a user sees cannot be an error
   state or a rupture warning.
2. **Worked example.** Does a named reference scenario ship (a «charger un exemple» action),
   and if so which? Candidates with real provenance: the SSF Vercors 1109 m instrumented
   line (`[FIELD:SSF]`, §10.1) — but it is textile, so it forces
   `TEMPORAIRE — secours & expédition` and is atypical of the permanent installations the
   app defaults to.
3. **Reset behaviour.** What «réinitialiser» returns to, and whether it clears an imported
   GPX terrain along with the numbers.
4. **Interaction with persistence** (ticket 09). A returning user has a localStorage
   session; a shared link has URL params. Rank the three sources — URL, localStorage,
   first-run defaults — and say what a user sees when the URL is partial.
5. **Empty-field behaviour.** A user who clears Portée is mid-edit, not in an error state.
   Decide whether cleared fields fall back to the default, hold the last valid value, or
   block the solve with the form-tier message from ticket 04 §7.

## Context

Already fixed by [ticket 04](./04-span-and-rigging-parameter-model.md) and **not** open here:

- Masse passager **120 kg** and Enveloppe passager **2.1 m** — the Unconfirmed Defaults must
  be pre-filled; that is what makes them labelled-and-configurable rather than blank.
- Type d'installation defaults to **`PERMANENTE`**, the restrictive branch.
- Régime de sécurité has **no default** — never silently defaulted (CONTEXT.md).
- Force unit defaults to **daN**.

Read the field table in ticket 04 §2 before choosing values, and honour the §3 validity range
(50–2000 m) so the default scenario raises no warning of its own.

**Inherited from [CSV profile import](./06-csv-profile-import-and-anchor-placement.md)** — the
first run has **no imported trace**, so the opening state is manual geometry: typed `L` and `h`
plus the two `hauteur d'ancrage` fields, with terrain as the straight line between the anchor
bases. Two consequences for the scenario chosen here:

- **Garde au sol must be meaningful on first launch.** Ticket 04 made manual terrain a real
  2-point profile precisely so §11 clearance is live before any import — so the default
  `hauteur d'ancrage` pair has to produce a clearance figure worth looking at. A scenario whose
  clearance is either comfortably huge or already violated wastes the app's central read-out on
  first contact.
- **The default `h` and the anchor heights interact.** `h` is typed directly in manual mode
  (ticket 04 rejected deriving it from tower heights, since that would make every metre of
  dénivelé come from a tower), so the two are independent inputs that jointly decide where the
  ground sits relative to the cable. Pick them together, not separately.

Ticket 06's example traces (`docs/references/example-profile-trace1.csv`, 183 m with a 68 m
mid-span dip; `…-trace2.csv`, 224 m) are realistic geometry to sanity-check the chosen defaults
against — a default scenario that looks sensible but that no real trace resembles would be a
poor first impression.

**Inherited from [Results panel](./08-results-panel-and-provenance-warnings.md)** — one more
forced initial value, and one deliberate non-value.

- **`Coefficient dynamique` = 1,2** is pre-filled and **not** this ticket's to choose: §8.2's
  `[FIELD:SSF]` measured ceiling for a controlled step-off. Unlike the other two pre-filled
  values it is **not** an Unconfirmed Default and carries **no « non confirmé » chip** — it is the
  best-attested constant in the reference, merely editable.
- **`Régime de sécurité` stays unset** (« — choisir — »). Three of the five regimes are
  `[CONVENTION]`/`[UNVERIFIED:R1]` and the choice multiplies into every margin, so shipping a
  default regime would pick the user's safety framework for them. The first-run scenario therefore
  opens with **no verdict at all** — a consequence this ticket should confirm it is happy with: the
  first screen shows geometry and clearance, and the verdict appears only after a deliberate choice.
