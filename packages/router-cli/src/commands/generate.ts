import { loadOptions } from "nitro/builder";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  FileIndex,
  scaffoldRouteFile,
  scanAndBuildModel,
  AnalysisCache,
  DEFAULT_IGNORE,
  taserOptionsSchema,
} from "@taserjs/router-generator";
import { writeTaserTypes } from "@taserjs/vite-plugin/writer";
import { resolveRoutesDir } from "@taserjs/vite-plugin";

export async function runGenerate(argv: Record<string, any>): Promise<void> {
  const rootDir = resolve((argv.dir as string) || process.cwd());
  const nitroOptions = await loadOptions({ rootDir, dev: false });

  const explicitRoutes = (argv.routesDir || argv.routes) as string | undefined;
  const routesDir = explicitRoutes
    ? resolve(rootDir, explicitRoutes)
    : nitroOptions.routesDir
      ? resolve(rootDir, nitroOptions.routesDir)
      : resolveRoutesDir(rootDir);

  const nitroIgnore = (nitroOptions.ignore || []) as string[];
  const ignore = Array.from(new Set([...nitroIgnore, ...DEFAULT_IGNORE]));

  const taserOptions = taserOptionsSchema.parse((nitroOptions as any).taser || {});

  // Explicit user-invoked write path: fill blank route/layout files first.
  if (existsSync(routesDir)) {
    const fileIndex = await FileIndex.fromDirectory(routesDir, { ignore });
    for (const filePath of fileIndex.getAbsolutePaths()) {
      try {
        // oxlint-disable-next-line no-await-in-loop
        await scaffoldRouteFile(routesDir, filePath, { entry: taserOptions.entry, ignore });
      } catch {
        // Unreadable/unclassifiable files are reported by the scan below.
      }
    }
  }

  const model = await scanAndBuildModel({
    routesDir,
    routesImportBase: routesDir,
    extension: taserOptions.extension,
    validate: taserOptions.validate,
    cache: new AnalysisCache(),
    ignore,
  });

  const written = await writeTaserTypes(model, {
    rootDir,
    quotes: taserOptions.quotes,
    header: taserOptions.header,
  });

  if (written) {
    console.log("✔ Types generated at .taser/types/routes.d.ts");
  } else {
    console.log("✔ Types up to date");
  }
}
