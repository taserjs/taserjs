import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { stat } from 'node:fs/promises'

import { CONFIG_FILE_NAME, formatDefaultConfigFile } from '@taserjs/router-generator'

async function resolveInitTargetPath(argv: Record<string, unknown>): Promise<string> {
  const dirArg = argv.dir as string | undefined
  if (!dirArg) {
    return join(process.cwd(), CONFIG_FILE_NAME)
  }

  const resolved = resolve(dirArg)
  const stats = await stat(resolved).catch(() => null)
  if (stats?.isDirectory()) {
    return join(resolved, CONFIG_FILE_NAME)
  }
  return resolved
}

export async function runInit(argv: Record<string, unknown>): Promise<void> {
  const targetPath = await resolveInitTargetPath(argv)
  const force = Boolean(argv.force)

  if (existsSync(targetPath) && !force) {
    throw new Error(
      `Config file already exists at ${targetPath}. Use --force to overwrite.`,
    )
  }

  await mkdir(dirname(targetPath), { recursive: true })
  await writeFile(targetPath, formatDefaultConfigFile(), 'utf8')
  console.log(`Created ${targetPath}`)
}
