/**
 * The read side of § 7's key table — a validated search bag as the state object the app holds.
 * `src/lib/url/schema.ts` owns the write side (`scenarioToSearch`) and the tokens; this module is
 * its inverse, and it lives here rather than there because what it produces is a
 * {@link ScenarioDraft}, which is the *app's* type and not the URL's.
 *
 * Rules this module exists to keep:
 *
 * - **A link is applied whole.** The caller hands over a bag that has already been salvaged and
 *   completed (`salvageSearch` → `completeFromDefaults`), so almost every key is present. The
 *   fallbacks below are defensive, and they read from `FIRST_RUN_SCENARIO` — the *same* constant
 *   the completion reads — so no second set of defaults can drift into existence.
 * - **The URL's daN become the state's newtons here, and nowhere else.** § 3's « SI internally,
 *   always » governs the state object; `te` and `mbl` are the two forces a link can carry.
 * - **A blank is `null`, never a number nobody typed.** `?fam=tx` with no `mbl`/`mu` is § 9's
 *   « vides et requis » — the correct arrival state, and two blocking errors rather than an
 *   invented rope. Hence {@link ScenarioDraft} rather than `Scenario`.
 * - **`x` clamps, and it is the only key that does.** § 7's one elected exception: `x_D` selects a
 *   *view*, and refusing to draw a valid span because the viewpoint is stale is worse than moving
 *   the viewpoint. Every other out-of-range value is applied as it arrived — the URL is a typing
 *   boundary — and lights up the form's own validation.
 */

import type { EndTermination, TextileDraft, TightnessDraft } from "@/lib/scenario/types.ts";
import type { SteelSpec, TerminationId } from "@/lib/sim";
import type { TerminationToken, ValidatedSearch } from "@/lib/url/schema.ts";

import { terminationIdFromToken } from "@/lib/url/schema.ts";

import type { ScenarioDraft } from "./types.ts";

import { FIRST_RUN_SCENARIO } from "./first-run.ts";

/** daN → N. § 7 serialises every force in daN, ×10 exactly, so the step back is lossless. */
function newtons(daN: number): number {
  return daN * 10;
}

/**
 * § 7's `x` clamp. Silent here only in the sense that this function does not render: the caller
 * compares its own `search.x` against the result and owns the transient inline note
 * (« position ramenée à la portée : 0 – 150,0 m »), because discarding sender state with no trace
 * is the thing the clamp was elected *against*.
 */
export function clampX(xD: number, L: number): number {
  if (!Number.isFinite(L) || L <= 0) return xD;
  if (xD < 0) return 0;
  return xD > L ? L : xD;
}

/** The span a bag describes — `L` in manual mode, `sb − sa` in imported mode. */
function spanOf(search: ValidatedSearch): number | undefined {
  if (search.tr !== undefined) {
    const { sa, sb } = search;
    return sa === undefined || sb === undefined ? undefined : sb - sa;
  }
  return search.L;
}

/**
 * One end's hardware. The token is the URL's, the id is the app's, and `fam` fixes which set is
 * legal: an out-of-family token (`?fam=ac&ta=huit`) is **kept by the schema and refused here**,
 * falling back to § 9's shipped end rather than inventing a steel « nœud de huit ». That is the
 * app's tier, exactly where § 7 puts it — the URL types, the app validates.
 */
function endTermination(
  token: TerminationToken | undefined,
  eta: number | undefined,
  family: "steel" | "textile",
  fallback: EndTermination,
): EndTermination {
  const id: TerminationId | null =
    token === undefined ? null : terminationIdFromToken(token, family);
  return { id: id ?? fallback.id, eta: eta ?? fallback.eta };
}

/** § 7's presence-encoded driver, back into the engine's union. Exactly one key can be present:
 * two is a refusal that never reaches this function. */
