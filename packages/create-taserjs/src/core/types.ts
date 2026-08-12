import type { Agent } from 'package-manager-detector'

export type Framework = 'node' | 'express' | 'hono' | 'fastify'

export const FRAMEWORKS: readonly Framework[] = ['node', 'express', 'hono', 'fastify']

export type DbOdm = 'drizzle' | 'prisma' | 'kysely'

export const DB_ODMS: readonly DbOdm[] = ['drizzle', 'prisma', 'kysely']

export type DbDriver = 'postgres' | 'sqlite' | 'mysql'

export const DB_DRIVERS: readonly DbDriver[] = ['postgres', 'sqlite', 'mysql']

export const DEFAULT_DB_DRIVER: DbDriver = 'sqlite'

export type LoggerId = 'pino' | 'winston'

export const LOGGERS: readonly LoggerId[] = ['pino', 'winston']

export type PackageGroups = {
  dependencies: string[]
  devDependencies: string[]
  scripts: Record<string, string>
}

export type ScaffoldContext = {
  projectName: string
  targetDir: string
  framework: Framework
  db?: DbOdm
  driver?: DbDriver
  logger?: LoggerId
}

export type ScaffoldOptions = ScaffoldContext & {
  skipInstall?: boolean
  agent?: Agent
}

export type ScaffoldResult = ScaffoldContext

export type CapabilitiesCatalog = {
  frameworks: Framework[]
  db: {
    odms: DbOdm[]
    drivers: DbDriver[]
    defaultDriver: DbDriver
  }
  loggers: LoggerId[]
}
