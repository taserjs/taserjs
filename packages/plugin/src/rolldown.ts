import { taserPlugin, type TaserPluginOptions } from "./index.js";

export const taser = taserPlugin.rolldown as typeof taserPlugin.rollup;
export default taser;
export type { TaserPluginOptions };
