/**
 * **The rider-drag protocol (#130)** — the passager dragged along the coupe while the Vue 3D shows
 * the line, on a production build, measured from Chromium over the DevTools protocol.
 * `docs/performance/rider-drag.md` is the report this produces numbers for; the protocol is written
 * there, and this file is its one implementation. It borrows the server and the browser of
 * `scripts/first-load.ts` (#128).
 *
 * ```bash
 * BASE_PATH=/simu-tyro/ bun run build:pages            # the build GitHub Pages ships
 * bun scripts/rider-drag.ts [--dist dist/client] [--runs 5] [--gesture steady,fast]
 *                           [--seconds 4] [--cpu 1] [--json out.json] [--trace trace.json]
 *                           [--shot shot.png] [--lines 2]
 * ```
 *
 * One run:
 * 1. A new Chromium and profile, viewport 1920 × 1080 at DPR 1, the probe switched on
 *    (`@/lib/app/probe.ts`) before any of the app's scripts.
 * 2. Statique on the verified line (`VERIFIED_LINE`), then a press of « 3D »; the run waits for the Vue 3D's
 *    first complete frame and for the network to be quiet for 2 s — swisstopo's tiles in.
 * 3. The Page's middle column scrolled until the coupe's handle stands 160 px above the bottom of the
 *    window, where the reader sees the coupe and, above it, most of the Vue 3D.
 * 4. **The gesture**: a press on the handle, then a mouse move every 8 ms (a 125 Hz mouse) for
 *    `--seconds`, the pointer going back and forth over 80 % of the plot's width — `steady` once in
 *    4 s, `fast` once in 0,8 s — then, without a pause, three moves to a quarter of the plot and the
 *    release there. The moves follow the wall clock: a slow page receives fewer, never a longer
 *    gesture.
 * 5. 1,5 s of rest, then the marks are read.
 *
 * Measured, from the press to 1 s after the release:
 * - **Frames** — the intervals between `requestAnimationFrame` callbacks: p50, p95, max, and how many
 *   exceed 1,5 vsync (25 ms at 60 Hz). **Long tasks** — `longtask` entries: count, sum, max.
 * - **Latency** — from the `pointermove` that asked a position (its `timeStamp`) to the first Vue 3D
 *   frame drawn with that position complete (`vue3d:shown`, at the end of that frame's CesiumJS
 *   render, so one compositor frame before the pixels): p50, p95, max over the positions drawn, and
 *   how many positions asked were drawn at all.
 * - **The end of the gesture** — the last position asked, the last one drawn, the field's, and the
 *   time from the release to the drawing of the last; any position drawn after it is a stale result.
 * - **Stages** — each of the probe's spans: count, p50, p95, sum.
 * - Every p50 and p95 of a run is a nearest-rank sample (`quantile`); the figure reported for a
 *   gesture is the median of its runs' (`median`).
 * - With `--trace`: one run's trace, and the main thread's time between the press and the release by
 *   what it ran — input handlers, animation frames (CesiumJS), other script (React's scheduler),
 *   style and layout, paint, GC — then CesiumJS's workers and the GPU process.
 */

import { writeFileSync } from "node:fs";

import type { Cdp } from "./first-load.ts";

import { CANONICAL_LINKS } from "../src/lib/url/__fixtures__/canonical-links.ts";
import { arg, BASE, launch, median, serve, sleep } from "./first-load.ts";

/**
 * The verified line (#103): the trial's two Positions and the 200-point profil geo.admin they were
 * loaded with, 435 m, as the app writes its link — a canonical link of the URL fixtures, so the
 * protocol drags the passager over the line the maintainer measured, on the relief it stands on.
 * The `TRIAL_LINE` of `scripts/first-load.ts` will not do here: its three-point profil puts the line
 * under swisstopo's relief, where the Vue 3D's camera sees ground and no line.
 */
