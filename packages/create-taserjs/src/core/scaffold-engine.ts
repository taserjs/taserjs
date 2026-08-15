import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { collectBootBindings, resolveAddons } from '../addons/registry.js'
import { indexTemplate, taserTsTemplate } from '../frameworks/index.js'
import { installPackages, resolveUserAgent } from './package-manager.js'
import { writeProjectConfig } from './project-config.js'
import { resolvePackages } from './resolve-packages.js'
import type { ScaffoldOptions, ScaffoldResult } from './types.js'
import {
  contextTemplate,
  gitignoreTemplate,
  healthRouteTemplate,
  indexRouteTemplate,
  packageJsonTemplate,
  rootLayoutTemplate,
  starterManifestTemplate,
  tsconfigTemplate,
  tsdownConfigTemplate,
} from '../templates/base.js'

async function write(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, contents, 'utf8')
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const root = options.targetDir
  const ctx = {
    projectName: options.projectName,
    targetDir: root,
    framework: options.framework,
    ...(options.db ? { db: options.db, driver: options.driver } : {}),
    ...(options.logger ? { logger: options.logger } : {}),
    ...(options.validator ? { validator: options.validator } : {}),
  }

  const addons = resolveAddons(ctx)
  const packages = resolvePackages(ctx)
  const bootBindings = collectBootBindings(ctx)

  await write(path.join(root, 'package.json'), packageJsonTemplate(options.projectName, packages.scripts))
  await write(path.join(root, 'tsconfig.json'), tsconfigTemplate())
  await write(path.join(root, 'tsdown.config.ts'), tsdownConfigTemplate())
  await write(path.join(root, '.gitignore'), gitignoreTemplate())
  await write(path.join(root, 'src/context.ts'), contextTemplate(bootBindings))
  await write(path.join(root, 'src/taser.ts'), taserTsTemplate(options.framework))
  await write(path.join(root, 'src/index.ts'), indexTemplate(options.framework))
  await write(path.join(root, 'src/routes/$.ts'), rootLayoutTemplate())
  await write(path.join(root, 'src/routes/index.get.ts'), indexRouteTemplate())
  await write(path.join(root, 'src/routes/health.get.ts'), healthRouteTemplate(ctx))
  await write(path.join(root, 'src/routeManifest.gen.ts'), starterManifestTemplate())

  for (const addon of addons) {
    await addon.apply(ctx, (filePath, contents) => write(path.join(root, filePath), contents))
  }

  await writeProjectConfig(root, ctx)

  if (options.skipInstall) {
    return {
      projectName: ctx.projectName,
      targetDir: root,
      framework: ctx.framework,
      ...(ctx.db ? { db: ctx.db, driver: ctx.driver } : {}),
      ...(ctx.logger ? { logger: ctx.logger } : {}),
      ...(ctx.validator ? { validator: ctx.validator } : {}),
    }
  }

  const agent = options.agent ?? resolveUserAgent()
  await installPackages(agent, root, {
    dependencies: packages.dependencies,
    devDependencies: packages.devDependencies,
  })

  return {
    projectName: ctx.projectName,
    targetDir: root,
    framework: ctx.framework,
    ...(ctx.db ? { db: ctx.db, driver: ctx.driver } : {}),
    ...(ctx.logger ? { logger: ctx.logger } : {}),
    ...(ctx.validator ? { validator: ctx.validator } : {}),
  }
}
