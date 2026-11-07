import { describe, expect, test } from "vitest";

import type { ForceUnit } from "@/lib/scenario/types.ts";

import { STEEL, steelFormula, TEXTILE } from "@/lib/sim";

import type { QuantityId } from "./quantity.ts";

import {
  DECIMAL_MARK,
  displayDecimals,
  equalAtDisplayPrecision,
  formatQuantity,
  formatValue,
  fromDisplay,
  G,
  KGF,
  QUANTITIES,
  roundToDisplay,
  toDisplay,
  unitLabel,
} from "./quantity.ts";

/**
 * The display-precision table — « v1 build spec » § 3 (*Précision d'affichage par grandeur*,
 * *Units, the force selector, and the two constants*) and § 8 (*Precision — refuse the trade*).
 *
 * **Two of the three consumers are not readers**, and the cases that matter are theirs: the
 * stale-Override badge must **not** fire on an untouched 9074 daN override against a 9073,98
 * formula value, and « le changement d'unité n'écrit jamais dans l'état ; daN→X→daN est
 * l'identité ». A row that is missing or too coarse fails **silently and in the wrong
 * direction**: it produces a badge on every load for every override, which trains the user to
 * ignore the badge that exists to catch a 12 mm breaking force reported on a 16 mm rope.
 *
 * The third consumer is the first-run regression lock, `src/lib/scenario/first-run.test.ts`,
 * which asserts the eleven strings this module renders.
 */

const ALL_UNITS: readonly ForceUnit[] = ["daN", "kN", "kgf"];

/** Every row of the table, in the module's own order — § 3's, plus `regimeK`. */
const ALL_IDS = Object.keys(QUANTITIES) as QuantityId[];

/**
 * One case per row of {@link QUANTITIES}, in its order, valued from the spec's own « Premier
 * lancement » column wherever it has one. That is **§ 3's table plus two rows**: `regimeK` is the
 * régime's safety divisor, which § 3 has no row for because it spends `k` on textile relative
 * stiffness — voir its own comment in the table, and ticket 37 defect 4 for why it is a
 * `QuantityId` rather than a second rounding site — and `unloadedGap`, the « Écart à vide » cell
 * added after § 3 was written. The four rows the column leaves empty or dashed
 * (`Station`, `MBL`, `T adm`, `Réserve de tension`) take § 3's or § 6's quoted figures instead.
 *
 * `value` is always the row's **canonical** unit — § 3's SI storage: metres, mm, kg, kg/m,
 * **newtons**, N/m, percent — so the N → daN → kN → kgf and N → MN conversions are exercised by
 * the table rather than assumed. `expected` is the rendered string **with** its unit, decimal mark included: that
 * column is the gate.
 */
