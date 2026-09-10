import { existsSync } from "node:fs";
import { resolve } from "pathe";
import {
  generateManifest,
  loadConfig,
  resolveRoutesDir,
  scanRoutes,
  type ResolvedTaserConfig,
} from "@taserjs/cli";
import { watch, type FSWatcher } from "chokidar";
import { taserPlugin, type TaserPluginOptions } from "./index.js";

export interface NextTaserOptions extends TaserPluginOptions {
  serverDir?: string;
  basePath?: string;
  extension?: boolean | string;
}

let turbopackWatcher: FSWatcher | null = null;

export async function runNextTaserGeneration(
  cwd: string,
  options?: NextTaserOptions,
): Promise<void> {
  let config: ResolvedTaserConfig = await loadConfig(cwd, options?.config);
  if (options?.serverDir || options?.extension !== undefined) {
    config = {
      ...config,
      ...(options.serverDir ? { serverDir: options.serverDir } : {}),
      ...(options.extension !== undefined ? { extension: options.extension } : {}),
    };
  }

  const routesDir = resolveRoutesDir(config, cwd);
  if (existsSync(routesDir)) {
    const scanResult = scanRoutes({
      routesDir,
      cwd,
    });
    generateManifest(scanResult, config, cwd);
  }
}

export async function startTurbopackWatcher(
  cwd: string,
  options?: NextTaserOptions,
): Promise<FSWatcher | null> {
  if (turbopackWatcher) {
    return turbopackWatcher;
  }

  const baseConfig = await loadConfig(cwd, options?.config);
  const resolvedConfig: ResolvedTaserConfig = {
    ...baseConfig,
    ...(options?.serverDir ? { serverDir: options.serverDir } : {}),
    ...(options?.extension !== undefined ? { extension: options.extension } : {}),
  };
  const routesDir = resolveRoutesDir(resolvedConfig, cwd);

  if (existsSync(routesDir)) {
    turbopackWatcher = watch([routesDir], {
      ignoreInitial: true,
      usePolling: true,
      interval: 100,
      ignored: [/(^|[/\\])\../, /(^|[/\\])-/, /node_modules/, /\.taserjs/],
    });

    let timer: ReturnType<typeof setTimeout> | null = null;
    turbopackWatcher.on("all", () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const scanResult = scanRoutes({
          routesDir,
          cwd,
          scaffold: true,
          formatting: resolvedConfig.formatting,
        });
        generateManifest(scanResult, resolvedConfig, cwd);
      }, 50);
    });
  }

  return turbopackWatcher;
}

export function closeTurbopackWatcher(): Promise<void> | void {
  if (turbopackWatcher) {
    const p = turbopackWatcher.close();
    turbopackWatcher = null;
    return p;
  }
}

/**
 * Higher-order Next.js configuration wrapper for Taser.js.
 * Supports both Webpack and Turbopack dev/build flows.
 */
export function createTaser(pluginOptions: NextTaserOptions = {}) {
  return function withTaser<TNextConfig extends Record<string, any>>(
    nextConfig: TNextConfig = {} as TNextConfig,
  ): TNextConfig {
    const cwd = pluginOptions.cwd ? resolve(pluginOptions.cwd) : process.cwd();

    // 1. Trigger initial generation
    runNextTaserGeneration(cwd, pluginOptions).catch((err) => {
      console.error(`[taserjs/next] Route generation error: ${err.message}`);
    });

    // 2. Start watcher for Turbopack dev mode if active or NODE_ENV != production
    if (process.env.NODE_ENV !== "production") {
      startTurbopackWatcher(cwd, pluginOptions).catch(() => {});
    }

    const enhancedConfig: any = {
      ...nextConfig,
      turbopack: nextConfig.turbopack ?? {},
      webpack(config: any, webpackOptions: any) {
        // Run generation during Webpack compile
        const webpackPlugin = taserPlugin.webpack({
          ...pluginOptions,
          cwd,
        });
        config.plugins = config.plugins || [];
        config.plugins.push(webpackPlugin);

        if (typeof nextConfig.webpack === "function") {
          return nextConfig.webpack(config, webpackOptions);
        }
        return config;
      },
    };

    return enhancedConfig;
  };
}

export const withTaser = (nextConfig: any, options?: NextTaserOptions) =>
  createTaser(options)(nextConfig);

export default createTaser;
