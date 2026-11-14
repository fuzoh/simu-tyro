/**
 * The rose des vents on the vue de dessus (#94), as pure conversions: the handle's place on the
 * screen ↔ the Scenario's Vent.
 *
 * Rules this module exists to keep:
 *
 * - **The rose edits the azimuth directly.** The Scenario's direction is geographic — where the
 *   wind comes from, clockwise from north — so on the north-up map the handle stands at that very
 *   bearing. Where the drawing is not north-up — the plain drawing outside LV95, the line drawn
 *   level with A on the left — the drawing's {@link RoseReference.north} turns it by the line's
 *   bearing, and the handle still stands where the wind comes from relative to the drawn line.
 * - **No bearing, no rose to set.** Without A and B on the map the Vent has no line to be projected
 *   on (`windBearing`): the rose draws no wind and offers no handle — {@link roseReference} is
 *   `null` — and the fields beside it are disabled for the same reason.
 * - **The handle stands where the wind comes from**, as on a compass rose, and its distance from the
 *   centre is the speed on a scale that stops at {@link ROSE_MAX_KMH}. A typed speed beyond the scale
 *   parks the handle on the outer ring and stays what was typed.
 * - **What the handle writes is what a field can hold**: whole km/h and whole degrees, the display
 *   grain of the two fields, so a gesture and a typed value agree to the last digit.
 * - **Each handle writes its own fields and keeps the rest of the Vent** (#120). The direction
 *   handle leaves the profile as it is, a speed of zero included; the profile's handle leaves the
 *   speed and the direction.
 * - **The profile's handle has fixed screen axes**: right is wider, up is more attenuated, whatever
 *   the wind's direction and however the drawing is turned — it reads no {@link RoseReference}. Its
 *   travel is a rectangle, a pixel never skips a percent, and a value outside its domain parks it
 *   on the nearest edge without being rewritten until a drag says otherwise.
 * - **The preview is A on the left, B on the right**, always: it draws the profile along the line,
 *   which is not the pad's horizontal axis. Its three speeds are evaluated at the anchors and at
 *   mid-span, never read off a sample; and a profile the gates refuse has no preview — it is not
 *   drawn as though it were legal.
 * - **A control is offered only where it may write, and a parked handle only where its drag
 *   mends** ({@link windControls}). Neither handle stands on a map that writes nothing or on a
 *   line without a bearing, and the profile's pad and preview wait for the profile to be read by
 *   the physics (`WIND_PROFILE_ACTIVE`). A Vent the Wind Gate withholds is drawn as none, which
 *   parks the direction handle at the centre: it is offered there only while every breach stands
 *   on the speed or the direction it writes. Under a refused profile a drag from the centre would
 *   write a speed and a direction over the ones the Scenario holds, and lift nothing.
 */

import type { FieldId } from "@/lib/rail/fields.ts";
import type { Wind } from "@/lib/scenario/types.ts";

import { roundToDisplay } from "@/lib/format/quantity.ts";
import { WIND_PROFILE_ACTIVE, windProfileOf } from "@/lib/scenario/wind.ts";
import { WIND_PROFILE, windProfileSpeed } from "@/lib/sim";

/** Where the rose's scale stops, km/h. The outer ring. */
export const ROSE_MAX_KMH = 60;

/** The graduated rings, km/h, from the centre out. */
export const ROSE_RINGS = [20, 40, 60] as const;

/** The outer ring's radius, px: the handle's whole travel. */
export const ROSE_RADIUS_PX = 88;

/** How the drawing under the rose is turned. */
export type RoseReference = {
  /** Where north stands on the drawing, degrees clockwise from its top: 0 on the north-up map. */
  readonly north: number;
  /** The drawing is the north-up map; otherwise the line is drawn level, A on the left. */
  readonly oriented: boolean;
};

/** The north-up map. */
export const NORTH_UP: RoseReference = { north: 0, oriented: true };

/** A point of the rose, px from its centre, `y` downward. */
export type RoseOffset = { readonly x: number; readonly y: number };

const mod360 = (degrees: number) => ((degrees % 360) + 360) % 360;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * The rose's reference for a line at `bearing` (`windBearing`), or `null` when the line has none.
 *
 * @param level the line is drawn level, A on the left, rather than on the north-up map: it then
 *   runs toward the right of the drawing, 90°, so north stands at `90° − bearing`.
 */
export function roseReference(bearing: number | null, level: boolean): RoseReference | null {
  if (bearing === null) return null;
  return level ? { north: mod360(90 - bearing), oriented: false } : NORTH_UP;
}

/** Where a wind from `azimuth` stands on the drawing, degrees clockwise from its top. */
export function screenBearing(azimuth: number, { north }: RoseReference): number {
  return mod360(azimuth + north);
}

