import type { Preset } from "../core/types.js";

export function serverEntryTemplate(preset: Preset): { fileName: string; content: string } | null {
  switch (preset) {
    case "hono":
      return {
        fileName: "src/server.ts",
        content: `import { Hono } from 'hono'

const app = new Hono()

app.get('/host', (c) => {
  return c.text('Hello from Hono host!')
})

export default app
`,
      };
    case "express":
      return {
        fileName: "src/server.node.ts",
        content: `import express from 'express'

const app = express()

app.get('/host', (_req, res) => {
  res.json({ message: 'Hello from Express host!' })
})

export default app
`,
      };
    case "fastify":
      return {
        fileName: "src/server.node.ts",
        content: `import Fastify from 'fastify'

const app = Fastify()

app.get('/host', async (_req, reply) => {
  return { message: 'Hello from Fastify host!' }
})

export default app
`,
      };
    default:
      return null;
  }
}

export function nitroPresetForPreset(preset: Preset): string {
  switch (preset) {
    case "cloudflare-workers":
      return "cloudflare-module";
    case "vercel":
      return "vercel";
    case "aws-lambda":
      return "aws-lambda";
    case "netlify":
      return "netlify";
    case "bun":
      return "bun";
    case "deno":
      return "deno";
    case "azure-functions":
      return "azure-functions";
    case "google-cloud-run":
    case "node":
    case "express":
    case "fastify":
    case "hono":
    default:
      return "node-server";
  }
}

export function nitroConfigTemplate(preset: Preset): string {
  const nitroPreset = nitroPresetForPreset(preset);
  return `import { defineConfig } from 'nitro/config'

export default defineConfig({
  preset: '${nitroPreset}',
})
`;
}

export function taserTsTemplate(_preset: Preset = "node"): string {
  return `import { createTaserApp } from '@taserjs/router'

import { context } from '#src/context.js'

export const t = createTaserApp({
  response: { validate: true },
}).context(context)
`;
}
