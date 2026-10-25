import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { FrameworkId } from "../src/core/types.js";
import { scaffoldProject } from "../src/index.js";
import { fixtureGenerator, type GeneratorCall } from "./helpers.js";

type UiFramework = Exclude<FrameworkId, "none">;

describe("create-taserjs framework scaffolds", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "create-taser-ui-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const scaffold = async (
    framework: UiFramework,
    options: Partial<Parameters<typeof scaffoldProject>[0]> = {},
  ) => {
    const targetDir = join(tempDir, "ui-app");
    const calls: GeneratorCall[] = [];
    const result = await scaffoldProject({
      projectName: "ui-app",
      targetDir,
      framework,
      agent: "pnpm",
      skipInstall: true,
      generator: fixtureGenerator(framework, targetDir, calls),
      ...options,
    });
    const read = (file: string) => readFileSync(join(targetDir, file), "utf-8");
    return { result, calls, read, targetDir };
  };

  describe.each<[UiFramework, string]>([
    ["vue", "create-vue@latest"],
    ["tanstack-router", "@tanstack/cli@latest"],
  ])("%s (Vite SPA)", (framework, generatorPackage) => {
    it("runs the official generator, then layers Taser with Nitro", async () => {
      const { result, calls, read, targetDir } = await scaffold(framework);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.command).toBe("pnpm");
      expect(calls[0]?.args).toEqual(expect.arrayContaining(["dlx", generatorPackage]));

      expect(result.preset).toBe("node-server");
      expect(read("vite.config.ts")).toMatch(/taser\(\{\s*standalone: false,?\s*\}\)/);
      expect(read("vite.config.ts")).toContain("nitro()");
      expect(read("nitro.config.ts")).toContain('preset: "node-server"');
      expect(read(".gitignore")).toContain(".output");

      expect(read("taserjs.config.ts")).toContain('serverDir: "src/server"');
      expect(read("src/server/taser.ts")).toContain('.basePath("/api")');
      expect(existsSync(join(targetDir, "src/server/routes/index.get.ts"))).toBe(true);
      expect(existsSync(join(targetDir, "src/server/.taserjs/routes.gen.ts"))).toBe(true);
    });

    it("writes a typed client and keeps the generator's scripts", async () => {
      const { result, read } = await scaffold(framework);

      expect(read("src/api.ts")).toContain(
        'import type { AppManifest } from "./server/.taserjs/routes.gen"',
      );
      expect(read("src/api.ts")).toContain('baseUrl: "/api"');

      const scripts = JSON.parse(read("package.json")).scripts;
      expect(scripts.dev).toBeDefined();
      expect(scripts.start).toBe("node .output/server/index.mjs");

      expect(result.dependencies).toEqual(
        expect.arrayContaining(["@taserjs/router", "@taserjs/runtime", "@taserjs/client"]),
      );
      expect(result.devDependencies).toEqual(
        expect.arrayContaining(["@taserjs/cli", "@taserjs/plugin", "nitro"]),
      );
      expect(result.devDependencies).not.toContain("vite");
    });

    it("requires a Nitro preset because bare has nothing to serve the built UI", async () => {
      await expect(scaffold(framework, { preset: "bare" })).rejects.toThrow(/needs Nitro/);
    });

    it("accepts another Nitro preset", async () => {
      const { read } = await scaffold(framework, { preset: "cloudflare-module" });

      expect(read("nitro.config.ts")).toContain('preset: "cloudflare-module"');
      expect(JSON.parse(read("package.json")).scripts.start).toBeUndefined();
    });
  });

  describe("tanstack-start", () => {
    it("scaffolds bare without Nitro and mounts the API through a splat route", async () => {
      const { result, read, targetDir } = await scaffold("tanstack-start");

      expect(result.preset).toBe("bare");
      expect(read("vite.config.ts")).toContain("taser()");
      expect(read("vite.config.ts")).not.toContain("nitro");
      expect(existsSync(join(targetDir, "nitro.config.ts"))).toBe(false);
      expect(result.devDependencies).not.toContain("nitro");
      expect(JSON.parse(read("package.json")).scripts.start).toBeUndefined();

      expect(read("src/routes/api/$.tsx")).toContain('createFileRoute("/api/$")');
      expect(read("src/routes/api/$.tsx")).toContain("POST: handle");
    });

    it("adds Nitro when a preset is chosen", async () => {
      const { result, read } = await scaffold("tanstack-start", { preset: "vercel" });

      expect(read("vite.config.ts")).toMatch(/viteReact\(\), nitro\(\)\]/);
      expect(read("nitro.config.ts")).toContain('preset: "vercel"');
      expect(result.devDependencies).toContain("nitro");
    });
  });

  describe("nextjs", () => {
    it("wraps the Next config and mounts the API route handler", async () => {
      const { calls, read, result } = await scaffold("nextjs");

      expect(calls[0]?.args).toEqual(
        expect.arrayContaining(["create-next-app@latest", "--skip-install", "--use-pnpm"]),
      );
      expect(read("next.config.ts")).toContain("export default createTaser()(nextConfig);");
      expect(read("src/app/api/[[...slug]]/route.ts")).toContain("export const POST = handle;");
      expect(read("src/api.ts")).toContain("http://localhost:3000/api");
      expect(result.devDependencies).not.toContain("vite");
    });

    it("uses extensionless imports because Turbopack cannot resolve .js to .ts", async () => {
      const { read } = await scaffold("nextjs", { db: "drizzle", logger: "pino" });

      expect(read("taserjs.config.ts")).toContain("extension: false");
      expect(read("src/server/taser.ts")).toContain('from "./context"');
      expect(read("src/server/.taserjs/routes.gen.ts")).toContain('import taser from "../taser"');
      expect(read("src/server/context.ts")).toContain('from "./db/index"');
      expect(read("src/server/db/index.ts")).toContain('from "./schema"');
      expect(read("src/server/db/index.ts")).not.toMatch(/from "\.{1,2}\/[^"]*\.js"/);
    });

    it("skips the deploy question and rejects Nitro presets", async () => {
      const { result } = await scaffold("nextjs");
      expect(result.preset).toBe("bare");
      expect(result.devDependencies).not.toContain("nitro");

      await expect(scaffold("nextjs", { preset: "vercel" })).rejects.toThrow(/own adapter/);
    });
  });

  it("puts database, logger and validator files under the server directory", async () => {
    const { read, targetDir } = await scaffold("vue", {
      db: "drizzle",
      driver: "postgres",
      logger: "pino",
      validator: "zod",
    });

    expect(read("src/server/db/schema.ts")).toContain("pgTable");
    expect(read("src/server/logger.ts")).toContain("pino");
    expect(read("src/server/routes/index.get.ts")).toContain('import { z } from "zod"');
    expect(read("drizzle.config.ts")).toContain('schema: "./src/server/db/schema.ts"');
    expect(read("src/server/context.ts")).toContain('import { createDb } from "./db/index.js"');
    expect(existsSync(join(targetDir, "src/db"))).toBe(false);
  });

  it("points Prisma's generated client at the server directory", async () => {
    const { read } = await scaffold("tanstack-start", { db: "prisma" });

    expect(read("prisma/schema.prisma")).toContain('output   = "../src/server/db/prisma"');
  });

  it("reports a manual step when the generated config is missing", async () => {
    const { result } = await scaffold("vue", {
      generator: async () => {
        const { mkdir, writeFile } = await import("node:fs/promises");
        const dir = join(tempDir, "ui-app");
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, "package.json"), '{"name":"ui-app","scripts":{}}');
      },
    });

    expect(result.manualSteps).toHaveLength(1);
    expect(result.manualSteps[0]).toContain("@taserjs/plugin/vite");
  });

  it("rejects an unknown framework", async () => {
    await expect(
      scaffoldProject({
        projectName: "x",
        targetDir: join(tempDir, "x"),
        framework: "svelte" as FrameworkId,
        skipInstall: true,
      }),
    ).rejects.toThrow(/Unknown framework "svelte"/);
  });
});
