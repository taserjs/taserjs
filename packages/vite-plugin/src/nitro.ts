import { existsSync } from "node:fs";
import type { Nitro } from "nitro/types";
import { resolve } from "pathe";
import { DEFAULT_IGNORE } from "@taserjs/router-generator";
import { composeBasePath } from "@taserjs/router-utils";
import type { TaserNitroOptions } from "./types.js";
import {
  createTaserVirtualContext,
  VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
} from "./core/context.js";
import { watchAndSyncRoutes } from "./core/watcher.js";

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

  // 1. Disable Nitro built-in route scanner — file routing belongs to Taser
  nitro.options.routesDir = "";
  nitro.options.apiDir = "";
  nitro.options.scanDirs = [];
  nitro.options.serverDir = false;

  // 2. Register virtual modules in Nitro options
  nitro.options.virtual = nitro.options.virtual || {};
  nitro.options.virtual[VIRTUAL_MANIFEST_ID] = () => ctx.getManifestCode();
  nitro.options.virtual[VIRTUAL_ENTRY_ID] = () => ctx.getEntryCode();

  // 3. Register Taser Route Handler in Nitro handlers
  const routePattern =
    options.basePath && options.basePath !== "/"
      ? `${options.basePath.replace(/\/+$/, "")}/**`
      : "/**";

  nitro.options.handlers.unshift({
    route: routePattern,
    lazy: false,
    handler: VIRTUAL_ENTRY_ID,
  });

  // 4. Generate ambient route types initially & on types:extend
  await ctx.writeTypes();
  nitro.hooks.hook("types:extend", async () => {
    await ctx.writeTypes();
  });

  // 5. Invalidate the analysis/model caches on dev reloads
  nitro.hooks.hook("dev:reload", () => {
    ctx.invalidate();
  });

  let closeWatcher: (() => Promise<void>) | undefined;

  // 6. Dev watcher for Nitro
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
