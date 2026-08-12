import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  dependencies?: Record<string, string>
}

describe('package dependencies', () => {
  it('does not list server runtime packages in production dependencies', () => {
    const dependencies = packageJson.dependencies ?? {}
    expect(dependencies).not.toHaveProperty('@taserjs/router')
    expect(dependencies).not.toHaveProperty('@taserjs/router-core')
    expect(dependencies).not.toHaveProperty('hono')
  })

  it('only depends on object-to-formdata at runtime', () => {
    const dependencies = packageJson.dependencies ?? {}
    expect(Object.keys(dependencies)).toEqual(['object-to-formdata'])
  })
})
