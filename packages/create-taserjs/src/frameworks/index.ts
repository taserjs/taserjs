import type { ProjectType } from "../core/types.js";

export function indexTemplate(type: ProjectType): string {
  switch (type) {
    case "express":
      return `import 'dotenv/config'

import express from 'express'
import { createExpressHandler } from '@taserjs/adapter-express'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const taser = createExpressHandler(router)
const app = express()
taser.mount('/{*splat}', app)

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
app.all('/*', c => router.native(c).fetch(c.req.raw))

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
taser.mount('/*', app)

const port = Number(process.env.PORT ?? 3000)
await app.listen({ port })
console.log(\`Fastify listening on http://localhost:\${port}\`)
`;
    case "bun":
      return `import 'dotenv/config'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const port = Number(process.env.PORT ?? 3000)

export default {
  port,
  fetch(request: Request) {
    return router.fetch(request)
  },
}
`;
    case "deno":
      return `import 'dotenv/config'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const port = Number(process.env.PORT ?? 8000)
Deno.serve({ port }, (request: Request) => router.fetch(request))
`;
    case "aws-lambda":
      return `import 'dotenv/config'

import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const app = new Hono()
app.all('/*', c => router.native(c).fetch(c.req.raw))

export const handler = handle(app)
`;
    case "cloudflare-workers":
      return `import 'dotenv/config'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

export default {
  fetch(request: Request, env: unknown, ctx: unknown) {
    return router.fetch(request, env, ctx)
  },
}
`;
    case "netlify":
      return `import 'dotenv/config'

import { Hono } from 'hono'
import { handle } from 'hono/netlify'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const app = new Hono()
app.all('/*', c => router.native(c).fetch(c.req.raw))

export default handle(app)
`;
    case "vercel":
      return `import 'dotenv/config'

import { Hono } from 'hono'
import { handle } from 'hono/vercel'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const app = new Hono()
app.all('/*', c => router.native(c).fetch(c.req.raw))

export default handle(app)
`;
    case "azure-functions":
      return `import 'dotenv/config'

import { app } from '@azure/functions'
import { Hono } from 'hono'
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const honoApp = new Hono()
honoApp.all('/*', c => router.native(c).fetch(c.req.raw))

app.http('httpTrigger', {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '{*proxy}',
  handler: azureHonoHandler(honoApp.fetch),
})
`;
    case "google-cloud-run":
      return `import 'dotenv/config'

import { serve } from '@hono/node-server'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const port = Number(process.env.PORT ?? 8080)
serve({ fetch: router.fetch, port }, () => {
  console.log(\`Cloud Run listening on http://localhost:\${port}\`)
})
`;
    case "node":
    default:
      return `import 'dotenv/config'

import { serve } from '@hono/node-server'

import { routeManifest } from '#src/routeManifest.gen.js'
import { t } from '#src/taser.js'

const router = t.create(routeManifest)

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: router.fetch, port }, () => {
  console.log(\`Node listening on http://localhost:\${port}\`)
})
`;
  }
}

export function taserTsTemplate(type: ProjectType = "node"): string {
  if (
    type === "hono" ||
    type === "aws-lambda" ||
    type === "netlify" ||
    type === "vercel" ||
    type === "azure-functions"
  ) {
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
