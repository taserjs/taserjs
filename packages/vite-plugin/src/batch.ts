import { scaffoldRouteFile } from "@taserjs/router-generator";

import type { TaserVirtualContext } from "./types.js";
import type { RouteChangeBatch } from "./routes-watcher.js";

/**
 * Shared post-batch pipeline for every watcher consumer:
 * scaffold newly added files, invalidate the model, rewrite types once.
 * Returns true when the batch changed the route tree.
 */
export async function applyRouteBatch(
  ctx: TaserVirtualContext,
  batch: RouteChangeBatch,
): Promise<boolean> {
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
    return false;
  }

  ctx.invalidate();
  await ctx.writeTypes();
  return true;
}
