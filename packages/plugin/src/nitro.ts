import { existsSync } from "node:fs";
import { resolve } from "pathe";
import {
  generateManifest,
  loadConfig,
  resolveOutputDir,
  resolveRoutesDir,
  resolveServerDir,
  scanRoutes,
  type ResolvedTaserConfig,
} from "@taserjs/cli";
import { watch, type FSWatcher } from "chokidar";
import {
  buildHostFallbackCode,
  getHostServer,
  normalizeImportPath,
  taserPlugin,
  type HostServerInfo,
  type TaserPluginOptions,
} from "./index.js";

export function buildNitroRoutingVirtualSource(): string {
  return [
    "export const findRouteRules = () => ({});",
    "export const findRoute = () => undefined;",
    "export const globalMiddleware = [];",
    "export const findRoutedMiddleware = () => [];",
  ].join("\n");
}

export function buildNitroStandaloneAppSource(
  routesGenPath: string,
  hostServer?: HostServerInfo | null,
): string {
  const normalizedPath = normalizeImportPath(routesGenPath);
  const fallback = hostServer
    ? buildHostFallbackCode(normalizeImportPath(hostServer.path), hostServer.type, "taserApp")
    : null;

  return `// @ts-nocheck
import { app as taserApp } from "${normalizedPath}";
import { FastResponse } from "srvx";
${fallback ? fallback.imports : ""}

globalThis.Response = FastResponse;

${fallback ? fallback.setup : ""}

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

export function buildNitroMiddlewareHandlerSource(
  routesGenPath: string,
  hostServer?: HostServerInfo | null,
): string {
  const normalizedPath = normalizeImportPath(routesGenPath);
  const fallback = hostServer
    ? buildHostFallbackCode(normalizeImportPath(hostServer.path), hostServer.type, "taserApp")
    : null;

  return `// @ts-nocheck
import { app as taserApp } from "${normalizedPath}";
import { toWebRequest } from "h3";
${fallback ? fallback.imports : ""}

${fallback ? fallback.setup : ""}

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
  const serverDir = resolveServerDir(config, cwd);
  const outputDir = resolveOutputDir(config, cwd);
  const routesGenPath = resolve(outputDir, "routes.gen.ts");

  const executeGeneration = (scaffold = Boolean(nitro.options.dev)) => {
    if (existsSync(routesDir)) {
      const scanResult = scanRoutes({
        routesDir,
        cwd,
        scaffold,
        formatting: config.formatting,
      });
      generateManifest(scanResult, config, cwd);
    }
  };

  executeGeneration();

  nitro.options.virtual = nitro.options.virtual || {};
  const isStandalone = options.standalone === true;

  if (isStandalone) {
    nitro.options.virtual["#nitro/virtual/app"] = () => {
      const currentHost = getHostServer(config, cwd, options);
      return buildNitroStandaloneAppSource(routesGenPath, currentHost);
    };
    nitro.options.virtual["#nitro/virtual/routing"] = () => buildNitroRoutingVirtualSource();
  } else {
    const VIRTUAL_NITRO_HANDLER_ID = "#taserjs/virtual/nitro-handler";
    nitro.options.virtual[VIRTUAL_NITRO_HANDLER_ID] = () => {
      const currentHost = getHostServer(config, cwd, options);
      return buildNitroMiddlewareHandlerSource(routesGenPath, currentHost);
    };

    nitro.options.handlers = nitro.options.handlers || [];
    nitro.options.handlers.unshift({
      route: "/**",
      lazy: false,
      handler: VIRTUAL_NITRO_HANDLER_ID,
    });
  }

  let watcher: FSWatcher | undefined;
  if (nitro.options.dev && existsSync(routesDir)) {
    const watchDirs = [routesDir];
    if (existsSync(serverDir) && !watchDirs.includes(serverDir)) {
      watchDirs.push(serverDir);
    }
    watcher = watch(watchDirs, {
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
