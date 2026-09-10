import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  generateManifest,
  loadConfig,
  resolveAppFile,
  resolveImportExtension,
  resolveOutputDir,
  resolveRoutesDir,
  scanRoutes,
  type ResolvedTaserConfig,
} from "@taserjs/cli";
import { toNodeHandler } from "srvx/node";
import { createUnplugin } from "unplugin";

export const DEFAULT_WATCH_DEBOUNCE_MS = 50;
export const DEFAULT_OUTPUT_IGNORE_PATTERN = "**/.taserjs/**";

export interface TaserPluginOptions {
  cwd?: string | undefined;
  config?: string | undefined;
  standalone?: boolean | undefined;
}

function isSubPath(child: string, parent: string): boolean {
  const rel = relative(parent, child).replace(/\\/g, "/");
  return !rel.startsWith("../") && rel !== ".." && !isAbsolute(rel);
}

function isOutputDir(filePath: string, outputDir: string): boolean {
  const normalizedFile = resolve(filePath);
  const normalizedOutput = resolve(outputDir);
  return (
    normalizedFile === normalizedOutput ||
    isSubPath(normalizedFile, normalizedOutput) ||
    filePath.includes(".taserjs")
  );
}

function mergeWatchIgnored(current: unknown, ...patterns: string[]): Array<string | RegExp> {
  const existing: Array<string | RegExp> = Array.isArray(current)
    ? [...current]
    : current
      ? [current as string | RegExp]
      : [];

  for (const pattern of patterns) {
    if (!existing.includes(pattern)) {
      existing.push(pattern);
    }
  }

  return existing;
}

