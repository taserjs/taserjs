export const appName = 'Taser'
export const appDescription = 'Type-safe file-based routing for Node.js APIs'
export const docsRoute = '/docs'

/** Update when GitHub Sponsors (or similar) is live. */
export const sponsorUrl = 'mailto:sponsors@taserjs.dev'

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: 'taserjs',
  repo: 'taserjs',
  branch: 'main',
}

export function encodeMarkdownUrl(slugs: string[], locale?: string) {
  const segments = [...slugs]
  if (segments.length === 0) {
    segments.push('index.md')
  }
  else {
    segments[segments.length - 1] += '.md'
  }

  return '/' + [locale, ...docsRoute.split('/'), ...segments].filter(Boolean).join('/')
}

/** @returns page slugs */
export function decodeMarkdownUrl(segments: string[]) {
  if (segments.length === 0) return []

  const out = [...segments]
  out[out.length - 1] = out[out.length - 1].replace(/\.md$/, '')
  if (out.length === 1 && out[0] === 'index') out.pop()
  return out
}
