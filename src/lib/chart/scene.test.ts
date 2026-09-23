/**
 * The Chart Block's scene — « v1 build spec » § 5 and § 11. `node`, no DOM: every question here is
 * arithmetic over one Scenario, which is the whole reason the derivation is a module and not a hook
 * body (amendment A).
 *
 * Two provenance classes, kept apart as `docs/conventions/testing.md` requires. § 9's opening
 * screen and the two clearance failures are **`[MEASURED]`** rows — the first-run lock owns their
 * strings, and what is asserted here is that the *scene* reproduces them through the same chain.
 * Everything else is structural: a band is a set of rider positions, a domain clamps to a trace, a
 * draft with blanks has no picture.
 */

import { describe, expect, it } from "vitest";

import type { Scenario, ScenarioDraft } from "@/lib/scenario/types.ts";
import type { SweepResult, SweepStep } from "@/lib/sim";
import type { Trace } from "@/lib/terrain/trace.ts";

import { formatQuantity } from "@/lib/format/quantity.ts";
import { exaggeration, PLOT_ASPECT_BAND, PROFILE_ASPECT, VE_BAND } from "@/lib/layout/contract.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";
import { CLEARANCE, evaluateClearance } from "@/lib/sim";

import {
  buildScene,
  buildSceneBase,
  buildSceneFrame,
  clampToSpan,
  placeRider,
  polylineAt,
  sceneInputs,
  snapToStep,
  trajectoryRuns,
} from "./scene.ts";

/** A scene that must exist — the `null` arm is « Aucun résultat », and these cases are not it. */
function scene(scenario: ScenarioDraft, trace: Trace | null = null) {
  const built = buildScene({ scenario, trace });
  if (built === null) throw new Error("expected a drawable scene");
  return built;
}

/** The scene's auto-fit at the elected plot aspect — `VE = 0,42 × (x span / z span)`. */
function veOf(built: ReturnType<typeof scene>, plotAspect = PROFILE_ASPECT) {
  return exaggeration({
    plotAspect,
    xSpan: built.domain[1] - built.domain[0],
    zDataSpan: built.zExtent.max - built.zExtent.min,
  });
}

/** § 9's shipped line, and the app's first paint. */
const first = scene(firstRunDefaults());

describe("the first-run scene — § 9's opening screen, drawn", () => {
  it("carries § 9's span and the shared domain, span + 5 % each side", () => {
    expect(first.L).toBe(150);
    expect(first.h).toBe(-18);
    expect(first.domain).toEqual([-7.5, 157.5]);
    // Manual mode has no trace, so nothing clamps the margin.
    expect(first.extent).toBeNull();
  });

  it("reproduces the locked garde: 2,42 m at x 74,4 m, contact « none »", () => {
    // Re-recorded under ticket 37 defect 1 — 2,442178 m at x 74,1170 m before §11's scan evaluated
    // the rider's own kink, so the shipped read-out moved **23,06 mm down**, the conservative
    // direction, and the worst point moved 0,314 m along the line.
    expect(formatQuantity("clearance", first.clearance.hMin)).toBe("2,42 m");
    expect(formatQuantity("extremumX", first.clearance.atX)).toBe("74,4 m");
    expect(first.clearance.contact).toBe("none");
    expect(first.traverse.grid.length).toBe(260);
    expect(first.traverse.coverage).toBe(1);
  });

  it("has no violating band, so signals 3 and 4 are both silent", () => {
    // The bands **self-hide** — they are never chrome.
    expect(first.violating).toEqual([]);
    expect(first.rider.inViolation).toBe(false);
  });

  it("places the rider by exact solve at the typed x, not by snapping to a step", () => {
    // § 5: « the field reads back exactly what was typed and the drawn cable is the true state
    // there ». 99,7 snapped to 101,2 and rewritten would discard user input silently.
    // §5.3's own metre tolerance is what « exact » means here: 1×10⁻⁶ m, not float equality.
    expect(first.rider.step.xD).toBeCloseTo(75, 5);
    // And it is genuinely off-grid: the 260-step grid has no node at exactly 75,0 m.
    const snapped = snapToStep(first.traverse, 75);
    expect(snapped).not.toBe(null);
    expect(snapped).not.toBe(75);
  });

  it("reads « Garde min. ligne » plainly on first paint — the cell does not relabel itself", () => {
    // Inside `max(1 m, 1 % de la portée)`, which is *why* the shipped rider sits at `L/2`. Since
    // ticket 37 the rider's own inner minimum **is** its node, 0,000 m away against 0,9 m before,
    // so the margin the bit is holding is the whole 1,5 m.
    expect(first.rider.relabel).toBe(false);
    expect(Math.abs(first.rider.worst.atX - first.rider.step.xD)).toBeLessThan(1);
  });

  it("the Position-scope garde is the rider's own minimum, not the traverse's", () => {
    // The two scopes are two reductions — `ligne` over `x` at one `x_P`, `traversée` over `x_P` —
    // which is why the read-out row carries its own « à la position du passager » label against the
    // Rail's « sur toute la traversée ». § 5 quotes ≈2,49 against 2,44 off the prototype; what
    // binds here is the **relation**, and since ticket 37 put `s_D` in the scan the two are
    // **0,32 mm** apart on the opening screen and print the same string. The labels are about
    // scope, not about the digits: the relation is what a sign slip would break.
    expect(first.rider.worst.hClear).toBeGreaterThan(first.clearance.hMin);
    expect(first.rider.worst.hClear).toBeLessThan(first.clearance.hMin + 0.01);
    expect(formatQuantity("clearance", first.rider.worst.hClear)).toBe("2,42 m");
  });

  it("auto-fits inside the published band, clear of the ×1 floor", () => {
    const ve = veOf(first);
    expect(ve.state).toBe("auto");
    expect(ve.clamped).toBe(false);
    expect(ve.peekEnabled).toBe(true);
    expect(ve.ve).toBeGreaterThan(VE_BAND.min);
    expect(Number(ve.ve.toFixed(1))).toBeLessThanOrEqual(VE_BAND.max);
    // At every legal aspect, not only at the elected one — the guard, not the rule.
    for (const aspect of [PLOT_ASPECT_BAND.min, PLOT_ASPECT_BAND.max]) {
      expect(veOf(first, aspect).clamped).toBe(false);
    }
  });

  it("the auto-fit does not move when the rider does", () => {
    // A scale that followed the rider would rescale the plot mid-drag. The z extent is the
    // traverse's envelope, so scrubbing changes nothing.
    const elsewhere = scene({
      ...firstRunDefaults(),
      rider: { ...firstRunDefaults().rider, xD: 12 },
    });
    expect(elsewhere.zExtent).toEqual(first.zExtent);
    expect(veOf(elsewhere).ve).toBe(veOf(first).ve);
  });

  it("draws the manual ground across the whole domain, ends held", () => {
    // `zGroundAt` holds the ends rather than extrapolating; the drawn ground says the same thing.
    const { xs, zs } = first.ground;
    expect([...xs]).toEqual([-7.5, 0, 150, 157.5]);
    expect(zs[0]).toBe(zs[1]);
    expect(zs[2]).toBe(zs[3]);
    // Anchor A's base is 12 m under its top; B's is 18 m lower still.
    expect(zs[0]).toBe(-12);
    expect(zs[3]).toBe(-30);
  });

  it("regenerates both polylines rather than storing one on a result", () => {
    // « No polyline is ever stored in a result object » — the cable is `sampleCable(state, n)` at
    // render time, and the `SpanState` the engine returned carries no such field.
    expect(first.rider.cable.xs.length).toBe(first.unloadedCable.xs.length);
    expect(Object.keys(first.unloaded)).not.toContain("polyline");
    // The loaded line hangs below the unloaded one at mid-span — the toggle's whole point.
    const mid = Math.floor(first.rider.cable.zs.length / 2);
    expect(first.rider.cable.zs[mid]).toBeLessThan(first.unloadedCable.zs[mid]);
  });
});

