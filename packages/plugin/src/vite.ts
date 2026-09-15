import {
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
  const plugin = taserPlugin.vite(options) as VitePluginReturn;
  plugin.nitro = {
    setup: (nitro: any) => setupTaserNitro(nitro, options),
  };
  return plugin;
};

export default taser;
export {
  detectHostServer,
  emitServeShim,
  mountHostFallback,
  resolveHostFetchHandler,
  type HostServerInfo,
  type TaserPluginOptions,
};
