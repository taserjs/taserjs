import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'

import { findConfigFile, resolveGeneratorConfig } from '../../src/config/resolve.js'
import { CONFIG_FILE_NAME } from '../../src/config/schema.js'

describe('resolveGeneratorConfig', () => {
  it('merges taser.config.json with CLI overrides', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'taser-config-'))
    const configFile = join(configDir, CONFIG_FILE_NAME)
    writeFileSync(configFile, JSON.stringify({
      routes: 'routes',
      output: 'manifest.gen.ts',
      quiet: false,
      ignorePrefix: '-',
    }), 'utf8')

    const resolved = resolveGeneratorConfig({
      configFile,
      routes: join(configDir, 'custom-routes'),
      quiet: true,
    })

    expect(resolved.configFile).toBe(configFile)
    expect(resolved.configDir).toBe(configDir)
    expect(resolved.routesDir).toBe(join(configDir, 'custom-routes'))
    expect(resolved.outputFile).toBe(join(configDir, 'manifest.gen.ts'))
    expect(resolved.quiet).toBe(true)
    expect(resolved.ignorePrefix).toBe('-')
  })

  it('applies routes override without a config file', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'taser-config-'))
    const configFile = join(configDir, CONFIG_FILE_NAME)
    const resolved = resolveGeneratorConfig({
      configFile,
      routes: 'app/routes',
    })

    expect(resolved.routesDir).toBe(join(configDir, 'app/routes'))
    expect(resolved.routes).toBe('app/routes')
  })

  it('resolves paths relative to config file directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'taser-config-nested-'))
    const nested = join(root, 'apps', 'api')
    mkdirSync(nested, { recursive: true })
    const configFile = join(nested, CONFIG_FILE_NAME)
    writeFileSync(configFile, JSON.stringify({
      routes: 'src/routes',
      output: 'src/routeManifest.gen.ts',
    }), 'utf8')

    const resolved = resolveGeneratorConfig({ configFile })
    expect(resolved.routesDir).toBe(join(nested, 'src/routes'))
    expect(resolved.outputFile).toBe(join(nested, 'src/routeManifest.gen.ts'))
  })
})

describe('findConfigFile', () => {
  it('returns the path to taser.config.json when present', () => {
    const root = mkdtempSync(join(tmpdir(), 'taser-find-cfg-'))
    const configFile = join(root, CONFIG_FILE_NAME)
    writeFileSync(configFile, '{}', 'utf8')
    const nested = join(root, 'src', 'routes', 'account')
    mkdirSync(nested, { recursive: true })

    expect(findConfigFile(nested)).toBe(configFile)
  })

  it('falls back to package.json directory when config file is absent', () => {
    const root = mkdtempSync(join(tmpdir(), 'taser-find-pkg-'))
    writeFileSync(join(root, 'package.json'), '{}', 'utf8')
    const nested = join(root, 'src', 'routes', 'account')
    mkdirSync(nested, { recursive: true })

    expect(findConfigFile(nested)).toBe(join(root, CONFIG_FILE_NAME))
  })
})
