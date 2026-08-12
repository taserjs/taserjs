import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'

import { walkRouteFiles } from '../../src/fs/walk.js'
import { scanRouteFiles } from '../../src/scan/scan-routes.js'
import { ScanErrorCollection } from '../../src/support/errors.js'
import { testGeneratorConfig } from '../helpers/test-config.js'

describe('scanRouteFiles errors', () => {
  it('collects virtual route config errors', async () => {
    const routesDir = mkdtempSync(join(tmpdir(), 'taser-scan-error-'))
    const virtualPath = join(routesDir, '__virtual.ts')
    writeFileSync(virtualPath, 'export default {}\n')

    await expect(scanRouteFiles(routesDir, './routes', [virtualPath], testGeneratorConfig)).rejects.toThrow(
      ScanErrorCollection,
    )
  })

  it('reports index.ts and __root.ts conflict together', async () => {
    const routesDir = mkdtempSync(join(tmpdir(), 'taser-root-conflict-'))
    writeFileSync(join(routesDir, 'index.ts'), 'export const Middleware = null;\n')
    writeFileSync(join(routesDir, '__root.ts'), 'export const Middleware = null;\n')

    const files = await walkRouteFiles(routesDir, testGeneratorConfig)

    await expect(scanRouteFiles(routesDir, './routes', files, testGeneratorConfig)).rejects.toThrow(
      ScanErrorCollection,
    )
  })

  it('reports duplicate route path and method', async () => {
    const routesDir = mkdtempSync(join(tmpdir(), 'taser-dup-route-'))
    writeFileSync(join(routesDir, 'posts.get.ts'), 'export const Route = null;\n')
    mkdirSync(join(routesDir, 'posts'))
    writeFileSync(join(routesDir, 'posts', 'index.get.ts'), 'export const Route = null;\n')

    const files = await walkRouteFiles(routesDir, testGeneratorConfig)

    await expect(scanRouteFiles(routesDir, './routes', files, testGeneratorConfig)).rejects.toThrow(
      ScanErrorCollection,
    )
  })

  it('reports invalid route param names', async () => {
    const routesDir = mkdtempSync(join(tmpdir(), 'taser-invalid-param-'))
    writeFileSync(join(routesDir, 'items.$bad-name.get.ts'), 'export const Route = null;\n')

    const files = await walkRouteFiles(routesDir, testGeneratorConfig)

    await expect(scanRouteFiles(routesDir, './routes', files, testGeneratorConfig)).rejects.toThrow(
      ScanErrorCollection,
    )
  })

  it('validates route exports when enabled', async () => {
    const routesDir = mkdtempSync(join(tmpdir(), 'taser-export-validation-'))
    writeFileSync(join(routesDir, 'posts.get.ts'), 'export const Route = null;\n')

    const files = await walkRouteFiles(routesDir, testGeneratorConfig)

    await expect(scanRouteFiles(routesDir, './routes', files, {
      ...testGeneratorConfig,
      validate: true,
    })).rejects.toThrow(ScanErrorCollection)
  })
})
