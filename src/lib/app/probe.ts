/**
 * **The rider-drag protocol's marks (#130)** — User Timing entries that say when a position was
 * asked of the coupe, what each stage between it and the Vue 3D cost, and when the Vue 3D drew it.
 * `scripts/rider-drag.ts` reads them; `docs/performance/rider-drag.md` is the report.
 *
 * Rules this module exists to keep:
 *
 * - **Off unless a harness asked for it before the app's scripts ran**: `globalThis.__scoutechProbe`
 *   set to `true`, which nothing in the app does. Off, every call is one property read and nothing
 *   is recorded — no entry piles up in the performance timeline of a reader's tab.
 * - **A mark carries the passager's `x_D`, the value the Scenario holds**, so the harness can pair
 *   the position asked with the position drawn without reading the canvas.
 * - **The names are a contract with the harness**, listed in {@link ProbeName}; a stage renamed here
 *   is renamed there.
 */

/**
 * - `rider:asked` — the coupe dispatched a new `x_D` (a scrub).
 * - `coupe:rider` — the coupe placed the passager (`placeRider`), a span.
 * - `vue3d:scene` — the Vue 3D's scene built for the new `x_D`, a span.
 * - `vue3d:show` — the renderer handed that scene, a span.
 * - `vue3d:entities` — one frame's entity update in CesiumJS, entities into geometry, a span.
 * - `vue3d:render` — one frame's render in CesiumJS, after its entity update, a span.
 * - `vue3d:shown` — the first frame the renderer drew with that scene complete on the GPU.
 */
export type ProbeName =
  | "rider:asked"
  | "coupe:rider"
  | "vue3d:scene"
  | "vue3d:show"
  | "vue3d:entities"
  | "vue3d:render"
  | "vue3d:shown";

/** Is a harness listening? Read on every call, so a test can switch it. */
export function probing(): boolean {
  return (globalThis as { __scoutechProbe?: unknown }).__scoutechProbe === true;
}

/** Marks `name` now, with `detail`, when probing. */
export function probeMark(name: ProbeName, detail?: unknown): void {
  if (!probing()) return;
  performance.mark(name, { detail });
}

/**
 * Runs `run` and, when probing, records its span as a measure named `name`.
 *
 * @returns what `run` returned — the probe never changes it.
 */
export function probeSpan<T>(name: ProbeName, detail: unknown, run: () => T): T {
  if (!probing()) return run();
  const start = performance.now();
  const result = run();
  performance.measure(name, { start, end: performance.now(), detail });
  return result;
}

/** Records the span from `start` — a `performance.now()` — to now, when probing. */
export function probeMeasure(name: ProbeName, start: number, detail?: unknown): void {
  if (!probing()) return;
  performance.measure(name, { start, end: performance.now(), detail });
}

/** The detail a value was tagged with, so a module that only holds the value can mark it. */
const tags = new WeakMap<object, unknown>();

/** Tags `value` with `detail` when probing; `value` comes back untouched. */
export function probeTag<T extends object>(value: T, detail: unknown): T {
  if (probing()) tags.set(value, detail);
  return value;
}

/** What {@link probeTag} tagged `value` with, or `undefined`. */
export function probeTagOf(value: object): unknown {
  return tags.get(value);
}
