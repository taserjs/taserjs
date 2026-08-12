import { CLIENT_METHODS } from '../constants/methods.js'

export function isClientMethod(key: string): boolean {
  return CLIENT_METHODS.has(key)
}

export function clientMethodToHttp(method: string): string {
  return method.slice(1).toUpperCase()
}

export function joinUrl(baseUrl: string, segments: string[]): string {
  const base = baseUrl.replace(/\/+$/, '')
  const path = segments
    .filter(segment => segment.length > 0 && segment !== 'index')
    .join('/')
  if (path === '') {
    return `${base}/`
  }
  return `${base}/${path}`
}

export function applyPathParams(
  segments: string[],
  param: Record<string, string> | undefined,
): string[] {
  if (!param) {
    return segments
  }

  return segments.map((segment) => {
    if (segment === '_splat') {
      const value = param._splat
      if (value === undefined) {
        throw new Error('Missing path param "_splat"')
      }
      return encodeURIComponent(value)
    }
    if (segment.startsWith('_')) {
      const name = segment.slice(1)
      const value = param[name]
      if (value === undefined) {
        throw new Error(`Missing path param "${name}"`)
      }
      return encodeURIComponent(value)
    }
    return segment
  })
}

export function buildSearchParams(
  query: Record<string, unknown> | undefined,
): string {
  if (!query) {
    return ''
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
          params.append(key, String(item))
        }
      }
      continue
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params.set(key, String(value))
    }
  }

  const serialized = params.toString()
  return serialized === '' ? '' : `?${serialized}`
}

export async function resolveHeaders(
  ...sources: Array<
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
    | undefined
  >
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const source of sources) {
    if (!source) {
      continue
    }
    const value = typeof source === 'function' ? await source() : source
    Object.assign(result, value)
  }
  return result
}
