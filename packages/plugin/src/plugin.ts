import { realpathSync } from "node:fs";

import {
  executeGenerate,
  loadConfig,
  resolvePaths,
  type ResolvedTaserConfig,
  type TaserPaths,
} from "@taserjs/cli";
import { toNodeHandler } from "@taserjs/runtime/serve/node";
import { basename, dirname, isAbsolute, join, relative, resolve } from "pathe";
import { createUnplugin } from "unplugin";
import type { ViteDevServer } from "vite";

import { emitServeShim, relativeHostImport } from "./codegen.js";
import { detectHostServer, mountHost } from "./host.js";
import { setupTaserNitro } from "./nitro-setup.js";

export interface TaserPluginOptions {
  server?: boolean | undefined;
  serverEntry?: string | undefined;
  cwd?: string | undefined;
  config?: string | undefined;
  standalone?: boolean | undefined;
}

const FULL_STACK_PLUGIN_NAME =
  /nitro|tanstack.*start|tanstack:router|react-router|remix|astro|sveltekit|nuxt|solid-start|analog/i;
const NITRO_PLUGIN_NAME = /nitro/i;

/**
 * Whether the Vite config belongs to a full-stack framework that owns request handling.
 * `excludeNitro` answers the narrower question "is a framework wrapping Nitro?".
 */
export function detectFullStack(viteConfig: any, excludeNitro = false): boolean {
  if (!excludeNitro && viteConfig?.nitro) return true;

  return [viteConfig?.plugins].flat(Infinity).some((plugin: any) => {
    const name = plugin?.name;
    if (typeof name !== "string") return false;
    return FULL_STACK_PLUGIN_NAME.test(name) && !(excludeNitro && NITRO_PLUGIN_NAME.test(name));
  });
}

/** Plugin arrays may hold promises (`sveltekit()` returns `Promise<Plugin[]>`), which hide plugin names. */
async function settlePlugins(plugins: unknown): Promise<unknown[]> {
  return (await Promise.all([plugins].flat(Infinity))).flat(Infinity);
}

/** Precedence: plugin option, then `taserjs.config`, then "serve unless a framework owns the server". */
export function isServerMode({
  options,
  config,
  viteConfig,
}: {
  options: TaserPluginOptions;
  config: ResolvedTaserConfig;
  viteConfig?: unknown;
}): boolean {
  return options.server ?? config.server ?? !detectFullStack(viteConfig);
}

// Vite's module graph and the file watcher report realpaths; project paths may arrive via symlinks.
function toRealPath(path: string): string {
  const absolute = resolve(path);
  try {
    return realpathSync.native(absolute);
  } catch {
    // Deleted files have no realpath, but their directory still does.
    const parent = dirname(absolute);
    return parent === absolute ? absolute : join(toRealPath(parent), basename(absolute));
  }
}

function isInside(file: string, directoryOrFile: string): boolean {
  return [
    [resolve(file), resolve(directoryOrFile)],
    [toRealPath(file), toRealPath(directoryOrFile)],
  ].some(([child, parent]) => {
    const rel = relative(parent!, child!);
    return !rel.startsWith("..") && !isAbsolute(rel);
  });
}

/** Whether a changed file affects the generated manifest (and is not the manifest's own output). */
export function shouldRegenerate(file: string, paths: TaserPaths): boolean {
  if (isInside(file, paths.outputDir)) return false;
  return isInside(file, paths.routesDir) || isInside(file, paths.appFile);
}

// Requests Vite itself serves (HMR client, module graph, deps, `?import`-style queries).
const VITE_OWNED_URL =
  /^\/(?:@|__vite|__open-in-editor|node_modules\/)|[?&](?:import|raw|url|worker)\b/;

// A FetchableDevEnvironment answers through `dispatchFetch` and has no module runner to load routes in.
const isRunnableEnvironment = (environment: any): boolean =>
  !(typeof environment?.dispatchFetch === "function" && !environment.runner);

function invalidateManifest(server: ViteDevServer, manifestFile: string): void {
  const id = toRealPath(manifestFile);
  for (const environment of Object.values(server.environments)) {
    environment.moduleGraph.onFileChange(id);
  }
  server.ws.send({ type: "full-reload" });
}

