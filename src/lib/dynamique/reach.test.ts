import { describe, expect, test } from "vitest";

import type { ReachProposal, ReachReading, ReachRefusal, RideReach } from "@/lib/scenario/reach.ts";
import type { Scenario, ScenarioDraft } from "@/lib/scenario/types.ts";

import { FIELD_ACCESS } from "@/lib/rail/values.ts";
import { REACH } from "@/lib/scenario/reach.ts";
import { traverseInputs, traverseScenario } from "@/lib/scenario/traverse.ts";
import { deriveUnloaded, unloadedInputs } from "@/lib/scenario/unloaded.ts";
import { completeFromDefaults, scenarioToSearch, searchToScenario } from "@/lib/url/scenario.ts";
import { canonicalLink, parseLinkSearch, validateSearch } from "@/lib/url/schema.ts";
import { exactTermsIn, proscribedIn } from "@/lib/vocabulary/labels.ts";

import type { ReachOutputs, ReachWording } from "./reach.ts";

import { DUE_NORTH, ON_PROFIL, PROFIL, ridesUnder, SHIPPED } from "./__fixtures__/rides.ts";
import { ESTIMATE, REACH_COPY } from "./copy.ts";
import { reachOutputs, reachProposal, reachSearch } from "./reach.ts";

/**
 * The proposal of a height for B, in words (#121). The readings worded here are **written by hand**
 * — a height, two rides, a refusal — so each sentence is checked against figures this file chose,
 * not against a search. The search itself is `@/lib/scenario/reach.test.ts`'s.
 */

const L = 150;

/** A ride that turns back at `maxX` and rests at `stopX`. */
function short(maxX: number, stopX: number): RideReach {
  return { maxX, remaining: L - maxX, reachesB: false, stopX, end: "stop" };
}

const AT_B: RideReach = { maxX: L, remaining: 0, reachesB: true, stopX: null, end: "arrival" };

/**
 * The shipped line as the search reads it: the passager arrives, B 12 m up, 18 m under A, the
 * line laid at 2634 N at A — and, lighter by the weight of 18 m of line, 2494 N at B.
 */
const CURRENT = {
  windy: AT_B,
  calm: AT_B,
  h: -18,
  zB: 12,
  L0: 151.64,
  Tvide: { TA: 2634, TB: 2494 },
} as const;

const CANDIDATE: ReachProposal = {
  deltaB: 17.6,
  h: -0.4,
  zB: 29.6,
  L0: 150.54,
  Tvide: { TA: 2634, TB: 2631 },
  windy: short(134.57, 79.84),
  calm: short(134.57, 79.84),
  clearance: 7.667,
  quasiStatic: false,
};

function reading(
  outcome: ReachReading["outcome"],
  over: Partial<Omit<ReachReading, "outcome">> = {},
): ReachReading {
  return {
    estimate: true,
    target: 90,
    L,
    targetX: 135,
    windless: true,
    current: CURRENT,
    outcome,
    ...over,
  };
}

const proposed = (over: Partial<ReachProposal> = {}) =>
  ({ ok: true, proposal: { ...CANDIDATE, ...over } }) as const;
const refused = (refusal: ReachRefusal) => ({ ok: false, refusal }) as const;

/** The shipped wording: the tension de pose drives, read at A, forces in daN. */
const WORDING: ReachWording = {
  tightness: SHIPPED.tightness,
  unit: SHIPPED.unit,
  tensioningSide: SHIPPED.tensioningSide,
};

function worded(
  outcome: ReachReading["outcome"],
  over: Partial<Omit<ReachReading, "outcome">> = {},
  wording = WORDING,
) {
  return reachOutputs(reading(outcome, over), wording);
}

function proposalOf(outputs: ReachOutputs) {
  if (outputs.proposal === null) throw new Error(`no proposal: ${outputs.refusal}`);
  return outputs.proposal;
}