describe("clearance failure — the four signals' inputs", () => {
  /**
   * `[MEASURED]` ticket 37 §1 — « hauteurs 12/6, flèche 6,0 ⇒ −1,55 m », on a 200 m span at `h`
   * −25 m. The engine's own fixture for it lives in `src/lib/sim/__fixtures__/`, which app code may
   * not reach behind the barrel; what is checked here is that the **scene** lands on the same
   * number through the app's own chain.
   */
  const rider = scene(riderContact());

  it("« Enveloppe passager traversée » — the verdict that is true only given h_rider", () => {
    expect(rider.clearance.contact).toBe("rider");
    expect(rider.clearance.hMin).toBeCloseTo(-1.55, 2);
    // The traverse solves whole; only the clearance fails. « Câble au sol » would be a different
    // claim, and the two are separate verdicts because only this one depends on `h_rider`.
    expect(rider.traverse.coverage).toBe(1);
  });

  it("signal 3 covers the violating rider positions, not the x of the worst point", () => {
    expect(rider.violating.length).toBeGreaterThan(0);
    const covered = rider.violating.some(
      (band) => band.from <= rider.clearance.atX && rider.clearance.atX <= band.to,
    );
    expect(covered).toBe(true);
    // The band is a set of rider positions and the worst point is one x: they are different
    // questions, and the band is strictly wider than the single value the prototype used.
    const width = rider.violating.reduce((sum, band) => sum + (band.to - band.from), 0);
    expect(width).toBeGreaterThan(0);
    for (const band of rider.violating) expect(band.to).toBeGreaterThanOrEqual(band.from);
  });

  it("signal 4 fires only while the rider is inside a band", () => {
    const inside = rider.violating[0];
    const middle = (inside.from + inside.to) / 2;
    const there = scene({ ...riderContact(), rider: { ...riderContact().rider, xD: middle } });
    expect(there.rider.inViolation).toBe(true);

    // At an anchor the rider is out of the zone, and « this design fails » still holds — the two
    // states stay separable, which is the whole reason cable-red is reserved for signal 4.
    const atAnchor = scene({ ...riderContact(), rider: { ...riderContact().rider, xD: 0 } });
    expect(atAnchor.rider.inViolation).toBe(false);
    expect(atAnchor.violating.length).toBeGreaterThan(0);
  });

  it("« Câble au sol » is the outer verdict — L₀ 400 m on a 200 m span", () => {
    // `[MEASURED]` ticket 37 §1, re-taken from ticket 14 §1's −169,67 m: garde −170,24 m. This is
    // the row the rider node moved furthest — 0,57 m, down — because 200 m of slack drops the
    // kink's corner far below the chord its two neighbours span. § 5's « mou profond » line.
    const slack = scene(deepSlack());
    expect(slack.clearance.contact).toBe("cable");
    expect(slack.clearance.hMin).toBeCloseTo(-170.24, 1);
  });
});

