import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { ensureReplyResult, isReplyResult, reply, ReplyResult } from '../src/index.js'

describe('ensureReplyResult', () => {
  it('passes through ReplyResult', () => {
    const result = reply.json({ ok: true })
    expect(ensureReplyResult(result)).toBe(result)
  })

  it('coerces nullish to noContent', () => {
    const result = ensureReplyResult(undefined)
    expect(result).toBeInstanceOf(ReplyResult)
    expect(result.status).toBe(204)
  })

  it('coerces plain objects to json', async () => {
    const result = ensureReplyResult({ a: 1 })
    expect(isReplyResult(result)).toBe(true)
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ a: 1 })
  })

  it('wraps bare Response', () => {
    const bare = new Response('hi', { status: 201 })
    const result = ensureReplyResult(bare)
    expect(isReplyResult(result)).toBe(true)
    expect(result.status).toBe(201)
  })
})