function tightness(search: ValidatedSearch): TightnessDraft {
  if (search.fl !== undefined) return { mode: "sag", D_target: search.fl };
  if (search.te !== undefined) return { mode: "tension", H_target: newtons(search.te) };
  if (search.lo !== undefined) return { mode: "length", L0: search.lo };
  if (search.vr !== undefined) return { mode: "ratio", ratio: search.vr };
  return { ...FIRST_RUN_SCENARIO.tightness };
}

/** The steel arm — `mbf`/`ea` in daN, `mu` in kg/m, and **absence is « non surchargée »**. */
function steel(search: ValidatedSearch): SteelSpec {
  const shipped = FIRST_RUN_SCENARIO.material;
  const overrides: { MBF?: number; EA?: number; mu?: number } = {};
  if (search.mbf !== undefined) overrides.MBF = newtons(search.mbf);
  if (search.ea !== undefined) overrides.EA = newtons(search.ea);
  if (search.mu !== undefined) overrides.mu = search.mu;

  const spec: SteelSpec = {
    family: "steel",
    d: search.d ?? shipped.d,
    R0: search.r0 ?? shipped.R0,
    construction: search.cst === "tc" ? "fibre-core" : "iwrc",
  };
  // Omit the key entirely when nothing was overridden: `overrides: {}` and `overrides: undefined`
  // read the same to the engine, but only the absent one round-trips back to an absent `mbf`.
  return Object.keys(overrides).length === 0 ? spec : { ...spec, overrides };
}

/** The textile arm — a **draft**: `mbl` and `mu` absent are § 9's two blanks, not zeros. */
function textile(search: ValidatedSearch): TextileDraft {
  return {
    family: "textile",
    ropeClass: search.cls === "pa" ? "pa-en1891a" : search.cls === "pes" ? "polyester" : "hmpe",
    MBL: search.mbl === undefined ? null : newtons(search.mbl),
    mu: search.mu ?? null,
    k: search.k ?? null,
  };
}

/**
 * A validated (and normally completed) bag as the app's state object.
 *
 * @param search the bag `completeFromDefaults` returned. A bag carrying `refused` never reaches
 *   here: the refusal surface suppresses the screen rather than merging with it.
 * @returns the draft the store holds. Total by construction — every field falls back to § 9's
 *   shipped value, except the two textile blanks, which fall back to `null` on purpose.
 */
export function scenarioFromSearch(search: ValidatedSearch): ScenarioDraft {
  const shipped = FIRST_RUN_SCENARIO;
  const family: "steel" | "textile" = search.fam === "tx" ? "textile" : "steel";

  const geometry: ScenarioDraft["geometry"] =
    search.tr !== undefined
      ? {
          source: "trace",
          trace: search.tr,
          sa: search.sa ?? 0,
          sb: search.sb ?? (search.sa ?? 0) + shipped.geometry.L,
        }
      : { source: "manual", L: search.L ?? shipped.geometry.L, h: search.h ?? shipped.geometry.h };

  const xD = search.x ?? shipped.rider.xD;
  const span = spanOf(search);

  return {
    // `u` is display-only — it changes no number's meaning anywhere, here least of all.
    unit: search.u ?? shipped.unit,
    usage: search.use === "tempo" ? "TEMPORAIRE" : "PERMANENTE",
    // Absent **is** « — choisir — », and it is never completed, so it is never defaulted either.
    regime: search.reg ?? null,
    geometry,
    anchors: { zA: search.za ?? shipped.anchors.zA, zB: search.zb ?? shipped.anchors.zB },
    tightness: tightness(search),
    material: family === "textile" ? textile(search) : steel(search),
    terminations: {
      A: endTermination(search.ta, search.na, family, shipped.terminations.A),
      B: endTermination(search.tb, search.nb, family, shipped.terminations.B),
    },
    rider: {
      mp: search.mp ?? shipped.rider.mp,
      hRider: search.hr ?? shipped.rider.hRider,
      DAF: search.daf ?? shipped.rider.DAF,
      xD: span === undefined ? xD : clampX(xD, span),
    },
  };
}
