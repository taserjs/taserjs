# Addons: Databases, Loggers & Validators

Read when configuring database ORMs (Drizzle, Prisma, Kysely), loggers (Pino, Winston), or validators (Zod, Valibot, ArkType) following scaffold conventions.

## Overview

Addons connect singletons (database connection pools, loggers) into Taser's boot context (`src/context.ts`), making them available on `ctx` across all route handlers and middleware.

---

## Database ORMs & Drivers

### 1. Drizzle ORM (`--db drizzle`)

Supported drivers: `sqlite` (`better-sqlite3`), `postgres` (`pg`), `mysql` (`mysql2`).

#### Files Created

- `src/db/schema.ts`: Schema definitions (`sqliteTable`, `pgTable`, or `mysqlTable`).
- `src/db/index.ts`: Database connection factory (`createDb`).
- `drizzle.config.ts`: Drizzle Kit migration configuration.
- `.env.example`: Connection string (`DATABASE_URL`).

#### Connection Factory (`src/db/index.ts`)

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export function createDb() {
  const filePath = (process.env.DATABASE_URL ?? "file:./local.db").replace(/^file:/, "");
  const client = new Database(filePath);
  return drizzle(client, { schema });
}
```

#### Scripts

```bash
pnpm db:generate   # drizzle-kit generate
pnpm db:push       # drizzle-kit push
```

> [!NOTE]
> `better-sqlite3` compiles native C++ bindings. In `pnpm`, add `better-sqlite3` to `onlyBuiltDependencies` in `package.json` or run `pnpm approve-builds`.

---

### 2. Prisma ORM (`--db prisma`)

Supported drivers: `sqlite` (`@prisma/adapter-better-sqlite3`), `postgres` (`@prisma/adapter-pg`), `mysql` (`@prisma/adapter-mariadb`).

#### Files Created

- `prisma/schema.prisma`: Prisma schema model with custom client output directory.
- `prisma.config.ts`: Prisma configuration loading `DATABASE_URL`.
- `src/db/index.ts`: Client initialization using database driver adapter.

#### Connection Factory (`src/db/index.ts`)

```ts
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./prisma/client.js";

export function createDb() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./local.db",
  });
  return new PrismaClient({ adapter });
}
```

#### Scripts

```bash
pnpm db:generate   # prisma generate
pnpm db:push       # prisma db push
```

---

### 3. Kysely Query Builder (`--db kysely`)

Supported drivers: `sqlite` (`better-sqlite3`), `postgres` (`pg`), `mysql` (`mysql2`).

#### Files Created

- `src/db/schema.ts`: TypeScript interface definitions for database tables.
- `src/db/index.ts`: Kysely instance with chosen dialect.

#### Connection Factory (`src/db/index.ts`)

```ts
import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import type { DB } from "./schema.js";

export function createDb() {
  const filePath = (process.env.DATABASE_URL ?? "file:./local.db").replace(/^file:/, "");
  const database = new Database(filePath);
  return new Kysely<DB>({
    dialect: new SqliteDialect({ database }),
  });
}
```

---

## Loggers

### 1. Pino (`-l pino`)

```ts
// src/logger.ts
import pino from "pino";

export function createLogger() {
  return pino({ level: process.env.LOG_LEVEL ?? "info" });
}
```

### 2. Winston (`-l winston`)

```ts
// src/logger.ts
import winston from "winston";

export function createLogger() {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
  });
}
```

### Binding Addons into Boot Context

Attach database and logger instances in `src/context.ts`:

```ts
// src/context.ts
import { createContext } from "@taserjs/router";
import { createDb } from "./db/index.js";
import { createLogger } from "./logger.js";

export const context = createContext({
  boot: () => ({
    db: createDb(),
    logger: createLogger(),
  }),
});
```

---

## Standard Schema Validators

Taser.js supports all Standard Schema v1 libraries natively without adapters:

### 1. Zod (`-v zod`)

```ts
import { z } from "zod";

t.get("/items").query(z.object({ limit: z.coerce.number().default(10) }));
```

### 2. Valibot (`-v valibot`)

```ts
import * as v from "valibot";

t.get("/items").query(v.object({ limit: v.optional(v.number(), 10) }));
```

### 3. ArkType (`-v arktype`)

```ts
import { type } from "arktype";

t.get("/items").query(type({ "limit?": "number = 10" }));
```

---

## Verify

1. Run database migration script (e.g. `pnpm db:push`).
2. Run `npx tsc --noEmit` to verify type safety of `ctx.db` and `ctx.logger`.
3. Call an endpoint querying the database to ensure runtime connectivity.
