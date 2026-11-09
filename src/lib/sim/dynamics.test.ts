import { describe, expect, test } from "vitest";

import type { RidePath, TrolleyFriction } from "./dynamics.ts";
import type { SpanInput } from "./types.ts";

import { TOLERANCE, Z4, Z8 } from "./__fixtures__/theory-15.ts";
import { airDensity, DYNAMICS, quasiStaticRatio, ride, ridePath } from "./dynamics.ts";
import { sweep, sweepStep } from "./sweep.ts";
import { kmhToMs, windComponents } from "./wind.ts";

/** A straight path down a constant slope, `length` metres along it. */
function slopePath(thetaDeg: number, length: number): RidePath {
  const theta = (thetaDeg * Math.PI) / 180;
  return {
    x: Float64Array.from([0, length * Math.cos(theta)]),
    z: Float64Array.from([0, -length * Math.sin(theta)]),
    T: Float64Array.from([1, 1]),
  };
}

/** One member's frozen trajectory under a rider, as the app builds it. */
function trajectory(input: SpanInput, P: number): RidePath {
  return ridePath(sweep(input, P).steps, input);
}

/** Z4's level line under its 1177 N rider — a valley the passager cannot climb out of. */
const LEVEL: SpanInput = { L: 100, h: 0, L0: 100.5, w: 10, EA: 1e7, loads: [] };
const LEVEL_PATH = trajectory(LEVEL, Z4.in.P);
/** The passager whose weight Z4's `P` is, kg. */
const LEVEL_MASS = 120;

/** A descending line the passager rides to the end. */
const DESCENDING: SpanInput = { L: 300, h: -60, L0: 307, w: 5.36, EA: 6.9e6, loads: [] };

const SSF: TrolleyFriction = DYNAMICS.textile;
const STEEL: TrolleyFriction = DYNAMICS.steel;

/** The level line's ride, calm unless a wind is given. */
function levelRide(trolley: TrolleyFriction, windAlong = 0) {
  return ride({
    path: LEVEL_PATH,
    m: LEVEL_MASS,
    CdA: DYNAMICS.CdA,
    rho: DYNAMICS.rhoSeaLevel,
    trolley,
    windAlong,
  });
}

/** Where a ride stopped, or a failure naming how it ended instead. */
function stopX(end: ReturnType<typeof ride>["end"]): number {
  if (end.kind !== "stop") throw new Error(`expected a stop, got ${end.kind}`);
  return end.x;
}

/**
 * The `x` interval around the trajectory's low point where the slope cannot start the passager
 * again: the contiguous run of segments with `|m·g·sin θ| ≤ hold`. Read off the path alone.
 */
function holdingBand(path: RidePath, hold: (sin: number, cos: number) => number) {
  const { x, z } = path;
  let low = 0;
  for (let k = 1; k < z.length; k++) if (z[k] < z[low]) low = k;
  const holds = (i: number) => {
    const length = Math.hypot(x[i + 1] - x[i], z[i + 1] - z[i]);
    const sin = (z[i + 1] - z[i]) / length;
    const cos = (x[i + 1] - x[i]) / length;
    return Math.abs(LEVEL_MASS * DYNAMICS.g * sin) <= hold(sin, cos);
  };
  let first = low;
  while (first > 0 && holds(first - 1)) first -= 1;
  let last = low;
  while (last < x.length - 1 && holds(last)) last += 1;
  return { lowX: x[low], from: x[first], to: x[last] };
}

