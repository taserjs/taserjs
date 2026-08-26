import { relative } from "node:path";
import { watch } from "chokidar";

import { DEFAULT_ENTRY, DEFAULT_IGNORE } from "../constants.js";
import { shouldIgnoreRoutePath } from "../scan/paths.js";
import { toPosixPath } from "../support/paths.js";
import { scaffoldRouteFile } from "../scaffold/scaffold.js";
import type { AnalysisCache } from "../scan/cache.js";

export type RouteChangeEvent = "add" | "change" | "unlink";

export type RouteChangeBatch = {
  events: Map<string, RouteChangeEvent>;
};

export type WatchRoutesOptions = {
  routesDir: string;
  entry?: string | undefined;
  ignore?: readonly string[] | undefined;
  debounceMs?: number | undefined;
  cache?: AnalysisCache | undefined;
  autoScaffold?: boolean | undefined;
};

const DEFAULT_DEBOUNCE_MS = 50;

export function watchRoutes(
  options: WatchRoutesOptions,
  onChange: (batch: RouteChangeBatch) => Promise<void> | void,
): { close: () => Promise<void> } {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const ignore = options.ignore ?? DEFAULT_IGNORE;
  const entry = options.entry ?? DEFAULT_ENTRY;
  const autoScaffold = options.autoScaffold ?? true;
  const pending = new Map<string, RouteChangeEvent>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    timer = undefined;
    const batch: RouteChangeBatch = { events: new Map(pending) };
    pending.clear();

    let touched = false;
    const additions: string[] = [];
    for (const [absolutePath, event] of batch.events) {
      if (event === "unlink") {
        options.cache?.delete(absolutePath);
        touched = true;
        continue;
      }
      touched = true;
      if (event === "add" && autoScaffold) {
        additions.push(absolutePath);
      }
    }

    if (additions.length > 0) {
      await Promise.all(
        additions.map(async (absolutePath) => {
          try {
            await scaffoldRouteFile(options.routesDir, absolutePath, {
              entry,
              ignore,
            });
          } catch (error) {
            console.warn(`[taser] failed to scaffold ${absolutePath}:`, error);
          }
        }),
      );
    }

    if (!touched) {
      return;
    }

    try {
      await onChange(batch);
    } catch (error) {
      console.warn("[taser] route watcher change callback failed:", error);
    }
  };

  const fsWatcher = watch(options.routesDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
    ignored(absolutePath: string) {
      try {
        const rel = toPosixPath(relative(options.routesDir, absolutePath));
        return rel !== "" && shouldIgnoreRoutePath(rel, ignore);
      } catch {
        return false;
      }
    },
  });

  fsWatcher.on("all", (event: string, absolutePath: string) => {
    if (event !== "add" && event !== "change" && event !== "unlink") {
      return;
    }
    pending.set(absolutePath, event as RouteChangeEvent);
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      void flush();
    }, debounceMs);
  });

  return {
    close: async () => {
      if (timer) {
        clearTimeout(timer);
      }
      await fsWatcher.close();
    },
  };
}
