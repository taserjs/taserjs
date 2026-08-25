/**
 * Framework-neutral core of @taserjs/router-plugin.
 *
 * Host adapters live behind explicit subpaths:
 * - `@taserjs/router-plugin/vite`
 * - `@taserjs/router-plugin/next`
 *
 * This entry re-exports the shared codegen, type-writing, alias, and virtual
 * context pieces that every adapter (and router-cli) builds on.
 */
export * from "./types.js";
export { scaffoldRouteFile } from "@taserjs/router-generator";
export { writeTaserTypes, type TypeWriterState } from "./writer.js";
export { ROUTES_ALIAS_ID, ENTRY_ALIAS_ID, SERVER_ENTRY_ALIAS_ID } from "./aliases.js";
export {
  VIRTUAL_MANIFEST_ID,
  RESOLVED_VIRTUAL_MANIFEST_ID,
  VIRTUAL_ENTRY_ID,
  RESOLVED_VIRTUAL_ENTRY_ID,
  VIRTUAL_APP_ID,
  RESOLVED_VIRTUAL_APP_ID,
  createTaserVirtualContext,
} from "./core/context.js";
export { writeDiskArtifacts, DISK_APP_PATH, DISK_MANIFEST_PATH } from "./core/emitter.js";
