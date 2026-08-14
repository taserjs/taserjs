import { resolveAddons } from '../addons/registry.js'
import type { PackageGroups, ScaffoldContext, Framework } from '../core/types.js'

function frameworkPackages(framework: Framework): PackageGroups {
  const dependencies = ['@taserjs/router']
  const devDependencies = [
    '@taserjs/router-cli',
    'npm-run-all2',
    'tsdown',
    'tsx',
    'typescript',
    '@types/node',
  ]
  const scripts: Record<string, string> = {}

  switch (framework) {
    case 'express':
      dependencies.push('@taserjs/adapter-express', 'express')
      devDependencies.push('@types/express')
      break
    case 'hono':
      dependencies.push('@hono/node-server', 'hono')
      break
    case 'fastify':
      dependencies.push('@taserjs/adapter-fastify', 'fastify')
      break
    case 'node':
    default:
      dependencies.push('@taserjs/adapter-node')
      break
  }

  return { dependencies, devDependencies, scripts }
}

export function resolvePackages(ctx: ScaffoldContext): PackageGroups {
  const base = frameworkPackages(ctx.framework)
  const addons = resolveAddons(ctx)

  const dependencies = [...base.dependencies]
  const devDependencies = [...base.devDependencies]
  const scripts = { ...base.scripts }

  for (const addon of addons) {
    dependencies.push(...addon.dependencies(ctx))
    devDependencies.push(...addon.devDependencies(ctx))
    if (addon.scripts) {
      Object.assign(scripts, addon.scripts(ctx))
    }
  }

  return {
    dependencies: [...new Set(dependencies)],
    devDependencies: [...new Set(devDependencies)],
    scripts,
  }
}

// Backward-compatible export for tests during migration
export function getPackageGroups(framework: Framework): Omit<PackageGroups, 'scripts'> & { scripts?: Record<string, string> } {
  const groups = frameworkPackages(framework)
  return groups
}
