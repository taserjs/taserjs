import { renderManifest } from "@taserjs/cli/codegen";
import { build, initialize, type Loader, type Plugin } from "esbuild-wasm";
import wasmUrl from "esbuild-wasm/esbuild.wasm?url";

import { PIN_NAMES, resolvePin } from "./pins";
import { MANIFEST_PATH, PLAYGROUND_CONFIG, scanProject } from "./scan";
import { vfs } from "./vfs";

const REQUEST_TIMEOUT_MS = 3_000;

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
}

export type RunResult =
  | {
      kind: "response";
      status: number;
      statusText: string;
      headers: [string, string][];
      body: string;
      ms: number;
    }
  | { kind: "error"; error: string; ms: number }
  | { kind: "timeout"; ms: number };

let initPromise: Promise<void> | null = null;

function ensureEsbuild(): Promise<void> {
  initPromise ??= initialize({
    wasmURL: new URL(wasmUrl, import.meta.url).href,
  }).then(() => undefined);
  return initPromise;
}

/** Joins POSIX-style path segments without importing a path library. */
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

/**
 * Tries the esbuild-style import candidates used by the workspace convention
 * (`.ts`, `.tsx`, and `.js`->`.ts` file mapping like the CLI manifest emits).
 */
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

self.onmessage = async ({ data }) => {
  const { id, method, url, headers, body } = data;
  try {
    const res = await app.fetch(new Request(url, { method, headers, body }));
    self.postMessage({
      id,
      ok: true,
      status: res.status,
      statusText: res.statusText,
      headers: [...res.headers],
      body: await res.text(),
    });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e?.stack ?? e) });
  }
};
`;

// --- build state ------------------------------------------------------------

let status: BuildStatus = { phase: "booting", errors: [] };
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

let worker: Worker | null = null;
let workerUrl: string | null = null;
let rebuildInFlight: Promise<void> | null = null;

function spawnWorker(code: string): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
  workerUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  worker = new Worker(workerUrl, { type: "module" });
  worker.onmessage = ({ data }) => {
    const settle = pending.get(data.id as number);
    if (!settle) return; // stale id: worker was terminated mid-flight
    pending.delete(data.id);
    settle.resolve(
      data.ok
        ? {
            kind: "response",
            status: data.status,
            statusText: data.statusText,
            headers: data.headers,
            body: data.body,
            ms: settle.ms(),
          }
        : { kind: "error", error: data.error, ms: settle.ms() },
    );
  };
  worker.onerror = (event) => {
    for (const settle of pending.values())
      settle.reject(new Error(event.message || "Worker crashed"));
    pending.clear();
  };
}

/** Bundles the current project and swaps in a fresh worker ("last good build" keeps the old one on error). */
export function rebuild(): Promise<void> {
  if (rebuildInFlight) return rebuildInFlight;
  rebuildInFlight = (async () => {
    setStatus({
      phase: status.phase === "booting" ? "booting" : "building",
      errors: status.errors,
    });
    await ensureEsbuild();

    const scan = scanProject();
    if (scan.diagnostics.length > 0 || !vfs.has(MANIFEST_PATH)) {
      setStatus({
        phase: "error",
        errors: scan.diagnostics.map((d) => ({ file: d.filePath, message: d.message })),
      });
      return; // last good build keeps serving
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
      setStatus({ phase: "ready", errors: [] });
    } catch (failure) {
      setStatus({ phase: "error", errors: formatBuildFailure(failure) });
      return;
    }
  })().finally(() => {
    rebuildInFlight = null;
  });
  return rebuildInFlight;
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
      file: error.location?.file ?? "(unknown file)",
      line: error.location?.line,
      column: error.location?.column,
      message: error.text,
    }));
  }
  return [{ file: "(esbuild)", message: (failure as Error)?.message ?? String(failure) }];
}

// --- requests ---------------------------------------------------------------

interface PendingRequest {
  resolve: (result: RunResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  ms: () => number;
}

const pending = new Map<number, PendingRequest>();
let nextRequestId = 1;

export interface RequestInput {
  method: string;
  url: string;
  headers?: HeadersInit;
  body?: string;
}

export async function request(input: RequestInput): Promise<RunResult> {
  const started = performance.now();
  if (!worker) await rebuild();
  if (!worker || status.phase === "error") {
    return {
      kind: "error",
      error: "Build failed — fix the errors above and try again.",
      ms: performance.now() - started,
    };
  }

  const id = (nextRequestId += 1);
  return new Promise<RunResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      worker?.terminate();
      worker = null;
      resolve({ kind: "timeout", ms: performance.now() - started });
      // next request lazily triggers getBuildStatus-aware rebuild
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer, ms: () => performance.now() - started });
    worker?.postMessage({
      id,
      method: input.method,
      url: input.url,
      headers: input.headers ?? {},
      body: input.body,
    });
  });
}

/** Used when the timeout path kills the worker: lazily rebuild on next request. */
export function requestRebuild(): void {
  void rebuild();
}

export { MANIFEST_PATH as manifestPath, PLAYGROUND_CONFIG };

/** Convenience for App: regenerates `routes.gen.ts` from a fresh scan. */
export function syncManifest(): void {
  vfs.write(MANIFEST_PATH, renderManifest(scanProject(), PLAYGROUND_CONFIG, "/"), "codegen");
}