describe("Z8 — the terminal velocity on a 10° slope, §15", () => {
  test("the integrator's speed converges to v_t = 19,8449 m/s at the solved-scalar tier", () => {
    const { thetaDeg, m, rho, CdA, F0, kv } = Z8.in;
    // 5 km of slope: the approach to v_t decays over ≈ 144 m, so the end is 35 lengths away.
    const { end } = ride({
      path: slopePath(thetaDeg, 5000),
      m,
      CdA,
      rho,
      trolley: { law: "ssf", F0, kv },
      windAlong: 0,
    });
    expect(end.kind).toBe("arrival");
    if (end.kind !== "arrival") return;
    expect(Math.abs(end.v - Z8.out.vt) / Z8.out.vt).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("the engine's g is the one Z8 states", () => {
    expect(DYNAMICS.g).toBe(Z8.in.g);
  });
});

describe("energy — without friction or drag, ½mv² at the arrival is m·g·Δz", () => {
  const path = trajectory(DESCENDING, 120 * DYNAMICS.g);
  const drop = -DESCENDING.h;

  test.each<[string, TrolleyFriction]>([
    ["F₀ = k_v = 0", { law: "ssf", F0: 0, kv: 0 }],
    ["μ = 0", { law: "coulomb", mu: 0 }],
  ])("%s, along a loaded trajectory", (_name, trolley) => {
    const m = 120;
    const { end } = ride({ path, m, CdA: 0, rho: DYNAMICS.rhoSeaLevel, trolley, windAlong: 0 });
    expect(end.kind).toBe("arrival");
    if (end.kind !== "arrival") return;
    const kinetic = 0.5 * m * end.v * end.v;
    const potential = m * DYNAMICS.g * drop;
    expect(Math.abs(kinetic - potential) / potential).toBeLessThan(1e-4);
  });

  test("friction and drag take some of it, and the speed at B says so", () => {
    const m = 120;
    const free = ride({
      path,
      m,
      CdA: 0,
      rho: 1.225,
      trolley: { law: "ssf", F0: 0, kv: 0 },
      windAlong: 0,
    });
    const real = ride({ path, m, CdA: DYNAMICS.CdA, rho: 1.225, trolley: SSF, windAlong: 0 });
    expect(free.end.kind).toBe("arrival");
    expect(real.end.kind).toBe("arrival");
    if (free.end.kind !== "arrival" || real.end.kind !== "arrival") return;
    expect(real.end.v).toBeLessThan(free.end.v);
  });
});

describe("the Point d'arrêt without wind lies in the band the slope cannot start from", () => {
  test("corde, SSF law: |m·g·sin θ| ≤ F₀ around the low point", () => {
    const band = holdingBand(LEVEL_PATH, () => (SSF.law === "ssf" ? SSF.F0 : 0));
    const x = stopX(levelRide(SSF).end);
    expect(band.from).toBeLessThanOrEqual(band.lowX);
    expect(band.lowX).toBeLessThanOrEqual(band.to);
    expect(x).toBeGreaterThanOrEqual(band.from);
    expect(x).toBeLessThanOrEqual(band.to);
  });

  test("câble, constant μ: |m·g·sin θ| ≤ μ·N, N = m·g·cos θ", () => {
    const mu = STEEL.law === "coulomb" ? STEEL.mu : 0;
    const band = holdingBand(LEVEL_PATH, (_sin, cos) => mu * LEVEL_MASS * DYNAMICS.g * cos);
    const x = stopX(levelRide(STEEL).end);
    expect(x).toBeGreaterThanOrEqual(band.from);
    expect(x).toBeLessThanOrEqual(band.to);
  });

  test("the passager comes to rest, and the last sample is at rest where the ride says", () => {
    const { samples, end } = levelRide(SSF);
    const last = samples[samples.length - 1];
    expect(last.v).toBe(0);
    expect(last.x).toBe(stopX(end));
    expect(last.t).toBe(end.t);
  });
});

describe("wind shifts the Point d'arrêt, through its component along the line only", () => {
  const wind = kmhToMs(50);
  // A line running north: the wind's azimuth is its angle from head-on.
  const NORTH = 0;
  const calm = stopX(levelRide(SSF).end);

  test("a head wind stops the passager before the calm Point d'arrêt", () => {
    expect(stopX(levelRide(SSF, windComponents(wind, 0, NORTH).along).end)).toBeLessThan(calm);
  });

  test("a tail wind stops the passager beyond it", () => {
    expect(stopX(levelRide(SSF, windComponents(wind, 180, NORTH).along).end)).toBeGreaterThan(calm);
  });

  test("a pure cross wind changes nothing", () => {
    expect(levelRide(SSF, windComponents(wind, 90, NORTH).along)).toEqual(levelRide(SSF));
    expect(levelRide(SSF, windComponents(wind, 270, NORTH).along)).toEqual(levelRide(SSF));
  });

  test("the same holds on a câble", () => {
    const steelCalm = stopX(levelRide(STEEL).end);
    expect(stopX(levelRide(STEEL, windComponents(wind, 0, NORTH).along).end)).toBeLessThan(
      steelCalm,
    );
    expect(stopX(levelRide(STEEL, windComponents(wind, 180, NORTH).along).end)).toBeGreaterThan(
      steelCalm,
    );
  });
});

describe("the departure is controlled: from rest at A", () => {
  test("the first sample is A, at rest", () => {
    const [first] = levelRide(SSF).samples;
    expect(first).toMatchObject({ t: 0, x: 0, z: 0, v: 0 });
  });

  test("a slope too gentle to beat F₀ never starts the passager", () => {
    // tan θ = 0,01: m·g·sin θ = 11,8 N against F₀ = 15 N.
    const theta = (Math.atan(0.01) * 180) / Math.PI;
    const { end, samples } = ride({
      path: slopePath(theta, 100),
      m: LEVEL_MASS,
      CdA: DYNAMICS.CdA,
      rho: DYNAMICS.rhoSeaLevel,
      trolley: SSF,
      windAlong: 0,
    });
    expect(end).toEqual({ kind: "stop", x: 0, t: 0 });
    expect(samples).toHaveLength(1);
  });

  test("a head wind stronger than the slope keeps the passager on the departure", () => {
    // 3° of slope give 61,6 N toward B; 100 km/h head-on give ½·1,225·0,45·27,7² = 212 N back.
    const { end } = ride({
      path: slopePath(3, 200),
      m: LEVEL_MASS,
      CdA: DYNAMICS.CdA,
      rho: DYNAMICS.rhoSeaLevel,
      trolley: SSF,
      windAlong: -kmhToMs(100),
    });
    expect(end).toEqual({ kind: "stop", x: 0, t: 0 });
  });
});

describe("a trolley that holds nothing at rest never settles", () => {
  test("with F₀ = k_v = 0, the swing outlives the restart guard", () => {
    const { end } = levelRide({ law: "ssf", F0: 0, kv: 0 });
    expect(end.kind).toBe("unsettled");
  });
});

describe("time", () => {
  test("down a frictionless, drag-free slope, the duration is the free fall's √(2·S/(g·sin θ))", () => {
    const theta = 20;
    const S = 300;
    const { end } = ride({
      path: slopePath(theta, S),
      m: 90,
      CdA: 0,
      rho: 1.225,
      trolley: { law: "ssf", F0: 0, kv: 0 },
      windAlong: 0,
    });
    const along = DYNAMICS.g * Math.sin((theta * Math.PI) / 180);
    expect(end.kind).toBe("arrival");
    expect(end.t).toBeCloseTo(Math.sqrt((2 * S) / along), 9);
  });

  test("samples are in time order", () => {
    const { samples } = levelRide(SSF);
    for (let k = 1; k < samples.length; k++) {
      expect(samples[k].t).toBeGreaterThanOrEqual(samples[k - 1].t);
    }
  });
});

describe("ridePath — the frozen trajectory, anchor to anchor", () => {
  test("runs from A at (0, 0) to B at (L, h), strictly forward", () => {
    const path = trajectory(DESCENDING, 1000);
    const last = path.x.length - 1;
    expect([path.x[0], path.z[0]]).toEqual([0, 0]);
    expect([path.x[last], path.z[last]]).toEqual([DESCENDING.L, DESCENDING.h]);
    for (let k = 1; k < path.x.length; k++) expect(path.x[k]).toBeGreaterThan(path.x[k - 1]);
  });

  test("carries every Sweep Step's node", () => {
    const { steps } = sweep(LEVEL, Z4.in.P);
    const path = ridePath(steps, LEVEL);
    expect(path.x.length).toBe(steps.length + 2);
    expect(Array.from(path.x.subarray(1, -1))).toEqual(steps.map((step) => step.xD));
    expect(Array.from(path.z.subarray(1, -1))).toEqual(steps.map((step) => step.zD));
  });

  test("the tension at the trolley is Z4's √(H² + V²) on the node's below side", () => {
    const solved = sweepStep(LEVEL, Z4.in.P, Z4.out.sP);
    expect(solved.ok).toBe(true);
    if (!solved.ok) return;
    // Below the node, V = V₀ + w·s_P = −1091,00 + 10 · 50,25 = −588,50 N.
    const expected = Math.hypot(Z4.out.H, Z4.out.V0 + Z4.in.w * Z4.out.sP);
    const { T } = ridePath([solved.step], LEVEL);
    expect(Math.abs(T[1] - expected) / expected).toBeLessThan(TOLERANCE.solvedScalar);
  });

  test("refuses a traverse with no solved step", () => {
    expect(() => ridePath([], LEVEL)).toThrow(RangeError);
  });
});

describe("§12.1 — quasi-static validity, v/c with c = √(T/μ)", () => {
  test("the ratio is the fastest sample's speed over the wave speed where it is", () => {
    // c = √(1000 / 0,1) = 100 m/s everywhere, and the fastest sample runs at −25 m/s.
    const path: RidePath = {
      x: Float64Array.from([0, 100]),
      z: Float64Array.from([0, -10]),
      T: Float64Array.from([1000, 1000]),
    };
    const samples = [
      { t: 0, x: 0, z: 0, v: 0, a: 0 },
      { t: 1, x: 40, z: -4, v: 12, a: 0 },
      { t: 2, x: 60, z: -6, v: -25, a: 0 },
    ];
    expect(quasiStaticRatio(samples, path, 0.1)).toEqual({ ratio: 0.25, atX: 60 });
  });

  test("the tension is read between nodes, not at the nearest", () => {
    // T goes 400 → 1600 N, so at x = 50 it is 1000 N and c = 100 m/s.
    const path: RidePath = {
      x: Float64Array.from([0, 100]),
      z: Float64Array.from([0, 0]),
      T: Float64Array.from([400, 1600]),
    };
    const ratio = quasiStaticRatio([{ t: 0, x: 50, z: 0, v: 10, a: 0 }], path, 0.1).ratio;
    expect(ratio).toBeCloseTo(0.1, 12);
  });

  test("the warning threshold is §12.1's 0,2", () => {
    expect(DYNAMICS.quasiStaticLimit).toBe(0.2);
  });
});

describe("airDensity — §12.2's ISA model", () => {
  test("gives §12.2's three published densities", () => {
    // 101325 / (287,05 · 288,15) at sea level; §12.2 rounds the other two to 2 s.f.
    expect(airDensity(0)).toBeCloseTo(1.225, 3);
    expect(airDensity(1500)).toBeCloseTo(1.06, 2);
    expect(airDensity(2500)).toBeCloseTo(0.96, 2);
  });

  test("falls with altitude", () => {
    expect(airDensity(1400)).toBeLessThan(airDensity(500));
  });
});
