import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, describe, expect, it } from 'vitest'

import { CONFIG_FILE_NAME } from '../../src/constants.js'
import { Generator } from '../../src/generator/generator.js'

function generatorOptions(configDir: string, routesDir: string, outputFile: string) {
  return {
    configFile: join(configDir, CONFIG_FILE_NAME),
    routes: routesDir,
    output: outputFile,
    validate: false,
    format: false,
  }
}

describe('Generator persistent cache', () => {
  const tempDirs: string[] = []

  afterEach(() => {
    tempDirs.length = 0
  })

  it('skips work when cache matches unchanged route files', async () => {
    const configDir = mkdtempSync(join(tmpdir(), 'taser-cache-'))
    tempDirs.push(configDir)
    const routesDir = join(configDir, 'src', 'routes')
    const outputFile = join(configDir, 'src', 'routeManifest.gen.ts')
    mkdirSync(routesDir, { recursive: true })

    writeFileSync(join(routesDir, 'index.get.ts'), 'export const Route = null;\n')

    const generator = new Generator(generatorOptions(configDir, routesDir, outputFile))
    const first = await generator.run()
    expect(first.written).toBe(true)

    const secondGenerator = new Generator(generatorOptions(configDir, routesDir, outputFile))
    const second = await secondGenerator.run()
    expect(second.skippedWork).toBe(true)
  })

  it('regenerates when force is set', async () => {
    const configDir = mkdtempSync(join(tmpdir(), 'taser-cache-force-'))
    tempDirs.push(configDir)
    const routesDir = join(configDir, 'src', 'routes')
    const outputFile = join(configDir, 'src', 'routeManifest.gen.ts')
    mkdirSync(routesDir, { recursive: true })

    writeFileSync(join(routesDir, 'index.get.ts'), 'export const Route = null;\n')

    const generator = new Generator(generatorOptions(configDir, routesDir, outputFile))
    await generator.run()

    const forced = new Generator({
      ...generatorOptions(configDir, routesDir, outputFile),
      force: true,
    })
    const result = await forced.run()
    expect(result.skippedWork).toBe(false)
    expect(result.written).toBe(true)
  })
})
