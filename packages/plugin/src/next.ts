import { executeGenerate, loadConfig, watchRoutes } from "@taserjs/cli";
import { resolve } from "pathe";

import { taserPlugin } from "./plugin.js";

export interface NextTaserOptions {
  cwd?: string | undefined;
  config?: string | undefined;
}

// Next evaluates `next.config` repeatedly within one process; one watcher is enough.
let routesWatcher: ReturnType<typeof watchRoutes> | undefined;

async function generateAndWatch(cwd: string, configFile: string | undefined): Promise<void> {
  const config = await loadConfig(cwd, configFile);
  executeGenerate({ cwd, config });

  if (process.env.NODE_ENV === "production" || routesWatcher) return;

  // Turbopack never runs webpack plugins and native file events are unreliable under it, so poll.
  routesWatcher = watchRoutes(
    config,
    cwd,
    () => {
      try {
        executeGenerate({ cwd, config, scaffold: true });
      } catch (error) {
        console.error(`[taserjs/next] Route generation error: ${(error as Error).message}`);
      }
    },
    { poll: true },
  );
}

export async function closeTaserWatcher(): Promise<void> {
  const watcher = routesWatcher;
  routesWatcher = undefined;
  await watcher?.close();
}

/**
 * Next.js config wrapper that keeps the route manifest fresh under both Turbopack and webpack.
 *
 * Config load generates the manifest and (outside production) starts the watcher for Turbopack.
 * The webpack plugin additionally guarantees the manifest exists before webpack compiles,
 * which the asynchronous generation at config load cannot promise.
 */
export function createTaser(options: NextTaserOptions = {}) {
  return function withTaser<TNextConfig extends Record<string, any>>(
    nextConfig: TNextConfig = {} as TNextConfig,
  ): TNextConfig {
    const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
    const pluginOptions = { cwd, ...(options.config ? { config: options.config } : {}) };

    generateAndWatch(cwd, options.config).catch((error: Error) => {
      console.error(`[taserjs/next] Route generation error: ${error.message}`);
    });

    return {
      ...nextConfig,
      turbopack: nextConfig.turbopack ?? {},
      webpack(config: any, webpackOptions: any) {
        config.plugins = [...(config.plugins ?? []), taserPlugin.webpack(pluginOptions)];
        return nextConfig.webpack?.(config, webpackOptions) ?? config;
      },
    };
  };
}

export default createTaser;
