import { resolveAddons } from "../addons/registry.js";
import type { PackageGroups, ProjectType, ScaffoldContext } from "../core/types.js";

function typePackages(type: ProjectType): PackageGroups {
  const dependencies = ["@taserjs/router", "dotenv"];
  const devDependencies = [
    "@taserjs/router-cli",
    "npm-run-all2",
    "tsdown",
    "tsx",
    "typescript@^5.9.3",
    "@types/node",
  ];
  const scripts: Record<string, string> = {};

  switch (type) {
    case "express":
      dependencies.push("@taserjs/adapter-express", "express");
      devDependencies.push("@types/express");
      break;
    case "fastify":
      dependencies.push("@taserjs/adapter-fastify", "fastify");
      break;
    case "hono":
      dependencies.push("@hono/node-server", "hono");
      break;
    case "bun":
      // Bun has native TypeScript and runtime execution
      devDependencies.push("@types/bun");
      scripts["dev:server"] = "bun --watch src/index.ts";
      scripts.start = "bun src/index.ts";
      scripts.serve = "bun dist/index.mjs";
      break;
    case "deno":
      scripts["dev:server"] = "deno run --watch --allow-net --allow-env --allow-read src/index.ts";
      scripts.start = "deno run --allow-net --allow-env --allow-read src/index.ts";
      scripts.serve = "deno run --allow-net --allow-env --allow-read dist/index.mjs";
      break;
    case "aws-lambda":
      dependencies.push("hono");
      devDependencies.push("@types/aws-lambda");
      break;
    case "cloudflare-workers": {
      // Cloudflare workers uses wrangler
      const cfDevDeps = devDependencies.filter((d) => d !== "tsx");
      cfDevDeps.push("wrangler", "@cloudflare/workers-types");
      devDependencies.length = 0;
      devDependencies.push(...cfDevDeps);
      scripts["dev:server"] = "wrangler dev";
      scripts.deploy = "wrangler deploy";
      break;
    }
    case "netlify":
      dependencies.push("hono", "@netlify/functions");
      break;
    case "vercel":
      dependencies.push("hono");
      devDependencies.push("@vercel/node");
      break;
    case "azure-functions":
      dependencies.push("hono", "@azure/functions", "@marplex/hono-azurefunc-adapter");
      break;
    case "google-cloud-run":
    case "node":
    default:
      dependencies.push("@hono/node-server");
      break;
  }

  return { dependencies, devDependencies, scripts };
}

export function resolvePackages(ctx: ScaffoldContext): PackageGroups {
  const base = typePackages(ctx.type);
  const addons = resolveAddons(ctx);

  const dependencies = [...base.dependencies];
  const devDependencies = [...base.devDependencies];
  const scripts = { ...base.scripts };

  for (const addon of addons) {
    dependencies.push(...addon.dependencies(ctx));
    devDependencies.push(...addon.devDependencies(ctx));
    if (addon.scripts) {
      Object.assign(scripts, addon.scripts(ctx));
    }
  }

  return {
    dependencies: [...new Set(dependencies)],
    devDependencies: [...new Set(devDependencies)],
    scripts,
  };
}

export function getPackageGroups(
  type: ProjectType,
): Omit<PackageGroups, "scripts"> & { scripts?: Record<string, string> } {
  const groups = typePackages(type);
  return groups;
}
