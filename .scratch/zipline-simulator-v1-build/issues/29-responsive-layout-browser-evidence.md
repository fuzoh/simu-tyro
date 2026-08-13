# 29 — Capture responsive layout browser evidence

**What to build:** Drive real app and still-present prototype in browser to turn responsive layout contract into repeatable evidence. Record dimensions that require layout engine: three reference budgets, banner heights, View Strip label widths, and transition where fixed Rail stops fitting beside chart.

**Blocked by:** 28 — Keep safety controls usable under constrained height.

**Status:** ready-for-agent

- [ ] At 390×664, measured bands sum to viewport and leave at least 120 px resting Rail.
- [ ] At 768×1024, measured Chart Block and residual letterbox match portrait-tablet budget.
- [ ] At 1440×900, measured Chart Block and residual letterbox match desktop budget.
- [ ] Banner content heights measure 44, 60, and 76 px at one-, two-, and three-line states.
- [ ] Full and abbreviated View Strip labels are measured against 342 px inner width; abbreviated row fits one 44 px line.
- [ ] Real layout confirms 768 px B2 transition and records first width where side-by-side chart becomes unacceptable.
- [ ] Evidence includes reproducible browser commands, measured values, viewport, browser version, and comparison with prototype before deletion.
