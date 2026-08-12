import { watchRouteTree } from '@taserjs/router-generator'

import { buildOptions } from '../options.js'
import { resolveConfigFile } from '../support/resolve-config-file.js'

export async function runWatch(argv: Record<string, unknown>): Promise<void> {
  const options = buildOptions(argv)
  options.configFile = resolveConfigFile(argv)
  const handle = await watchRouteTree(options)

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    await handle.close()
    process.exit(signal === 'SIGINT' ? 130 : 143)
  }

  process.once('SIGINT', () => {
    void shutdown('SIGINT')
  })
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
}
