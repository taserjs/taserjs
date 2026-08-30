import { taserUnplugin, unpluginFactory } from "./core/unplugin.js";

export * from "./core/types.js";
export {
  scaffoldRouteFile,
  writeTaserTypes,
  type TypeWriterState,
} from "@taserjs/router-generator";
export {
  ROUTES_ALIAS_ID,
  SERVER_ENTRY_ALIAS_ID,
  VIRTUAL_MANIFEST_ID,
  RESOLVED_VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
  RESOLVED_VIRTUAL_ENTRY_ID,
  VIRTUAL_APP_ID,
  RESOLVED_VIRTUAL_APP_ID,
  DISK_APP_PATH,
  DISK_MANIFEST_PATH,
  DISK_ENTRY_PATH,
  DISK_ARTIFACT_DIR,
} from "./core/constants.js";
export { createTaserVirtualContext, watchAndSyncRoutes } from "./core/context.js";
export { writeDiskArtifacts } from "./core/emitter.js";
export { getComposedAppCode, getServeShimCode } from "./core/compose.js";
export { taserUnplugin, unpluginFactory };
export const unplugin = taserUnplugin;
export default taserUnplugin;
