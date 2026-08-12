import { AsyncLocalStorage } from 'node:async_hooks'
import type { Context } from 'hono'

export type RequestScope = {
  native?: unknown
  hono?: Context
}

export const requestScope = new AsyncLocalStorage<RequestScope>()