/** The azimuth a bearing on the drawing stands for — what the Scenario holds. */
export function azimuthOf(screen: number, { north }: RoseReference): number {
  return mod360(screen - north);
}

/** Where the handle stands for a wind: the centre without wind, the outer ring at the scale's end. */
export function handleOffset(
  wind: Pick<Wind, "speedKmh" | "directionDeg">,
  reference: RoseReference,
): RoseOffset {
  const radius =
    (Math.min(Math.max(wind.speedKmh, 0), ROSE_MAX_KMH) / ROSE_MAX_KMH) * ROSE_RADIUS_PX;
  const bearing = radians(screenBearing(wind.directionDeg, reference));
  // `+ 0` turns the `-0` of a zero radius into `0`.
  return { x: radius * Math.sin(bearing) + 0, y: -radius * Math.cos(bearing) + 0 };
}

/**
 * The Vent a handle dropped at `offset` writes: its speed and its direction, **the profile kept as
 * it was**. Without a whole km/h of speed there is no direction to read off a point at the centre,
 * so the previous one stays.
 */
export function windFromOffset(offset: RoseOffset, reference: RoseReference, previous: Wind): Wind {
  const distance = Math.hypot(offset.x, offset.y);
  const speedKmh = roundToDisplay(
    "windSpeed",
    Math.min((distance / ROSE_RADIUS_PX) * ROSE_MAX_KMH, ROSE_MAX_KMH),
  );
  if (speedKmh === 0) return { ...previous, speedKmh };
  const screen = mod360((Math.atan2(offset.x, -offset.y) * 180) / Math.PI);
  return {
    ...previous,
    speedKmh,
    directionDeg: mod360(roundToDisplay("windDirection", azimuthOf(screen, reference))),
  };
}

/**
 * The rectangle the profile's handle travels (#120), px: at least 100 × 100, so that each of the 81
 * widths and of the 101 attenuations has a pixel of its own. A drawing choice, never a scenario's.
 */
export const PROFILE_PAD_PX = { width: 120, height: 100 } as const;

const clamp01 = (share: number) => Math.min(Math.max(share, 0), 1);

/**
 * Where the profile's handle stands, px from the pad's **top-left** corner, `y` downward: the
 * width from left to right over its domain, the attenuation from bottom to top over its own. Read
 * as the fields read it (`windProfileOf`); a value outside its domain stands on the nearest edge.
 */
export function profileHandleOffset(wind: Pick<Wind, "widthPct" | "attenuationPct">): RoseOffset {
  const { width, attenuation } = windProfileOf(wind);
  const across = WIND_PROFILE.width;
  const up = WIND_PROFILE.attenuation;
  return {
    x: clamp01((width - across.min) / (across.max - across.min)) * PROFILE_PAD_PX.width,
    y: (1 - clamp01((attenuation - up.min) / (up.max - up.min))) * PROFILE_PAD_PX.height,
  };
}

/**
 * The Vent a profile handle dropped at `offset` writes: its width and its attenuation on the grain
 * of their fields, **the speed and the direction kept as they were**. A point outside the pad is
 * read on its nearest edge, so a drag never writes a percent outside its domain.
 */
export function windFromProfileOffset(offset: RoseOffset, previous: Wind): Wind {
  const across = WIND_PROFILE.width;
  const up = WIND_PROFILE.attenuation;
  const u = clamp01(offset.x / PROFILE_PAD_PX.width);
  const v = clamp01(1 - offset.y / PROFILE_PAD_PX.height);
  return {
    ...previous,
    widthPct: roundToDisplay("windWidth", across.min + u * (across.max - across.min)),
    attenuationPct: roundToDisplay("windAttenuation", up.min + v * (up.max - up.min)),
  };
}

/** The fields the direction handle writes — the only breaches a drag of it can lift. */
const ROSE_HANDLE_FIELDS: ReadonlySet<FieldId> = new Set<FieldId>(["windSpeed", "windDirection"]);

/** What a vue de dessus knows of itself and of the Vent, for {@link windControls} to decide on. */
export type WindControlsInput = {
  /**
   * The fields the Wind Gate's breaches stand on (`windCulprits`, `@/lib/app/banner.ts`); empty
   * while the Vent may be read.
   */
  readonly culprits: readonly FieldId[];
  /** The line has a bearing: A and B are on the map ({@link roseReference} is not `null`). */
  readonly placed: boolean;
  /** The map writes nothing: the Page Terrain's (#101), or the frame that has no rose at all. */
  readonly locked: boolean;
  /** The Mesure is on (#98): the map's clicks are the ruler's. */
  readonly measuring: boolean;
};

