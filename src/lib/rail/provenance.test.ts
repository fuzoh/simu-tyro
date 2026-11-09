import { describe, expect, test } from "vitest";

import type { ScenarioDraft, TextileDraft } from "@/lib/scenario/types.ts";

import { firstRunDefaults } from "@/lib/scenario/first-run.ts";

import type { AggregateEntryId } from "./provenance.ts";

import { deduceValues } from "./deduced.ts";
import {
  anchorZoneChip,
  LOAD_COMBINATION_FORMULA,
  NOT_COMPUTED_LINES,
  provenanceAggregate,
  PROVENANCE_COPY,
  WARNING_LADDER,
  warningLadder,
} from "./provenance.ts";

/**
 * The provenance aggregate and the three-tier warning ladder — « v1 build spec » § 6 and § 9's
 * « the aggregate count is 4 ».
 *
 * Five things this file exists to pin down:
 *
 * - **The opening screen's aggregate is exactly four**, with **no régime line pinned**, and the
 *   membership rule is mechanical rather than a list somebody maintains: `MBF` acier unoverridden
 *   is `[STD-ATTESTED]` and stays out, `DAF` is well-attested *and* editable and stays out, and the
 *   terminations table's own tags govern — cosse and épissure are attested, so they are not members
 *   although an earlier chip-mapping table lumped them in with the conventioned rows.
 * - **Editing an Unconfirmed Default flips the chip and keeps the line.** « aucune valeur normative
 *   n'existe » stays true whatever the user types.
 * - **The régime is pinned first when it is `[CONVENTION]` or `[UNVERIFIED:R1]`** — three of five
 *   entries — because it is not one input among six: it multiplies into every margin.
 * - **An override downgrades `MBF`**, the app's one `[STD-ATTESTED]` derived value, into the list.
 * - **The ladder's ambient tier fires always** (textile `k`), which is exactly why it carries no ⚠,
 *   and the `flèche < 3 %` condition raises **two** entries — one on the ratio, one beside the DAF
 *   figure it invalidates. Neither is a duplicate of the other.
 */

const SHIPPED = firstRunDefaults();

function aggregateOf(patch: Partial<ScenarioDraft> = {}) {
  const scenario: ScenarioDraft = { ...SHIPPED, ...patch };
  return provenanceAggregate(scenario, deduceValues(scenario, null));
}

function ids(patch: Partial<ScenarioDraft> = {}): AggregateEntryId[] {
  return aggregateOf(patch).entries.map((entry) => entry.id);
}

/** § 9's shipped steel spec, narrowed once so an override can be spread onto it. */
const STEEL_SPEC =
  SHIPPED.material.family === "steel"
    ? SHIPPED.material
    : (() => {
        throw new Error("the shipped scenario is family Acier");
      })();

/** A textile line as § 9 retains it, with a datasheet filled in so it solves. */
const HMPE: TextileDraft = {
  family: "textile",
  ropeClass: "hmpe",
  MBL: 100_000,
  mu: 0.1,
  k: 22,
};

describe("the aggregate on the opening screen", () => {
  const aggregate = aggregateOf();

  test("it is exactly 4 — m_p, h_rider, EA acier, μ acier — with no régime pinned", () => {
    expect(aggregate.count).toBe(4);
    expect(aggregate.entries.map((entry) => entry.id)).toEqual(["mp", "hRider", "EA", "mu"]);
    expect(aggregate.entries.every((entry) => !entry.pinned)).toBe(true);
  });

  test("the always-visible line carries the count, and the glyph is the renderer's", () => {
    expect(aggregate.summary).toBe("4 valeurs sans référence normative confirmée");
    expect(aggregate.summary).not.toContain("⚠");
  });

  test("every entry prints its value and carries a popover with a tag and a §", () => {
    for (const entry of aggregate.entries) {
      expect(entry.value).not.toBeNull();
      // §0.2's fine-grained vocabulary lives in the popover — never on the surface, where a
      // seven-level taxonomy is unactionable.
      expect(entry.detail).toMatch(/docs\/simulation-theory\.md/);
      expect(entry.detail).toMatch(/§/);
      expect(entry.chip).toBe("non confirmé");
    }
  });

  test("MBF acier unoverridden and DAF are not members", () => {
    // `MBF` is the app's one `[STD-ATTESTED]` derived value; `DAF` 1,2 is `[FIELD:SSF]`, the
    // reference's highest-confidence tag — well attested *and* editable, the fourth case.
    expect(ids()).not.toContain("MBF");
    expect(PROVENANCE_COPY.DAF).toContain("[FIELD:SSF]");
    expect(PROVENANCE_COPY.DAF).toContain("sans pastille");
  });

  test("cosse à sertir is attested, so neither termination is a member", () => {
    expect(ids()).not.toContain("etaA");
    expect(ids()).not.toContain("etaB");
  });
});

