import { taserPlugin, type TaserPluginOptions } from "./plugin.js";

type VitePlugin = ReturnType<typeof taserPlugin.vite>;

/** The Vite plugin also carries the Nitro hook that Nitro's Vite integration looks for. */
export const taser = taserPlugin.vite as (options?: TaserPluginOptions) => VitePlugin & {
  nitro: { setup: (nitro: any) => Promise<void> | void };
};

export default taser;
export type { TaserPluginOptions };
