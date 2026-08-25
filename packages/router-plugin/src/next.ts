/**
 * Next.js App Router adapter for Taser.
 *
 * Next cannot serve virtual modules, so this adapter materializes the same
 * generated sources the Vite plugin serves virtually into `.taser/` on disk
 * (see `core/emitter.ts`). The host app then mounts Taser through a catch-all
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
 *
 * Usage in `next.config.ts` (curried factory style, like `@next/mdx`):
 *
 * ```ts
 * import createTaser from "@taserjs/router-plugin/next";
 *
 * const withTaser = createTaser({
 *   basePath: "/app", // optional; becomes the Taser dispatch scope
 * });
 *
 * export default withTaser({
 *   // next.js config
 * });
 * ```
 */
import { watchAndSyncRoutes, type WatcherOptions } from "./core/watcher.js";
import { DISK_ARTIFACT_DIR, writeDiskArtifacts } from "./core/emitter.js";
import { createTaserVirtualContext } from "./core/context.js";
import type { TaserUserConfig } from "./types.js";

/**
 * Minimal structural view of the pieces of a Next config we interact with.
 * Intentionally not importing `next` types: `next` is an optional peer and may
 * be absent when only the shared core is consumed.
 */
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

/**
 * Options accepted by {@link createTaser} / {@link withTaser}.
 */
export type TaserNextOptions = TaserUserConfig & {
  /** Output directory for generated artifacts; defaults to `.taser`. */
  outDir?: string | undefined;
  /**
   * URL scope Taser dispatches under. Defaults to the Next config's
   * `basePath`, falling back to `/`.
   */
  basePath?: string | undefined;
  /** Route watcher tuning passed through to `watchAndSyncRoutes`. */
  watcher?: WatcherOptions | undefined;
};

const DEVELOPMENT_PHASE = "PHASE_DEVELOPMENT_SERVER";

/** Marker so wrapping twice does not double-register watchers/hooks. */
const TASER_KEY = "__taserRouterPlugin";

type MarkedConfig = TaserNextConfig & { [TASER_KEY]?: boolean };

function logError(message: string, error: unknown): void {
  console.error(`[taser] ${message}:`, error);
}

const DEFAULT_TURBO_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"];

function applyTurbopackConfig(config: TaserNextConfig): void {
  if (config.turbopack && typeof config.turbopack === "object") {
    const existing = config.turbopack.resolveExtensions ?? [];
    config.turbopack.resolveExtensions = [...new Set([...DEFAULT_TURBO_EXTENSIONS, ...existing])];
  }

  if (
    config.experimental &&
    typeof config.experimental === "object" &&
    config.experimental.turbo &&
    typeof config.experimental.turbo === "object"
  ) {
    const existing = config.experimental.turbo.resolveExtensions ?? [];
    config.experimental.turbo.resolveExtensions = [
      ...new Set([...DEFAULT_TURBO_EXTENSIONS, ...existing]),
    ];
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

  // A project without a Taser entry (e.g. a shared config applied to a
  // non-Taser app) must not hard-crash the whole Next config load — degrade to
  // a pass-through wrapper and surface the reason.
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

  // Config wrappers are synchronous; kick generation off immediately and let
  // the webpack hook (which may be async) await readiness.
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

  // 1. Turbopack integration (Next 14/15/16)
  applyTurbopackConfig(nextConfig);

  // 2. Webpack integration (safe extension alias merging)
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

/**
 * Curried factory function (like `@next/mdx`) to integrate Taser routing into Next.js.
 *
 * ```ts
 * import createTaser from "@taserjs/router-plugin/next";
 *
 * const withTaser = createTaser({ basePath: "/api" });
 * export default withTaser(nextConfig);
 * ```
 */
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
