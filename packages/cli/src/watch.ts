import { existsSync } from "node:fs";

import { watch, type FSWatcher } from "chokidar";
import { relative } from "pathe";

import { resolvePaths, type ResolvedTaserConfig } from "./config.js";
import { isIgnoredPath } from "./paths.js";

export interface WatchRoutesOptions {
  /** Coalesces bursts of file events into one callback. */
  debounceMs?: number;
  /** Poll instead of using native events (needed under Turbopack). */
  poll?: boolean;
}

/** Watches the routes directory and the app file, calling `onChange` once per burst of events. */
export function watchRoutes(
  config: ResolvedTaserConfig,
  cwd: string,
  onChange: (changedPath: string) => void,
  { debounceMs = 50, poll = false }: WatchRoutesOptions = {},
): FSWatcher {
  const { routesDir, appFile } = resolvePaths(config, cwd);

  const watcher = watch([routesDir, appFile].filter(existsSync), {
    ignoreInitial: true,
    ignored: (file) => file !== appFile && isIgnoredPath(relative(routesDir, file)),
    ...(poll ? { usePolling: true, interval: 100 } : {}),
  });

  let timer: NodeJS.Timeout | undefined;
  watcher.on("all", (_event, changedPath) => {
    clearTimeout(timer);
    timer = setTimeout(() => onChange(changedPath), debounceMs);
  });
  watcher.on("close", () => clearTimeout(timer));

  return watcher;
}