/**
 * Ticket 41 — the two clearances, and which of them is a criterion.
 *
 * `worst` is §11's inner minimum over the whole line at this rider position: the strip's curve, the
 * read-out cell, the deficit fill and the zero crossing. `underRider` is the garde under the
 * passenger's own feet, drawn by `profile.tsx` and judged by nothing. The reported symptom was the
 * two being confused, so what is pinned here is that they are **different numbers with a fixed
 * ordering**, and that the bit which gates the drawing fires exactly where they diverge.
 */
/** Ticket 39's own textile line: the shipped span on HMPE, `MBL` 100 kN, `μ` 0,113. */
const ticket39Textile: ScenarioDraft = {
  ...firstRunDefaults(),
  usage: "TEMPORAIRE",
  material: { ...FIRST_RUN_RETAINED_TEXTILE.spec, MBL: 100_000, mu: 0.113 },
  terminations: FIRST_RUN_RETAINED_TEXTILE.terminations,
};

describe("ticket 41 — the line's minimum against the garde under the passenger", () => {
  /** The solved half a rider is placed on — the `null` arm is « Aucun résultat », not these cases. */
  function solved(scenario: ScenarioDraft) {
    const built = buildSceneBase(sceneInputs(scenario, null));
    if (built === null) throw new Error("expected a solvable base");
    return built;
  }

  const base = solved(firstRunDefaults());
  /** Ticket 41's scenario **B** — « ancrage d'arrivée à 20 m », the reported line. */
  const tall = solved({ ...firstRunDefaults(), anchors: { zA: 12, zB: 20 } });

  function at(from: ReturnType<typeof solved>, xD: number) {
    const placed = placeRider(from, xD);
    if (placed === null) throw new Error(`expected a rider at x_D ${xD}`);
    return placed;
  }

  it("at an anchor the passenger's garde is that anchor's own height, less h_rider", () => {
    // The frame check that makes every other figure here readable: at `x_D` 0 the trolley sits on
    // anchor A's top, so the garde under it is `z_A − h_rider` exactly and depends on no solve at
    // all. It is also the sharpest form of the reported symptom — the passenger arrives 17,90 m
    // above the ground while the curve beneath them reads 7,22.
    expect(at(base, 0).underRider).toBeCloseTo(12 - 2.1, 5);
    expect(at(base, 150).underRider).toBeCloseTo(12 - 2.1, 5);
    expect(at(tall, 150).underRider).toBeCloseTo(20 - 2.1, 4);
    expect(formatQuantity("clearance", at(tall, 150).underRider)).toBe("17,90 m");
    // And the curve there is the *unloaded line's* own minimum, 74 m away — ticket 39's measurement,
    // reached through `placeRider` rather than through the sweep.
    expect(formatQuantity("clearance", at(tall, 150).worst.hClear)).toBe("7,22 m");
    // `atX` is a **position of a scanned extremum**, so `testing.md`'s bar for it is absolute at
    // **2× the sample spacing** — `L₀ / CLEARANCE.samplesPerStep` — and not the value's own digits.
    // Measured 49,28 m; asserting that to two decimals would claim a resolution the scan grid does
    // not have. What the case needs anyway is that it is nowhere near the rider at `x_D` 150.
    const spacing = tall.span.L0 / CLEARANCE.samplesPerStep;
    expect(Math.abs(at(tall, 150).worst.atX - 49.28)).toBeLessThan(2 * spacing);
    expect(at(tall, 150).step.xD - at(tall, 150).worst.atX).toBeGreaterThan(100);
  });

  it("the two coincide on the shipped screen — ticket 37 item 1, from the chart", () => {
    // `underRider ≥ worst.hClear` is the true ordering — the garde under the rider is `h_clear` at
    // `x = x_D`, one candidate in the inner minimum. The shipped scan used to report it **65 mm the
    // other way** (2,48 m against 2,42 m, an excess of 0,06455 m), because its 60 uniform samples
    // in `s` never landed on the trolley kink, the loaded catenary's own low point. Ticket 37
    // defect 1 forced `s_D` into the sample set: at `x_D` 75 the inner minimum now *is* the rider's
    // node, so the two are equal **to the bit** and the ordering is no longer violated at all.
    const here = at(base, 75);
    expect(formatQuantity("clearance", here.worst.hClear)).toBe("2,42 m");
    expect(formatQuantity("clearance", here.underRider)).toBe("2,42 m");
    // `toBeCloseTo`, not `toBe`: the two are computed by different paths — this one from
    // `clearance.ts`'s `zAt(shape, s_D)`, `underRider` from `scene.ts`'s `step.zD` — and the claim
    // is that they agree, not that two float expressions happen to reassociate identically.
    expect(here.worst.hClear).toBeCloseTo(here.underRider, 12);
    expect(Math.abs(here.worst.atX - here.step.xD)).toBeLessThan(1e-5);
  });

  it("the ordering holds over the whole traverse, to the scan's own error", () => {
    // **`worst.hClear ≤ underRider` is the invariant** — the inner minimum cannot exceed one of its
    // own candidates — and the bound is the scan's error, not zero, because its 60 uniform samples in
    // `s` never land on the trolley kink. This is the guard against a wrong `underRider`: a sign slip,
    // a missing `h_rider` or the drawn ground read instead of the engine's all leave the excess in
    // metres. **One-sided on purpose.** The other direction is physical and unbounded — a rider at an
    // anchor has 5,995 m more under their feet than the line's worst point on the first-run scenario —
    // so `Math.abs` here would assert that legitimate gap away.
    //
    // Ticket 37's fix drove the excess to **zero**: it was 99,3 mm at ancrages 12 / 20 (`x_D`
    // 40,01) and 88,5 mm on the first-run line (`x_D` 65,01), and both re-measure at 0,000 mm over
    // all 260 steps, because the rider's node is a sample of the inner minimum now. The bound stays
    // stated as a bound rather than tightened onto that zero — the scan's error is the contract.
    //
    // Ticket 39 item 5 re-measured the same zero on the textile line and on the three imported
    // profiles. The textile one joins the loop here, since it needs no fixture; the imported three
    // stay a measurement in the ticket, because reading `docs/references/` to re-assert a bound this
    // case already carries would buy coverage of the loop, not of the claim.
    for (const from of [base, solved(ticket39Textile), tall]) {
      let excess = 0;
      let gap = 0;
      for (const step of from.traverse.steps) {
        const placed = placeRider(from, step.xD);
        if (placed === null) continue;
        excess = Math.max(excess, placed.worst.hClear - placed.underRider);
        gap = Math.max(gap, placed.underRider - placed.worst.hClear);
      }
      expect(excess).toBeLessThan(0.1);
      // And the legitimate direction is really there — metres of it, which is the whole reason the
      // profile draws the second dimension at all.
      expect(gap).toBeGreaterThan(1);
    }
  });

  it("`relabel` gates the second dimension line, and fires where the two diverge", () => {
    // Inside `max(1 m, 1 % de la portée)` the two dimensions coincide and one stroke is the whole
    // truth; past it the profile draws a second one at `x_D` and the cell says « (à x 49 m) ». One
    // bit, so the drawing and the label cannot disagree.
    const middle = at(tall, 75);
    expect(middle.relabel).toBe(false);
    expect(Math.abs(middle.underRider - middle.worst.hClear)).toBeLessThan(0.1);

    const tailEnd = at(tall, 148.84);
    expect(tailEnd.relabel).toBe(true);
    // 101,9 m of separation at the extreme; 9,476 m between the two numbers here.
    expect(Math.abs(tailEnd.worst.atX - tailEnd.step.xD)).toBeGreaterThan(100);
    expect(tailEnd.underRider - tailEnd.worst.hClear).toBeCloseTo(9.476, 2);
  });
});

