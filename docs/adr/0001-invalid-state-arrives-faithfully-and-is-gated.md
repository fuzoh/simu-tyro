# ADR-0001: Invalid state arrives faithfully and is gated, never normalised

**Status:** accepted (2026-11-07, triage of #24–#29)

## Context

The Rail disables choices the current state makes meaningless (a knot on HMPE, a
textile régime on steel). A link, a restored Session or a class switch can still carry
such a choice, because the disabling lives only in the picker. Two repairs were
possible: substitute a valid choice on entry, or keep the state and raise a Blocking
Error.

## Decision

State that arrives through a link, a Session or a dependent field change is kept
**as given**. Where the UI would have disabled the choice, the app raises a Blocking
Error on the gate the choice breaches, with a Fix Action whose label names the effect of
pressing it. No path substitutes a value silently; completion from shipped defaults is
the only rewrite, and it is always named in the link strip.

Refactors that meet a contract or a pinned expectation choose **correctness over
byte-compatibility**: an engine result shape, a pinned string or a budget edge may
change when the old behaviour was accidental, and the PR explains the re-pin.

## Consequences

- Links restore state faithfully, including invalid state (`?L=-5` already does).
- Rules that gate choices live in `lib/rail` gates, not in JSX, so link, Session and
  click paths share one check.
- A fifth Fix Action (`passer-a-la-terminaison-de-depart`) is admitted beyond spec § 7's four.
  Its label names the active family's shipped end (« Passer à « Œil cousu / épissuré » » on a
  textile line). It repairs a knot on HMPE and an end of the other family that arrived in a link
  or a Session.
- The spec's assumption that knots on HMPE "never reach a warning" no longer holds; the
  state is reachable and is a Blocking Error, not a warning.
