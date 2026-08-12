import { describe, expect, it, vi } from 'vitest'

import { createClient } from '../src/client.js'
import {
  applyPathParams,
  buildSearchParams,
  joinUrl,
  resolveHeaders,
} from '../src/support/url.js'

describe('url utils', () => {
  it('joins base url and segments', () => {
    expect(joinUrl('http://localhost:3000/api', ['hello'])).toBe('http://localhost:3000/api/hello')
    expect(joinUrl('http://localhost:3000/api/', ['index'])).toBe('http://localhost:3000/api/')
    expect(joinUrl('http://localhost:3000/api', ['account', 'team'])).toBe(
      'http://localhost:3000/api/account/team',
    )
  })

  it('applies _id and _splat params with encoding', () => {
    expect(applyPathParams(['posts', '_id'], { id: 'a/b' })).toEqual(['posts', 'a%2Fb'])
    expect(applyPathParams(['files', '_splat'], { _splat: 'a/b' })).toEqual(['files', 'a%2Fb'])
    expect(applyPathParams(['users', '_id'], { id: '../admin' })).toEqual(['users', '..%2Fadmin'])
    expect(applyPathParams(['tags', '_name'], { name: 'café' })).toEqual(['tags', 'caf%C3%A9'])
  })

  it('throws when required path params are missing', () => {
    expect(() => applyPathParams(['posts', '_id'], {})).toThrow('Missing path param "id"')
    expect(() => applyPathParams(['files', '_splat'], {})).toThrow('Missing path param "_splat"')
  })

  it('merges static and async headers', async () => {
    const headers = await resolveHeaders(
      { 'X-Static': '1' },
      async () => ({ 'X-Async': '2' }),
      undefined,
    )
    expect(headers).toEqual({ 'X-Static': '1', 'X-Async': '2' })
  })

  it('builds query strings', () => {
    expect(buildSearchParams({ name: 'John', tags: ['a', 'b'] })).toBe('?name=John&tags=a&tags=b')
    expect(buildSearchParams(undefined)).toBe('')
  })
})

type FetchCall = [input: string, init?: RequestInit]

describe('createClient', () => {
  it('sends JSON body for object payloads', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ ok: true })))
    const client = createClient({
      baseUrl: 'http://localhost:3000/api',
      fetch: fetchMock,
    })

    // Runtime proxy — cast through unknown for unit test without full app brand
    const anyClient = client as unknown as {
      hello: { $post: (args: { body: { name: string } }) => Promise<Response> }
    }

    await anyClient.hello.$post({ body: { name: 'Ada' } })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as FetchCall
    expect(url).toBe('http://localhost:3000/api/hello')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ name: 'Ada' }))
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('sends FormData without forcing JSON content-type', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('ok'))
    const client = createClient({
      baseUrl: 'http://localhost:3000/api',
      fetch: fetchMock,
    })

    const form = new FormData()
    form.set('file', 'x')

    const anyClient = client as unknown as {
      upload: { $post: (args: { body: FormData }) => Promise<Response> }
    }
    await anyClient.upload.$post({ body: form })

    const [, init] = fetchMock.mock.calls[0] as unknown as FetchCall
    expect(init?.body).toBe(form)
    expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('substitutes path params and query', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('ok'))
    const client = createClient({
      baseUrl: 'http://localhost:3000/api',
      fetch: fetchMock,
    })

    const anyClient = client as unknown as {
      posts: {
        _id: {
          $get: (args: { param: { id: string }, query?: { draft?: string } }) => Promise<Response>
        }
      }
    }

    await anyClient.posts._id.$get({ param: { id: '42' }, query: { draft: '1' } })

    const [url, init] = fetchMock.mock.calls[0] as unknown as FetchCall
    expect(url).toBe('http://localhost:3000/api/posts/42?draft=1')
    expect(init?.method).toBe('GET')
  })

  it('memoizes proxy nodes for repeated property access', () => {
    const client = createClient({ baseUrl: 'http://localhost:3000/api' })
    const anyClient = client as unknown as {
      hello: { $get: () => Promise<Response> }
      posts: { _id: { $get: () => Promise<Response> } }
    }

    expect(anyClient.hello).toBe(anyClient.hello)
    expect(anyClient.posts._id).toBe(anyClient.posts._id)
    expect(anyClient.posts).toBe(anyClient.posts)
  })
})
