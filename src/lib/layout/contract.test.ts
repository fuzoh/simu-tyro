/**
 * § 5's three pixel budgets, each of which sums to its viewport. The rows asserted here are the
 * ones the **Skeleton** renders (A7); A8 adds VE, `SharedX` and the ×1 floor against the same
 * constants.
 *
 * The budgets are the spec's own table, so they are a fixture, not this module's output: if
 * `PROFILE_ASPECT` or the strip clamp moves, the three viewports stop summing and these fail.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { formatValue } from "@/lib/format/quantity.ts";

import {
  ANCHOR_TARGET,
  anchorTarget,
  BANNER,
  bannerBudget,
  CELL_ROW,
  CELL_WRAP_PX,
  cellRows,
  chartBlockHeight,
  CLEARANCE_EMPTY,
  clearanceDomain,
  clearanceTickLabel,
  createSharedX,
  createZScale,
  exaggeration,
  GUTTER,
  innerWidth,
  MIN_RAIL,
  peekBadgeLabel,
  peekMode,
  PLOT_ASPECT_BAND,
  plotAspect,
  profileOuterHeight,
  PROFILE_ASPECT,
  PROFILE_CHROME,
  PROFILE_CHROME_HEIGHT,
  profilePlotHeight,
  PROFILE_PLOT_MAX,
  RAIL_REFLOW_PX,
  RAIL_WIDTH,
  REFERENCE_COLUMN_PX,
  REFERENCE_DESKTOP_PX,
  STRIP,
  STRIP_POLICY_BAND,
  stripOuterHeight,
  VE_BAND,
  veBadgeLabel,
  VIEW_STRIP,
  X_MARGIN,
  Z_MARGIN,
} from "./contract.ts";

/** § 5, *The three pixel budgets, each summing to the viewport*. */
const BUDGETS = [
  {
    name: "A · 390×664",
    column: 390,
    wInner: 342,
    plot: 144,
    profile: 220,
    strip: 96,
    rows: 2,
    banner: BANNER.threeLines,
    block: 540,
  },
  {
    name: "B · 768×1024",
    column: 480,
    wInner: 432,
    plot: 181,
    profile: 257,
    strip: 96,
    rows: 2,
    banner: BANNER.twoLines,
    block: 561,
  },
  {
    name: "C · 1440×900",
    column: 1152,
    wInner: 1104,
    plot: 464,
    profile: 540,
    strip: 177,
    rows: 1,
    banner: BANNER.oneLine,
    block: 857,
  },
] as const;

describe("§ 5 — the layout contract", () => {
  for (const budget of BUDGETS) {
    describe(`${budget.name}`, () => {
      it("W_inner is the column less one gutter each side", () => {
        expect(innerWidth(budget.column)).toBe(budget.wInner);
      });

      it("the profile plot is 0,42 × W_inner", () => {
        expect(Math.round(profilePlotHeight(budget.wInner))).toBe(budget.plot);
        // **Amendment F leaves all three budgets on the unclamped rule**, to the last bit: the `min`
        // is transparent at and below § 5's reference column, so the three rows above are still the
        // aspect rule's own arithmetic and not a capped approximation of it.
        expect(profilePlotHeight(budget.wInner)).toBe(PROFILE_ASPECT * budget.wInner);
        expect(plotAspect(budget.wInner)).toBe(PROFILE_ASPECT);
      });

      it("the profile band is the plot plus 76 px of chrome", () => {
        expect(Math.round(profileOuterHeight(budget.wInner))).toBe(budget.profile);
      });

      it("the strip is clamp(0,16 × W_inner, 96, 200)", () => {
        expect(Math.round(stripOuterHeight(budget.wInner))).toBe(budget.strip);
      });

      it("the obtained aspect sits inside the Plot Aspect Band", () => {
        const aspect = profilePlotHeight(budget.wInner) / budget.wInner;
        expect(aspect).toBeGreaterThanOrEqual(PLOT_ASPECT_BAND.min);
        expect(aspect).toBeLessThanOrEqual(PLOT_ASPECT_BAND.max);
      });

      it("the read-out cells wrap as B1 says", () => {
        expect(cellRows(budget.column)).toBe(budget.rows);
      });

      /**
       * The **whole block**, which is (c)'s left-hand side. § 5's table rounds each band and then
       * sums; `chartBlockHeight` sums and rounds nowhere, so the two agree to within a pixel — 856,3
       * against the table's 857 at desktop is the whole of the gap.
       */
      it("the block is the five bands, and it is the collapse's own left-hand side", () => {
        const height = chartBlockHeight(budget.column, budget.banner);
        expect(height).toBeGreaterThan(budget.block - 1);
        expect(height).toBeLessThan(budget.block + 1);
        expect(height).toBe(
          budget.banner +
            profileOuterHeight(budget.wInner) +
            stripOuterHeight(budget.wInner) +
            VIEW_STRIP +
            budget.rows * CELL_ROW,
        );
      });

      it("the banner term the collapse assumes is this budget's own row", () => {
        // 76 at 390 of column, 60 at 480, 44 at 1152 — the table read down its own column, from
        // thresholds the module already has. The default is what (c) actually uses.
        expect(bannerBudget(budget.column)).toBe(budget.banner);
        expect(chartBlockHeight(budget.column)).toBe(
          chartBlockHeight(budget.column, budget.banner),
        );
      });
    });
  }

  it("the block's height reads a width and never a viewport", () => {
    // The invariant, as a test rather than as a sentence: (c) compares the block against a height,
    // so the block itself may not be a function of one. Two viewports, one column, one answer.
    expect(chartBlockHeight(390)).toBe(chartBlockHeight(390));
    // And it is monotone in the width, which is what makes the comparison meaningful at all.
    expect(chartBlockHeight(1152)).toBeGreaterThan(chartBlockHeight(390));
  });

  it("the banner term never under-reserves, and never over-reserves the desktop", () => {
    // Monotone downward in the width, with no fourth value: three rows, two thresholds, both
    // already in the module.
    expect(bannerBudget(0)).toBe(BANNER.threeLines);
    expect(bannerBudget(479)).toBe(BANNER.threeLines);
    expect(bannerBudget(480)).toBe(BANNER.twoLines);
    expect(bannerBudget(623)).toBe(BANNER.twoLines);
    expect(bannerBudget(624)).toBe(BANNER.oneLine);
    expect(bannerBudget(4000)).toBe(BANNER.oneLine);
    // The 32 px this replaces: a three-line term everywhere put the desktop block at 889 and
    // collapsed every viewport shorter than that, including a 1440×880 window whose rendered block
    // is 857. The pinned header's own reserve keeps the three-line default — voir `collapse.ts` —
    // because there the failure runs the other way.
    expect(chartBlockHeight(1152, BANNER.threeLines) - chartBlockHeight(1152)).toBe(32);
  });

  it("budget A clears MIN_RAIL by the 4 px that refuse `__root.tsx` an app bar", () => {
    // « Those 124 px of resting rail clear `MIN_RAIL = 120` by 4 px » — the measurement the whole
    // no-app-bar decision rests on, and the one place (c) is decided by single pixels.
    const rail = 664 - chartBlockHeight(390);
    expect(Math.round(rail)).toBe(124);
    expect(rail - MIN_RAIL).toBeGreaterThan(0);
    expect(rail - MIN_RAIL).toBeLessThan(5);
  });

  it("the strip floor is 96 px, not the 72 px policy floor", () => {
    expect(stripOuterHeight(0)).toBe(96);
  });

  it("the strip ceiling is 200 px — the over-feeding it exists to bound", () => {
    expect(stripOuterHeight(10_000)).toBe(200);
  });

  it("B1 is exactly 624 px of chart column, not 625", () => {
    // Amendment L: the threshold is `≥`, and it is 624 because the mono face is unbound and
    // `(9 × 18 × 0,62 + 24) × 5 ≈ 622` is what five nine-character cells then need. § 5's 600 was
    // five pixels *under* its own 605 px estimate — this one sits above its own 622.
    expect(cellRows(624)).toBe(1);
    expect(cellRows(623)).toBe(2);
    // And the retired threshold is now firmly on the two-row side, which is the regression a
    // re-introduced 600 would show up as here first.
    expect(cellRows(600)).toBe(2);
    expect(CELL_WRAP_PX).toBe(624);
    expect(CELL_WRAP_PX).toBeGreaterThan((9 * 18 * 0.62 + 24) * 5);
  });

  it("the aspect is the same at every width up to the reference column — the invariant, stated as a test", () => {
    // The invariant § 5 is built on, and **amendment F narrows its domain rather than its meaning**:
    // one rule still spans 390 px and 1440 px, with no viewport height anywhere in it. Past the
    // reference column the plot stops growing — voir the amendment F block below.
    for (const wInner of [53, 342, 432, 1104]) {
      expect(profilePlotHeight(wInner) / wInner).toBeCloseTo(PROFILE_ASPECT, 12);
      expect(plotAspect(wInner)).toBeCloseTo(PROFILE_ASPECT, 12);
    }
  });

  it("the strip never leaves its policy band [72, 200] — the guard on the rule", () => {
    expect(STRIP.min).toBeGreaterThanOrEqual(STRIP_POLICY_BAND.min);
    expect(STRIP.max).toBeLessThanOrEqual(STRIP_POLICY_BAND.max);
    // The 96 px floor sits 24 px above the policy floor **deliberately**: 96 px is a touch lane.
    expect(STRIP.min - STRIP_POLICY_BAND.min).toBe(24);
    for (const wInner of [0, 53, 342, 432, 600, 1104, 1250, 4000]) {
      expect(stripOuterHeight(wInner)).toBeGreaterThanOrEqual(STRIP_POLICY_BAND.min);
      expect(stripOuterHeight(wInner)).toBeLessThanOrEqual(STRIP_POLICY_BAND.max);
    }
  });
});

