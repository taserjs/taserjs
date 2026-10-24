import { setupTaserNitro } from "./nitro-setup.js";
import { taserPlugin, type TaserPluginOptions } from "./plugin.js";

/**
 * Taser Nitro module.
 *
 * Use as a Nitro module (`modules: [taser()]`) in `nitro.config.ts`,
 * or chain it as a rollup plugin.
 */
export function taser(options: TaserPluginOptions = {}) {
  return {
    ...taserPlugin.rollup(options),
    name: "taserjs:plugin",
    setup: (nitro: any) => setupTaserNitro(nitro, options),
  };
}

export default taser;
export type { TaserPluginOptions };
