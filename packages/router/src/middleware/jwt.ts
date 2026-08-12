import { jwt as honoJwt } from 'hono/jwt'

import { createAuthMiddleware, type AuthMiddlewareUnit } from './auth.js'
import type { InferOutput, Schema } from '../types/schema.js'

export type JwtOptions = Parameters<typeof honoJwt>[0]

/**
 * JWT auth middleware. Invalid or missing tokens return **401** (Hono).
 * Valid tokens whose payload fails `payloadSchema` return **403**.
 * Use optional schema fields for intentionally optional claims.
 */
export function jwt<TPayload>(
  payloadSchema: Schema<TPayload>,
  options: JwtOptions,
): AuthMiddlewareUnit<InferOutput<Schema<TPayload>>> {
  return createAuthMiddleware(payloadSchema, honoJwt(options))
}
