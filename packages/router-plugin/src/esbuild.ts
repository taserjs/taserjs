import { taserUnplugin } from "./core/unplugin.js";
import type { TaserPluginOptions } from "./core/types.js";

export const taser = ((options: TaserPluginOptions = {}) => {
  const plugin = taserUnplugin.esbuild(options);
  return Object.assign(plugin, {
    name: "taser",
    __taserOptions: options,
  });
}) as typeof taserUnplugin.esbuild;

export default taser;
