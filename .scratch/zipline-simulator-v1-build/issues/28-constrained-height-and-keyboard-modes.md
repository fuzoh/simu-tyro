# 28 — Keep safety controls usable under constrained height

**What to build:** Complete narrow-screen behavior when whole Chart Block cannot coexist with usable Rail. Short viewports and landscape open in pinned mode; soft keyboard produces compact single-row safety view and leaves focused controls reachable. Existing Handle Lane and chart interactions receive final touch-target behavior without branching React tree by viewport.

**Blocked by:** 27 — Pin safety information while navigating the Rail.

**Status:** ready-for-agent

- [ ] Chart Block pins whenever its width-derived height exceeds available height minus minimum Rail height.
- [ ] Soft-keyboard inset or available height below 420 px produces compact 44 px safety row.
- [ ] Rail receives keyboard-safe bottom space, and field focus scrolls target to center without smooth-animation races.
- [ ] Landscape reaches pinned state through same fit rule; no orientation-specific prompt or branch exists.
- [ ] Narrow Rail stays in flow and pushes rather than covers Chart Block.
- [ ] Anchor handles remain entirely below plot with 44 × 48 px targets; rider and scrub targets reach 44 px for coarse pointers.
- [ ] Profile and scrub surfaces allow vertical panning while retaining horizontal dragging.
- [ ] Layout uses CSS media/container queries and derived state only; no `useMediaQuery` branch or chart height based on window height appears.
- [ ] Arithmetic and state-policy cases are node-unit tested; typecheck and type-aware lint pass.
