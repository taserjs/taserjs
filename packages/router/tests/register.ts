import type {} from '../src/index.js'

import type { IndexLayout } from './fixtures/index-layout.js'

declare module '@taserjs/router' {
  interface RouterRegister {
    RoutePath: '/' | '/hello' | '/reports' | '/search'
    LayoutId: 'index'
    LayoutTree: {
      index: { middlewares: typeof IndexLayout, parent: null }
    }
    RouteByPathMethod: {
      '/': {
        POST: { layoutChain: readonly ['index'], route: unknown }
      }
      '/hello': {
        GET: { layoutChain: readonly [], route: unknown }
      }
      '/reports': {
        GET: { layoutChain: readonly [], route: unknown }
      }
      '/search': {
        GET: { layoutChain: readonly [], route: unknown }
      }
    }
  }
}

export {}