describe("membership, rule by rule", () => {
  test("the régime is pinned first when it is [CONVENTION] or [UNVERIFIED:R1]", () => {
    for (const regime of ["acct10", "ansi5"] as const) {
      const aggregate = aggregateOf({ regime });
      expect(aggregate.count).toBe(5);
      expect(aggregate.entries[0].id).toBe("regime");
      expect(aggregate.entries[0].pinned).toBe(true);
    }
  });

  test("EN 15567-1 and WorkSafe QLD add nothing — [STD-ATTESTED] and [REGULATOR]", () => {
    expect(ids({ regime: "en15567" })).not.toContain("regime");
    expect(ids({ regime: "wsqld" })).not.toContain("regime");
  });

  test("an edited Unconfirmed Default keeps its line and flips its chip", () => {
    // 100 kg typed is no more standards-backed than the 120 kg shipped, so the entry stays; what
    // changes is the chip, from « non confirmé » to « valeur utilisateur ».
    const aggregate = aggregateOf({ rider: { ...SHIPPED.rider, mp: 100 } });
    const mp = aggregate.entries.find((entry) => entry.id === "mp");
    expect(aggregate.count).toBe(4);
    expect(mp?.chip).toBe("valeur utilisateur");
    expect(mp?.value).toBe("100 kg");
  });

  test("the chip compares at display precision, so a link carrying 120 kg reads unedited", () => {
    const aggregate = aggregateOf({ rider: { ...SHIPPED.rider, mp: 120.004 } });
    expect(aggregate.entries.find((entry) => entry.id === "mp")?.chip).toBe("non confirmé");
  });

  test("an overridden MBF downgrades the one [STD-ATTESTED] derived value into the list", () => {
    const aggregate = aggregateOf({
      material: { ...STEEL_SPEC, overrides: { MBF: 80_000 } },
    });
    const mbf = aggregate.entries.find((entry) => entry.id === "MBF");
    expect(aggregate.count).toBe(5);
    expect(mbf?.chip).toBe("valeur saisie");
    expect(mbf?.value).toBe("8000 daN");
  });

  test("an overridden EA is still a member — the override renames the chip, nothing else", () => {
    const aggregate = aggregateOf({
      material: { ...STEEL_SPEC, overrides: { EA: 7e6 } },
    });
    expect(aggregate.count).toBe(4);
    expect(aggregate.entries.find((entry) => entry.id === "EA")?.chip).toBe("valeur saisie");
  });

  test("a textile line swaps the two steel rows for EA and k, and adds both terminations", () => {
    const aggregate = aggregateOf({
      usage: "TEMPORAIRE",
      material: HMPE,
      terminations: {
        A: { id: "oeil-cousu-epissure", eta: 0.9 },
        B: { id: "oeil-cousu-epissure", eta: 0.9 },
      },
    });
    // **All** textile terminations are members: every §10.3 efficiency is a `[CONVENTION]` or a
    // datasheet range.
    expect(aggregate.entries.map((entry) => entry.id)).toEqual([
      "mp",
      "hRider",
      "EAtextile",
      "k",
      "etaA",
      "etaB",
    ]);
  });

  test("manchon à coin and serre-câbles étrier are members on a steel line; épissure is not", () => {
    expect(
      ids({
        terminations: {
          A: { id: "manchon-a-coin", eta: 0.8 },
          B: { id: "serre-cables-etrier", eta: 0.8 },
        },
      }),
    ).toEqual(["mp", "hRider", "EA", "mu", "etaA", "etaB"]);
    expect(
      ids({
        terminations: {
          A: { id: "epissure", eta: 0.8 },
          B: { id: "manchon-metal-resine", eta: 1 },
        },
      }),
    ).toEqual(["mp", "hRider", "EA", "mu"]);
  });

  test("a blank textile datasheet prints no value — and never a « — »", () => {
    const aggregate = aggregateOf({
      usage: "TEMPORAIRE",
      material: { family: "textile", ropeClass: "polyester", MBL: null, mu: null, k: null },
    });
    for (const entry of aggregate.entries) expect(entry.value ?? "").not.toContain("—");
    expect(aggregate.entries.find((entry) => entry.id === "k")?.value).toBeNull();
  });

  test("one value alone reads « 1 valeur », not « 1 valeurs »", () => {
    // The two Unconfirmed Defaults always ship, so the singular is reachable only through the
    // count itself; assert the string rule rather than contrive a one-entry Scenario.
    expect(aggregateOf().summary.startsWith("4 valeurs")).toBe(true);
    expect(provenanceAggregate({ ...SHIPPED }).count).toBeGreaterThan(1);
  });
});

describe("the Zone d'ancrage's length carries its own chip (#106)", () => {
  test("« non confirmé » at the shipped 10 m, and « valeur utilisateur » once typed over", () => {
    expect(anchorZoneChip(10)).toBe("non confirmé");
    // Compared at display precision, one decimal of a metre: a link carrying 10,04 reads unedited.
    expect(anchorZoneChip(10.04)).toBe("non confirmé");
    expect(anchorZoneChip(10.1)).toBe("valeur utilisateur");
    expect(anchorZoneChip(0)).toBe("valeur utilisateur");
  });

  test("its provenance is a [CONVENTION] that names the decision, and it stays out of the four", () => {
    expect(PROVENANCE_COPY.anchorZone).toContain("[CONVENTION]");
    expect(PROVENANCE_COPY.anchorZone).toContain("#106");
    const edited = provenanceAggregate({
      ...SHIPPED,
      rider: { ...SHIPPED.rider, anchorZone: 25 },
    });
    expect(edited.count).toBe(4);
  });
});