/** Every sentence an answer prints, the tiles' included. */
function sentences({ target, current, proposal, refusal }: ReachOutputs): string[] {
  return [
    target,
    current,
    ...(refusal === null ? [] : [refusal]),
    ...(proposal === null
      ? []
      : [
          `${proposal.headline.action} ${proposal.headline.amount ?? ""}`,
          proposal.note,
          ...proposal.rides.flatMap((ride) => [
            ride.label,
            ride.farthest,
            ride.share ?? "",
            ride.remaining,
            ride.stop,
          ]),
          ...proposal.assumptions,
          ...proposal.warnings,
        ]),
  ];
}

describe("the proposal is a variation of B's height, in words", () => {
  test("a positive variation is « Monter B de », with the amount unsigned", () => {
    expect(proposalOf(worded(proposed())).headline).toEqual({
      action: "Monter B de",
      amount: "17,6 m",
    });
  });

  test("a negative variation is « Descendre B de », and the verb alone carries the direction", () => {
    const lowered = proposed({ deltaB: -0.4, h: -18.4, zB: 11.6 });
    expect(proposalOf(worded(lowered)).headline).toEqual({
      action: "Descendre B de",
      amount: "0,4 m",
    });
  });

  test("no variation is said as such, with no amount", () => {
    const kept = proposed({ deltaB: 0, h: -18, zB: 12 });
    expect(proposalOf(worded(kept)).headline).toEqual({
      action: "Garder B à cette hauteur",
      amount: null,
    });
  });

  test("the target is named with its share of the span and its abscissa, and where it is set", () => {
    expect(worded(proposed()).target).toBe(
      "Cible : point le plus loin à 90 % de la portée, soit à x 135,0 m. Elle se règle sur la Page Avancé.",
    );
    expect(worded(proposed(), { target: 75, targetX: 112.5 }).target).toContain(
      "à 75 % de la portée, soit à x 112,5 m",
    );
  });

  test("a proposal and a refusal never stand together", () => {
    const given = worded(proposed());
    expect(given.refusal).toBeNull();
    const withheld = worded(refused({ kind: "unjudged" }));
    expect(withheld.proposal).toBeNull();
    expect(withheld.refusal).not.toBeNull();
  });
});

describe("a ride is read by three values that are not one another", () => {
  test("the farthest point, what is left to B and the Point d'arrêt each have their figure", () => {
    const [ride] = proposalOf(worded(proposed())).rides;
    expect(ride).toEqual({
      id: "windy",
      label: "Avec la hauteur proposée",
      reachesB: false,
      farthest: "à x 134,6 m",
      share: "89,7 % de la portée",
      remaining: "15,4 m",
      stopsShort: true,
      stop: "à x 79,8 m",
    });
  });

  test("a ride that reaches B has no share, nothing left, and says so in words", () => {
    const blown = proposed({ windy: short(134.96, 92.65), calm: AT_B });
    const [, calm] = proposalOf(worded(blown, { windless: false })).rides;
    expect(calm).toMatchObject({
      reachesB: true,
      farthest: "arrive au bout",
      share: null,
      remaining: "aucune : B est atteint",
      stopsShort: false,
      stop: "arrive au bout",
    });
  });

  test("a ride that reached B and came back keeps its Point d'arrêt beside « arrive au bout »", () => {
    const bounced: RideReach = { ...AT_B, stopX: 85, end: "stop" };
    const [, calm] = proposalOf(worded(proposed({ calm: bounced }), { windless: false })).rides;
    expect(calm).toMatchObject({
      farthest: "arrive au bout",
      remaining: "aucune : B est atteint",
      stopsShort: true,
      stop: "à x 85,0 m",
    });
  });

  test("a swing that never settles has a farthest point and no Point d'arrêt", () => {
    const swinging: RideReach = { ...short(120, 0), stopX: null, end: "unsettled" };
    const [ride] = proposalOf(worded(proposed({ windy: swinging, calm: swinging }))).rides;
    expect(ride).toMatchObject({
      farthest: "à x 120,0 m",
      remaining: "30,0 m",
      stopsShort: false,
      stop: "oscille sans s'arrêter",
    });
  });

  test("the Scenario as it stands is read the same way, in one sentence", () => {
    expect(worded(proposed()).current).toBe("Scénario actuel : le passager arrive au bout.");
    const level = { ...CURRENT, windy: short(132.83, 78.79), calm: short(132.83, 78.79) };
    expect(worded(proposed(), { current: level }).current).toBe(
      "Scénario actuel : point le plus loin à x 132,8 m (88,6 % de la portée), 17,2 m avant B ; point d'arrêt à x 78,8 m.",
    );
  });
});

