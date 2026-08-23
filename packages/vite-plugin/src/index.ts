import type { Plugin } from "vite";
import { resolve } from "pathe";
import { scaffoldRouteFile } from "@taserjs/router-generator";

import {
  createTaserVirtualContext,
  VIRTUAL_MANIFEST_ID,
  RESOLVED_VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
  RESOLVED_VIRTUAL_ENTRY_ID,
} from "./virtual.js";
import { applyRouteBatch } from "./batch.js";
import { watchRoutesDir } from "./routes-watcher.js";
import type { TaserPluginOptions } from "./types.js";

export * from "./types.js";
export { resolveRoutesDir, resolveTaserAppPath } from "./virtual.js";
export { watchRoutesDir, type RouteChangeBatch, type RoutesWatcher } from "./routes-watcher.js";
export { applyRouteBatch } from "./batch.js";
export type { RouteChangeEvent } from "./routes-watcher.js";

export function taser(options: TaserPluginOptions = {}): Plugin[] {
  let ctx: ReturnType<typeof createTaserVirtualContext> | undefined;
  let routesDir: string;

  const virtualPlugin: Plugin = {
    name: "taser:virtual",
    configResolved(config) {
      const rootDir = resolve(options.rootDir || config.root || ".");
      routesDir = resolve(rootDir, options.routesDir || "routes");
      ctx = createTaserVirtualContext({
        ...options,
        rootDir,
        routesDir,
      });
    },
    async buildStart() {
      if (ctx) {
        await ctx.writeTypes();
      }
    },
    resolveId(id) {
      if (id === VIRTUAL_MANIFEST_ID) {
        return RESOLVED_VIRTUAL_MANIFEST_ID;
      }
      if (id === VIRTUAL_ENTRY_ID) {
        return RESOLVED_VIRTUAL_ENTRY_ID;
      }
      return null;
    },
    async load(id) {
      if (!ctx) {
        return null;
      }
      if (id === RESOLVED_VIRTUAL_MANIFEST_ID || id === VIRTUAL_MANIFEST_ID) {
        return await ctx.getManifestCode();
      }
      if (id === RESOLVED_VIRTUAL_ENTRY_ID || id === VIRTUAL_ENTRY_ID) {
        return await ctx.getEntryCode();
      }
      return null;
    },
    configureServer(server) {
      if (!ctx) {
        return;
      }

      // One shared chokidar watcher for the whole tree: events coalesce into a
      // single debounced batch → scaffold adds → invalidate model → rewrite
      // types once → one full-reload. No per-keystroke write storms.
      const watcher = watchRoutesDir(routesDir, { ignore: ctx.ignore }, async (batch) => {
        const changed = await applyRouteBatch(ctx!, batch);
        if (!changed) {
          return;
        }

        const manifestMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MANIFEST_ID);
        if (manifestMod) {
          server.moduleGraph.invalidateModule(manifestMod);
        }
        const entryMod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ENTRY_ID);
        if (entryMod) {
          server.moduleGraph.invalidateModule(entryMod);
        }

        server.ws.send({ type: "full-reload", path: "*" });
      });

      return () => {
        void watcher.close();
      };
    },
  };

  return [virtualPlugin];
}

export { scaffoldRouteFile };
