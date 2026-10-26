import type { DeployPreset } from "./types.js";

export const DEFAULT_NITRO_PRESET = "node-server";

/** The presets offered in the prompt. `--preset` accepts any Nitro preset name. */
export const PRESET_CHOICES: readonly { value: DeployPreset; label: string; hint?: string }[] = [
  { value: DEFAULT_NITRO_PRESET, label: "None", hint: "Node.js" },
  { value: "cloudflare-module", label: "Cloudflare Workers" },
  { value: "vercel", label: "Vercel" },
  { value: "netlify", label: "Netlify" },
  { value: "aws-lambda", label: "AWS Lambda" },
];

const NITRO_START_SCRIPT = "node .output/server/index.mjs";

/** Only the self-hosted Node.js output has a start script; serverless presets deploy through their platform. */
export function startScriptFor(preset: DeployPreset | undefined): string | undefined {
  return preset === DEFAULT_NITRO_PRESET ? NITRO_START_SCRIPT : undefined;
}

/** Cloudflare Workers presets run on workerd, which lacks the Node internals Express and Fastify need. */
export const isNodeRuntimePreset = (preset: DeployPreset): boolean =>
  !preset.startsWith("cloudflare");