/**
 * Ticket 39 item 5 — **the strip's curve is the shape, not the scan.**
 *
 * The reported symptom was a curve visibly rougher than the W it draws: 55 direction reversals on
 * the first-run traverse and 79 on the textile line, worst adjacent step 43,1 / 63,7 mm, under a
 * read-out printing two decimals. A W has **three** — two flank maxima and one interior minimum —
 * so 55 was the scan's noise on top of the shape, not the shape. It was §11's scan missing the trolley kink — ticket 37
 * item 1 — and what is pinned here is the closure, at the one place the curve is data: the same
 * traverse re-scanned at **ten times the resolution** must draw the same picture.
 *
 * `perStep` **is** what `strip.tsx` plots, and `perStepX` is where `profile.tsx` stands its clearance
 * dimension, so both live here rather than in `clearance.test.ts`: the claim is about the drawing.
 */
describe("ticket 39 item 5 — the curve against a ten-times-finer scan", () => {
  /**
   * Direction reversals along the drawn curve — the measure the symptom was reported in. Equal
   * consecutive values carry no direction and are skipped, so a flat run is not a reversal.
   */
  function reversals(values: Float64Array): number {
    let count = 0;
    let previous = 0;
    for (let i = 1; i < values.length; i++) {
      const delta = values[i] - values[i - 1];
      if (delta === 0) continue;
      if (previous !== 0 && Math.sign(delta) !== previous) count++;
      previous = Math.sign(delta);
    }
    return count;
  }

  /** The same traverse, re-reduced at `samplesPerStep` × 10 — the reference the curve is judged by. */
  function fine(built: ReturnType<typeof scene>) {
    return evaluateClearance(
      built.span,
      built.P,
      built.traverse.steps,
      built.terrain,
      built.hRider,
      10 * CLEARANCE.samplesPerStep,
    );
  }

  it.each([
    ["acier", firstRunDefaults()],
    ["textile", ticket39Textile],
  ])("draws %s's three reversals, and the fine scan draws the same three", (_name, scenario) => {
    // Three is the W's own count — maximum, minimum, maximum — measured at `x_D` 9,78 / 74,43 /
    // 140,75 on the steel line and 3,46 / 74,30 / 147,29 on the textile one, with no flat run
    // anywhere on either. Both counts were 55 / 79 before ticket 37. Asserted as equality with the
    // reference rather than as a threshold — the claim is « the curve is the shape », and a curve
    // that reversed 5 times in both scans would satisfy a threshold while failing the claim.
    const built = scene(scenario);
    expect(reversals(built.clearance.perStep)).toBe(3);
    expect(reversals(fine(built).perStep)).toBe(reversals(built.clearance.perStep));
  });

  it("agrees with the fine scan below the read-out's last digit, and on `h_min` to the bit", () => {
    // Ticket 39 measured 87 mm of worst per-step difference and **+18,5 mm on `h_min` itself,
    // non-conservative**. Both collapse: the per-step curve is within 2 mm — a fifth of the
    // read-out's last printed digit, and 0,02 px of the profile's 13,0 px/m at § 5's reference
    // column, against the 1,29 px the old 99 mm was worth — and `h_min` is **exactly** the fine
    // scan's on both manual lines, because § 4's straight ground puts the traverse minimum on the
    // rider's own node, which both scans sample.
    for (const scenario of [firstRunDefaults(), ticket39Textile]) {
      const built = scene(scenario);
      const reference = fine(built);
      let worst = 0;
      for (let i = 0; i < built.clearance.perStep.length; i++) {
        worst = Math.max(worst, Math.abs(built.clearance.perStep[i] - reference.perStep[i]));
      }
      expect(worst).toBeLessThan(0.002);
      expect(built.clearance.hMin).toBe(reference.hMin);
    }
  });

  it("quantises the dimension line's `x`, and only its `x` — documented, not removed", () => {
    // The half of item 5 that stays: `perStepX` is a **scanned vertex**, so `profile.tsx`'s
    // clearance dimension stands on the scan grid rather than on the true argmin. On § 4's straight
    // ground it is mostly the rider's own node now and follows the rider smoothly; where it is not,
    // it is a cable vertex `L₀ / 60` ≈ 2,53 m away. `testing.md`'s « positions of scanned extrema »
    // tier — absolute, 2× the sample spacing — is therefore the bar, and the value the dimension
    // draws carries none of it (the case above). Removing it costs a root-find in `clearance.ts`'s
    // inner loop; voir its docblock.
    const built = scene(firstRunDefaults());
    const reference = fine(built);
    const spacing = built.span.L0 / CLEARANCE.samplesPerStep;
    let displaced = 0;
    let onRiderNode = 0;
    for (let i = 0; i < built.clearance.perStepX.length; i++) {
      displaced = Math.max(
        displaced,
        Math.abs(built.clearance.perStepX[i] - reference.perStepX[i]),
      );
      if (built.clearance.perStepX[i] === built.traverse.steps[i].xD) onRiderNode++;
    }
    expect(displaced).toBeLessThan(2 * spacing);
    expect(onRiderNode).toBeGreaterThan(built.traverse.steps.length / 2);
  });
});