const ROWS: ReadonlyArray<{ id: QuantityId; value: number; expected: string }> = [
  // Inputs and deduced values.
  { id: "L", value: 150, expected: "150,0 m" },
  { id: "h", value: -18, expected: "-18,0 m" },
  { id: "anchorHeight", value: 12, expected: "12,0 m" },
  // No first-run value: the Stations exist in imported mode only, at the file's 0,1 m grain.
  { id: "station", value: 87.42, expected: "87,4 m" },
  // § 4's own printed « Alt. base A 540,4 m » — an altitude in the file's frame, not a difference.
  { id: "zBase", value: 540.44, expected: "540,4 m" },
  { id: "D_target", value: 6, expected: "6,00 m" },
  { id: "H_target", value: 2535.2, expected: "253,5 daN" },
  { id: "L0", value: 151.644, expected: "151,64 m" },
  { id: "vRatio", value: 0.8175, expected: "0,82" },
  { id: "d", value: 12, expected: "12,0 mm" },
  { id: "k", value: 22, expected: "22,0" },
  // « vide, requis » on first run — a datasheet figure, always whole in daN.
  { id: "MBL", value: 60_000, expected: "6000 daN" },
  { id: "mu", value: 0.5465, expected: "0,5465 kg/m" },
  { id: "eta", value: 0.9, expected: "0,90" },
  { id: "m_p", value: 120, expected: "120 kg" },
  { id: "h_rider", value: 2.1, expected: "2,1 m" },
  { id: "h_clear_min", value: 1, expected: "1,0 m" },
  { id: "DAF", value: 1.2, expected: "1,2" },
  { id: "x_D", value: 75, expected: "75,0 m" },
  // The badge's own row: the formula value, not the override, so the padding is what rounds it.
  { id: "MBF", value: 90_739.8, expected: "9074 daN" },
  // 6,897 MN in canonical newtons — the declared carve-out renders MN under every setting.
  { id: "EA", value: 6_897_000, expected: "6,90 MN" },
  { id: "w", value: 5.361, expected: "0,536 daN/m" },
  { id: "chord", value: 151.0761, expected: "151,08 m" },
  { id: "sag", value: 6, expected: "6,00 m" },
  { id: "sagRatio", value: 4, expected: "4,00 %" },
  { id: "standingTension", value: 2.9024, expected: "2,90 %" },
  // Results and read-out cells.
  { id: "Tstatic", value: 8171.3, expected: "817,1 daN" },
  { id: "Tdaf", value: 9278.8, expected: "927,9 daN" },
  { id: "loadedSag", value: 7.4831, expected: "7,48 m" },
  { id: "clearance", value: 2.4399, expected: "2,44 m" },
  // Not a § 3 row: the read-out cell of 2026-09-23, valued at the first-run line's own `x_D` 75.
  { id: "unloadedGap", value: 1.4829, expected: "1,48 m" },
  { id: "extremumX", value: 74.117, expected: "74,1 m" },
  { id: "FS", value: 8.8011, expected: "8,80" },
  // The régime's own divisor — « k = 3,0 » / « exigé 3,0 » — distinct from the textile `k` above.
  { id: "regimeK", value: 3, expected: "3,0" },
  // § 3's régime-dependent trio, quoted at EN 15567-1 / ACCT 10:1 — **absent** on first paint.
  { id: "Tadm", value: 27_220, expected: "2722 daN" },
  { id: "tensionReserve", value: -1110, expected: "-111 daN" },
  { id: "localSlope", value: -11.1, expected: "-11,1 %" },
  { id: "coverage", value: 260, expected: "260 pas" },
];

describe("§ 3's table — one case per row", () => {
  test("every row of QUANTITIES has a case, and no case invents a row", () => {
    // The table's failure mode is a **missing** row, so the coverage check is part of the gate.
    expect(ROWS.map((row) => row.id)).toEqual(ALL_IDS);
  });

  test.each(ROWS)("$id renders « $expected »", ({ id, value, expected }) => {
    expect(formatQuantity(id, value)).toBe(expected);
  });

  test.each(ROWS)("$id: the decimal mark is « , », never « . »", ({ id, value }) => {
    const decimals = displayDecimals(id);
    const shown = formatValue(id, value);
    const [, fraction = ""] = shown.split(DECIMAL_MARK);

    expect(shown).not.toContain(".");
    // Fixed decimals, padded: the fraction is exactly as long as the row says — and the mark is
    // present exactly when there is a fraction to mark. « Couverture » is the one row whose mark
    // column reads « — »; the other integer rows simply have none.
    expect(fraction).toHaveLength(decimals);
    expect(shown.includes(DECIMAL_MARK)).toBe(decimals > 0);
  });
});

