import {
  detectHostServer,
  emitServeShim,
  mountHostFallback,
  resolveHostFetchHandler,
  taserPlugin,
  type HostServerInfo,
  type TaserPluginOptions,
} from "./index.js";

export const taser = taserPlugin.vite;
export default taserPlugin.vite;
export {
  detectHostServer,
  emitServeShim,
  mountHostFallback,
  resolveHostFetchHandler,
  type HostServerInfo,
  type TaserPluginOptions,
};

