import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'

import { emitRouteManifestSource } from '../src/codegen/emit-route-manifest.js'
import { buildTestModel, testEmitOptions } from './helpers/test-config.js'

describe('emitRouteManifestSource snapshot', () => {
  it('matches golden manifest output', async () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'taser-snapshot-'))
    const routesDir = join(fixtureRoot, 'routes')
    const outputFile = join(fixtureRoot, 'routeManifest.gen.ts')
    mkdirSync(routesDir, { recursive: true })

    writeFileSync(join(routesDir, '$.ts'), 'export const Middleware = null;\n')
    writeFileSync(join(routesDir, 'index.ts'), 'export const Middleware = null;\n')
    writeFileSync(join(routesDir, 'index.get.ts'), 'export const Route = null;\n')
    writeFileSync(join(routesDir, 'posts.$id.get.ts'), 'export const Route = null;\n')

    const model = await buildTestModel(routesDir, outputFile)
    const source = emitRouteManifestSource(model, testEmitOptions)
      .replaceAll(fixtureRoot.replace(/\\/g, '/'), '<fixture>')
      .replaceAll(fixtureRoot.replace(/\//g, '\\'), '<fixture>')

    expect(source).toMatchSnapshot()
    expect(source).toContain('.js')
  })
})

describe('emitRouteManifestSource', () => {
  it('emits unified routeManifest with layouts and routes trees', async () => {
    const routesDir = mkdtempSync(join(tmpdir(), 'taser-manifest-'))
    const outputFile = join(routesDir, '..', 'routeManifest.gen.ts')

    writeFileSync(join(routesDir, '$.ts'), 'export const Middleware = null;\n')
    writeFileSync(join(routesDir, 'index.ts'), 'export const Middleware = null;\n')
    writeFileSync(join(routesDir, 'index.get.ts'), 'export const Route = null;\n')

    const model = await buildTestModel(routesDir, outputFile)
    const source = emitRouteManifestSource(model, testEmitOptions)

    expect(source).toContain('export const routeManifest =')
    expect(source).toContain('layouts:')
    expect(source).toContain('routes:')
    expect(source).toContain('"/$"')
    expect(source).toContain('layoutChain:')
    expect(source).not.toContain('AppContext')
  })
})
