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

export interface TaserPluginOptions {
  cwd?: string | undefined;
  config?: string | undefined;
}

function isSubPath(child: string, parent: string): boolean {
  const rel = relative(parent, child).replace(/\\/g, "/");
  return !rel.startsWith("../") && rel !== ".." && !isAbsolute(rel);
}

function isOutputDir(filePath: string, outputDir: string): boolean {
  if (filePath.includes(".taserjs")) {
    return true;
  }
  return isSubPath(filePath, outputDir) || filePath === outputDir;
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
    }, 50);
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
        const currentIgnored = config.server.watch.ignored;
        const ignoredPattern = "**/.taserjs/**";

        if (Array.isArray(currentIgnored)) {
          if (!currentIgnored.includes(ignoredPattern)) {
            config.server.watch.ignored = [...currentIgnored, ignoredPattern];
          }
        } else if (currentIgnored) {
          config.server.watch.ignored = [currentIgnored, ignoredPattern];
        } else {
          config.server.watch.ignored = [ignoredPattern];
        }
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
      const ignored = compiler.options.watchOptions.ignored;
      const ignoredPattern = "**/.taserjs/**";

      if (Array.isArray(ignored)) {
        if (!ignored.includes(ignoredPattern)) {
          compiler.options.watchOptions.ignored = [...ignored, ignoredPattern];
        }
      } else if (ignored) {
        compiler.options.watchOptions.ignored = [ignored, ignoredPattern];
      } else {
        compiler.options.watchOptions.ignored = [ignoredPattern];
      }
    },

    rspack(compiler) {
      compiler.options.watchOptions = compiler.options.watchOptions || {};
      const ignored = compiler.options.watchOptions.ignored;
      const ignoredPattern = "**/.taserjs/**";

      if (Array.isArray(ignored)) {
        if (!ignored.includes(ignoredPattern)) {
          compiler.options.watchOptions.ignored = [...ignored, ignoredPattern];
        }
      } else if (ignored) {
        compiler.options.watchOptions.ignored = [ignored, ignoredPattern];
      } else {
        compiler.options.watchOptions.ignored = [ignoredPattern];
      }
    },
  };
});

export const taser = Object.assign(
  (options?: TaserPluginOptions) => taserPlugin.raw(options, {} as any),
  taserPlugin,
);
export default taserPlugin;
