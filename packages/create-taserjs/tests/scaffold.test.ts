import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { getCapabilitiesCatalog } from '../src/addons/registry.js'
import { validateProjectName } from '../src/core/validate-project-name.js'
import { resolveUserAgent } from '../src/core/package-manager.js'
import { getPackageGroups, resolvePackages, scaffoldProject } from '../src/scaffold.js'

describe('validateProjectName', () => {
  it('rejects traversal and separators', () => {
    expect(validateProjectName('../escape')).toBeDefined()
    expect(validateProjectName('foo/bar')).toBeDefined()
    expect(validateProjectName('')).toBe('Project name is required')
  })

  it('accepts valid names', () => {
    expect(validateProjectName('my-taser-app')).toBeUndefined()
    expect(validateProjectName('my_app')).toBeUndefined()
  })
})

describe('scaffoldProject', () => {
  it('writes a node project without router-client', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'create-taser-'))
    try {
      await scaffoldProject({
        projectName: 'demo',
        targetDir: dir,
        framework: 'node',
        skipInstall: true,
      })

      const index = await readFile(path.join(dir, 'src/index.ts'), 'utf8')
      expect(index).not.toContain('TaserAppRouter')
      expect(index).not.toContain('@taserjs/router-client')
      expect(index).toContain('@taserjs/adapter-node')
      expect(index).toContain('#src/taser.js')
      expect(index).toContain('#src/routeManifest.gen.js')

      const pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>
        imports?: Record<string, string>
        scripts: Record<string, string>
      }
      expect(pkg.imports?.['#src/*']).toBe('./src/*')
      expect(pkg.scripts.build).toBe('taser generate && tsdown')
      expect(pkg.scripts.serve).toBe('node dist/index.mjs')

      const tsdownConfig = await readFile(path.join(dir, 'tsdown.config.ts'), 'utf8')
      expect(tsdownConfig).toContain("entry: ['./src/index.ts']")

      const tsconfig = JSON.parse(await readFile(path.join(dir, 'tsconfig.json'), 'utf8')) as {
        compilerOptions: { baseUrl?: string, paths?: Record<string, string[]> }
      }
      expect(tsconfig.compilerOptions.paths?.['#src/*']).toEqual(['./src/*'])

      const manifest = await readFile(path.join(dir, 'src/routeManifest.gen.ts'), 'utf8')
      expect(manifest).toContain('routeManifest')

      const indexRoute = await readFile(path.join(dir, 'src/routes/index.get.ts'), 'utf8')
      expect(indexRoute).toContain('#src/taser.js')

      const taserTs = await readFile(path.join(dir, 'src/taser.ts'), 'utf8')
      expect(taserTs).toContain('response: { validate: true }')
      expect(taserTs).toContain('#src/context.js')

      const rootLayout = await readFile(path.join(dir, 'src/routes/$.ts'), 'utf8')
      expect(rootLayout).toContain('secureHeaders')
      expect(rootLayout).toContain('bodyLimit')
      expect(rootLayout).toContain('#src/taser.js')

      expect(pkg.dependencies).toBeUndefined()
      expect(pkg.scripts.dev).toBe('run-p dev:server dev:taser')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('scaffolds drizzle postgres with db in context boot', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'create-taser-drizzle-'))
    try {
      await scaffoldProject({
        projectName: 'demo-db',
        targetDir: dir,
        framework: 'node',
        db: 'drizzle',
        driver: 'postgres',
        skipInstall: true,
      })

      const context = await readFile(path.join(dir, 'src/context.ts'), 'utf8')
      expect(context).toContain('boot:')
      expect(context).toContain('db: createDb()')

      const packages = resolvePackages({
        projectName: 'demo-db',
        targetDir: dir,
        framework: 'node',
        db: 'drizzle',
        driver: 'postgres',
      })
      expect(packages.dependencies).toContain('drizzle-orm')
      expect(packages.dependencies).toContain('pg')

      await expect(readFile(path.join(dir, 'src/db/index.ts'), 'utf8')).resolves.toContain('createDb')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('defaults drizzle driver to sqlite when only odm is set', async () => {
    const packages = resolvePackages({
      projectName: 'demo',
      targetDir: '/tmp/demo',
      framework: 'node',
      db: 'drizzle',
      driver: 'sqlite',
    })
    expect(packages.dependencies).toContain('better-sqlite3')
  })

  it('scaffolds pino logger in context boot', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'create-taser-pino-'))
    try {
      await scaffoldProject({
        projectName: 'demo-log',
        targetDir: dir,
        framework: 'node',
        logger: 'pino',
        skipInstall: true,
      })

      const context = await readFile(path.join(dir, 'src/context.ts'), 'utf8')
      expect(context).toContain('logger: createLogger()')

      const health = await readFile(path.join(dir, 'src/routes/health.get.ts'), 'utf8')
      expect(health).toContain('ctx.logger.info')

      const packages = resolvePackages({
        projectName: 'demo-log',
        targetDir: dir,
        framework: 'node',
        logger: 'pino',
      })
      expect(packages.dependencies).toContain('pino')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('scaffolds zod validator', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'create-taser-zod-'))
    try {
      await scaffoldProject({
        projectName: 'demo-zod',
        targetDir: dir,
        framework: 'node',
        validator: 'zod',
        skipInstall: true,
      })
      const index = await readFile(path.join(dir, 'src/routes/index.get.ts'), 'utf8')
      expect(index).toContain('import { z } from \'zod\'')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('scaffolds express mount pattern', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'create-taser-express-'))
    try {
      await scaffoldProject({
        projectName: 'demo-express',
        targetDir: dir,
        framework: 'express',
        skipInstall: true,
      })
      const index = await readFile(path.join(dir, 'src/index.ts'), 'utf8')
      expect(index).toContain('/api{/*splat}')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('writes .taser.json project config', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'create-taser-config-'))
    try {
      await scaffoldProject({
        projectName: 'demo-config',
        targetDir: dir,
        framework: 'hono',
        db: 'prisma',
        driver: 'mysql',
        logger: 'winston',
        skipInstall: true,
      })

      const config = JSON.parse(await readFile(path.join(dir, '.taser.json'), 'utf8')) as {
        framework: string
        db: string
        driver: string
        logger: string
      }
      expect(config).toEqual({
        framework: 'hono',
        db: 'prisma',
        driver: 'mysql',
        logger: 'winston',
      })
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('getPackageGroups', () => {
  it('groups node deps and devDeps', () => {
    const groups = getPackageGroups('node')
    expect(groups.dependencies).toEqual([
      '@taserjs/router',
      '@taserjs/adapter-node',
    ])
    expect(groups.devDependencies).toEqual([
      '@taserjs/router-cli',
      'npm-run-all2',
      'tsdown',
      'tsx',
      'typescript',
      '@types/node',
    ])
  })

  it('includes express packages', () => {
    const groups = getPackageGroups('express')
    expect(groups.dependencies).toContain('express')
    expect(groups.dependencies).toContain('@taserjs/adapter-express')
    expect(groups.devDependencies).toContain('@types/express')
  })
})

describe('capabilities catalog', () => {
  it('lists frameworks, db options, and loggers', () => {
    const catalog = getCapabilitiesCatalog()
    expect(catalog.frameworks).toContain('hono')
    expect(catalog.db.odms).toContain('drizzle')
    expect(catalog.db.defaultDriver).toBe('sqlite')
    expect(catalog.loggers).toContain('pino')
  })
})

describe('package manager', () => {
  it('detects from npm_config_user_agent', async () => {
    const previous = process.env.npm_config_user_agent
    try {
      process.env.npm_config_user_agent = 'pnpm/10.6.2 npm/? node/v24.11.0'
      expect(resolveUserAgent()).toBe('pnpm')
      process.env.npm_config_user_agent = 'npm/10.0.0 node/v24.11.0'
      expect(resolveUserAgent()).toBe('npm')
    }
    finally {
      if (previous === undefined) {
        delete process.env.npm_config_user_agent
      }
      else {
        process.env.npm_config_user_agent = previous
      }
    }
  })
})
