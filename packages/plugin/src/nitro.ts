import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateManifest,
  loadConfig,
  resolveOutputDir,
  resolveRoutesDir,
  scanRoutes,
  type ResolvedTaserConfig,
} from "@taserjs/cli";
import { watch, type FSWatcher } from "chokidar";
import { taserPlugin, type TaserPluginOptions } from "./index.js";

export function buildNitroRoutingVirtualSource(): string {
  return [
    "export const findRouteRules = () => ({});",
    "export const findRoute = () => undefined;",
    "export const globalMiddleware = [];",
    "export const findRoutedMiddleware = () => [];",
  ].join("\n");
}

export function buildNitroStandaloneAppSource(routesGenPath: string): string {
  const normalizedPath = routesGenPath.replace(/\\/g, "/");

  return `// @ts-nocheck
import { app as taserApp } from "${normalizedPath}";
import { FastResponse } from "srvx";

globalThis.Response = FastResponse;

export const handler = (req, ...args) => taserApp.fetch(req, ...args);

export function createNitroApp() {
  return {
    fetch: handler,
    captureError: (error) => console.error(error),
    hooks: undefined,
  };
}

export function initNitroPlugins(app) {
  return app;
}

export const app = taserApp;
export default app;
`;
}

export function buildNitroMiddlewareHandlerSource(routesGenPath: string): string {
  const normalizedPath = routesGenPath.replace(/\\/g, "/");

  return `// @ts-nocheck
import { app as taserApp } from "${normalizedPath}";
import { toWebRequest } from "h3";

export default defineEventHandler((event) => {
  return taserApp.fetch(toWebRequest(event));
});
`;
}

export function setupTaserNitro(nitro: any, options: TaserPluginOptions = {}): void {
  const state = nitro.options as unknown as Record<string, unknown>;
  if (state._taserHookRegistered) {
    return;
  }
  state._taserHookRegistered = true;

  nitro.hooks.hookOnce("build:before", async () => {
    await applyTaserNitro(nitro, options);
  });
}

export async function applyTaserNitro(nitro: any, options: TaserPluginOptions): Promise<void> {
  const cwd = resolve(nitro.options.rootDir || options.cwd || process.cwd());
  const config: ResolvedTaserConfig = await loadConfig(cwd, options.config);
  const routesDir = resolveRoutesDir(config, cwd);
  const outputDir = resolveOutputDir(config, cwd);
  const routesGenPath = resolve(outputDir, "routes.gen.ts");

  const executeGeneration = () => {
    if (existsSync(routesDir)) {
      const scanResult = scanRoutes({
        routesDir,
        cwd,
        extensions: config.extensions,
      });
      generateManifest(scanResult, config, cwd);
    }
  };

  executeGeneration();

  nitro.options.virtual = nitro.options.virtual || {};
  const isStandalone = options.standalone === true;

  if (isStandalone) {
    nitro.options.virtual["#nitro/virtual/app"] = () =>
      buildNitroStandaloneAppSource(routesGenPath);
    nitro.options.virtual["#nitro/virtual/routing"] = () =>
      buildNitroRoutingVirtualSource();
  } else {
    const VIRTUAL_NITRO_HANDLER_ID = "#taserjs/virtual/nitro-handler";
    nitro.options.virtual[VIRTUAL_NITRO_HANDLER_ID] = () =>
      buildNitroMiddlewareHandlerSource(routesGenPath);

    nitro.options.handlers = nitro.options.handlers || [];
    nitro.options.handlers.unshift({
      route: "/**",
      lazy: false,
      handler: VIRTUAL_NITRO_HANDLER_ID,
    });
  }

  let watcher: FSWatcher | undefined;
  if (nitro.options.dev && existsSync(routesDir)) {
    watcher = watch([routesDir], {
      ignoreInitial: true,
      ignored: [/(^|[/\\])\../, /(^|[/\\])-/, /node_modules/, /\.taserjs/],
    });

    let timer: NodeJS.Timeout | null = null;
    watcher.on("all", () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        executeGeneration();
      }, 50);
    });
  }

  nitro.hooks.hook("close", async () => {
    await watcher?.close();
  });
}

/**
 * Taser Nitro module.
 *
 * Can be used as a Nitro module (`modules: [taser()]`) in `nitro.config.ts`,
 * or chained as a rollup plugin.
 */
export function taser(options: TaserPluginOptions = {}) {
  const rollupPlugin = taserPlugin.rollup(options);
  return {
    ...rollupPlugin,
    name: "taserjs:plugin",
    __taserOptions: options,
    setup: (nitro: any) => setupTaserNitro(nitro, options),
  };
}

export default taser;