const VERIFIED_LINE = (() => {
  const found = CANONICAL_LINKS.find(({ covers }) => covers.includes("trace-full-profil"));
  if (found === undefined) throw new Error("no canonical link with a full profil geo.admin");
  return found.link.replace(/^\//, "");
})();

type Gesture = { periodS: number };

const GESTURES: Record<string, Gesture> = {
  /** Back and forth once in 4 s: reading the line along its span. */
  steady: { periodS: 4 },
  /** Back and forth once in 0,8 s: a flick, the fastest a reader drags. */
  fast: { periodS: 0.8 },
};

const VIEWPORT = { width: 1920, height: 1080 } as const;
/** A mouse at 125 Hz. */
const MOVE_EVERY_MS = 8;

/** Injected before any of the page's scripts: the probe on, the frames, moves and long tasks. */
const OBSERVER = `(() => {
  window.__scoutechProbe = true;
  const drag = (window.__drag = { recording: false, frames: [], moves: [], longtasks: [] });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) drag.longtasks.push([e.startTime, e.duration]); })
    .observe({ type: "longtask", buffered: true });
  const frame = (at) => { if (drag.recording) drag.frames.push(at); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  addEventListener("pointermove", (event) => { if (drag.recording) drag.moves.push(event.timeStamp); }, { capture: true });
})();`;

type Entry = { name: string; startTime: number; duration: number; detail: unknown };

type Run = {
  renderer: string;
  /** How much of the Vue 3D's canvas stood in the window during the gesture, 0–1. */
  canvasVisible: number;
  frames: { count: number; p50: number; p95: number; max: number; over25: number };
  longTasks: { count: number; total: number; max: number };
  moves: number;
  asked: number;
  /** Distinct positions asked, and those of them the Vue 3D drew. */
  positions: { asked: number; drawn: number };
  latency: { p50: number | null; p95: number | null; max: number | null };
  /**
   * From the `rider:asked` mark to the renderer handed that position (`vue3d:show`): the Page's
   * React render, commit and effects in between. p50 and p95, ms.
   */
  toShow: { p50: number | null; p95: number | null };
  end: {
    asked: number | null;
    drawn: number | null;
    field: number | null;
    /** From the release to the frame that drew the last position, ms. */
    settleMs: number | null;
    /** Positions drawn after the last one asked was drawn: stale results. */
    staleAfter: number;
  };
  stages: Record<string, { count: number; p50: number; p95: number; total: number }>;
  trace?: Record<string, number>;
};

/**
 * A run's p50 or p95, by **nearest rank**: the sample at index `ceil(q·n) − 1` of the sorted
 * values, `null` for none. Not the bench gate's `percentile` (`src/lib/sim/bench-harness.ts`),
 * which reads index `min(n − 1, floor(n·p))` — one slot higher wherever `q·n` is a whole number,
 * as on its 40 samples — so a « p95 » here and one there are not the same statistic. Kept as the
 * report's figures were taken: `docs/performance/rider-drag.md` § 1 says so.
 */
function quantile(values: number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]!;
}

/** The position under the pointer `t` ms into the gesture, as a fraction of the plot's width. */
function along(t: number, gesture: Gesture): number {
  // A triangle wave from the handle (0,5): right, back, left, back — over 80 % of the plot.
  const phase = (t / (gesture.periodS * 1000)) % 1;
  const wave = phase < 0.25 ? phase * 4 : phase < 0.75 ? 2 - phase * 4 : phase * 4 - 4;
  return 0.5 + 0.4 * wave;
}

async function evaluate<T>(cdp: Cdp, expression: string): Promise<T> {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails !== undefined) throw new Error(JSON.stringify(exceptionDetails));
  return result.value as T;
}

