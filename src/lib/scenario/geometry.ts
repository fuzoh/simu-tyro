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
