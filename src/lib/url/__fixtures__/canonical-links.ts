/**
 * Golden canonical links — one pinned string per encoding branch of `url/scenario.ts`, so the codec
 * refactors (total key tables, token tables, the decoder's move into `lib/url`) can prove they
 * changed no byte.
 *
 * Provenance: `[MEASURED]` in `testing.md`'s sense, tagged on every row. Each link is this app's own
 * output as of the date its tag names, written out here in § 7's canonical key order and checked
 * against the codec, not produced by it. A failing row after a refactor is a changed contract, not
 * a stale fixture.
 *
 * Plain data, no codec import: a fixture must never be re-derived from the code it checks. The
 * scenarios are literals for the same reason — they do not spread `FIRST_RUN_SCENARIO`, so a
 * defaults change cannot silently move a row.
 */

import type { Scenario, ScenarioDraft } from "@/lib/scenario/types.ts";

/** The encoding branches the table must cover; the test asserts none is left without a row. */
export const BRANCHES = [
  "steel",
  "textile",
  "manual",
  "trace",
  "driver-sag",
  "driver-tension",
  "driver-pretension",
  "driver-ratio",
  "driver-length",
  "override-mbf",
  "override-ea",
  "override-mu",
  "override-all",
  "regime-en15567",
  "regime-wsqld",
  "regime-acct10",
  "regime-ansi5",
  "regime-secours10",
  "use-perm",
  "use-tempo",
  "x-at-span-end",
  "x-clamped",
  "textile-blanks",
  "textile-diameter",
  "carrying-lines-absent",
  "carrying-lines-two",
  "carrying-lines-one-explicit",
  "tensioning-side-absent",
  "tensioning-side-b",
  "tensioning-side-a-explicit",
  "tensioning-device-absent",
  "tensioning-device-maestro-s",
  "tensioning-device-maestro-l",
  "tensioning-device-pulley-explicit",
  "wind-absent",
  "wind-speed-and-direction",
  "wind-direction-only",
  "wind-explicit-zero",
  "wind-without-positions",
  "wind-on-positions",
  "trace-stations-retired",
  "dynamics-absent",
  "dynamics-steel",
  "dynamics-textile",
  "dynamics-explicit-defaults",
  "dynamics-foreign-family",
  "positions-absent",
  "positions-both",
  "positions-one-anchor",
  "positions-with-trace",
  "positions-lone-coordinate",
  "positions-off-profil",
  "positions-off-profil-unplaced",
  "trace-full-profil",
  "anchor-zone-absent",
  "anchor-zone-off-default",
  "anchor-zone-default-explicit",
] as const;

export type Branch = (typeof BRANCHES)[number];

/** A Scenario and the one link that encodes it — asserted in both directions. */
export type CanonicalLinkFixture = {
  name: string;
  source:
    | typeof MEASURED
    | typeof MEASURED_83
    | typeof MEASURED_84
    | typeof MEASURED_85
    | typeof MEASURED_86
    | typeof MEASURED_87
    | typeof MEASURED_88
    | typeof MEASURED_89
    | typeof MEASURED_90
    | typeof MEASURED_103
    | typeof MEASURED_PH
    | typeof MEASURED_WIND
    | typeof MEASURED_106;
  covers: readonly Branch[];
  scenario: Scenario;
  link: string;
};

/**
 * A link that is decoded but not the encoder's output for what it decodes to: a clamped `x`
 * arrives as typed and leaves clamped, and a textile blank is a draft a `Scenario` cannot hold.
 * `canonical` is what the decoded scenario encodes back to, or `null` for a draft with blanks,
 * which has no encoding — those links are canonical as written.
 */
