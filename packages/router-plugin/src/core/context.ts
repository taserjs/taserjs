import { resolve } from "pathe";
import {
  AnalysisCache,
  scanAndBuildModel,
  emitVirtualManifestSource,
  emitVirtualEntrySource,
  taserOptionsSchema,
  DEFAULT_IGNORE,
  resolveServerDir,
  resolveTaserEntry,
  resolveRoutesDir,
  resolveServerEntry,
  type GeneratedModel,
} from "@taserjs/router-generator";
import type { TaserUserConfig, TaserVirtualContext } from "../types.js";
import { writeTaserTypes, type TypeWriterState } from "../writer.js";
import { ROUTES_ALIAS_ID, ENTRY_ALIAS_ID } from "../aliases.js";

export const VIRTUAL_MANIFEST_ID = "#taserjs/virtual/manifest";
export const RESOLVED_VIRTUAL_MANIFEST_ID = "\0" + VIRTUAL_MANIFEST_ID;

export const VIRTUAL_ENTRY_ID = "#taserjs/virtual/entry";
export const RESOLVED_VIRTUAL_ENTRY_ID = "\0" + VIRTUAL_ENTRY_ID;

export const VIRTUAL_APP_ID = "#taserjs/virtual/app";
export const RESOLVED_VIRTUAL_APP_ID = "\0" + VIRTUAL_APP_ID;

/**
 * Creates the shared VirtualContext that manages model scanning,
 * AnalysisCache, virtual manifest/entry generation, and type generation.
 */
export function createTaserVirtualContext(options: TaserUserConfig = {}): TaserVirtualContext {
  const rootDir = resolve(options.rootDir || process.cwd());
  const parsedOptions = taserOptionsSchema.parse(options);
  const serverDir = resolveServerDir(rootDir, options.serverDir);
  const entryPath = resolveTaserEntry(rootDir, serverDir, options.entry);
  const serverEntryPath = resolveServerEntry(rootDir, serverDir, options.serverEntry);
  const routesDir = resolveRoutesDir(rootDir, serverDir, options.routesDir);
  const ignore = options.ignore && options.ignore.length > 0 ? options.ignore : [...DEFAULT_IGNORE];
  const basePath = options.basePath;

  let cachedModel: GeneratedModel | undefined;
  let cachedManifestCode: string | undefined;
  let cachedEntryCode: string | undefined;
  const analysisCache = new AnalysisCache();
  const typeWriterState: TypeWriterState = {};

  async function getModel(): Promise<GeneratedModel> {
    if (cachedModel) {
      return cachedModel;
    }
    cachedModel = await scanAndBuildModel({
      routesDir,
      // Bundler-facing alias; resolved to the real routes dir by the Nitro
      // module or the Vite plugin. Never leaks absolute paths into artifacts.
      routesImportBase: ROUTES_ALIAS_ID,
      extension: parsedOptions.extension,
      validate: parsedOptions.validate,
      cache: analysisCache,
      ignore,
    });
    return cachedModel;
  }

  function invalidate() {
    cachedModel = undefined;
    cachedManifestCode = undefined;
    cachedEntryCode = undefined;
  }

  async function getManifestCode(): Promise<string> {
    if (cachedManifestCode) {
      return cachedManifestCode;
    }
    const model = await getModel();
    cachedManifestCode = emitVirtualManifestSource(model, {
      header: parsedOptions.header,
      footer: [],
      quotes: parsedOptions.quotes,
    });
    return cachedManifestCode;
  }

  async function getEntryCode(): Promise<string> {
    if (cachedEntryCode) {
      return cachedEntryCode;
    }
    // Alias, not an absolute path: the host integration resolves it to entryPath.
    cachedEntryCode = emitVirtualEntrySource({
      taserAppImportPath: ENTRY_ALIAS_ID,
      ...(basePath !== undefined ? { basePath } : {}),
    });
    return cachedEntryCode;
  }

  async function writeTypes(): Promise<boolean> {
    const model = await getModel();
    return writeTaserTypes(model, {
      rootDir,
      quotes: parsedOptions.quotes,
      header: parsedOptions.header,
      routesDir,
      state: typeWriterState,
    });
  }

  return {
    rootDir,
    serverDir,
    routesDir,
    entryPath,
    serverEntryPath,
    basePath,
    ignore,
    options: parsedOptions,
    analysisCache,
    getManifestCode,
    getEntryCode,
    invalidate,
    writeTypes,
  };
}
