import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  walkRouteFiles,
  scaffoldRouteFile,
  scanAndBuildModel,
  writeTaserTypes,
  taserConfigSchema,
  resolveServerDir,
  resolveRoutesDir,
} from "@taserjs/router-generator";
import { resolveAppConfig } from "./resolve-app-config.js";

export async function runGenerate(argv: Record<string, any>): Promise<void> {
  const rootDir = resolve((argv.dir as string) || process.cwd());
  const appConfig = await resolveAppConfig(rootDir);
  const explicitRoutes = (argv.routesDir || argv.routes) as string | undefined;

  console.log(`[taser] generate · config source: ${appConfig.source}`);

  const resolved = taserConfigSchema.parse({
    ...appConfig.taser,
    ...(explicitRoutes ? { routesDir: explicitRoutes } : {}),
  });
  const serverDir = resolveServerDir(rootDir, resolved.serverDir);
  const routesDir = resolveRoutesDir(rootDir, serverDir, resolved.routesDir);

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
  });

  if (didWrite) {
    console.log("✔ Types generated at .taser/types/routes.d.ts");
  } else {
    console.log("ℹ Types are already up to date at .taser/types/routes.d.ts");
  }
}
