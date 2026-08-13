import { describe, expect, test, vi } from "vitest";

import type { ScenarioDraft } from "@/lib/scenario/types.ts";
import type { SolveError } from "@/lib/sim";

import { firstRunDefaults } from "@/lib/scenario/first-run.ts";

import { diagnosticPayload, engineRefusal, REFUSAL_CAUSE } from "./refusals.ts";

/**
 * The three refusal surfaces — « v1 build spec » § 7 (*Les trois refus*, *« Tension impossible » —
 * la borne §5.4 est la charge de rupture*, *« Calcul impossible »*).
 *
 * **The three engine kinds are injected, never hunted** (§ 11, `docs/conventions/testing.md`):
 * measured inside the admissible envelope, `no-convergence` and `slack-limit` are unreachable, so
 * a test that waits for a pathological input to reach one of them tests nothing. Two ways of
 * injecting appear below, and both are the sanctioned one:
 *
 * - the mapping itself takes a `SolveError` **as a value**, so most cases hand it one directly;
 * - the *chain* — `deduceValues` → the surface — is exercised with `vi.mock` on the engine
 *   barrel's `solveSpan` / `resolveL0`, never with a widened signature.
 */

function scenario(patch: (draft: ScenarioDraft) => void = () => {}): ScenarioDraft {
  const draft = firstRunDefaults() as ScenarioDraft;
  patch(draft);
  return draft;
}

/** §5.4's floor at 200 m on 12 mm IWRC 1770, as § 7 measured it: 197,404 m against a typed 190. */
const CHORD_BOUND: SolveError = {
  kind: "invalid-input",
  field: "L0",
  value: 190,
  bound: 197.404,
  boundKind: "min",
};

describe("« Tension impossible » — the bound is the breaking load", () => {
  test("mode Longueur quotes the `L₀` floor and echoes the value", () => {
    const refusal = engineRefusal(
      { stage: "L0", error: CHORD_BOUND },
      { tightness: { mode: "length", L0: 190 } },
    );
    expect(refusal).toEqual({
      id: "tension-impossible",
      message:
        "⛔ Tension impossible — la ligne casserait avant d'atteindre cette tension. Longueur non tendue minimale pour ce câble : 197,40 m · valeur : 190,00 m.",
      diagnostic: false,
    });
  });

  test("mode Tension quotes a **prétension**, and never « soit L₀ ≥ 197,40 m »", () => {
    // The bound is quoted in the driving field's own quantity and unit, and **never twice**: a
    // second equivalent invites the user to type a length into a tension field, which is the
    // eyeball-confusion class the global force-unit decision refused a `kN` carve-out to avoid.
    const refusal = engineRefusal(
      {
        stage: "L0",
        error: {
          kind: "invalid-input",
          field: "H_target",
          value: 2e6,
          bound: 90_740,
          boundKind: "max",
        },
      },
      { tightness: { mode: "tension", H_target: 2e6 } },
    );
    expect(refusal?.message).toBe(
      "⛔ Tension impossible — la ligne casserait avant d'atteindre cette tension. Prétension maximale atteignable : 9074,0 daN.",
    );
    expect(refusal?.message).not.toContain("L₀");
  });

  test("the same bound reads in the selected force unit", () => {
    const refusal = engineRefusal(
      {
        stage: "L0",
        error: {
          kind: "invalid-input",
          field: "H_target",
          value: 2e6,
          bound: 90_740,
          boundKind: "max",
        },
      },
      { tightness: { mode: "tension", H_target: 2e6 }, unit: "kN" },
    );
    // kN carries the daN row's decimals **+ 2**: the resolution never coarsens on a switch.
    expect(refusal?.message).toContain("90,740 kN");
  });

  test("mode Flèche quotes the attainable **flèche minimale**", () => {
    const refusal = engineRefusal(
      {
        stage: "L0",
        error: {
          kind: "invalid-input",
          field: "D_target",
          value: 0.1,
          bound: 0.29,
          boundKind: "min",
        },
      },
      { tightness: { mode: "sag", D_target: 0.1 } },
    );
    expect(refusal?.message).toBe(
      "⛔ Tension impossible — la ligne casserait avant d'atteindre cette tension. Flèche minimale atteignable : 0,29 m.",
    );
  });

  test("no Fix Action exists on any of the three, and only one offers the diagnostic", () => {
    // Not restraint: the §5.4 bound **is** a rupture design, so no unambiguous repair exists.
    const tension = engineRefusal(
      { stage: "L0", error: CHORD_BOUND },
      {
        tightness: { mode: "length", L0: 190 },
      },
    );
    expect(tension).not.toHaveProperty("fixes");
    expect(tension?.diagnostic).toBe(false);
  });

  test("an `invalid-input` on a **span** field is not a refusal — the gates own it", () => {
    // « Aucun contrôle dur ne s'affiche uniquement sur un read-out »: `L` is an editable field
    // with a message table row, and a refusal beside it would say the same thing twice.
    expect(
      engineRefusal(
        {
          stage: "L0",
          error: { kind: "invalid-input", field: "L", value: -5, bound: 0, boundKind: "min" },
        },
        { tightness: { mode: "sag", D_target: 6 } },
      ),
    ).toBeNull();
  });
});