describe("the Vent entered, and the comparison without it", () => {
  test("without wind there is one ride, and nothing is called a comparison", () => {
    const { rides } = proposalOf(worded(proposed()));
    expect(rides.map(({ label }) => label)).toEqual(["Avec la hauteur proposée"]);
  });

  test("with a wind, the ride the target is held to comes first and the other is named a comparison", () => {
    const blown = proposed({ windy: short(134.74, 73.54), calm: short(122.11, 72.07) });
    const out = worded(blown, { windless: false });
    expect(proposalOf(out).rides.map(({ id, label }) => [id, label])).toEqual([
      ["windy", "Avec la hauteur proposée et le vent saisi"],
      ["calm", "Avec la hauteur proposée, sans vent — comparaison"],
    ]);
    expect(proposalOf(out).rides[1].farthest).toBe("à x 122,1 m");
    expect(out.current).toBe("Scénario actuel, avec le vent saisi : le passager arrive au bout.");
  });

  test("a height that holds by the wind alone carries a third warning", () => {
    const held = proposed({ windy: short(134.96, 92.65), calm: AT_B });
    expect(proposalOf(worded(held, { windless: false })).warnings).toContain(
      "Sans vent, le passager arrive au bout à cette hauteur de B : la proposition ne tient que par le vent saisi.",
    );
    // Not said of a comparison that stays short, nor where no wind pushes.
    const pushed = proposed({ windy: short(134.74, 73.54), calm: short(122.11, 72.07) });
    expect(proposalOf(worded(pushed, { windless: false })).warnings).toHaveLength(2);
    expect(proposalOf(worded(proposed())).warnings).toHaveLength(2);
  });
});

