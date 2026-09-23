/**
 * § 7's key table, read backwards. The load-bearing case is the **round trip**: `scenarioToSearch`
 * and `scenarioFromSearch` are the two directions of one table, and a link that does not survive
 * the pair is a link that arrives as a different scenario from the one that was sent.
 */

import { describe, expect, it } from "vitest";

import { completeFromDefaults, scenarioToSearch } from "@/lib/url/schema.ts";

import { FIRST_RUN_SCENARIO, firstRunDefaults } from "./first-run.ts";
import { clampX, scenarioFromSearch } from "./from-search.ts";

describe("scenarioFromSearch — the read side of § 7's key table", () => {
  it("round-trips § 9's shipped Scenario through the URL and back", () => {
    expect(scenarioFromSearch(scenarioToSearch(FIRST_RUN_SCENARIO))).toEqual(firstRunDefaults());
  });

  it("keeps `reg` absent as « — choisir — », never as a defaulted régime", () => {
    expect(scenarioFromSearch({}).regime).toBeNull();
    expect(scenarioFromSearch({ reg: "en15567" }).regime).toBe("en15567");
  });

  it("turns the URL's daN back into the state's newtons — `te` and `mbl`", () => {
    expect(scenarioFromSearch({ te: 253.5 }).tightness).toEqual({
      mode: "tension",
      H_target: 2535,
    });
    const textile = scenarioFromSearch({ fam: "tx", cls: "hmpe", mbl: 10_000, mu: 0.1, k: 22 });
    expect(textile.material).toEqual({
      family: "textile",
      ropeClass: "hmpe",
      MBL: 100_000,
      mu: 0.1,
      k: 22,
    });
  });

  it("reads the tightness driver from **which** key is present", () => {
    expect(scenarioFromSearch({ fl: 6 }).tightness).toEqual({ mode: "sag", D_target: 6 });
    expect(scenarioFromSearch({ lo: 151.64 }).tightness).toEqual({ mode: "length", L0: 151.64 });
    expect(scenarioFromSearch({ vr: 0.82 }).tightness).toEqual({ mode: "ratio", ratio: 0.82 });
  });

  it("leaves § 9's two textile blanks blank — a rope nobody typed has no numbers", () => {
    const material = scenarioFromSearch({ fam: "tx", cls: "hmpe", k: 22 }).material;
    expect(material).toEqual({ family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 });
  });

  it("treats an absent steel override as « non surchargée », not as the formula value", () => {
    expect(scenarioFromSearch({ fam: "ac", d: 12, r0: 1770, cst: "iwrc" }).material).toEqual({
      family: "steel",
      d: 12,
      R0: 1770,
      construction: "iwrc",
    });
    expect(scenarioFromSearch({ fam: "ac", mbf: 9074, mu: 0.5465 }).material).toMatchObject({
      overrides: { MBF: 90_740, mu: 0.5465 },
    });
  });

  it("resolves a termination token under the family `fam` fixes", () => {
    expect(scenarioFromSearch({ fam: "ac", ta: "epissure" }).terminations.A.id).toBe("epissure");
    expect(scenarioFromSearch({ fam: "tx", ta: "epissure" }).terminations.A.id).toBe(
      "epissure-longue-hmpe",
    );
  });

  it("refuses an out-of-family token at the app's tier, where § 7 puts it", () => {
    // `?fam=ac&ta=huit` types cleanly — the URL is a typing boundary — and there is no steel
    // « nœud de huit », so the app falls back rather than inventing one.
    expect(scenarioFromSearch({ fam: "ac", ta: "huit" }).terminations.A.id).toBe(
      FIRST_RUN_SCENARIO.terminations.A.id,
    );
  });

  it("carries an imported link's `tr` verbatim and never decodes it", () => {
    const geometry = scenarioFromSearch({ tr: "p1.AAAA", sa: 10, sb: 210 }).geometry;
    expect(geometry).toEqual({ source: "trace", trace: "p1.AAAA", sa: 10, sb: 210 });
  });

  it("clamps `x` to the span on arrival — the one elected exception", () => {
    expect(scenarioFromSearch({ L: 150, h: 0, x: 400 }).rider.xD).toBe(150);
    expect(scenarioFromSearch({ L: 150, h: 0, x: -12 }).rider.xD).toBe(0);
    expect(scenarioFromSearch({ tr: "p1.AAAA", sa: 10, sb: 210, x: 500 }).rider.xD).toBe(200);
  });

  it("applies an out-of-range value as it arrived — everything but `x`", () => {
    // § 7: « ?L=-5 loads into the field and lights up the Solve Gate's existing form validation
    // exactly as typing −5 would ». The URL repairs nothing.
    expect(scenarioFromSearch({ L: -5, h: 0 }).geometry).toEqual({ source: "manual", L: -5, h: 0 });
    expect(scenarioFromSearch({ mp: 0 }).rider.mp).toBe(0);
  });

  it("is total over a completed link — every field is filled or blank on purpose", () => {
    const { search } = completeFromDefaults({ L: 250, h: -40 });
    const scenario = scenarioFromSearch(search);
    expect(scenario.geometry).toEqual({ source: "manual", L: 250, h: -40 });
    // § 7 completes `fl` **literally** to 6,0 m, and `x` to `L/2` of the *completed* span.
    expect(scenario.tightness).toEqual({ mode: "sag", D_target: 6 });
    expect(scenario.rider.xD).toBe(125);
  });
});

describe("clampX", () => {
  it("leaves a viewpoint inside the span untouched", () => {
    expect(clampX(74.8, 150)).toBe(74.8);
  });

  it("does not clamp against a span that is not a span", () => {
    expect(clampX(74.8, -5)).toBe(74.8);
    expect(clampX(74.8, Number.NaN)).toBe(74.8);
  });
});
