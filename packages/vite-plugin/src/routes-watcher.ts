import { relative } from "node:path";
import { watch } from "chokidar";
import { shouldIgnoreRoutePath, toPosixPath } from "@taserjs/router-generator";

export type RouteChangeEvent = "add" | "change" | "unlink";

export type RouteChangeBatch = {
  /** Absolute paths grouped by the last event observed in the batch window. */
  events: Map<string, RouteChangeEvent>;
};

export type RoutesWatcherOptions = {
  ignore?: readonly string[] | undefined;
  /** Trailing coalescing window; rapid save bursts collapse into one batch. */
  debounceMs?: number | undefined;
};

export type RoutesWatcher = {
  close(): Promise<void>;
};

type SharedWatcher = {
  fsWatcher: ReturnType<typeof watch>;
  refCount: number;
  subscribers: Set<(batch: RouteChangeBatch) => Promise<void> | void>;
  timer?: ReturnType<typeof setTimeout> | undefined;
  pending: Map<string, RouteChangeEvent>;
};

const watchersByDir = new Map<string, SharedWatcher>();

const DEFAULT_DEBOUNCE_MS = 50;

function flush(shared: SharedWatcher): void {
  shared.timer = undefined;
  const batch: RouteChangeBatch = { events: shared.pending };
  shared.pending = new Map();
  for (const subscriber of shared.subscribers) {
    Promise.resolve()
      .then(() => subscriber(batch))
      .catch((error) => {
        console.warn("[taser] routes watcher subscriber failed:", error);
      });
  }
}

/**
 * Single chokidar instance per routes directory, shared across consumers
 * (the vite plugin and nitro module never double-watch the same tree).
 * Events coalesce into one trailing-debounced batch so a rapid save burst
 * triggers exactly one rescan + types write + reload.
 */
export function watchRoutesDir(
  routesDir: string,
  options: RoutesWatcherOptions,
  onBatch: (batch: RouteChangeBatch) => Promise<void> | void,
): RoutesWatcher {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  let shared = watchersByDir.get(routesDir);
  if (!shared) {
    let warned = false;
    const fresh: SharedWatcher = {
      fsWatcher: undefined as unknown as ReturnType<typeof watch>,
      refCount: 0,
      subscribers: new Set(),
      pending: new Map(),
    };

    fresh.fsWatcher = watch(routesDir, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
      ignored(absolutePath: string) {
        try {
          const rel = toPosixPath(relative(routesDir, absolutePath));
          return rel !== "" && shouldIgnoreRoutePath(rel, options.ignore);
        } catch {
          return false;
        }
      },
    });

    fresh.fsWatcher.on("all", (event: string, absolutePath: string) => {
      if (event !== "add" && event !== "change" && event !== "unlink") {
        return;
      }
      // Last event per path wins within the window (add→change collapses to
      // change; a later unlink always supersedes an earlier add/change).
      fresh.pending.set(absolutePath, event as RouteChangeEvent);
      if (fresh.timer) {
        clearTimeout(fresh.timer);
      }
      fresh.timer = setTimeout(() => flush(fresh), debounceMs);
    });

    fresh.fsWatcher.on("error", (error: unknown) => {
      if (!warned) {
        warned = true;
        console.warn("[taser] routes watcher error:", error);
      }
    });

    shared = fresh;
    watchersByDir.set(routesDir, fresh);
  }

  shared.refCount++;
  shared.subscribers.add(onBatch);

  const handle: RoutesWatcher = {
    async close() {
      if (!shared!.subscribers.delete(onBatch)) {
        return;
      }
      shared!.refCount--;
      if (shared!.refCount > 0) {
        return;
      }
      watchersByDir.delete(routesDir);
      if (shared!.timer) {
        clearTimeout(shared!.timer);
      }
      await shared!.fsWatcher.close();
    },
  };

  return handle;
}
