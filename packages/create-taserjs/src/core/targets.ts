import { DEPLOY_TARGETS, type DeployTarget, type Runtime } from "./types.js";

export interface PlatformFile {
  name: string;
  content: string | ((ctx: { projectName: string }) => string);
}

export interface DeployEntry {
  id: DeployTarget;
  impliedRuntime: Runtime | "workerd";
  selfHosted: boolean;
  startScript: string | null;
  devDeps: string[];
  files: PlatformFile[];
}

const NITRO_NODE_START = "node .output/server/index.mjs";

export const DEPLOY_ENTRIES: Record<DeployTarget, DeployEntry> = {
  none: {
    id: "none",
    impliedRuntime: "node",
    selfHosted: true,
    startScript: "node dist/serve.mjs",
    devDeps: ["srvx"],
    files: [],
  },
  "node-server": {
    id: "node-server",
    impliedRuntime: "node",
    selfHosted: true,
    startScript: NITRO_NODE_START,
    devDeps: ["nitro"],
    files: [],
  },
  "node-cluster": {
    id: "node-cluster",
    impliedRuntime: "node",
    selfHosted: true,
    startScript: NITRO_NODE_START,
    devDeps: ["nitro"],
    files: [],
  },
  bun: {
    id: "bun",
    impliedRuntime: "bun",
    selfHosted: true,
    startScript: "bun .output/server/index.mjs",
    devDeps: ["nitro", "@types/bun"],
    files: [],
  },
  "deno-server": {
    id: "deno-server",
    impliedRuntime: "deno",
    selfHosted: true,
    startScript: "deno run -A .output/server/index.mjs",
    devDeps: ["nitro"],
    files: [],
  },
  "deno-deploy": {
    id: "deno-deploy",
    impliedRuntime: "deno",
    selfHosted: false,
    startScript: null,
    devDeps: ["nitro"],
    files: [],
  },
  "cloudflare-module": {
    id: "cloudflare-module",
    impliedRuntime: "workerd",
    selfHosted: false,
    startScript: null,
    devDeps: ["nitro", "wrangler", "@cloudflare/workers-types"],
    files: [
      {
        name: "wrangler.jsonc",
        content: ({ projectName }) =>
          `${JSON.stringify(
            {
              $schema: "node_modules/wrangler/config-schema.json",
              name: projectName,
              main: ".output/server/index.mjs",
              compatibility_date: "2024-11-01",
            },
            null,
            2,
          )}\n`,
      },
    ],
  },
  vercel: {
    id: "vercel",
    impliedRuntime: "node",
    selfHosted: false,
    startScript: null,
    devDeps: ["nitro", "@vercel/node"],
    files: [],
  },
  "aws-lambda": {
    id: "aws-lambda",
    impliedRuntime: "node",
    selfHosted: false,
    startScript: null,
    devDeps: ["nitro", "@types/aws-lambda"],
    files: [],
  },
  netlify: {
    id: "netlify",
    impliedRuntime: "node",
    selfHosted: false,
    startScript: null,
    devDeps: ["nitro"],
    files: [],
  },
};

const RUNTIME_OVERRIDES: Partial<Record<DeployTarget, readonly Runtime[]>> = {
  none: ["node", "bun"],
  "node-server": ["node", "bun"],
  "node-cluster": ["node", "bun"],
};

export const DEFAULT_DEPLOY: DeployTarget = "none";

export function isCuratedDeploy(value: string): value is DeployTarget {
  return (DEPLOY_TARGETS as readonly string[]).includes(value);
}

export function resolveDeployEntry(id: string): { entry: DeployEntry; curated: boolean } {
  if (isCuratedDeploy(id)) {
    return { entry: DEPLOY_ENTRIES[id], curated: true };
  }
  return {
    entry: {
      id: id as DeployTarget,
      impliedRuntime: "node",
      selfHosted: false,
      startScript: null,
      devDeps: ["nitro"],
      files: [],
    },
    curated: false,
  };
}

export function allowedRuntimeOverrides(id: DeployTarget): readonly Runtime[] {
  return RUNTIME_OVERRIDES[id] ?? [];
}

export type CombinationError = { ok: false; reason: string };
export type CombinationOk = { ok: true; runtime: Runtime | "workerd" };

export function validateCombination(
  runtimeOverride: Runtime | undefined,
  deploy: string,
): CombinationOk | CombinationError {
  const { entry } = resolveDeployEntry(deploy);

  if (runtimeOverride !== undefined) {
    const allowed = entry.selfHosted ? allowedRuntimeOverrides(entry.id) : [];
    if (!allowed.includes(runtimeOverride)) {
      return {
        ok: false,
        reason:
          `Runtime "${runtimeOverride}" is not valid for deploy target "${entry.id}". ` +
          (allowed.length > 0
            ? `Allowed overrides: ${allowed.join(", ")}.`
            : `It implies runtime "${String(entry.impliedRuntime)}".`),
      };
    }
  }

  const effective = runtimeOverride ?? entry.impliedRuntime;
  return { ok: true, runtime: effective };
}
