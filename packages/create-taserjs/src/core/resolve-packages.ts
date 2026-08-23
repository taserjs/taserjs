import { resolveAddons } from "../addons/registry.js";
import type { PackageGroups, Preset, ScaffoldContext } from "../core/types.js";

function presetPackages(preset: Preset): PackageGroups {
  const dependencies = ["@taserjs/router", "dotenv"];
  const devDependencies = [
    "@taserjs/router-cli",
    "@taserjs/vite-plugin",
    "nitro",
    "typescript@^5.9.3",
    "@types/node",
  ];
  const scripts: Record<string, string> = {};

  switch (preset) {
    case "express":
      dependencies.push("express");
      devDependencies.push("@types/express");
      break;
    case "fastify":
      dependencies.push("fastify");
      break;
    case "hono":
      dependencies.push("hono");
      break;
    case "bun":
      devDependencies.push("@types/bun");
      break;
    case "cloudflare-workers":
      devDependencies.push("wrangler", "@cloudflare/workers-types");
      break;
    case "aws-lambda":
      devDependencies.push("@types/aws-lambda");
      break;
    case "vercel":
      devDependencies.push("@vercel/node");
      break;
    case "azure-functions":
      dependencies.push("@azure/functions");
      break;
    case "netlify":
      dependencies.push("@netlify/functions");
      break;
    case "google-cloud-run":
    case "deno":
    case "node":
    default:
      break;
  }

  return { dependencies, devDependencies, scripts };
}

export function resolvePackages(ctx: ScaffoldContext): PackageGroups {
  const base = presetPackages(ctx.preset);
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
  preset: Preset,
): Omit<PackageGroups, "scripts"> & { scripts?: Record<string, string> } {
  return presetPackages(preset);
}
