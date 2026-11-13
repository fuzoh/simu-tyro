/**
 * **The first-load protocol (#128)** — cold loads of a production build, measured from Chromium over
 * the DevTools protocol. `docs/performance/first-load.md` is the report this produces numbers for;
 * the protocol is written there, and this file is its one implementation.
 *
 * ```bash
 * BASE_PATH=/simu-tyro/ bun run build:pages            # the build GitHub Pages ships
 * bun scripts/first-load.ts [--dist dist/client] [--runs 5] [--profile desktop,mobile]
 *                           [--scenario blank,link,avance,vue3d] [--json out.json]
 *                           [--block <URL pattern>]   # a module that never arrives, e.g. the map's
 * bun scripts/first-load.ts --dist dist/client --serve   # the same server, for a look by hand
 * ```
 *
 * - **Served the way GitHub Pages serves it**: under `/simu-tyro/`, gzip on text, `index.html` at a
 *   directory, a 301 from `/avance` to `/avance/` keeping the query, `404.html` for anything else.
 * - **Cold every run**: a new Chromium and a new profile directory each time — no HTTP cache, no V8
 *   code cache, no `localStorage`, so no Session.
 * - **Two profiles**, set over CDP: `desktop` (10 Mbit/s down, 40 ms latency, CPU 1×) and `mobile`
 *   (DevTools « Fast 4G »: 8,1 Mbit/s down, 165 ms latency, CPU 4×).
 * - **App against external**: a request to the server's origin is the app's; anything else —
 *   swisstopo's tiles, styles, relief, the profil geo.admin — is external and reported apart.
 *
 * Milestones, as `performance.now()` in the page:
 * - **usable** — the Page's first usable screen: the navigation bar is links (hydrated), no element
 *   is `aria-busy="true"` (the Skeleton is gone) and a form field is enabled. The fields, the tiles
 *   and the Verdict are live; the vue de dessus may still be filling.
 * - **map** — the vue de dessus's MapLibre canvas is in the document.
 * - **vue3d** — after a press of « 3D » at `usable` + network idle: the CesiumJS canvas is in the
 *   document, timed from the press.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";

type Profile = { latencyMs: number; downKbps: number; upKbps: number; cpu: number };

const PROFILES: Record<string, Profile> = {
  desktop: { latencyMs: 40, downKbps: 10_240, upKbps: 10_240, cpu: 1 },
  mobile: { latencyMs: 165, downKbps: 9_000 * 0.9, upKbps: 1_500 * 0.9, cpu: 4 },
};

/**
 * The trial line (#90): both Positions and a three-point imported profil (`TRACE_P1` of the URL
 * fixtures), so the Vue 3D can open and no profil geo.admin is asked for. Shorter than a link the
 * app writes today, so the Page completes it and shows the « champs absents » strip — an old shared
 * link, as it lands.
 */
export const TRIAL_LINE =
  "v=1&u=daN&use=perm&za=12&zb=12&fl=6&lata=46.843556&lona=6.525035&latb=46.846166&lonb=6.520783" +
  "&tr=p1.AwCQTpBOAJ8G5wcA";

const SCENARIOS: Record<string, { path: string; vue3d?: boolean }> = {
  /** A first visit: `/`, no Session, no search — the carte claire over Switzerland. */
  blank: { path: "" },
  /** A shared link onto Statique. */
  link: { path: `?${TRIAL_LINE}` },
  /** A shared link onto Avancé, the heaviest Page. */
  avance: { path: `avance?${TRIAL_LINE}` },
  /** The shared link onto Statique, then the first press of « 3D ». */
  vue3d: { path: `?${TRIAL_LINE}`, vue3d: true },
};

export const BASE = "/simu-tyro/";
const CHROMIUM = process.env.CHROMIUM ?? "/usr/bin/chromium";

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : (process.argv[at + 1] ?? fallback);
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".xml": "application/xml",
  ".txt": "text/plain",
};
const COMPRESSED = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);

