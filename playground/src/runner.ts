import { renderManifest, type DiscoveredLayout, type DiscoveredRoute } from "@taserjs/cli/codegen";
import { build, initialize, type Loader, type Plugin } from "esbuild-wasm";
import wasmUrl from "esbuild-wasm/esbuild.wasm?url";

import { PIN_NAMES, resolvePin } from "./pins";
import { MANIFEST_PATH, PLAYGROUND_CONFIG, scanProject } from "./scan";
import { vfs } from "./vfs";

const REQUEST_TIMEOUT_MS = 5_000;

export interface RunnerError {
  file: string;
  line?: number | undefined;
  column?: number | undefined;
  message: string;
}

export type BuildPhase = "booting" | "ready" | "building" | "error";

export interface BuildStatus {
  phase: BuildPhase;
  errors: RunnerError[];
  routes: DiscoveredRoute[];
  layouts: DiscoveredLayout[];
}

export type ConsoleLevel = "log" | "info" | "warn" | "error";

export interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  args: string[];
  timestamp: number;
}

export type RunResult =
  | {
      kind: "response";
      status: number;
      statusText: string;
      headers: [string, string][];
      body: string;
      ms: number;
      logs: ConsoleEntry[];
    }
  | { kind: "error"; error: string; ms: number; logs: ConsoleEntry[] }
  | { kind: "timeout"; ms: number; logs: ConsoleEntry[] };

let initPromise: Promise<void> | null = null;

function ensureEsbuild(): Promise<void> {
  if (!initPromise) {
    initPromise = initialize({
      wasmURL: new URL(wasmUrl, import.meta.url).href,
    })
      .then(() => undefined)
      .catch((err: unknown) => {
        initPromise = null;
        throw err;
      });
  }
  return initPromise;
}

function dirname(filePath: string): string {
  const index = filePath.lastIndexOf("/");
  if (index <= 0) return "/";
  return filePath.slice(0, index);
}

function joinPath(fromDir: string, specifier: string): string {
  if (specifier.startsWith("/")) return specifier;
  const parts = [...fromDir.split("/").filter(Boolean), ...specifier.split("/")];
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "..") stack.pop();
    else if (part !== "." && part !== "") stack.push(part);
  }
  return `/${stack.join("/")}`;
}

function resolveCandidates(target: string): string[] {
  const bases = [target, target.replace(/\.js$/, ""), target.replace(/\.jsx$/, "")];
  const out = new Set<string>();
  for (const base of bases) {
    out.add(base);
    out.add(`${base}.ts`);
    out.add(`${base}.tsx`);
    out.add(`${base}/index.ts`);
    out.add(`${base}/index.tsx`);
  }
  return [...out];
}

function loaderFor(path: string): Loader {
  const ext = path.slice(path.lastIndexOf(".") + 1);
  switch (ext) {
    case "tsx":
      return "tsx";
    case "jsx":
      return "jsx";
    case "json":
      return "json";
    case "css":
      return "css";
    case "js":
    case "mjs":
      return "js";
    default:
      return "ts";
  }
}

const vfsPlugin: Plugin = {
  name: "vfs",
  setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => {
      const specifier = args.path;
      if (/^https?:\/\//.test(specifier)) return { path: specifier, external: true };
      if (!specifier.startsWith("/") && !specifier.startsWith(".")) {
        const pinned = resolvePin(specifier);
        if (pinned) return { path: pinned, external: true };
        return {
          errors: [
            {
              text: `Bare import "${specifier}" is not available. Pinned packages: ${PIN_NAMES.join(", ")}.`,
              location: { file: args.importer || "playground-harness.ts" },
            },
          ],
        };
      }
      const target = joinPath(
        specifier.startsWith("/") ? "" : dirname(args.importer || "/"),
        specifier,
      );
      for (const candidate of resolveCandidates(target)) {
        if (vfs.has(candidate)) return { path: candidate, namespace: "vfs" };
      }
      return {
        errors: [
          {
            text: `Cannot resolve "${specifier}" (tried ${resolveCandidates(target).join(", ")}) within the project files.`,
            location: { file: args.importer || "playground-harness.ts" },
          },
        ],
      };
    });
    builder.onLoad({ filter: /^\/.*/, namespace: "vfs" }, (args) => {
      const contents = vfs.read(args.path) ?? "";
      return { contents, loader: loaderFor(args.path), resolveDir: dirname(args.path) };
    });
  },
};

