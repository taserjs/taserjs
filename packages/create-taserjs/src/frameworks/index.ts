import type { Framework } from "../core/types.js";

export function indexTemplate(framework: Framework): string {
  switch (framework) {
    case "express":
      return `import 'dotenv/config'

import express from 'express'
import { createExpressHandler } from '@taserjs/adapter-express'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const taser = createExpressHandler(router)
const app = express()
taser.mount('/api{/*splat}', app)

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => {
  console.log(\`Express listening on http://localhost:\${port}\`)
})
`;
    case "hono":
      return `import 'dotenv/config'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const app = new Hono()
const api = router.base('/api')
app.all('/api/*', c => api.native(c).fetch(c.req.raw))

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port }, () => {
  console.log(\`Hono listening on http://localhost:\${port}\`)
})
`;
    case "fastify":
      return `import 'dotenv/config'

import Fastify from 'fastify'
import { createFastifyHandler } from '@taserjs/adapter-fastify'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const taser = createFastifyHandler(router)
const app = Fastify()
taser.mount('/api/*', app)

const port = Number(process.env.PORT ?? 3000)
await app.listen({ port })
console.log(\`Fastify listening on http://localhost:\${port}\`)
`;
    case "node":
    default:
      return `import 'dotenv/config'

import { createServer } from 'node:http'
import { createNodeHandler } from '@taserjs/adapter-node'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const taser = createNodeHandler(router)
const app = createServer()
taser.mount('/api/*', app)

const port = Number(process.env.PORT ?? 3000)
app.listen(port, () => {
  console.log(\`Node listening on http://localhost:\${port}\`)
})
`;
  }
}

export function taserTsTemplate(framework: Framework = "node"): string {
  if (framework === "hono") {
    return `import type { Context } from 'hono'
import { createTaserApp, type InferAppContext } from '@taserjs/router'

import { context } from '#src/context.js'

declare module '@taserjs/router' {
  interface RouterRegister {
    NativeContext: Context
  }
}

export const t = createTaserApp({
  response: { validate: true },
}).context(context)

export type AppContext = InferAppContext<typeof context>
`;
  }

  return `import { createTaserApp, type InferAppContext } from '@taserjs/router'

import { context } from '#src/context.js'

export const t = createTaserApp({
  response: { validate: true },
}).context(context)

export type AppContext = InferAppContext<typeof context>
`;
}
