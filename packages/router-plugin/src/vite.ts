import { taserUnplugin } from "./core/unplugin.js";

export const taser = taserUnplugin.vite;
export default taser;

export * from "./core/types.js";
export { VIRTUAL_APP_ID } from "./core/constants.js";
export { taserNitro } from "./nitro.js";
export { scaffoldRouteFile } from "@taserjs/router-generator";
