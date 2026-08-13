# 30 — Capture chart fidelity and drag-performance evidence

**What to build:** Compare production Chart Block with still-present prototype for two measurements Node cannot establish: first-run vertical exaggeration and frame cadence while dragging rider. Preserve enough browser and machine context to repeat measurement after prototype disappears.

**Blocked by:** 28 — Keep safety controls usable under constrained height.

**Status:** ready-for-agent

- [ ] First-run screen on 1080×420 plot reports auto-fit vertical exaggeration near ×1.5.
- [ ] Measured plot aspect remains inside [0.35, 0.50] and first-run view stays clear of ×1 floor.
- [ ] Rider drag frame intervals are sampled in browser and p50 is recorded against 16.7 ms vsync interval.
- [ ] Measurement records browser version, viewport, hardware context, sample method, and production/prototype values.
- [ ] Evidence supports or overturns no-Web-Worker decision explicitly; no microsecond timing assertion is added to CI.
- [ ] Reproducible browser procedure survives prototype deletion.
