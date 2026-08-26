import { existsSync } from "node:fs";
import type { Nitro } from "nitro/types";
import { resolve } from "pathe";
import { DEFAULT_IGNORE } from "@taserjs/router-generator";
import { composeBasePath } from "@taserjs/router-utils";
import type { TaserPluginOptions } from "./core/types.js";
import {
  ROUTES_ALIAS_ID,
  SERVER_ENTRY_ALIAS_ID,
  VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
} from "./core/constants.js";
import { createTaserVirtualContext, watchAndSyncRoutes } from "./core/context.js";
import { getComposedAppCode } from "./core/compose.js";

export type TaserNitroOptions = TaserPluginOptions & {
  standalone?: boolean | undefined;
};

/**
 * Standalone Nitro Module for Taser.
 *
 * Used directly in `nitro.config.ts` via `modules: [taser()]` or loaded
 * automatically by `nitro()` when chained in `vite.config.ts`.
 */
export function taser(options: TaserNitroOptions = {}) {
  return {
    name: "taser",
    setup: (nitro: Nitro) => setupTaserNitro(nitro, options),
  };
}

export const taserNitro = taser;

export function setupTaserNitro(nitro: Nitro, options: TaserNitroOptions = {}): void {
  const state = nitro.options as unknown as Record<string, unknown>;
  if (state._taserHookRegistered) {
    return;
  }
  state._taserHookRegistered = true;

  nitro.hooks.hookOnce("build:before", async () => {
    await applyTaserNitro(nitro, options);
  });
}

async function applyTaserNitro(nitro: Nitro, options: TaserNitroOptions): Promise<void> {
  const rootDir = resolve(nitro.options.rootDir || options.rootDir || process.cwd());

  const nitroIgnore = (nitro.options.ignore || []) as string[];
  const ignore = Array.from(
    new Set([...nitroIgnore, ...(options.ignore || []), ...DEFAULT_IGNORE]),
  );
  nitro.options.ignore = ignore;

  const nitroBase = (nitro.options.baseURL || "").replace(/\/+$/, "").replace(/^\/+/, "");
  const normalizedNitroBase = nitroBase ? `/${nitroBase}` : "";
  const effectiveScope = composeBasePath(normalizedNitroBase, options.basePath) || "/";

  const ctx = createTaserVirtualContext({
    ...options,
    rootDir,
    ignore,
    basePath: effectiveScope,
  });

  nitro.options.alias = {
    ...nitro.options.alias,
    [ROUTES_ALIAS_ID]: ctx.routesDir,
    ...(ctx.serverEntryPath ? { [SERVER_ENTRY_ALIAS_ID]: ctx.serverEntryPath } : {}),
  };

  nitro.options.routesDir = "";
  nitro.options.apiDir = "";
  nitro.options.scanDirs = [];
  nitro.options.serverDir = false;

  nitro.options.virtual = nitro.options.virtual || {};
  nitro.options.virtual[VIRTUAL_MANIFEST_ID] = () => ctx.getManifestCode();
  nitro.options.virtual[VIRTUAL_ENTRY_ID] = () => ctx.getEntryCode();

  const isStandalone = options.standalone !== false;

  if (isStandalone) {
    nitro.options.virtual["#nitro/virtual/app"] = () =>
      getComposedAppCode({
        ...(ctx.serverEntryPath ? { serverEntrySpecifier: SERVER_ENTRY_ALIAS_ID } : {}),
        scope: effectiveScope,
      });
    nitro.options.virtual["#nitro/virtual/routing"] = () =>
      "export const findRouteRules = () => ({}); export const findRoute = () => undefined; export const globalMiddleware = []; export const findRoutedMiddleware = () => [];";
  } else {
    const routePattern =
      effectiveScope && effectiveScope !== "/" ? `${effectiveScope.replace(/\/+$/, "")}/**` : "/**";

    const VIRTUAL_NITRO_HANDLER_ID = "#taserjs/virtual/nitro-handler";
    nitro.options.virtual[VIRTUAL_NITRO_HANDLER_ID] = () =>
      `import app from "${VIRTUAL_ENTRY_ID}";
export default (event) => app.fetch(event instanceof Request ? event : event.req);
`;

    nitro.options.handlers.unshift({
      route: routePattern,
      lazy: false,
      handler: VIRTUAL_NITRO_HANDLER_ID,
    });
  }

  await ctx.writeTypes();
  nitro.hooks.hook("types:extend", async () => {
    await ctx.writeTypes();
  });

  nitro.hooks.hook("dev:reload", () => {
    ctx.invalidate();
  });

  let closeWatcher: (() => Promise<void>) | undefined;

  if (nitro.options.dev && existsSync(ctx.routesDir)) {
    const watcher = watchAndSyncRoutes(ctx, async () => {
      await nitro.hooks.callHook("rollup:reload");
    });
    closeWatcher = watcher.close;
  }

  nitro.hooks.hook("close", async () => {
    await closeWatcher?.();
  });
}
