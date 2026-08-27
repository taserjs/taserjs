import type { DeployTarget, Framework } from "../core/types.js";

export function serverEntryTemplate(
  framework: Framework,
): { fileName: string; content: string } | null {
  switch (framework) {
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

app.get('/host', async () => {
  return { message: 'Hello from Fastify host!' }
})

await app.ready()

export default app.routing
`,
      };
    default:
      return null;
  }
}

export type FrameworkEntry = {
  id: Framework;
  serverEntry: { fileName: string; content: string } | null;
  deps: string[];
  devDeps: string[];
};

export const FRAMEWORK_ENTRIES: Record<Framework, FrameworkEntry> = {
  none: { id: "none", serverEntry: null, deps: [], devDeps: [] },
  hono: { id: "hono", serverEntry: serverEntryTemplate("hono"), deps: ["hono"], devDeps: [] },
  express: {
    id: "express",
    serverEntry: serverEntryTemplate("express"),
    deps: ["express"],
    devDeps: ["@types/express"],
  },
  fastify: {
    id: "fastify",
    // srvx bridges the Fastify Node handler to fetch (see compose codegen).
    serverEntry: serverEntryTemplate("fastify"),
    deps: ["fastify"],
    devDeps: [],
  },
};

export function nitroConfigTemplate(nitroPreset: string): string {
  return `import { defineConfig } from 'nitro/config'

export default defineConfig({
  preset: '${nitroPreset}',
})
`;
}

export function viteConfigTemplate(preset?: DeployTarget): string {
  if (preset === "none") {
    return `import { defineConfig } from 'vite'
import { taser } from '@taserjs/router-plugin/vite'

export default defineConfig({
  plugins: [taser()],
})
`;
  }

  return `import { defineConfig } from 'vite'
import { nitro } from 'nitro/vite'
import { taser } from '@taserjs/router-plugin/vite'

export default defineConfig({
  plugins: [taser(), nitro()],
})
`;
}

export function taserTsTemplate(): string {
  return `import { createTaserApp } from '@taserjs/router'

import { context } from './context.js'

export const t = createTaserApp({
  response: { validate: true },
}).context(context)
`;
}
