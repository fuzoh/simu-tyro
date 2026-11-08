/**
 * The imported profile as the app holds it — « v1 build spec » § 4 (*La Trace est immuable ; le
 * `Terrain` est dérivé à un seul joint*) — plus the **one seam** that turns it into the engine's
 * `Terrain`.
 *
 * Rules this module exists to keep:
 *
 * - **The Trace runs from anchor A to anchor B** (#88): its first sample is under A and its last
 *   under B. No anchor is placed at a distance along it — a point that does not suit is moved,
 *   which makes a new profil — so `L` is the profil's whole extent and there is no station to bound,
 *   snap or swap.
 * - **The Trace is held once, immutably, in file coordinates.** `deriveTerrain` reads `trace` and
 *   allocates its own arrays, so what the Session persists is the file. That is also why ticket 09's
 *   `Terrain` union needed **no** change — no `x0` offset field, which would have put an offset in
 *   the clearance inner loop.
 * - **`Distance` is horizontal.** `d` is `x` after the origin shift, never a surface length: § 4
 *   measured 183,4 m reported against a 183,42 m planimetric chord and a **263,9 m** 3-D surface
 *   length, so any « slope correction » re-introduces a **44 %** inflation of `L`.
 * - **The samples are the file's own.** No resampling, no smoothing — § 4 rejected them for adding
 *   zero terrain knowledge while making a coarse import indistinguishable from a fine one. The
 *   honest move is disclosure, which is `provenance.ts`'s job.
 * - **This is a boundary module, not the engine.** It lives outside `src/lib/sim/`, which stays
 *   dependency-free; it imports the engine's `Terrain` **type** and nothing else.
 */

import type { Terrain } from "@/lib/sim";

/**
 * § 4's Session-state Trace, verbatim. Held in **file coordinates** and never mutated.
 *
 * `dev` is the straightness scalar (§ 4 — *Rectitude*): the max lateral deviation from the A→B
 * chord in metres, or `null` for « rectitude non vérifiable » when the file carried no
 * coordinates. It travels in a shared link because `Easting`/`Northing` do not — the check they
 * feed has already run at send time.
 */
export type Trace = {
  /** `Distance`, m, **horizontal**, strictly increasing — the file's own samples. */
  readonly d: Float64Array;
  /** `Altitude`, m, one per `d`. */
  readonly z: Float64Array;
  /** Max lateral deviation from the A→B chord, m; `null` = unverifiable. */
  readonly dev: number | null;
  /** `null` ⇒ « tracé reçu par lien » — ticket 09's payload drops the filename. */
  readonly fileName: string | null;
};

/** § 4's derived read-outs: `L` and `h`, measured anchor top to anchor top. */
export type DerivedSpan = {
  /** `Portée`, m. */
  readonly L: number;
  /** `Dénivelé`, m — negative when B is lower than A. */
  readonly h: number;
  /** Ground altitude under anchor A, m — the profil's first sample, the rail's « Alt. base A ». */
  readonly zBaseA: number;
  /** Ground altitude under anchor B, m — the profil's last sample, the rail's « Alt. base B ». */
  readonly zBaseB: number;
};

/**
 * The trace's own horizontal extent, m — `d[last] − d[0]`. It **is** the span: the anchors stand on
 * the two end samples. Also the « sur *X* m » of § 6's copy.
 *
 * Typed on `d` alone so a decoded `p1.` payload, which has no `fileName`, reads it as a `Trace` does.
 */
export function traceExtent(trace: Pick<Trace, "d">): number {
  return trace.d[trace.d.length - 1] - trace.d[0];
}

/**
 * The **measured** max spacing between consecutive samples, m — always disclosed, warning or not
 * (§ 6). The geoportal emits a fixed 200 points and not a fixed pitch, so this is `length/199`
 * in practice: 0,92 m at 183 m, 5,0 m at ≈995 m, 7,5 m at 1500 m.
 *
 * @returns `0` for a one-point trace, which has no spacing to report.
 */
export function maxSpacing(trace: Trace): number {
  const { d } = trace;
  let max = 0;
  for (let i = 1; i < d.length; i++) {
    const gap = d[i] - d[i - 1];
    if (gap > max) max = gap;
  }
  return max;
}

/**
 * § 4's two derived read-outs over the whole profil: `L = d_last − d_first` and
 * `h = (z_last + hauteur_B) − (z_first + hauteur_A)`.
 *
 * The two `hauteur d'ancrage` fields feed the `Terrain` and the anchor altitudes and **never**
 * `solveSpan`, which takes span and elevation difference measured anchor to anchor.
 */
export function deriveSpan(
  trace: Trace,
  heights: { readonly zA: number; readonly zB: number },
): DerivedSpan {
  const zBaseA = trace.z[0];
  const zBaseB = trace.z[trace.z.length - 1];
  return {
    L: traceExtent(trace),
    h: zBaseB + heights.zB - (zBaseA + heights.zA),
    zBaseA,
    zBaseB,
  };
}

/**
 * **The one seam.** Pure, and `trace` is never mutated.
 *
 * `x` is `Distance` less the first sample's, so `xs[0] === 0` and `xs[last] === L` exactly: the
 * anchors stand on the file's own end samples, and `zGroundAt` is never asked to extrapolate where
 * the clearance read-outs get the most scrutiny.
 *
 * `z` is returned in the engine's **anchor-A-top frame** — the frame `clearance.ts` compares the
 * cable against, where anchor A's top is the origin and manual ground is the two-point case
 * `zs: [z_base_A, z_base_B]`. The *z* datum is fixed by § 2 and §11, so raw altitudes (540 m against
 * a cable at −40 m) are not an option here.
 *
 * @param trace the imported profile, in file coordinates.
 * @param zA anchor A's height above the first sample — its top is the datum.
 * @returns a `profile` terrain whose `xs` run from `0` to `L`.
 */
export function deriveTerrain(trace: Trace, zA: number): Extract<Terrain, { kind: "profile" }> {
  const { d, z } = trace;
  const xs = new Float64Array(d.length);
  const zs = new Float64Array(d.length);
  const zRef = z[0] + zA;
  // Set rather than computed: `z[0] − (z[0] + zA)` is not `−zA` in floating point.
  zs[0] = -zA;
  for (let i = 1; i < d.length; i++) {
    xs[i] = d[i] - d[0];
    zs[i] = z[i] - zRef;
  }
  return { kind: "profile", xs, zs };
}
