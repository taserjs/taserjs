import type { Plugin, ViteDevServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "pathe";
import { scaffoldRouteFile } from "@taserjs/router-generator";

import {
  createTaserVirtualContext,
  VIRTUAL_MANIFEST_ID,
  RESOLVED_VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
  RESOLVED_VIRTUAL_ENTRY_ID,
  VIRTUAL_APP_ID,
  RESOLVED_VIRTUAL_APP_ID,
} from "./core/context.js";
import { getComposedAppCode, getServeShimCode } from "./core/compose.js";
import { watchAndSyncRoutes } from "./core/watcher.js";
import { createViteDevMiddleware } from "./dev-server.js";
import { setupTaserNitro } from "./nitro.js";
import type { TaserPluginOptions } from "./types.js";

export * from "./types.js";
export { VIRTUAL_APP_ID } from "./core/context.js";
export { taserNitro } from "./nitro.js";
export { scaffoldRouteFile };

/** Where the standalone production serve shim is written; SSR build input. */
const SERVE_SHIM_PATH = ".taser/serve.mjs";

function flattenPlugins(plugins: readonly unknown[]): unknown[] {
  const flat: unknown[] = [];
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      flat.push(...flattenPlugins(plugin));
    } else if (plugin) {
      flat.push(plugin);
    }
  }
  return flat;
}

function detectNitro(config: unknown): boolean {
  const cfg = config as {
    plugins?: readonly unknown[];
    nitro?: unknown;
  };
  if (cfg.nitro) {
    return true;
  }
  return flattenPlugins(cfg.plugins ?? []).some((plugin) => {
    const name = (plugin as { name?: string } | undefined)?.name;
    return typeof name === "string" && (name === "nitro" || name.startsWith("nitro:"));
  });
}

function invalidateModules(server: ViteDevServer) {
  const ids = [RESOLVED_VIRTUAL_MANIFEST_ID, RESOLVED_VIRTUAL_ENTRY_ID, RESOLVED_VIRTUAL_APP_ID];
  for (const id of ids) {
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
  }
}

/**
 * The unified Taser Vite plugin.
 *
 * - Mode 1 (Standalone): Runs built-in srvx dev server and bundles a standalone
 *   SSR production serve shim.
 * - Mode 2 (Vite + Nitro): Attaches `.nitro` hook so `nitro()` from `nitro/vite`
 *   automatically discovers and registers Taser as a Nitro module.
 */
export function taser(options: TaserPluginOptions = {}): Plugin {
  const serveEnabled = options.server !== false;
  let mode: "nitro" | "standalone" = "standalone";
  let rootDir = resolve(options.rootDir || process.cwd());
  let serveShimPath = resolve(rootDir, SERVE_SHIM_PATH);
  let ctx: ReturnType<typeof createTaserVirtualContext> | undefined;

  const plugin = {
    name: "taser",
    enforce: "pre",
    __taserOptions: options,
    nitro: {
      name: "taser",
      setup: (nitro: Parameters<typeof setupTaserNitro>[0]) => setupTaserNitro(nitro, options),
    },
    config(config: unknown, env: { command?: string }) {
      mode = detectNitro(config) ? "nitro" : "standalone";
      if (mode === "nitro" || !serveEnabled || env.command !== "build") {
        return;
      }
      return {
        build: {
          ssr: serveShimPath,
          rollupOptions: { output: { entryFileNames: "[name].mjs" } },
        },
      };
    },
    configResolved(resolvedConfig: {
      root?: string;
      plugins?: readonly unknown[];
      nitro?: unknown;
    }) {
      mode = detectNitro(resolvedConfig) ? "nitro" : "standalone";
      rootDir = resolve(options.rootDir || resolvedConfig.root || process.cwd());
      serveShimPath = resolve(rootDir, SERVE_SHIM_PATH);

      if (mode === "nitro") {
        ctx = undefined;
        return;
      }

      ctx = createTaserVirtualContext({
        ...options,
        rootDir,
      });
    },
    async buildStart() {
      if (mode === "nitro" || !ctx) {
        return;
      }
      await ctx.writeTypes();
      if (serveEnabled) {
        await mkdir(resolve(serveShimPath, ".."), { recursive: true });
        await writeFile(serveShimPath, getServeShimCode(), "utf8");
      }
    },
    resolveId(id: string) {
      if (mode === "nitro") {
        return null;
      }
      if (id === VIRTUAL_MANIFEST_ID) return RESOLVED_VIRTUAL_MANIFEST_ID;
      if (id === VIRTUAL_ENTRY_ID) return RESOLVED_VIRTUAL_ENTRY_ID;
      if (id === VIRTUAL_APP_ID) return RESOLVED_VIRTUAL_APP_ID;
      return null;
    },
    async load(id: string) {
      if (mode === "nitro" || !ctx) {
        return null;
      }
      if (id === RESOLVED_VIRTUAL_MANIFEST_ID || id === VIRTUAL_MANIFEST_ID) {
        return await ctx.getManifestCode();
      }
      if (id === RESOLVED_VIRTUAL_ENTRY_ID || id === VIRTUAL_ENTRY_ID) {
        return await ctx.getEntryCode();
      }
      if (id === RESOLVED_VIRTUAL_APP_ID || id === VIRTUAL_APP_ID) {
        return getComposedAppCode({
          serverEntryPath: ctx.serverEntryPath,
          scope: ctx.basePath,
        });
      }
      return null;
    },
    configureServer(server: ViteDevServer) {
      if (mode === "nitro") {
        return;
      }

      if (serveEnabled) {
        server.middlewares.use(createViteDevMiddleware(server, rootDir));
      }

      if (ctx) {
        const activeCtx = ctx;
        const watcherHandle = watchAndSyncRoutes(activeCtx, () => {
          invalidateModules(server);
          server.ws.send({ type: "full-reload", path: "*" });
        });

        server.httpServer?.once("close", () => {
          void watcherHandle?.close();
        });
      }
    },
  };

  return plugin as unknown as Plugin;
}