describe("every proposal says what it is and what it stands on", () => {
  const variations = [
    proposed(),
    proposed({ deltaB: -0.4, h: -18.4, zB: 11.6 }),
    proposed({ deltaB: 0, h: -18, zB: 12 }),
  ];

  test("it carries « estimation », and that nothing is applied", () => {
    for (const outcome of variations) {
      const { note } = proposalOf(worded(outcome));
      expect(note).toBe("estimation · rien n'est appliqué");
      expect(note).toContain(ESTIMATE);
    }
  });

  test("it never promises a stop before B or the absence of a collision", () => {
    for (const outcome of variations) {
      const [first] = proposalOf(worded(outcome)).warnings;
      expect(first).toBe(
        "Estimation, pas une garantie : elle ne promet ni que le passager s'arrête avant B, ni l'absence de collision.",
      );
    }
  });

  test("it warns that a B really moved stands on another ground, to be checked and computed again", () => {
    for (const outcome of variations) {
      const [, second] = proposalOf(worded(outcome)).warnings;
      expect(second).toBe(
        "Déplacer réellement B peut changer le terrain sous la ligne : le nouvel emplacement et son profil sont à vérifier, puis tout le calcul à refaire avec eux.",
      );
    }
  });

  test("A fixed, B moved in place: both heights before and after, and the profil left alone", () => {
    expect(proposalOf(worded(proposed())).assumptions[0]).toBe(
      "A fixe, B monté sur place : hauteur d'ancrage B 12,0 m → 29,6 m, dénivelé −18,0 m → −0,4 m. Le profil et les positions ne bougent pas.",
    );
    const lowered = proposed({ deltaB: -0.4, h: -18.4, zB: 11.6 });
    expect(proposalOf(worded(lowered)).assumptions[0]).toBe(
      "A fixe, B descendu sur place : hauteur d'ancrage B 12,0 m → 11,6 m, dénivelé −18,0 m → −18,4 m. Le profil et les positions ne bougent pas.",
    );
    const kept = proposed({ deltaB: 0, h: -18, zB: 12 });
    expect(proposalOf(worded(kept)).assumptions[0]).toBe(
      "A et B là où ils sont : hauteur d'ancrage B 12,0 m, dénivelé −18,0 m.",
    );
  });

  test("the Tightness Driver is named as kept, with what it lets move", () => {
    const second = (wording: Partial<ReachWording>, over: Partial<ReachProposal> = {}) =>
      proposalOf(worded(proposed(over), {}, { ...WORDING, ...wording })).assumptions[1];
    // The shipped driver, 2634 N at the anchor: the length follows B, the tension is the driver's.
    expect(second({})).toBe(
      "Tension de pose conservée : 263,4 daN ; longueur à vide 151,64 m → 150,54 m.",
    );
    // The two drivers only Avancé offers are not named on a simplified Page, nor is their value.
    for (const tightness of [
      { mode: "tension", H_target: 2535 },
      { mode: "ratio", ratio: 0.5 },
    ] as const) {
      expect(second({ tightness }, { Tvide: { TA: 2700, TB: 2697 } })).toBe(
        "Tension réglée sur la Page Avancé conservée ; longueur à vide 151,64 m → 150,54 m ; tension de pose 263,4 daN → 270,0 daN.",
      );
    }
  });

  test("another driver kept: the tension de pose it leaves on the line is read before and after", () => {
    const second = (wording: Partial<ReachWording>, over: Partial<ReachProposal> = {}) =>
      proposalOf(worded(proposed(over), {}, { ...WORDING, ...wording })).assumptions[1];
    // A typed length is not re-cut: B's whole move goes into the tension, and it is a figure.
    const cut = { tightness: { mode: "length", L0: 151.64 } } as const;
    const taut = { L0: 151.64, Tvide: { TA: 9120, TB: 9117 } };
    expect(second(cut, taut)).toBe(
      "Longueur à vide conservée : 151,64 m ; tension de pose 263,4 daN → 912,0 daN.",
    );
    // A flèche held: the length and the tension both follow B.
    const sag = { tightness: { mode: "sag", D_target: 6 } } as const;
    expect(second(sag, { Tvide: { TA: 2580, TB: 2577 } })).toBe(
      "Flèche conservée : 6,00 m ; longueur à vide 151,64 m → 150,54 m ; tension de pose 263,4 daN → 258,0 daN.",
    );
    // Read at the anchor that carries the Mise en tension, as the Rail's own row is.
    expect(second({ ...cut, tensioningSide: "B" }, taut)).toBe(
      "Longueur à vide conservée : 151,64 m ; tension de pose 249,4 daN → 911,7 daN.",
    );
    // In the unit the selector holds, and printed once where the two read alike.
    expect(second({ ...cut, unit: "kN" }, taut)).toContain("tension de pose 2,634 kN → 9,120 kN");
    expect(second(cut, { L0: 151.64, Tvide: { TA: 2634.2, TB: 2494 } })).toBe(
      "Longueur à vide conservée : 151,64 m ; tension de pose 263,4 daN.",
    );
  });

  test("the force follows the unit selector, and two lengths that print alike are printed once", () => {
    const inKN = proposalOf(worded(proposed(), {}, { ...WORDING, unit: "kN" })).assumptions[1];
    expect(inKN).toContain("2,634 kN");
    const same = proposalOf(worded(proposed({ L0: 151.641 }))).assumptions[1];
    expect(same).toBe("Tension de pose conservée : 263,4 daN ; longueur à vide 151,64 m.");
  });

  test("the rest of the Scenario is the Scenario's, the garde is on the profil as known, nothing is changed", () => {
    const [, , kept, garde, untouched] = proposalOf(worded(proposed())).assumptions;
    expect(kept).toBe(
      "Masse du passager, vent saisi et réglages de la Page Avancé : ceux du scénario.",
    );
    expect(garde).toBe(
      "Garde au sol sur le profil connu, hors zones d'ancrage : 7,67 m au plus près.",
    );
    expect(untouched).toBe(
      "Rien n'est modifié : ni les ancrages, ni le scénario. Ni le Verdict ni la garde exigée ne sont rejugés ici.",
    );
  });

  test("a target above the measured steady bound says how little it takes to reach B", () => {
    const high =
      "Cible haute : au-delà de 93 % de la portée, un vent arrière de 10 km/h non saisi ou une traînée plus faible ont suffi, sur certaines des lignes essayées, à amener le passager jusqu'à B.";
    expect(REACH.steadyMax).toBe(93);
    for (const target of [94, 96, 98]) {
      const { warnings } = proposalOf(worded(proposed(), { target }));
      expect(warnings, `${target} %`).toHaveLength(3);
      expect(warnings[2]).toBe(high);
    }
    // Up to the bound — the shipped 90 % included — a proposal carries its two own warnings.
    for (const target of [50, 90, 93]) {
      expect(proposalOf(worded(proposed(), { target })).warnings, `${target} %`).toHaveLength(2);
    }
  });

  test("a ride too swift for a frozen line says so under the proposal too", () => {
    const { warnings } = proposalOf(worded(proposed({ quasiStatic: true })));
    expect(warnings).toHaveLength(3);
    expect(warnings[2]).toBe(ridesUnder(50, 180).outputs.warnings.at(-1));
  });
});

