import { reply } from '@taserjs/router-utils'
import { bodyLimit } from 'hono/body-limit'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createTaserCompatHandler, createTaserRuntime } from '../src/index.js'
import * as runMiddleware from '../src/run-middleware.js'

describe('runtime hot path', () => {
  it('does not parse JSON body when route has no body schema', async () => {
    const manifest = {
      layouts: {},
      routes: {
        '/items': {
          POST: {
            layoutChain: [],
            route: {
              path: '/items',
              method: 'POST' as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: () => reply.json({ ok: true }),
            },
          },
        },
      },
    }

    const runtime = createTaserRuntime(manifest, () => ({}))
    const response = await runtime.fetch(new Request('http://localhost/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('parses body when route declares a body schema', async () => {
    const manifest = {
      layouts: {},
      routes: {
        '/items': {
          POST: {
            layoutChain: [],
            route: {
              path: '/items',
              method: 'POST' as const,
              middlewares: [],
              handlerMiddlewares: [],
              body: z.object({ name: z.string() }),
              handler: (ctx: { body: { name: string } }) => reply.json({ name: ctx.body.name }),
            },
          },
        },
      },
    }

    const runtime = createTaserRuntime(manifest, () => ({}))
    const response = await runtime.fetch(new Request('http://localhost/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'taser' }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ name: 'taser' })
  })

  it('rejects oversized body via bodyLimit before handler runs', async () => {
    let handlerCalled = false
    const manifest = {
      layouts: {
        root: {
          middlewares: {
            middlewares: [{
              handler: createTaserCompatHandler(bodyLimit({ maxSize: 16 })),
            }],
          },
        },
      },
      routes: {
        '/items': {
          POST: {
            layoutChain: ['root'],
            route: {
              path: '/items',
              method: 'POST' as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: () => {
                handlerCalled = true
                return reply.json({ ok: true })
              },
            },
          },
        },
      },
    }

    const runtime = createTaserRuntime(manifest, () => ({}))
    const response = await runtime.fetch(new Request('http://localhost/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'this payload is too large' }),
    }))

    expect(response.status).toBe(413)
    expect(handlerCalled).toBe(false)
  })

  it('preserves extra query keys after middleware validation', async () => {
    const manifest = {
      layouts: {},
      routes: {
        '/search': {
          GET: {
            layoutChain: [],
            route: {
              path: '/search',
              method: 'GET' as const,
              middlewares: [{
                query: z.object({ page: z.string() }),
                handler: async (ctx: { query: { page: string, extra: string } }, next: () => Promise<unknown>) => {
                  expect(ctx.query).toEqual({ page: '1', extra: 'drop' })
                  return next()
                },
              }],
              handlerMiddlewares: [],
              handler: (ctx: { query: { page: string, extra: string } }) => reply.json(ctx.query),
            },
          },
        },
      },
    }

    const runtime = createTaserRuntime(manifest, () => ({}))
    const response = await runtime.fetch(new Request('http://localhost/search?page=1&extra=drop'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ page: '1', extra: 'drop' })
  })

  it('merges layered query validation across middleware and route schemas', async () => {
    const manifest = {
      layouts: {
        index: {
          middlewares: {
            middlewares: [{
              query: z.object({ page: z.coerce.number().int().positive().default(1) }),
              handler: async (_ctx: any, next: () => any) => next(),
            }],
          },
        },
      },
      routes: {
        '/': {
          GET: {
            layoutChain: ['index'],
            route: {
              path: '/',
              method: 'GET' as const,
              middlewares: [],
              handlerMiddlewares: [],
              query: z.object({ name: z.string() }),
              handler: (ctx: { query: { name: string, page: number } }) =>
                reply.json(ctx.query),
            },
          },
        },
      },
    }

    const runtime = createTaserRuntime(manifest, () => ({}))
    const response = await runtime.fetch(new Request('http://localhost/?name=foo'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ name: 'foo', page: 1 })
  })

  it('does not rebuild pipeline layers on each request', async () => {
    const composeSpy = vi.spyOn(runMiddleware, 'composePipeline')

    const manifest = {
      layouts: {},
      routes: {
        '/hello': {
          GET: {
            layoutChain: [],
            route: {
              path: '/hello',
              method: 'GET' as const,
              middlewares: [],
              handlerMiddlewares: [],
              handler: () => reply.json({ ok: true }),
            },
          },
        },
      },
    }

    const runtime = createTaserRuntime(manifest, () => ({}))
    composeSpy.mockClear()

    await runtime.fetch(new Request('http://localhost/hello'))
    await runtime.fetch(new Request('http://localhost/hello'))

    expect(composeSpy).not.toHaveBeenCalled()
    composeSpy.mockRestore()
  })
})
