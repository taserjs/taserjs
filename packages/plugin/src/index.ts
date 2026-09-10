import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, normalize, relative, resolve } from "pathe";
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
  server?: boolean | undefined;
  cwd?: string | undefined;
  config?: string | undefined;
  standalone?: boolean | undefined;
}

const FULLSTACK_PLUGIN_PATTERNS = [
  "nitro",
  "tanstack-start",
  "tanstack:router",
  "react-router",
  "remix",
  "astro",
  "sveltekit",
];

function isFullStackPluginName(name: string): boolean {
  const lower = name.toLowerCase();
  for (const pattern of FULLSTACK_PLUGIN_PATTERNS) {
    if (lower.includes(pattern)) {
      return true;
    }
  }
  if (lower.includes("tanstack") && lower.includes("start")) {
    return true;
  }
  return false;
}

function detectFullStack(viteConfig: any): boolean {
  if (!viteConfig) return false;
  if (viteConfig.nitro) return true;
  const plugins = viteConfig.plugins;
  if (!plugins) return false;
  const flat = Array.isArray(plugins) ? plugins.flat(Infinity) : [plugins];
  return flat.some((p: any) => {
    const name = p?.name;
    return typeof name === "string" && isFullStackPluginName(name);
  });
}

function isRunnableEnvironment(environment: any): boolean {
  if (!environment) return true;
  try {
    if (environment.constructor?.name === "FetchableDevEnvironment") {
      return false;
    }
    if (environment.constructor?.name === "RunnableDevEnvironment") {
      return true;
    }
    if (typeof (environment as any).dispatchFetch === "function" && !(environment as any).runner) {
      return false;
    }
    if ((environment as any).runner) {
      return true;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[taserjs] Warning checking Vite environment runnability: ${message}`);
  }
  return true;
}

export function normalizeImportPath(pathStr: string): string {
  let normalized = normalize(pathStr);
  if (!isAbsolute(normalized) && !normalized.startsWith("./") && !normalized.startsWith("../")) {
    normalized = `./${normalized}`;
  }
  return normalized;
}

export function isSubPath(child: string, parent: string): boolean {
  const rel = relative(parent, child);
  return !rel.startsWith("../") && rel !== ".." && !isAbsolute(rel);
}

export function isOutputDir(filePath: string, outputDir: string): boolean {
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
  let detectedFullStack: boolean | null = null;

  async function getConfig(): Promise<ResolvedTaserConfig> {
    if (!cachedConfig) {
      cachedConfig = await loadConfig(cwd, options.config);
    }
    return cachedConfig;
  }

  async function resolveIsServerMode(viteConfig?: any): Promise<boolean> {
    if (options.server !== undefined) {
      return options.server;
    }
    const config = await getConfig();
    if (config.server !== undefined) {
      return config.server;
    }
    if (detectedFullStack !== null) {
      return !detectedFullStack;
    }
    if (viteConfig && detectFullStack(viteConfig)) {
      detectedFullStack = true;
      return false;
    }
    return true;
  }

  async function executeGeneration(isDev = false): Promise<void> {
    try {
      const config = await getConfig();
      const routesDir = resolveRoutesDir(config, cwd);
      const scanResult = scanRoutes({
        routesDir,
        cwd,
        scaffold: isDev,
        formatting: config.formatting,
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
    const normalizedRoutesPath = normalizeImportPath(routesGenImportPath);
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

      const isServerMode = await resolveIsServerMode();
      if (isServerMode) {
        const config = await getConfig();
        const outputDir = resolveOutputDir(config, cwd);
        const serveShimPath = join(outputDir, "serve.mjs");
        const ext = resolveImportExtension(config.extension);
        emitServeShim(serveShimPath, `./routes.gen${ext}`);
      }
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

        const isFullStack = detectFullStack(config);
        detectedFullStack = isFullStack;

        const isServerMode = await resolveIsServerMode(config);

        if (isServerMode && env?.command === "build") {
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

      configResolved(resolvedConfig) {
        if (detectFullStack(resolvedConfig)) {
          detectedFullStack = true;
        } else if (detectedFullStack === null) {
          detectedFullStack = false;
        }
      },

      async configureServer(server) {
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

        const isServerMode = await resolveIsServerMode(server.config);
        if (!isServerMode) {
          return;
        }

        server.middlewares.use(async (req: any, res: any, next: any) => {
          const url = req.url;
          if (!url || shouldSkipDevRequest(url)) {
            return next();
          }

          const ssrEnv = (server as any).environments?.ssr;
          if ((server as any).environments && ssrEnv && !isRunnableEnvironment(ssrEnv)) {
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
