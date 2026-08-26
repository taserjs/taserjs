import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "pathe";
import { createUnplugin, type UnpluginInstance } from "unplugin";
import type { ViteDevServer } from "vite";
import { flattenPlugins } from "@taserjs/router-generator";

import {
  ROUTES_ALIAS_ID,
  SERVER_ENTRY_ALIAS_ID,
  VIRTUAL_MANIFEST_ID,
  RESOLVED_VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
  RESOLVED_VIRTUAL_ENTRY_ID,
  VIRTUAL_APP_ID,
  RESOLVED_VIRTUAL_APP_ID,
} from "./constants.js";
import { createTaserVirtualContext, watchAndSyncRoutes } from "./context.js";
import { shouldInvalidateOnWatchChange } from "./invalidation.js";
import { getComposedAppCode, getServeShimCode } from "./compose.js";
import { createViteDevMiddleware } from "./dev-server.js";
import { setupTaserNitro } from "../nitro.js";
import type { TaserPluginOptions, TaserVirtualContext } from "./types.js";

const SERVE_SHIM_PATH = ".taser/serve.mjs";

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

export const unpluginFactory = (options: TaserPluginOptions = {}) => {
  const serveEnabled = options.server !== false;
  let mode: "nitro" | "standalone" = "standalone";
  let rootDir = resolve(options.rootDir || process.cwd());
  let serveShimPath = resolve(rootDir, SERVE_SHIM_PATH);
  let ctx: TaserVirtualContext | undefined;

  const getContext = (): TaserVirtualContext => {
    if (!ctx) {
      ctx = createTaserVirtualContext({ ...options, rootDir });
    }
    return ctx;
  };

  return {
    name: "taser",
    enforce: "pre" as const,

    async buildStart() {
      if (mode === "nitro") {
        return;
      }
      const activeCtx = getContext();
      await activeCtx.writeTypes();
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

      const activeCtx = getContext();
      if (id === SERVER_ENTRY_ALIAS_ID && activeCtx.serverEntryPath) {
        return activeCtx.serverEntryPath;
      }
      if (id.startsWith(`${ROUTES_ALIAS_ID}/`)) {
        let target = join(activeCtx.routesDir, id.slice(ROUTES_ALIAS_ID.length + 1));
        const tsCandidate = target.replace(/\.(js|mjs|cjs)$/, ".ts");
        if (!existsSync(target) && tsCandidate !== target && existsSync(tsCandidate)) {
          target = tsCandidate;
        }
        return target;
      }
      return null;
    },

    async load(id: string) {
      if (mode === "nitro") {
        return null;
      }
      if (id === RESOLVED_VIRTUAL_MANIFEST_ID || id === VIRTUAL_MANIFEST_ID) {
        const activeCtx = getContext();
        return await activeCtx.getManifestCode();
      }
      if (id === RESOLVED_VIRTUAL_ENTRY_ID || id === VIRTUAL_ENTRY_ID) {
        const activeCtx = getContext();
        return await activeCtx.getEntryCode();
      }
      if (id === RESOLVED_VIRTUAL_APP_ID || id === VIRTUAL_APP_ID) {
        const activeCtx = getContext();
        return getComposedAppCode({
          ...(activeCtx.serverEntryPath ? { serverEntrySpecifier: SERVER_ENTRY_ALIAS_ID } : {}),
          scope: activeCtx.basePath,
        });
      }
      return null;
    },

    watchChange(id: string) {
      if (ctx && shouldInvalidateOnWatchChange(id, ctx)) {
        ctx.invalidate();
      }
    },

    vite: {
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
    },
  };
};

export const taserUnplugin: UnpluginInstance<TaserPluginOptions | undefined, boolean> =
  createUnplugin(unpluginFactory);
