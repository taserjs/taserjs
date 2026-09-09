import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { collectBootBindings, resolveAddons } from "../addons/registry.js";
import { installPackages, resolveUserAgent } from "./package-manager.js";
import { resolveDeployEntry, validateCombination } from "./targets.js";
import type { ScaffoldOptions, ScaffoldResult } from "./types.js";
import {
  contextTemplate,
  gitignoreTemplate,
  indexRouteTemplate,
  nitroConfigTemplate,
  packageJsonTemplate,
  rootLayoutTemplate,
  staticRoutesGenTemplate,
  taserConfigTemplate,
  taserTsTemplate,
  tsconfigTemplate,
  viteConfigTemplate,
} from "../templates/base.js";

async function write(filePath: string, contents: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents.trimStart(), "utf-8");
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const root = options.targetDir;
  const preset = options.preset ?? "none";

  const combination = validateCombination(options.runtime, preset);
  if (!combination.ok) {
    throw new Error(combination.reason);
  }

  const writtenFiles: string[] = [];
  const trackedWrite = async (relPath: string, contents: string) => {
    const fullPath = join(root, relPath);
    await write(fullPath, contents);
    writtenFiles.push(relPath);
  };

  const addons = resolveAddons(options);
  const bootBindings = collectBootBindings(options);
  const { entry: deployEntry } = resolveDeployEntry(preset);

  // Collect scripts & dependencies
  const scripts: Record<string, string> = {};
  if (deployEntry.startScript) {
    scripts.start = deployEntry.startScript;
  }

  const dependencies: string[] = ["@taserjs/router", "@taserjs/runtime"];
  const devDependencies: string[] = ["@taserjs/cli", "@taserjs/plugin", "typescript", "vite"];

  for (const dep of deployEntry.devDeps) {
    devDependencies.push(dep);
  }

  for (const addon of addons) {
    dependencies.push(...addon.dependencies(options));
    devDependencies.push(...addon.devDependencies(options));
    if (addon.scripts) {
      Object.assign(scripts, addon.scripts(options));
    }
  }

  // Override versions from packageVersions if provided
  const formatDep = (pkg: string): string => {
    const ver = options.packageVersions?.[pkg];
    return ver ? `${pkg}@${ver}` : pkg;
  };

  const resolvedDeps = [...new Set(dependencies)].map(formatDep);
  const resolvedDevDeps = [...new Set(devDependencies)].map(formatDep);

  // 1. package.json
  await trackedWrite(
    "package.json",
    packageJsonTemplate(options.projectName, scripts),
  );

  // 2. tsconfig.json
  await trackedWrite("tsconfig.json", tsconfigTemplate());

  // 3. .gitignore
  await trackedWrite(".gitignore", gitignoreTemplate());

  // 4. taserjs.config.ts
  await trackedWrite("taserjs.config.ts", taserConfigTemplate());

  // 5. vite.config.ts
  await trackedWrite("vite.config.ts", viteConfigTemplate(preset));

  // 6. nitro.config.ts (if preset is selected)
  if (preset !== "none") {
    await trackedWrite("nitro.config.ts", nitroConfigTemplate(preset));
  }

  // 7. Platform files (e.g. wrangler.jsonc)
  await Promise.all(
    deployEntry.files.map(async (file) => {
      const content =
        typeof file.content === "function"
          ? file.content({ projectName: options.projectName })
          : file.content;
      await trackedWrite(file.name, content);
    }),
  );

  // 8. src/context.ts
  await trackedWrite("src/context.ts", contextTemplate(bootBindings));

  // 9. src/taser.ts
  await trackedWrite("src/taser.ts", taserTsTemplate());

  // 10. Routes: src/routes/index.get.ts & src/routes/$.ts
  await trackedWrite("src/routes/index.get.ts", indexRouteTemplate());
  await trackedWrite("src/routes/$.ts", rootLayoutTemplate());

  // 12. Apply Addons (custom routes, db schemas, configs)
  await Promise.all(
    addons.map(async (addon) => {
      await addon.apply(options, async (relPath, contents) => {
        await trackedWrite(relPath, contents);
      });
    }),
  );

  // 13. Static routes.gen.ts starter manifest
  await trackedWrite("src/.taserjs/routes.gen.ts", staticRoutesGenTemplate());

  // Install dependencies if not skipped
  if (!options.skipInstall) {
    const agent = options.agent ?? resolveUserAgent();
    await installPackages(agent, root, {
      dependencies: resolvedDeps,
      devDependencies: resolvedDevDeps,
    });
  }

  return {
    ...options,
    files: writtenFiles,
  };
}