describe("the ×1 floor, reached from the data rather than from the box", () => {
  it("« mou profond » clamps, clips, and disables the peek control", () => {
    // § 5's third badge row: a 200 m span at `L₀` 400 m asks for ×0,41 at every legal aspect.
    const slack = scene(deepSlack());
    const ve = veOf(slack);
    expect(slack.zExtent.max - slack.zExtent.min).toBeGreaterThan(150);
    expect(ve.autofit).toBeLessThan(1);
    expect(ve.ve).toBe(1);
    expect(ve.state).toBe("true-scale-clipped");
    expect(ve.peekEnabled).toBe(false);
    for (const aspect of [PLOT_ASPECT_BAND.min, PLOT_ASPECT_BAND.max]) {
      expect(veOf(slack, aspect).ve).toBe(1);
    }
  });

  it("is self-limiting: the picture is never cut without the banner saying so", () => {
    // « every case reachable inside the admissible envelope is already a ground-contact case » —
    // an argument, not a proof, and this is the one line that carries it.
    const slack = scene(deepSlack());
    expect(veOf(slack).clamped).toBe(true);
    expect(slack.clearance.contact).toBe("cable");
  });
});

describe("the imported profile — one terrain joint, one domain", () => {
  /** A synthetic 400 m trace: a flat run, a bump, a dip. Structural only — no number is measured. */
  const trace: Trace = {
    d: Float64Array.from([0, 50, 100, 150, 200, 250, 300, 350, 400]),
    z: Float64Array.from([500, 502, 498, 494, 486, 480, 478, 476, 470]),
    dev: 1.2,
    fileName: "profil.csv",
  };

  const imported = (sa: number, sb: number): ScenarioDraft => ({
    ...firstRunDefaults(),
    geometry: { source: "trace", trace: "p1.stub", sa, sb },
  });

  it("derives L and h from the stations, and the ground from the file's own samples", () => {
    const built = scene(imported(100, 300), trace);
    expect(built.L).toBe(200);
    // h = (z_B + hauteur_B) − (z_A + hauteur_A), both anchors 12 m: the altitude difference.
    expect(built.h).toBeCloseTo(478 - 498, 9);
    expect(built.terrain.kind).toBe("profile");
    // Anchor A's top is the datum, so the ground under it is exactly −hauteur_A.
    expect(built.ground.zs[built.ground.xs.indexOf(0)]).toBeCloseTo(-12, 9);
  });

  it("clamps the 5 % margin to the trace extent — a whole-trace import is the domain", () => {
    // Stations at the two ends: the margin has nowhere to go, and the domain is the trace.
    const whole = scene(imported(0, 400), trace);
    expect(whole.extent).toEqual({ min: 0, max: 400 });
    expect(whole.domain).toEqual([0, 400]);
    // Stations well inside: the margin stands, and the drawn ground covers it. Everything is in
    // the **span** frame — metres from anchor A — which is the frame the x axis reads in.
    const inside = scene(imported(100, 300), trace);
    expect(inside.extent).toEqual({ min: -100, max: 300 });
    expect(inside.domain).toEqual([-10, 210]);
    expect(inside.ground.xs[0]).toBe(-10);
    expect(inside.ground.xs[inside.ground.xs.length - 1]).toBe(210);
  });

  it("never resamples: every file sample inside the domain is drawn, and no other", () => {
    // Resampling was killed for making a coarse import indistinguishable from a fine one, and that
    // rule does not stop at the engine's edge. The file's 100…300 land at 0…200 in the span frame.
    const built = scene(imported(100, 300), trace);
    expect([...built.ground.xs]).toEqual([-10, 0, 50, 100, 150, 200, 210]);
  });

  it("a degenerate placement has no picture — « L doit être > 0 »", () => {
    expect(buildScene({ scenario: imported(300, 300), trace })).toBeNull();
    expect(buildScene({ scenario: imported(300, 100), trace })).toBeNull();
    // A trace-mode scenario with no cached Trace is the same: nothing to draw, and no throw.
    expect(buildScene({ scenario: imported(100, 300), trace: null })).toBeNull();
  });
});

