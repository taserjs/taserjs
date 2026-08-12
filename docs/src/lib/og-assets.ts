import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../public',
)

export type OgAssets = {
  logo: string
  heroGlow: string
}

async function toDataUrl(fileName: string, mime: string) {
  const buffer = await readFile(path.join(publicDir, fileName))
  return `data:${mime};base64,${buffer.toString('base64')}`
}

let assetsPromise: Promise<OgAssets> | null = null

export function loadOgAssets() {
  assetsPromise ??= Promise.all([
    toDataUrl('logo.svg', 'image/svg+xml'),
    toDataUrl('hero-glow.svg', 'image/svg+xml'),
  ]).then(([logo, heroGlow]) => ({ logo, heroGlow }))

  return assetsPromise
}
