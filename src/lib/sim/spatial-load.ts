/**
 * The line's aerodynamic description under the Scenario's wind — `docs/simulation-theory.md`
 * §19.4 (the declared diameter, `C_D⊥` per family, `ρ`) and §19.8 (the plane case: no wind
 * applied).
 *
 * Rules this module exists to keep:
 *
 * - **A missing textile diameter is refused, never invented** (#127 Q37). Under an applied wind a
 *   textile line whose `d` is absent has no result: `invalid-input{field:"d"}`, the field to
 *   complete. No default diameter, no `f_n = 0` in its place, no plane line shown instead.
 * - **No wind applied is `null`.** Speed 0, or no bearing because a Position is missing: nothing
 *   reads `d`, and the engine evaluates the closed form (§19.8, §19.16).
 * - **The wind is read where it acts**, through `windAt` (§8.4), never as a mean over the span.
 */

import type { Result } from "./parameterise.ts";
import type { LineAero, MaterialSpec, SolveError } from "./types.ts";
import type { WindField } from "./wind-profile.ts";
import type { WindComponents } from "./wind.ts";

import { AERO } from "./aero.ts";
import { windAt } from "./wind-profile.ts";

/** `true` when `aero` applies no wind: `null`, or a nil speed (§19.8's plane case). */
export function isAeroNil(aero: LineAero | null): aero is null {
  return aero === null || aero.field.speed === 0;
}

/**
 * §19.4's `LineAero` for one member, or `null` when no wind is applied.
 *
 * @param spec the member's material input — the diameter is read from it, mm → m.
 * @param field the Scenario's wind field (§8.4).
 * @param bearing the line's bearing A → B, degrees, or `null` without Positions.
 * @param rho the Scenario's air density, kg/m³ (`airDensityOf`, §19.4).
 * @returns `invalid-input{field:"d"}` for a textile line without a diameter under an applied wind
 *   (#127 Q37), with `value` `NaN` (nothing was typed) and the bound `0` it must exceed.
 */
export function lineAeroOf(
  spec: MaterialSpec,
  field: WindField,
  bearing: number | null,
  rho: number,
): Result<LineAero | null, SolveError> {
  if (bearing === null || field.speed === 0) return { ok: true, value: null };
  const mm = spec.d;
  if (mm === undefined || !Number.isFinite(mm) || mm <= 0) {
    return {
      ok: false,
      error: {
        kind: "invalid-input",
        field: "d",
        value: mm ?? Number.NaN,
        bound: 0,
        boundKind: "min",
      },
    };
  }
  const CDn = spec.family === "steel" ? AERO.lineNormalDrag.steel : AERO.lineNormalDrag.textile;
  return { ok: true, value: { field, bearing, rho, d: mm / 1000, CDn } };
}

/**
 * The wind vector at `x`, m/s — `windAt`'s components as `(u_x, u_y)` of §19.2: `u_x = along`,
 * `u_y = across`. A convenience for readers outside the integrator (the descent, a view); it throws
 * where `windAt` does.
 */
export function windVectorAt(aero: LineAero, x: number, L: number): { ux: number; uy: number } {
  const u: WindComponents = windAt(aero.field, x, L, aero.bearing);
  return { ux: u.along, uy: u.across };
}
