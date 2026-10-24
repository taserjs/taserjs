import { taserPlugin, type TaserPluginOptions } from "./plugin.js";

export const taser = taserPlugin.rspack;
export default taser;
export type { TaserPluginOptions };
