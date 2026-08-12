export type SiteOgPage = 'home' | 'sponsor' | 'motivation'

export const sitePages = {
  home: {
    title: 'Taser',
    description: 'Type-safe file-based routing for APIs in your choice of frameworks: Hono, Express, Fastify and more.',
  },
  sponsor: {
    title: 'Support Us',
    description: 'Help us sustain the development of the Router you love.',
  },
  motivation: {
    title: 'Why Taser exists',
    description: 'Inspired by TanStack Router, built on Hono as base for APIs that scale and run anywhere.',
  },
} as const satisfies Record<SiteOgPage, { title: string, description: string }>

const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

export function getDocsOgImageUrl(slugs: string[]) {
  const segments = [...slugs, 'image.webp']
  return `/og/docs/${segments.join('/')}`
}

export function getSiteOgImageUrl(page: SiteOgPage) {
  return `/og/${page}/image.webp`
}

export function openGraphMeta({
  title,
  description,
  image,
}: {
  title: string
  description: string
  image: string
}) {
  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image },
    { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
    { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ]
}
