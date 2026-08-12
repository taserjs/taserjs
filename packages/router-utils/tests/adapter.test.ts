import { describe, expect, it } from 'vitest'

import {
  InvalidMountPatternError,
  resolveMountBase,
} from '../src/adapter.js'

describe('resolveMountBase', () => {
  it('accepts root and prefixed wildcard patterns', () => {
    expect(resolveMountBase('/*')).toBe('/')
    expect(resolveMountBase('/api/*')).toBe('/api')
    expect(resolveMountBase('/a/b/*')).toBe('/a/b')
  })

  it('rejects exact mount paths', () => {
    expect(() => resolveMountBase('/')).toThrow(InvalidMountPatternError)
    expect(() => resolveMountBase('/api')).toThrow(InvalidMountPatternError)
  })

  it('rejects named splat patterns', () => {
    expect(() => resolveMountBase('/*splat')).toThrow(InvalidMountPatternError)
    expect(() => resolveMountBase('/api/*splat')).toThrow(InvalidMountPatternError)
  })

  it('rejects Express brace wildcard patterns', () => {
    expect(() => resolveMountBase('/{*splat}')).toThrow(InvalidMountPatternError)
    expect(() => resolveMountBase('/api/{*splat}')).toThrow(InvalidMountPatternError)
  })
})
