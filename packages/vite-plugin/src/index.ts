import type { Plugin } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "pathe";
import { scaffoldRouteFile } from "@taserjs/router-generator";

import {
  createTaserVirtualContext,
  resolveRoutesDir,
  VIRTUAL_MANIFEST_ID,
  RESOLVED_VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
  RESOLVED_VIRTUAL_ENTRY_ID,
  VIRTUAL_APP_ID,
  RESOLVED_VIRTUAL_APP_ID,
} from "./virtual.js";
export { VIRTUAL_APP_ID } from "./virtual.js";
import { applyRouteBatch } from "./batch.js";
import { watchRoutesDir } from "./routes-watcher.js";
import { getComposedAppCode, getServeShimCode } from "./compose.js";
import { startDevServer } from "./dev-server.js";
import type { TaserPluginOptions } from "./types.js";

export * from "./types.js";
export { resolveRoutesDir, resolveTaserAppPath } from "./virtual.js";
export { findHostServerEntry, getComposedAppCode, getServeShimCode } from "./compose.js";
export { watchRoutesDir, type RouteChangeBatch, type RoutesWatcher } from "./routes-watcher.js";
export { applyRouteBatch } from "./batch.js";
export type { RouteChangeEvent } from "./routes-watcher.js";

/** Where the production serve shim is written; becomes the SSR build input. */
const SERVE_SHIM_PATH = ".taser/serve.mjs";

export function taser(options: TaserPluginOptions = {}): Plugin[] {
  const serverEnabled = options.server !== false;
  let ctx: ReturnType<typeof createTaserVirtualContext> | undefined;
  let routesDir: string;
  let rootDir: string;
  let serveShimPath: string;

  const virtualPlugin: Plugin = {
    name: "taser:virtual",
    // Must resolve before Vite's core resolver, which treats "#..." ids as
    // package subpath imports and fails when they're absent from "imports".
    enforce: "pre",
    config(config, configEnv) {
      if (!serverEnabled || configEnv.command !== "build") {
        return;
      }
      // Production: build the serve shim (which boots srvx and dispatches
      // into the composed app) as an SSR bundle. Vite's default outDir
      // (dist) is used unless the user configures their own.
      rootDir = resolve(options.rootDir || process.cwd());
      serveShimPath = resolve(rootDir, SERVE_SHIM_PATH);
      return {
        build: {
          ssr: serveShimPath,
          rollupOptions: { output: { entryFileNames: "[name].mjs" } },
        },
      };
    },
    configResolved(config) {
      rootDir = resolve(options.rootDir || config.root || ".");
      routesDir = resolveRoutesDir(rootDir, options.routesDir);
      serveShimPath = resolve(rootDir, SERVE_SHIM_PATH);
      ctx = createTaserVirtualContext({
        ...options,
        rootDir,
        routesDir: resolveRoutesDir(rootDir, options.routesDir),
      });
    },
    async buildStart() {
      if (!ctx) {
        return;
      }
      await ctx.writeTypes();
      if (serverEnabled) {
        await mkdir(resolve(serveShimPath, ".."), { recursive: true });
        await writeFile(serveShimPath, getServeShimCode(), "utf8");
      }
    },
    resolveId(id) {
      if (id === VIRTUAL_MANIFEST_ID) {
        return RESOLVED_VIRTUAL_MANIFEST_ID;
      }
      if (id === VIRTUAL_ENTRY_ID) {
        return RESOLVED_VIRTUAL_ENTRY_ID;
      }
      if (id === VIRTUAL_APP_ID) {
        return RESOLVED_VIRTUAL_APP_ID;
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
      if (id === RESOLVED_VIRTUAL_APP_ID || id === VIRTUAL_APP_ID) {
        return getComposedAppCode({ rootDir, scope: options.basePath });
      }
      return null;
    },
    configureServer(server) {
      if (!ctx) {
        return;
      }

      // Invalidate across every module graph: the legacy server.moduleGraph
      // (client + compat) AND each environment graph — modules loaded via
      // ssrLoadModule/Environments API live in their own graph, so touching
      // only the legacy one leaves stale virtual modules in SSR dev.
      const invalidateId = (id: string) => {
        const legacyMod = server.moduleGraph.getModuleById(id);
        if (legacyMod) {
          server.moduleGraph.invalidateModule(legacyMod);
        }
        for (const environment of Object.values(server.environments ?? {})) {
          const mod = environment.moduleGraph.getModuleById(id);
          if (mod) {
            environment.moduleGraph.invalidateModule(mod);
          }
        }
      };

      let watcher: ReturnType<typeof watchRoutesDir> | undefined;

      // One shared chokidar watcher for the whole tree: events coalesce into a
      // single debounced batch → scaffold adds → invalidate model → rewrite
      // types once → one full-reload. No per-keystroke write storms.
      const startWatcher = () => {
        if (watcher || !ctx) {
          return;
        }
        const activeCtx = ctx;
        watcher = watchRoutesDir(routesDir, { ignore: activeCtx.ignore }, async (batch) => {
          const changed = await applyRouteBatch(activeCtx, batch);
          if (!changed) {
            return;
          }

          invalidateId(RESOLVED_VIRTUAL_MANIFEST_ID);
          invalidateId(RESOLVED_VIRTUAL_ENTRY_ID);
          invalidateId(RESOLVED_VIRTUAL_APP_ID);

          server.ws.send({ type: "full-reload", path: "*" });
        });
      };

      // Start the watcher only after Vite finished installing its own
      // internals; creating it mid-startup silently breaks chokidar init.
      return () => {
        startWatcher();

        if (!serverEnabled) {
          return;
        }

        let devServer: Awaited<ReturnType<typeof startDevServer>> | undefined;
        const port = options.port ?? (Number(process.env.PORT) || 3000);
        startDevServer(server, { rootDir, port })
          .then((instance) => {
            devServer = instance;
            console.log(`[taser] dev server ready on http://localhost:${port}`);
          })
          .catch((error) => {
            console.error(error.message ?? error);
          });

        server.httpServer?.once("close", () => {
          void watcher?.close();
          void devServer?.close();
        });
      };
    },
  };

  return [virtualPlugin];
}

export { scaffoldRouteFile };