/**
 * **Amendment F — the plot's height is capped at § 5's reference chart column.** Taken by the repo
 * owner on 2026-08-14, on ticket 28's item-1 evidence; `AMENDMENTS.md` carries the decision and the
 * rejected options, and this block carries its arithmetic.
 *
 * The defect it answers: `0,42 × W_inner` grows without bound, so above § 5's own 1440 px reference
 * desktop the block outgrows every viewport height, and **five ordinary 16:9 desktops opened with no
 * chart at all**. The cap freezes the plot at the 463,68 px it reaches at a 1152 px column, so
 * **nothing at or below the reference moves** — the three budgets above are asserted on the unclamped
 * rule, exactly — and the block plateaus instead of growing for ever.
 *
 * `uncapped` is the pre-amendment arithmetic, kept as a fixture: it is the whole reason the amendment
 * exists, and it is what a regression would restore.
 */
describe("amendment F — the plot's ceiling at wide widths", () => {
  /** The pre-amendment rule, spelled out, so the counterfactual is not this module's own output. */
  function uncappedBlock(column: number): number {
    const w = innerWidth(column);
    return (
      bannerBudget(column) +
      PROFILE_CHROME_HEIGHT +
      PROFILE_ASPECT * w +
      stripOuterHeight(w) +
      VIEW_STRIP +
      cellRows(column) * CELL_ROW
    );
  }

  /**
   * The desktops ticket 28 measured, above B2, so the chart column is `viewport − 288`. `capped` and
   * `uncapped` are the block's height; `height` is the viewport's, and above B2 the block owes no
   * `MIN_RAIL`, so fitting is `capped ≤ height` — asserted in `./collapse.test.ts` through the real
   * predicate.
   */
  const WIDE = [
    // Below the reference column the cap is transparent, so these two are **unchanged** — and they
    // are the two rows the cap cannot rescue at any value, because rescuing them means lowering the
    // plot below the reference, which is budget C.
    { name: "1280 × 720", width: 1280, height: 720, column: 992, uncapped: 763.52, capped: 763.52 },
    { name: "1366 × 768", width: 1366, height: 768, column: 1078, uncapped: 813.4, capped: 813.4 },
    // Wider than the reference: the cap bites. 1512 × 850 is the one row it improves without saving
    // — 30,24 px off, still 17,84 px short of a viewport that is itself 6,32 px shorter than budget
    // C's own block.
    {
      name: "1512 × 850",
      width: 1512,
      height: 850,
      column: 1224,
      uncapped: 898.08,
      capped: 867.84,
    },
    {
      name: "1600 × 900",
      width: 1600,
      height: 900,
      column: 1312,
      uncapped: 946.88,
      capped: 879.68,
    },
    // The 1,3 px miss: § 5's most ordinary desktop, pinned by an arithmetic accident.
    {
      name: "1920 × 1080",
      width: 1920,
      height: 1080,
      column: 1632,
      uncapped: 1081.28,
      capped: 879.68,
    },
    {
      name: "2560 × 1440",
      width: 2560,
      height: 1440,
      column: 2272,
      uncapped: 1350.08,
      capped: 879.68,
    },
    // An ultrawide is where the unbounded rule got absurd, and where a « keep the aspect inside the
    // band » cap would have failed too: 0,35 × 3104 + 416 = 1502,4 against 1440 px of height.
    {
      name: "3440 × 1440",
      width: 3440,
      height: 1440,
      column: 3152,
      uncapped: 1719.68,
      capped: 879.68,
    },
  ] as const;

  it("the ceiling is § 5's reference column, and budget C sits exactly on it", () => {
    expect(REFERENCE_DESKTOP_PX).toBe(1440);
    expect(REFERENCE_COLUMN_PX).toBe(REFERENCE_DESKTOP_PX - RAIL_WIDTH);
    expect(REFERENCE_COLUMN_PX).toBe(1152);
    expect(innerWidth(REFERENCE_COLUMN_PX)).toBe(1104);
    expect(PROFILE_PLOT_MAX).toBeCloseTo(463.68, 9);
    // Budget C is **on** the cap, not under it: that is what « nothing at or below the reference
    // moves » means, and it is the single assertion the whole amendment stands or falls on.
    expect(profilePlotHeight(1104)).toBe(PROFILE_PLOT_MAX);
    expect(chartBlockHeight(REFERENCE_COLUMN_PX)).toBeCloseTo(856.32, 9);
    expect(900 - chartBlockHeight(REFERENCE_COLUMN_PX)).toBeCloseTo(43.68, 9);
  });

  it("the cap cannot reach below B2, so the narrow budgets are untouchable by construction", () => {
    // Below B2 the chart column *is* the viewport, so the widest column that arm can produce is 767
    // px — 719 of `W_inner`, a 302 px plot. The cap is 161 px above anything narrow can ask for.
    expect(profilePlotHeight(innerWidth(RAIL_REFLOW_PX - 1))).toBeLessThan(PROFILE_PLOT_MAX);
    expect(profilePlotHeight(innerWidth(RAIL_REFLOW_PX - 1))).toBe(
      PROFILE_ASPECT * innerWidth(RAIL_REFLOW_PX - 1),
    );
    for (const column of [320, 390, 480, 600, 767]) {
      expect(chartBlockHeight(column)).toBe(uncappedBlock(column));
    }
  });

  it("all three budgets are byte-identical to the unclamped rule", () => {
    for (const budget of BUDGETS) {
      expect(chartBlockHeight(budget.column)).toBe(uncappedBlock(budget.column));
      expect(profileOuterHeight(budget.wInner)).toBe(
        PROFILE_CHROME_HEIGHT + PROFILE_ASPECT * budget.wInner,
      );
    }
  });

  it.each(WIDE)("$name — block $uncapped → $capped", ({ column, uncapped, capped }) => {
    expect(uncappedBlock(column)).toBeCloseTo(uncapped, 6);
    expect(chartBlockHeight(column)).toBeCloseTo(capped, 6);
    // A cap only ever removes height. Nothing here may grow, at any width.
    expect(chartBlockHeight(column)).toBeLessThanOrEqual(uncappedBlock(column));
  });

  it("the block plateaus at 879,68 px — bounded for the first time", () => {
    // The two width-derived terms both have a ceiling now: the plot at 463,68 and the strip at 200.
    // `44 + 76 + 463,68 + 200 + 44 + 52`, and it is the same number at a 1 600 px column and at a
    // 100 000 px one, which is what « the block can no longer outgrow a viewport » means.
    const plateau =
      BANNER.oneLine + PROFILE_CHROME_HEIGHT + PROFILE_PLOT_MAX + STRIP.max + VIEW_STRIP + CELL_ROW;
    expect(plateau).toBeCloseTo(879.68, 9);
    for (const column of [1600, 2272, 3152, 100_000]) {
      expect(chartBlockHeight(column)).toBeCloseTo(plateau, 9);
    }
    // Never above the plateau, at any width at all — including the narrow arm, where the block's two
    // *step* terms make it non-monotone: at B1 the banner drops 16 px and the cells row 52, so a
    // 624 px column budgets **less** than a 623 px one. That step is § 5's own and predates this;
    // amendment L moved where it falls, not that it falls.
    for (let column = 100; column <= 4000; column += 13) {
      expect(chartBlockHeight(column)).toBeLessThanOrEqual(plateau);
    }
    expect(chartBlockHeight(624)).toBeLessThan(chartBlockHeight(623));
    // Above B1 there is no step left, so the block is monotone non-decreasing there — which is the
    // arm (c) bisects on a desktop, and what makes the comparison meaningful at all.
    let previous = 0;
    for (let column = CELL_WRAP_PX; column <= 4000; column += 7) {
      const block = chartBlockHeight(column);
      expect(block).toBeGreaterThanOrEqual(previous);
      previous = block;
    }
  });

  it("the obtained aspect falls past the cap, and only ever downward", () => {
    // Below the band's floor, deliberately — voir `PLOT_ASPECT_BAND`'s own note. The cap can only
    // *lower* the aspect, and lowering it can only lower VE: the ceiling of the band, which is the
    // over-exaggeration half, is unreachable by construction.
    const measured = [
      { wInner: 1104, aspect: 0.42 },
      { wInner: 1176, aspect: 0.3943 },
      { wInner: 1264, aspect: 0.3668 },
      { wInner: 1584, aspect: 0.2927 },
      { wInner: 2224, aspect: 0.2085 },
    ];
    for (const row of measured) {
      expect(plotAspect(row.wInner)).toBeCloseTo(row.aspect, 4);
      expect(plotAspect(row.wInner)).toBeLessThanOrEqual(PROFILE_ASPECT);
    }
    // The band's floor is crossed at `463,68 / 0,35` = **1324,8 px of `W_inner`**, i.e. a 1372,8 px
    // column and a ~1661 px viewport: below that the obtained aspect is still inside the band, above
    // it the cap has taken it out — deliberately, and only ever downward.
    expect(plotAspect(1324)).toBeGreaterThanOrEqual(PLOT_ASPECT_BAND.min);
    expect(plotAspect(1325)).toBeLessThan(PLOT_ASPECT_BAND.min);
    expect(plotAspect(1584)).toBeLessThan(PLOT_ASPECT_BAND.min);
    // Frozen, not merely slower: the same plot height at a 1264 px and a 2224 px inner width.
    expect(profilePlotHeight(2224)).toBe(profilePlotHeight(1264));
    // A width with no aspect of its own answers the target rather than dividing by zero.
    expect(plotAspect(0)).toBe(PROFILE_ASPECT);
  });

  it("what the cap costs the badge: VE falls with the width, disclosed, and never compresses", () => {
    // The first-run screen, measured at ×1,86 / aspect 0,42 (ticket 30). Past the cap the same
    // scenario reads flatter, and at a wide enough column the ×1 floor takes over — **as its own
    // badge state**, which is § 5's answer to exactly this and the reason the cap is admissible.
    const firstRun = (wInner: number) =>
      exaggeration({
        plotAspect: plotAspect(wInner),
        xSpan: (1 + 2 * X_MARGIN) * 150,
        zDataSpan: 30,
      });
    expect(firstRun(1104).ve).toBeCloseTo(1.8629, 4);
    expect(veBadgeLabel(firstRun(1584))).toBe("Éch. verticale ×1,3");
    // 2560 px of viewport: auto-fit ×0,92, so the floor holds the drawing at ×1 — and the ±12 %
    // margin still absorbs it, so the cable stays **inside** the frame. Clamped, not clipped.
    const wide = firstRun(2224);
    expect(wide.autofit).toBeCloseTo(0.92475, 5);
    expect(wide.ve).toBe(1);
    expect(wide.clamped).toBe(true);
    expect(wide.state).toBe("true-scale");
    expect(veBadgeLabel(wide)).toBe("Éch. verticale ×1 — vraie échelle");
    expect(wide.peekEnabled).toBe(false);
    // **VE never compresses, at any width** — the guarantee the cap may not touch. § 5's seven all
    // stay inside the published band, and the flattest-drawing of them (the `k` 3,696 row) is the one
    // that reaches « câble hors cadre » at 2560 px.
    for (const wInner of [342, 432, 1104, 1264, 1584, 2224, 10_000]) {
      for (const scenario of SCENARIOS) {
        const ve = veAt(plotAspect(wInner), scenario);
        expect(ve.ve).toBeGreaterThanOrEqual(VE_BAND.min);
        expect(Number(ve.ve.toFixed(1))).toBeLessThanOrEqual(VE_BAND.max);
      }
    }
    // At the reference and below, every one of the seven still auto-fits with no clamp at all.
    for (const scenario of SCENARIOS) expect(veAt(plotAspect(1104), scenario).clamped).toBe(false);
    // Past it the clamp becomes reachable from the *box* again, on the steepest row — disclosed by
    // badge row 3 and by the printed « Garde min », and recorded as amendment F's cost 2, which is
    // where § 5's « reachable from the data, not from the box » is amended. The onset is closed-form:
    // `plotAspect < 1 / (1,24 k)`, i.e. `wInner > 574,96 k` — 2125,1 for this row, so 2224 clips.
    const flattest = SCENARIOS.reduce((a, b) => (a.k < b.k ? a : b));
    expect(veAt(plotAspect(2224), flattest).state).toBe("true-scale-clipped");
  });
});