async function until(cdp: Cdp, expression: string, timeoutMs: number, what: string) {
  const start = Date.now();
  for (;;) {
    if (await evaluate<boolean>(cdp, expression)) return;
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${what}`);
    await sleep(100);
  }
}

/**
 * The main thread's time between `from` and `to` (trace µs) by what it ran, and the busy time of the
 * workers and the GPU process — see the file's docblock.
 */
function attribute(events: any[], from: number, to: number): Record<string, number> {
  const threads = new Map<string, string>();
  for (const event of events) {
    if (event.name === "thread_name") threads.set(`${event.pid}:${event.tid}`, event.args?.name);
  }
  const main = [...threads].find(([, name]) => name === "CrRendererMain")?.[0];
  const inside = (event: any) => event.ph === "X" && event.ts < to && event.ts + event.dur > from;
  const clip = (event: any): [number, number] => [
    Math.max(event.ts, from),
    Math.min(event.ts + event.dur, to),
  ];
  /** The union of the spans, ms: an event nested in one of its own name counts once. */
  const union = (spans: [number, number][]) => {
    let us = 0;
    let coveredTo = -Infinity;
    for (const [start, end] of spans.sort((a, b) => a[0] - b[0])) {
      if (end <= coveredTo) continue;
      us += end - Math.max(start, coveredTo);
      coveredTo = end;
    }
    return us / 1000;
  };
  const onMain = events.filter((e) => `${e.pid}:${e.tid}` === main && inside(e));
  const named = (...names: string[]) => onMain.filter((e) => names.includes(e.name)).map(clip);
  const within = (span: [number, number], outer: [number, number][]) =>
    outer.some(([start, end]) => span[0] >= start && span[1] <= end);
  const input = named("EventDispatch");
  const frames = named("FireAnimationFrame");
  const handlers = [...input, ...frames];
  const busy = (name: string) =>
    union(
      events
        .filter((e) => threads.get(`${e.pid}:${e.tid}`) === name && inside(e))
        .filter((e) => e.name === "ThreadControllerImpl::RunTask" || e.name === "RunTask")
        .map(clip),
    );
  const workers = [...threads]
    .filter(([, name]) => name === "DedicatedWorker thread")
    .map(([key]) => key);
  return {
    windowMs: (to - from) / 1000,
    mainBusy: union(named("ThreadControllerImpl::RunTask", "RunTask")),
    input: union(input),
    animationFrames: union(frames),
    /** Script outside input handlers and animation frames: React's scheduler, timers. */
    otherScript: union(
      named("FunctionCall", "TimerFire", "EvaluateScript").filter((s) => !within(s, handlers)),
    ),
    styleLayout: union(named("UpdateLayoutTree", "Layout").filter((s) => !within(s, handlers))),
    paint: union(named("PrePaint", "Paint", "Layerize", "Commit")),
    gc: union(named("MinorGC", "MajorGC", "V8.GC_SCAVENGER", "V8.GC_MARK_COMPACTOR")),
    workers: union(
      events
        .filter((e) => workers.includes(`${e.pid}:${e.tid}`) && inside(e))
        .filter((e) => e.name === "ThreadControllerImpl::RunTask" || e.name === "RunTask")
        .map(clip),
    ),
    gpu: busy("CrGpuMain"),
  };
}

async function measure(
  origin: string,
  search: string,
  gesture: Gesture,
  seconds: number,
  cpu: number,
  trace: string,
  shot: string,
): Promise<Run> {
  const { cdp, quit } = await launch([`--window-size=${VIEWPORT.width},${VIEWPORT.height}`]);
  try {
    const traceEvents: any[] = [];
    let traced: () => void = () => {};
    cdp.on((message) => {
      if (message.method === "Tracing.dataCollected") traceEvents.push(...message.params.value);
      if (message.method === "Tracing.tracingComplete") traced();
    });
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      ...VIEWPORT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.enable");
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: OBSERVER });
    await cdp.send("Page.navigate", { url: `${origin}${BASE}${search}` });
    await until(cdp, `document.querySelector(".chart-grab") !== null`, 60_000, "the coupe");
    // The map's module comes beside the Page (#128): its « 3D » after the coupe.
    await until(
      cdp,
      `[...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "3D")`,
      60_000,
      "the « 3D » switch",
    );
    await evaluate(
      cdp,
      `[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "3D").click()`,
    );
    await until(
      cdp,
      `performance.getEntriesByName("vue3d:shown").length > 0`,
      90_000,
      "the Vue 3D",
    );
    // swisstopo's tiles in: no request for 2 s.
    await cdp.send("Network.enable");
    let last = Date.now();
    const inflight = new Set<string>();
    cdp.on((message) => {
      if (message.method === "Network.requestWillBeSent") inflight.add(message.params.requestId);
      if (
        message.method === "Network.loadingFinished" ||
        message.method === "Network.loadingFailed"
      )
        inflight.delete(message.params.requestId);
      if (message.method?.startsWith("Network.")) last = Date.now();
    });
    for (const deadline = Date.now() + 30_000; Date.now() < deadline;) {
      await sleep(200);
      if (inflight.size === 0 && Date.now() - last > 2_000) break;
    }
    const renderer = await evaluate<string>(
      cdp,
      `(() => { const gl = document.querySelector(".cesium-widget canvas").getContext("webgl2");
        const info = gl.getExtension("WEBGL_debug_renderer_info");
        return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); })()`,
    );
    const box = await evaluate<{
      handle: { x: number; y: number };
      plot: { left: number; width: number };
      visible: number;
    }>(
      cdp,
      `(() => {
        const grab = document.querySelector(".chart-grab");
        const at = grab.getBoundingClientRect();
        // The Page's middle column scrolls, not the window.
        let column = grab.parentElement;
        while (column !== null && !(column.scrollHeight > column.clientHeight && /auto|scroll/.test(getComputedStyle(column).overflowY))) column = column.parentElement;
        (column ?? document.scrollingElement).scrollTop += at.top + at.height / 2 - (innerHeight - 160);
        const handle = grab.getBoundingClientRect();
        const plot = grab.ownerSVGElement.querySelector("rect.fill-transparent").getBoundingClientRect();
        const canvas = document.querySelector(".cesium-widget canvas").getBoundingClientRect();
        const shown = Math.max(0, Math.min(canvas.bottom, innerHeight) - Math.max(canvas.top, 0));
        return {
          handle: { x: handle.left + handle.width / 2, y: handle.top + handle.height / 2 },
          plot: { left: plot.left, width: plot.width },
          visible: shown / canvas.height,
        };
      })()`,
    );
    await sleep(500);
    if (cpu !== 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
    if (trace !== "") {
      await cdp.send("Tracing.start", {
        traceConfig: {
          includedCategories: [
            "devtools.timeline",
            "disabled-by-default-devtools.timeline",
            "blink.user_timing",
            "v8.execute",
            "toplevel",
            "gpu",
          ],
        },
        transferMode: "ReportEvents",
      });
    }
    const x = (fraction: number) => box.plot.left + fraction * box.plot.width;
    const mouse = (type: string, at: number) =>
      cdp.send("Input.dispatchMouseEvent", {
        type,
        x: at,
        y: box.handle.y,
        button: "left",
        buttons: type === "mouseReleased" ? 0 : 1,
        clickCount: type === "mouseMoved" ? 0 : 1,
      });
    await evaluate(
      cdp,
      `window.__drag.recording = true; window.__drag.pressed = performance.now()`,
    );
    await mouse("mousePressed", box.handle.x);
    const started = Date.now();
    for (let t = 0; t < seconds * 1000; t = Date.now() - started) {
      await mouse("mouseMoved", x(along(t, gesture)));
      const next = started + (Math.floor(t / MOVE_EVERY_MS) + 1) * MOVE_EVERY_MS;
      if (next > Date.now()) await sleep(next - Date.now());
    }
    const from = along(Date.now() - started, gesture);
    for (const step of [1, 2, 3]) {
      await mouse("mouseMoved", x(from + ((0.25 - from) * step) / 3));
      await sleep(MOVE_EVERY_MS);
    }
    await evaluate(cdp, `window.__drag.released = performance.now()`);
    await mouse("mouseReleased", x(0.25));
    await sleep(1_000);
    await evaluate(cdp, `window.__drag.recording = false`);
    await sleep(500);
    if (cpu !== 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    if (shot !== "") {
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(shot, Buffer.from(data, "base64"));
    }

    const page = await evaluate<{
      drag: {
        frames: number[];
        moves: number[];
        longtasks: [number, number][];
        pressed: number;
        released: number;
      };
      entries: Entry[];
      field: string | null;
      origin: number;
    }>(
      cdp,
      `(() => ({
        drag: window.__drag,
        entries: [...performance.getEntriesByType("mark"), ...performance.getEntriesByType("measure")]
          .map(({ name, startTime, duration, detail }) => ({ name, startTime, duration, detail })),
        // The View Strip's « x … m » field, which a scrub fills.
        field: [...document.querySelectorAll("label")]
          .find((l) => l.querySelector("input") !== null && l.textContent.trim().startsWith("x"))
          ?.querySelector("input").value ?? null,
        origin: performance.timeOrigin,
      }))()`,
    );
    const { drag } = page;
    const inGesture = (at: number) => at >= drag.pressed;
    const entries = page.entries.filter((e) => inGesture(e.startTime));
    const intervals = drag.frames.slice(1).map((at, i) => at - drag.frames[i]!);
    const asked = entries
      .filter((e) => e.name === "rider:asked")
      .map((e) => ({ at: e.startTime, xD: e.detail as number }));
    const shown = entries
      .filter((e) => e.name === "vue3d:shown")
      .map((e) => ({ at: e.startTime, xD: e.detail as number }));
    // The pointermove that asked each position: the last one before the mark.
    const inputOf = (at: number) => {
      let found = at;
      for (const move of drag.moves) if (move <= at) found = move;
      return found;
    };
    // A position asked twice in a row was asked by the first of the two.
    const firstAsked = (index: number) => {
      let i = index;
      while (i > 0 && asked[i - 1]!.xD === asked[index]!.xD) i--;
      return asked[i]!;
    };
    const toShow: number[] = [];
    for (const handed of entries.filter((e) => e.name === "vue3d:show")) {
      let index = -1;
      for (let i = 0; i < asked.length; i++) {
        if (asked[i]!.at <= handed.startTime && asked[i]!.xD === handed.detail) index = i;
      }
      if (index !== -1) toShow.push(handed.startTime - firstAsked(index).at);
    }
    const latencies: number[] = [];
    for (const drawn of shown) {
      let index = -1;
      for (let i = 0; i < asked.length; i++) {
        if (asked[i]!.at <= drawn.at && asked[i]!.xD === drawn.xD) index = i;
      }
      if (index === -1) continue;
      latencies.push(drawn.at - inputOf(firstAsked(index).at));
    }
    const lastAsked = asked.length === 0 ? null : firstAsked(asked.length - 1);
    // The last frame that drew the last position asked, after it was asked.
    let lastShownIndex = -1;
    shown.forEach((drawn, i) => {
      if (lastAsked !== null && drawn.xD === lastAsked.xD && drawn.at >= lastAsked.at) {
        lastShownIndex = i;
      }
    });
    const final = lastShownIndex === -1 ? null : shown[lastShownIndex]!;
    const stages: Run["stages"] = {};
    for (const name of [
      "coupe:rider",
      "vue3d:scene",
      "vue3d:show",
      "vue3d:entities",
      "vue3d:render",
    ]) {
      const spans = entries
        .filter((e) => e.name === name && e.startTime <= drag.released + 1_000)
        .map((e) => e.duration);
      stages[name] = {
        count: spans.length,
        p50: quantile(spans, 0.5) ?? 0,
        p95: quantile(spans, 0.95) ?? 0,
        total: spans.reduce((sum, d) => sum + d, 0),
      };
    }
    const longTasks = drag.longtasks.filter(([at]) => inGesture(at));

    let attribution: Run["trace"];
    if (trace !== "") {
      const done = new Promise<void>((resolve) => (traced = resolve));
      await cdp.send("Tracing.end");
      await done;
      writeFileSync(trace, JSON.stringify({ traceEvents }));
      // The page's clock against the trace's: the user-timing marks are in both.
      const press = traceEvents.find(
        (e) => e.name === "rider:asked" && e.cat?.includes("blink.user_timing"),
      );
      const firstAskedAt = asked[0]?.at;
      if (press !== undefined && firstAskedAt !== undefined) {
        const offset = press.ts - firstAskedAt * 1000;
        attribution = attribute(
          traceEvents,
          drag.pressed * 1000 + offset,
          drag.released * 1000 + offset,
        );
      }
    }

    return {
      renderer,
      canvasVisible: box.visible,
      frames: {
        count: intervals.length,
        p50: quantile(intervals, 0.5) ?? 0,
        p95: quantile(intervals, 0.95) ?? 0,
        max: Math.max(0, ...intervals),
        over25: intervals.filter((d) => d > 25).length,
      },
      longTasks: {
        count: longTasks.length,
        total: longTasks.reduce((sum, [, d]) => sum + d, 0),
        max: Math.max(0, ...longTasks.map(([, d]) => d)),
      },
      moves: drag.moves.length,
      asked: asked.length,
      positions: {
        asked: new Set(asked.map((a) => a.xD)).size,
        drawn: new Set(shown.map((s) => s.xD)).size,
      },
      latency: {
        p50: quantile(latencies, 0.5),
        p95: quantile(latencies, 0.95),
        max: latencies.length === 0 ? null : Math.max(...latencies),
      },
      toShow: { p50: quantile(toShow, 0.5), p95: quantile(toShow, 0.95) },
      end: {
        asked: lastAsked?.xD ?? null,
        drawn: shown.at(-1)?.xD ?? null,
        field: page.field === null ? null : Number(page.field.replace(",", ".")),
        settleMs: final === null ? null : final.at - drag.released,
        staleAfter: lastShownIndex === -1 ? shown.length : shown.length - 1 - lastShownIndex,
      },
      stages,
      trace: attribution,
    };
  } finally {
    quit();
  }
}

const ms = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${value.toFixed(1)} ms`;

async function main() {
  const dist = arg("dist", "dist/client");
  const runs = Number(arg("runs", "5"));
  const gestures = arg("gesture", "steady,fast").split(",");
  const seconds = Number(arg("seconds", "4"));
  const cpu = Number(arg("cpu", "1"));
  const out = arg("json", "");
  const trace = arg("trace", "");
  const lines = arg("lines", "1");
  const shot = arg("shot", "");
  // `--lines 2`: two Brins porteurs, drawn as two members in the Vue 3D.
  const search = lines === "2" ? `${VERIFIED_LINE}&bp=2` : VERIFIED_LINE;
  const { origin, close } = await serve(dist);
  const results: Record<string, Run[]> = {};
  try {
    for (const name of gestures) {
      const gesture = GESTURES[name];
      if (gesture === undefined) throw new Error(`unknown gesture ${name}`);
      const set: Run[] = (results[name] = []);
      for (let run = 0; run < runs; run++) {
        // The trace and the screenshot are of the first run only: tracing costs the page time.
        const first = run === 0;
        const result = await measure(
          origin,
          search,
          gesture,
          seconds,
          cpu,
          first && trace !== "" ? trace.replace(/(\.json)?$/, `-${name}.json`) : "",
          first && shot !== "" ? shot.replace(/(\.png)?$/, `-${name}.png`) : "",
        );
        if (first && trace !== "") {
          // A traced run is slower: it is reported for its attribution, not in the medians.
          console.log(`${name} trace`, JSON.stringify(result.trace));
          set.push(await measure(origin, search, gesture, seconds, cpu, "", ""));
        } else set.push(result);
      }
      const pick = (get: (run: Run) => number | null | undefined) => median(set.map(get));
      const correct = set.every(
        (r) =>
          r.end.asked !== null &&
          r.end.asked === r.end.drawn &&
          r.end.field !== null &&
          Math.abs(r.end.field - r.end.asked) < 0.051 &&
          r.end.staleAfter === 0,
      );
      console.log(
        [
          name.padEnd(7),
          `frames p50 ${ms(pick((r) => r.frames.p50))} p95 ${ms(pick((r) => r.frames.p95))} max ${ms(pick((r) => r.frames.max))} >25 ms ${pick((r) => r.frames.over25)}/${pick((r) => r.frames.count)}`,
          `long ${pick((r) => r.longTasks.count)}× ${ms(pick((r) => r.longTasks.total))} max ${ms(pick((r) => r.longTasks.max))}`,
          `latency p50 ${ms(pick((r) => r.latency.p50))} p95 ${ms(pick((r) => r.latency.p95))} max ${ms(pick((r) => r.latency.max))}`,
          `drawn ${pick((r) => r.positions.drawn)}/${pick((r) => r.positions.asked)} positions`,
          `asked→show p50 ${ms(pick((r) => r.toShow.p50))} p95 ${ms(pick((r) => r.toShow.p95))}`,
          `settle ${ms(pick((r) => r.end.settleMs))}`,
          `end ${correct ? "correct" : "WRONG"}`,
          ...Object.entries(set[0]!.stages).map(
            ([stage]) =>
              `${stage} ${pick((r) => r.stages[stage]!.count)}× p50 ${ms(pick((r) => r.stages[stage]!.p50))} p95 ${ms(pick((r) => r.stages[stage]!.p95))}`,
          ),
        ].join(" · "),
      );
      console.log(
        `  renderer ${set[0]!.renderer}, canvas ${Math.round(set[0]!.canvasVisible * 100)} % in view`,
      );
    }
  } finally {
    close();
  }
  if (out !== "") writeFileSync(out, JSON.stringify(results, null, 2));
}

await main();
