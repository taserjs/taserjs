import { executeGenerate, loadConfig, watchRoutes } from "@taserjs/cli";
import { resolve } from "pathe";

import { taserPlugin } from "./plugin.js";

export interface NextTaserOptions {
  cwd?: string | undefined;
  config?: string | undefined;
}

// Next evaluates `next.config` repeatedly within one process; one watcher is enough.
let routesWatcher: ReturnType<typeof watchRoutes> | undefined;

function generateLoggingErrors(options: Parameters<typeof executeGenerate>[0]): void {
  try {
    executeGenerate(options);
  } catch (error) {
    console.error(`[taserjs/next] Route generation error: ${(error as Error).message}`);
  }
}

async function generateAndWatch(cwd: string, configFile: string | undefined): Promise<void> {
  const config = await loadConfig(cwd, configFile);
  // A broken route must not prevent the watcher from starting, or fixing it would never regenerate.
  generateLoggingErrors({ cwd, config });

  if (process.env.NODE_ENV === "production" || routesWatcher) return;

  // Turbopack never runs webpack plugins and native file events are unreliable under it, so poll.
  routesWatcher = watchRoutes(
    config,
    cwd,
    () => generateLoggingErrors({ cwd, config, scaffold: true }),
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
  /** Next also accepts `(phase, { defaultConfig }) => config`, sync or async. */
  type NextConfigFunction<TNextConfig> = (
    phase: string,
    context: { defaultConfig: TNextConfig },
  ) => TNextConfig | Promise<TNextConfig>;

  // The function overload comes first: a function is also assignable to `Record<string, any>`.
  function withTaser<TNextConfig extends Record<string, any>>(
    nextConfig: NextConfigFunction<TNextConfig>,
  ): NextConfigFunction<TNextConfig>;
  function withTaser<TNextConfig extends Record<string, any>>(
    nextConfig?: TNextConfig,
  ): TNextConfig;
  function withTaser<TNextConfig extends Record<string, any>>(
    nextConfig: TNextConfig | NextConfigFunction<TNextConfig> = {} as TNextConfig,
  ): TNextConfig | NextConfigFunction<TNextConfig> {
    const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
    const pluginOptions = { cwd, ...(options.config ? { config: options.config } : {}) };

    generateAndWatch(cwd, options.config).catch((error: Error) => {
      console.error(`[taserjs/next] Route generation error: ${error.message}`);
    });

    const enhance = (userConfig: TNextConfig): TNextConfig => ({
      ...userConfig,
      turbopack: userConfig.turbopack ?? {},
      webpack(config: any, webpackOptions: any) {
        config.plugins = [...(config.plugins ?? []), taserPlugin.webpack(pluginOptions)];
        return userConfig.webpack?.(config, webpackOptions) ?? config;
      },
    });

    return typeof nextConfig === "function"
      ? async (phase, context) => enhance(await nextConfig(phase, context))
      : enhance(nextConfig);
  }

  return withTaser;
}

export default createTaser;
