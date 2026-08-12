import { describe, expect, it } from 'vitest'

import { buildUrlPath } from '../src/scan/url-path.js'

describe('buildUrlPath', () => {
  it('builds index routes', () => {
    expect(buildUrlPath('index.get.ts')).toBe('/')
    expect(buildUrlPath('todo/index.get.ts')).toBe('/todo')
  })

  it('skips pathless segments', () => {
    expect(buildUrlPath('_public/health.get.ts')).toBe('/health')
    expect(buildUrlPath('todo/_auth/$id.patch.ts')).toBe('/todo/:id')
  })

  it('builds splat routes', () => {
    expect(buildUrlPath('files/$.get.ts')).toBe('/files/*')
  })

  it('handles segment pathless break segments', () => {
    expect(buildUrlPath('posts/$id/edit.get.ts')).toBe('/posts/:id/edit')
  })
})
