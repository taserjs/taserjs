import { describe, it } from 'vitest'

import type { PathParams } from '../src/types/index.js'
import type { AssertTrue, ExpectEqual } from './helpers.js'

describe('PathParams', () => {
  it('parses dynamic segments', () => {
    type Params = PathParams<'/todo/:id'>
    const _check: AssertTrue<ExpectEqual<Params, { id: string }>> = true
    void _check
  })

  it('parses splat segments', () => {
    type Params = PathParams<'/files/*'>
    const _check: AssertTrue<ExpectEqual<Params, { _splat: string }>> = true
    void _check
  })
})
