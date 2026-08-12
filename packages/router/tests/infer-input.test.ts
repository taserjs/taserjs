import './register.js'
import { describe, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { reply } from '../src/index.js'
import { t } from './fixtures/index-layout.js'

describe('route $Infer.Input', () => {
  it('exposes route query and body facets', () => {
    const route = t.post('/', {
      query: z.object({ name: z.string() }),
      body: z.object({ name: z.string() }),
    }).handler(() => reply.json({ ok: true }))

    type Input = (typeof route)['$Infer']['Input']
    expectTypeOf<Input>().toEqualTypeOf<{
      query: { page?: number, name: string }
      body: { name: string }
    }>()
  })

  it('omits body facet on GET routes', () => {
    const route = t.get('/hello', {
      query: z.object({ q: z.string() }),
    }).handler(() => reply.json({ ok: true }))

    type Input = (typeof route)['$Infer']['Input']
    expectTypeOf<Input>().toEqualTypeOf<{ query: { q: string } }>()
    expectTypeOf<Input>().not.toHaveProperty('body')
  })

  it('merges layout optional query with route required query', () => {
    const route = t.post('/', {
      query: z.object({ name: z.string() }),
      body: z.object({ tag: z.string() }),
    }).handler(() => reply.json({ ok: true }))

    type Input = (typeof route)['$Infer']['Input']
    expectTypeOf<Input['query']>().toEqualTypeOf<{ page?: number, name: string }>()
    expectTypeOf<Input['body']>().toEqualTypeOf<{ tag: string }>()
  })
})
