import { reply } from '@taserjs/router-utils'
import type { Hono } from 'hono'

import { handlePipelineError, toWireResponse } from '../error-handler.js'
import { createTaserCookieJar, type CookieDefaults } from '../taser-cookies.js'
import type { ContextFactory } from '../types.js'
import { buildNotFoundContext } from './context.js'
import { finalizeReply, type FinalizeResponseOptions } from './finalize.js'
import type { NotFoundHandler } from './types.js'

export function registerNotFoundHandler(
  app: Hono,
  createContext: ContextFactory,
  responseOptions: FinalizeResponseOptions,
  cookieSecret: string | BufferSource | undefined,
  cookieDefaults: CookieDefaults,
  getHandler: () => NotFoundHandler | undefined,
): void {
  app.notFound(async (c) => {
    const cookies = createTaserCookieJar(
      c.req.header('cookie') ?? null,
      cookieSecret,
      cookieDefaults,
    )
    const notFoundHandler = getHandler()
    if (notFoundHandler) {
      try {
        const ctx = await buildNotFoundContext(c, createContext, cookies)
        const result = await notFoundHandler(ctx)
        return toWireResponse(
          await finalizeReply(result, undefined, responseOptions, c.req.raw, cookies),
        )
      }
      catch (error) {
        return toWireResponse(cookies.applyTo(handlePipelineError(error)))
      }
    }
    return toWireResponse(cookies.applyTo(reply.notFound()))
  })
}
