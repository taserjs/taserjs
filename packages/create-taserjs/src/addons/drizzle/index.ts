import type { AddonDefinition } from '../types.js'
import type { DbDriver } from '../../core/types.js'

function schemaSource(driver: DbDriver): string {
  switch (driver) {
    case 'postgres':
      return `import { pgTable, serial, text } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
})
`
    case 'mysql':
      return `import { mysqlTable, serial, varchar } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
})
`
    case 'sqlite':
    default:
      return `import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
})
`
  }
}

function dbIndexSource(driver: DbDriver): string {
  switch (driver) {
    case 'postgres':
      return `import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from './schema.js'

export function createDb() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  })
  return drizzle(pool, { schema })
}
`
    case 'mysql':
      return `import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

import * as schema from './schema.js'

export function createDb() {
  const pool = mysql.createPool(process.env.DATABASE_URL ?? '')
  return drizzle(pool, { schema, mode: 'default' })
}
`
    case 'sqlite':
    default:
      return `import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import * as schema from './schema.js'

export function createDb() {
  const filePath = (process.env.DATABASE_URL ?? 'file:./local.db').replace(/^file:/, '')
  const client = new Database(filePath)
  return drizzle(client, { schema })
}
`
  }
}

function drizzleConfigSource(driver: DbDriver): string {
  const dialect = driver === 'postgres' ? 'postgresql' : driver === 'mysql' ? 'mysql' : 'sqlite'
  return `import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: '${dialect}',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})
`
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

function driverDevPackages(driver: DbDriver): string[] {
  switch (driver) {
    case 'postgres':
      return ['@types/pg']
    case 'sqlite':
      return ['@types/better-sqlite3']
    case 'mysql':
    default:
      return []
  }
}

export const drizzleAddon: AddonDefinition = {
  id: 'drizzle',
  category: 'database',
  dependencies(ctx) {
    const driver = ctx.driver ?? 'sqlite'
    return ['drizzle-orm', ...driverPackages(driver)]
  },
  devDependencies(ctx) {
    const driver = ctx.driver ?? 'sqlite'
    return ['drizzle-kit', ...driverDevPackages(driver)]
  },
  scripts() {
    return {
      'db:generate': 'drizzle-kit generate',
      'db:push': 'drizzle-kit push',
    }
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
    await write('src/db/schema.ts', schemaSource(driver))
    await write('src/db/index.ts', dbIndexSource(driver))
    await write('drizzle.config.ts', drizzleConfigSource(driver))
    await write('.env.example', envExample(driver))
  },
}