describe("a refusal explains itself and gives no height", () => {
  const failedAt = (failure: Extract<ReachRefusal, { kind: "failed" }>["failure"]) =>
    refused({ kind: "failed", deltaB: -24.8, failure });

  const REFUSALS: readonly (readonly [string, ReachReading["outcome"], string])[] = [
    [
      "a target out of its domain",
      refused({ kind: "target" }),
      "Aucune proposition : la cible de 90 % sort du domaine 50 – 98 % de la portée. Une cible à B ou au-delà demanderait l'arrivée que la proposition évite ; elle se règle sur la Page Avancé.",
    ],
    [
      "a garde that is not judged",
      refused({ kind: "unjudged" }),
      "Aucune proposition : la garde au sol n'est pas jugée sur cette ligne, et un contact avec le terrain ne peut donc pas être écarté.",
    ],
    [
      "B on the ground and still short",
      refused({ kind: "unreachable", bound: "lowest", deltaB: -12 }),
      "Aucune proposition : même avec l'ancrage B au sol (B descendu de 12,0 m), le point le plus loin reste avant la cible. Descendre B davantage demande un autre emplacement, donc un autre profil.",
    ],
    [
      "B already on the ground",
      refused({ kind: "unreachable", bound: "lowest", deltaB: 0 }),
      "Aucune proposition : même avec l'ancrage B au sol, le point le plus loin reste avant la cible. Descendre B davantage demande un autre emplacement, donc un autre profil.",
    ],
    [
      "a line climbing at 45° and still past the target",
      refused({ kind: "unreachable", bound: "highest", deltaB: 168 }),
      "Aucune proposition : même avec B monté de 168,0 m, une ligne qui monte à 45°, le passager dépasse encore la cible.",
    ],
    [
      "a farthest point that jumps over the target, from B",
      refused({ kind: "jump", deltaB: 13, beyond: AT_B, short: short(90, 60) }),
      "Aucune proposition : autour de B monté de 13,0 m, le point le plus loin passe de B à x 90,0 m sans s'arrêter sur la cible : aucune hauteur de B ne l'y place.",
    ],
    [
      "a farthest point that jumps over the target, from short of B",
      refused({ kind: "jump", deltaB: -2, beyond: short(141, 80), short: short(90, 60) }),
      "Aucune proposition : autour de B descendu de 2,0 m, le point le plus loin passe de x 141,0 m à x 90,0 m sans s'arrêter sur la cible : aucune hauteur de B ne l'y place.",
    ],
    [
      "a line that stops solving: §5.4's floor",
      failedAt({
        stage: "L0",
        error: {
          kind: "invalid-input",
          field: "L0",
          value: 150.05,
          bound: 150.06,
          boundKind: "min",
        },
      }),
      "Aucune proposition : le calcul s'arrête à B descendu de 24,8 m, avant d'atteindre la cible : tension impossible avec le réglage de tension du scénario.",
    ],
    [
      "a line that stops solving: a traverse with holes",
      failedAt({ stage: "traverse", error: null }),
      "Aucune proposition : le calcul s'arrête à B descendu de 24,8 m, avant d'atteindre la cible : la traversée y est incomplète.",
    ],
    [
      "a line that stops solving, with no refusal to name",
      failedAt({ stage: "material", error: null }),
      "Aucune proposition : le calcul s'arrête à B descendu de 24,8 m, avant d'atteindre la cible : la ligne ne s'y calcule pas.",
    ],
    [
      "a passager who would touch the terrain",
      refused({ kind: "contact", deltaB: -4.2, contact: "rider" }),
      "Aucune proposition : avec B descendu de 4,2 m, le passager toucherait le terrain hors zones d'ancrage, sur le profil connu (hauteur d'ancrage B 7,8 m).",
    ],
    [
      "a line that would touch the terrain",
      refused({ kind: "contact", deltaB: -4.2, contact: "cable" }),
      "Aucune proposition : avec B descendu de 4,2 m, la ligne toucherait le terrain hors zones d'ancrage, sur le profil connu (hauteur d'ancrage B 7,8 m).",
    ],
  ];

  test.each(REFUSALS)("%s", (_, outcome, sentence) => {
    const out = worded(outcome);
    expect(out.refusal).toBe(sentence);
    expect(out.proposal).toBeNull();
  });

  test("no refusal reads as an instruction: none says « Monter B de » or « Descendre B de »", () => {
    for (const [, outcome] of REFUSALS) {
      const { refusal } = worded(outcome);
      expect(refusal).not.toContain(REACH_COPY.raise);
      expect(refusal).not.toContain(REACH_COPY.lower);
      expect(refusal?.startsWith(`${REACH_COPY.refused} : `)).toBe(true);
    }
  });

  test("a refused target is quoted as the search read it", () => {
    const out = worded(refused({ kind: "target" }), { target: 120, targetX: 180 });
    expect(out.refusal).toContain("la cible de 120 % sort du domaine 50 – 98 % de la portée");
    expect(out.target).toContain("à 120 % de la portée");
  });

  test("the Scenario's own ride is still read beside a refusal", () => {
    expect(worded(refused({ kind: "unjudged" })).current).toBe(
      "Scénario actuel : le passager arrive au bout.",
    );
  });
});