describe("« Aucun résultat » — the null arm", () => {
  it("a textile draft with § 9's two blanks has no picture", () => {
    const draft: ScenarioDraft = {
      ...firstRunDefaults(),
      material: FIRST_RUN_RETAINED_TEXTILE.spec,
    };
    expect(buildScene({ scenario: draft, trace: null })).toBeNull();
    // Filled in, it draws — the blanks are the only thing standing between the two states.
    const filled: ScenarioDraft = {
      ...firstRunDefaults(),
      material: { ...FIRST_RUN_RETAINED_TEXTILE.spec, MBL: 100_000, mu: 0.08 },
    };
    expect(buildScene({ scenario: filled, trace: null })).not.toBeNull();
  });

  it("a degenerate manual span has no picture and no throw", () => {
    for (const geometry of [
      { source: "manual", L: 0, h: -18 },
      { source: "manual", L: Number.NaN, h: -18 },
      { source: "manual", L: 150, h: Number.NaN },
    ] as const) {
      expect(buildScene({ scenario: { ...firstRunDefaults(), geometry }, trace: null })).toBeNull();
    }
  });
});

describe("the frame outlives the solve — § 8's « les entrées se dessinent toujours »", () => {
  /** The same synthetic trace the imported-profile block uses, for the station cases. */
  const trace: Trace = {
    d: Float64Array.from([0, 100, 200, 300, 400]),
    z: Float64Array.from([500, 498, 486, 478, 470]),
    dev: 1.2,
    fileName: "profil.csv",
  };

  it("a textile draft with a blank MBL still has a frame, and no solved half", () => {
    // § 8 lists what « Aucun résultat » removes — the cable, the unloaded line, the clearance
    // curve, the danger bands, the rider — and what it keeps: terrain, both anchors, the span
    // markers, the 5 % margin. A blank rope is not a geometry failure, so it may not take those.
    const draft: ScenarioDraft = {
      ...firstRunDefaults(),
      material: FIRST_RUN_RETAINED_TEXTILE.spec,
    };
    const inputs = sceneInputs(draft, null);
    expect(buildSceneBase(inputs)).toBeNull();

    const frame = buildSceneFrame(inputs);
    if (frame === null) throw new Error("expected a frame");
    expect(frame.L).toBe(150);
    expect(frame.h).toBe(-18);
    expect(frame.domain).toEqual([-7.5, 157.5]);
    expect(frame.anchors).toEqual({ zA: 12, zB: 12 });
    expect(frame.terrain.kind).toBe("profile");
    expect(frame.ground.xs.length).toBeGreaterThan(0);
    // The towers and the drawn ground are all there is to fit, so the auto-fit has a real extent.
    expect(frame.zExtent.max).toBeGreaterThan(frame.zExtent.min);
  });

  it("an unreachable tightness target keeps its frame too", () => {
    // Same class: the *scenario* refused, the *placement* did not.
    const draft: ScenarioDraft = {
      ...firstRunDefaults(),
      tightness: { mode: "tension", H_target: 1e12 },
    };
    expect(buildSceneBase(sceneInputs(draft, null))).toBeNull();
    expect(buildSceneFrame(sceneInputs(draft, null))).not.toBeNull();
  });

  it("only l'exception géométrique loses the frame — L, h, and the stations", () => {
    // The one state § 8 wrote down *as* an exception: no shared x domain, so no scale, no ticks
    // and no pointer path.
    for (const geometry of [
      { source: "manual", L: 0, h: -18 },
      { source: "manual", L: -5, h: -18 },
      { source: "manual", L: Number.NaN, h: -18 },
      { source: "manual", L: 150, h: Number.NaN },
    ] as const) {
      const draft: ScenarioDraft = { ...firstRunDefaults(), geometry };
      expect(buildSceneFrame(sceneInputs(draft, null))).toBeNull();
      expect(buildSceneBase(sceneInputs(draft, null))).toBeNull();
    }
  });

  it("`station B ≤ station A` yields no frame, and neither does a missing Trace", () => {
    const imported = (sa: number, sb: number): ScenarioDraft => ({
      ...firstRunDefaults(),
      geometry: { source: "trace", trace: "p1.stub", sa, sb },
    });
    expect(buildSceneFrame(sceneInputs(imported(300, 300), trace))).toBeNull();
    expect(buildSceneFrame(sceneInputs(imported(300, 100), trace))).toBeNull();
    expect(buildSceneFrame(sceneInputs(imported(100, 300), null))).toBeNull();
    expect(buildSceneFrame(sceneInputs(imported(100, 300), trace))).not.toBeNull();
  });

  it("the solved half is built on the frame, and widens its z extent with the traverse", () => {
    const inputs = sceneInputs(firstRunDefaults(), null);
    const frame = buildSceneFrame(inputs);
    if (frame === null) throw new Error("expected a frame");
    const base = buildSceneBase(inputs, frame);
    if (base === null) throw new Error("expected a drawable base");

    // Same frame, field for field — the frame is not rebuilt with different numbers downstream.
    expect(base.L).toBe(frame.L);
    expect(base.domain).toEqual(frame.domain);
    expect(base.ground).toBe(frame.ground);
    expect(base.terrain).toBe(frame.terrain);
    // The solved extent contains the frame's and the whole traverse: the frame is a floor the
    // sweep widens, never a second opinion about the same numbers. On § 9's line the towers still
    // bound it — the cable never dips under anchor B's base — which is exactly why the frame alone
    // is a usable scale.
    expect(base.zExtent.min).toBeLessThanOrEqual(frame.zExtent.min);
    expect(base.zExtent.max).toBeGreaterThanOrEqual(frame.zExtent.max);
    for (const step of base.traverse.steps) {
      expect(step.zD).toBeGreaterThanOrEqual(base.zExtent.min);
      expect(step.zD).toBeLessThanOrEqual(base.zExtent.max);
    }
    // Passing the frame in changes nothing about the result: it is a shared computation, not an
    // input the caller can disagree with.
    expect(buildSceneBase(inputs)).toEqual(base);
  });
});