describe("« Cible inatteignable » — the bracket failure, naming the target", () => {
  test("mode Flèche names the flèche it cannot reach", () => {
    const refusal = engineRefusal(
      { stage: "L0", error: { kind: "no-convergence", attempts: 5, residual: 3.4e-4 } },
      { tightness: { mode: "sag", D_target: 6 } },
    );
    expect(refusal).toEqual({
      id: "cible-inatteignable",
      message:
        "⛔ Cible inatteignable — aucune longueur non tendue ne donne cette flèche à vide (6,00 m).",
      diagnostic: false,
    });
  });

  test("mode Tension names the prétension instead", () => {
    const refusal = engineRefusal(
      { stage: "L0", error: { kind: "no-convergence", attempts: 5, residual: 1e-3 } },
      { tightness: { mode: "tension", H_target: 25_350 } },
    );
    expect(refusal?.message).toBe(
      "⛔ Cible inatteignable — aucune longueur non tendue ne donne cette prétension (2535,0 daN).",
    );
  });

  test("the **same kind** out of `solveSpan` is « Calcul impossible », not this", () => {
    // ELECTIONS §0.2: `no-convergence` has two origins needing two surfaces, hence three states
    // and not the two a naive collapse gives. The stage is the whole of the distinction.
    const refusal = engineRefusal(
      { stage: "span", error: { kind: "no-convergence", attempts: 5, residual: 3.4e-4 } },
      { tightness: { mode: "sag", D_target: 6 } },
    );
    expect(refusal?.id).toBe("calcul-impossible");
  });
});

describe("« Calcul impossible » — two kinds, one surface, one non-action", () => {
  const copy =
    "⛔ Calcul impossible pour cette configuration. Le solveur n'a pas convergé — ce cas n'est pas censé se produire. Modifiez légèrement la tension ou la géométrie.";

  test("`no-convergence` and `slack-limit` render the same surface", () => {
    const tightness = { mode: "sag", D_target: 6 } as const;
    const nonConvergence = engineRefusal(
      { stage: "span", error: { kind: "no-convergence", attempts: 5, residual: 3.4e-4 } },
      { tightness },
    );
    const slack = engineRefusal(
      { stage: "span", error: { kind: "slack-limit", hFloored: -169.67 } },
      { tightness },
    );
    expect(nonConvergence).toEqual({ id: "calcul-impossible", message: copy, diagnostic: true });
    expect(slack).toEqual(nonConvergence);
  });

  test("it is the only surface that carries `[ Copier le diagnostic ]`", () => {
    const surfaces = [
      engineRefusal(
        { stage: "L0", error: CHORD_BOUND },
        { tightness: { mode: "length", L0: 190 } },
      ),
      engineRefusal(
        { stage: "L0", error: { kind: "no-convergence", attempts: 5, residual: 1e-3 } },
        { tightness: { mode: "sag", D_target: 6 } },
      ),
      engineRefusal(
        { stage: "span", error: { kind: "slack-limit", hFloored: -1 } },
        { tightness: { mode: "sag", D_target: 6 } },
      ),
    ];
    expect(surfaces.map((surface) => surface?.diagnostic)).toEqual([false, false, true]);
  });

  test("no residual and no `SolveNote` reach the copy", () => {
    // 349 440 instrumented solves: `reseeded` 0, near-taut 0. A residual read-out would document a
    // number nobody has ever seen — the evidence goes to the clipboard instead.
    expect(copy).not.toMatch(/[0-9]e-|résidu|reseed|amorti/i);
  });
});