describe("the terrain register — no word the interface never says, none only Avancé names", () => {
  const blown = proposed({ windy: short(134.96, 92.65), calm: AT_B, quasiStatic: true });
  const printed = [
    ...sentences(worded(proposed())),
    ...sentences(worded(proposed({ deltaB: -0.4, h: -18.4, zB: 11.6 }))),
    ...sentences(worded(proposed({ deltaB: 0, h: -18, zB: 12 }))),
    ...sentences(worded(blown, { windless: false })),
    ...(
      [
        { mode: "sag", D_target: 6 },
        { mode: "length", L0: 151.64 },
        { mode: "tension", H_target: 2535 },
        { mode: "ratio", ratio: 0.5 },
      ] as const
    ).flatMap((tightness) =>
      sentences(worded(proposed(), { target: 96 }, { ...WORDING, tightness, unit: "kN" })),
    ),
    ...(
      [
        { kind: "target" },
        { kind: "unjudged" },
        { kind: "unreachable", bound: "lowest", deltaB: -12 },
        { kind: "unreachable", bound: "highest", deltaB: 168 },
        { kind: "jump", deltaB: 13, beyond: AT_B, short: short(90, 60) },
        { kind: "failed", deltaB: -24.8, failure: { stage: "traverse", error: null } },
        {
          kind: "failed",
          deltaB: -24.8,
          failure: {
            stage: "L0",
            error: {
              kind: "invalid-input",
              field: "L0",
              value: 150.05,
              bound: 150.06,
              boundKind: "min",
            },
          },
        },
        { kind: "contact", deltaB: -4.2, contact: "rider" },
        { kind: "contact", deltaB: -4.2, contact: "cable" },
      ] as const satisfies readonly ReachRefusal[]
    ).flatMap((refusal) => sentences(worded(refused(refusal)))),
  ];
  const unique = [...new Set(printed)].filter((copy) => copy !== "");

  test.each(unique.map((copy) => [copy] as const))("« %s » uses no proscribed word", (copy) => {
    expect(proscribedIn(copy)).toEqual([]);
  });

  test.each(unique.map((copy) => [copy] as const))("« %s » uses no exact-register term", (copy) => {
    expect(exactTermsIn(copy)).toEqual([]);
  });
});

