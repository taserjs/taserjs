import path from 'node:path'

import * as p from '@clack/prompts'
import color from 'picocolors'

import { getCapabilitiesCatalog } from '../addons/registry.js'
import { printCapabilitiesCatalog, printJsonError, printScaffoldResult } from '../core/json-output.js'
import {
  parseDbFlag,
  parseFrameworkFlag,
  parseLoggerFlag,
  parseValidatorFlag,
  type ParsedCreateArgs,
  resolveScaffoldDefaults,
} from '../core/parse-options.js'
import { scaffoldProject } from '../core/scaffold-engine.js'
import type { DbDriver, DbOdm, Framework, LoggerId, ScaffoldResult, ValidatorId } from '../core/types.js'
import { DB_DRIVERS, DB_ODMS, FRAMEWORKS, LOGGERS, VALIDATORS } from '../core/types.js'
import { validateProjectName } from '../core/validate-project-name.js'
import { resolveUserAgent, runScript } from '../core/package-manager.js'

function isFramework(value: unknown): value is Framework {
  return typeof value === 'string' && (FRAMEWORKS as readonly string[]).includes(value)
}

function isDbOdm(value: unknown): value is DbOdm {
  return typeof value === 'string' && (DB_ODMS as readonly string[]).includes(value)
}

function isDbDriver(value: unknown): value is DbDriver {
  return typeof value === 'string' && (DB_DRIVERS as readonly string[]).includes(value)
}

function isLoggerId(value: unknown): value is LoggerId {
  return typeof value === 'string' && (LOGGERS as readonly string[]).includes(value)
}

function isValidatorId(value: unknown): value is ValidatorId {
  return typeof value === 'string' && (VALIDATORS as readonly string[]).includes(value)
}

async function promptInteractiveOptions(
  args: ParsedCreateArgs,
): Promise<ParsedCreateArgs> {
  const projectName = args.projectName
    ?? await p.text({
      message: 'Project name',
      placeholder: 'my-taser-app',
      defaultValue: 'my-taser-app',
      validate(value) {
        return validateProjectName(value)
      },
    })

  if (p.isCancel(projectName)) {
    p.cancel('Scaffold cancelled.')
    process.exit(0)
  }

  const framework = args.framework
    ?? await p.select({
      message: 'Framework adapter',
      options: [
        { value: 'node', label: 'Plain Node.js', hint: 'default' },
        { value: 'express', label: 'Express' },
        { value: 'hono', label: 'Hono' },
        { value: 'fastify', label: 'Fastify' },
      ],
      initialValue: 'node',
    })

  if (p.isCancel(framework) || !isFramework(framework)) {
    p.cancel('Scaffold cancelled.')
    process.exit(0)
  }

  const dbChoice = args.db
    ?? await p.select({
      message: 'Database',
      options: [
        { value: 'none', label: 'None', hint: 'default' },
        { value: 'drizzle', label: 'Drizzle' },
        { value: 'prisma', label: 'Prisma' },
        { value: 'kysely', label: 'Kysely' },
      ],
      initialValue: 'none',
    })

  if (p.isCancel(dbChoice)) {
    p.cancel('Scaffold cancelled.')
    process.exit(0)
  }

  let db: DbOdm | undefined
  let driver: DbDriver | undefined

  if (dbChoice !== 'none' && isDbOdm(dbChoice)) {
    db = dbChoice
    const driverChoice = args.driver
      ?? await p.select({
        message: 'Database driver',
        options: [
          { value: 'sqlite', label: 'SQLite', hint: 'default' },
          { value: 'postgres', label: 'PostgreSQL' },
          { value: 'mysql', label: 'MySQL' },
        ],
        initialValue: 'sqlite',
      })

    if (p.isCancel(driverChoice) || !isDbDriver(driverChoice)) {
      p.cancel('Scaffold cancelled.')
      process.exit(0)
    }
    driver = driverChoice
  }

  const loggerChoice = args.logger
    ?? await p.select({
      message: 'Logger',
      options: [
        { value: 'none', label: 'None', hint: 'default' },
        { value: 'pino', label: 'Pino' },
        { value: 'winston', label: 'Winston' },
      ],
      initialValue: 'none',
    })

  if (p.isCancel(loggerChoice)) {
    p.cancel('Scaffold cancelled.')
    process.exit(0)
  }

  const logger = loggerChoice === 'none' ? undefined : isLoggerId(loggerChoice) ? loggerChoice : undefined

  const validatorChoice = args.validator
    ?? await p.select({
      message: 'Validator',
      options: [
        { value: 'none', label: 'None', hint: 'default' },
        { value: 'zod', label: 'Zod' },
        { value: 'arktype', label: 'Arktype' },
        { value: 'valibot', label: 'Valibot' },
      ],
      initialValue: 'none',
    })

  if (p.isCancel(validatorChoice)) {
    p.cancel('Scaffold cancelled.')
    process.exit(0)
  }

  const validator = validatorChoice === 'none' ? undefined : isValidatorId(validatorChoice) ? validatorChoice : undefined

  return {
    projectName: String(projectName).trim(),
    framework,
    yes: args.yes,
    noInstall: args.noInstall,
    json: args.json,
    ...(db ? { db, driver: driver! } : {}),
    ...(logger ? { logger } : {}),
    ...(validator ? { validator } : {}),
  }
}