/**
 * § 5's `k` table — flatness = x-domain span ÷ z-domain span, per scenario, on the **spec's** `1,1 L`
 * domain. The seven are the published band's own evidence; the eighth is deliberately outside them,
 * because it is the one row that reaches the ×1 floor from the **data** rather than from the box.
 *
 * `étendue z` is the *data* extent; the z **domain** adds § 5's ±12 % margin, which is why `k` is
 * `1,1 L / (1,24 × étendue z)` and not `1,1 L / étendue z`.
 */
const SCENARIOS = [
  { name: "z1 100 m plat", L: 100, zSpan: 8.0, k: 11.089 },
  { name: "z3 120 m incliné", L: 120, zSpan: 28.8, k: 3.696 },
  { name: "50 m court", L: 50, zSpan: 9.0, k: 4.929 },
  { name: "1500 m long", L: 1500, zSpan: 214.5, k: 6.204 },
  { name: "1000 m quasi tendu", L: 1000, zSpan: 112.0, k: 7.921 },
  { name: "1000 m très mou", L: 1000, zSpan: 220.0, k: 4.032 },
  { name: "200 m en échec", L: 200, zSpan: 35.3, k: 5.029 },
] as const;

/** « mou profond — hors des sept »: 200 m at `L₀` 400 m, `k` 0,972 ⇒ auto-fit ×0,41 at every aspect. */
const DEEP_SLACK = { L: 200, zSpan: 182.5, k: 0.972 } as const;

/** `VE = plot aspect × (x span / z span)` at a given aspect, for one row of the table. */
function veAt(aspect: number, scenario: { L: number; zSpan: number }) {
  return exaggeration({
    plotAspect: aspect,
    xSpan: (1 + 2 * X_MARGIN) * scenario.L,
    zDataSpan: scenario.zSpan,
  });
}

