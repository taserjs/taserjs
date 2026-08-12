import type { StandardSchemaV1 } from '@standard-schema/spec'

import type { ReturnsMap } from './validate.js'

export type OnErrorHandlerLike = {
  responses?: ReturnsMap | Record<number, StandardSchemaV1> | Record<number, unknown> | undefined
  handle: (error: unknown, ctx?: unknown) => unknown | Promise<unknown>
}

export type OnErrorInput = OnErrorHandlerLike | OnErrorHandlerLike['handle']

export function normalizeOnError(handler: OnErrorInput): OnErrorHandlerLike {
  if (typeof handler === 'function') {
    return { handle: handler }
  }
  return handler
}
