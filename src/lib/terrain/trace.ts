/**
 * The imported profile as the app holds it — « v1 build spec » § 4 (*La Trace est immuable ; le
 * `Terrain` est dérivé à un seul joint*, *Placement des ancrages*) — plus the **one seam** that
 * turns it into the engine's `Terrain`.
 *
 * Rules this module exists to keep:
 *
 * - **The Trace is held once, immutably, in file coordinates.** Moving an anchor is a *different
 *   derivation*, never a mutation: `deriveTerrain` reads `trace` and allocates its own arrays, so
 *   what the Session persists is the file and re-anchoring is always possible. That is also why
 *   ticket 09's `Terrain` union needed **no** change — no `x0` offset field, which would have put
 *   an offset in the clearance inner loop.
 * - **`Distance` is horizontal.** `d` is `x` after the origin shift below, never a surface length:
 *   § 4 measured 183,4 m reported against a 183,42 m planimetric chord and a **263,9 m** 3-D
 *   surface length, so any « slope correction » re-introduces a **44 %** inflation of `L`.
 * - **Three steps, in this order** — subtract `d_A`, slice to `[0, L]`, **insert interpolated
 *   endpoints**. The endpoints are not tidiness: `d_A` generally lands between two samples, and
 *   without them `zGroundAt` would be asked to extrapolate exactly where the anchors are and where
 *   the clearance read-outs get the most scrutiny. Post-condition: `xs[0] === 0` and
 *   `xs[xs.length − 1] === L`, exactly.
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

/** One anchor's placement on the Trace: a station in **file** coordinates and its tower height. */
export type AnchorPlacement = {
  /** `Station`, m, in the file's own `Distance` frame. */
  readonly station: number;
  /** `Hauteur d'ancrage`, m above this anchor's own base. */
  readonly height: number;
};

/** § 4's derived read-outs: `L = d_B − d_A` and `h`, measured anchor top to anchor top. */
export type DerivedSpan = {
  /** `Portée`, m. */
  readonly L: number;
  /** `Dénivelé`, m — negative when B is lower than A. */
  readonly h: number;
  /** Ground altitude under anchor A, m — the rail's « Alt. base A ». */
  readonly zBaseA: number;
  /** Ground altitude under anchor B, m — the rail's « Alt. base B ». */
  readonly zBaseB: number;
};

/**
 * The profile's altitude at a station, by **linear interpolation between the file's own samples**
 * — § 4's `z(d)`. Outside the trace the ends are **held, never extrapolated**, matching
 * `zGroundAt`: a station off the trace is a blocked placement (« Station hors du tracé »), caught
 * by the degenerate-placement table, not silently invented here.
 *
 * @param trace the imported profile; at least one sample, `d` strictly increasing.
 * @param station m, in file coordinates.
 * @returns the altitude, m, in the file's own frame.
 */
export function altitudeAt(trace: Trace, station: number): number {
  const { d, z } = trace;
  const last = d.length - 1;
  if (station <= d[0]) return z[0];
  if (station >= d[last]) return z[last];

  // The bracketing pair `d[lo] ≤ station < d[hi]`, `hi === lo + 1` on exit.
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (d[mid] <= station) lo = mid;
    else hi = mid;
  }
  return z[lo] + ((station - d[lo]) / (d[hi] - d[lo])) * (z[hi] - z[lo]);
}

/** The trace's own horizontal extent, m — `d[last] − d[0]`, the « sur *X* m » of § 6's copy. */
export function traceExtent(trace: Trace): number {
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
 * § 4's two derived read-outs, `L = d_B − d_A` and
 * `h = (z(d_B) + hauteur_B) − (z(d_A) + hauteur_A)`.
 *
 * The two `hauteur d'ancrage` fields feed the `Terrain` and the anchor altitudes and **never**
 * `solveSpan`, which takes span and elevation difference measured anchor to anchor.
 */
export function deriveSpan(trace: Trace, a: AnchorPlacement, b: AnchorPlacement): DerivedSpan {
  const zBaseA = altitudeAt(trace, a.station);
  const zBaseB = altitudeAt(trace, b.station);
  return {
    L: b.station - a.station,
    h: zBaseB + b.height - (zBaseA + a.height),
    zBaseA,
    zBaseB,
  };
}

/**
 * **The one seam.** Pure, and `trace` is never mutated.
 *
 * `z` is returned in the engine's **anchor-A-top frame** — the frame `clearance.ts` compares the
 * cable against, where anchor A's top is the origin and manual ground is the two-point case
 * `zs: [z_base_A, z_base_B]`. § 4's sketch writes the array as `interp(62)…interp(245)` to show
 * the *x* translation; the *z* datum is fixed by § 2 and §11, so raw altitudes (540 m against a
 * cable at −40 m) are not an option here.
 *
 * @param trace the imported profile, in file coordinates.
 * @param a anchor A's placement — its station is the new origin.
 * @param b anchor B's placement — `L = b.station − a.station`.
 * @returns a `profile` terrain whose `xs` run from `0` to `L` exactly.
 * @throws RangeError when `L` is not finite and positive. That is the degenerate placement
 *   `station B ≤ station A`, which the UI blocks with « L doit être > 0 » and
 *   `[ Inverser A et B ]` — reaching this derivation with it is a caller bug, not a physics
 *   failure.
 */
export function deriveTerrain(trace: Trace, a: AnchorPlacement, b: AnchorPlacement): Terrain {
  const dA = a.station;
  const dB = b.station;
  const L = dB - dA;
  if (!Number.isFinite(L) || L <= 0) {
    throw new RangeError(`deriveTerrain: L must be finite and > 0, got ${L}`);
  }

  const { d, z } = trace;
  // Samples **strictly** inside `(d_A, d_B)`: a sample landing exactly on an anchor is already
  // the synthesised endpoint, and duplicating it would break `xs` strict increase.
  let first = 0;
  while (first < d.length && d[first] <= dA) first++;
  let lastExclusive = d.length;
  while (lastExclusive > first && d[lastExclusive - 1] >= dB) lastExclusive--;

  const inner = lastExclusive - first;
  const xs = new Float64Array(inner + 2);
  const zs = new Float64Array(inner + 2);

  // The datum: anchor A's top. `zs[0]` is therefore `−hauteur_A` exactly.
  const zRef = altitudeAt(trace, dA) + a.height;
  xs[0] = 0;
  zs[0] = -a.height;
  for (let i = 0; i < inner; i++) {
    xs[i + 1] = d[first + i] - dA;
    zs[i + 1] = z[first + i] - zRef;
  }
  xs[inner + 1] = L;
  zs[inner + 1] = altitudeAt(trace, dB) - zRef;

  return { kind: "profile", xs, zs };
}