describe("§ 5 — vertical exaggeration", () => {
  it("the z domain is the data span plus the plot's ±12 % margin", () => {
    // Not decoration: it is the factor § 5's whole `k` column was computed with, and it is also
    // what makes the badge's second row reachable — the margin absorbs a clamp down to 1/1,24.
    expect(Z_MARGIN).toBe(0.12);
  });

  for (const scenario of SCENARIOS) {
    describe(`${scenario.name}`, () => {
      it("k = x-domain span / z-domain span, on the shared 1,1 L domain", () => {
        const xSpan = (1 + 2 * X_MARGIN) * scenario.L;
        const k = xSpan / (scenario.zSpan * (1 + 2 * Z_MARGIN));
        // 1e-3 relative: § 5's `étendue z` column is quoted to 0,1 m, which is what the table's
        // own rounding is worth — « 200 m en échec » reads 35,3 for 35,277.
        expect(k).toBeCloseTo(scenario.k, 2);
        expect(Math.abs(k - scenario.k) / scenario.k).toBeLessThan(1e-3);
      });

      it("the identity holds: VE = plot aspect × k, at the elected 0,42", () => {
        expect(veAt(PROFILE_ASPECT, scenario).ve).toBeCloseTo(PROFILE_ASPECT * scenario.k, 2);
      });

      it("VE sits inside the published band ×1 … ×5,5 at every legal aspect", () => {
        for (const aspect of [PLOT_ASPECT_BAND.min, PROFILE_ASPECT, PLOT_ASPECT_BAND.max]) {
          const { ve } = veAt(aspect, scenario);
          expect(ve).toBeGreaterThanOrEqual(VE_BAND.min);
          // The ceiling publishes ×5,5 for the band's own ×5,54 — assert what the badge prints.
          expect(Number(ve.toFixed(1))).toBeLessThanOrEqual(VE_BAND.max);
        }
      });

      it("the aspect band alone keeps it uncompressed — no clamp, no clip", () => {
        // Box shape can no longer compress anything: at the band floor the flattest of the seven
        // still asks for ×1,29, so the ×1 guard never fires on a scenario the app was measured on.
        for (const aspect of [PLOT_ASPECT_BAND.min, PROFILE_ASPECT, PLOT_ASPECT_BAND.max]) {
          const ve = veAt(aspect, scenario);
          expect(ve.autofit).toBeGreaterThan(1);
          expect(ve.clamped).toBe(false);
          expect(ve.state).toBe("auto");
          expect(ve.peekEnabled).toBe(true);
        }
      });
    });
  }

  it("the elected 0,42 lands the seven at ×1,55…×4,66, inside ticket 07's verified ceiling", () => {
    const values = SCENARIOS.map((scenario) => veAt(PROFILE_ASPECT, scenario).ve);
    expect(Math.min(...values)).toBeCloseTo(1.552, 2);
    expect(Math.max(...values)).toBeCloseTo(4.657, 2);
    // 0,42 rather than the prototype's 0,4240: the aspect that puts the flattest scenario exactly
    // *on* the verified ×4,70 is 0,4239, so 0,424 lands on ×4,70 with nothing left.
    expect(Math.max(...SCENARIOS.map((s) => veAt(0.424, s).ve))).toBeGreaterThan(4.7);
    expect(Math.max(...values)).toBeLessThan(4.7);
  });

  /**
   * **The first-run screen, locked to what the browser drew** — ticket 30 measured the rendered
   * corde A–B at three viewports and got `VE` **×1,86290** at aspect **0,42000**, badge « Éch.
   * verticale ×1,9 », padded z domain **37,200 m** (data span **30,000 m**: A's top at 0 down to
   * B's base at −30, for `L` 150 · `h` −18 · `zA` = `zB` = 12). The case exists because that
   * measurement had no lock at all: the seven `k` rows above are § 5's table and none of them is
   * the shipped scenario, so nothing here would have caught the *first* screen drifting.
   *
   * It asserts the app's own identity — `0,42 × 165 / 37,2`. The spec used to publish « ≈ ×1,5 on a
   * 1080×420 plot », which was arithmetic from a 1,05 L domain and the prototype's box shape, both
   * superseded; **the owner settled it to ×1,86 (badge « ×1,9 ») and the five publication sites now
   * agree with this case** — voir ticket 30 « Item 1 » and amendment I. Chasing ×1,5 by nudging
   * {@link PROFILE_ASPECT} or {@link X_MARGIN} is exactly what this case is here to fail: a true
   * ×1,5 needs aspect 0,3382, *below* the band floor, and a 1080×420 box is unreachable under the
   * elected width-derived rule, which only ever produces 0,42.
   */
  it("the first-run screen draws ×1,86 at aspect 0,42 — the measured first point on the band", () => {
    const firstRun = exaggeration({
      plotAspect: PROFILE_ASPECT,
      xSpan: (1 + 2 * X_MARGIN) * 150,
      zDataSpan: 30,
    });
    expect(firstRun.ve).toBeCloseTo(1.8629, 4);
    expect(firstRun.clamped).toBe(false);
    // « ×1 vraie échelle » enabled is the rendered proof that the floor is not holding it up.
    expect(firstRun.peekEnabled).toBe(true);
    expect(veBadgeLabel(firstRun)).toBe("Éch. verticale ×1,9");
    // Clear of the ×1 floor by 86 %, and inside the band with both guards to spare.
    expect(firstRun.ve).toBeGreaterThan(VE_BAND.min);
    expect(Number(firstRun.ve.toFixed(1))).toBeLessThanOrEqual(VE_BAND.max);
    // The padded domain the measurement read back off the drawing: 30 m of data, ±12 % of margin.
    expect(firstRun.zVisibleSpan).toBeCloseTo(30 * (1 + 2 * Z_MARGIN), 3);
    // The 1080×420 box the re-check line names is unreachable: the rule is width-derived, so
    // 1080 px of plot width comes with 453,6 px of height — aspect 0,42, never 0,3889.
    expect(profilePlotHeight(1080)).toBeCloseTo(453.6, 3);
    expect(420 / 1080).not.toBeCloseTo(PROFILE_ASPECT, 3);
    // And the aspect a ×1,5 badge would need *is* below the floor, on this scenario's own flatness.
    expect((1.5 * 30 * (1 + 2 * Z_MARGIN)) / ((1 + 2 * X_MARGIN) * 150)).toBeLessThan(
      PLOT_ASPECT_BAND.min,
    );
  });

  it("the band ceiling 0,50 is what publishes ×5,5 — a legality bound, never a target", () => {
    const worst = Math.max(...SCENARIOS.map((s) => veAt(PLOT_ASPECT_BAND.max, s).ve));
    expect(worst).toBeCloseTo(5.544, 2);
    expect(veBadgeLabel(veAt(PLOT_ASPECT_BAND.max, SCENARIOS[0]))).toBe("Éch. verticale ×5,5");
  });

  it("compression would need an aspect under 0,2705, which the band forbids", () => {
    const flattestScenario = SCENARIOS.reduce((a, b) => (a.k < b.k ? a : b));
    expect(1 / flattestScenario.k).toBeCloseTo(0.2705, 3);
    expect(1 / flattestScenario.k).toBeLessThan(PLOT_ASPECT_BAND.min);
    // The rejected `flex-[3]`/`flex-1` mechanism: 844×330 landscape, aspect 0,1601, five of seven
    // scenarios compressed. The floor is what refuses it — and it refuses it visibly.
    const compressed = SCENARIOS.filter((s) => veAt(0.1601, s).clamped);
    expect(compressed).toHaveLength(5);
    for (const scenario of SCENARIOS) expect(veAt(0.1601, scenario).ve).toBeGreaterThanOrEqual(1);
  });

  it("the ×1 floor is reached from the data, not from the box — « mou profond »", () => {
    const ve = veAt(PROFILE_ASPECT, DEEP_SLACK);
    // `k` 0,972 ⇒ auto-fit ×0,41 at every legal aspect, and the clamp holds the drawing at ×1.
    expect(ve.autofit).toBeCloseTo(PROFILE_ASPECT * DEEP_SLACK.k, 2);
    expect(ve.autofit).toBeLessThan(1);
    expect(ve.ve).toBe(1);
    expect(ve.clamped).toBe(true);
    // Clamped to ×1 the plot shows less z than the data has, so the belly leaves the frame.
    expect(ve.zVisibleSpan).toBeLessThan(DEEP_SLACK.zSpan);
    expect(ve.state).toBe("true-scale-clipped");
    expect(veBadgeLabel(ve)).toBe("Éch. verticale ×1 — vraie échelle · câble hors cadre");
    // « Disabled whenever the ×1 clamp is already in force » — it cannot peek at what it is doing.
    expect(ve.peekEnabled).toBe(false);
    for (const aspect of [PLOT_ASPECT_BAND.min, PLOT_ASPECT_BAND.max]) {
      expect(veAt(aspect, DEEP_SLACK).ve).toBe(1);
    }
  });

  it("the ±12 % margin is what makes « tout tient dans le cadre » its own row", () => {
    // A scenario whose auto-fit lands between 1/1,24 and 1: the clamp is in force, the margin is
    // eaten, and the data still fits. Row 2 exists because of exactly this interval.
    const ve = exaggeration({ plotAspect: 0.42, xSpan: 220, zDataSpan: 83 });
    expect(ve.autofit).toBeGreaterThan(1 / (1 + 2 * Z_MARGIN));
    expect(ve.autofit).toBeLessThan(1);
    expect(ve.state).toBe("true-scale");
    expect(ve.zVisibleSpan).toBeGreaterThanOrEqual(83);
    expect(veBadgeLabel(ve)).toBe("Éch. verticale ×1 — vraie échelle");
    expect(ve.peekEnabled).toBe(false);
  });

  it("the badge prints one decimal, French comma, and never « ×1,0 »", () => {
    expect(veBadgeLabel(veAt(PROFILE_ASPECT, SCENARIOS[0]))).toBe("Éch. verticale ×4,7");
    expect(veBadgeLabel(veAt(PROFILE_ASPECT, SCENARIOS[1]))).toBe("Éch. verticale ×1,6");
  });
});