/** Which of the Vent's controls a vue de dessus offers, and whether it reads the profile out. */
export type WindControls = {
  /** The rose's direction handle is offered. */
  readonly handle: boolean;
  /** The profile's pad is mounted (#120). */
  readonly pad: boolean;
  /**
   * The profile is read out (#120): {@link profilePreview} drawn on the pad, or said under a map
   * that has none (`profileCaption`).
   */
  readonly preview: boolean;
};

/**
 * The Vent's controls on a vue de dessus — the one rule the live map and its fallback frame read.
 *
 * - **The direction handle** stands where the map may write and the line has a bearing. Over a
 *   withheld Vent it waits at the centre, and is offered only while a drag from there lifts what
 *   withholds it: every culprit is the speed or the direction the handle writes (`ws=-5`). Under a
 *   refused profile — one no calculation reads yet, a percent out of its domain — it is not: the
 *   drag would replace the speed and the direction the Scenario holds and leave the breach
 *   standing. The profile's own field, its Fix Action and its pad repair it.
 * - **The profile's pad** stands on the same maps — one that writes, a line with a bearing — once
 *   the profile is read by the physics, and not while the Mesure holds the map. Its handle stands
 *   on the percents the Scenario holds, withheld or not, so a drag of it overwrites nothing it
 *   does not set, and it stays over a withheld Vent.
 * - **The profile is read out** once it is read by the physics, on a line that has a bearing, and
 *   never while the gates withhold the Vent: what is refused is not shown as though applied.
 *
 * @param active does the physics read the Vent's profile? `WIND_PROFILE_ACTIVE` when absent, which
 *   is what the app passes: a parameter only so that both sides of the activation are tested.
 */
export function windControls(
  { culprits, placed, locked, measuring }: WindControlsInput,
  active: boolean = WIND_PROFILE_ACTIVE,
): WindControls {
  const writes = placed && !locked;
  return {
    handle: writes && culprits.every((field) => ROSE_HANDLE_FIELDS.has(field)),
    pad: active && writes && !measuring,
    preview: active && placed && culprits.length === 0,
  };
}

/** The segments the preview's curve is drawn with. */
export const PROFILE_PREVIEW_STEPS = 48;

/** The profile of a Vent as its preview shows it: A on the left, mid-span, B on the right. */
export type ProfilePreview = {
  /** The speed at mid-span, km/h — the entered speed. */
  readonly midKmh: number;
  /** The speed at both anchors, km/h. */
  readonly anchorKmh: number;
  /** No attenuation: the curve is level, and the width is kept without effect. */
  readonly uniform: boolean;
  /** The largeur à mi-atténuation as it is read, % of the span. */
  readonly width: number;
  /** That width along the line, m — a reading, never a second entry. `null` without a span. */
  readonly widthMetres: number | null;
  /** The two half-gap points the width is measured between, as shares of the span from A. */
  readonly marks: readonly [number, number];
  /**
   * The curve from A to B: the share of the span, and the speed there as a share of the speed at
   * mid-span — so a Vent without speed still draws the shape its two percents describe.
   */
  readonly curve: readonly { readonly xi: number; readonly share: number }[];
};

function within(value: number, { min, max }: { readonly min: number; readonly max: number }) {
  return value >= min && value <= max;
}

/**
 * The preview of a Vent's profile, or `null` where there is none to draw: a percent outside its
 * domain or a speed that is not one — what the Wind Gate refuses is not drawn as though legal.
 *
 * @param span the horizontal span, m, or `null` when it is not known: the width in metres is then
 *   left out, and the percent stands alone.
 */
export function profilePreview(wind: Wind, span: number | null): ProfilePreview | null {
  const profile = windProfileOf(wind);
  const legal =
    within(profile.width, WIND_PROFILE.width) &&
    within(profile.attenuation, WIND_PROFILE.attenuation) &&
    wind.speedKmh >= 0 &&
    Number.isFinite(wind.speedKmh);
  if (!legal) return null;
  const lambda = profile.width / 100;
  return {
    midKmh: windProfileSpeed(wind.speedKmh, profile, 0.5),
    anchorKmh: windProfileSpeed(wind.speedKmh, profile, 0),
    uniform: profile.attenuation === 0,
    width: profile.width,
    widthMetres: span !== null && span > 0 ? lambda * span : null,
    marks: [(1 - lambda) / 2, (1 + lambda) / 2],
    curve: Array.from({ length: PROFILE_PREVIEW_STEPS + 1 }, (_, step) => {
      const xi = step / PROFILE_PREVIEW_STEPS;
      return { xi, share: windProfileSpeed(1, profile, xi) };
    }),
  };
}