export type DecodeOnlyFixture = {
  name: string;
  source:
    | typeof MEASURED
    | typeof MEASURED_83
    | typeof MEASURED_84
    | typeof MEASURED_85
    | typeof MEASURED_86
    | typeof MEASURED_87
    | typeof MEASURED_88
    | typeof MEASURED_89
    | typeof MEASURED_90
    | typeof MEASURED_103
    | typeof MEASURED_PH
    | typeof MEASURED_106;
  covers: readonly Branch[];
  link: string;
} & ({ scenario: Scenario; canonical: string } | { scenario: ScenarioDraft; canonical: null });

const MEASURED = "[MEASURED] issue #34, codec as of 2026-11-07";
const MEASURED_83 = "[MEASURED] issue #83, codec as of 2026-11-08";
const MEASURED_84 = "[MEASURED] issue #84, codec as of 2026-11-08";
const MEASURED_85 = "[MEASURED] issue #85, codec as of 2026-11-08";
const MEASURED_86 = "[MEASURED] issue #86, codec as of 2026-11-08";
const MEASURED_87 = "[MEASURED] issue #87, codec as of 2026-11-08";
const MEASURED_88 = "[MEASURED] issue #88, codec as of 2026-11-08";
const MEASURED_89 = "[MEASURED] issue #89, codec as of 2026-11-08";
const MEASURED_90 = "[MEASURED] issue #90, codec as of 2026-11-08";
const MEASURED_103 = "[MEASURED] issue #103, codec as of 2026-11-08";
const MEASURED_PH = "[MEASURED] map #1's review of `ph`, codec as of 2026-11-09";
const MEASURED_WIND = "[MEASURED] geographic `wd`, codec as of 2026-11-09";
const MEASURED_106 = "[MEASURED] issue #106, codec as of 2026-11-09";

/** Three samples `(0,0) (50,-4) (100,-9)`, as `encodeP1` writes them — a 100 m profil. */
export const TRACE_P1 = "p1.AwCQTpBOAJ8G5wcA";

/**
 * The trial line's profil geo.admin of 2026-11-08 (#103) — 200 points over 435,2 m, from 1453,7 m
 * to 1438,7 m — as `encodeP1` wrote it from the recorded answer of `profile.json`.
 */
const GEOADMIN_P1 =
  "p1.yAEAuAO4A7gDpAO4A7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDpAO4A7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDuAOkA7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDuAOkA7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDuAOkA7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDuAOkA7gDuAO4A7gDuAO4A7gDpAO4A7gDuAO4A7gDuAOkA7gDuAO4A7gDuAO4A7gDpAO4A7gDuAO4A7gDuAOkA7gDuAO4A7gDuAO4A7gDpAO4A7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDpAO4A7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDpAO4A7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDpAO4A7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDuAOkA7gDuAO4A7gDuAO4A6QDuAO4A7gDuAO4A7gDuAOkA7gDuAO4A7gDuAO03xGfAdMCnwHnApcCswF30wKrArMBqwKLAecCiwHTAqsCnwGfAb8CgwK_AgDTAqsCqwJ3swGXAp8BqwLTAp8Bd5cClwKXArMBT4MCqwKLAasCnwGDAneXAoMCd2ODAu8Bd3fHAYMCY4MCd8cBY8cBswF3T7MB2wGzAWN3swFPswGLAWM7iwF3iwEAiwF3dydjO08AdwBPE087ACc7JwAnJzsAExMnKBQTEwAnADw8ExQoPCgAPDw8KAA8KFA8FFBQUFBkAGR4ZFAoeIwBZKABZMgBZMgBmAJkoAHwAdwBhAIAhAKYAlCsAowB8AGMAZgCrAKEAgCYAvABmAKMAWTwAYQCtAHcAYwB3AFk3AGYAgCEAtQCwAKMAaABkAP8AqAB_ALcAfwC8AHgA9QC1AIApAMC";

