/**
 * The Courant Bandit 11 mm datasheet figures, as issue #83 quotes them from the report of
 * 2026-11-08 (issue #78). Plain data, no import from the preset it checks: a fixture re-derived
 * from the code it tests proves nothing.
 *
 * Provenance per figure, in `testing.md`'s tagging:
 * - `[DATASHEET]` — Courant technical sheet of 12/09/2022 (mass confirmed 2020, 2022 and 2024).
 * - `[DATASHEET]` arithmetic — `k` and `EA` are not Courant figures but arithmetic on the sheet's
 *   2,5 % elongation between 50 and 150 kg (the product page says 3,5 %).
 */

export const COURANT_BANDIT_11 = {
  ropeClass: { value: "pa-en1891a", source: "[DATASHEET] polyamide EN 1891 type A, 12/09/2022" },
  linearMassGramsPerMetre: {
    value: 73,
    source: "[DATASHEET] 12/09/2022, confirmed 2020/2022/2024",
  },
  mblDaN: { value: 3100, source: "[DATASHEET] dated sheets; the product page shows 3000 daN" },
  diameterMm: { value: 11, source: "[DATASHEET] 12/09/2022" },
  elongation: {
    fraction: 0.025,
    fromKg: 50,
    toKg: 150,
    source: "[DATASHEET] sheet elongation, not a Courant stiffness figure; product page says 3,5 %",
  },
  /** `EA ≈ (100 kg × g) / 0,025 ≈ 39 kN`, from the issue. */
  eaKiloNewtons: { value: 39, source: "[DATASHEET] arithmetic on the 2,5 % elongation, issue #83" },
  /** `k = EA / MBL ≈ 39 / 31`. */
  kRelative: {
    value: 1.27,
    source: "[DATASHEET] arithmetic: EA ≈ 39 kN over MBL 31 kN, issue #83",
  },
} as const;
