import { taserPlugin, type TaserPluginOptions } from "./plugin.js";

export const taser = taserPlugin.rollup;
export default taser;
export type { TaserPluginOptions };