const STEEL: Scenario = {
  unit: "daN",
  usage: "PERMANENTE",
  regime: null,
  geometry: { source: "manual", L: 150, h: -18 },
  anchors: { zA: 12, zB: 12 },
  carryingLines: 1,
  tensioningSide: "A",
  tensioningDevice: "pulley",
  tightness: { mode: "sag", D_target: 6 },
  material: { family: "steel", d: 12, R0: 1770, construction: "iwrc" },
  terminations: {
    A: { id: "cosse-oeil-flamand", eta: 0.9 },
    B: { id: "cosse-oeil-flamand", eta: 0.9 },
  },
  rider: { mp: 120, hRider: 2.1, hClearMin: 1, anchorZone: 10, DAF: 1.2, xD: 75 },
  wind: { speedKmh: 0, directionDeg: 0 },
  dynamics: { CdA: 0.45, rho: null, F0: 15, kv: 1.5, mu: 0.015 },
  positions: { A: null, B: null },
};

/** The verified 2026-11-08 trace's two ends, as the geo.admin export spells them. */
const POSITION_A = { lat: 46.843556, lon: 6.525035 };
const POSITION_B = { lat: 46.846166, lon: 6.520783 };

const TEXTILE: Scenario = {
  ...STEEL,
  usage: "TEMPORAIRE",
  material: { family: "textile", ropeClass: "hmpe", MBL: 300000, mu: 0.16, k: 22 },
  terminations: {
    A: { id: "oeil-cousu-epissure", eta: 0.9 },
    B: { id: "epissure-longue-hmpe", eta: 0.85 },
  },
};

/** The textile baseline's keys from `fam` through `daf`, between which the ride's keys never sit. */
const TEXTILE_BODY =
  "fam=tx&mu=0.16&cls=hmpe&mbl=30000&k=22&ta=oeil&tb=epissure&na=0.9&nb=0.85&mp=120&hr=2.1&gm=1&daf=1.2";

/** What follows `za=12&zb=12&` through `fam=ac&d=12&r0=1770&cst=iwrc` on the steel baseline. */
const TAIL = "ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&x=75";
const STEEL_HEAD = "fam=ac&d=12&r0=1770&cst=iwrc";

const withMaterial = (overrides: { MBF?: number; EA?: number; mu?: number }): Scenario => ({
  ...STEEL,
  material: { family: "steel", d: 12, R0: 1770, construction: "iwrc", overrides },
});

const withRegime = (regime: NonNullable<Scenario["regime"]>): Scenario => ({ ...STEEL, regime });