describe("`reachSearch` — the search as the gates leave it", () => {
  const page = (scenario: ScenarioDraft = SHIPPED, profil = null as typeof PROFIL | null) => {
    const { reading: rides } = ridesUnder(
      scenario.wind.speedKmh,
      scenario.wind.directionDeg,
      scenario,
      profil,
      scenario.positions,
    );
    return {
      unloaded: deriveUnloaded(unloadedInputs(scenario, profil)),
      traverse: traverseScenario(traverseInputs(scenario)),
      trace: profil,
      rides,
      clearance: true,
    };
  };

  test("no ride, no search: the gates withheld it, or the line does not solve", () => {
    expect(reachSearch({ ...page(), rides: null })).toBeNull();
    const blank = deriveUnloaded(
      unloadedInputs({ ...SHIPPED, geometry: { source: "manual", L: 0, h: 0 } }, null),
    );
    expect(blank.ok).toBe(false);
    expect(reachSearch({ ...page(), unloaded: blank })).toBeNull();
  });

  test("it is posed off the Page's own line and rides, with the Scenario's wording", () => {
    const posed = page();
    const search = reachSearch(posed);
    expect(search?.input.unloaded).toBe(posed.unloaded);
    expect(search?.input.reading).toBe(posed.rides);
    expect(search?.input.scenario).toBe(posed.traverse);
    expect(search?.wording).toEqual({
      tightness: SHIPPED.tightness,
      unit: SHIPPED.unit,
      tensioningSide: SHIPPED.tensioningSide,
    });
  });

  test("a withheld garde is handed on, so the search refuses rather than guess", () => {
    expect(reachSearch(page())?.input.clearanceJudged).toBe(true);
    const search = reachSearch({ ...page(), clearance: false });
    expect(search?.input.clearanceJudged).toBe(false);
    if (search == null) throw new Error("a ride poses a search");
    expect(reachProposal(search).refusal).toBe(worded(refused({ kind: "unjudged" })).refusal);
  });

  test("the Vent is projected on the line's bearing, or not at all without Positions", () => {
    expect(reachSearch(page())?.input.bearing).toBeNull();
    const placed = { ...SHIPPED, positions: DUE_NORTH };
    // Due north: A and B on one meridian.
    expect(reachSearch(page(placed))?.input.bearing).toBeCloseTo(0, 6);
  });

  test("a cached profil sets ρ only while it is the line's ground", () => {
    // A manual line keeps a Trace in the cache; it is not its ground.
    expect(reachSearch({ ...page(), trace: PROFIL })?.input.profile).toBeNull();
    expect(reachSearch(page(ON_PROFIL, PROFIL))?.input.profile).toBe(PROFIL);
  });
});

