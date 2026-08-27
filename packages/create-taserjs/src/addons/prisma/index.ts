import type { AddonDefinition } from "../types.js";
import type { DbDriver } from "../../core/types.js";

/** Latest Prisma ORM v7 release line — keep all @prisma/* packages on this range. */
const PRISMA_VERSION = "^7.10.0";

function prismaPackage(name: string): string {
  return `${name}@${PRISMA_VERSION}`;
}

function prismaProvider(driver: DbDriver): string {
  switch (driver) {
    case "postgres":
      return "postgresql";
    case "mysql":
      return "mysql";
    case "sqlite":
    default:
      return "sqlite";
  }
}

function envExample(driver: DbDriver): string {
  switch (driver) {
    case "postgres":
      return "DATABASE_URL=postgresql://user:password@localhost:5432/mydb\n";
    case "mysql":
      return "DATABASE_URL=mysql://user:password@localhost:3306/mydb\n";
    case "sqlite":
    default:
      return "DATABASE_URL=file:./local.db\n";
  }
}

function driverPackages(driver: DbDriver): string[] {
  switch (driver) {
    case "postgres":
      return [prismaPackage("@prisma/adapter-pg"), "pg"];
    case "mysql":
      return [prismaPackage("@prisma/adapter-mariadb"), "mariadb"];
    case "sqlite":
    default:
      return [prismaPackage("@prisma/adapter-better-sqlite3"), "better-sqlite3"];
  }
}

function driverDevPackages(driver: DbDriver): string[] {
  switch (driver) {
    case "postgres":
      return ["@types/pg"];
    case "sqlite":
      return ["@types/better-sqlite3"];
    case "mysql":
    default:
      return [];
  }
}

function dbIndexSource(driver: DbDriver): string {
  switch (driver) {
    case "postgres":
      return `import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './prisma/client.js'

export function createDb() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
  return new PrismaClient({ adapter })
}
`;
    case "mysql":
      return `import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import { PrismaClient } from './prisma/client.js'

export function createDb() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? 'mariadb://root:@localhost:3306/mydb')
  return new PrismaClient({ adapter })
}
`;
    case "sqlite":
    default:
      return `import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

import { PrismaClient } from './prisma/client.js'

export function createDb() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./local.db',
  })
  return new PrismaClient({ adapter })
}
`;
  }
}

function prismaConfigSource(): string {
  return `import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
`;
}

function schemaSource(driver: DbDriver): string {
  const provider = prismaProvider(driver);
  return `generator client {
  provider = "prisma-client"
  output   = "../src/db/prisma"
}

datasource db {
  provider = "${provider}"
}

model User {
  id    Int    @id @default(autoincrement())
  email String
}
`;
}

export const prismaAddon: AddonDefinition = {
  id: "prisma",
  category: "database",
  dependencies(ctx) {
    const driver = ctx.driver ?? "sqlite";
    return [prismaPackage("@prisma/client"), ...driverPackages(driver)];
  },
  devDependencies(ctx) {
    const driver = ctx.driver ?? "sqlite";
    return [prismaPackage("prisma"), ...driverDevPackages(driver)];
  },
  scripts() {
    return {
      "db:generate": "prisma generate",
      "db:push": "prisma db push",
    };
  },
  bootBinding() {
    return {
      key: "db",
      importPath: "./db/index.js",
      factoryName: "createDb",
    };
  },
  async apply(ctx, write) {
    const driver = ctx.driver ?? "sqlite";
    await write("prisma.config.ts", prismaConfigSource());
    await write("prisma/schema.prisma", schemaSource(driver));
    await write("src/db/index.ts", dbIndexSource(driver));
    await write(".env.example", envExample(driver));
  },
};
