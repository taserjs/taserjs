import type { LayoutFile } from '../types/index.js'
import { toPosixPath } from '../support/paths.js'

function lastSegment(layoutId: string): string {
  return layoutId.includes('/') ? layoutId.slice(layoutId.lastIndexOf('/') + 1) : layoutId
}

function isPathlessLayoutId(layoutId: string): boolean {
  const segment = lastSegment(layoutId)
  return segment.startsWith('_') && !segment.endsWith('_')
}

function isSegmentPathlessBreakLayoutId(layoutId: string): boolean {
  const segment = lastSegment(layoutId)
  return segment.endsWith('_') && segment.length > 1
}

function segmentPathlessBreakPrefix(layoutId: string): string {
  const segment = lastSegment(layoutId)
  const base = segment.slice(0, -1)
  const parent = layoutId.includes('/') ? `${layoutId.slice(0, layoutId.lastIndexOf('/'))}/` : ''
  return `${parent}${base}/`
}

function layoutDepth(layoutId: string): number {
  if (layoutId.endsWith('/$')) {
    const prefix = layoutId.slice(0, -2)
    return prefix === '' ? 0 : prefix.split('/').length + 1
  }

  return layoutId.split('/').length
}

export function layoutAppliesToRoute(layoutId: string, routeWithoutVerb: string): boolean {
  const route = toPosixPath(routeWithoutVerb)

  if (layoutId === 'index') {
    return route === 'index'
  }

  if (layoutId.endsWith('/$')) {
    const prefix = layoutId.slice(0, -2)
    if (prefix === '') {
      return true
    }
    return route.startsWith(`${prefix}/`)
  }

  if (isSegmentPathlessBreakLayoutId(layoutId)) {
    const prefix = segmentPathlessBreakPrefix(layoutId)
    return route.startsWith(prefix)
  }

  const layoutRest = layoutId

  const pathlessIndex = layoutRest.indexOf('/_')
  if (pathlessIndex !== -1) {
    const base = layoutRest.slice(0, pathlessIndex)
    const pathless = layoutRest.slice(pathlessIndex + 1)
    const prefix = base ? `${base}/${pathless}/` : `${pathless}/`
    return route.startsWith(prefix)
  }

  if (isPathlessLayoutId(layoutRest)) {
    const prefix = `${layoutRest}/`
    return route.startsWith(prefix)
  }

  if (layoutRest.endsWith('/index')) {
    const prefix = layoutRest.slice(0, -'/index'.length)
    return route === (prefix ? `${prefix}/index` : 'index')
  }

  if (!layoutRest.includes('/')) {
    return route === layoutRest || route.startsWith(`${layoutRest}/`)
  }

  return route === layoutRest || route.startsWith(`${layoutRest}/`)
}

export function routeLayoutChain(routeWithoutVerb: string, layouts: LayoutFile[]): string[] {
  return layouts
    .filter(layout => layoutAppliesToRoute(layout.id, routeWithoutVerb))
    .sort((left, right) => layoutDepth(left.id) - layoutDepth(right.id))
    .map(layout => layout.id)
}

export function layoutParentId(layoutId: string, layoutIds: Set<string>): string | null {
  if (layoutId === '/$') {
    return null
  }

  if (layoutId.endsWith('/$')) {
    const parent = layoutId.slice(0, -2)
    return layoutIds.has(parent) ? parent : null
  }

  if (!layoutId.includes('/')) {
    return layoutIds.has('/$') ? '/$' : null
  }

  const parent = layoutId.slice(0, layoutId.lastIndexOf('/'))
  return layoutIds.has(parent) ? parent : null
}