export const CANONICAL_LINKS: readonly CanonicalLinkFixture[] = [
  {
    name: "first-run: steel, manual, sag driver, perm, no regime",
    source: MEASURED,
    // No `bp`, `cp`, `mt`, `ws`, `wd` or ride key, as before the keys existed: one Brin porteur,
    // Mise en tension at A, by mouflage, no wind, §12.2's constants.
    covers: [
      "steel",
      "manual",
      "driver-sag",
      "use-perm",
      "carrying-lines-absent",
      "tensioning-side-absent",
      "tensioning-device-absent",
      "wind-absent",
      "dynamics-absent",
      "positions-absent",
      "anchor-zone-absent",
    ],
    scenario: STEEL,
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "Zones d'ancrage of 25 m: `zan` after `gm`, before `daf`",
    source: MEASURED_106,
    covers: ["anchor-zone-off-default"],
    scenario: { ...STEEL, rider: { ...STEEL.rider, anchorZone: 25 } },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&zan=25&daf=1.2&x=75",
  },
  {
    name: "no Zone d'ancrage: `zan=0` is stated, since 0 is not the shipped 10 m",
    source: MEASURED_106,
    covers: ["anchor-zone-off-default"],
    scenario: { ...STEEL, rider: { ...STEEL.rider, anchorZone: 0 } },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&zan=0&daf=1.2&x=75",
  },
  {
    name: "two Brins porteurs: `bp=2`, after the driver",
    source: MEASURED_84,
    covers: ["carrying-lines-two"],
    scenario: { ...STEEL, carryingLines: 2 },
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&bp=2&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "tension driver, daN on the wire whatever u says",
    source: MEASURED,
    covers: ["driver-tension"],
    scenario: { ...STEEL, unit: "kN", tightness: { mode: "tension", H_target: 2535 } },
    link: `/?v=1&u=kN&use=perm&L=150&h=-18&za=12&zb=12&te=253.5&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "prétension driver: `tp` in daN, read at A",
    source: MEASURED_85,
    covers: ["driver-pretension"],
    scenario: { ...STEEL, tightness: { mode: "anchor", T_target: 2600 } },
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&tp=260&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "prétension read at B on two Brins porteurs: `tp`, `cp`, `bp` in that order",
    source: MEASURED_85,
    covers: ["driver-pretension", "tensioning-side-b", "carrying-lines-two"],
    scenario: {
      ...STEEL,
      carryingLines: 2,
      tensioningSide: "B",
      tightness: { mode: "anchor", T_target: 2600 },
    },
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&tp=260&cp=b&bp=2&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "the side rides on its own, beside a flèche driver",
    source: MEASURED_85,
    covers: ["tensioning-side-b"],
    scenario: { ...STEEL, tensioningSide: "B" },
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&cp=b&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "Maestro S on a rope: `mt=ms` after `bp`, before the family",
    source: MEASURED_86,
    covers: ["textile", "textile-diameter", "tensioning-device-maestro-s"],
    scenario: {
      ...TEXTILE,
      carryingLines: 2,
      tensioningDevice: "maestro-s",
      material: {
        family: "textile",
        ropeClass: "pa-en1891a",
        MBL: 31000,
        mu: 0.073,
        k: 1.27,
        d: 11,
      },
      terminations: {
        A: { id: "noeud-de-huit", eta: 0.6 },
        B: { id: "noeud-de-chaise", eta: 0.65 },
      },
    },
    link:
      "/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&bp=2&mt=ms&fam=tx&d=11&mu=0.073&cls=pa&mbl=3100&k=1.27" +
      "&ta=huit&tb=chaise&na=0.6&nb=0.65&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
  },
  {
    name: "Maestro L on a câble arrives as it is: `mt=ml` beside a steel family",
    source: MEASURED_86,
    covers: ["steel", "tensioning-device-maestro-l"],
    scenario: { ...STEEL, tensioningDevice: "maestro-l" },
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&mt=ml&${STEEL_HEAD}&${TAIL}`,
  },
  {
    // `wd` is the azimuth the wind comes from: 45° is a north-east wind. With no Positions it is
    // not applied, and it is still carried as given (ADR-0001).
    name: "wind of 50 km/h from the north-east, 45°, no Positions: `ws`, `wd` after `daf`, before `x`",
    source: MEASURED_87,
    covers: ["wind-speed-and-direction", "wind-without-positions"],
    scenario: { ...STEEL, wind: { speedKmh: 50, directionDeg: 45 } },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&ws=50&wd=45&x=75",
  },
  {
    name: "a direction without a speed is kept: `wd` alone",
    source: MEASURED_87,
    covers: ["wind-direction-only"],
    scenario: { ...STEEL, wind: { speedKmh: 0, directionDeg: 270 } },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&wd=270&x=75",
  },
  {
    name: "ride constants on a câble: `cda`, `mur`, `rho` after the wind, before `x`",
    source: MEASURED_89,
    covers: ["dynamics-steel"],
    scenario: {
      ...STEEL,
      wind: { speedKmh: 50, directionDeg: 45 },
      dynamics: { ...STEEL.dynamics, CdA: 0.5, rho: 1.069, mu: 0.02 },
    },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&ws=50&wd=45" +
      "&cda=0.5&mur=0.02&rho=1.069&x=75",
  },
  {
    name: "ride constants on a corde: `f0` in daN and `kv`, each alone off its default",
    source: MEASURED_89,
    covers: ["dynamics-textile"],
    scenario: {
      ...TEXTILE,
      dynamics: { ...TEXTILE.dynamics, F0: 20 },
    },
    link: `/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&${TEXTILE_BODY}&f0=2&x=75`,
  },
  {
    name: "the corde's `kv` without its `f0`",
    source: MEASURED_89,
    covers: ["dynamics-textile"],
    scenario: {
      ...TEXTILE,
      dynamics: { ...TEXTILE.dynamics, kv: 2.25 },
    },
    link: `/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&${TEXTILE_BODY}&kv=2.25&x=75`,
  },
  {
    name: "both Positions: four coordinates after `x`, before the profil",
    source: MEASURED_90,
    covers: ["positions-both"],
    scenario: { ...STEEL, positions: { A: POSITION_A, B: POSITION_B } },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}` +
      "&lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783",
  },
  {
    name: "the trial's west wind on the trial's Positions: `ws`, `wd` before `x`, the four after",
    source: MEASURED_WIND,
    covers: ["wind-on-positions"],
    scenario: {
      ...STEEL,
      wind: { speedKmh: 30, directionDeg: 264 },
      positions: { A: POSITION_A, B: POSITION_B },
    },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&ws=30&wd=264&x=75" +
      "&lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783",
  },
  {
    name: "only anchor B is known: its two coordinates, and none for A",
    source: MEASURED_90,
    covers: ["positions-one-anchor"],
    scenario: { ...STEEL, positions: { A: null, B: POSITION_B } },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}` +
      "&latb=46.846166&lonb=6.520783",
  },
  {
    name: "Positions on an imported profil: the coordinates travel beside `tr`",
    source: MEASURED_90,
    covers: ["positions-with-trace", "trace"],
    scenario: {
      ...STEEL,
      geometry: { source: "trace", trace: TRACE_P1 },
      positions: { A: POSITION_A, B: POSITION_B },
    },
    link:
      `/?v=1&u=daN&use=perm&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}` +
      `&lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783&tr=${TRACE_P1}`,
  },
  {
    name: "Position B typed off the profil: `ph` says it no longer runs between them",
    source: MEASURED_PH,
    covers: ["positions-off-profil", "positions-with-trace", "trace"],
    scenario: {
      ...STEEL,
      geometry: { source: "trace", trace: TRACE_P1, offPositions: true },
      positions: { A: POSITION_A, B: { lat: 46.858, lon: POSITION_B.lon } },
    },
    link:
      `/?v=1&u=daN&use=perm&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}` +
      `&lata=46.843556&lona=6.525035&latb=46.858&lonb=6.520783&ph=1&tr=${TRACE_P1}`,
  },
  {
    name: "a profil geo.admin: its 200 points and the two Positions it was loaded between",
    source: MEASURED_103,
    covers: ["trace-full-profil", "positions-with-trace", "trace"],
    scenario: {
      ...STEEL,
      geometry: { source: "trace", trace: GEOADMIN_P1 },
      positions: { A: POSITION_A, B: POSITION_B },
    },
    link:
      `/?v=1&u=daN&use=perm&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}` +
      `&lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783&tr=${GEOADMIN_P1}`,
  },
  {
    name: "ratio driver, kgf display",
    source: MEASURED,
    covers: ["driver-ratio"],
    scenario: { ...STEEL, unit: "kgf", tightness: { mode: "ratio", ratio: 0.82 } },
    link: `/?v=1&u=kgf&use=perm&L=150&h=-18&za=12&zb=12&vr=0.82&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "length driver",
    source: MEASURED,
    covers: ["driver-length"],
    scenario: { ...STEEL, tightness: { mode: "length", L0: 151.644 } },
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&lo=151.644&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "steel override: MBF alone",
    source: MEASURED,
    covers: ["override-mbf"],
    scenario: withMaterial({ MBF: 90740 }),
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&mbf=9074&${TAIL}`,
  },
  {
    name: "steel override: EA alone",
    source: MEASURED,
    covers: ["override-ea"],
    scenario: withMaterial({ EA: 69000000 }),
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&ea=6900000&${TAIL}`,
  },
  {
    name: "steel override: mu alone",
    source: MEASURED,
    covers: ["override-mu"],
    scenario: withMaterial({ mu: 0.5465 }),
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&mu=0.5465&${TAIL}`,
  },
  {
    name: "steel overrides: MBF, EA and mu together, fibre-core construction",
    source: MEASURED,
    covers: ["override-all"],
    scenario: {
      ...STEEL,
      material: {
        family: "steel",
        d: 12,
        R0: 1960,
        construction: "fibre-core",
        overrides: { MBF: 90740, EA: 69000000, mu: 0.5465 },
      },
    },
    link:
      "/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&fam=ac&d=12&r0=1960&cst=tc" +
      `&mbf=9074&ea=6900000&mu=0.5465&${TAIL}`,
  },
  ...(["en15567", "wsqld", "acct10", "ansi5", "secours10"] as const).map(
    (regime): CanonicalLinkFixture => ({
      name: `regime ${regime}`,
      source: MEASURED,
      covers: [`regime-${regime}`],
      scenario: withRegime(regime),
      link: `/?v=1&u=daN&use=perm&reg=${regime}&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}`,
    }),
  ),
  {
    name: "use tempo",
    source: MEASURED,
    covers: ["use-tempo"],
    scenario: { ...STEEL, usage: "TEMPORAIRE" },
    link: `/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "steel terminations: manchon and coin, uneven anchors",
    source: MEASURED,
    covers: ["steel"],
    scenario: {
      ...STEEL,
      anchors: { zA: 14, zB: 9.5 },
      terminations: {
        A: { id: "manchon-metal-resine", eta: 1 },
        B: { id: "manchon-a-coin", eta: 0.8 },
      },
    },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=14&zb=9.5&fl=6&${STEEL_HEAD}` +
      "&ta=manchon&tb=coin&na=1&nb=0.8&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
  },
  {
    name: "steel terminations: serre-cables and the steel epissure",
    source: MEASURED,
    covers: ["steel"],
    scenario: {
      ...STEEL,
      terminations: {
        A: { id: "serre-cables-etrier", eta: 0.8 },
        B: { id: "epissure", eta: 0.9 },
      },
    },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=serre&tb=epissure&na=0.8&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
  },
  {
    name: "steel termination: attelage sans tension",
    source: MEASURED,
    covers: ["steel"],
    scenario: {
      ...STEEL,
      terminations: {
        A: { id: "attelage-sans-tension", eta: 1 },
        B: { id: "cosse-oeil-flamand", eta: 0.9 },
      },
    },
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=attelage&tb=cosse&na=1&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
  },
  {
    name: "rider at the far end of the span, garde min. disabled",
    source: MEASURED,
    covers: ["x-at-span-end"],
    scenario: { ...STEEL, rider: { ...STEEL.rider, xD: 150, hClearMin: 0 } },
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=0&daf=1.2&x=150`,
  },
  {
    name: "imported trace geometry: the profil taken whole, no `L`/`h` and no stations",
    source: MEASURED_88,
    covers: ["trace", "steel"],
    scenario: { ...STEEL, geometry: { source: "trace", trace: TRACE_P1 } },
    link: `/?v=1&u=daN&use=perm&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}&tr=${TRACE_P1}`,
  },
  {
    name: "textile hmpe: sag driver, tempo, oeil and epissure",
    source: MEASURED,
    covers: ["textile", "use-tempo"],
    scenario: TEXTILE,
    link:
      "/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&fam=tx&mu=0.16&cls=hmpe&mbl=30000&k=22" +
      "&ta=oeil&tb=epissure&na=0.9&nb=0.85&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
  },
  {
    name: "textile Courant Bandit 11 mm preset: diameter rides on the `d` key",
    source: MEASURED_83,
    covers: ["textile", "textile-diameter"],
    scenario: {
      ...TEXTILE,
      material: {
        family: "textile",
        ropeClass: "pa-en1891a",
        MBL: 31000,
        mu: 0.073,
        k: 1.27,
        d: 11,
      },
      terminations: {
        A: { id: "noeud-de-huit", eta: 0.6 },
        B: { id: "noeud-de-chaise", eta: 0.65 },
      },
    },
    link:
      "/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&fam=tx&d=11&mu=0.073&cls=pa&mbl=3100&k=1.27" +
      "&ta=huit&tb=chaise&na=0.6&nb=0.65&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
  },
  {
    name: "textile polyamide: huit and chaise",
    source: MEASURED,
    covers: ["textile"],
    scenario: {
      ...TEXTILE,
      material: { family: "textile", ropeClass: "pa-en1891a", MBL: 300000, mu: 0.082, k: 1.5 },
      terminations: {
        A: { id: "noeud-de-huit", eta: 0.6 },
        B: { id: "noeud-de-chaise", eta: 0.65 },
      },
    },
    link:
      "/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&fam=tx&mu=0.082&cls=pa&mbl=30000&k=1.5" +
      "&ta=huit&tb=chaise&na=0.6&nb=0.65&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
  },
  {
    name: "textile polyester on a trace, tension driver, attelage",
    source: MEASURED_88,
    covers: ["textile", "trace", "driver-tension"],
    scenario: {
      ...TEXTILE,
      geometry: { source: "trace", trace: TRACE_P1 },
      tightness: { mode: "tension", H_target: 1500 },
      material: { family: "textile", ropeClass: "polyester", MBL: 250000, mu: 0.07, k: 12 },
      terminations: {
        A: { id: "attelage-sans-tension", eta: 1 },
        B: { id: "oeil-cousu-epissure", eta: 0.9 },
      },
    },
    link:
      "/?v=1&u=daN&use=tempo&za=12&zb=12&te=150&fam=tx&mu=0.07&cls=pes&mbl=25000&k=12" +
      `&ta=attelage&tb=oeil&na=1&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&x=75&tr=${TRACE_P1}`,
  },
];

const CLAMPED = CANONICAL_LINKS.find((fixture) => fixture.covers.includes("x-at-span-end"));
if (CLAMPED === undefined)
  throw new Error("the far-end fixture the clamped rows decode to is missing");

export const DECODE_ONLY_LINKS: readonly DecodeOnlyFixture[] = [
  {
    name: "x past the span is brought back to the far end",
    source: MEASURED,
    covers: ["x-clamped"],
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=0&daf=1.2&x=200`,
    scenario: CLAMPED.scenario,
    canonical: CLAMPED.link,
  },
  {
    name: "x below zero is brought back to the near end",
    source: MEASURED,
    covers: ["x-clamped"],
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&x=-5`,
    scenario: { ...STEEL, rider: { ...STEEL.rider, xD: 0 } },
    canonical:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&x=0",
  },
  {
    name: "`zan=10` is the shipped Zones d'ancrage, and the canonical link says so by omitting it",
    source: MEASURED_106,
    covers: ["anchor-zone-default-explicit"],
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&zan=10&daf=1.2&x=75",
    scenario: STEEL,
    canonical: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "`bp=1` is one Brin porteur, and the canonical link says so by omitting it",
    source: MEASURED_84,
    covers: ["carrying-lines-one-explicit"],
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&bp=1&${STEEL_HEAD}&${TAIL}`,
    scenario: STEEL,
    canonical: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "`cp=a` is the Mise en tension at A, and the canonical link says so by omitting it",
    source: MEASURED_85,
    covers: ["tensioning-side-a-explicit"],
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&tp=260&cp=a&${STEEL_HEAD}&${TAIL}`,
    scenario: { ...STEEL, tightness: { mode: "anchor", T_target: 2600 } },
    canonical: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&tp=260&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "`ws=0&wd=0` is no wind, and the canonical link says so by omitting both",
    source: MEASURED_87,
    covers: ["wind-explicit-zero"],
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&ws=0&wd=0&x=75",
    scenario: STEEL,
    canonical: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "§12.2's constants typed out are the defaults, and the canonical link omits them",
    source: MEASURED_89,
    covers: ["dynamics-explicit-defaults"],
    link:
      `/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&${TEXTILE_BODY}` +
      "&cda=0.45&f0=1.5&kv=1.5&x=75",
    scenario: TEXTILE,
    canonical: `/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&${TEXTILE_BODY}&x=75`,
  },
  {
    name: "a corde's `f0` beside a câble is out of the active configuration, and leaves",
    source: MEASURED_89,
    covers: ["dynamics-foreign-family"],
    link:
      `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}` +
      "&ta=cosse&tb=cosse&na=0.9&nb=0.9&mp=120&hr=2.1&gm=1&daf=1.2&f0=2&kv=3&x=75",
    scenario: STEEL,
    canonical: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "a latitude without its longitude is dropped, and the Position stays unknown",
    source: MEASURED_90,
    covers: ["positions-lone-coordinate"],
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}&lata=46.843556`,
    scenario: STEEL,
    canonical: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "`mt=mou` is the mouflage, and the canonical link says so by omitting it",
    source: MEASURED_86,
    covers: ["tensioning-device-pulley-explicit"],
    link: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&mt=mou&${STEEL_HEAD}&${TAIL}`,
    scenario: STEEL,
    canonical: `/?v=1&u=daN&use=perm&L=150&h=-18&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}`,
  },
  {
    name: "a link from before #88 keeps its profil whole: `sa` and `sb` are unknown keys",
    source: MEASURED_88,
    covers: ["trace-stations-retired"],
    link: `/?v=1&u=daN&use=perm&sa=10&sb=90&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}&tr=${TRACE_P1}`,
    scenario: { ...STEEL, geometry: { source: "trace", trace: TRACE_P1 } },
    canonical: `/?v=1&u=daN&use=perm&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}&tr=${TRACE_P1}`,
  },
  {
    name: "`ph` with one Position unknown has no line to run off, and leaves",
    source: MEASURED_PH,
    covers: ["positions-off-profil-unplaced"],
    link:
      `/?v=1&u=daN&use=perm&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}` +
      `&lata=46.843556&lona=6.525035&ph=1&tr=${TRACE_P1}`,
    scenario: {
      ...STEEL,
      geometry: { source: "trace", trace: TRACE_P1 },
      positions: { A: POSITION_A, B: null },
    },
    canonical:
      `/?v=1&u=daN&use=perm&za=12&zb=12&fl=6&${STEEL_HEAD}&${TAIL}` +
      `&lata=46.843556&lona=6.525035&tr=${TRACE_P1}`,
  },
  {
    name: "textile with MBL and mu left blank",
    source: MEASURED,
    covers: ["textile", "textile-blanks"],
    link:
      "/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&fam=tx&cls=hmpe&k=22" +
      "&ta=oeil&tb=epissure&na=0.9&nb=0.85&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
    scenario: {
      ...TEXTILE,
      material: { family: "textile", ropeClass: "hmpe", MBL: null, mu: null, k: 22 },
    },
    canonical: null,
  },
  {
    name: "textile polyester with only MBL typed",
    source: MEASURED,
    covers: ["textile", "textile-blanks"],
    link:
      "/?v=1&u=daN&use=tempo&L=150&h=-18&za=12&zb=12&fl=6&fam=tx&cls=pes&mbl=25000" +
      "&ta=oeil&tb=epissure&na=0.9&nb=0.85&mp=120&hr=2.1&gm=1&daf=1.2&x=75",
    scenario: {
      ...TEXTILE,
      material: { family: "textile", ropeClass: "polyester", MBL: 250000, mu: null, k: null },
    },
    canonical: null,
  },
];
