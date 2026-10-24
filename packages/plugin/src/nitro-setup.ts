import { executeGenerate, loadConfig, resolvePaths, watchRoutes } from "@taserjs/cli";
import { resolve } from "pathe";

import {
  absoluteHostImport,
  NITRO_ROUTING_STUB_SOURCE,
  nitroHandlerSource,
  nitroStandaloneAppSource,
} from "./codegen.js";
import { detectHostServer } from "./host.js";
import type { TaserPluginOptions } from "./plugin.js";

const NITRO_HANDLER_ID = "#taserjs/virtual/nitro-handler";
const REGISTERED_FLAG = "_taserHookRegistered";

/** Registers Taser on a Nitro instance exactly once, even if several integrations ask for it. */
export function setupTaserNitro(
  nitro: any,
  options: TaserPluginOptions = {},
): Promise<void> | void {
  if (nitro.options[REGISTERED_FLAG]) return;
  nitro.options[REGISTERED_FLAG] = true;

  return applyTaserNitro(nitro, options);
}

async function applyTaserNitro(nitro: any, options: TaserPluginOptions): Promise<void> {
  const cwd = resolve(nitro.options.rootDir || options.cwd || process.cwd());
  const config = await loadConfig(cwd, options.config);
  const paths = resolvePaths(config, cwd);
  const isDev = Boolean(nitro.options.dev);
  const syncRouting = () => nitro.routing?.sync?.();

  // Host detection is deferred to render time so a server file added later is picked up.
  const hostImport = () =>
    absoluteHostImport(detectHostServer(paths.serverDir, cwd, options.serverEntry));

  executeGenerate({ cwd, config, scaffold: isDev });

  nitro.options.virtual ??= {};
  nitro.options.virtual[NITRO_HANDLER_ID] = () =>
    nitroHandlerSource(paths.manifestFile, hostImport());

  if (options.standalone !== false) {
    nitro.options.virtual["#nitro/virtual/app"] = () =>
      nitroStandaloneAppSource(paths.manifestFile, hostImport());
    nitro.options.virtual["#nitro/virtual/routing"] = () => NITRO_ROUTING_STUB_SOURCE;

    nitro.options.routes ??= {};
    nitro.options.routes["/**"] = NITRO_HANDLER_ID;
  } else {
    nitro.options.handlers ??= [];
    nitro.options.handlers.unshift({ route: "/**", lazy: false, handler: NITRO_HANDLER_ID });
  }

  syncRouting();

  if (!isDev) return;

  const watcher = watchRoutes(config, cwd, () => {
    try {
      executeGenerate({ cwd, config, scaffold: true });
      syncRouting();
    } catch (error) {
      console.error(`[taserjs] Route generation warning: ${(error as Error).message}`);
    }
  });
  nitro.hooks.hook("close", () => watcher.close());
}