/**
 * **The peek control's enable/disable predicate** — § 5's *The ×1 floor is its own disclosed badge
 * state* as amended by amendment F, and the user's **decision 4** of 2026-08-14: « re-enable the peek
 * control where the clamp cuts the cable », scoped to the clip amendment F's **cap** produces and to
 * nothing else.
 *
 * The predicate is {@link peekMode}, a pure function of {@link ClampState} — two bits, both of which
 * {@link exaggeration} already computes. It is deliberately **not** a function of
 * {@link VeBadgeState}: § 5's three badge rows are frozen and cannot tell a box clip from a data clip.
 * These cases assert the three modes, the two rows that keep their disabled control, and that the
 * `"fit"` hold does what it is for — put the whole cable back inside the frame.
 */
describe("amendment F, cost 2 — the peek where the cap cuts the cable (décision 4)", () => {
  /** § 5's `k` 3,696 row, at the 2560 × 1440 column amendment F measured: `W_inner` 2224. */
  const boxClipped = veAt(plotAspect(2224), SCENARIOS[1]);

  it("peekMode is a pure function of the clamp state, and total over its four inputs", () => {
    // Two bits in, one of three modes out — no width, no scenario, no badge string.
    expect(peekMode({ clamped: false, clipCause: null })).toBe("true-scale");
    expect(peekMode({ clamped: true, clipCause: null })).toBe("off");
    expect(peekMode({ clamped: true, clipCause: "data" })).toBe("off");
    expect(peekMode({ clamped: true, clipCause: "box" })).toBe("fit");
    // `clamped: false` with a cause is not a state `exaggeration` can produce — a clip implies the
    // clamp — and the predicate still answers rather than falling through.
    expect(peekMode({ clamped: false, clipCause: "box" })).toBe("true-scale");
  });

  it("`peekEnabled` is the mode's own answer, never a second decision", () => {
    for (const wInner of [342, 432, 1104, 1264, 1584, 2224, 3104]) {
      for (const scenario of [...SCENARIOS, DEEP_SLACK]) {
        const ve = veAt(plotAspect(wInner), scenario);
        expect(ve.peek).toBe(peekMode(ve));
        expect(ve.peekEnabled).toBe(ve.peek !== "off");
      }
    }
  });

  it("§ 5's row 1 is untouched: an auto-fit peeks ×1, and says exactly that", () => {
    const auto = veAt(PROFILE_ASPECT, SCENARIOS[1]);
    expect(auto.state).toBe("auto");
    expect(auto.clipCause).toBeNull();
    expect(auto.peek).toBe("true-scale");
    expect(peekBadgeLabel(auto)).toBe("Éch. verticale ×1 — vraie échelle");
  });

  it("§ 5's row 2 keeps its disabled control — nothing is cut, so nothing can be revealed", () => {
    // The interval the ±12 % margin owns: the clamp is in force and the data still fits.
    const ve = exaggeration({ plotAspect: 0.42, xSpan: 220, zDataSpan: 83 });
    expect(ve.state).toBe("true-scale");
    expect(ve.clipCause).toBeNull();
    expect(ve.peek).toBe("off");
    expect(ve.peekEnabled).toBe(false);
  });

  it("the data-reachable clip keeps its disabled control — « mou profond » is unchanged", () => {
    // § 5's own third-row case, cut at **every** legal aspect: the box has nothing to do with it, the
    // cut is the line's own truth, and it arrives with « Câble au sol » (garde −169,67 m). Decision 4
    // does not touch this row, and re-enabling the peek here would show a compression of a line that
    // is already on the ground.
    for (const aspect of [PLOT_ASPECT_BAND.min, PROFILE_ASPECT, PLOT_ASPECT_BAND.max]) {
      const ve = veAt(aspect, DEEP_SLACK);
      expect(ve.state).toBe("true-scale-clipped");
      expect(ve.clipCause).toBe("data");
      expect(ve.peek).toBe("off");
    }
    // And under the cap too: a data clip stays a data clip at any width.
    expect(veAt(plotAspect(2224), DEEP_SLACK).clipCause).toBe("data");
    expect(veAt(plotAspect(2224), DEEP_SLACK).peekEnabled).toBe(false);
  });

  it("the cap's clip is `box`, and it is the one case that re-enables the control", () => {
    // Amendment F's cost 2, on § 5's own `k` 3,696 row at the 2560 × 1440 column: cut here, **whole**
    // at § 5's target aspect — which is the whole distinguishing fact. No ground contact is implied
    // by it, and none is needed for the disclosure to be owed.
    expect(boxClipped.state).toBe("true-scale-clipped");
    expect(boxClipped.clipCause).toBe("box");
    expect(veAt(PROFILE_ASPECT, SCENARIOS[1]).state).toBe("auto");
    expect(boxClipped.peek).toBe("fit");
    expect(boxClipped.peekEnabled).toBe(true);
  });

  it("the `fit` hold puts the whole cable back inside the frame, margin included", () => {
    // What the hold draws is `autofit`, and the identity is what makes it fit: at `autofit` the plot
    // shows the padded domain, i.e. the data span plus § 5's ±12 %. **This is the only drawing in the
    // app below ×1**, and the claim about it is the corrected one (amendment F, cost 2): what
    // `exaggeration` *computes at rest* never goes under ×1 — asserted at the end of this case — and
    // the peek has no Session key and no URL key, so a reload cannot come back here. It is **not** a
    // hold on every path: § 5 gives the control toggle semantics from the keyboard in both pointer
    // modes and under `(pointer: coarse)`, so a ×0,7 *drawing* can stand until the next press. What
    // bounds it is the badge, which names « sous la vraie échelle » in every case, and
    // `chart-block.tsx`, which clears the flag when the mode stops being peekable.
    const xSpan = (1 + 2 * X_MARGIN) * SCENARIOS[1].L;
    const shownAtFit = (plotAspect(2224) * xSpan) / boxClipped.autofit;
    expect(boxClipped.autofit).toBeCloseTo(0.7706, 4);
    expect(boxClipped.autofit).toBeLessThan(1);
    expect(shownAtFit).toBeCloseTo(SCENARIOS[1].zSpan * (1 + 2 * Z_MARGIN), 6);
    expect(shownAtFit).toBeGreaterThan(SCENARIOS[1].zSpan);
    // Against the ×1 frame it replaces, which shows less z than the data has — that is the cut.
    expect(boxClipped.zVisibleSpan).toBeLessThan(SCENARIOS[1].zSpan);
    // The resting drawing is still ×1: the floor is untouched, and the hold is not a new resting VE.
    expect(boxClipped.ve).toBe(1);
  });

  it("the held badge names the compression rather than borrowing the ×1 row's words", () => {
    expect(peekBadgeLabel(boxClipped)).toBe(
      "Éch. verticale ×0,8 — sous la vraie échelle · câble entier",
    );
    // « câble entier » where the resting row reads « câble hors cadre »: the badge describes what is
    // drawn, and the two rows describe two different pictures of the same line.
    expect(veBadgeLabel(boxClipped)).toBe("Éch. verticale ×1 — vraie échelle · câble hors cadre");
    // A `"fit"` factor can never round to « ×0,0 »: the mode requires the line to be whole at 0,42,
    // i.e. `k ≥ 1 / (1,24 × 0,42)` = 1,92, so the factor is bounded below by `plotAspect × 1,92`.
    expect(1 / ((1 + 2 * Z_MARGIN) * PROFILE_ASPECT)).toBeCloseTo(1.92, 2);
    for (const wInner of [1372, 2224, 3104, 5000]) {
      const ve = veAt(plotAspect(wInner), SCENARIOS[1]);
      if (ve.peek !== "fit") continue;
      expect(Number(ve.autofit.toFixed(1))).toBeGreaterThan(0);
    }
  });

  it("the mode's onset is the cap's own, closed-form in the width", () => {
    // `plotAspect × xSpan < zDataSpan` with the cap holding the plot at PROFILE_PLOT_MAX gives
    // `W_inner > PROFILE_PLOT_MAX × xSpan / zDataSpan` — **2125,2** for this row, which is amendment
    // F's `574,96 k` read at its own rounded `k` 3,696 (2125,1). It is a function of the **box**
    // alone, which is the sentence in § 5 the amendment struck.
    const xSpan = (1 + 2 * X_MARGIN) * SCENARIOS[1].L;
    const onset = (PROFILE_PLOT_MAX * xSpan) / SCENARIOS[1].zSpan;
    expect(onset).toBeCloseTo(2125.2, 1);
    expect(onset).toBeCloseTo((1 + 2 * Z_MARGIN) * PROFILE_PLOT_MAX * SCENARIOS[1].k, 0);
    expect(veAt(plotAspect(Math.floor(onset)), SCENARIOS[1]).peek).toBe("off");
    expect(veAt(plotAspect(Math.ceil(onset)), SCENARIOS[1]).peek).toBe("fit");
    // The control's three modes as the column widens, and they arrive in this order: § 5's row-1 peek
    // until the clamp bites (`plotAspect < 1/k`, `W_inner` > 463,68 k = 1713,8), then row 2's disabled
    // control while the ±12 % margin still holds the cable in, then `"fit"` from the clip onset.
    expect(PROFILE_PLOT_MAX * SCENARIOS[1].k).toBeCloseTo(1713.8, 1);
    expect(veAt(plotAspect(1713), SCENARIOS[1]).peek).toBe("true-scale");
    expect(veAt(plotAspect(1714), SCENARIOS[1]).peek).toBe("off");
    // Below § 5's reference column the cap is transparent, so no width can reach `"fit"` there.
    for (const wInner of [342, 432, 1104]) {
      for (const scenario of SCENARIOS) {
        expect(veAt(plotAspect(wInner), scenario).peek).not.toBe("fit");
      }
    }
  });
});

