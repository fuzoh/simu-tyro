# 32 — Verify shared-link lifecycle in browser

**What to build:** Follow every meaningful incoming-link path through address-bar rewrite and rendered Scenario. Valid links restore faithfully, partial links complete literally, ignored keys remain disclosed long enough to explain rewrite, and contradictory links refuse as whole.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Full shared URL restores all Scenario values, including representable invalid value such as negative span, without silent repair.
- [ ] Partial URL fills omitted values from First-Run Scenario while preserving every supplied value literally.
- [ ] Unknown key is ignored, named in dismissible strip, and absent from canonical address after rewrite.
- [ ] Two Tightness Drivers produce whole-link refusal at HTTP 200 rather than merged Scenario.
- [ ] « Ouvrir l’application sans ce lien » returns to clean app on same route.
- [ ] Copied link reproduces current valid Scenario and never includes synthesized refusal marker.
- [ ] Browser procedure and any required fixtures are repeatable; pure defects gain unit regressions where possible.