describe("the split at x_D — § 7's « memo on the solve inputs »", () => {
  it("keeps x_D out of the solve inputs, so a scrub cannot invalidate the sweep", () => {
    const a = firstRunDefaults();
    const b: Scenario = { ...a, rider: { ...a.rider, xD: 12.5 } };
    // The memo key first: `x_D` is a view parameter and appears nowhere in it.
    expect(sceneInputs(b, null)).toEqual(sceneInputs(a, null));
    expect(Object.keys(sceneInputs(a, null))).not.toContain("xD");
    // And therefore the expensive half — sweep + §11 — is the same scene for both.
    expect(buildSceneBase(sceneInputs(b, null))).toEqual(buildSceneBase(sceneInputs(a, null)));
  });

  it("re-places the rider over one base, exactly as buildScene would have", () => {
    const base = buildSceneBase(sceneInputs(firstRunDefaults(), null));
    if (base === null) throw new Error("expected a drawable base");
    // A typed position stays exact — the split changes no number, only what re-runs.
    const typed = placeRider(base, 99.7);
    expect(typed?.step.xD).toBeCloseTo(99.7, 5);
    const whole = scene({
      ...firstRunDefaults(),
      rider: { ...firstRunDefaults().rider, xD: 99.7 },
    });
    expect(typed).toEqual(whole.rider);
    // And it clamps here too, because `x_D` clamps on **every** path.
    expect(placeRider(base, 1e6)?.step.xD).toBeCloseTo(150, 5);
  });

  it("carries h_rider on the base, since §11's third term is the scenario's, not the view's", () => {
    const scenario = firstRunDefaults();
    const base = buildSceneBase(sceneInputs(scenario, null));
    if (base === null) throw new Error("expected a drawable base");
    expect(base.hRider).toBe(scenario.rider.hRider);
    expect(placeRider(base, 75)?.envelope).toBe(scenario.rider.hRider);
  });
});