describe("the two formatting rules", () => {
  test("fixed decimals are padded: a 2-decimal row renders « 6,00 », never « 6 »", () => {
    // Padding is display-only — state holds a number whose value equals the displayed value, so
    // the URL serialises `6` and the field still shows « 6,00 ».
    expect(formatValue("D_target", 6)).toBe("6,00");
    expect(roundToDisplay("D_target", 6)).toBe(6);
    expect(formatValue("mu", 0.5)).toBe("0,5000");
    expect(formatValue("MBF", 90_740)).toBe("9074");
  });

  test("rounding is visible: 82,5 kg commits as « 83 kg »", () => {
    // The field shows exactly what state holds; nothing is rounded behind the user's back. That
    // property is what makes coarse rows on insensitive quantities acceptable.
    expect(formatQuantity("m_p", 82.5)).toBe("83 kg");
    expect(roundToDisplay("m_p", 82.5)).toBe(83);
  });

  test("half rounds away from zero, so the signed rows are symmetric", () => {
    // `Math.round` alone rounds half **up**, which would send −82,5 to −82 and 82,5 to 83.
    expect(formatValue("m_p", -82.5)).toBe("-83");
    expect(formatValue("tensionReserve", -1105)).toBe("-111");
    expect(formatValue("tensionReserve", 1105)).toBe("111");
  });

  test("a value the user reads as exactly half is not lost to binary noise", () => {
    // 1.005 * 100 is 100.49999999999999 in binary floating point.
    expect(formatValue("eta", 1.005)).toBe("1,01");
    expect(formatValue("sagRatio", 2.675)).toBe("2,68");
  });

  test("a rounded-away negative reads « 0,0 », never « -0,0 »", () => {
    expect(formatQuantity("localSlope", -0.04)).toBe("0,0 %");
    expect(Object.is(roundToDisplay("localSlope", -0.04), 0)).toBe(true);
  });

  test("the dimensionless rows carry no unit and no trailing space", () => {
    expect(formatQuantity("FS", 8.8011)).toBe("8,80");
    expect(formatQuantity("DAF", 1.2)).toBe("1,2");
    expect(unitLabel("eta")).toBe("");
  });
});

describe("the global force selector — forces convert, never re-label", () => {
  test("force decimals derive from the daN column: kN = +2, kgf unchanged", () => {
    const decimalsPerUnit = (id: QuantityId) => ALL_UNITS.map((unit) => displayDecimals(id, unit));
    const actual = Object.fromEntries(ALL_IDS.map((id) => [id, decimalsPerUnit(id)]));
    const expected = Object.fromEntries(
      ALL_IDS.map((id) => {
        const { unit, decimals } = QUANTITIES[id];
        const follows = unit === "force" || unit === "force/m";
        // Every other row — including the `EA` carve-out — ignores the selector entirely.
        return [id, follows ? [decimals, decimals + 2, decimals] : [decimals, decimals, decimals]];
      }),
    );

    expect(actual).toEqual(expected);
  });

  test("MBF reads 9074 daN / 90,74 kN, a tension 253,5 daN / 2,535 kN", () => {
    expect(formatQuantity("MBF", 90_740, "daN")).toBe("9074 daN");
    expect(formatQuantity("MBF", 90_740, "kN")).toBe("90,74 kN");
    expect(formatQuantity("H_target", 2535.2, "daN")).toBe("253,5 daN");
    expect(formatQuantity("H_target", 2535.2, "kN")).toBe("2,535 kN");
  });

  test("`w` follows the force unit: daN/m, kN/m, kgf/m", () => {
    expect(unitLabel("w", "daN")).toBe("daN/m");
    expect(unitLabel("w", "kN")).toBe("kN/m");
    expect(unitLabel("w", "kgf")).toBe("kgf/m");
    expect(formatQuantity("w", 5.361, "kN")).toBe("0,00536 kN/m");
  });

  test("kgf uses KGF = 9,80665, its strict definition", () => {
    // A 120 kg mass weighs 120·G N and therefore reads 120,04 kgf — the 0,03 % discrepancy
    // between the two constants, disclosed rather than papered over.
    const weightN = 120 * G;
    expect(toDisplay("MBF", weightN, "kgf")).toBeCloseTo(120.04, 2);
    expect(formatQuantity("MBF", 90_740, "kgf")).toBe("9253 kgf");
  });

  test("the two constants are fixed, and the engine's copies agree", () => {
    // `g` is not exposed as a field: it varies ≤ 0,3 % over the Earth, immaterial beside the
    // ±15 % spread in `EA` and `MBF`. The engine declares its own because `steel.ts` and
    // `textile.ts` deliberately share no helper — so the only guard against drift is this line.
    expect(G).toBe(9.81);
    expect(G).toBe(STEEL.g);
    expect(G).toBe(TEXTILE.g);
    expect(KGF).toBe(9.80665);
  });
});