describe("`reachProposal` — the shipped line, searched and worded", () => {
  const answer = (scenario: ScenarioDraft) => {
    const { reading: rides } = ridesUnder(
      scenario.wind.speedKmh,
      scenario.wind.directionDeg,
      scenario,
      null,
      scenario.positions,
    );
    const search = reachSearch({
      unloaded: deriveUnloaded(unloadedInputs(scenario, null)),
      traverse: traverseScenario(traverseInputs(scenario)),
      trace: null,
      rides,
      clearance: true,
    });
    if (search === null) throw new Error("the shipped line has a ride");
    return reachProposal(search);
  };

  test("the passager arrives at B on the shipped line: B is to be raised", () => {
    const out = answer(SHIPPED);
    expect(out.current).toBe("Scénario actuel : le passager arrive au bout.");
    expect(out.refusal).toBeNull();
    // [MEASURED] 2026-11-13, the shipped 150 m line.
    expect(proposalOf(out).headline).toEqual({ action: "Monter B de", amount: "17,6 m" });
  });

  test("the target set on Avancé is the one Dynamique reads: a link's `cib` words the answer", () => {
    // One Scenario for every Page (ADR-0002): the field on Avancé writes the Scenario, the link
    // carries it as `cib`, and Dynamique reads the Scenario the link decodes to.
    const typed = FIELD_ACCESS.reachTarget.write(SHIPPED, 75);
    const link = canonicalLink(scenarioToSearch(typed as Scenario), "/avance");
    expect(link).toContain("&cib=75&");
    const arrived = validateSearch(parseLinkSearch(link.replace("/avance", "")));
    if (arrived.refused !== undefined) throw new Error("the link is the app's own");
    const linked = searchToScenario(completeFromDefaults(arrived).search);
    expect(linked.dynamics.reachTarget).toBe(75);
    const out = answer(linked);
    expect(out.target).toContain("à 75 % de la portée, soit à x 112,5 m");
    // A target farther from B asks for a higher B than the shipped 90 %.
    expect(proposalOf(out).headline.action).toBe("Monter B de");
  });

  test("a typed longueur à vide: the tension de pose B's move leaves on the line is printed", () => {
    const out = answer({ ...SHIPPED, tightness: { mode: "length", L0: 151.2 } });
    // [MEASURED] 2026-11-13, the shipped line cut at 151,20 m: a less steep chord is shorter, so
    // the same length hangs slacker — the tension de pose falls, and the proposal says by how much.
    expect(proposalOf(out).headline).toEqual({ action: "Monter B de", amount: "18,4 m" });
    expect(proposalOf(out).assumptions[1]).toBe(
      "Longueur à vide conservée : 151,20 m ; tension de pose 438,1 daN → 185,1 daN.",
    );
  });

  test("a link's fractional `cib` is read at the whole percent every Page shows", () => {
    const linked = (cib: string) => {
      const arrived = validateSearch(parseLinkSearch(`?L=150&h=-18&cib=${cib}`));
      if (arrived.refused !== undefined) throw new Error("the link is readable");
      return searchToScenario(completeFromDefaults(arrived).search);
    };
    // Kept as given in the Scenario (ADR-0001) …
    expect(linked("98.4").dynamics.reachTarget).toBe(98.4);
    // … and read as the 98 % it prints as: inside the domain, searched at 98 % of the span.
    const inside = answer(linked("98.4"));
    expect(inside.refusal).toBeNull();
    expect(inside.target).toContain("à 98 % de la portée, soit à x 147,0 m");
    expect(proposalOf(inside).headline).toEqual(proposalOf(answer(linked("98"))).headline);
    const low = answer(linked("49.6"));
    expect(low.refusal).toBeNull();
    expect(low.target).toContain("à 50 % de la portée, soit à x 75,0 m");
    // Half a percent past the domain prints as the percent that is out of it, and is refused as it.
    const outside = answer(linked("98.5"));
    expect(outside.proposal).toBeNull();
    expect(outside.refusal).toContain("la cible de 99 % sort du domaine 50 – 98 % de la portée");
    expect(answer(linked("49.4")).refusal).toContain("la cible de 49 % sort du domaine");
    // Inside the domain too, the label and the search agree: 90,4 % is the shipped 90 %.
    const shipped = answer(SHIPPED);
    const near = answer(linked("90.4"));
    expect(near.target).toBe(shipped.target);
    expect(proposalOf(near)).toEqual(proposalOf(shipped));
  });

  test("a target out of its domain is refused on Dynamique, with the domain", () => {
    const out = answer({ ...SHIPPED, dynamics: { ...SHIPPED.dynamics, reachTarget: 100 } });
    expect(out.proposal).toBeNull();
    expect(out.refusal).toContain("la cible de 100 % sort du domaine 50 – 98 % de la portée");
  });
});
