import { isAbsolute, relative, resolve } from "node:path";
import {
  generateManifest,
  loadConfig,
  resolveAppFile,
  resolveOutputDir,
  resolveRoutesDir,
  scanRoutes,
  type ResolvedTaserConfig,
} from "@taserjs/cli";
import { createUnplugin } from "unplugin";

export const VERSION = "0.0.1";
export const DEFAULT_WATCH_DEBOUNCE_MS = 50;
export const DEFAULT_OUTPUT_IGNORE_PATTERN = "**/.taserjs/**";

export interface TaserPluginOptions {
  cwd?: string | undefined;
  config?: string | undefined;
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
  const cwd = options.cwd ? resolve(options.cwd) : process.cwd();
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
        extensions: config.extensions,
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

  return {
    name: "taserjs:plugin",

    async buildStart() {
      const isDev = meta.framework === "vite";
      await executeGeneration(isDev);
    },

    async watchChange(id, _change) {
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
      config(config) {
        config.server = config.server || {};
        config.server.watch = config.server.watch || {};
        config.server.watch.ignored = mergeWatchIgnored(
          config.server.watch.ignored,
          DEFAULT_OUTPUT_IGNORE_PATTERN,
        );
      },

      configureServer(server) {
        const handleFileChange = async (file: string) => {
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
