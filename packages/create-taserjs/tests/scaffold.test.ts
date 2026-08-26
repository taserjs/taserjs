import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getCapabilitiesCatalog } from "../src/addons/registry.js";
import { validateProjectName } from "../src/core/validate-project-name.js";
import { resolveInstallCommand, resolveUserAgent } from "../src/core/package-manager.js";
import { parsePresetFlag, parseValidatorFlag } from "../src/core/parse-options.js";
import { buildParsedArgsFromCli } from "../src/commands/create.js";
import { resolveScaffoldDefaults } from "../src/core/parse-options.js";
import { resolvePackages, scaffoldProject } from "../src/scaffold.js";

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
  it("writes a pure node project using Nitro synthesized entry (no server.ts by default)", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-"));
    try {
      await scaffoldProject({
        projectName: "demo",
        targetDir: dir,
        preset: "node-server",
        skipInstall: true,
      });

      await expect(readFile(path.join(dir, "src/index.ts"), "utf8")).rejects.toThrow();
      await expect(readFile(path.join(dir, "src/server.ts"), "utf8")).rejects.toThrow();
      await expect(readFile(path.join(dir, "nitro.config.ts"), "utf8")).rejects.toThrow();
      await expect(readFile(path.join(dir, ".env"), "utf8")).rejects.toThrow();

      const viteConfig = await readFile(path.join(dir, "vite.config.ts"), "utf8");
      expect(viteConfig).toContain("taser()");
      expect(viteConfig).toContain("nitro()");

      const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as {
        dependencies?: Record<string, string>;
        imports?: Record<string, string>;
        scripts: Record<string, string>;
      };
      expect(pkg.imports?.["#taserjs/router"]).toBe("./src/taser.ts");
      expect(pkg.scripts.dev).toBe("vite");
      expect(pkg.scripts.build).toBe("vite build");
      expect(pkg.scripts.start).toBe("node .output/server/index.mjs");

      const tsconfig = JSON.parse(await readFile(path.join(dir, "tsconfig.json"), "utf8")) as {
        compilerOptions: { baseUrl?: string; paths?: Record<string, string[]> };
        include: string[];
      };
      expect(tsconfig.compilerOptions.paths?.["#taserjs/router"]).toEqual(["./src/taser.ts"]);
      expect(tsconfig.include).toContain(".taser/types/**/*.d.ts");

      const indexRoute = await readFile(path.join(dir, "src/routes/index.get.ts"), "utf8");
      expect(indexRoute).toContain("#taserjs/router");
      expect(indexRoute).toContain("const GET = t.get('/')");
      expect(indexRoute).toContain("export type RouteContext = typeof GET.$Infer.Context");
      expect(indexRoute).toContain("export const Route = GET.handler(");

      const taserTs = await readFile(path.join(dir, "src/taser.ts"), "utf8");
      expect(taserTs).toContain("response: { validate: true }");
      expect(taserTs).toContain("./context.js");

      const rootLayout = await readFile(path.join(dir, "src/routes/$.ts"), "utf8");
      expect(rootLayout).toContain("cors");
      expect(rootLayout).toContain("#taserjs/router");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("emits nitro.config.ts for non-node presets", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-cloudflare-"));
    try {
      await scaffoldProject({
        projectName: "demo-cloudflare",
        targetDir: dir,
        preset: "cloudflare-module",
        skipInstall: true,
      });

      const config = await readFile(path.join(dir, "nitro.config.ts"), "utf8");
      expect(config).toContain("preset: 'cloudflare-module'");

      const wrangler = JSON.parse(
        (await readFile(path.join(dir, "wrangler.jsonc"), "utf8")).replace(/^\/\/.*$/gm, ""),
      ) as { name?: string };
      expect(wrangler.name).toBe("demo-cloudflare");

      const pkg = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as {
        scripts: Record<string, string>;
      };
      // Platform-deployed targets must not emit a local start script.
      expect(pkg.scripts.start).toBeUndefined();
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
        preset: "node-server",
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
        preset: "node-server",
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
      preset: "node-server",
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
      preset: "node-server",
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
      preset: "node-server",
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
        preset: "node-server",
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
        preset: "node-server",
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
      preset: "node-server",
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
      preset: "node-server",
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
        preset: "node-server",
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
        preset: "node-server",
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
        preset: "node-server",
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
        preset: "node-server",
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
        preset: "node-server",
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
        preset: "node-server",
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
        preset: "node-server",
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
        preset: "node-server",
        validator: "valibot",
      });
      expect(packages.dependencies).toContain("valibot");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds express with server.node.ts host entry", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-express-"));
    try {
      await scaffoldProject({
        projectName: "demo-express",
        targetDir: dir,
        framework: "express",
        skipInstall: true,
      });
      const serverNode = await readFile(path.join(dir, "src/server.node.ts"), "utf8");
      expect(serverNode).toContain("import express from 'express'");
      expect(serverNode).toContain("export default app");

      const packages = resolvePackages({
        projectName: "demo-express",
        targetDir: dir,
        framework: "express",
        preset: "node-server",
      });
      expect(packages.dependencies).toContain("srvx");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds hono with server.ts host entry", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-hono-"));
    try {
      await scaffoldProject({
        projectName: "demo-hono",
        targetDir: dir,
        framework: "hono",
        skipInstall: true,
      });
      const server = await readFile(path.join(dir, "src/server.ts"), "utf8");
      expect(server).toContain("import { Hono } from 'hono'");
      expect(server).toContain("export default app");

      // Fetch-native hosts never need the srvx bridge.
      const packages = resolvePackages({
        projectName: "demo-hono",
        targetDir: dir,
        framework: "hono",
        preset: "node-server",
      });
      expect(packages.dependencies).toContain("hono");
      expect(packages.dependencies).not.toContain("srvx");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("scaffolds fastify with server.node.ts host entry", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-fastify-"));
    try {
      await scaffoldProject({
        projectName: "demo-fastify",
        targetDir: dir,
        framework: "fastify",
        skipInstall: true,
      });
      const serverNode = await readFile(path.join(dir, "src/server.node.ts"), "utf8");
      expect(serverNode).toContain("import Fastify from 'fastify'");
      expect(serverNode).toContain("await app.ready()");
      expect(serverNode).toContain("export default app.routing");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects framework × deploy combinations that cannot run", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-clash-"));
    try {
      await expect(
        scaffoldProject({
          projectName: "demo-clash",
          targetDir: dir,
          framework: "express",
          preset: "cloudflare-module",
          skipInstall: true,
        }),
      ).rejects.toThrowError(/requires the Node runtime/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes .taser.json project config with framework and preset", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "create-taser-config-"));
    try {
      await scaffoldProject({
        projectName: "demo-config",
        targetDir: dir,
        framework: "hono",
        db: "prisma",
        driver: "mysql",
        logger: "winston",
        validator: "valibot",
        skipInstall: true,
      });

      const config = JSON.parse(await readFile(path.join(dir, ".taser.json"), "utf8")) as {
        framework: string;
        preset: string;
        db: string;
        driver: string;
        logger: string;
        validator: string;
      };
      expect(config).toEqual({
        framework: "hono",
        preset: "node-server",
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

describe("cli preset & validator parsing", () => {
  it("accepts curated deploy targets verbatim", () => {
    for (const id of ["node-server", "bun", "deno-deploy", "cloudflare-module", "vercel"]) {
      expect(parsePresetFlag(id)).toEqual({ preset: id });
    }
  });

  it("passes unknown ids through to Nitro with a warning", () => {
    const parsed = parsePresetFlag("some-exotic-preset");
    expect(parsed.preset).toBe("some-exotic-preset");
    expect(parsed.warning).toMatch(/passing it through to Nitro/i);
  });

  it("rejects malformed preset ids", () => {
    expect(() => parsePresetFlag("../evil")).toThrowError(/Invalid --preset/);
    expect(() => parsePresetFlag("has space")).toThrowError(/Invalid --preset/);
  });

  it("buildParsedArgsFromCli parses preset flag", () => {
    const args = buildParsedArgsFromCli({ preset: "bun" }, ["test-app"]);
    expect(args.preset).toBe("bun");
    expect(args.projectName).toBe("test-app");
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

describe("resolvePackages", () => {
  it("groups pure node deps and devDeps", () => {
    const groups = resolvePackages({
      projectName: "demo",
      targetDir: "/tmp/demo",
      framework: "none",
      preset: "node-server",
    });
    expect(groups.dependencies).toEqual(["@taserjs/router", "dotenv"]);
    expect(groups.devDependencies).toEqual([
      "@taserjs/router-plugin",
      "nitro",
      "typescript@^5.9.3",
      "vite@^8.1.5",
      "@types/node",
    ]);
    expect(groups.scripts.start).toBe("node .output/server/index.mjs");
  });

  it("includes framework packages for express", () => {
    const groups = resolvePackages({
      projectName: "demo",
      targetDir: "/tmp/demo",
      framework: "express",
      preset: "node-server",
    });
    expect(groups.dependencies).toContain("express");
    expect(groups.devDependencies).toContain("@types/express");
  });

  it("adds wrangler tooling for cloudflare-module", () => {
    const groups = resolvePackages({
      projectName: "demo",
      targetDir: "/tmp/demo",
      framework: "none",
      preset: "cloudflare-module",
    });
    expect(groups.devDependencies).toContain("wrangler");
    expect(groups.devDependencies).toContain("@cloudflare/workers-types");
    expect(groups.scripts.start).toBeUndefined();
  });

  it("rejects runtime overrides that clash with the deploy target", () => {
    expect(() =>
      resolveScaffoldDefaults({
        projectName: "demo",
        preset: "bun",
        runtime: "node",
        yes: false,
        noInstall: false,
        json: false,
      }),
    ).toThrowError(/not valid for deploy target/i);

    expect(() =>
      resolveScaffoldDefaults({
        projectName: "demo",
        framework: "express",
        preset: "bun",
        yes: false,
        noInstall: false,
        json: false,
      }),
    ).toThrowError(/requires the Node runtime/i);
  });
});

describe("capabilities catalog", () => {
  it("lists frameworks, deploy targets, runtimes, db options, loggers, and validators", () => {
    const catalog = getCapabilitiesCatalog();
    expect(catalog.frameworks).toContain("hono");
    expect(catalog.deployTargets).toContain("bun");
    expect(catalog.deployTargets).toContain("cloudflare-module");
    expect(catalog.runtimes).toEqual(["node", "bun", "deno"]);
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
