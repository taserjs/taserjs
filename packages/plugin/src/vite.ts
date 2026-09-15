import {
  detectFullStack,
  detectHostServer,
  emitServeShim,
  mountHostFallback,
  resolveHostFetchHandler,
  taserPlugin,
  type HostServerInfo,
  type TaserPluginOptions,
} from "./index.js";
import { setupTaserNitro } from "./nitro.js";

export type VitePluginReturn = ReturnType<typeof taserPlugin.vite> & {
  nitro?: {
    setup: (nitro: any) => Promise<void> | void;
  };
};

export const taser: (options?: TaserPluginOptions) => VitePluginReturn = (
  options?: TaserPluginOptions,
) => {
  let isFrameworkEnvironment = false;
  const rawPlugin = taserPlugin.vite(options);
  const plugin = (Array.isArray(rawPlugin) ? rawPlugin[0] : rawPlugin) as any;

  const checkFramework = (cfg?: any) => {
    if (detectFullStack(cfg, true)) {
      isFrameworkEnvironment = true;
    }
  };

  const originalConfig = plugin.config;
  plugin.config = async function (this: any, config: any, env: any) {
    checkFramework(config);
    if (typeof originalConfig === "function") {
      return originalConfig.call(this, config, env);
    }
  };

  const originalConfigResolved = plugin.configResolved;
  plugin.configResolved = async function (this: any, resolvedConfig: any) {
    checkFramework(resolvedConfig);
    if (typeof originalConfigResolved === "function") {
      return originalConfigResolved.call(this, resolvedConfig);
    }
  };

  const nitroModule = {
    setup: (nitro: any) => {
      if (!isFrameworkEnvironment) {
        checkFramework(nitro.options?._viteConfig);
        checkFramework({ plugins: nitro.options?.modules });
      }
      const standalone =
        options?.standalone !== undefined ? options.standalone : !isFrameworkEnvironment;

      return setupTaserNitro(nitro, {
        ...options,
        standalone,
      });
    },
  };

  plugin.nitro = nitroModule;
  if (Array.isArray(rawPlugin)) {
    (rawPlugin as any).nitro = nitroModule;
  }

  return rawPlugin as VitePluginReturn;
};

export default taser;
export {
  detectFullStack,
  detectHostServer,
  emitServeShim,
  mountHostFallback,
  resolveHostFetchHandler,
  type HostServerInfo,
  type TaserPluginOptions,
};
