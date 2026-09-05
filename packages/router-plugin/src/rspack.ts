import { taserUnplugin } from "./core/unplugin.js";
import type { TaserPluginOptions } from "./core/types.js";

export const taser = ((options: TaserPluginOptions = {}) => {
  const plugin = taserUnplugin.rspack(options);
  return Object.assign(plugin, {
    name: "taser",
    __taserOptions: options,
  });
}) as typeof taserUnplugin.rspack;

export default taser;
