import type { Geometry } from "./types.ts";

/**
 * The span a {@link Geometry} describes: typed `Portée` in manual mode, `s_B − s_A` in imported
 * mode. This is the **one** derivation `source` drives — the same arithmetic `deriveSpan` performs
 * on a decoded Trace, and the only part of it a clamp needs, which is why it does not wait for the
 * Trace to be decoded.
 *
 * It lives here because it had two copies (`rail/values.ts` and `app/state.ts`), which is the
 * shape ticket 38 item 4 asks the discriminant to take where a branch is a *derivation* rather
 * than a module's own question. The value is returned **raw**: `NaN`, zero and negatives all reach
 * the caller, because « no span at all » is a different refusal in each of them — `null` for the
 * Rail's clamp, « leave `x_D` where it is » for the reducer's.
 */
export function spanOfGeometry(geometry: Geometry): number {
  return geometry.source === "manual" ? geometry.L : geometry.sb - geometry.sa;
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