/** One response of the server's: what crossed the wire, and the file's own size. */
export type Served = { path: string; ext: string; sent: number; size: number };

/**
 * GitHub Pages, as far as a first load can tell: see the file's docblock. Every response is logged
 * in `served`, the app's side of the count — a Worker's own fetch included, which the page's
 * DevTools session sees only in part.
 */
export function serve(
  root: string,
): Promise<{ origin: string; served: Served[]; close: () => void }> {
  const served: Served[] = [];
  const gz = new Map<string, Uint8Array>();
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://x");
    if (!url.pathname.startsWith(BASE)) {
      response.writeHead(404).end();
      return;
    }
    const rel = normalize(decodeURIComponent(url.pathname.slice(BASE.length)));
    let file = join(root, rel);
    let status = 200;
    const isDir = (path: string) => {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    };
    const isFile = (path: string) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    };
    if (isDir(file)) {
      if (!url.pathname.endsWith("/")) {
        response.writeHead(301, { location: `${url.pathname}/${url.search}` }).end();
        return;
      }
      file = join(file, "index.html");
    }
    if (!isFile(file)) {
      file = join(root, "404.html");
      status = 404;
    }
    const ext = extname(file);
    const headers: Record<string, string> = {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": "max-age=600",
    };
    let body: Uint8Array = readFileSync(file);
    if (COMPRESSED.has(ext) && /\bgzip\b/.test(String(request.headers["accept-encoding"]))) {
      let packed = gz.get(file);
      if (packed === undefined) {
        packed = gzipSync(body, { level: 6 });
        gz.set(file, packed);
      }
      body = packed;
      headers["content-encoding"] = "gzip";
    }
    served.push({
      path: url.pathname + url.search,
      ext,
      sent: body.byteLength,
      size: statSync(file).size,
    });
    response.writeHead(status, headers).end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;
      resolve({ origin: `http://127.0.0.1:${port}`, served, close: () => server.close() });
    });
  });
}

type Message = {
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
  sessionId?: string;
};

