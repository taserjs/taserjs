/**
 * Next.js App Router adapter for Taser.
 *
 * Next cannot serve virtual modules, so this adapter materializes the same
 * generated sources the Vite plugin serves virtually into `.taser/` on disk
 * (see `emitter.ts`). The host app then mounts Taser through a catch-all
 * route handler:
 *
 * ```ts
 * // app/[[...slug]]/route.ts
 * import { taserApp } from "../.taser/app";
 *
 * const handle = (request: Request) => taserApp.fetch(request);
 * export const GET = handle;
 * export const POST = handle;
 * ```
 */
import type { NextConfig } from "next";
import { createTaserVirtualContext, watchAndSyncRoutes } from "./core/context.js";
import { DISK_ARTIFACT_DIR, writeDiskArtifacts } from "./core/emitter.js";
import type { TaserConfig, WatcherOptions } from "./core/types.js";

export type TaserNextConfig = NextConfig & {
  __taserRouterPlugin?: boolean;
  turbopack?: {
    resolveExtensions?: string[];
    [key: string]: unknown;
  };
  webpack?: (config: any, context: any) => any;
  [key: string]: any;
};

export type NextConfigFn<T = any> = (
  phase: string,
  context: { defaultConfig?: any; [key: string]: unknown },
) => T | Promise<T>;

export type NextConfigInput<T = any> = T | NextConfigFn<T>;

export type NextConfigReturn<T = NextConfig> = T extends (...args: any[]) => any
  ? (
      phase: string,
      context: { defaultConfig?: any; [key: string]: unknown },
    ) => Promise<
      TaserNextConfig &
        (ReturnType<T> extends Promise<infer R>
          ? Omit<R, "webpack">
          : Omit<ReturnType<T>, "webpack">)
    >
  : (T extends object ? Omit<T, "webpack"> : {}) & TaserNextConfig;

export type TaserNextOptions = TaserConfig & {
  rootDir?: string | undefined;
  outDir?: string | undefined;
  basePath?: string | undefined;
  watcher?: WatcherOptions | undefined;
};

const DEVELOPMENT_PHASES = new Set(["phase-development-server", "PHASE_DEVELOPMENT_SERVER"]);

function isDevelopmentPhase(phase?: string): boolean {
  const current = phase ?? process.env.NEXT_PHASE;
  if (current) {
    return DEVELOPMENT_PHASES.has(current);
  }
  return process.env.NODE_ENV === "development";
}
const TASER_KEY = "__taserRouterPlugin";

type MarkedConfig = TaserNextConfig & { [TASER_KEY]?: boolean };

const appliedConfigs = new WeakSet<object>();

function logError(message: string, error: unknown): void {
  console.error(`[taser] ${message}:`, error);
}

const DEFAULT_TURBO_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"];

type TurboResolveTarget = {
  resolveExtensions?: string[];
};

function mergeResolveExtensions(target: TurboResolveTarget, defaults: readonly string[]): void {
  const existing = target.resolveExtensions ?? [];
  target.resolveExtensions = [...new Set([...defaults, ...existing])];
}

function applyTurbopackConfig(config: TaserNextConfig): void {
  const turbopack = (
    typeof config.turbopack === "object" && config.turbopack !== null ? config.turbopack : {}
  ) as TurboResolveTarget & NonNullable<TaserNextConfig["turbopack"]>;
  mergeResolveExtensions(turbopack, DEFAULT_TURBO_EXTENSIONS);
  config.turbopack = turbopack;

  const experimental = config.experimental as { turbo?: TurboResolveTarget } | undefined;
  if (
    experimental &&
    typeof experimental === "object" &&
    experimental.turbo &&
    typeof experimental.turbo === "object"
  ) {
    mergeResolveExtensions(experimental.turbo, DEFAULT_TURBO_EXTENSIONS);
  }
}

function applyTaserNext(
  nextConfig: TaserNextConfig = {},
  options: TaserNextOptions = {},
  phase?: string | undefined,
): TaserNextConfig {
  const marked = nextConfig as MarkedConfig;
  if (
    marked[TASER_KEY] ||
    (typeof nextConfig === "object" && nextConfig !== null && appliedConfigs.has(nextConfig))
  ) {
    return marked;
  }

  const rootDir = options.rootDir ?? process.cwd();
  const outDir = options.outDir ?? DISK_ARTIFACT_DIR;
  const scope = options.basePath;

  let ctx: ReturnType<typeof createTaserVirtualContext> | undefined;
  try {
    ctx = createTaserVirtualContext({ ...options, rootDir });
  } catch (error) {
    logError("failed to initialise; integration disabled", error);
  }

  const generate = async (): Promise<void> => {
    if (!ctx) {
      return;
    }
    try {
      await ctx.writeTypes();
      await writeDiskArtifacts(ctx, {
        outDir,
        ...(scope !== undefined ? { scope } : {}),
      });
    } catch (error) {
      logError("failed to generate disk artifacts", error);
    }
  };

  const ready = generate();

  let closeWatcher: (() => Promise<void>) | undefined;
  const isDev = isDevelopmentPhase(phase);

  if (ctx && isDev) {
    const handle = watchAndSyncRoutes(ctx, () => generate(), options.watcher);
    closeWatcher = handle.close;

    const shutdown = () => {
      void closeWatcher?.();
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    process.once("exit", shutdown);
  }

  applyTurbopackConfig(nextConfig);

  const existingWebpack = nextConfig.webpack;

  const wrappedWebpack: NonNullable<NextConfig["webpack"]> = async (config, context) => {
    await ready;
    const next =
      typeof existingWebpack === "function" ? await existingWebpack(config, context) : config;

    const webpackConfig = (next ?? {}) as {
      resolve?: { extensionAlias?: Record<string, string[]> };
    };

    webpackConfig.resolve = webpackConfig.resolve ?? {};
    const userJsAlias = webpackConfig.resolve.extensionAlias?.[".js"] ?? [];
    webpackConfig.resolve.extensionAlias = {
      ...webpackConfig.resolve.extensionAlias,
      ".js": [...new Set([".ts", ".tsx", ".js", ...userJsAlias])],
    };

    return webpackConfig;
  };

  const result = {
    ...nextConfig,
    webpack: wrappedWebpack,
  } as MarkedConfig;

  Object.defineProperty(result, TASER_KEY, {
    get: () => true,
    enumerable: false,
    configurable: true,
  });

  if (typeof nextConfig === "object" && nextConfig !== null) {
    appliedConfigs.add(nextConfig);
  }
  appliedConfigs.add(result);

  return result;
}

export function createTaser(
  options: TaserNextOptions = {},
): <T extends NextConfigInput<any> | undefined = NextConfig>(
  nextConfig?: T,
) => NextConfigReturn<T> {
  return function withTaserCurried<T extends NextConfigInput<any> | undefined = NextConfig>(
    nextConfig?: T,
  ): NextConfigReturn<T> {
    if (typeof nextConfig === "function") {
      const configFn = async (
        phase: string,
        context: { defaultConfig?: any; [key: string]: unknown },
      ) => {
        const resolved = await (nextConfig as Function)(phase, context);
        return applyTaserNext(resolved, options, phase);
      };
      return configFn as unknown as NextConfigReturn<T>;
    }

    return applyTaserNext(
      (nextConfig ?? {}) as TaserNextConfig,
      options,
    ) as unknown as NextConfigReturn<T>;
  };
}

export const withTaser = createTaser;
export default createTaser;
