import type { AddonDefinition } from '../types.js'
import type { DbDriver } from '../../core/types.js'

function schemaTypesSource(): string {
  return `export interface UserTable {
  id: number
  email: string
}

export interface DB {
  users: UserTable
}
`
}

function dbIndexSource(driver: DbDriver): string {
  switch (driver) {
    case 'postgres':
      return `import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'

import type { DB } from './schema.js'

export function createDb() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  })
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool }),
  })
}
`
    case 'mysql':
      return `import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'

import type { DB } from './schema.js'

export function createDb() {
  const pool = createPool(process.env.DATABASE_URL ?? '')
  return new Kysely<DB>({
    dialect: new MysqlDialect({ pool }),
  })
}
`
    case 'sqlite':
    default:
      return `import Database from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'

import type { DB } from './schema.js'

export function createDb() {
  const filePath = (process.env.DATABASE_URL ?? 'file:./local.db').replace(/^file:/, '')
  const database = new Database(filePath)
  return new Kysely<DB>({
    dialect: new SqliteDialect({ database }),
  })
}
`
  }
}

function driverPackages(driver: DbDriver): string[] {
  switch (driver) {
    case 'postgres':
      return ['pg']
    case 'mysql':
      return ['mysql2']
    case 'sqlite':
    default:
      return ['better-sqlite3']
  }
}

function envExample(driver: DbDriver): string {
  switch (driver) {
    case 'postgres':
      return 'DATABASE_URL=postgresql://user:password@localhost:5432/mydb\n'
    case 'mysql':
      return 'DATABASE_URL=mysql://user:password@localhost:3306/mydb\n'
    case 'sqlite':
    default:
      return 'DATABASE_URL=file:./local.db\n'
  }
}

export const kyselyAddon: AddonDefinition = {
  id: 'kysely',
  category: 'database',
  dependencies(ctx) {
    const driver = ctx.driver ?? 'sqlite'
    return ['kysely', ...driverPackages(driver)]
  },
  devDependencies() {
    return []
  },
  bootBinding() {
    return {
      key: 'db',
      importPath: './db/index.js',
      factoryName: 'createDb',
    }
  },
  async apply(ctx, write) {
    const driver = ctx.driver ?? 'sqlite'
    await write('src/db/schema.ts', schemaTypesSource())
    await write('src/db/index.ts', dbIndexSource(driver))
    await write('.env.example', envExample(driver))
  },
}
