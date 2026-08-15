#!/usr/bin/env node
import { parseArgs } from 'node:util'

import * as p from '@clack/prompts'
import color from 'picocolors'

import { buildParsedArgsFromCli, runCreateCommand } from './commands/create.js'
import { printJsonError } from './core/json-output.js'

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      framework: { type: 'string' },
      db: { type: 'string' },
      logger: { type: 'string' },
      validator: { type: 'string' },
      y: { type: 'boolean', short: 'y' },
      noInstall: { type: 'boolean' },
      json: { type: 'boolean' },
    },
    allowPositionals: true,
  })

  const parsed = buildParsedArgsFromCli(
    {
      ...(values.framework !== undefined ? { framework: values.framework } : {}),
      ...(values.db !== undefined ? { db: values.db } : {}),
      ...(values.logger !== undefined ? { logger: values.logger } : {}),
      ...(values.validator !== undefined ? { validator: values.validator } : {}),
      ...(values.y !== undefined ? { y: values.y } : {}),
      ...(values.noInstall !== undefined ? { noInstall: values.noInstall } : {}),
      ...(values.json !== undefined ? { json: values.json } : {}),
    },
    positionals,
  )

  if (!parsed.json) {
    console.clear()
    p.intro(color.bgCyan(color.black(' create-taser ')))
  }

  try {
    await runCreateCommand(parsed)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (parsed.json) {
      printJsonError(message)
      process.exit(1)
    }
    throw error
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
