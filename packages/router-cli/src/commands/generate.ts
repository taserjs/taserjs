import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  FileIndex,
  scaffoldRouteFile,
  scanAndBuildModel,
  AnalysisCache,
  resolveRoutesDir,
  resolveServerDir,
  resolveTaserEntry,
} from "@taserjs/router-generator";
import { writeTaserTypes, type TypeWriterState } from "@taserjs/router-plugin/writer";
import { ROUTES_ALIAS_ID } from "@taserjs/router-plugin/aliases";
import { resolveAppConfig } from "./resolve-app-config.js";

export async function runGenerate(argv: Record<string, any>): Promise<void> {
  const rootDir = resolve((argv.dir as string) || process.cwd());

  const appConfig = await resolveAppConfig(rootDir);
  const taserOptions = appConfig.taser;
  const serverDir = resolveServerDir(rootDir, taserOptions.serverDir);

  const explicitRoutes = (argv.routesDir || argv.routes) as string | undefined;
  const routesDir = explicitRoutes
    ? resolve(rootDir, explicitRoutes)
    : resolveRoutesDir(rootDir, serverDir, appConfig.routesDir);

  const entry = resolveTaserEntry(rootDir, serverDir, taserOptions.entry);

  const ignore = appConfig.ignore;
  const extension = taserOptions.extension ?? true;
  const validate = taserOptions.validate ?? true;

  console.log(`[taser] generate · config source: ${appConfig.source}`);

  // Explicit user-invoked write path: fill blank route/layout files first.
  if (existsSync(routesDir)) {
    const fileIndex = await FileIndex.fromDirectory(routesDir, { ignore });
    for (const filePath of fileIndex.getAbsolutePaths()) {
      try {
        // oxlint-disable-next-line no-await-in-loop
        await scaffoldRouteFile(routesDir, filePath, { entry, ignore });
      } catch {
        // Unreadable/unclassifiable files are reported by the scan below.
      }
    }
  }

  const model = await scanAndBuildModel({
    routesDir,
    // Alias base keeps generated specifiers portable; the writer rebases them
    // onto typesDir-relative paths for the emitted d.ts.
    routesImportBase: ROUTES_ALIAS_ID,
    extension,
    validate,
    cache: new AnalysisCache(),
    ignore,
  });

  const writerState: TypeWriterState = {};
  const written = await writeTaserTypes(model, {
    rootDir,
    quotes: taserOptions.quotes,
    header: taserOptions.header,
    routesDir,
    state: writerState,
  });

  if (written) {
    console.log("✔ Types generated at .taser/types/routes.d.ts");
  } else {
    console.log("✔ Types up to date");
  }
}
