import { ImageResponse } from 'takumi-js/response'

import { OgImageTemplate } from '@/components/og/og-image-template'
import { loadOgAssets } from '@/lib/og-assets'
import ogStylesheet from '@/styles/og-image.css?inline'

const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

export async function createOgImageResponse(title: string, description: string) {
  const assets = await loadOgAssets()

  return new ImageResponse(
    <OgImageTemplate title={title} description={description} assets={assets} />,
    {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      format: 'webp',
      stylesheets: [ogStylesheet],
    },
  )
}
