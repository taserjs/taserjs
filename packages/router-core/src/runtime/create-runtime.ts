import type { StandardSchemaV1 } from '@standard-schema/spec'
import { normalizeOnError, type ReplyResult } from '@taserjs/router-utils'
import { Hono } from 'hono'

import { toWireResponse } from '../error-handler.js'
import { composePipeline, type PipelineContext } from '../run-middleware.js'
import { splitCookieRuntimeConfig } from '../taser-cookies.js'
import type { ContextFactory, HttpMethod, OnErrorHandler, RouteHandler, RouteManifestShape } from '../types.js'
import { buildPipelineContext, buildPipelineLayers } from './context.js'
import { finalizeReply, type FinalizeResponseOptions } from './finalize.js'
import { toHonoRegisterPath } from './hono-path.js'
import { registerNotFoundHandler } from './not-found.js'
import { joinRoutePrefix, normalizeRoutePrefix } from './route-prefix.js'
import { requestScope } from './request-scope.js'
import { buildEffectiveReturns } from './returns.js'
import { handleRouteError } from './route-handler.js'
import { resolveScopeNative } from './scope-native.js'
import type { CreateTaserRuntimeOptions, NotFoundHandler, TaserNativeBoundRuntime, TaserRuntime } from './types.js'

type PreparedRoute = {
  effectiveReturns: Record<number, StandardSchemaV1> | undefined
  run: (ctx: PipelineContext) => Promise<ReplyResult>
}

function registerManifestRoutes(
  app: Hono,
  manifest: RouteManifestShape,
  pathPrefix: string,
  createContext: ContextFactory,
  responseOptions: FinalizeResponseOptions,
  cookieSecret: string | BufferSource | undefined,
  cookieDefaults: import('../taser-cookies.js').CookieDefaults,
  getOnErrorHandler: () => OnErrorHandler | undefined,
): void {
  const normalizedPrefix = normalizeRoutePrefix(pathPrefix)

  for (const [path, methodMap] of Object.entries(manifest.routes)) {
    for (const [method, entry] of Object.entries(methodMap)) {
      if (!entry) {
        continue
      }

      const httpMethod = method as HttpMethod
      const routeEntry = entry
      const route = routeEntry.route as RouteHandler
      const prepared: PreparedRoute = {
        effectiveReturns: buildEffectiveReturns(manifest, routeEntry.layoutChain, route),
        run: composePipeline(
          buildPipelineLayers(manifest, routeEntry.layoutChain, route),
          async pipelineCtx => await route.handler(pipelineCtx),
        ),
      }

      const honoPath = toHonoRegisterPath(joinRoutePrefix(normalizedPrefix, path))

      app.on(httpMethod, honoPath, async (c) => {
        return requestScope.run(
          {
            native: requestScope.getStore()?.native,
            hono: c,
          },
          async () => {
            let ctx: PipelineContext | undefined
            let cookies: import('../taser-cookies.js').TaserCookieJar | undefined

            try {
              const built = await buildPipelineContext(
                c,
                createContext,
                path,
                httpMethod,
                cookieSecret,
                cookieDefaults,
              )
              ctx = built.ctx
              cookies = built.cookies

              const result = await prepared.run(ctx)
              return toWireResponse(
                await finalizeReply(
                  result,
                  prepared.effectiveReturns,
                  responseOptions,
                  ctx.request as Request,
                  cookies,
                ),
              )
            }
            catch (error) {
              return handleRouteError(error, {
                effectiveReturns: prepared.effectiveReturns,
                responseOptions,
                cookies,
                cookieSecret,
                cookieDefaults,
                ctx,
                request: c.req.raw,
                onErrorHandler: getOnErrorHandler(),
              })
            }
          },
        )
      })
    }
  }
}

export function createTaserRuntime(
  manifest: RouteManifestShape,
  createContext: ContextFactory,
  options: CreateTaserRuntimeOptions = {},
): TaserRuntime {
  const validateResponse = options.response?.validate ?? true
  const onValidationFailure = options.response?.onValidationFailure
  const responseOptions: FinalizeResponseOptions = {
    validate: validateResponse,
    ...(onValidationFailure !== undefined ? { onValidationFailure } : {}),
  }
  let onErrorHandler = options.onError
  let notFoundHandler: NotFoundHandler | undefined = options.notFound
  const { secret: cookieSecret, defaults: cookieDefaults } = splitCookieRuntimeConfig(options.cookies)
  const registeredPrefixes = new Set<string>()

  const app = new Hono()

  registerManifestRoutes(
    app,
    manifest,
    '',
    createContext,
    responseOptions,
    cookieSecret,
    cookieDefaults,
    () => onErrorHandler,
  )

  registerNotFoundHandler(
    app,
    createContext,
    responseOptions,
    cookieSecret,
    cookieDefaults,
    () => notFoundHandler,
  )

  function runFetch(
    boundNative: unknown | undefined,
    request: Request,
    env?: unknown,
    executionCtx?: unknown,
  ): Promise<Response> {
    const native = resolveScopeNative(boundNative, env, executionCtx)
    return Promise.resolve(
      requestScope.run(
        { native },
        () => app.fetch(request, env as never, executionCtx as never),
      ),
    )
  }

  const runtime: TaserRuntime = {
    registerRoutePrefix(prefix: string) {
      const normalized = normalizeRoutePrefix(prefix)
      if (normalized === '/' || registeredPrefixes.has(normalized)) {
        return
      }
      registeredPrefixes.add(normalized)
      registerManifestRoutes(
        app,
        manifest,
        normalized,
        createContext,
        responseOptions,
        cookieSecret,
        cookieDefaults,
        () => onErrorHandler,
      )
    },
    fetch(request, env, executionCtx) {
      return runFetch(undefined, request, env, executionCtx)
    },
    native(boundNative: unknown): TaserNativeBoundRuntime {
      return {
        fetch: (request, env, executionCtx) => runFetch(boundNative, request, env, executionCtx),
      }
    },
    onError(handler: OnErrorHandler | OnErrorHandler['handle']) {
      onErrorHandler = normalizeOnError(handler)
      return runtime
    },
    notFound(handler) {
      notFoundHandler = handler
      return runtime
    },
  }

  return runtime
}
