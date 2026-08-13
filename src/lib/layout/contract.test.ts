/**
 * § 5's three pixel budgets, each of which sums to its viewport. The rows asserted here are the
 * ones the **Skeleton** renders (A7); A8 adds VE, `SharedX` and the ×1 floor against the same
 * constants.
 *
 * The budgets are the spec's own table, so they are a fixture, not this module's output: if
 * `PROFILE_ASPECT` or the strip clamp moves, the three viewports stop summing and these fail.
 */

import { describe, expect, it } from "vitest";

import {
  cellRows,
  createSharedX,
  createZScale,
  exaggeration,
  GUTTER,
  innerWidth,
  PLOT_ASPECT_BAND,
  profileOuterHeight,
  profilePlotHeight,
  PROFILE_ASPECT,
  STRIP,
  STRIP_POLICY_BAND,
  stripOuterHeight,
  VE_BAND,
  veBadgeLabel,
  X_MARGIN,
  Z_MARGIN,
} from "./contract.ts";

/** § 5, *The three pixel budgets, each summing to the viewport*. */
const BUDGETS = [
  { name: "A · 390×664", column: 390, wInner: 342, plot: 144, profile: 220, strip: 96, rows: 2 },
  { name: "B · 768×1024", column: 480, wInner: 432, plot: 181, profile: 257, strip: 96, rows: 2 },
  {
    name: "C · 1440×900",
    column: 1152,
    wInner: 1104,
    plot: 464,
    profile: 540,
    strip: 177,
    rows: 1,
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
    });
  }

  it("the strip floor is 96 px, not the 72 px policy floor", () => {
    expect(stripOuterHeight(0)).toBe(96);
  });

  it("the strip ceiling is 200 px — the over-feeding it exists to bound", () => {
    expect(stripOuterHeight(10_000)).toBe(200);
  });

  it("B1 is exactly 600 px of chart column, not 601", () => {
    expect(cellRows(600)).toBe(1);
    expect(cellRows(599)).toBe(2);
  });

  it("the aspect is the same at every width — the invariant, stated as a test", () => {
    for (const wInner of [53, 342, 432, 1104, 4000]) {
      expect(profilePlotHeight(wInner) / wInner).toBeCloseTo(PROFILE_ASPECT, 12);
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
