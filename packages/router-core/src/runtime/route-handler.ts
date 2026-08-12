import type { StandardSchemaV1 } from '@standard-schema/spec'
import {
  isReplyResult,
  reply,
  ValidationError,
} from '@taserjs/router-utils'

import { handlePipelineError, toWireResponse } from '../error-handler.js'
import type { PipelineContext } from '../run-middleware.js'
import { createTaserCookieJar, type CookieDefaults, type TaserCookieJar } from '../taser-cookies.js'
import type { OnErrorHandler } from '../types.js'
import { finalizeReply, type FinalizeResponseOptions } from './finalize.js'

export type RouteErrorState = {
  effectiveReturns: Record<number, StandardSchemaV1> | undefined
  responseOptions: FinalizeResponseOptions
  cookies: TaserCookieJar | undefined
  cookieSecret?: string | BufferSource | undefined
  cookieDefaults?: CookieDefaults
  ctx: PipelineContext | undefined
  request: Request
  onErrorHandler: OnErrorHandler | undefined
}

export async function handleRouteError(
  error: unknown,
  state: RouteErrorState,
): Promise<Response> {
  const jar = state.cookies ?? createTaserCookieJar(
    null,
    state.cookieSecret,
    state.cookieDefaults ?? {},
  )
  const request = state.request

  if (isReplyResult(error) || error instanceof Response) {
    return toWireResponse(
      await finalizeReply(
        error,
        state.effectiveReturns,
        state.responseOptions,
        request,
        jar,
      ),
    )
  }

  if (error instanceof ValidationError) {
    return toWireResponse(
      await finalizeReply(
        reply.unprocessableEntity({ errors: error.issues }),
        state.effectiveReturns,
        state.responseOptions,
        request,
        jar,
      ),
    )
  }

  if (state.onErrorHandler) {
    try {
      const handled = await state.onErrorHandler.handle(error, state.ctx)
      return toWireResponse(
        await finalizeReply(
          handled,
          state.onErrorHandler.responses as Record<number, StandardSchemaV1> | undefined,
          state.responseOptions,
          request,
          jar,
        ),
      )
    }
    catch (onErrorFailure) {
      return toWireResponse(jar.applyTo(handlePipelineError(onErrorFailure)))
    }
  }

  return toWireResponse(jar.applyTo(handlePipelineError(error)))
}
