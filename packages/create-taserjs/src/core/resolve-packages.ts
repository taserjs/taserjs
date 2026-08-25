import { resolveAddons } from "../addons/registry.js";
import { FRAMEWORK_ENTRIES } from "../frameworks/index.js";
import type { PackageGroups, ScaffoldContext } from "../core/types.js";
import { resolveDeployEntry } from "./targets.js";

const BASE_DEPENDENCIES = ["@taserjs/router", "dotenv"];

/** Runtime-agnostic build/dev tooling every scaffolded project needs. */
const BASE_DEV_DEPENDENCIES = ["@taserjs/vite-plugin", "nitro", "typescript@^5.9.3", "vite@^8.1.5"];

function runtimeDevDeps(ctx: ScaffoldContext): string[] {
  const { entry } = resolveDeployEntry(ctx.preset ?? "node-server");
  const effective = ctx.runtime ?? entry.impliedRuntime;
  switch (effective) {
    case "bun":
      return ["@types/bun"];
    case "deno":
      return []; // Deno ships its own tooling and types.
    case "workerd":
      return ["@cloudflare/workers-types"];
    case "node":
    default:
      return ["@types/node"];
  }
}

export function resolvePackages(ctx: ScaffoldContext): PackageGroups {
  const frameworkEntry = FRAMEWORK_ENTRIES[ctx.framework ?? "none"];
  const { entry: deployEntry } = resolveDeployEntry(ctx.preset ?? "node-server");

  const dependencies = [...BASE_DEPENDENCIES, ...frameworkEntry.deps];
  const devDependencies = [
    ...BASE_DEV_DEPENDENCIES,
    ...runtimeDevDeps(ctx),
    ...deployEntry.devDeps,
    ...frameworkEntry.devDeps,
  ];

  const scripts: Record<string, string> = {};
  if (deployEntry.startScript) {
    scripts.start = deployEntry.startScript;
  }

  const addons = resolveAddons(ctx);
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
