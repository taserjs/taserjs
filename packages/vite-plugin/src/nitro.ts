import type { Nitro, NitroModule } from "nitro/types";
import { existsSync } from "node:fs";
import { resolve } from "pathe";
import { DEFAULT_IGNORE } from "@taserjs/router-generator";
import type { TaserNitroOptions } from "./types.js";
import {
  createTaserVirtualContext,
  resolveRoutesDir,
  VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
} from "./virtual.js";
import { watchRoutesDir } from "./routes-watcher.js";
import { applyRouteBatch } from "./batch.js";

export function taserNitro(options: TaserNitroOptions = {}): NitroModule {
  return {
    name: "taser-nitro",
    setup(nitro: Nitro) {
      const rootDir = resolve(nitro.options.rootDir || ".");
      const explicitRoutes = nitro.options.routesDir as string | undefined;
      const routesDir = explicitRoutes
        ? resolve(rootDir, explicitRoutes)
        : resolveRoutesDir(rootDir);

      const nitroIgnore = (nitro.options.ignore || []) as string[];
      const ignore = Array.from(new Set([...nitroIgnore, ...DEFAULT_IGNORE]));
      nitro.options.ignore = ignore;

      const nitroTaserConfig = ((nitro.options as any).taser || {}) as TaserNitroOptions;
      const mergedTaserOptions: TaserNitroOptions = {
        ...nitroTaserConfig,
        ...options,
      };

      const ctx = createTaserVirtualContext({
        rootDir,
        routesDir,
        ignore,
        ...mergedTaserOptions,
      });

      // 1. Disable Nitro built-in route scanner — file routing belongs to taser
      nitro.options.routesDir = "";
      nitro.options.apiDir = "";
      nitro.options.scanDirs = [];
      nitro.options.serverDir = false;

      // 2. Register virtual modules in Nitro options
      nitro.options.virtual = nitro.options.virtual || {};
      nitro.options.virtual[VIRTUAL_MANIFEST_ID] = () => ctx.getManifestCode();
      nitro.options.virtual[VIRTUAL_ENTRY_ID] = () => ctx.getEntryCode();

      // 3. Register Taser Route Handler in Nitro handlers
      const scope = mergedTaserOptions.basePath || "/";
      const routePattern = scope === "/" ? "/**" : `${scope.replace(/\/$/, "")}/**`;

      nitro.options.handlers.unshift({
        route: routePattern,
        lazy: false,
        handler: VIRTUAL_ENTRY_ID,
      });

      // 4. Hook into type generation
      nitro.hooks.hook("types:extend", async () => {
        await ctx.writeTypes();
      });

      // 5. Invalidate the analysis/model caches on dev reloads
      nitro.hooks.hook("dev:reload", () => {
        ctx.invalidate();
      });

      let closeWatcher: (() => Promise<void>) | undefined;

      // 6. Dev watcher: one shared chokidar instance (never double-watches),
      //    debounced batches → scaffold adds → invalidate → types → reload
      if (nitro.options.dev && existsSync(ctx.routesDir)) {
        const watcher = watchRoutesDir(ctx.routesDir, { ignore }, async (batch) => {
          await applyRouteBatch(ctx, batch);
          await nitro.hooks.callHook("rollup:reload");
        });
        closeWatcher = watcher.close;
      }

      nitro.hooks.hook("close", async () => {
        await closeWatcher?.();
      });
    },
  };
}