/** A one-page CDP session over the page target's WebSocket. */
export class Cdp {
  private next = 1;
  private readonly pending = new Map<number, (message: Message) => void>();
  private readonly listeners: ((message: Message) => void)[] = [];
  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as Message;
      if (message.id !== undefined) this.pending.get(message.id)?.(message);
      else for (const listener of this.listeners) listener(message);
    });
  }
  static open(url: string): Promise<Cdp> {
    const socket = new WebSocket(url);
    return new Promise((resolve, reject) => {
      socket.addEventListener("open", () => resolve(new Cdp(socket)));
      socket.addEventListener("error", reject);
    });
  }
  send(method: string, params: object = {}, sessionId?: string): Promise<any> {
    const id = this.next++;
    this.socket.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, (message) => {
        this.pending.delete(id);
        if (message.error !== undefined) reject(new Error(`${method}: ${message.error.message}`));
        else resolve(message.result);
      });
    });
  }
  on(listener: (message: Message) => void) {
    this.listeners.push(listener);
  }
  close() {
    this.socket.close();
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param flags more of Chromium's switches, after the protocol's own — `scripts/rider-drag.ts`'s. */
export async function launch(
  flags: readonly string[] = [],
): Promise<{ cdp: Cdp; quit: () => void }> {
  const profile = mkdtempSync(join(tmpdir(), "first-load-"));
  const child = spawn(
    CHROMIUM,
    [
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-sync",
      "--enable-unsafe-swiftshader",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--window-size=1440,900",
      ...flags,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let port = "";
  for (let tries = 0; tries < 100 && port === ""; tries++) {
    await sleep(100);
    try {
      port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0] ?? "";
    } catch {
      // not yet written
    }
  }
  const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
    type: string;
    webSocketDebuggerUrl: string;
  }[];
  const page = targets.find((target) => target.type === "page");
  if (page === undefined) throw new Error("no page target");
  const cdp = await Cdp.open(page.webSocketDebuggerUrl);
  return {
    cdp,
    quit: () => {
      cdp.close();
      child.kill("SIGKILL");
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

/** Injected before any of the page's scripts: the milestones and the long tasks. */
const OBSERVER = `(() => {
  const perf = (window.__perf = { longtasks: [], fcp: null, lcp: null, usable: null, map: null, vue3d: null, pressed: null, nav: null, input: null, unbusy: null });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) perf.longtasks.push([e.startTime, e.duration]); })
    .observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) if (e.name === "first-contentful-paint") perf.fcp = e.startTime; })
    .observe({ type: "paint", buffered: true });
  new PerformanceObserver((list) => { for (const e of list.getEntries()) perf.lcp = e.startTime; })
    .observe({ type: "largest-contentful-paint", buffered: true });
  const check = () => {
    const now = performance.now();
    if (perf.usable === null
      && document.querySelector('nav[aria-label="Pages"] a') !== null
      && document.querySelector('[aria-busy="true"]') === null
      && document.querySelector("input:not([disabled]), select:not([disabled])") !== null) perf.usable = now;
    if (perf.map === null && document.querySelector(".maplibregl-canvas") !== null) perf.map = now;
    if (perf.nav === null && document.querySelector('nav[aria-label="Pages"] a') !== null) perf.nav = now;
    if (perf.input === null && document.querySelector("input:not([disabled]), select:not([disabled])") !== null) perf.input = now;
    if (perf.unbusy === null && document.body !== null && document.querySelector('[aria-busy="true"]') === null) perf.unbusy = now;
    if (perf.vue3d === null && perf.pressed !== null && document.querySelector(".cesium-widget canvas") !== null) perf.vue3d = now - perf.pressed;
  };
  new MutationObserver(check).observe(document, { subtree: true, childList: true, attributes: true });
})();`;

type Fetched = {
  url: string;
  type: string;
  encoded: number;
  decoded: number;
  /** Sent and finished, ms after the navigation was asked for. */
  start: number;
  end: number;
};

type Run = {
  usable: number | null;
  map: number | null;
  vue3d: number | null;
  fcp: number | null;
  lcp: number | null;
  /** `usable`'s three conditions, each when it first held: hydrated bar, enabled field, no Skeleton. */
  marks: { nav: number | null; input: number | null; unbusy: number | null };
  /** Long tasks before `usable`: count, sum, total blocking time (the part over 50 ms), longest. */
  longTasks: { count: number; total: number; tbt: number; max: number };
  /** Main-thread totals at network idle, from `Performance.getMetrics`, ms. */
  scriptMs: number;
  /** Parse and compile, background threads included; top-level module evaluation. From the trace. */
  parseMs: number;
  evaluateMs: number;
  taskMs: number;
  layoutStyleMs: number;
  app: { requests: number; encoded: number; decoded: number; byType: Record<string, number> };
  external: { requests: number; encoded: number };
  /** After the press of « 3D »: what the app fetched for it. */
  vue3dApp?: { requests: number; encoded: number; decoded: number };
  /** The app's responses during the load, as the server sent them. */
  served: Served[];
  files: Fetched[];
};

/** What kind of file the app sent, by its extension. */
function kindOf(ext: string): string {
  if (ext === ".js" || ext === ".mjs") return "script";
  if (ext === ".css") return "stylesheet";
  if (ext === ".woff2" || ext === ".woff" || ext === ".ttf") return "font";
  if (ext === ".html") return "document";
  return "other";
}

function tally(files: Served[]) {
  const byType: Record<string, number> = {};
  for (const file of files) byType[kindOf(file.ext)] = (byType[kindOf(file.ext)] ?? 0) + file.sent;
  return {
    requests: files.length,
    encoded: files.reduce((sum, file) => sum + file.sent, 0),
    decoded: files.reduce((sum, file) => sum + file.size, 0),
    byType,
  };
}

async function measure(
  block: string,
  served: Served[],
  origin: string,
  scenario: (typeof SCENARIOS)[string],
  profile: Profile,
): Promise<Run> {
  const { cdp, quit } = await launch();
  served.length = 0;
  try {
    const requests = new Map<string, Fetched>();
    const meta = new Map<string, { url: string; type: string; start: number }>();
    let navigated = Date.now();
    let lastNetwork = Date.now();
    const inflight = new Set<string>();
    const traceEvents: any[] = [];
    let traced: () => void = () => {};
    cdp.on((message) => {
      const params = message.params;
      switch (message.method) {
        case "Network.requestWillBeSent":
          meta.set(params.requestId, {
            url: params.request.url,
            type: params.type ?? "Other",
            start: Date.now() - navigated,
          });
          inflight.add(params.requestId);
          lastNetwork = Date.now();
          break;
        case "Network.responseReceived": {
          const known = meta.get(params.requestId);
          if (known !== undefined) known.type = params.type ?? known.type;
          break;
        }
        case "Network.dataReceived": {
          const known = meta.get(params.requestId);
          if (known === undefined) break;
          const entry = requests.get(params.requestId) ?? {
            ...known,
            encoded: 0,
            decoded: 0,
            end: 0,
          };
          entry.decoded += params.dataLength;
          requests.set(params.requestId, entry);
          break;
        }
        case "Network.loadingFinished":
        case "Network.loadingFailed": {
          inflight.delete(params.requestId);
          lastNetwork = Date.now();
          const known = meta.get(params.requestId);
          if (known === undefined) break;
          const entry = requests.get(params.requestId) ?? {
            ...known,
            encoded: 0,
            decoded: 0,
            end: 0,
          };
          entry.encoded = params.encodedDataLength ?? 0;
          entry.end = Date.now() - navigated;
          requests.set(params.requestId, entry);
          break;
        }
        case "Tracing.dataCollected":
          traceEvents.push(...params.value);
          break;
        case "Target.attachedToTarget":
          // MapLibre's worker fetches its own script: its Network events are the worker's.
          void cdp.send("Network.enable", {}, params.sessionId).catch(() => {});
          void cdp.send("Runtime.runIfWaitingForDebugger", {}, params.sessionId).catch(() => {});
          break;
        case "Tracing.tracingComplete":
          traced();
          break;
      }
    });
    await cdp.send("Network.enable");
    await cdp.send("Target.setAutoAttach", {
      autoAttach: true,
      waitForDebuggerOnStart: false,
      flatten: true,
    });
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
    // `--block <pattern>`: a deferred module that cannot arrive, to measure its failure path.
    if (block !== "") await cdp.send("Network.setBlockedURLs", { urls: [block] });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: profile.latencyMs,
      downloadThroughput: (profile.downKbps * 1024) / 8,
      uploadThroughput: (profile.upKbps * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.enable");
    await cdp.send("Performance.enable");
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: OBSERVER });
    await cdp.send("Tracing.start", {
      traceConfig: { includedCategories: ["devtools.timeline", "v8", "v8.execute"] },
      transferMode: "ReportEvents",
    });
    navigated = Date.now();
    await cdp.send("Page.navigate", { url: `${origin}${BASE}${scenario.path}` });

    const read = async () =>
      (
        await cdp.send("Runtime.evaluate", {
          expression: "JSON.stringify(window.__perf ?? null)",
          returnByValue: true,
        })
      ).result.value as string;
    const idle = async (deadline: number, quiet: number) => {
      for (;;) {
        await sleep(100);
        if (Date.now() > deadline) return;
        if (inflight.size === 0 && Date.now() - lastNetwork > quiet) return;
      }
    };
    const start = Date.now();
    for (;;) {
      await sleep(100);
      const perf = JSON.parse((await read()) ?? "null");
      if (perf?.usable != null || Date.now() - start > 60_000) break;
    }
    await idle(Date.now() + 60_000, 2_000);

    const metrics = Object.fromEntries(
      ((await cdp.send("Performance.getMetrics")).metrics as { name: string; value: number }[]).map(
        ({ name, value }) => [name, value],
      ),
    );
    const done = new Promise<void>((resolve) => (traced = resolve));
    await cdp.send("Tracing.end");
    await done;

    const loadFiles = [...requests.values()];
    const loadServed = served.slice();
    let vue3dApp: Run["vue3dApp"];
    if (scenario.vue3d === true) {
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const button = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "3D");
          window.__perf.pressed = performance.now();
          button.click();
        })()`,
      });
      const pressedAt = Date.now();
      for (;;) {
        await sleep(100);
        const perf = JSON.parse((await read()) ?? "null");
        if (perf?.vue3d != null || Date.now() - pressedAt > 90_000) break;
      }
      await idle(Date.now() + 30_000, 2_000);
      vue3dApp = tally(served.slice(loadServed.length));
    }

    const perf = JSON.parse(await read());
    const before = (perf.longtasks as [number, number][]).filter(
      ([at]) => perf.usable === null || at < perf.usable,
    );
    const own = loadFiles.filter((file) => file.url.startsWith(origin));
    const foreign = loadFiles.filter(
      (file) => !file.url.startsWith(origin) && !file.url.startsWith("data:"),
    );

    const mainThread = traceEvents.find(
      (event) => event.name === "thread_name" && event.args?.name === "CrRendererMain",
    );
    const onMain = traceEvents.filter(
      (event) =>
        mainThread !== undefined &&
        event.pid === mainThread.pid &&
        event.tid === mainThread.tid &&
        event.ph === "X",
    );
    // V8 streams module source to background threads: parsing is `v8.parseOnBackgroundParsing` on
    // any thread, compiling what is left `v8.compile*` on the main one. Evaluation is the modules'
    // top-level code, `v8.evaluateModule`. Nested events of one name are counted once.
    const page =
      mainThread === undefined ? [] : traceEvents.filter((e) => e.pid === mainThread.pid);
    const spent = (events: any[]) => {
      let us = 0;
      let coveredTo = 0;
      for (const event of [...events].sort((x, y) => x.ts - y.ts)) {
        const end = event.ts + (event.dur ?? 0);
        if (end <= coveredTo) continue;
        us += end - Math.max(event.ts, coveredTo);
        coveredTo = end;
      }
      return us / 1000;
    };
    const parsing = page.filter((e) => e.ph === "X" && e.name === "v8.parseOnBackgroundParsing");
    const threads = [...new Set(parsing.map((e) => e.tid))];
    const parseMs =
      threads.reduce((sum, tid) => sum + spent(parsing.filter((e) => e.tid === tid)), 0) +
      spent(onMain.filter((e) => e.name.startsWith("v8.compile")));
    const evaluateMs = spent(onMain.filter((e) => e.name === "v8.evaluateModule"));

    return {
      marks: { nav: perf.nav, input: perf.input, unbusy: perf.unbusy },
      usable: perf.usable,
      map: perf.map,
      vue3d: perf.vue3d,
      fcp: perf.fcp,
      lcp: perf.lcp,
      longTasks: {
        count: before.length,
        total: before.reduce((sum, [, d]) => sum + d, 0),
        tbt: before.reduce((sum, [, d]) => sum + Math.max(0, d - 50), 0),
        max: before.reduce((max, [, d]) => Math.max(max, d), 0),
      },
      scriptMs: (metrics.ScriptDuration ?? 0) * 1000,
      parseMs,
      evaluateMs,
      taskMs: (metrics.TaskDuration ?? 0) * 1000,
      layoutStyleMs: ((metrics.LayoutDuration ?? 0) + (metrics.RecalcStyleDuration ?? 0)) * 1000,
      app: tally(loadServed),
      external: {
        requests: foreign.length,
        encoded: foreign.reduce((sum, file) => sum + file.encoded, 0),
      },
      vue3dApp,
      files: own.map((file) => ({ ...file, url: file.url.slice(origin.length) })),
      served: loadServed,
    };
  } finally {
    quit();
  }
}

export function median(values: (number | null | undefined)[]): number | null {
  const known = values
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  if (known.length === 0) return null;
  const mid = Math.floor(known.length / 2);
  return known.length % 2 === 1 ? known[mid]! : (known[mid - 1]! + known[mid]!) / 2;
}

const kB = (bytes: number | null) => (bytes === null ? "—" : `${(bytes / 1000).toFixed(1)} kB`);
const ms = (value: number | null) => (value === null ? "—" : `${Math.round(value)} ms`);

async function main() {
  const dist = arg("dist", "dist/client");
  const runs = Number(arg("runs", "5"));
  const profiles = arg("profile", "desktop,mobile").split(",");
  const scenarios = arg("scenario", "blank,link,avance,vue3d").split(",");
  const out = arg("json", "");
  const block = arg("block", "");
  const { origin, served, close } = await serve(dist);
  if (process.argv.includes("--serve")) {
    // The same server, left running for a look by hand (`agent-browser`), and no measurement.
    console.log(`${origin}${BASE}`);
    return;
  }
  const results: Record<string, Run[]> = {};
  try {
    for (const profileName of profiles) {
      const profile = PROFILES[profileName];
      if (profile === undefined) throw new Error(`unknown profile ${profileName}`);
      for (const name of scenarios) {
        const scenario = SCENARIOS[name];
        if (scenario === undefined) throw new Error(`unknown scenario ${name}`);
        const key = `${profileName}/${name}`;
        results[key] = [];
        for (let run = 0; run < runs; run++)
          results[key].push(await measure(block, served, origin, scenario, profile));
        const set = results[key];
        const pick = (get: (run: Run) => number | null | undefined) => median(set.map(get));
        console.log(
          [
            key.padEnd(16),
            `usable ${ms(pick((r) => r.usable))}`,
            `map ${ms(pick((r) => r.map))}`,
            `fcp ${ms(pick((r) => r.fcp))}`,
            `lcp ${ms(pick((r) => r.lcp))}`,
            `app ${kB(pick((r) => r.app.encoded))} (${kB(pick((r) => r.app.decoded))} decoded, ${pick((r) => r.app.requests)} req)`,
            `js ${kB(pick((r) => r.app.byType.script ?? 0))}`,
            `css ${kB(pick((r) => r.app.byType.stylesheet ?? 0))}`,
            `font ${kB(pick((r) => r.app.byType.font ?? 0))}`,
            `ext ${kB(pick((r) => r.external.encoded))} (${pick((r) => r.external.requests)} req)`,
            `script ${ms(pick((r) => r.scriptMs))}`,
            `parse ${ms(pick((r) => r.parseMs))}`,
            `eval ${ms(pick((r) => r.evaluateMs))}`,
            `tasks ${ms(pick((r) => r.taskMs))}`,
            `long ${pick((r) => r.longTasks.count)}×/${ms(pick((r) => r.longTasks.total))} tbt ${ms(pick((r) => r.longTasks.tbt))} max ${ms(pick((r) => r.longTasks.max))}`,
            scenario.vue3d === true
              ? `vue3d ${ms(pick((r) => r.vue3d))} (+${kB(pick((r) => r.vue3dApp?.encoded))} app)`
              : "",
          ].join(" · "),
        );
      }
    }
  } finally {
    close();
  }
  if (out !== "") {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(out, JSON.stringify(results, null, 2));
  }
}

// Run as a script, not when `scripts/rider-drag.ts` borrows its server and browser.
if ((import.meta as { main?: boolean }).main) await main();