describe("the cause clauses « Aucun résultat » echoes", () => {
  test("one per surface, lowercase, no icon", () => {
    expect(REFUSAL_CAUSE).toEqual({
      "tension-impossible": "tension impossible",
      "cible-inatteignable": "cible inatteignable",
      "calcul-impossible": "calcul impossible",
    });
  });
});

describe("`[ Copier le diagnostic ]` — evidence, not UI copy", () => {
  const payload = diagnosticPayload({
    failure: { stage: "span", error: { kind: "no-convergence", attempts: 5, residual: 3.417e-4 } },
    at: "2026-08-12T14:22:09.114Z",
    build: "dev",
    scenario: scenario((draft) => {
      draft.geometry = { source: "manual", L: 150, h: -18 };
    }),
    span: { L: 150, h: -18, L0: 151.6440231 },
    derived: { w: 5.361164, EA: 6_900_000, strength: 90_740 },
    loads: [{ x: 75, P: 1177.2 }],
    address: "/?v=1&u=daN&use=perm&L=150",
  });
  const lines = payload.split("\n");

  test("the header carries the instant and the build", () => {
    expect(lines[0]).toBe("scoutech diagnostic — 2026-08-12T14:22:09.114Z — build dev");
  });

  test("the kind, the attempts, the residual and **its tolerance**", () => {
    // §5.3's tolerance is L-scaled beyond 1000 m, so a residual could not be interpreted without
    // it — which is exactly why § 7 keeps both out of the UI and both in this payload.
    expect(lines[1]).toBe("kind        no-convergence");
    expect(lines[2]).toBe("attempts    5");
    expect(lines[3]).toBe("residual    3.4170e-4");
    expect(lines[4]).toBe("tolerance   1e-6");
  });

  test("beyond 1000 m the tolerance scales with `L`, and the payload says so", () => {
    const long = diagnosticPayload({
      failure: { stage: "span", error: { kind: "no-convergence", attempts: 5, residual: 1e-3 } },
      at: "2026-08-12T14:22:09.114Z",
      build: "dev",
      scenario: scenario(),
      span: { L: 1500, h: 0, L0: 1510 },
      derived: { w: 5.361164, EA: 6_900_000, strength: 90_740 },
      address: null,
    });
    expect(long).toContain("tolerance   1.5e-3");
  });

  test("every note is counted, including the ones measured at zero", () => {
    // A reader has to be able to tell « none » from « not recorded ».
    expect(payload).toContain("notes       damped×0  reseeded×0  near-taut-fallback×0");
  });

  test("full float precision and a decimal point — never the display grain", () => {
    expect(payload).toContain("L0=151.6440231");
    expect(payload).toContain("loads=[{x:75,P:1177.2}]");
    // The decimal mark is a **point**: the payload is pasted into a REPL, not read as UI copy.
    expect(payload).not.toContain("151,64");
    expect(payload).not.toMatch(/\d,\d/);
  });

  test("the material line names the family's own fields and its overrides", () => {
    // § 7's own sample line, `MBF` included: « Tension impossible »'s bound **is**
    // `chord/(1 + MBF/EA)`, so a payload without the breaking load makes the reader re-derive the
    // number that produced the refusal.
    expect(payload).toContain("family=steel  d=12  R0=1770  cst=iwrc  MBF=90740  overrides=none");
  });

  test("it carries **no terrain**, and that is not an omission", () => {
    // `solveSpan` is terrain-free and clearance is a reducer above it, so a solve failure is fully
    // reproducible without the 200-row trace.
    expect(payload).not.toMatch(/terrain|trace|tracé/i);
  });

  test("a link that would be refused says so rather than omitting the field", () => {
    const oversize = diagnosticPayload({
      failure: { stage: "span", error: { kind: "slack-limit", hFloored: -169.67 } },
      at: "2026-08-12T14:22:09.114Z",
      build: "dev",
      scenario: scenario(),
      span: null,
      derived: null,
      address: null,
    });
    expect(oversize).toContain("[address]   (non partageable — tracé hors budget)");
    expect(oversize).toContain("hFloored    -169.67");
  });

  test("an `invalid-input` prints its bound rather than a residual", () => {
    const bound = diagnosticPayload({
      failure: { stage: "L0", error: CHORD_BOUND },
      at: "2026-08-12T14:22:09.114Z",
      build: "dev",
      scenario: scenario(),
      span: { L: 200, h: 0, L0: null },
      derived: { w: 5.361164, EA: 6_900_000, strength: 90_740 },
      address: "/?v=1",
    });
    expect(bound).toContain("kind        invalid-input");
    expect(bound).toContain("field       L0");
    expect(bound).toContain("bound       197.404");
    expect(bound).toContain("boundKind   min");
  });
});

