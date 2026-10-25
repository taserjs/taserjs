import { BARE_PRESET, type DeployPreset } from "./types.js";

export const DEFAULT_NITRO_PRESET = "node-server";

/** The presets offered in the prompt. `--preset` accepts any Nitro preset name. */
export const PRESET_CHOICES: readonly { value: DeployPreset; label: string }[] = [
  { value: "node-server", label: "Node.js" },
  { value: "cloudflare-module", label: "Cloudflare Workers" },
  { value: "vercel", label: "Vercel" },
  { value: "netlify", label: "Netlify" },
  { value: "aws-lambda", label: "AWS Lambda" },
];

export const BARE_CHOICE = { value: BARE_PRESET, label: "Bare (no Nitro)" } as const;

export const isBare = (preset: DeployPreset): boolean => preset === BARE_PRESET;

const NITRO_START_SCRIPT = "node .output/server/index.mjs";
const BARE_START_SCRIPT = "node dist/serve.mjs";

/** Only self-hosted outputs have a start script; serverless presets deploy through their platform. */
export function startScriptFor(preset: DeployPreset): string | undefined {
  if (isBare(preset)) return BARE_START_SCRIPT;
  return preset === "node-server" ? NITRO_START_SCRIPT : undefined;
}

/** Cloudflare Workers presets run on workerd, which lacks the Node internals Express and Fastify need. */
export const isNodeRuntimePreset = (preset: DeployPreset): boolean =>
  !preset.startsWith("cloudflare");