describe("the declared EA-in-MN carve-out", () => {
  test("EA renders in MN under every setting of the selector", () => {
    // The strict-global rule's argument is *eyeball comparability*, and `EA` is never compared
    // to a tension by eye — three orders of magnitude larger, consumed only inside ratios.
    for (const unit of ALL_UNITS) {
      expect(unitLabel("EA", unit)).toBe("MN");
      expect(formatQuantity("EA", 6_897_000, unit)).toBe("6,90 MN");
    }
  });

  test("`ea` is canonical newtons like every other force, and daN once in the URL", () => {
    // Canonical in, canonical out: the carve-out is a *display* rule and touches no state. The
    // URL's ÷10 happens in `src/lib/url/scenario.ts`, nowhere else — 6 900 000 N is `ea=690000`.
    expect(roundToDisplay("EA", 6_897_000)).toBe(6_900_000);
    expect(fromDisplay("EA", 6.9)).toBe(6_900_000);
  });

  test("MBF obeys the selector strictly — no kN carve-out for breaking loads", () => {
    // A kN carve-out would put « MBF 90,7 kN » above « tension 437 daN », and a user eyeballing
    // whether 437 sits safely under 90,7 is wrong by a factor of 100.
    for (const unit of ALL_UNITS) expect(unitLabel("MBF", unit)).toBe(unit);
  });
});

describe("« le changement d'unité n'écrit jamais dans l'état ; daN→X→daN est l'identité »", () => {
  const FORCE_IDS = ALL_IDS.filter((id) => {
    const kind = QUANTITIES[id].unit;
    return kind === "force" || kind === "force/m";
  });

  test("the eight force rows are the ones the selector moves", () => {
    expect(FORCE_IDS).toEqual([
      "H_target",
      "MBL",
      "MBF",
      "w",
      "Tstatic",
      "Tdaf",
      "Tadm",
      "tensionReserve",
    ]);
  });

  test.each(FORCE_IDS)("%s: daN → X → daN is the identity, to float precision", (id) => {
    const canonical = 90_739.8;
    for (const unit of ALL_UNITS) {
      const there = toDisplay(id, canonical, unit);
      expect(fromDisplay(id, there, unit)).toBeCloseTo(canonical, 9);
    }
  });

  test("toggling the selector twenty times leaves the value bit-identical", () => {
    // The invariant is architectural — a unit switch is a **read** — and this is what that buys:
    // MBF 9074 daN → 90,7 kN → 9070 daN would move the quantity the Verdict divides by by 4 daN
    // per toggle, drifting on repeat, and the physics-neutrality claim would stop holding.
    let value = 90_740;
    for (let i = 0; i < 20; i++) {
      for (const unit of ALL_UNITS) value = fromDisplay("MBF", toDisplay("MBF", value, unit), unit);
    }
    expect(value).toBe(90_740);
  });

  test.each(FORCE_IDS)("%s: the display resolution never coarsens on a switch", (id) => {
    // `kN` = daN + 2 decimals over a unit 100× larger is exactly the daN grid; `kgf` at the daN
    // decimals is 0,980665 daN per step, i.e. finer. Neither can round a value the daN column
    // would have kept — which is what makes a prefill unit-independent in practice.
    // Both steps are canonical newtons, so the comparison is between two grids on one axis.
    const stepDaN = fromDisplay(id, 10 ** -displayDecimals(id, "daN"), "daN");
    for (const unit of ALL_UNITS) {
      const step = fromDisplay(id, 10 ** -displayDecimals(id, unit), unit);
      expect(step).toBeLessThanOrEqual(stepDaN + Number.EPSILON);
    }
  });

  test("a prefill taken in kN lands on the same state as one taken in daN", () => {
    // The prefill writes the *displayed* value, and the displayed value in kN carries the same
    // resolution — so « Recalculer » under a kN selector cannot move the line.
    for (const id of FORCE_IDS) {
      expect(roundToDisplay(id, 90_739.8, "kN")).toBe(roundToDisplay(id, 90_739.8, "daN"));
    }
    expect(roundToDisplay("MBF", 90_739.8, "kN")).toBe(90_740);
  });
});

