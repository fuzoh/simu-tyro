# 35 — Verify narrow-screen keyboard interaction in browser

**What to build:** Observe narrow layout with numeric field focused and virtual-keyboard viewport reduction active. Pinned Safety Header must compact, focused control remain reachable, rider-position editing remain visible, and dismiss path restore usable Rail without layout jump.

**Blocked by:** 28 — Keep safety controls usable under constrained height.

**Status:** ready-for-agent

- [ ] Browser run records whether interactive-widget viewport policy is honored and fallback keyboard inset value when it is not.
- [ ] Opening keyboard produces compact one-row safety header and leaves usable Rail space rather than covering focused field.
- [ ] Focusing Rail field centers it inside Rail scroller without smooth-scroll race.
- [ ] Focusing rider-position field retains View Strip and live « Garde min » while keyboard is open.
- [ ] Enter commits and blurs decimal field; keyboard dismissal restores correct pinned/whole state from current constraints.
- [ ] Portrait and landscape outcomes are recorded without orientation prompt or special-case branch.
- [ ] Browser/device limitations are stated explicitly; no unsupported mobile claim is recorded as measured fact.
