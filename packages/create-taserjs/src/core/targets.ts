/**
 * Registry for the three scaffold dimensions — runtime, framework, deploy —
 * plus the compatibility rules between them.
 *
 * Dependency direction: deploy implies the runtime family; the effective
 * runtime constrains which frameworks can run. `--runtime` is an override
 * available only where it is meaningful (self-hosted node-family targets).
 */
import { DEPLOY_TARGETS, type DeployTarget, type Framework, type Runtime } from "./types.js";

export type PlatformFile = {
  name: string;
  content: string | ((ctx: { projectName: string }) => string);
};

export type DeployEntry = {
  id: DeployTarget;
  /** Runtime this target builds for ("workerd" = Cloudflare's V8 runtime). */
  impliedRuntime: Runtime | "workerd";
  /** Whether the built output is a long-running server you start locally. */
  selfHosted: boolean;
  /** `start` script value; null for platform-deployed targets. */
  startScript: string | null;
  /** Runtime/platform tooling devDependencies beyond the base set. */
  devDeps: string[];
  files: PlatformFile[];
};

const NODE_START = "node .output/server/index.mjs";

export const DEPLOY_ENTRIES: Record<DeployTarget, DeployEntry> = {
  "node-server": {
    id: "node-server",
    impliedRuntime: "node",
    selfHosted: true,
    startScript: NODE_START,
    devDeps: [],
    files: [],
  },
  "node-cluster": {
    id: "node-cluster",
    impliedRuntime: "node",
    selfHosted: true,
    startScript: NODE_START,
    devDeps: [],
    files: [],
  },
  bun: {
    id: "bun",
    impliedRuntime: "bun",
    selfHosted: true,
    startScript: "bun .output/server/index.mjs",
    devDeps: ["@types/bun"],
    files: [],
  },
  "deno-server": {
    id: "deno-server",
    impliedRuntime: "deno",
    selfHosted: true,
    startScript: "deno run -A .output/server/index.mjs",
    devDeps: [],
    files: [],
  },
  "deno-deploy": {
    id: "deno-deploy",
    impliedRuntime: "deno",
    selfHosted: false,
    startScript: null,
    devDeps: [],
    files: [],
  },
  "cloudflare-module": {
    id: "cloudflare-module",
    impliedRuntime: "workerd",
    selfHosted: false,
    startScript: null,
    devDeps: ["wrangler", "@cloudflare/workers-types"],
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
    devDeps: ["@vercel/node"],
    files: [],
  },
  "aws-lambda": {
    id: "aws-lambda",
    impliedRuntime: "node",
    selfHosted: false,
    startScript: null,
    devDeps: ["@types/aws-lambda"],
    files: [],
  },
  netlify: {
    id: "netlify",
    impliedRuntime: "node",
    selfHosted: false,
    startScript: null,
    devDeps: [],
    files: [],
  },
};

/** Runtimes a `--runtime` override may select per self-hosted deploy target. */
const RUNTIME_OVERRIDES: Partial<Record<DeployTarget, readonly Runtime[]>> = {
  "node-server": ["node", "bun"],
  "node-cluster": ["node", "bun"],
};

export const DEFAULT_DEPLOY: DeployTarget = "node-server";
export const DEFAULT_FRAMEWORK: Framework = "none";

export function isCuratedDeploy(value: string): value is DeployTarget {
  return (DEPLOY_TARGETS as readonly string[]).includes(value);
}

/**
 * Resolves any preset id to its emission entry. Curated ids come from the
 * registry; unknown strings pass through to Nitro verbatim as non-self-hosted
 * node-family targets.
 */
export function resolveDeployEntry(id: string): { entry: DeployEntry; curated: boolean } {
  if (isCuratedDeploy(id)) {
    return { entry: DEPLOY_ENTRIES[id], curated: true };
  }
  return {
    entry: {
      // Cast: passthrough ids are valid Nitro PresetNameInputs by contract.
      id: id as DeployTarget,
      impliedRuntime: "node",
      selfHosted: false,
      startScript: null,
      devDeps: [],
      files: [],
    },
    curated: false,
  };
}

/** Runtime overrides permitted for a deploy target; empty = no override. */
export function allowedRuntimeOverrides(id: DeployTarget): readonly Runtime[] {
  return RUNTIME_OVERRIDES[id] ?? [];
}

export type CombinationError = { ok: false; reason: string };
export type CombinationOk = { ok: true; runtime: Runtime | "workerd" };

/**
 * Validates a runtime × framework × deploy combination.
 *
 * @param runtimeOverride explicit `--runtime` selection, if any
 * @param deploy preset id (curated or passthrough)
 */
export function validateCombination(
  runtimeOverride: Runtime | undefined,
  framework: Framework,
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

  if ((framework === "express" || framework === "fastify") && effective !== "node") {
    return {
      ok: false,
      reason: `Framework "${framework}" requires the Node runtime, but deploy target "${entry.id}" implies "${String(effective)}".`,
    };
  }

  return { ok: true, runtime: effective };
}