describe("the three-tier warning ladder", () => {
  test("the table names every rung's tier and its one owner", () => {
    expect(WARNING_LADDER["k-hors-bande"]).toEqual({ tier: "ambiant", owner: "rail-row" });
    // Conditional on a design choice, and it names a blind spot in the app's main output — hence
    // the warning tier, and it never promotes to the banner.
    expect(WARNING_LADDER["terrain-grossier"]).toEqual({
      tier: "avertissement",
      owner: "terrain",
    });
    // §10.2's prohibition survives an ample margin, so it cannot be a warning beside a pass.
    expect(WARNING_LADDER["serre-cables-refuse"]).toEqual({ tier: "verdict", owner: "banner" });
    const tiers = new Set(Object.values(WARNING_LADDER).map((rung) => rung.tier));
    expect(tiers).toEqual(new Set(["ambiant", "avertissement", "verdict"]));
  });

  test("the shipped line raises nothing: 4,00 % of flèche, 2,90 % of standing tension", () => {
    // A first screen that opens on its own warning spends the app's warning vocabulary before the
    // user has typed anything.
    expect(warningLadder(SHIPPED, deduceValues(SHIPPED, null))).toEqual([]);
  });

  test("textile k is ambient and fires always — no ⚠, because an alarm would be permanent", () => {
    const scenario: ScenarioDraft = { ...SHIPPED, usage: "TEMPORAIRE", material: HMPE };
    const ladder = warningLadder(scenario, deduceValues(scenario, null));
    const ambient = ladder.filter((rung) => rung.tier === "ambiant");
    expect(ambient).toHaveLength(1);
    expect(ambient[0].id).toBe("k-hors-bande");
    expect(ambient[0].row).toBe("k");
    expect(ambient[0].text).not.toContain("⚠");
  });

  test("a taut line raises two warnings at once, and neither may be deleted", () => {
    // Below 3 % the line stiffens **and** the DAF's 1,2 ceiling — measured on a controlled
    // step-off on a taut line — no longer describes it. One condition, two surfaces.
    const taut: ScenarioDraft = { ...SHIPPED, tightness: { mode: "sag", D_target: 2 } };
    const ladder = warningLadder(taut, deduceValues(taut, null));
    expect(ladder.map((rung) => rung.id)).toEqual([
      "fleche-sur-portee-sous-3-pct",
      "daf-hors-de-son-regime-de-mesure",
    ]);
    expect(ladder.map((rung) => rung.row)).toEqual(["sagRatio", "DAF"]);
    expect(ladder.every((rung) => rung.tier === "avertissement")).toBe(true);
  });

  test("§9.2's creep cap is textile-only and reads as service life, not strength", () => {
    // A rope strung above 30 % MBL: the standing tension is what the cap is read against.
    const scenario: ScenarioDraft = {
      ...SHIPPED,
      usage: "TEMPORAIRE",
      material: { ...HMPE, MBL: 4000 },
      tightness: { mode: "sag", D_target: 2 },
    };
    const ladder = warningLadder(scenario, deduceValues(scenario, null));
    const creep = ladder.find((rung) => rung.id === "tension-permanente-sur-30-pct-mbl");
    expect(creep?.row).toBe("standingTension");
    expect(creep?.text).toContain("fluage");
    expect(creep?.text).toContain("§9.2");
    expect(creep?.text).toContain("MBL");
    // On steel the same standing fraction raises nothing: §9.2's cap is a textile service-life
    // bound, and the strength claim is the verdict's.
    const steel: ScenarioDraft = { ...SHIPPED, tightness: { mode: "sag", D_target: 2 } };
    expect(
      warningLadder(steel, deduceValues(steel, null)).some(
        (rung) => rung.id === "tension-permanente-sur-30-pct-mbl",
      ),
    ).toBe(false);
  });
});

describe("« Ce que cet outil ne calcule pas »", () => {
  test("five static lines, and the fifth is the one that refuses the certificate", () => {
    expect(NOT_COMPUTED_LINES).toHaveLength(5);
    expect(NOT_COMPUTED_LINES[0]).toContain("EN 15567");
    expect(NOT_COMPUTED_LINES[1]).toContain("2×");
    expect(NOT_COMPUTED_LINES[4]).toBe("Aucune attestation de conformité.");
  });

  test("§8.3's formula is labelled and stays in the popover", () => {
    // Printed on the surface it invites the mental arithmetic it is labelled against: somebody
    // applies those γ factors by hand and believes the result.
    expect(LOAD_COMBINATION_FORMULA).toContain("E_d = γ_G·T_pre + γ_Q·(T_user·DAF) + γ_W·F_wind");
    expect(LOAD_COMBINATION_FORMULA).toContain("[UNVERIFIED:R1]");
    for (const line of NOT_COMPUTED_LINES) expect(line).not.toContain("γ");
  });
});
