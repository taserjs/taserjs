import { existsSync } from "node:fs";
import {
  walkRouteFiles,
  scaffoldRouteFile,
  scanAndBuildModel,
  writeTaserTypes,
  resolveServerDir,
  resolveRoutesDir,
  resolveTaserEntryPath,
} from "@taserjs/router-generator";
import { resolveAppConfig } from "./resolve-app-config.js";

export async function runGenerate(argv: { config?: string | undefined }): Promise<void> {
  const appConfig = await resolveAppConfig(argv.config);
  const rootDir = appConfig.rootDir;

  console.log(`[taserjs] generate · config source: ${appConfig.source}`);

  const resolved = appConfig.taser;
  const serverDir = resolveServerDir(rootDir, resolved.serverDir);
  const routesDir = resolveRoutesDir(rootDir, serverDir, resolved.routesDir);
  const taserEntryPath = resolveTaserEntryPath(rootDir, serverDir, resolved.entry);

  if (existsSync(routesDir)) {
    const files = await walkRouteFiles(routesDir, resolved.ignore);
    await Promise.all(
      files.map(async (filePath) => {
        try {
          await scaffoldRouteFile(routesDir, filePath, {
            entry: resolved.entry,
            ignore: resolved.ignore,
          });
        } catch {
          // Non-empty or non-matching files are skipped quietly
        }
      }),
    );
  }

  const model = await scanAndBuildModel({
    routesDir,
    extension: resolved.formatting.extension,
    ignore: resolved.ignore,
  });

  const didWrite = await writeTaserTypes(model, {
    rootDir,
    quotes: resolved.formatting.quotes,
    header: resolved.formatting.header,
    routesDir,
    taserEntryPath,
  });

  if (didWrite) {
    console.log("✔ Types generated at .taser/types/routes.d.ts");
  } else {
    console.log("ℹ Types are already up to date at .taser/types/routes.d.ts");
  }
}
