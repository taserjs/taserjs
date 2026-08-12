import type { BootBinding } from '../addons/types.js'
import type { ScaffoldContext } from '../core/types.js'

export function packageJsonTemplate(projectName: string, scripts: Record<string, string> = {}): string {
  const pkg = {
    name: projectName,
    version: '1.0.0',
    private: true,
    type: 'module',
    imports: {
      '#src/*': './src/*',
    },
    scripts: {
      'dev': 'run-p dev:server dev:taser',
      'dev:server': 'tsx watch src/index.ts',
      'dev:taser': 'taser watch',
      'start': 'tsx src/index.ts',
      'generate': 'taser generate',
      'build': 'taser generate && tsdown build',
      'serve': 'node dist/index.js',
      'typecheck': 'tsc --noEmit -p tsconfig.json',
      ...scripts,
    },
  }

  return `${JSON.stringify(pkg, null, 2)}\n`
}

export function tsdownConfigTemplate(): string {
  return `import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
})
`
}

export function tsconfigTemplate(): string {
  return `${JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      paths: {
        '#src/*': ['./src/*'],
      },
      strict: true,
      skipLibCheck: true,
      verbatimModuleSyntax: true,
      isolatedModules: true,
      noEmit: true,
      types: ['node'],
    },
    include: ['src'],
  }, null, 2)}\n`
}

export function gitignoreTemplate(): string {
  return `node_modules
dist
.DS_Store
*.log
.env
local.db
drizzle
`
}

export function contextTemplate(bindings: BootBinding[]): string {
  const imports = bindings.map(
    binding => `import { ${binding.factoryName} } from '${binding.importPath}'`,
  )

  const bootBody = bindings.length > 0
    ? bindings.map(binding => `    ${binding.key}: ${binding.factoryName}(),`).join('\n')
    : ''

  const bootBlock = bindings.length > 0
    ? `  boot: () => ({\n${bootBody}\n  }),`
    : ''

  const importBlock = imports.length > 0 ? `${imports.join('\n')}\n\n` : ''

  return `${importBlock}import { createContext } from '@taserjs/router'

export const context = createContext({
${bootBlock}
  request: () => ({
    requestId: crypto.randomUUID(),
  }),
})
`
}

export function rootLayoutTemplate(): string {
  return `import { bodyLimit } from '@taserjs/router/body-limit'
import { secureHeaders } from '@taserjs/router/secure-headers'

import { t } from '#src/taser.js'

export const Middleware = t.middleware('/$')
  .use(secureHeaders())
  .use(bodyLimit({ maxSize: 1_000_000 }))
`
}

export function indexRouteTemplate(): string {
  return `import { t } from '#src/taser.js'

export const Route = t.get('/').handler((ctx) => {
  return ctx.reply.json({ message: 'Welcome to Taser' })
})
`
}

export function healthRouteTemplate(ctx: ScaffoldContext): string {
  const lines: string[] = []

  if (ctx.logger) {
    lines.push('  ctx.logger.info(\'health check\')')
  }

  if (ctx.db) {
    lines.push('  // ctx.db is available from context boot')
  }

  const body = lines.length > 0 ? `${lines.join('\n')}\n` : ''

  return `import { t } from '#src/taser.js'

export const Route = t.get('/health').handler((ctx) => {
${body}  return ctx.reply.json({ ok: true })
})
`
}

/** Minimal placeholder until `taser generate` runs. */
export function starterManifestTemplate(): string {
  return `/* eslint-disable */
// Run \`pnpm generate\` (taser generate) to replace this file.
import { Middleware as RootSplatLayoutImport } from './routes/$.js'
import { Route as RootIndexGetRouteImport } from './routes/index.get.js'
import { Route as HealthGetRouteImport } from './routes/health.get.js'

export const routeManifest = {
  layouts: {
    '/$': {
      middlewares: RootSplatLayoutImport,
    },
  },
  routes: {
    '/': {
      GET: {
        layoutChain: ['/$'],
        route: RootIndexGetRouteImport,
      },
    },
    '/health': {
      GET: {
        layoutChain: ['/$'],
        route: HealthGetRouteImport,
      },
    },
  },
} as const

export type RoutePathGen = '/' | '/health'
export type LayoutIdGen = '/$'
export type LayoutTreeGen = {
  '/$': {
    parent: null
    middlewares: typeof RootSplatLayoutImport
  }
}
export type RouteByPathMethodGen = {
  '/': {
    GET: {
      parent: '/$'
      layoutChain: ['/$']
      route: typeof RootIndexGetRouteImport
    }
  }
  '/health': {
    GET: {
      parent: '/$'
      layoutChain: ['/$']
      route: typeof HealthGetRouteImport
    }
  }
}
export type RouteManifest = typeof routeManifest

declare module '@taserjs/router' {
  interface RouterRegister {
    RoutePath: RoutePathGen
    LayoutId: LayoutIdGen
    LayoutTree: LayoutTreeGen
    RouteByPathMethod: RouteByPathMethodGen
  }
}
`
}