const HARNESS = `import app from "/.taserjs/routes.gen.js";

function formatArg(value) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack || value.message || String(value);
  if (typeof value === "undefined") return "undefined";
  if (value === null) return "null";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

let activeLogs = null;
let logSeq = 0;
for (const level of ["log", "info", "warn", "error"]) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    if (activeLogs) {
      logSeq += 1;
      activeLogs.push({ id: logSeq, level, args: args.map(formatArg), timestamp: Date.now() });
    }
    original(...args);
  };
}

async function handleRequest(data) {
  const { id, method, url, headers, body } = data;
  const logs = [];
  activeLogs = logs;
  try {
    const init = { method, headers };
    if (body !== undefined) init.body = body;
    const res = await app.fetch(new Request(url, init));
    const responseBody = await res.text();
    self.postMessage({
      id,
      ok: true,
      status: res.status,
      statusText: res.statusText,
      headers: [...res.headers],
      body: responseBody,
      logs,
    });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e?.stack ?? e), logs });
  } finally {
    if (activeLogs === logs) activeLogs = null;
  }
}

let requestQueue = Promise.resolve();
self.onmessage = ({ data }) => {
  requestQueue = requestQueue.then(() => handleRequest(data));
};
`;

// --- build state ------------------------------------------------------------

let status: BuildStatus = { phase: "booting", errors: [], routes: [], layouts: [] };
const statusListeners = new Set<(s: BuildStatus) => void>();

function setStatus(next: BuildStatus): void {
  status = next;
  for (const listener of statusListeners) listener(status);
}

export function getBuildStatus(): BuildStatus {
  return status;
}

