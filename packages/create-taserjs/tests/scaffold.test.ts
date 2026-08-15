import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { getCapabilitiesCatalog } from '../src/addons/registry.js'
import { validateProjectName } from '../src/core/validate-project-name.js'
import { resolveInstallCommand, resolveUserAgent } from '../src/core/package-manager.js'
import { parseValidatorFlag } from '../src/core/parse-options.js'
import { buildParsedArgsFromCli } from '../src/commands/create.js'
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

  it('scaffolds drizzle postgres with db in context boot and includes @types/pg', async () => {
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
      expect(packages.devDependencies).toContain('@types/pg')
      expect(packages.devDependencies).toContain('drizzle-kit')

      await expect(readFile(path.join(dir, 'src/db/index.ts'), 'utf8')).resolves.toContain('createDb')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('defaults drizzle driver to sqlite when only odm is set and includes @types/better-sqlite3', async () => {
    const packages = resolvePackages({
      projectName: 'demo',
      targetDir: '/tmp/demo',
      framework: 'node',
      db: 'drizzle',
      driver: 'sqlite',
    })
    expect(packages.dependencies).toContain('better-sqlite3')
    expect(packages.devDependencies).toContain('@types/better-sqlite3')
  })

  it('includes driver types for kysely postgres and sqlite', () => {
    const pgPackages = resolvePackages({
      projectName: 'demo-kysely-pg',
      targetDir: '/tmp/demo',
      framework: 'node',
      db: 'kysely',
      driver: 'postgres',
    })
    expect(pgPackages.dependencies).toContain('kysely')
    expect(pgPackages.dependencies).toContain('pg')
    expect(pgPackages.devDependencies).toContain('@types/pg')

    const sqlitePackages = resolvePackages({
      projectName: 'demo-kysely-sqlite',
      targetDir: '/tmp/demo',
      framework: 'node',
      db: 'kysely',
      driver: 'sqlite',
    })
    expect(sqlitePackages.dependencies).toContain('kysely')
    expect(sqlitePackages.dependencies).toContain('better-sqlite3')
    expect(sqlitePackages.devDependencies).toContain('@types/better-sqlite3')
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
      const result = await scaffoldProject({
        projectName: 'demo-zod',
        targetDir: dir,
        framework: 'node',
        validator: 'zod',
        skipInstall: true,
      })
      expect(result.validator).toBe('zod')

      const index = await readFile(path.join(dir, 'src/routes/index.get.ts'), 'utf8')
      expect(index).toContain('import { z } from \'zod\'')

      const packages = resolvePackages({
        projectName: 'demo-zod',
        targetDir: dir,
        framework: 'node',
        validator: 'zod',
      })
      expect(packages.dependencies).toContain('zod')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('scaffolds arktype validator', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'create-taser-arktype-'))
    try {
      const result = await scaffoldProject({
        projectName: 'demo-arktype',
        targetDir: dir,
        framework: 'node',
        validator: 'arktype',
        skipInstall: true,
      })
      expect(result.validator).toBe('arktype')

      const index = await readFile(path.join(dir, 'src/routes/index.get.ts'), 'utf8')
      expect(index).toContain('import { type } from \'arktype\'')

      const packages = resolvePackages({
        projectName: 'demo-arktype',
        targetDir: dir,
        framework: 'node',
        validator: 'arktype',
      })
      expect(packages.dependencies).toContain('arktype')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('scaffolds valibot validator', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'create-taser-valibot-'))
    try {
      const result = await scaffoldProject({
        projectName: 'demo-valibot',
        targetDir: dir,
        framework: 'node',
        validator: 'valibot',
        skipInstall: true,
      })
      expect(result.validator).toBe('valibot')

      const index = await readFile(path.join(dir, 'src/routes/index.get.ts'), 'utf8')
      expect(index).toContain('import * as v from \'valibot\'')

      const packages = resolvePackages({
        projectName: 'demo-valibot',
        targetDir: dir,
        framework: 'node',
        validator: 'valibot',
      })
      expect(packages.dependencies).toContain('valibot')
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

  it('writes .taser.json project config with validator', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'create-taser-config-'))
    try {
      await scaffoldProject({
        projectName: 'demo-config',
        targetDir: dir,
        framework: 'hono',
        db: 'prisma',
        driver: 'mysql',
        logger: 'winston',
        validator: 'valibot',
        skipInstall: true,
      })

      const config = JSON.parse(await readFile(path.join(dir, '.taser.json'), 'utf8')) as {
        framework: string
        db: string
        driver: string
        logger: string
        validator: string
      }
      expect(config).toEqual({
        framework: 'hono',
        db: 'prisma',
        driver: 'mysql',
        logger: 'winston',
        validator: 'valibot',
      })
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('cli validator parsing', () => {
  it('parses valid validator flags', () => {
    expect(parseValidatorFlag('zod')).toBe('zod')
    expect(parseValidatorFlag('arktype')).toBe('arktype')
    expect(parseValidatorFlag('valibot')).toBe('valibot')
  })

  it('rejects invalid validator flag', () => {
    expect(() => parseValidatorFlag('yup')).toThrowError(/Invalid --validator/)
  })

  it('buildParsedArgsFromCli parses validator', () => {
    const args = buildParsedArgsFromCli({ validator: 'arktype' }, ['test-app'])
    expect(args.validator).toBe('arktype')
    expect(args.projectName).toBe('test-app')
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
  it('lists frameworks, db options, loggers, and validators', () => {
    const catalog = getCapabilitiesCatalog()
    expect(catalog.frameworks).toContain('hono')
    expect(catalog.db.odms).toContain('drizzle')
    expect(catalog.db.defaultDriver).toBe('sqlite')
    expect(catalog.loggers).toContain('pino')
    expect(catalog.validators).toEqual(['zod', 'arktype', 'valibot'])
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

  it('resolves install commands with -D flag for dev dependencies', () => {
    const pnpmDev = resolveInstallCommand('pnpm', ['typescript', 'tsx'], true)
    expect(pnpmDev.command).toBe('pnpm')
    expect(pnpmDev.args).toEqual(['add', '-D', 'typescript', 'tsx'])

    const pnpmProd = resolveInstallCommand('pnpm', ['express'], false)
    expect(pnpmProd.command).toBe('pnpm')
    expect(pnpmProd.args).toEqual(['add', 'express'])

    const npmDev = resolveInstallCommand('npm', ['typescript'], true)
    expect(npmDev.command).toBe('npm')
    expect(npmDev.args).toEqual(['i', '-D', 'typescript'])

    const yarnDev = resolveInstallCommand('yarn', ['typescript'], true)
    expect(yarnDev.command).toBe('yarn')
    expect(yarnDev.args).toEqual(['add', '-D', 'typescript'])

    const bunDev = resolveInstallCommand('bun', ['typescript'], true)
    expect(bunDev.command).toBe('bun')
    expect(bunDev.args).toEqual(['add', '-D', 'typescript'])
  })
})