describe("§ 5 — SharedX, one object for both charts", () => {
  it("the domain is [−0,05 L, 1,05 L] — span + 5 %, i.e. 1,1 L wide", () => {
    const scale = createSharedX({ width: 1152, L: 1500 });
    expect(scale.domain).toEqual([-75, 1575]);
    expect(scale.domain[1] - scale.domain[0]).toBeCloseTo(1.1 * 1500, 9);
  });

  it("GUTTER is 24 on both sides, and the plot is exactly W_inner wide", () => {
    for (const width of [390, 480, 1152]) {
      const scale = createSharedX({ width, L: 150 });
      expect(scale.gutter).toBe(24);
      expect(scale.x(scale.domain[0])).toBe(GUTTER);
      expect(scale.x(scale.domain[1])).toBeCloseTo(width - GUTTER, 9);
      // The one number every band height is also a function of — one gutter each side, no second
      // padding anywhere. This is the alignment mechanism, not a margin.
      expect(scale.pxPerM * (scale.domain[1] - scale.domain[0])).toBeCloseTo(innerWidth(width), 9);
    }
  });

  it("both charts get the same object, so the two x axes cannot diverge", () => {
    // The prototype padded the profile {16, 16} against the strip {24, 24}: the axes coincided
    // only at mid-span and diverged to 8 px at each end — 34 m at a 1500 m span, precisely at the
    // anchors, which is where the drag handles go.
    const scale = createSharedX({ width: 390, L: 1500 });
    const profile = scale;
    const strip = scale;
    for (const metres of [-75, 0, 375, 750, 1125, 1500, 1575]) {
      expect(profile.x(metres)).toBe(strip.x(metres));
    }
    // What the retired defect cost, stated so nobody re-introduces it: at 342 px of plot the two
    // pads differ by 8 px at each end, which is this many metres of span.
    const metresPerPx = 1500 / (390 - 48);
    expect(8 * metresPerPx).toBeCloseTo(35, 0);
  });

  it("the inverse round-trips to float precision — one implementation, on the object", () => {
    for (const width of [342, 390, 480, 1152]) {
      for (const L of [50, 150, 1000, 1500]) {
        const scale = createSharedX({ width, L });
        for (const rectLeft of [0, 12.5, 288, 317.75]) {
          for (const t of [0, 0.05, 0.25, 0.5, 0.7431, 1]) {
            const metres = scale.domain[0] + t * (scale.domain[1] - scale.domain[0]);
            expect(scale.toMetres(rectLeft + scale.x(metres), rectLeft)).toBeCloseTo(metres, 9);
          }
        }
      }
    }
  });

  it("the inverse knows domain[0] ≠ 0 — the hand-typed one was wrong by 0,05 L", () => {
    // `(clientX − rect.left − pad.left) / pxPerM` silently assumes the domain starts at zero. At
    // the left gutter the true answer is −0,05 L, i.e. **−75 m at a 1500 m span**.
    const scale = createSharedX({ width: 1152, L: 1500 });
    expect(scale.toMetres(GUTTER, 0)).toBeCloseTo(-75, 9);
    expect(scale.toMetres(GUTTER, 0)).not.toBeCloseTo(0, 3);
  });

  it("a whole-trace import makes the domain exactly the trace", () => {
    // « clamped to the trace extent »: the 5 % margin cannot invent terrain the file does not have.
    const scale = createSharedX({ width: 1152, L: 150, extent: { min: -4, max: 154 } });
    expect(scale.domain).toEqual([-4, 154]);
    // A trace longer than the margin leaves the margin standing.
    const wide = createSharedX({ width: 1152, L: 150, extent: { min: -200, max: 400 } });
    expect(wide.domain).toEqual([-7.5, 157.5]);
  });

  it("the z scale is the x scale times VE — the identity, read forwards", () => {
    const scale = createSharedX({ width: 1152, L: 150 });
    const plotHeight = profilePlotHeight(innerWidth(1152));
    const ve = exaggeration({
      plotAspect: PROFILE_ASPECT,
      xSpan: scale.domain[1] - scale.domain[0],
      zDataSpan: 30,
    });
    const z = createZScale({
      plotTop: 28,
      plotHeight,
      centre: -15,
      pxPerMx: scale.pxPerM,
      ve: ve.ve,
    });
    expect(z.pxPerM / scale.pxPerM).toBeCloseTo(ve.ve, 12);
    // Unclamped, the padded z domain fills the plot exactly — that is what auto-fit *is*.
    expect(z.y(-15 - ve.zVisibleSpan / 2) - z.y(-15 + ve.zVisibleSpan / 2)).toBeCloseTo(
      plotHeight,
      9,
    );
    // Centred: the midpoint of the extent sits at the middle of the plot area, badge lane above.
    expect(z.y(-15)).toBeCloseTo(28 + plotHeight / 2, 9);
    // y grows downward — a higher altitude is a smaller y.
    expect(z.y(0)).toBeLessThan(z.y(-30));
  });

  it("a degenerate span is a caller bug, not a state to render", () => {
    // `station B ≤ station A` is § 4's blocked placement, repaired by `[ Inverser A et B ]`.
    expect(() => createSharedX({ width: 390, L: 0 })).toThrow(RangeError);
    expect(() => createSharedX({ width: 390, L: Number.NaN })).toThrow(RangeError);
  });
});