export function subscribeBuildStatus(listener: (s: BuildStatus) => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

// --- worker lifecycle -------------------------------------------------------

interface PendingRequest {
  resolve: (result: RunResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  ms: () => number;
}

const pending = new Map<number, PendingRequest>();
let nextRequestId = 1;

let worker: Worker | null = null;
let workerUrl: string | null = null;
let rebuildInFlight: Promise<void> | null = null;
let rebuildQueued = false;

function rejectAllPending(reason: string): void {
  for (const settle of pending.values()) {
    clearTimeout(settle.timer);
    settle.reject(new Error(reason));
  }
  pending.clear();
}

function spawnWorker(code: string): void {
  if (worker) {
    rejectAllPending("Worker restarted after rebuild");
    worker.terminate();
    worker = null;
  }
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
  workerUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  const nextWorker = new Worker(workerUrl, { type: "module" });
  worker = nextWorker;
  nextWorker.onmessage = ({ data }) => {
    const settle = pending.get(data.id as number);
    if (!settle) return;
    clearTimeout(settle.timer);
    pending.delete(data.id as number);
    const logs = Array.isArray(data.logs) ? (data.logs as ConsoleEntry[]) : [];
    settle.resolve(
      data.ok
        ? {
            kind: "response",
            status: data.status as number,
            statusText: data.statusText as string,
            headers: data.headers as [string, string][],
            body: data.body as string,
            ms: settle.ms(),
            logs,
          }
        : { kind: "error", error: data.error as string, ms: settle.ms(), logs },
    );
  };
  nextWorker.onerror = (event) => {
    const message = event.message || "Worker crashed during startup";
    if (worker === nextWorker) {
      nextWorker.terminate();
      worker = null;
      setStatus({
        ...status,
        phase: "error",
        errors: [{ file: "(worker)", message }],
      });
    }
    rejectAllPending(message);
  };
}

async function runSingleBuild(): Promise<void> {
  setStatus({
    ...status,
    phase: status.phase === "booting" ? "booting" : "building",
  });

  try {
    await ensureEsbuild();
  } catch (failure) {
    setStatus({
      phase: "error",
      errors: formatBuildFailure(failure),
      routes: status.routes,
      layouts: status.layouts,
    });
    return;
  }

  const scan = scanProject();
  if (scan.diagnostics.length > 0 || !vfs.has(MANIFEST_PATH)) {
    setStatus({
      phase: "error",
      errors: scan.diagnostics.map((d) => ({
        file: d.filePath.startsWith("/") ? d.filePath : `/routes/${d.filePath}`,
        message: d.message,
      })),
      routes: scan.routes,
      layouts: scan.layouts,
    });
    return;
  }

  try {
    const result = await build({
      stdin: {
        contents: HARNESS,
        loader: "ts",
        sourcefile: "playground-harness.ts",
        resolveDir: "/",
      },
      bundle: true,
      format: "esm",
      write: false,
      sourcemap: "inline",
      plugins: [vfsPlugin],
      logLevel: "silent",
    });
    const code = result.outputFiles?.[0]?.text ?? "";
    spawnWorker(code);
    setStatus({ phase: "ready", errors: [], routes: scan.routes, layouts: scan.layouts });
  } catch (failure) {
    setStatus({
      phase: "error",
      errors: formatBuildFailure(failure),
      routes: scan.routes,
      layouts: scan.layouts,
    });
  }
}

/**
 * Bundles the current project and swaps in a fresh worker.
 * If another edit arrives mid-build, a follow-up rebuild is queued automatically.
 */
export function rebuild(): Promise<void> {
  if (rebuildInFlight) {
    rebuildQueued = true;
    return rebuildInFlight;
  }

  const drain = async (): Promise<void> => {
    rebuildQueued = false;
    await runSingleBuild();
    if (rebuildQueued) await drain();
  };

  rebuildInFlight = drain().finally(() => {
    rebuildInFlight = null;
  });
  return rebuildInFlight;
}

/** Waits for any active rebuild to settle before dispatching a request. */
export async function waitForBuild(): Promise<BuildStatus> {
  if (rebuildInFlight) await rebuildInFlight;
  return status;
}

interface FailureWithErrors {
  errors?: Array<{
    text: string;
    location?: { file?: string; line?: number; column?: number } | null;
  }>;
  message?: string;
}

function formatBuildFailure(failure: unknown): RunnerError[] {
  const typed = failure as FailureWithErrors;
  if (Array.isArray(typed?.errors) && typed.errors.length > 0) {
    return typed.errors.map((error) => ({
      file: (error.location?.file ?? "(unknown file)").replace(/^vfs:/, ""),
      line: error.location?.line,
      column: error.location?.column,
      message: error.text,
    }));
  }
  return [{ file: "(esbuild)", message: (failure as Error)?.message ?? String(failure) }];
}

// --- requests ---------------------------------------------------------------

export interface RequestInput {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export async function request(input: RequestInput): Promise<RunResult> {
  const started = performance.now();
  await waitForBuild();
  if (!worker && status.phase !== "error") await rebuild();
  if (!worker || status.phase === "error") {
    return {
      kind: "error",
      error: "Build failed — fix the errors above and try again.",
      ms: performance.now() - started,
      logs: [],
    };
  }

  const targetWorker = worker;
  const id = (nextRequestId += 1);
  return new Promise<RunResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      if (worker === targetWorker) {
        targetWorker.terminate();
        worker = null;
      }
      resolve({ kind: "timeout", ms: performance.now() - started, logs: [] });
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer, ms: () => performance.now() - started });
    targetWorker.postMessage({
      id,
      method: input.method,
      url: input.url,
      headers: input.headers ?? {},
      body: input.body,
    });
  });
}

export function requestRebuild(): void {
  void rebuild();
}

export { MANIFEST_PATH as manifestPath, PLAYGROUND_CONFIG };

/** Regenerates `/.taserjs/routes.gen.ts` from a fresh scan and updates discovered routes. */
export function syncManifest(): void {
  const scan = scanProject();
  vfs.write(MANIFEST_PATH, renderManifest(scan, PLAYGROUND_CONFIG, "/"), "codegen");
  setStatus({
    ...status,
    routes: scan.routes,
    layouts: scan.layouts,
  });
}
