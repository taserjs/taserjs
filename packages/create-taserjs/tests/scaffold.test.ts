import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getCapabilitiesCatalog } from "../src/addons/registry.js";
import { validateProjectName } from "../src/core/validate-project-name.js";
import { resolveInstallCommand, resolveUserAgent } from "../src/core/package-manager.js";
import { parseTypeFlag, parseValidatorFlag } from "../src/core/parse-options.js";
import { buildParsedArgsFromCli } from "../src/commands/create.js";
import { getPackageGroups, resolvePackages, scaffoldProject } from "../src/scaffold.js";

describe("validateProjectName", () => {
  it("rejects traversal and separators", () => {
    expect(validateProjectName("../escape")).toBeDefined();
    expect(validateProjectName("foo/bar")).toBeDefined();
    expect(validateProjectName("")).toBe("Project name is required");
  });

  it("accepts valid names", () => {
    expect(validateProjectName("my-taser-app")).toBeUndefined();
    expect(validateProjectName("my_app")).toBeUndefined();
  });
});

describe("scaffoldProject", () => {
  it("writes a node project mounted on root /* without router-client", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-"));
    try {
      await scaffoldProject({
        projectName: "demo",
        targetDir: dir,
        type: "node",
        skipInstall: true,
      });

      const index = await readFile(path.join(dir, "src/index.ts"), "utf8");
      expect(index).toContain("import 'dotenv/config'");
      expect(index).not.toContain("TaserAppRouter");
      expect(index).not.toContain("@taserjs/router-client");
      expect(index).toContain("@hono/node-server");
      expect(index).toContain("serve({ fetch: router.fetch, port }, () => {");
      expect(index).not.toContain("/api/*");
      expect(index).toContain("#src/taser.js");
      expect(index).toContain("#src/routeManifest.gen.js");

      await expect(readFile(path.join(dir, ".env"), "utf8")).rejects.toThrow();

      const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as {
        dependencies?: Record<string, string>;
        imports?: Record<string, string>;
        scripts: Record<string, string>;
      };
      expect(pkg.imports?.["#src/*"]).toBe("./src/*");
      expect(pkg.scripts.build).toBe("taser generate && tsdown");
      expect(pkg.scripts.serve).toBe("node dist/index.mjs");

      const tsdownConfig = await readFile(path.join(dir, "tsdown.config.ts"), "utf8");
      expect(tsdownConfig).toContain("entry: ['./src/index.ts']");

      const tsconfig = JSON.parse(await readFile(path.join(dir, "tsconfig.json"), "utf8")) as {
        compilerOptions: { baseUrl?: string; paths?: Record<string, string[]> };
      };
      expect(tsconfig.compilerOptions.paths?.["#src/*"]).toEqual(["./src/*"]);

      const manifest = await readFile(path.join(dir, "src/routeManifest.gen.ts"), "utf8");
      expect(manifest).toContain("routeManifest");

      const indexRoute = await readFile(path.join(dir, "src/routes/index.get.ts"), "utf8");
      expect(indexRoute).toContain("#src/taser.js");
      expect(indexRoute).toContain("const GET = t.get('/')");
      expect(indexRoute).toContain("export type RouteContext = typeof GET.$Infer.Context");
      expect(indexRoute).toContain("export const Route = GET.handler(");

      const taserTs = await readFile(path.join(dir, "src/taser.ts"), "utf8");
      expect(taserTs).toContain("response: { validate: true }");
      expect(taserTs).toContain("#src/context.js");

      const rootLayout = await readFile(path.join(dir, "src/routes/$.ts"), "utf8");
      expect(rootLayout).toContain("cors");
      expect(rootLayout).not.toContain("secureHeaders");
      expect(rootLayout).not.toContain("bodyLimit");
      expect(rootLayout).toContain("#src/taser.js");

      expect(pkg.dependencies).toBeUndefined();
      expect(pkg.scripts.dev).toBe("run-p dev:server dev:taser");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds drizzle postgres with db in context boot and includes @types/pg", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-drizzle-"));
    try {
      await scaffoldProject({
        projectName: "demo-db",
        targetDir: dir,
        type: "node",
        db: "drizzle",
        driver: "postgres",
        skipInstall: true,
      });

      const context = await readFile(path.join(dir, "src/context.ts"), "utf8");
      expect(context).toContain("boot:");
      expect(context).toContain("db: createDb()");

      const packages = resolvePackages({
        projectName: "demo-db",
        targetDir: dir,
        type: "node",
        db: "drizzle",
        driver: "postgres",
      });
      expect(packages.dependencies).toContain("drizzle-orm");
      expect(packages.dependencies).toContain("pg");
      expect(packages.devDependencies).toContain("@types/pg");
      expect(packages.devDependencies).toContain("drizzle-kit");

      await expect(readFile(path.join(dir, "src/db/index.ts"), "utf8")).resolves.toContain(
        "createDb",
      );
      const env = await readFile(path.join(dir, ".env"), "utf8");
      const envExample = await readFile(path.join(dir, ".env.example"), "utf8");
      expect(env).toBe(envExample);
      expect(env).toContain("DATABASE_URL=postgresql://");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("defaults drizzle driver to sqlite when only odm is set and includes @types/better-sqlite3", async () => {
    const packages = resolvePackages({
      projectName: "demo",
      targetDir: "/tmp/demo",
      type: "node",
      db: "drizzle",
      driver: "sqlite",
    });
    expect(packages.dependencies).toContain("dotenv");
    expect(packages.dependencies).toContain("better-sqlite3");
    expect(packages.devDependencies).toContain("@types/better-sqlite3");
  });

  it("includes driver types for kysely postgres and sqlite", () => {
    const pgPackages = resolvePackages({
      projectName: "demo-kysely-pg",
      targetDir: "/tmp/demo",
      type: "node",
      db: "kysely",
      driver: "postgres",
    });
    expect(pgPackages.dependencies).toContain("dotenv");
    expect(pgPackages.dependencies).toContain("kysely");
    expect(pgPackages.dependencies).toContain("pg");
    expect(pgPackages.devDependencies).toContain("@types/pg");

    const sqlitePackages = resolvePackages({
      projectName: "demo-kysely-sqlite",
      targetDir: "/tmp/demo",
      type: "node",
      db: "kysely",
      driver: "sqlite",
    });
    expect(sqlitePackages.dependencies).toContain("dotenv");
    expect(sqlitePackages.dependencies).toContain("kysely");
    expect(sqlitePackages.dependencies).toContain("better-sqlite3");
    expect(sqlitePackages.devDependencies).toContain("@types/better-sqlite3");
  });

  it("scaffolds prisma with driver adapters and prisma config", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-prisma-"));
    try {
      await scaffoldProject({
        projectName: "demo-prisma-pg",
        targetDir: dir,
        type: "node",
        db: "prisma",
        driver: "postgres",
        skipInstall: true,
      });

      const prismaConfig = await readFile(path.join(dir, "prisma.config.ts"), "utf8");
      expect(prismaConfig).toContain("defineConfig");
      expect(prismaConfig).toContain("schema: 'prisma/schema.prisma'");
      expect(prismaConfig).toContain("url: env('DATABASE_URL')");

      const schema = await readFile(path.join(dir, "prisma/schema.prisma"), "utf8");
      expect(schema).toContain('provider = "prisma-client"');
      expect(schema).toContain('output   = "../src/db/prisma"');
      expect(schema).toContain('provider = "postgresql"');

      const dbIndex = await readFile(path.join(dir, "src/db/index.ts"), "utf8");
      expect(dbIndex).toContain("import { PrismaPg } from '@prisma/adapter-pg'");
      expect(dbIndex).toContain("import { PrismaClient } from './prisma/client.js'");
      expect(dbIndex).toContain("new PrismaPg({");

      const env = await readFile(path.join(dir, ".env"), "utf8");
      const envExample = await readFile(path.join(dir, ".env.example"), "utf8");
      expect(env).toBe(envExample);
      expect(env).toContain("DATABASE_URL=postgresql://");

      const packages = resolvePackages({
        projectName: "demo-prisma-pg",
        targetDir: dir,
        type: "node",
        db: "prisma",
        driver: "postgres",
      });
      expect(packages.dependencies).toContain("dotenv");
      expect(packages.dependencies).toContain("@prisma/client");
      expect(packages.dependencies).toContain("@prisma/adapter-pg");
      expect(packages.dependencies).toContain("pg");
      expect(packages.devDependencies).toContain("prisma");
      expect(packages.devDependencies).not.toContain("dotenv");
      expect(packages.devDependencies).toContain("@types/pg");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("resolves prisma packages for sqlite and mysql drivers", () => {
    const sqlitePackages = resolvePackages({
      projectName: "demo-prisma-sqlite",
      targetDir: "/tmp/demo",
      type: "node",
      db: "prisma",
      driver: "sqlite",
    });
    expect(sqlitePackages.dependencies).toContain("dotenv");
    expect(sqlitePackages.dependencies).toContain("@prisma/client");
    expect(sqlitePackages.dependencies).toContain("@prisma/adapter-better-sqlite3");
    expect(sqlitePackages.dependencies).toContain("better-sqlite3");
    expect(sqlitePackages.devDependencies).toContain("prisma");
    expect(sqlitePackages.devDependencies).not.toContain("dotenv");
    expect(sqlitePackages.devDependencies).toContain("@types/better-sqlite3");

    const mysqlPackages = resolvePackages({
      projectName: "demo-prisma-mysql",
      targetDir: "/tmp/demo",
      type: "node",
      db: "prisma",
      driver: "mysql",
    });
    expect(mysqlPackages.dependencies).toContain("dotenv");
    expect(mysqlPackages.dependencies).toContain("@prisma/client");
    expect(mysqlPackages.dependencies).toContain("@prisma/adapter-mariadb");
    expect(mysqlPackages.dependencies).toContain("mariadb");
    expect(mysqlPackages.devDependencies).toContain("prisma");
    expect(mysqlPackages.devDependencies).not.toContain("dotenv");
  });

  it("scaffolds pino logger in context boot", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-pino-"));
    try {
      await scaffoldProject({
        projectName: "demo-log",
        targetDir: dir,
        type: "node",
        logger: "pino",
        skipInstall: true,
      });

      const context = await readFile(path.join(dir, "src/context.ts"), "utf8");
      expect(context).toContain("logger: createLogger()");

      const health = await readFile(path.join(dir, "src/routes/health.get.ts"), "utf8");
      expect(health).toContain("ctx.logger.info");

      const packages = resolvePackages({
        projectName: "demo-log",
        targetDir: dir,
        type: "node",
        logger: "pino",
      });
      expect(packages.dependencies).toContain("pino");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds zod validator", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-zod-"));
    try {
      const result = await scaffoldProject({
        projectName: "demo-zod",
        targetDir: dir,
        type: "node",
        validator: "zod",
        skipInstall: true,
      });
      expect(result.validator).toBe("zod");

      const index = await readFile(path.join(dir, "src/routes/index.get.ts"), "utf8");
      expect(index).toContain("import { z } from 'zod'");
      expect(index).toContain(".default('Taser')");

      const packages = resolvePackages({
        projectName: "demo-zod",
        targetDir: dir,
        type: "node",
        validator: "zod",
      });
      expect(packages.dependencies).toContain("zod");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds arktype validator", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-arktype-"));
    try {
      const result = await scaffoldProject({
        projectName: "demo-arktype",
        targetDir: dir,
        type: "node",
        validator: "arktype",
        skipInstall: true,
      });
      expect(result.validator).toBe("arktype");

      const index = await readFile(path.join(dir, "src/routes/index.get.ts"), "utf8");
      expect(index).toContain("import { type } from 'arktype'");
      expect(index).toContain('"Taser"');

      const packages = resolvePackages({
        projectName: "demo-arktype",
        targetDir: dir,
        type: "node",
        validator: "arktype",
      });
      expect(packages.dependencies).toContain("arktype");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds valibot validator", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-valibot-"));
    try {
      const result = await scaffoldProject({
        projectName: "demo-valibot",
        targetDir: dir,
        type: "node",
        validator: "valibot",
        skipInstall: true,
      });
      expect(result.validator).toBe("valibot");

      const index = await readFile(path.join(dir, "src/routes/index.get.ts"), "utf8");
      expect(index).toContain("import * as v from 'valibot'");
      expect(index).toContain("'Taser'");

      const packages = resolvePackages({
        projectName: "demo-valibot",
        targetDir: dir,
        type: "node",
        validator: "valibot",
      });
      expect(packages.dependencies).toContain("valibot");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds express with root mount pattern", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-express-"));
    try {
      await scaffoldProject({
        projectName: "demo-express",
        targetDir: dir,
        type: "express",
        skipInstall: true,
      });
      const index = await readFile(path.join(dir, "src/index.ts"), "utf8");
      expect(index).toContain("taser.mount('/{*splat}', app)");
      expect(index).not.toContain("/api{/*splat}");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds hono with root mount pattern", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-hono-"));
    try {
      await scaffoldProject({
        projectName: "demo-hono",
        targetDir: dir,
        type: "hono",
        skipInstall: true,
      });
      const index = await readFile(path.join(dir, "src/index.ts"), "utf8");
      expect(index).toContain("app.all('/*', c => router.fetch(c.req.raw))");
      expect(index).not.toContain("/api/*");

      const taserTs = await readFile(path.join(dir, "src/taser.ts"), "utf8");
      expect(taserTs).not.toContain("NativeContext");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds bun runtime project", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-bun-"));
    try {
      await scaffoldProject({
        projectName: "demo-bun",
        targetDir: dir,
        type: "bun",
        skipInstall: true,
      });
      const index = await readFile(path.join(dir, "src/index.ts"), "utf8");
      expect(index).toContain("export default {");
      expect(index).toContain("return router.fetch(request)");

      const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as {
        scripts: Record<string, string>;
      };
      expect(pkg.scripts["dev:server"]).toBe("bun --watch src/index.ts");
      expect(pkg.scripts.start).toBe("bun src/index.ts");

      const packages = resolvePackages({
        projectName: "demo-bun",
        targetDir: dir,
        type: "bun",
      });
      expect(packages.devDependencies).toContain("@types/bun");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds deno runtime project", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-deno-"));
    try {
      await scaffoldProject({
        projectName: "demo-deno",
        targetDir: dir,
        type: "deno",
        skipInstall: true,
      });
      const index = await readFile(path.join(dir, "src/index.ts"), "utf8");
      expect(index).toContain("Deno.serve(");
      expect(index).toContain("router.fetch(request)");

      const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as {
        scripts: Record<string, string>;
      };
      expect(pkg.scripts["dev:server"]).toContain("deno run --watch");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds cloudflare-workers runtime project with wrangler.jsonc", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-cf-"));
    try {
      await scaffoldProject({
        projectName: "demo-cf",
        targetDir: dir,
        type: "cloudflare-workers",
        skipInstall: true,
      });
      const index = await readFile(path.join(dir, "src/index.ts"), "utf8");
      expect(index).toContain("export default {");
      expect(index).toContain("return router.fetch(request, env, ctx)");

      const wrangler = JSON.parse(await readFile(path.join(dir, "wrangler.jsonc"), "utf8")) as {
        name: string;
        main: string;
      };
      expect(wrangler.name).toBe("demo-cf");
      expect(wrangler.main).toBe("src/index.ts");

      const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as {
        scripts: Record<string, string>;
      };
      expect(pkg.scripts["dev:server"]).toBe("wrangler dev");
      expect(pkg.scripts.deploy).toBe("wrangler deploy");

      const packages = resolvePackages({
        projectName: "demo-cf",
        targetDir: dir,
        type: "cloudflare-workers",
      });
      expect(packages.devDependencies).toContain("wrangler");
      expect(packages.devDependencies).toContain("@cloudflare/workers-types");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds vercel runtime project with vercel.json", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-vercel-"));
    try {
      await scaffoldProject({
        projectName: "demo-vercel",
        targetDir: dir,
        type: "vercel",
        skipInstall: true,
      });
      const index = await readFile(path.join(dir, "src/index.ts"), "utf8");
      expect(index).toContain("import { handle } from 'hono/vercel'");
      expect(index).toContain("export default handle(app)");

      const vercel = JSON.parse(await readFile(path.join(dir, "vercel.json"), "utf8")) as {
        rewrites: { source: string; destination: string }[];
      };
      expect(vercel.rewrites[0]?.destination).toBe("/src/index.ts");

      const packages = resolvePackages({
        projectName: "demo-vercel",
        targetDir: dir,
        type: "vercel",
      });
      expect(packages.dependencies).toContain("hono");
      expect(packages.devDependencies).toContain("@vercel/node");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds aws-lambda, netlify, azure-functions, and google-cloud-run", async () => {
    const lambdaPackages = resolvePackages({
      projectName: "demo-lambda",
      targetDir: "/tmp/demo",
      type: "aws-lambda",
    });
    expect(lambdaPackages.dependencies).toContain("hono");
    expect(lambdaPackages.devDependencies).toContain("@types/aws-lambda");

    const netlifyPackages = resolvePackages({
      projectName: "demo-netlify",
      targetDir: "/tmp/demo",
      type: "netlify",
    });
    expect(netlifyPackages.dependencies).toContain("hono");
    expect(netlifyPackages.dependencies).toContain("@netlify/functions");

    const azurePackages = resolvePackages({
      projectName: "demo-azure",
      targetDir: "/tmp/demo",
      type: "azure-functions",
    });
    expect(azurePackages.dependencies).toContain("hono");
    expect(azurePackages.dependencies).toContain("@azure/functions");
    expect(azurePackages.dependencies).toContain("@marplex/hono-azurefunc-adapter");

    const gcrPackages = resolvePackages({
      projectName: "demo-gcr",
      targetDir: "/tmp/demo",
      type: "google-cloud-run",
    });
    expect(gcrPackages.dependencies).toContain("@hono/node-server");
  });

  it("scaffolds azure-functions with host.json and azureHonoHandler", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-azure-"));
    try {
      await scaffoldProject({
        projectName: "demo-azure",
        targetDir: dir,
        type: "azure-functions",
        skipInstall: true,
      });
      const index = await readFile(path.join(dir, "src/index.ts"), "utf8");
      expect(index).toContain("import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter'");
      expect(index).toContain("handler: azureHonoHandler(honoApp.fetch)");

      const host = JSON.parse(await readFile(path.join(dir, "host.json"), "utf8")) as {
        extensions?: { http?: { routePrefix?: string } };
      };
      expect(host.extensions?.http?.routePrefix).toBe("");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes .taser.json project config with type", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-config-"));
    try {
      await scaffoldProject({
        projectName: "demo-config",
        targetDir: dir,
        type: "hono",
        db: "prisma",
        driver: "mysql",
        logger: "winston",
        validator: "valibot",
        skipInstall: true,
      });

      const config = JSON.parse(await readFile(path.join(dir, ".taser.json"), "utf8")) as {
        type: string;
        db: string;
        driver: string;
        logger: string;
        validator: string;
      };
      expect(config).toEqual({
        type: "hono",
        db: "prisma",
        driver: "mysql",
        logger: "winston",
        validator: "valibot",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("cli type & validator parsing", () => {
  it("parses valid type flags", () => {
    expect(parseTypeFlag("node")).toBe("node");
    expect(parseTypeFlag("express")).toBe("express");
    expect(parseTypeFlag("hono")).toBe("hono");
    expect(parseTypeFlag("fastify")).toBe("fastify");
    expect(parseTypeFlag("bun")).toBe("bun");
    expect(parseTypeFlag("deno")).toBe("deno");
    expect(parseTypeFlag("aws-lambda")).toBe("aws-lambda");
    expect(parseTypeFlag("cloudflare-workers")).toBe("cloudflare-workers");
    expect(parseTypeFlag("netlify")).toBe("netlify");
    expect(parseTypeFlag("vercel")).toBe("vercel");
    expect(parseTypeFlag("azure-functions")).toBe("azure-functions");
    expect(parseTypeFlag("google-cloud-run")).toBe("google-cloud-run");
  });

  it("rejects invalid type flag", () => {
    expect(() => parseTypeFlag("unknown-platform")).toThrowError(/Invalid --type/);
  });

  it("buildParsedArgsFromCli parses type flag", () => {
    const args = buildParsedArgsFromCli({ type: "bun" }, ["test-app"]);
    expect(args.type).toBe("bun");
    expect(args.projectName).toBe("test-app");
  });

  it("buildParsedArgsFromCli falls back to framework for backward compatibility", () => {
    const args = buildParsedArgsFromCli({ framework: "express" }, ["test-app"]);
    expect(args.type).toBe("express");
  });

  it("parses valid validator flags", () => {
    expect(parseValidatorFlag("zod")).toBe("zod");
    expect(parseValidatorFlag("arktype")).toBe("arktype");
    expect(parseValidatorFlag("valibot")).toBe("valibot");
  });

  it("rejects invalid validator flag", () => {
    expect(() => parseValidatorFlag("yup")).toThrowError(/Invalid --validator/);
  });

  it("buildParsedArgsFromCli parses validator", () => {
    const args = buildParsedArgsFromCli({ validator: "arktype" }, ["test-app"]);
    expect(args.validator).toBe("arktype");
    expect(args.projectName).toBe("test-app");
  });
});

describe("getPackageGroups", () => {
  it("groups node deps and devDeps", () => {
    const groups = getPackageGroups("node");
    expect(groups.dependencies).toEqual(["@taserjs/router", "dotenv", "@hono/node-server"]);
    expect(groups.devDependencies).toEqual([
      "@taserjs/router-cli",
      "npm-run-all2",
      "tsdown",
      "tsx",
      "typescript@^5.9.3",
      "@types/node",
    ]);
  });

  it("includes express packages", () => {
    const groups = getPackageGroups("express");
    expect(groups.dependencies).toContain("express");
    expect(groups.dependencies).toContain("@taserjs/adapter-express");
    expect(groups.devDependencies).toContain("@types/express");
  });
});

describe("capabilities catalog", () => {
  it("lists types, db options, loggers, and validators", () => {
    const catalog = getCapabilitiesCatalog();
    expect(catalog.types).toContain("hono");
    expect(catalog.types).toContain("bun");
    expect(catalog.types).toContain("cloudflare-workers");
    expect(catalog.db.odms).toContain("drizzle");
    expect(catalog.db.defaultDriver).toBe("sqlite");
    expect(catalog.loggers).toContain("pino");
    expect(catalog.validators).toEqual(["zod", "arktype", "valibot"]);
  });
});

describe("package manager", () => {
  it("detects from npm_config_user_agent", async () => {
    const previous = process.env.npm_config_user_agent;
    try {
      process.env.npm_config_user_agent = "pnpm/10.6.2 npm/? node/v24.11.0";
      expect(resolveUserAgent()).toBe("pnpm");
      process.env.npm_config_user_agent = "npm/10.0.0 node/v24.11.0";
      expect(resolveUserAgent()).toBe("npm");
    } finally {
      if (previous === undefined) {
        delete process.env.npm_config_user_agent;
      } else {
        process.env.npm_config_user_agent = previous;
      }
    }
  });

  it("resolves install commands with -D flag for dev dependencies", () => {
    const pnpmDev = resolveInstallCommand("pnpm", ["typescript", "tsx"], true);
    expect(pnpmDev.command).toBe("pnpm");
    expect(pnpmDev.args).toEqual(["add", "-D", "typescript", "tsx"]);

    const pnpmProd = resolveInstallCommand("pnpm", ["express"], false);
    expect(pnpmProd.command).toBe("pnpm");
    expect(pnpmProd.args).toEqual(["add", "express"]);

    const npmDev = resolveInstallCommand("npm", ["typescript"], true);
    expect(npmDev.command).toBe("npm");
    expect(npmDev.args).toEqual(["i", "-D", "typescript"]);

    const yarnDev = resolveInstallCommand("yarn", ["typescript"], true);
    expect(yarnDev.command).toBe("yarn");
    expect(yarnDev.args).toEqual(["add", "-D", "typescript"]);

    const bunDev = resolveInstallCommand("bun", ["typescript"], true);
    expect(bunDev.command).toBe("bun");
    expect(bunDev.args).toEqual(["add", "-D", "typescript"]);
  });
});
