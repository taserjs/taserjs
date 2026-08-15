import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { ScaffoldContext } from './types.js'

export async function writeProjectConfig(root: string, ctx: ScaffoldContext): Promise<void> {
  const config: Record<string, string> = {
    framework: ctx.framework,
  }

  if (ctx.db) {
    config.db = ctx.db
    if (ctx.driver) {
      config.driver = ctx.driver
    }
  }

  if (ctx.logger) {
    config.logger = ctx.logger
  }

  if (ctx.validator) {
    config.validator = ctx.validator
  }

  await writeFile(
    path.join(root, '.taser.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf8',
  )
}
