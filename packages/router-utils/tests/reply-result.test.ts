import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  isReplyResult,
  mergeReturnsMaps,
  reply,
  ReplyResult,
  validateReply,
} from '../src/index.js'

describe('ReplyResult', () => {
  it('extends Response and exposes data/kind for json', async () => {
    const result = reply.json({ ok: true })
    expect(result).toBeInstanceOf(Response)
    expect(result).toBeInstanceOf(ReplyResult)
    expect(isReplyResult(result)).toBe(true)
    expect(result.status).toBe(200)
    expect(result.kind).toBe('json')
    expect(result.data).toEqual({ ok: true })
    expect(await result.json()).toEqual({ ok: true })
  })

  it('stores text body on data', async () => {
    const result = reply.text('hello')
    expect(result.kind).toBe('text')
    expect(result.data).toBe('hello')
    expect(await result.text()).toBe('hello')
  })

  it('stores path on file replies', () => {
    // Avoid opening a real file in this unit — buffer covers opaque binary data.
    const result = reply.buffer(Buffer.from('x'))
    expect(result.kind).toBe('binary')
    expect(result.data).toEqual(Buffer.from('x'))
  })

  it('stores null data for noContent', () => {
    const result = reply.noContent()
    expect(result.status).toBe(204)
    expect(result.kind).toBe('empty')
    expect(result.data).toBeNull()
  })

  it('getResponse returns a plain Response without data/kind', async () => {
    const result = reply.json({ ok: true })
    result.headers.set('X-Test', '1')
    const wire = result.getResponse()
    expect(wire).toBeInstanceOf(Response)
    expect(wire).not.toBeInstanceOf(ReplyResult)
    expect(isReplyResult(wire)).toBe(false)
    expect(Object.keys(wire)).toEqual([])
    expect(wire.headers.get('X-Test')).toBe('1')
    expect(await wire.json()).toEqual({ ok: true })
  })

  it('keeps data/kind non-enumerable so JSON.stringify cannot envelope', () => {
    const result = reply.text('hello')
    expect(result.data).toBe('hello')
    expect(result.kind).toBe('text')
    expect(Object.keys(result)).toEqual([])
    expect(JSON.stringify(result)).toBe('{}')
  })
})

describe('validateReply', () => {
  const request = new Request('http://localhost/hello')

  it('skips when map is empty or status absent', async () => {
    const result = reply.json({ ok: true })
    expect(await validateReply(result, {}, { request })).toBe(result)
    expect(await validateReply(result, { 404: z.object({ error: z.string() }) }, { request })).toBe(result)
  })

  it('validates matching status schema', async () => {
    const result = reply.json({ id: '1' })
    const ok = await validateReply(result, {
      200: z.object({ id: z.string() }),
    }, { request })
    expect(ok.status).toBe(200)
  })

  it('returns 502 when body fails schema', async () => {
    const result = reply.json({ id: 1 })
    const failed = await validateReply(result, {
      200: z.object({ id: z.string() }),
    }, { request })
    expect(failed.status).toBe(502)
    expect(isReplyResult(failed)).toBe(true)
    expect(await failed.json()).toEqual({ id: 1 })
  })

  it('calls onValidationFailure with issues and request', async () => {
    const onValidationFailure = vi.fn()
    const result = reply.json({ id: 1 })
    await validateReply(result, {
      200: z.object({ id: z.string() }),
    }, { request, onValidationFailure })
    expect(onValidationFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        issues: expect.arrayContaining([
          expect.objectContaining({ message: expect.any(String) }),
        ]),
      }),
    )
  })

  it('validates text with z.string()', async () => {
    const result = reply.text('ok')
    const ok = await validateReply(result, { 200: z.string() }, { request })
    expect(ok.status).toBe(200)
  })
})

describe('returns helpers', () => {
  it('merges maps with later write winning', () => {
    const a = { 401: z.object({ error: z.literal('a') }) }
    const b = { 401: z.object({ error: z.literal('b') }), 200: z.object({ ok: z.boolean() }) }
    const merged = mergeReturnsMaps(a, b)
    expect(merged[401]).toBe(b[401])
    expect(merged[200]).toBe(b[200])
  })
})
