import { getFramework } from "../frameworks/registry.js";
import type { FrameworkDefinition } from "../frameworks/types.js";
import { getHost } from "../hosts/registry.js";
import { DEFAULT_NITRO_PRESET, isNodeRuntimePreset } from "./presets.js";
import type { HostId, ResolvedScaffold, ScaffoldContext } from "./types.js";

function resolvePreset(
  framework: FrameworkDefinition,
  requested: string | undefined,
): string | undefined {
  if (!framework.ownsDeployment) return requested ?? DEFAULT_NITRO_PRESET;
  if (requested) {
    throw new Error(
      `${framework.label} deploys through its own adapter, so --preset "${requested}" does not apply.`,
    );
  }
  return undefined;
}

function resolveTemplate(
  framework: FrameworkDefinition,
  requested: string | undefined,
): string | undefined {
  const { templates } = framework;
  if (!templates) {
    if (requested) {
      throw new Error(
        `${framework.label} has no templates, so --template "${requested}" does not apply.`,
      );
    }
    return undefined;
  }

  const template = requested ?? templates[0]?.id;
  if (!templates.some(({ id }) => id === template)) {
    const available = templates.map(({ id }) => id).join(", ");
    throw new Error(`Unknown ${framework.label} template "${template}". Available: ${available}.`);
  }
  return template;
}

function resolveHost(
  framework: FrameworkDefinition,
  preset: string | undefined,
  requested: HostId | undefined,
): HostId {
  const host = getHost(requested ?? "none");
  if (!host) return "none";

  if (framework.group === "fullstack") {
    throw new Error(`${framework.label} owns its server, so --host "${host.id}" does not apply.`);
  }
  if (host.runtime === "node" && preset && !isNodeRuntimePreset(preset)) {
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
      template: resolveTemplate(framework, context.template),
      preset,
      host: resolveHost(framework, preset, context.host),
      serverDir: framework.serverDir,
    },
  };
}
