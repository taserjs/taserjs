import { ImageResponse } from 'takumi-js/response'
import fs from 'fs/promises'
import { OpenGraphTemplate, OpenGraphTemplateProps } from '@/components/og'
import path from 'path'

export type OpenGraphImageProps = Omit<OpenGraphTemplateProps, 'assets'>

const __dirname = path.dirname(new URL(import.meta.url).pathname)

async function loadAssets() {
  const [heroGlow, logo] = await Promise.all([
    fs.readFile(path.join(__dirname, '..', 'assets', 'hero-glow.svg'), 'base64'),
    fs.readFile(path.join(__dirname, '..', 'assets', 'logo.svg'), 'base64'),
  ])
  return {
    heroGlow,
    logo,
  }
}

function loadStyles() {
  return fs.readFile(path.join(__dirname, '..', 'assets', 'og.css'), 'utf-8')
}

export async function OpenGraphImage({ title, description }: OpenGraphImageProps) {
  const assets = await loadAssets()
  const styles = await loadStyles()

  return new ImageResponse(
    <OpenGraphTemplate title={title} description={description} assets={assets} />,
    {
      width: 1200,
      height: 630,
      format: 'webp',
      stylesheets: [styles],
    },
  )
}
