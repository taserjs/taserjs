import { relative } from "node:path";
import { watch } from "chokidar";
import { shouldIgnoreRoutePath, toPosixPath, scaffoldRouteFile } from "@taserjs/router-generator";
import type { TaserVirtualContext } from "../types.js";

export type RouteChangeEvent = "add" | "change" | "unlink";

export type RouteChangeBatch = {
  events: Map<string, RouteChangeEvent>;
};

export type WatcherOptions = {
  debounceMs?: number | undefined;
};

const DEFAULT_DEBOUNCE_MS = 50;

/**
 * Unified route directory watcher for both Vite and Nitro.
 * Coalesces rapid filesystem events into debounced batches, automatically
 * scaffolds newly added route files, clears deleted files from AnalysisCache,
 * invalidates model caches, rewrites ambient types once, and invokes onChange.
 */
export function watchAndSyncRoutes(
  ctx: TaserVirtualContext,
  onChange: (batch: RouteChangeBatch) => Promise<void> | void,
  options: WatcherOptions = {},
): { close: () => Promise<void> } {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const pending = new Map<string, RouteChangeEvent>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    timer = undefined;
    const batch: RouteChangeBatch = { events: new Map(pending) };
    pending.clear();

    let touched = false;
    for (const [absolutePath, event] of batch.events) {
      if (event === "unlink") {
        ctx.analysisCache.delete(absolutePath);
        touched = true;
        continue;
      }
      touched = true;
      if (event === "add") {
        try {
          // oxlint-disable-next-line no-await-in-loop
          await scaffoldRouteFile(ctx.routesDir, absolutePath, {
            entry: ctx.options.entry,
            ignore: ctx.ignore,
          });
        } catch (error) {
          console.warn(`[taser] failed to scaffold ${absolutePath}:`, error);
        }
      }
    }

    if (!touched) {
      return;
    }

    ctx.invalidate();
    await ctx.writeTypes();

    try {
      await onChange(batch);
    } catch (error) {
      console.warn("[taser] route watcher change callback failed:", error);
    }
  };

  const fsWatcher = watch(ctx.routesDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
    ignored(absolutePath: string) {
      try {
        const rel = toPosixPath(relative(ctx.routesDir, absolutePath));
        return rel !== "" && shouldIgnoreRoutePath(rel, ctx.ignore);
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
