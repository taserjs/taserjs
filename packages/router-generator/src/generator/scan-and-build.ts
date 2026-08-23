import type { ExtensionOption } from "../config/schema.js";
import { DEFAULT_IGNORE } from "../constants.js";
import { FileIndex } from "../fs/file-index.js";
import { buildGeneratedModelFromScan } from "../model/build-model.js";
import { scanRouteFiles } from "../scan/scan-routes.js";
import type { AnalysisCache } from "../scan/analysis-cache.js";
import { toPosixPath } from "../support/paths.js";
import type { GeneratedModel } from "../types/index.js";

export type ScanAndBuildOptions = {
  routesDir: string;
  routesImportBase?: string;
  extension?: ExtensionOption;
  validate?: boolean;
  ignore?: readonly string[];
  /** Stat-keyed parse cache; pass a shared instance across rebuilds to skip re-parsing unchanged files. */
  cache?: AnalysisCache | undefined;
};

/**
 * Walk the routes directory, analyze route/layout sources, and assemble the
 * generated model. Pure read path: never writes to the user's source tree —
 * scaffolding belongs to explicit entry points (CLI `generate`, watcher `add`).
 */
export async function scanAndBuildModel(options: ScanAndBuildOptions): Promise<GeneratedModel> {
  const routesDir = options.routesDir;
  const routesImportBase = options.routesImportBase
    ? toPosixPath(options.routesImportBase)
    : toPosixPath(routesDir);

  const ignore = options.ignore ?? DEFAULT_IGNORE;

  const fileIndex = await FileIndex.fromDirectory(routesDir, { ignore });

  const scan = await scanRouteFiles(routesDir, routesImportBase, fileIndex.getAbsolutePaths(), {
    extension: options.extension ?? false,
    validate: options.validate ?? true,
    cache: options.cache,
  });

  return buildGeneratedModelFromScan(scan);
}
