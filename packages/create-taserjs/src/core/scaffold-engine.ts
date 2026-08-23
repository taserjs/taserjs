import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { collectBootBindings, resolveAddons } from "../addons/registry.js";
import { nitroConfigTemplate, serverEntryTemplate, taserTsTemplate } from "../frameworks/index.js";
import { installPackages, resolveUserAgent } from "./package-manager.js";
import { writeProjectConfig } from "./project-config.js";
import { resolvePackages } from "./resolve-packages.js";
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
  const preset = options.preset ?? "node";
  const bare = options.bare;

  const ctx: ScaffoldContext = {
    projectName: options.projectName,
    targetDir: root,
    preset,
    ...(options.db ? { db: options.db, driver: options.driver } : {}),
    ...(options.logger ? { logger: options.logger } : {}),
    ...(options.validator ? { validator: options.validator } : {}),
    ...(bare !== undefined ? { bare } : {}),
  };

  const addons = resolveAddons(ctx);
  const packages = resolvePackages(ctx);
  const bootBindings = collectBootBindings(ctx);

  await write(
    path.join(root, "package.json"),
    packageJsonTemplate(options.projectName, packages.scripts),
  );
  await write(path.join(root, "tsconfig.json"), tsconfigTemplate());
  await write(path.join(root, ".gitignore"), gitignoreTemplate());
  await write(path.join(root, "src/context.ts"), contextTemplate(bootBindings));
  await write(path.join(root, "src/taser.ts"), taserTsTemplate(preset));
  await write(path.join(root, "src/routes/$.ts"), rootLayoutTemplate());
  await write(path.join(root, "src/routes/index.get.ts"), indexRouteTemplate());
  await write(path.join(root, "src/routes/health.get.ts"), healthRouteTemplate(ctx));

  const serverEntry = serverEntryTemplate(preset);
  if (serverEntry) {
    await write(path.join(root, serverEntry.fileName), serverEntry.content);
  }

  if (bare) {
    await write(path.join(root, "nitro.config.ts"), nitroConfigTemplate(preset));
  }

  if (preset === "cloudflare-workers") {
    await write(
      path.join(root, "wrangler.jsonc"),
      JSON.stringify(
        {
          $schema: "node_modules/wrangler/config-schema.json",
          name: options.projectName,
          main: "src/index.ts",
          compatibility_date: "2024-11-01",
        },
        null,
        2,
      ) + "\n",
    );
  }

  if (preset === "vercel") {
    await write(
      path.join(root, "vercel.json"),
      JSON.stringify(
        {
          rewrites: [{ source: "/(.*)", destination: "/src/index.ts" }],
        },
        null,
        2,
      ) + "\n",
    );
  }

  if (preset === "azure-functions") {
    await write(
      path.join(root, "host.json"),
      JSON.stringify(
        {
          version: "2.0",
          logging: {
            applicationInsights: {
              samplingSettings: {
                isEnabled: true,
                excludedTypes: "Request",
              },
            },
          },
          extensionBundle: {
            id: "Microsoft.Azure.Functions.ExtensionBundle",
            version: "[4.*, 5.0.0)",
          },
          extensions: {
            http: {
              routePrefix: "",
            },
          },
        },
        null,
        2,
      ) + "\n",
    );
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
