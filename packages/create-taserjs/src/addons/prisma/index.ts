import type { AddonDefinition } from '../types.js'
import type { DbDriver } from '../../core/types.js'

function prismaProvider(driver: DbDriver): string {
  switch (driver) {
    case 'postgres':
      return 'postgresql'
    case 'mysql':
      return 'mysql'
    case 'sqlite':
    default:
      return 'sqlite'
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

export const prismaAddon: AddonDefinition = {
  id: 'prisma',
  category: 'database',
  dependencies() {
    return ['@prisma/client']
  },
  devDependencies() {
    return ['prisma']
  },
  scripts() {
    return {
      'db:generate': 'prisma generate',
      'db:push': 'prisma db push',
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
    const provider = prismaProvider(driver)
    await write(
      'prisma/schema.prisma',
      `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

model User {
  id    Int    @id @default(autoincrement())
  email String
}
`,
    )
    await write(
      'src/db/index.ts',
      `import { PrismaClient } from '@prisma/client'

export function createDb() {
  return new PrismaClient()
}
`,
    )
    await write('.env.example', envExample(driver))
  },
}