/**
 * § 5's Handle Lane — « the two anchors move down here, each with a **44 × 48 px** hit target
 * spanning the lane plus the label band, **entirely below the plot area** ».
 *
 * Where those rectangles land on a real screen is `agent-browser`'s (tickets 29 and 30); what is
 * pure is the geometry that makes confusing an anchor with the rider impossible — the target's
 * size, and the fact that it starts where the plot ends.
 */
describe("§ 5 — the anchor targets in the Handle Lane", () => {
  it("44 × 48, and the 48 is the two rows rather than a second number", () => {
    expect(ANCHOR_TARGET.width).toBe(44);
    expect(ANCHOR_TARGET.height).toBe(48);
    expect(ANCHOR_TARGET.height).toBe(PROFILE_CHROME.handleLane + PROFILE_CHROME.xLabels);
    // The coarse-pointer minimum, which the rider's grab circle also meets — voir `.chart-grab`.
    expect(ANCHOR_TARGET.width).toBeGreaterThanOrEqual(44);
  });

  it("entirely below the plot area, at both ends of the domain", () => {
    const x = createSharedX({ width: 390, L: 1000 });
    const plot = { top: PROFILE_CHROME.badge, height: profilePlotHeight(innerWidth(390)) };
    const laneTop = plot.top + plot.height;
    for (const at of [0, 1000]) {
      const target = anchorTarget(x.x(at), laneTop);
      expect(target.y).toBe(laneTop);
      expect(target.y).toBeGreaterThanOrEqual(plot.top + plot.height);
      // …and it does not reach back up into the plot, which is the collision the lane retires.
      expect(target.y + target.height).toBe(laneTop + ANCHOR_TARGET.height);
    }
  });

  it("centred on the anchor, which is why the two never overlap at 390 px", () => {
    const x = createSharedX({ width: 390, L: 1000 });
    const a = anchorTarget(x.x(0), 200);
    const b = anchorTarget(x.x(1000), 200);
    expect(a.x + a.width / 2).toBeCloseTo(x.x(0), 9);
    expect(b.x + b.width / 2).toBeCloseTo(x.x(1000), 9);
    // 342 px of inner width against two 44 px targets: they clear each other by 298 px, and § 5's
    // « 44 px covers the first and last 12 % of the span » is exactly this ratio.
    expect(b.x - (a.x + a.width)).toBeGreaterThan(0);
    expect(ANCHOR_TARGET.width / innerWidth(390)).toBeCloseTo(0.1287, 4);
  });
});

/**
 * Ticket 39 — the clearance strip's y domain. Three claims, none of which a screenshot can settle:
 * the ladder is discrete, the negative band is always reserved, and the empty case has axes.
 *
 * The pixel mapping stays in `strip.tsx` (only it knows its own height); what is pinned here is the
 * domain the mapping is built from, and the labels that disclose it.
 */
describe("ticket 39 — the clearance strip's quantised y domain", () => {
  it("the first-run traverse gets step 2, top 6 and a reserved floor at −2", () => {
    // `h_min` 2,4399 and the two local maxima 5,1773 / 5,2746 — the ticket's own measured table.
    const domain = clearanceDomain({
      values: [3.9025, 5.1773, 2.4399, 5.2746, 3.9032],
      wide: true,
    });
    expect(domain).toStrictEqual({
      step: 2,
      top: 6,
      floor: -2,
      ticks: [6, 3],
      empty: false,
    });
    // Zero's height in the band is a function of the grid alone — `−floor / (top − floor)` — so it
    // is the same pixel for every healthy scenario that lands on this step.
    expect(-domain.floor / (domain.top - domain.floor)).toBeCloseTo(0.25, 9);
  });

  it("the axis changes in discrete jumps, not on every keystroke", () => {
    // Four gardes spread over 0,4 m of worst-case: one grid, one picture, one set of labels.
    const grids = [5.0, 5.27, 5.4, 5.99].map((hi) => clearanceDomain({ values: [hi], wide: true }));
    for (const grid of grids)
      expect({ step: grid.step, top: grid.top }).toStrictEqual({
        step: 2,
        top: 6,
      });
    // And it *does* move when the scenario really is a different size — the failure the old
    // auto-fit had was that two scenarios differing by a factor of four drew the same picture.
    expect(clearanceDomain({ values: [1.3], wide: true })).toMatchObject({ step: 0.5, top: 1.5 });
    expect(clearanceDomain({ values: [21], wide: true })).toMatchObject({ step: 10, top: 30 });
    expect(clearanceDomain({ values: [40.5], wide: true })).toMatchObject({ step: 20, top: 60 });
  });

  it("the negative band is reserved before anything violates, and labelled only after", () => {
    const healthy = clearanceDomain({ values: [5.27, 2.44], wide: true });
    expect(healthy.floor).toBe(-2);
    expect(healthy.ticks).not.toContain(healthy.floor);

    // One step into violation: the same grid, the same zero pixel, and now a floor label.
    const violating = clearanceDomain({ values: [5.27, -0.4], wide: true });
    expect({ step: violating.step, top: violating.top, floor: violating.floor }).toStrictEqual({
      step: 2,
      top: 6,
      floor: -2,
    });
    expect(violating.ticks).toStrictEqual([6, 3, -2]);
  });

  it("a violation deeper than the band extends the floor in whole steps", () => {
    // `contact: "rider"` — anchors A 12 / B 6 at flèche 6,0 ⇒ garde −1,53 m (spec § 15).
    expect(clearanceDomain({ values: [4.0, -1.53], wide: true }).floor).toBe(-2);
    // `contact: "cable"` — `L₀` 400 m on a 200 m span ⇒ −169,67 m, and nothing positive to scale
    // from: the ladder sizes on the whole excursion, so the grid stays readable and the reserved
    // positive side is one step — the drawing's message there is « the line is under the ground »,
    // and the curve sits in the bottom quarter where that reads.
    const drowned = clearanceDomain({ values: [-169.67], wide: true });
    expect({ step: drowned.step, top: drowned.top, floor: drowned.floor }).toStrictEqual({
      step: 100,
      top: 100,
      floor: -200,
    });
  });

  it("no curve at all still has axes — the strip's own rule, in numbers", () => {
    for (const values of [[], [Number.NaN]]) {
      const domain = clearanceDomain({ values, wide: true });
      expect(domain).toStrictEqual({
        step: CLEARANCE_EMPTY.step,
        top: CLEARANCE_EMPTY.top,
        floor: -CLEARANCE_EMPTY.step,
        ticks: [4, 2],
        empty: true,
      });
    }
    // Narrow drops the mid tick and nothing else — the same B1 threshold the caption shortens at.
    expect(clearanceDomain({ values: [], wide: false }).ticks).toStrictEqual([4]);
    expect(clearanceDomain({ values: [5.27], wide: false }).ticks).toStrictEqual([6]);
    // …but a violation is labelled at every width: the floor is the news, not a nicety.
    expect(clearanceDomain({ values: [5.27, -0.4], wide: false }).ticks).toStrictEqual([6, -2]);
  });

  it("the ticks are round, carry the unit on the top one only, and are never formatValue", () => {
    expect(clearanceTickLabel(6, true)).toBe("6 m");
    expect(clearanceTickLabel(3, false)).toBe("3");
    expect(clearanceTickLabel(-2, false)).toBe("−2");
    // A 2,5 grid — `hi / 3` lands on the ladder's 2,5 nowhere, but 0,5 and 0,05 steps do exist on
    // small spans, and half of an odd top is one decimal rather than two.
    expect(clearanceTickLabel(0.75, false)).toBe("0,75");
    expect(clearanceTickLabel(1.5, true)).toBe("1,5 m");
    // The minus is U+2212, the same glyph the app's numbers use, and never a hyphen.
    expect(clearanceTickLabel(-200, false)).not.toContain("-");
    // The point of the whole exercise: two decimals would have printed « 6,00 ».
    expect(formatValue("clearance", 6)).toBe("6,00");
    expect(clearanceTickLabel(6, false)).toBe("6");
  });
});

/**
 * The invariant this module opens on, enforced rather than restated:
 *
 * > **no chart dimension may read the window height**, and no `useMediaQuery` branch appears
 * > anywhere in the layout.
 *
 * A `node` suite cannot see a layout, but it can read the source that produces one, and these are
 * the two regressions that would be invisible everywhere else: a band sized from `100dvh`, and a
 * viewport read that turns into a second React tree. Both were **measured defects** in the
 * prototype — `flex-[3]`/`flex-1` is how ×5,02 happened — so they are guarded here rather than
 * trusted to review.
 */
