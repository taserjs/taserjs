import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "pathe";
import { createUnplugin, type UnpluginFactory } from "unplugin";
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
import { getComposedAppCode, getServeShimCode } from "./compose.js";
import { createViteDevMiddleware, invalidateDevServerCache } from "./dev-server.js";
import { setupTaserNitro } from "../nitro.js";
import type { TaserPluginOptions, TaserVirtualContext } from "./types.js";
import type { Nitro } from "nitro/types";

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
  invalidateDevServerCache();
  const ids = [
    RESOLVED_VIRTUAL_MANIFEST_ID,
    VIRTUAL_MANIFEST_ID,
    RESOLVED_VIRTUAL_ENTRY_ID,
    VIRTUAL_ENTRY_ID,
    RESOLVED_VIRTUAL_APP_ID,
    VIRTUAL_APP_ID,
    "\0#nitro/virtual/app",
    "#nitro/virtual/app",
    "\0#nitro/virtual/server-handlers",
    "#nitro/virtual/server-handlers",
    "\0#nitro/virtual/plugins",
    "#nitro/virtual/plugins",
  ];
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

export const unpluginFactory: UnpluginFactory<TaserPluginOptions | undefined> = (options = {}) => {
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
      const activeCtx = getContext();
      await activeCtx.writeTypes();
      if (mode !== "nitro" && serveEnabled) {
        await mkdir(resolve(serveShimPath, ".."), { recursive: true });
        await writeFile(serveShimPath, getServeShimCode(), "utf8");
      }
    },

    resolveId(id) {
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

    async load(id) {
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

    watchChange() {
      if (ctx) {
        ctx.invalidate();
      }
    },

    webpack(compiler) {
      const ensureTypes = async () => {
        const activeCtx = getContext();
        await activeCtx.writeTypes();
      };
      compiler.hooks?.beforeRun?.tapPromise?.("taser", ensureTypes);
      compiler.hooks?.watchRun?.tapPromise?.("taser", ensureTypes);
    },

    rspack(compiler) {
      const ensureTypes = async () => {
        const activeCtx = getContext();
        await activeCtx.writeTypes();
      };
      compiler.hooks?.beforeRun?.tapPromise?.("taser", ensureTypes);
      compiler.hooks?.watchRun?.tapPromise?.("taser", ensureTypes);
    },

    vite: {
      __taserOptions: options,
      nitro: {
        name: "taser",
        setup: (nitro: Nitro) => setupTaserNitro(nitro, options),
      },
      config(config, env) {
        if (config?.root) {
          rootDir = resolve(options.rootDir || config.root);
          serveShimPath = resolve(rootDir, SERVE_SHIM_PATH);
          ctx = undefined;
        }
        mode = detectNitro(config) ? "nitro" : "standalone";
        if (mode === "nitro" || env.command !== "build") {
          return;
        }
        return {
          ssr: {
            noExternal: ["@taserjs/router-plugin"],
          },
          ...(serveEnabled
            ? {
                build: {
                  ssr: serveShimPath,
                  rollupOptions: { output: { entryFileNames: "[name].mjs" } },
                },
              }
            : {}),
        };
      },
      configResolved(resolvedConfig) {
        mode = detectNitro(resolvedConfig) ? "nitro" : "standalone";
        rootDir = resolve(options.rootDir || resolvedConfig.root || process.cwd());
        serveShimPath = resolve(rootDir, SERVE_SHIM_PATH);

        ctx = createTaserVirtualContext({
          ...options,
          rootDir,
        });
      },
      configureServer(server) {
        const activeCtx = getContext();
        if (serveEnabled) {
          server.middlewares.use(
            createViteDevMiddleware(server, rootDir, {
              basePath: activeCtx?.basePath,
            }),
          );
        }

        if (activeCtx) {
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

export const taserUnplugin = createUnplugin(unpluginFactory);
