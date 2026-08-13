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
import type { Trace } from "@/lib/terrain/trace.ts";

import { formatQuantity } from "@/lib/format/quantity.ts";
import { exaggeration, PLOT_ASPECT_BAND, PROFILE_ASPECT, VE_BAND } from "@/lib/layout/contract.ts";
import { FIRST_RUN_RETAINED_TEXTILE, firstRunDefaults } from "@/lib/scenario/first-run.ts";

import {
  buildScene,
  buildSceneBase,
  buildSceneFrame,
  clampToSpan,
  placeRider,
  sceneInputs,
  snapToStep,
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

  it("reproduces the locked garde: 2,44 m at x 74,1 m, contact « none »", () => {
    expect(formatQuantity("clearance", first.clearance.hMin)).toBe("2,44 m");
    expect(formatQuantity("extremumX", first.clearance.atX)).toBe("74,1 m");
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

  it("reads « Garde min » plainly on first paint — the cell does not relabel itself", () => {
    // 0,9 m from the traverse minimum, inside `max(1 m, 1 % de la portée)`. This is *why* the
    // shipped rider sits at `L/2`.
    expect(first.rider.relabel).toBe(false);
    expect(Math.abs(first.rider.worst.atX - first.rider.step.xD)).toBeLessThan(1);
  });

  it("the Position-scope garde is the rider's own minimum, not the traverse's", () => {
    // The two scopes differ from the very first paint, which is why the read-out row carries its
    // own « à la position du passager » label against the Rail's « sur toute la traversée ». § 5
    // quotes ≈2,49 against 2,44 off the prototype; what binds here is the **relation** plus the
    // string this chain actually prints — the last centimetre is `CLEARANCE.samplesPerStep`'s.
    expect(first.rider.worst.hClear).toBeGreaterThan(first.clearance.hMin);
    expect(first.rider.worst.hClear).toBeLessThan(first.clearance.hMin + 0.1);
    expect(formatQuantity("clearance", first.rider.worst.hClear)).toBe("2,48 m");
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
   * `[MEASURED]` ticket 14 §1 — « hauteurs 12/6, flèche 6,0 ⇒ −1,53 m », on a 200 m span at `h`
   * −25 m. The engine's own fixture for it lives in `src/lib/sim/__fixtures__/`, which app code may
   * not reach behind the barrel; what is checked here is that the **scene** lands on the same
   * number through the app's own chain.
   */
  const rider = scene(riderContact());

  it("« Enveloppe passager traversée » — the verdict that is true only given h_rider", () => {
    expect(rider.clearance.contact).toBe("rider");
    expect(rider.clearance.hMin).toBeCloseTo(-1.53, 2);
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
    // `[MEASURED]` ticket 14 §1, and § 5's own « mou profond » line: garde −169,67 m.
    const slack = scene(deepSlack());
    expect(slack.clearance.contact).toBe("cable");
    expect(slack.clearance.hMin).toBeCloseTo(-169.67, 1);
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
