# 27 — Pin safety information while navigating the Rail

**What to build:** Make the Chart Block become a Pinned Safety Header when someone scrolls the Rail or focuses a Rail field. The reduced view keeps current banner occupant and live « Garde min » visible, preserves View Strip while rider-position field has focus, and lets someone restore whole profile without introducing persisted layout state.

**Blocked by:** None — ticket 26 is complete.

**Status:** ready-for-agent

- [ ] Chart Block stays whole while Rail is at top and no Rail field has focus.
- [ ] Scrolling Rail or focusing one of its fields reduces Chart Block to banner slot plus live « Garde min ».
- [ ] Focusing rider-position field keeps View Strip present so field never collapses itself away.
- [ ] Pinned header exposes « Afficher le profil » action with correct accessible name and restores whole block when constraints allow.
- [ ] Banner jump action reveals culpable Rail section, reserves pinned-header clearance, and focuses target control.
- [ ] Blocking errors keep culpable Rail section reachable and pinned at narrow width.
- [ ] Collapse state derives only from scroll and focus; it is absent from Scenario, Session, and URL.
- [ ] Pure collapse-policy cases are covered in node-unit tests; typecheck and type-aware lint pass.
