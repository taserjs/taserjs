import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { collectBootBindings, resolveAddons } from "../addons/registry.js";
import { nitroConfigTemplate, taserTsTemplate, viteConfigTemplate } from "../frameworks/index.js";
import { installPackages, resolveUserAgent } from "./package-manager.js";
import { writeProjectConfig } from "./project-config.js";
import { resolvePackages } from "./resolve-packages.js";
import { resolveDeployEntry, validateCombination } from "./targets.js";
import { FRAMEWORK_ENTRIES } from "../frameworks/index.js";
import type { ScaffoldContext, ScaffoldOptions, ScaffoldResult } from "./types.js";
import {
  contextTemplate,
  gitignoreTemplate,
  healthRouteTemplate,
  indexRouteTemplate,
  packageJsonTemplate,
  rootLayoutTemplate,
  tsconfigTemplate,
} from "../templates/base.js";

async function write(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const root = options.targetDir;
  const preset = options.preset ?? "node-server";
  const framework = options.framework ?? "none";

  // Guards direct/library callers; the CLI path is validated earlier in
  // resolveScaffoldDefaults. Throws with a precise reason on impossible
  // runtime × framework × deploy combinations.
  const combination = validateCombination(options.runtime, framework, preset);
  if (!combination.ok) {
    throw new Error(combination.reason);
  }

  const ctx: ScaffoldContext = {
    projectName: options.projectName,
    targetDir: root,
    framework,
    preset,
    ...(options.runtime !== undefined ? { runtime: options.runtime } : {}),
    ...(options.db ? { db: options.db, driver: options.driver } : {}),
    ...(options.logger ? { logger: options.logger } : {}),
    ...(options.validator ? { validator: options.validator } : {}),
  };

  const addons = resolveAddons(ctx);
  const packages = resolvePackages(ctx);
  const bootBindings = collectBootBindings(ctx);
  const frameworkEntry = FRAMEWORK_ENTRIES[framework];
  const { entry: deployEntry } = resolveDeployEntry(ctx.preset ?? "node-server");

  await write(
    path.join(root, "package.json"),
    packageJsonTemplate(options.projectName, packages.scripts),
  );
  await write(path.join(root, "tsconfig.json"), tsconfigTemplate());
  await write(path.join(root, "vite.config.ts"), viteConfigTemplate(ctx.preset));
  await write(path.join(root, ".gitignore"), gitignoreTemplate());
  await write(path.join(root, "src/context.ts"), contextTemplate(bootBindings));
  await write(path.join(root, "src/taser.ts"), taserTsTemplate());
  await write(path.join(root, "src/routes/$.ts"), rootLayoutTemplate());
  await write(path.join(root, "src/routes/index.get.ts"), indexRouteTemplate());
  await write(path.join(root, "src/routes/health.get.ts"), healthRouteTemplate(ctx));

  // Nitro's default preset is node-server — only emit an explicit config when
  // the deployment target differs. Do not emit for preset "none".
  if (ctx.preset !== "node-server" && ctx.preset !== "none") {
    await write(path.join(root, "nitro.config.ts"), nitroConfigTemplate(deployEntry.id));
  }

  await Promise.all(
    deployEntry.files.map((file) =>
      write(
        path.join(root, file.name),
        typeof file.content === "function"
          ? file.content({ projectName: options.projectName })
          : file.content,
      ),
    ),
  );

  const serverEntry = frameworkEntry.serverEntry;
  if (serverEntry) {
    await write(path.join(root, serverEntry.fileName), serverEntry.content);
  }

  await Promise.all(
    addons.map(async (addon) => {
      await addon.apply(ctx, (filePath, contents) => write(path.join(root, filePath), contents));
    }),
  );

  try {
    await copyFile(path.join(root, ".env.example"), path.join(root, ".env"));
  } catch {
    // .env.example was not created
  }

  await writeProjectConfig(root, ctx);

  if (options.skipInstall) {
    return ctx as ScaffoldResult;
  }

  const agent = options.agent ?? resolveUserAgent();
  await installPackages(agent, root, {
    dependencies: packages.dependencies,
    devDependencies: packages.devDependencies,
  });

  return ctx as ScaffoldResult;
}
