/**
 * THROWAWAY — fabricated scenarios for the ticket-07 prototype.
 * Geometry numbers marked Z* come from docs/simulation-theory.md §15 (illustrative test
 * values, NOT material recommendations). Terrain profiles are invented to exercise the
 * chart; nothing here is a default for the real app (that is ticket 14's job).
 */
import type { SpanInput, Terrain } from "./solver.ts";

export type Scenario = {
  key: string;
  label: string;
  note: string;
  span: SpanInput;
  /** Rider design load, N. Z4 uses 1177 N. */
  P: number;
  hRider: number;
  terrain: Terrain;
};

/** Terrain as a straight line between the two anchor bases (ticket 04's manual ground). */
function straightGround(L: number, zA: number, zB: number, n = 2): Terrain {
  const xs = new Float64Array(n);
  const zs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    xs[i] = f * L;
    zs[i] = zA + f * (zB - zA);
  }
  return { kind: "profile", xs, zs };
}

/** Fabricated rolling terrain — stands in for a GPX import until ticket 06 lands. */
function rolling(
  L: number,
  zA: number,
  zB: number,
  bumps: Array<{ at: number; height: number; width: number }>,
  n = 300,
): Terrain {
  const xs = new Float64Array(n);
  const zs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = (L * i) / (n - 1);
    const f = x / L;
    let z = zA + f * (zB - zA);
    for (const b of bumps) {
      const u = (x - b.at * L) / (b.width * L);
      z += b.height * Math.exp(-u * u * 4);
    }
    xs[i] = x;
    zs[i] = z;
  }
  return { kind: "profile", xs, zs };
}

export const SCENARIOS: Scenario[] = [
  {
    key: "z1",
    label: "Z1 · 100 m plat",
    note: "§15 Z1 : L 100 m, h 0, L₀ 100,5 m, w 5 N/m, EA 10 MN. Sol droit 8 m sous les ancrages.",
    span: { L: 100, h: 0, L0: 100.5, w: 5, EA: 1e7 },
    P: 1177,
    hRider: 2.1,
    terrain: straightGround(100, -8, -8),
  },
  {
    key: "z3",
    label: "Z3 · 120 m incliné",
    note: "§15 Z3 : L 120 m, h −15 m (B plus bas), L₀ 122 m. Terrain bosselé sous la portée.",
    span: { L: 120, h: -15, L0: 122, w: 5, EA: 1e7 },
    P: 1177,
    hRider: 2.1,
    terrain: rolling(120, -18.8, -28.8, [{ at: 0.55, height: 3.2, width: 0.25 }]),
  },
  {
    key: "short",
    label: "50 m court",
    note: "Bas de la plage v1 : L 50 m, h −4 m, ligne tendue (L₀ 50,08 m).",
    span: { L: 50, h: -4, L0: 50.08, w: 5, EA: 1e7 },
    P: 1177,
    hRider: 2.1,
    terrain: rolling(50, -6, -9, [{ at: 0.6, height: 1.4, width: 0.3 }]),
  },
  {
    key: "long",
    label: "1500 m long",
    note: "Haut de la plage v1 : câble acier 12 mm illustratif (w 5,36 N/m, EA 6,9 MN), L₀ 1504,5 m, h −120 m.",
    span: { L: 1500, h: -120, L0: 1504.5, w: 5.36, EA: 6.9e6 },
    P: 1177,
    hRider: 2.1,
    terrain: rolling(1500, -103, -213, [
      { at: 0.35, height: 18, width: 0.18 },
      { at: 0.62, height: 26, width: 0.12 },
      { at: 0.85, height: -14, width: 0.2 },
    ]),
  },
  {
    key: "taut",
    label: "1000 m quasi tendu",
    note: "Cas mal conditionné (§4.3 near-taut) : L 1000 m, h −50 m, L₀ 1001,45 m. Sert au chronométrage.",
    span: { L: 1000, h: -50, L0: 1001.45, w: 5.36, EA: 6.9e6 },
    P: 1177,
    hRider: 2.1,
    terrain: rolling(1000, -52, -112, [{ at: 0.45, height: 12, width: 0.2 }]),
  },
  {
    key: "slack",
    label: "1000 m très mou",
    note: "Cas mal conditionné (§4.3 deep slack) : L 1000 m, h −50 m, L₀ 1050 m. Sert au chronométrage.",
    span: { L: 1000, h: -50, L0: 1050, w: 5.36, EA: 6.9e6 },
    P: 1177,
    hRider: 2.1,
    terrain: rolling(1000, -160, -220, [{ at: 0.45, height: 12, width: 0.2 }]),
  },
  {
    key: "fail",
    label: "200 m — défaut de garde",
    note: "Fabriqué pour échouer : bosse de terrain sous le point bas. h_clear passe sous 0.",
    span: { L: 200, h: -10, L0: 202.2, w: 5, EA: 1e7 },
    P: 1177,
    hRider: 2.1,
    terrain: rolling(200, -23.3, -35.3, [
      { at: 0.5, height: 9.5, width: 0.16 },
      { at: 0.78, height: 3, width: 0.2 },
    ]),
  },
];

export function scenarioByKey(key: string): Scenario {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0];
}
