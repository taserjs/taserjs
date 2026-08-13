import { homeMetadata, motivationMetadata, sponsorMetadata } from './metadata'
import { pageImageRoute } from './shared'
import type { Metadata } from 'next'

export const source: Record<string, Metadata['openGraph']> = {
  home: homeMetadata.openGraph,
  motivation: motivationMetadata.openGraph,
  sponsor: sponsorMetadata.openGraph,
}

export function getPageImageUrl(slug: string) {
  const segments = [slug, 'image.webp']

  return {
    segments,
    url:
      '/'
      + [...pageImageRoute.split('/'), ...segments].filter(Boolean).join('/'),
  }
}
