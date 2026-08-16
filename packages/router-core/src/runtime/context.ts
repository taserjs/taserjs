import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Context } from 'hono'

import { ensureBody } from '../ensure-body.js'
import {
  middlewareToLayer,
  mergeValidatedField,
  schemaLayer,
  type PipelineContext,
  type PipelineLayer,
} from '../run-middleware.js'
import { createTaserCookieJar, type TaserCookieJar } from '../taser-cookies.js'
import { createTaserHeaders } from '../taser-headers.js'
import type { ContextFactory, HttpMethod, RouteHandler, RouteManifestShape } from '../types.js'
import { requestScope } from './request-scope.js'
import { getMiddlewares } from './returns.js'

function parseQuery(url: URL): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {}
  for (const [key, value] of url.searchParams.entries()) {
    const existing = query[key]
    if (existing === undefined) {
      query[key] = value
      continue
    }
    if (Array.isArray(existing)) {
      existing.push(value)
      continue
    }
    query[key] = [existing, value]
  }
  return query
}

function buildParams(c: Context): Record<string, unknown> {
  try {
    return { ...(c.req.param() as Record<string, string>) }
  }
  catch {
    return {}
  }
}

export async function buildPipelineContext(
  c: Context,
  createContext: ContextFactory,
  path: string,
  method: HttpMethod,
  cookieSecret?: string | BufferSource,
  cookieDefaults?: import('../taser-cookies.js').CookieDefaults,
): Promise<{ ctx: PipelineContext, cookies: TaserCookieJar }> {
  const scope = requestScope.getStore()
  const native = scope?.native
  const hono = scope?.hono ?? c
  const userContext = await createContext({ native })
  const cookies = createTaserCookieJar(
    c.req.header('cookie') ?? null,
    cookieSecret,
    cookieDefaults ?? {},
  )
  const url = new URL(c.req.url)

  const ctx: PipelineContext = {
    ...userContext,
    state: {},
    query: parseQuery(url),
    params: buildParams(c),
    body: undefined,
    headers: createTaserHeaders(c.req.raw.headers),
    cookies,
    method,
    path,
    url,
    request: c.req.raw,
    native,
    hono,
    var: {},
  }

  return { ctx, cookies }
}

export async function buildNotFoundContext(
  c: Context,
  createContext: ContextFactory,
  cookies: TaserCookieJar,
): Promise<PipelineContext> {
  const scope = requestScope.getStore()
  const native = scope?.native
  const hono = scope?.hono ?? c
  const userContext = await createContext({ native })
  const url = new URL(c.req.url)

  return {
    ...userContext,
    state: {},
    query: parseQuery(url),
    params: {},
    body: undefined,
    headers: createTaserHeaders(c.req.raw.headers),
    cookies,
    method: c.req.method.toUpperCase(),
    path: c.req.path,
    url,
    request: c.req.raw,
    native,
    hono,
    var: {},
  }
}

async function validateOptionalSchema(
  schema: unknown,
  value: unknown,
): Promise<unknown> {
  if (schema === undefined) {
    return value
  }
  return mergeValidatedField(schema as StandardSchemaV1, value)
}

async function applyRouteSchemas(
  route: RouteHandler,
  ctx: PipelineContext,
  prefix: 'route' | 'handler',
): Promise<void> {
  const query = prefix === 'route' ? route.query : route.handlerQuery
  const params = prefix === 'route' ? route.params : route.handlerParams
  const body = prefix === 'route' ? route.body : route.handlerBody

  ctx.query = await validateOptionalSchema(query, ctx.query)
  ctx.params = await validateOptionalSchema(params, ctx.params)
  if (body !== undefined) {
    await ensureBody(ctx)
    ctx.body = await validateOptionalSchema(body, ctx.body)
  }
}

export function buildPipelineLayers(
  manifest: RouteManifestShape,
  layoutChain: readonly string[],
  route: RouteHandler,
): PipelineLayer[] {
  const layers: PipelineLayer[] = []

  for (const layoutId of layoutChain) {
    const layout = manifest.layouts[layoutId]
    if (!layout) {
      continue
    }
    for (const definition of getMiddlewares(layout.middlewares)) {
      layers.push(middlewareToLayer(definition))
    }
  }

  for (const definition of route.middlewares ?? []) {
    layers.push(middlewareToLayer(definition))
  }

  layers.push(schemaLayer(ctx => applyRouteSchemas(route, ctx, 'route')))

  for (const definition of route.handlerMiddlewares ?? []) {
    layers.push(middlewareToLayer(definition))
  }

  layers.push(schemaLayer(ctx => applyRouteSchemas(route, ctx, 'handler')))

  return layers
}