describe("the injected chain — `vi.mock` on the collaborator, never a widened signature", () => {
  test("a `solveSpan` that will not converge reaches « Calcul impossible »", async () => {
    vi.resetModules();
    vi.doMock("@/lib/sim", async () => {
      const sim = await vi.importActual<typeof import("@/lib/sim")>("@/lib/sim");
      return {
        ...sim,
        solveSpan: () => ({
          ok: false,
          error: { kind: "no-convergence", attempts: 5, residual: 3.417e-4 },
        }),
      };
    });
    const { deduceValues } = await import("@/lib/rail/deduced.ts");
    const { engineRefusal: mapped } = await import("./refusals.ts");

    const draft = scenario();
    const { failure, solve } = deduceValues(draft, null);
    expect(solve).toBeNull();
    expect(failure).toEqual({
      stage: "span",
      error: { kind: "no-convergence", attempts: 5, residual: 3.417e-4 },
    });
    expect(mapped(failure!, { tightness: draft.tightness })?.id).toBe("calcul-impossible");
    vi.doUnmock("@/lib/sim");
    vi.resetModules();
  });

  test("a `resolveL0` that cannot bracket reaches « Cible inatteignable »", async () => {
    vi.resetModules();
    vi.doMock("@/lib/sim", async () => {
      const sim = await vi.importActual<typeof import("@/lib/sim")>("@/lib/sim");
      return {
        ...sim,
        resolveL0: () => ({
          ok: false,
          error: { kind: "no-convergence", attempts: 5, residual: 1e-2 },
        }),
      };
    });
    const { deduceValues } = await import("@/lib/rail/deduced.ts");
    const { engineRefusal: mapped } = await import("./refusals.ts");

    const draft = scenario();
    const { failure } = deduceValues(draft, null);
    expect(failure?.stage).toBe("L0");
    expect(mapped(failure!, { tightness: draft.tightness })).toEqual({
      id: "cible-inatteignable",
      message:
        "⛔ Cible inatteignable — aucune longueur non tendue ne donne cette flèche à vide (6,00 m).",
      diagnostic: false,
    });
    vi.doUnmock("@/lib/sim");
    vi.resetModules();
  });

  test("a `slack-limit` out of the solver renders the same surface as a non-convergence", async () => {
    vi.resetModules();
    vi.doMock("@/lib/sim", async () => {
      const sim = await vi.importActual<typeof import("@/lib/sim")>("@/lib/sim");
      return {
        ...sim,
        solveSpan: () => ({ ok: false, error: { kind: "slack-limit", hFloored: -169.67 } }),
      };
    });
    const { deduceValues } = await import("@/lib/rail/deduced.ts");
    const { engineRefusal: mapped } = await import("./refusals.ts");

    const draft = scenario();
    const { failure } = deduceValues(draft, null);
    expect(mapped(failure!, { tightness: draft.tightness })?.id).toBe("calcul-impossible");
    vi.doUnmock("@/lib/sim");
    vi.resetModules();
  });
});