describe("the stale-Override badge — compared at display precision, never on floats", () => {
  const SHIPPED = { d: 12, R0: 1770, construction: "iwrc" } as const;

  test("an untouched 9074 daN override does not badge against a 9073,98 formula value", () => {
    // The ticket's case, and the whole reason this table is a **correctness** dependency: a
    // freshly created override holds the displayed value, so float equality would badge every
    // override on every load.
    expect(equalAtDisplayPrecision("MBF", 90_740, 90_739.8)).toBe(true);
    expect(90_740).not.toBe(90_739.8);
  });

  test("the same, from the formula itself rather than from a quoted number", () => {
    const formula = steelFormula(SHIPPED.d, SHIPPED.R0, SHIPPED.construction).MBF;
    // What « Recalculer » writes: the displayed value, never the underlying float.
    const override = roundToDisplay("MBF", formula);
    expect(formatQuantity("MBF", override)).toBe("9074 daN");
    expect(override).not.toBe(formula);
    expect(equalAtDisplayPrecision("MBF", override, formula)).toBe(true);
  });

  test("it badges once `d` moves, which is the state the badge exists for", () => {
    // A 12 mm breaking force reported on a 16 mm rope is the worst thing to hide, since `MBF`
    // drives the Verdict — and the URL has no staleness key, so this comparison is the only
    // thing standing between a link and that silence.
    const override = roundToDisplay("MBF", steelFormula(12, 1770, "iwrc").MBF);
    const resized = steelFormula(16, 1770, "iwrc").MBF;
    expect(equalAtDisplayPrecision("MBF", override, resized)).toBe(false);
  });

  test("`EA` and `μ` badge on their own rows, at their own precision", () => {
    const formula = steelFormula(SHIPPED.d, SHIPPED.R0, SHIPPED.construction);
    const eaOverride = roundToDisplay("EA", formula.EA);
    expect(formatQuantity("EA", eaOverride)).toBe("6,90 MN");
    expect(equalAtDisplayPrecision("EA", eaOverride, formula.EA)).toBe(true);
    // 0,01 MN is 0,15 % over a ×1,52 range, so the row is fine at 2 decimals — but a 16 mm rope
    // is 12,26 MN and has to badge.
    expect(equalAtDisplayPrecision("EA", eaOverride, steelFormula(16, 1770, "iwrc").EA)).toBe(
      false,
    );

    const muOverride = roundToDisplay("mu", formula.mu);
    expect(formatQuantity("mu", muOverride)).toBe("0,5465 kg/m");
    expect(equalAtDisplayPrecision("mu", muOverride, formula.mu)).toBe(true);
  });

  test("the comparison follows the selector, because the displayed value does", () => {
    // Same override, same formula, three selectors: the badge decision must not depend on which
    // one is active — the resolution is the same in daN and kN, and finer in kgf.
    for (const unit of ALL_UNITS) {
      expect(equalAtDisplayPrecision("MBF", 90_740, 90_739.8, unit)).toBe(true);
    }
  });
});