export const taserPlugin = createUnplugin((options: TaserPluginOptions | undefined = {}, meta) => {
  let root = options.cwd ? resolve(options.cwd) : process.cwd();
  let project: Promise<{ config: ResolvedTaserConfig; paths: TaserPaths }> | undefined;
  let viteConfig: unknown;
  let viteServer: ViteDevServer | undefined;
  let devHandler: Promise<ReturnType<typeof toNodeHandler> | undefined> | undefined;
  let frameworkDetected = false;

  const loadProject = () =>
    (project ??= loadConfig(root, options.config).then((config) => ({
      config,
      paths: resolvePaths(config, root),
    })));

  const setRoot = (nextRoot: string) => {
    root = nextRoot;
    project = undefined;
  };

  async function regenerate(isDev: boolean): Promise<void> {
    try {
      const { config, paths } = await loadProject();
      executeGenerate({ cwd: root, config, scaffold: isDev });
      devHandler = undefined;
      if (viteServer) invalidateManifest(viteServer, paths.manifestFile);
    } catch (error) {
      if (!isDev) throw error;
      console.error(`[taserjs] Route generation warning: ${(error as Error).message}`);
    }
  }

  async function regenerateIfAffected(file: string): Promise<void> {
    const { paths } = await loadProject();
    if (shouldRegenerate(file, paths)) await regenerate(true);
  }

  async function emitShim(): Promise<string> {
    const { config, paths } = await loadProject();
    const shimPath = join(paths.outputDir, "serve.ts");
    const host = detectHostServer(paths.serverDir, root, options.serverEntry);
    emitServeShim(
      shimPath,
      `./routes.gen${config.importExt}`,
      relativeHostImport(host, paths.outputDir, config.importExt),
    );
    return shimPath;
  }

  async function createDevHandler(server: ViteDevServer) {
    const { paths } = await loadProject();
    const manifest = await server.ssrLoadModule(paths.manifestFile);
    const app = manifest.createApp();
    if (typeof app?.fetch !== "function") return undefined;

    const host = detectHostServer(paths.serverDir, root, options.serverEntry);
    if (host) mountHost(app, await server.ssrLoadModule(host.path), host.type);

    return toNodeHandler((request: Request) => app.fetch(request));
  }

  const nitroHook = {
    setup(nitro: any) {
      frameworkDetected ||=
        detectFullStack(nitro.options?._viteConfig, true) ||
        detectFullStack({ plugins: nitro.options?.modules }, true);

      return setupTaserNitro(nitro, {
        ...options,
        standalone: options.standalone ?? !frameworkDetected,
      });
    },
  };

  return {
    name: "taserjs:plugin",

    async buildStart() {
      await regenerate(meta.framework === "vite");

      const { config } = await loadProject();
      if (isServerMode({ options, config, viteConfig })) await emitShim();
    },

    async watchChange(file) {
      // Under Vite, `configureServer` already listens to the dev server watcher.
      if (!viteServer) await regenerateIfAffected(file);
    },

    vite: {
      nitro: nitroHook,

      async config(userConfig: any, env?: { command: string }) {
        if (!options.cwd && userConfig.root) setRoot(resolve(userConfig.root));
        viteConfig = { ...userConfig, plugins: await settlePlugins(userConfig.plugins) };
        frameworkDetected ||= detectFullStack(viteConfig, true);

        if (env?.command !== "build") return;
        const { config } = await loadProject();
        if (!isServerMode({ options, config, viteConfig })) return;

        return {
          build: {
            ssr: await emitShim(),
            rollupOptions: {
              external: ["@taserjs/runtime", /^@taserjs\/runtime\/.*/],
              output: { entryFileNames: "serve.mjs" },
            },
          },
        };
      },

      configResolved(resolvedConfig: unknown) {
        viteConfig = resolvedConfig;
        frameworkDetected ||= detectFullStack(resolvedConfig, true);
      },

      async configureServer(server: ViteDevServer) {
        viteServer = server;

        const onFileEvent = async (file: string) => {
          devHandler = undefined;
          await regenerateIfAffected(file);
        };
        for (const event of ["add", "unlink", "change", "addDir", "unlinkDir"]) {
          server.watcher.on(event, onFileEvent);
        }

        const { config, paths } = await loadProject();
        // Vite only watches its own root, but frameworks like Nuxt run it in a subdirectory.
        server.watcher.add([paths.routesDir, paths.appFile]);
        if (!isServerMode({ options, config, viteConfig: server.config })) return;

        server.middlewares.use(async (req, res, next) => {
          if (
            !req.url ||
            VITE_OWNED_URL.test(req.url) ||
            !isRunnableEnvironment(server.environments.ssr)
          ) {
            return next();
          }

          try {
            devHandler ??= createDevHandler(server);
            const handle = await devHandler;
            if (handle) await handle(req as any, res as any);
            else next();
          } catch (error) {
            devHandler = undefined;
            server.ssrFixStacktrace(error as Error);
            next(error);
          }
        });
      },
    } as any,
  };
});
