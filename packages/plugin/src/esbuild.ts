import { taserPlugin, type TaserPluginOptions } from "./plugin.js";

export const taser = taserPlugin.esbuild;
export default taser;
export type { TaserPluginOptions };
