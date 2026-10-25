import { getFramework } from "../frameworks/registry.js";
import type { FrameworkDefinition } from "../frameworks/types.js";
import { getHost } from "../hosts/registry.js";
import { DEFAULT_NITRO_PRESET, isBare, isNodeRuntimePreset } from "./presets.js";
import { BARE_PRESET, type HostId, type ResolvedScaffold, type ScaffoldContext } from "./types.js";

function resolvePreset(framework: FrameworkDefinition, requested: string | undefined): string {
  if (framework.ownsDeployment) {
    if (requested && !isBare(requested)) {
      throw new Error(
        `${framework.label} deploys through its own adapter, so --preset "${requested}" does not apply.`,
      );
    }
    return BARE_PRESET;
  }

  if (framework.requiresNitro) {
    const preset = requested ?? DEFAULT_NITRO_PRESET;
    if (isBare(preset)) {
      throw new Error(
        `${framework.label} needs Nitro to serve the built UI next to the API. Pick a preset such as "${DEFAULT_NITRO_PRESET}".`,
      );
    }
    return preset;
  }

  return requested ?? BARE_PRESET;
}

function resolveHost(
  framework: FrameworkDefinition,
  preset: string,
  requested: HostId | undefined,
): HostId {
  const host = getHost(requested ?? "none");
  if (!host) return "none";

  if (framework.group === "fullstack") {
    throw new Error(`${framework.label} owns its server, so --host "${host.id}" does not apply.`);
  }
  if (host.runtime === "node" && !isNodeRuntimePreset(preset)) {
    throw new Error(
      `${host.label} needs Node.js APIs and cannot run on the "${preset}" preset. Pick a fetch-based host such as Hono.`,
    );
  }
  return host.id;
}

/** Decides the framework, deploy preset and server directory for a scaffold request. */
export function resolveScaffold(context: ScaffoldContext): {
  scaffold: ResolvedScaffold;
  framework: FrameworkDefinition;
} {
  const framework = getFramework(context.framework ?? "none");
  const preset = resolvePreset(framework, context.preset);
  return {
    framework,
    scaffold: {
      ...context,
      framework: framework.id,
      preset,
      host: resolveHost(framework, preset, context.host),
      serverDir: framework.serverDir,
    },
  };
}
