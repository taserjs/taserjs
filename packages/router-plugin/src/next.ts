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
import { createTaserVirtualContext, watchAndSyncRoutes } from "./core/context.js";
import { DISK_ARTIFACT_DIR, writeDiskArtifacts } from "./core/emitter.js";
import type { TaserConfig, WatcherOptions } from "./core/types.js";

export type TaserNextConfig = {
  basePath?: string | undefined;
  webpack?: ((config: any, context?: any) => any) | undefined;
  turbopack?:
    | {
        resolveAlias?: Record<string, string> | undefined;
        resolveExtensions?: string[] | undefined;
        [key: string]: unknown;
      }
    | undefined;
  experimental?:
    | {
        turbo?:
          | {
              resolveAlias?: Record<string, string> | undefined;
              resolveExtensions?: string[] | undefined;
              [key: string]: unknown;
            }
          | undefined;
        [key: string]: unknown;
      }
    | undefined;
  [key: string]: unknown;
};

export type NextConfigFn = (
  phase: string,
  context: { defaultConfig: TaserNextConfig; [key: string]: unknown },
) => TaserNextConfig | Promise<TaserNextConfig>;

export type NextConfigInput = TaserNextConfig | NextConfigFn;

export type NextConfigReturn<T extends NextConfigInput | undefined = undefined> =
  T extends NextConfigFn
    ? NextConfigFn
    : TaserNextConfig & (T extends object ? T : Record<string, unknown>);

export type TaserNextOptions = TaserConfig & {
  rootDir?: string | undefined;
  outDir?: string | undefined;
  basePath?: string | undefined;
  watcher?: WatcherOptions | undefined;
};

const DEVELOPMENT_PHASE = "PHASE_DEVELOPMENT_SERVER";
const TASER_KEY = "__taserRouterPlugin";

type MarkedConfig = TaserNextConfig & { [TASER_KEY]?: boolean };

function logError(message: string, error: unknown): void {
  console.error(`[taser] ${message}:`, error);
}

const DEFAULT_TURBO_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"];

type TurboResolveTarget = {
  resolveExtensions?: string[] | undefined;
};

function mergeResolveExtensions(
  target: TurboResolveTarget | undefined,
  defaults: readonly string[],
): void {
  if (!target || typeof target !== "object") {
    return;
  }
  const existing = target.resolveExtensions ?? [];
  target.resolveExtensions = [...new Set([...defaults, ...existing])];
}

function applyTurbopackConfig(config: TaserNextConfig): void {
  mergeResolveExtensions(config.turbopack, DEFAULT_TURBO_EXTENSIONS);
  if (config.experimental && typeof config.experimental === "object") {
    mergeResolveExtensions(config.experimental.turbo, DEFAULT_TURBO_EXTENSIONS);
  }
}

function applyTaserNext(
  nextConfig: TaserNextConfig = {},
  options: TaserNextOptions = {},
  phase?: string | undefined,
): TaserNextConfig {
  const marked = nextConfig as MarkedConfig;
  if (marked[TASER_KEY]) {
    return marked;
  }

  const rootDir = options.rootDir ?? process.cwd();
  const outDir = options.outDir ?? DISK_ARTIFACT_DIR;
  const scope = options.basePath ?? nextConfig.basePath;

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
      await writeDiskArtifacts(ctx, { outDir, ...(scope !== undefined ? { scope } : {}) });
    } catch (error) {
      logError("failed to generate disk artifacts", error);
    }
  };

  const ready = generate();

  let closeWatcher: (() => Promise<void>) | undefined;
  const isDev = (phase ?? process.env.NEXT_PHASE) === DEVELOPMENT_PHASE;

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

  const wrappedWebpack = async (config: unknown, context: unknown): Promise<unknown> => {
    await ready;
    const next = (
      typeof existingWebpack === "function" ? await existingWebpack(config, context) : config
    ) as {
      resolve?: { extensionAlias?: Record<string, string[]> };
      watchOptions?: { ignored?: string[] | string };
    };

    next.resolve = next.resolve ?? {};
    const userJsAlias = next.resolve.extensionAlias?.[".js"] ?? [];
    next.resolve.extensionAlias = {
      ...next.resolve.extensionAlias,
      ".js": [...new Set([".ts", ".tsx", ".js", ...userJsAlias])],
    };

    return next;
  };

  const result: TaserNextConfig = {
    ...nextConfig,
    ...(options.basePath !== undefined ? { basePath: options.basePath } : {}),
    webpack: wrappedWebpack,
    [TASER_KEY]: true,
  };

  return result;
}

export function createTaser(
  options: TaserNextOptions = {},
): <T extends NextConfigInput | undefined = TaserNextConfig>(
  nextConfig?: T,
) => NextConfigReturn<T> {
  return function withTaserCurried<T extends NextConfigInput | undefined = TaserNextConfig>(
    nextConfig?: T,
  ): NextConfigReturn<T> {
    if (typeof nextConfig === "function") {
      const configFn: NextConfigFn = async (phase, context) => {
        const resolved = await nextConfig(phase, context);
        return applyTaserNext(resolved, options, phase);
      };
      return configFn as unknown as NextConfigReturn<T>;
    }

    return applyTaserNext(
      nextConfig as TaserNextConfig | undefined,
      options,
    ) as unknown as NextConfigReturn<T>;
  };
}

export const withTaser = createTaser;
export default createTaser;
