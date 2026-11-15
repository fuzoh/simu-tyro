/**
 * §19.8's integrator. Oracles: §15's F1 (the forward catenary at a given `(H, V₀)`), §19.8's piece
 * rule by hand, §19.3's jump and node continuity as invariants, and determinism.
 */

import { describe, expect, it } from "vitest";

import type { LineAero } from "./types.ts";

import { F1, TOLERANCE } from "./__fixtures__/theory-15.ts";
import { pieceSteps, REFUSAL, Shooter, ShotNodes, type ShotInput } from "./shoot.ts";

const rel = (value: number, expected: number) => Math.abs(value / expected - 1);

const WIND: LineAero = {
  field: { speed: 15, from: 90, profile: { width: 50, attenuation: 40 } },
  bearing: 0,
  rho: 1.225,
  d: 0.012,
  CDn: 1.2,
};

const LOADED: ShotInput = {
  L: 150,
  h: -18,
  L0: 151.644,
  w: 5.361,
  EA: 6.9e6,
  aero: WIND,
  rider: { sP: 60, weight: 1177, share: 0.5, hRider: 2.1 },
};

describe("pieceSteps — §19.8's even pieces around the trolley", () => {
  it("gives the unloaded line N steps", () => {
    expect(pieceSteps(240, 151.644, null)).toEqual([240]);
  });

  it("splits by length, each piece 2·round(N·ℓ/(2·L₀))", () => {
    // ℓ₁ = L₀/4 → 2·round(30) = 60; ℓ₂ = 3·L₀/4 → 2·round(90) = 180.
    expect(pieceSteps(240, 100, 25)).toEqual([60, 180]);
    // ℓ₁ = 0,3·L₀ → 2·round(36) = 72; ℓ₂ → 2·round(84) = 168.
    expect(pieceSteps(240, 100, 30)).toEqual([72, 168]);
  });

  it("never gives a piece fewer than 2 steps", () => {
    expect(pieceSteps(240, 100, 0.01)[0]).toBe(2);
  });
});

describe("Shooter — the forward integration", () => {
  it("reaches §15's F1 from its (H, V₀) without wind", () => {
    const { H, V0, w, EA, L0 } = F1.in;
    const shot = new Shooter({ L: 100, h: 0, L0, w, EA, aero: null, rider: null }, 240);
    expect(shot.run(H, 0, V0, null)).toBe(true);
    expect(rel(shot.x, F1.out.xAtL0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(rel(shot.z, F1.out.zAtL0)).toBeLessThan(TOLERANCE.solvedScalar);
    expect(shot.y).toBe(0);
    // §2.1's mixed convention would read 24.2342: the sign of `V₀` is §2's.
    expect(rel(shot.z, F1.rejected.zAtL0MixedConvention)).toBeGreaterThan(1e-4);
  });

  it("is deterministic: the same F_A gives the same nodes, bit for bit", () => {
    const shot = new Shooter(LOADED, 240);
    const a = new ShotNodes(shot.nodeCount);
    const b = new ShotNodes(shot.nodeCount);
    shot.run(7800, 150, -1900, a);
    shot.run(7800, 150, -1900, b);
    expect(b).toEqual(a);
  });

  it("shares the trolley's node and jumps F by −P_ext there (§19.3)", () => {
    const shot = new Shooter(LOADED, 240);
    const nodes = new ShotNodes(shot.nodeCount);
    expect(shot.run(7800, 150, -1900, nodes)).toBe(true);
    const k = shot.pieces[0];
    expect(nodes.S[k]).toBe(60);
    expect(nodes.S[k + 1]).toBe(60);
    expect(nodes.x[k + 1]).toBe(nodes.x[k]);
    expect(nodes.y[k + 1]).toBe(nodes.y[k]);
    expect(nodes.z[k + 1]).toBe(nodes.z[k]);
    expect(nodes.Fx[k + 1] - nodes.Fx[k] + shot.Px).toBeCloseTo(0, 9);
    expect(nodes.Fy[k + 1] - nodes.Fy[k] + shot.Py).toBeCloseTo(0, 9);
    expect(nodes.Fz[k + 1] - nodes.Fz[k] + shot.Pz).toBeCloseTo(0, 9);
    // §19.6: the member carries `share` of the whole weight.
    expect(shot.Pz).toBe(-0.5 * 1177);
  });

  it("ends where its last node is", () => {
    const shot = new Shooter(LOADED, 240);
    const nodes = new ShotNodes(shot.nodeCount);
    shot.run(7800, 150, -1900, nodes);
    const last = shot.nodeCount - 1;
    expect([nodes.S[last], nodes.x[last], nodes.y[last], nodes.z[last]]).toEqual([
      LOADED.L0,
      shot.x,
      shot.y,
      shot.z,
    ]);
  });

  it("refuses a tension under 0,01·|w|, never floors it (§19.8)", () => {
    const shot = new Shooter({ ...LOADED, rider: null }, 240);
    expect(shot.run(0.01 * LOADED.w * 0.5, 0, 0, null)).toBe(false);
    expect(shot.refusal).toBe(REFUSAL.slack);
  });

  it("refuses a value that is not finite", () => {
    const shot = new Shooter(LOADED, 240);
    expect(shot.run(Number.NaN, 0, 0, null)).toBe(false);
    expect(shot.refusal).toBe(REFUSAL.nonFinite);
  });

  it("notes where a trial line needed the wind outside [0, L]", () => {
    const shot = new Shooter({ ...LOADED, rider: null }, 240);
    // Leaving A backward: the first stage already reads the wind at x < 0.
    expect(shot.run(-2000, 0, -500, null)).toBe(true);
    expect(shot.outsideAt).toBeLessThan(0);
    // A slack trial that ends short of B, leaving A toward it, notes nothing.
    expect(shot.run(1500, 150, -730, null)).toBe(true);
    expect(shot.x).toBeLessThan(LOADED.L);
    expect(shot.outsideAt).toBeNaN();
  });

  it("notes nothing without wind, where no field is read", () => {
    const shot = new Shooter({ ...LOADED, aero: null, rider: null }, 240);
    expect(shot.run(-2000, 0, -500, null)).toBe(true);
    expect(shot.outsideAt).toBeNaN();
  });
});