describe("§ 5 — the two mechanisms the layout may not use", () => {
  const ROOT = fileURLToPath(new URL("../../..", import.meta.url));

  /**
   * Every source file the app ships, tests excluded.
   *
   * The `-prototype` skip **outlives the prototype on purpose** (ticket 36 deleted it): it costs one
   * line, and without it a directory reintroduced under that name would be silently unscanned by
   * every prohibition below — the failure mode being that the guards keep passing while the thing
   * they guard walks back in.
   */
  function sources(directory: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(join(ROOT, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.name.startsWith("-prototype")) continue;
      if (entry.isDirectory()) out.push(...sources(path));
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts")) out.push(path);
    }
    return out;
  }

  const FILES = sources("src").filter((path) => !path.endsWith("routeTree.gen.ts"));
  const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

  it("reads the app's own sources, so a green run means something", () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES).toContain("src/components/app/shell.tsx");
    expect(FILES).toContain("src/components/chart/profile.tsx");
  });

  it("no `useMediaQuery` branch exists anywhere", () => {
    // The call, not the word: every one of these files *discusses* `useMediaQuery`, because the
    // reason it is absent is the argument for the CSS the layout uses instead.
    for (const path of FILES) {
      expect({ path, hit: /useMediaQuery\s*\(/.test(read(path)) }).toStrictEqual({
        path,
        hit: false,
      });
    }
  });

  it("`matchMedia` is read at the event, in the one place that has one", () => {
    // § 5's peek control reads `(pointer: coarse)` inside a pointer handler — a render-time media
    // read is the branch the rule above forbids, and a handler only ever runs on the client.
    const callers = FILES.filter((path) => /matchMedia\s*\(/.test(read(path)));
    expect(callers).toStrictEqual(["src/components/chart/view-strip.tsx"]);
  });

  it("one file reads a window height, and it is the viewport hook", () => {
    // The receiver is part of the pattern on purpose: three files *argue* about `visualViewport` in
    // prose — the mechanism is why the rest of the layout can ignore it — and only one calls it.
    const readers = FILES.filter((path) =>
      /window\.(innerHeight|outerHeight|visualViewport)|screen\.height/.test(read(path)),
    );
    expect(readers).toStrictEqual(["src/components/app/use-viewport.ts"]);
  });

  it("no chart band is sized from a viewport height, in any spelling", () => {
    // `h-dvh` on the shell is the fixed box § 5 asks for. Inside the Chart Block and in the contract
    // itself every height is `var(--w-inner)`-derived, so here the bar is the whole vocabulary: no
    // `vh` unit, and no window height even mentioned.
    const banded = [
      ...FILES.filter((path) => path.startsWith("src/components/chart/")),
      "src/lib/layout/contract.ts",
      "src/lib/layout/collapse.ts",
    ];
    for (const path of banded) {
      expect({
        path,
        hit: /\d*\.?\d+(dvh|svh|lvh|vh)\b|innerHeight|visualViewport/.test(read(path)),
      }).toStrictEqual({ path, hit: false });
    }
  });

  it("the banner slot reserves § 5's row for its width, at `bannerBudget`'s own two thresholds", () => {
    // Ticket 29's défaut 1, guarded: a flat `min-height: 44px` on the slot rendered **44 / 44 / 56**
    // px at one, two and three lines, so budget A summed to 507,6 against 540 and budget B to 545,4
    // against 561, and the term (c) spends over-stated the block by 16–20 px. The heights themselves
    // are a browser measurement (amendment B, ticket 29), but *which constants the rendered side
    // spends, and at which thresholds*, is source — and that is what regressed.
    const shell = read("src/components/app/shell.tsx");
    // One `min-height`, reading one variable, so `compact:min-h-0` keeps winning the 44 px row.
    expect(shell).toContain("min-h-[var(--banner)]");
    // The three rows are `BANNER`'s, never literal pixels in a class string.
    expect(shell).toContain('"--banner": `${BANNER.oneLine}px`');
    expect(shell).toContain('"--banner-two-lines": `${BANNER.twoLines}px`');
    expect(shell).toContain('"--banner-three-lines": `${BANNER.threeLines}px`');
    // And the two container queries are B1 and the column B2 produces — **no third breakpoint**.
    // Tailwind emits `@max-[N]` as `(width < N)` and `@min-[N]` as `(width >= N)`, which is exactly
    // where `bannerBudget` steps, so the rendered band and (c)'s term cannot disagree by a pixel.
    const twoLines = `@min-[${RAIL_REFLOW_PX - RAIL_WIDTH}px]:@max-[${CELL_WRAP_PX}px]:[--banner:var(--banner-two-lines)]`;
    expect(shell).toContain(twoLines);
    expect(shell).toContain(
      `@max-[${RAIL_REFLOW_PX - RAIL_WIDTH}px]:[--banner:var(--banner-three-lines)]`,
    );
    expect(bannerBudget(RAIL_REFLOW_PX - RAIL_WIDTH - 1)).toBe(BANNER.threeLines);
    expect(bannerBudget(RAIL_REFLOW_PX - RAIL_WIDTH)).toBe(BANNER.twoLines);
    expect(bannerBudget(CELL_WRAP_PX - 1)).toBe(BANNER.twoLines);
    expect(bannerBudget(CELL_WRAP_PX)).toBe(BANNER.oneLine);
  });

  it("the Rail spends `--kb` twice, so `block: 'center'` cannot centre behind the keyboard", () => {
    // Ticket 35's defect 1, guarded. § 5's piece 2 *pads* the Rail by the inset rather than
    // shrinking it, so the box piece 3 centres in still spans the whole screen under the fallback:
    // measured at 390 × 664 with a 336 px inset, `#rail-mp` landed at y 361,5–389,5 against a
    // visible bottom of **328**, and with the scroll padding at y 193,5–221,5. The pixels are a
    // browser measurement (amendment B); *that the same inset reaches the scroller's optimal
    // viewing region and not only its content* is source, and that is what regressed.
    const shell = read("src/components/app/shell.tsx");
    // **Read as a set of class tokens, not as a substring of a sorted list.** The earlier form
    // pinned two tokens with a leading space on the one line that also held `className=` — which
    // coupled this guard to `oxfmt`'s class ordering *and* to the list staying on one line, and it
    // had already been rewritten once for exactly that. Splitting the Rail's own class list on
    // whitespace makes the assertion say what the contract says — « the inset is spent on the
    // scroller's content **and** on its viewing region » — and leaves the formatter free to order
    // and wrap however it likes. It also cannot be satisfied by the two tokens being *discussed*
    // in the doc comment above the element, which a whole-file match is.
    const railClass = /className="([^"]*overflow-y-auto[^"]*)"/.exec(shell)?.[1] ?? "";
    const tokens = new Set(railClass.split(/\s+/));
    expect({
      padding: tokens.has("pb-[var(--kb,0px)]"),
      scrollPadding: tokens.has("scroll-pb-[var(--kb,0px)]"),
    }).toStrictEqual({ padding: true, scrollPadding: true });
    // And no second scroll mechanism was added to pay for it: piece 3 is still one centring call
    // with `behavior` left at `auto`, and the Rail's own scroll is still nobody's to set.
    expect(shell).toContain("target.scrollIntoView(CENTRE_IN_RAIL)");
    // An *assignment*, not the read trigger (a) makes: `scrollTop === 0` is how the Rail publishes
    // where its scroller sits, and it stays.
    expect(/scrollTop\s*=[^=]/.test(shell)).toBe(false);
    expect(shell).not.toContain('behavior: "smooth"');
  });

  it("nothing branches on orientation — the posture the app says nothing about", () => {
    // § 5 refuses a rotate prompt, an orientation lock and a hint; landscape reaches the Pinned
    // Safety Header through collapse condition (c) alone. `styles.css` is in scope because a
    // `@media (orientation: …)` there would be the same rule, one layer down.
    for (const path of [...FILES, "src/styles.css"]) {
      expect({
        path,
        hit: /\(orientation\s*:|screen\.orientation|orientationchange/.test(read(path)),
      }).toStrictEqual({ path, hit: false });
    }
  });
});