export const taserPlugin = createUnplugin((options: TaserPluginOptions | undefined = {}, meta) => {
  let cwd = options.cwd ? resolve(options.cwd) : process.cwd();
  let cachedConfig: ResolvedTaserConfig | null = null;

  async function getConfig(): Promise<ResolvedTaserConfig> {
    if (!cachedConfig) {
      cachedConfig = await loadConfig(cwd, options.config);
    }
    return cachedConfig;
  }

  async function executeGeneration(isDev = false): Promise<void> {
    try {
      const config = await getConfig();
      const routesDir = resolveRoutesDir(config, cwd);
      const scanResult = scanRoutes({
        routesDir,
        cwd,
      });

      generateManifest(scanResult, config, cwd);
    } catch (err: unknown) {
      if (isDev) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[taserjs] Route generation warning: ${message}`);
      } else {
        throw err;
      }
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  function triggerDebouncedGeneration(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      executeGeneration(true).catch(() => {});
    }, DEFAULT_WATCH_DEBOUNCE_MS);
  }

  let cachedDevHandler: ((req: any, res: any) => any) | null = null;
  const VITE_INTERNAL_PREFIXES = ["/@", "/__vite", "/__open-in-editor", "/@fs/", "/@id/"];
  const VITE_QUERY_PATTERN = /[?&](?:import|raw|url|worker)\b/;

  function shouldSkipDevRequest(url: string): boolean {
    for (let i = 0; i < VITE_INTERNAL_PREFIXES.length; i++) {
      if (url.startsWith(VITE_INTERNAL_PREFIXES[i]!)) {
        return true;
      }
    }
    if (url.startsWith("/node_modules/")) {
      return true;
    }
    return VITE_QUERY_PATTERN.test(url);
  }

  function emitServeShim(serveShimPath: string, routesGenImportPath: string): void {
    const normalizedRoutesPath = routesGenImportPath.replace(/\\/g, "/");
    const code = `// @ts-nocheck
import { FastResponse } from "srvx";
globalThis.Response = FastResponse;
import { serve } from "srvx/node";
import { app } from "${normalizedRoutesPath}";

serve(app);
`;
    mkdirSync(resolve(serveShimPath, ".."), { recursive: true });
    writeFileSync(serveShimPath, code, "utf-8");
  }

  return {
    name: "taserjs:plugin",

    async buildStart() {
      const isDev = meta.framework === "vite";
      await executeGeneration(isDev);

      const config = await getConfig();
      const outputDir = resolveOutputDir(config, cwd);
      const routesGenPath = join(outputDir, "routes.gen.ts");
      const serveShimPath = join(outputDir, "serve.mjs");
      const ext = resolveImportExtension(config.extension);
      emitServeShim(serveShimPath, `./routes.gen${ext}`);
    },

    async watchChange(id, _change) {
      cachedDevHandler = null;
      const config = await getConfig();
      const outputDir = resolveOutputDir(config, cwd);
      if (isOutputDir(id, outputDir)) {
        return;
      }

      const routesDir = resolveRoutesDir(config, cwd);
      const appFile = resolveAppFile(config, cwd);

      if (id === appFile || isSubPath(id, routesDir)) {
        await executeGeneration(true);
      }
    },

    vite: {
      async config(config, env) {
        if (!options.cwd && config.root) {
          cwd = resolve(config.root);
          cachedConfig = null;
        }
        config.server = config.server || {};
        config.server.watch = config.server.watch || {};
        config.server.watch.ignored = mergeWatchIgnored(
          config.server.watch.ignored,
          DEFAULT_OUTPUT_IGNORE_PATTERN,
        );

        // Detect if Nitro is active
        const hasNitro = Boolean(
          (config as any).nitro ||
            (config.plugins &&
              (config.plugins as any[]).some((p: any) => {
                const name = p?.name;
                return typeof name === "string" && (name === "nitro" || name.startsWith("nitro:"));
              })),
        );

        if (!hasNitro && env?.command === "build") {
          const taserConfig = await getConfig();
          const outputDir = resolveOutputDir(taserConfig, cwd);
          const serveShimPath = join(outputDir, "serve.mjs");
          const ext = resolveImportExtension(taserConfig.extension);
          emitServeShim(serveShimPath, `./routes.gen${ext}`);

          return {
            build: {
              ssr: serveShimPath,
              rollupOptions: {
                external: ["srvx", "srvx/node", "@taserjs/runtime", "hono"],
                output: {
                  entryFileNames: "serve.mjs",
                },
              },
            },
          };
        }
      },

      configureServer(server) {
        const handleFileChange = async (file: string) => {
          cachedDevHandler = null;
          const config = await getConfig();
          const outputDir = resolveOutputDir(config, cwd);
          if (isOutputDir(file, outputDir)) {
            return;
          }

          const routesDir = resolveRoutesDir(config, cwd);
          const appFile = resolveAppFile(config, cwd);

          if (file === appFile || isSubPath(file, routesDir)) {
            triggerDebouncedGeneration();
          }
        };

        server.watcher.on("add", handleFileChange);
        server.watcher.on("unlink", handleFileChange);
        server.watcher.on("change", handleFileChange);
        server.watcher.on("unlinkDir", handleFileChange);

        server.middlewares.use(async (req: any, res: any, next: any) => {
          const url = req.url;
          if (!url || shouldSkipDevRequest(url)) {
            return next();
          }

          try {
            if (!cachedDevHandler) {
              const taserConfig = await getConfig();
              const outputDir = resolveOutputDir(taserConfig, cwd);
              const routesGenPath = join(outputDir, "routes.gen.ts");

              if (!existsSync(routesGenPath)) {
                await executeGeneration(true);
              }

              const mod = (await server.ssrLoadModule(routesGenPath)) as Record<string, any>;
              const app = mod.app ?? mod.default;

              if (!app || typeof app.fetch !== "function") {
                return next();
              }

              cachedDevHandler = toNodeHandler((fetchReq: Request) => app.fetch(fetchReq));
            }

            if (cachedDevHandler) {
              await cachedDevHandler(req, res);
            } else {
              next();
            }
          } catch (error) {
            server.ssrFixStacktrace(error as Error);
            next(error);
          }
        });
      },
    },

    webpack(compiler) {
      compiler.options.watchOptions = compiler.options.watchOptions || {};
      compiler.options.watchOptions.ignored = mergeWatchIgnored(
        compiler.options.watchOptions.ignored,
        DEFAULT_OUTPUT_IGNORE_PATTERN,
      );
    },

    rspack(compiler) {
      compiler.options.watchOptions = compiler.options.watchOptions || {};
      compiler.options.watchOptions.ignored = mergeWatchIgnored(
        compiler.options.watchOptions.ignored,
        DEFAULT_OUTPUT_IGNORE_PATTERN,
      );
    },
  };
});

export const taser = Object.assign(
  (options?: TaserPluginOptions) => taserPlugin.raw(options, {} as any),
  taserPlugin,
);
export default taserPlugin;