describe("the load against the unloaded line, and its trajectory — the 2026-09-23 layers", () => {
  const built = buildSceneBase(sceneInputs(firstRunDefaults(), null));
  if (built === null) throw new Error("expected a drawable base");
  const base = built;

  function at(xD: number) {
    const placed = placeRider(base, xD);
    if (placed === null) throw new Error(`expected a rider at x_D ${xD}`);
    return placed;
  }

  it("the gap to the unloaded line closes at both anchors, where the two lines share a point", () => {
    // Both lines end on the two anchor tops, `(0, 0)` and `(L, h)`, whatever the load does: the
    // frame check that makes the mid-span figure readable, and a sign slip's first casualty.
    expect(at(0).belowUnloaded).toBeCloseTo(0, 5);
    expect(at(150).belowUnloaded).toBeCloseTo(0, 5);
  });

  it("the load hangs below the unloaded line everywhere between them", () => {
    for (const xD of [15, 37.5, 75, 112.5, 135]) {
      expect(at(xD).belowUnloaded).toBeGreaterThan(0);
    }
    // The load cannot pull the line down by more than it sags below the chord: the unloaded line
    // is itself under the chord on a line hanging from its own weight.
    expect(at(75).belowUnloaded).toBeLessThan(at(75).sagAtRider);
  });

  it("the trajectory is the traverse's own (x_D, z_D), one run when every step solved", () => {
    expect(base.traverse.coverage).toBe(1);
    expect(base.trajectory).toHaveLength(1);
    const [run] = base.trajectory;
    expect(Array.from(run.xs)).toEqual(base.traverse.steps.map((step) => step.xD));
    expect(Array.from(run.zs)).toEqual(base.traverse.steps.map((step) => step.zD));
  });

  it("the trajectory breaks at an Indéterminé gap instead of bridging it", () => {
    const step = (xD: number): SweepStep => ({
      sD: xD,
      xD,
      zD: -xD / 10,
      H: 1,
      V0: 0,
      TA: 1,
      TB: 1,
      theta: 0,
    });
    const failure = (index: number) => ({
      index,
      sD: index,
      error: { kind: "no-convergence" as const, attempts: 3, residual: 1 },
    });
    // Six grid steps, 2 and 4 failed: a run of two, then two lone steps with no line to draw.
    const traverse: SweepResult = {
      grid: Float64Array.from([0, 1, 2, 3, 4, 5]),
      steps: [step(0), step(1), step(3), step(5)],
      failures: [failure(2), failure(4)],
      coverage: 4 / 6,
    };
    const runs = trajectoryRuns(traverse);
    expect(runs).toHaveLength(1);
    expect(Array.from(runs[0].xs)).toEqual([0, 1]);
  });

  it("polylineAt interpolates between vertices and holds the ends", () => {
    const line = { xs: Float64Array.from([0, 10, 20]), zs: Float64Array.from([0, -2, 4]) };
    expect(polylineAt(line, 5)).toBe(-1);
    expect(polylineAt(line, 15)).toBe(1);
    expect(polylineAt(line, 10)).toBe(-2);
    expect(polylineAt(line, -5)).toBe(0);
    expect(polylineAt(line, 99)).toBe(4);
  });
});

describe("the two pointer helpers", () => {
  it("snapToStep lands on a solved step, which is what skips Indéterminé's gaps", () => {
    const target = snapToStep(first.traverse, 40);
    expect(first.traverse.steps.some((step) => step.xD === target)).toBe(true);
    // Outside the span it saturates on the nearest end rather than inventing a position.
    expect(snapToStep(first.traverse, -100)).toBe(first.traverse.steps[0].xD);
    expect(snapToStep(first.traverse, 1e6)).toBe(
      first.traverse.steps[first.traverse.steps.length - 1].xD,
    );
  });

  it("x_D clamps on every path, because it selects a view", () => {
    expect(clampToSpan(-3, 150)).toBe(0);
    expect(clampToSpan(1000, 150)).toBe(150);
    expect(clampToSpan(74.8, 150)).toBe(74.8);
    expect(clampToSpan(Number.NaN, 150)).toBe(0);
  });
});

/**
 * `[MEASURED]` spec § 7 — « le mou profond converge » (elections §0.2, ticket 14 §1): `L₀` 400 m on
 * a level 200 m span, bases 4,0 m and 2,5 m under their anchors, on the shipped 12 mm cable.
 *
 * It is § 5's « mou profond » line too — the one case that reaches the ×1 clamp **from its own
 * data** rather than from the box, and, measured, already a « Câble au sol » when it does.
 */
function deepSlack(): Scenario {
  return {
    ...firstRunDefaults(),
    geometry: { source: "manual", L: 200, h: 0 },
    anchors: { zA: 4, zB: 2.5 },
    tightness: { mode: "length", L0: 400 },
  };
}

/** `[MEASURED]` ticket 14 §1 — the passenger-envelope contact: 200 m at `h` −25, anchors 12 / 6. */
function riderContact(): Scenario {
  return {
    ...firstRunDefaults(),
    geometry: { source: "manual", L: 200, h: -25 },
    anchors: { zA: 12, zB: 6 },
  };
}
