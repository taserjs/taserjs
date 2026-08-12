import { createServer, type Server } from 'node:http'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'

import { createTaserApp, type RouteManifestShape } from '@taserjs/router'
import { createHelloApp, createStreamRoute } from './testing.js'
import { InvalidMountPatternError } from '@taserjs/router-utils'
import { reply } from '@taserjs/router-utils'
import { describe, expect, it, afterEach } from 'vitest'

import { createNodeHandler } from '../src/index.js'

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected server to listen on a TCP port')
  }
  return address.port
}

describe('createNodeHandler', () => {
  let server: Server | undefined

  afterEach(async () => {
    if (!server) {
      return
    }
    if (!server.listening) {
      server = undefined
      return
    }
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
    server = undefined
  })

  it('forwards requests via requestListener', async () => {
    server = createServer(createNodeHandler(createHelloApp()).requestListener('/*'))
    const port = await listen(server)

    const response = await fetch(`http://127.0.0.1:${port}/hello`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('prefixes routes at /api/*', async () => {
    server = createServer(createNodeHandler(createHelloApp()).requestListener('/api/*'))
    const port = await listen(server)

    const response = await fetch(`http://127.0.0.1:${port}/api/hello`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('prefixes routes at /api/* via mount()', async () => {
    server = createServer()
    createNodeHandler(createHelloApp()).mount('/api/*', server)
    const port = await listen(server)

    const response = await fetch(`http://127.0.0.1:${port}/api/hello`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('registers a single request listener per mount()', () => {
    server = createServer()
    createNodeHandler(createHelloApp()).mount('/api/*', server)
    expect(EventEmitter.listenerCount(server, 'request')).toBe(1)
  })

  it('rejects a second mount() on the same server', () => {
    const testServer = createServer()
    server = testServer
    const nodeHandler = createNodeHandler(createHelloApp())
    nodeHandler.mount('/api/*', testServer)
    expect(() => nodeHandler.mount('/admin/*', testServer)).toThrow(
      'createNodeHandler().mount() was already called on this server',
    )
  })

  it('rejects invalid mount patterns', () => {
    expect(() => createNodeHandler(createHelloApp()).requestListener('/')).toThrow(
      InvalidMountPatternError,
    )
    const testServer = createServer()
    server = testServer
    expect(() => createNodeHandler(createHelloApp()).mount('/', testServer)).toThrow(
      InvalidMountPatternError,
    )
  })

  it('streams response bodies end-to-end', async () => {
    const route = createStreamRoute(() =>
      Promise.resolve(reply.stream(Readable.from([Buffer.from('stream-ok')]))))

    const manifest = {
      layouts: {},
      routes: {
        '/stream': {
          GET: { layoutChain: [], route },
        },
      },
    } satisfies RouteManifestShape

    server = createServer(
      createNodeHandler(createTaserApp().context({}).create(manifest)).requestListener('/*'),
    )
    const port = await listen(server)

    const response = await fetch(`http://127.0.0.1:${port}/stream`)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('stream-ok')
  })
})
