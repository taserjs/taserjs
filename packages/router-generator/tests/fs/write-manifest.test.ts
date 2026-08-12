import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'

import { writeManifestIfChanged } from '../../src/fs/write-manifest.js'

describe('writeManifestIfChanged', () => {
  it('skips write when content is unchanged', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'taser-write-'))
    const outputFile = join(dir, 'routeManifest.gen.ts')
    const source = 'export const routeManifest = {} as const\n'

    writeFileSync(outputFile, source, 'utf8')

    const result = await writeManifestIfChanged(outputFile, source)
    expect(result).toBe('skipped')
    expect(readFileSync(outputFile, 'utf8')).toBe(source)
  })

  it('writes when content differs', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'taser-write-'))
    const outputFile = join(dir, 'routeManifest.gen.ts')
    const original = 'export const routeManifest = {} as const\n'
    const updated = 'export const routeManifest = { routes: {} } as const\n'

    writeFileSync(outputFile, original, 'utf8')

    const result = await writeManifestIfChanged(outputFile, updated)
    expect(result).toBe('written')
    expect(readFileSync(outputFile, 'utf8')).toBe(updated)
  })

  it('writes when file does not exist', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'taser-write-'))
    mkdirSync(dir, { recursive: true })
    const outputFile = join(dir, 'nested', 'routeManifest.gen.ts')
    const source = 'export const routeManifest = {} as const\n'

    const result = await writeManifestIfChanged(outputFile, source)
    expect(result).toBe('written')
    expect(readFileSync(outputFile, 'utf8')).toBe(source)
  })
})