export async function runCreateCommand(args: ParsedCreateArgs): Promise<ScaffoldResult | undefined> {
  if (args.json && !args.projectName) {
    printCapabilitiesCatalog(getCapabilitiesCatalog())
    return undefined
  }

  const cwd = process.cwd()
  const interactive = !args.yes
  const resolved = interactive
    ? await promptInteractiveOptions(args)
    : {
        ...args,
        projectName: args.projectName?.trim(),
        framework: args.framework ?? 'node',
      }

  if (!resolved.projectName) {
    const message = 'Project name is required'
    if (args.json) {
      printJsonError(message)
      process.exit(1)
    }
    throw new Error(message)
  }

  const nameError = validateProjectName(resolved.projectName, cwd)
  if (nameError) {
    if (args.json) {
      printJsonError(nameError)
      process.exit(1)
    }
    throw new Error(nameError)
  }

  const targetDir = path.resolve(cwd, resolved.projectName)
  const scaffoldCtx = resolveScaffoldDefaults({
    ...resolved,
    projectName: resolved.projectName,
  })
  scaffoldCtx.targetDir = targetDir

  if (!args.json) {
    const spinner = p.spinner()
    spinner.start('Scaffolding project')
    try {
      const result = await scaffoldProject({
        ...scaffoldCtx,
        targetDir,
        skipInstall: args.noInstall,
        agent: resolveUserAgent(),
      })
      spinner.stop('Project created')
      const cdPath = path.relative(cwd, targetDir) || '.'
      p.note(
        [
          `cd ${cdPath}`,
          runScript(resolveUserAgent(), 'dev'),
        ].join('\n'),
        'Next steps',
      )
      p.outro(color.green('Done.'))
      return result
    }
    catch (error) {
      spinner.stop('Scaffold failed')
      throw error
    }
  }

  const result = await scaffoldProject({
    ...scaffoldCtx,
    targetDir,
    skipInstall: args.noInstall,
    agent: resolveUserAgent(),
  })
  printScaffoldResult(result)
  return result
}

export function buildParsedArgsFromCli(values: {
  framework?: string
  db?: string
  logger?: string
  validator?: string
  y?: boolean
  noInstall?: boolean
  json?: boolean
}, positionals: string[]): ParsedCreateArgs {
  const args: ParsedCreateArgs = {
    yes: values.y ?? false,
    noInstall: values.noInstall ?? false,
    json: values.json ?? false,
  }

  if (positionals[0]) {
    args.projectName = positionals[0]
  }

  if (values.framework) {
    args.framework = parseFrameworkFlag(values.framework)
  }

  if (values.db) {
    const parsed = parseDbFlag(values.db)
    args.db = parsed.db
    args.driver = parsed.driver
  }

  if (values.logger) {
    args.logger = parseLoggerFlag(values.logger)
  }

  if (values.validator) {
    args.validator = parseValidatorFlag(values.validator)
  }

  return args
}
