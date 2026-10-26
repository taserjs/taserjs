import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { run, runCreateCommand, scaffoldProject } from "../src/index.js";

const readJson = (file: string) => JSON.parse(readFileSync(file, "utf-8"));

describe("create-taserjs API-only scaffolds", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "create-taser-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("exports run, runCreateCommand, and scaffoldProject", () => {
    expect(typeof run).toBe("function");
    expect(typeof runCreateCommand).toBe("function");
    expect(typeof scaffoldProject).toBe("function");
  });

  it("scaffolds an API-only project on the Node.js Nitro preset", async () => {
    const targetDir = join(tempDir, "default-app");
    const result = await scaffoldProject({
      projectName: "default-app",
      targetDir,
      skipInstall: true,
    });

    expect(result.files).toEqual(
      expect.arrayContaining([
        "package.json",
        "tsconfig.json",
        "taserjs.config.ts",
        "vite.config.ts",
        "nitro.config.ts",
        "src/context.ts",
        "src/taser.ts",
        "src/routes/index.get.ts",
        "src/routes/$.ts",
        "src/.taserjs/routes.gen.ts",
      ]),
    );
    expect(result.preset).toBe("node-server");
    expect(result.devDependencies).toContain("nitro");

    expect(readJson(join(targetDir, "package.json")).scripts.start).toBe(
      "node .output/server/index.mjs",
    );
    expect(readFileSync(join(targetDir, "vite.config.ts"), "utf-8")).toContain("nitro()");

    const taserTs = readFileSync(join(targetDir, "src", "taser.ts"), "utf-8");
    expect(taserTs).toContain('import { context } from "./context.js"');
    expect(taserTs).toContain("defineTaser().context(context)");
    expect(taserTs).not.toContain("basePath");
  });

  it("installs Nitro and writes its config when a preset is chosen", async () => {
    const targetDir = join(tempDir, "node-app");
    const result = await scaffoldProject({
      projectName: "node-app",
      targetDir,
      preset: "node-server",
      skipInstall: true,
    });

    expect(result.devDependencies).toContain("nitro");
    expect(readFileSync(join(targetDir, "nitro.config.ts"), "utf-8")).toContain(
      'preset: "node-server"',
    );
    expect(readFileSync(join(targetDir, "vite.config.ts"), "utf-8")).toContain("nitro()");
    expect(readJson(join(targetDir, "package.json")).scripts.start).toBe(
      "node .output/server/index.mjs",
    );
  });

  it.each(["cloudflare-module", "vercel", "netlify", "aws-lambda", "bun"])(
    "passes the %s preset to Nitro without platform extras",
    async (preset) => {
      const targetDir = join(tempDir, `preset-${preset}`);
      const result = await scaffoldProject({
        projectName: `preset-${preset}`,
        targetDir,
        preset,
        skipInstall: true,
      });

      expect(readFileSync(join(targetDir, "nitro.config.ts"), "utf-8")).toContain(
        `preset: "${preset}"`,
      );
      expect(result.devDependencies).toContain("nitro");
      expect(result.files).not.toContain("wrangler.jsonc");
      expect(readJson(join(targetDir, "package.json")).scripts.start).toBeUndefined();
    },
  );

  it("scaffolds with a validator addon (zod) and generates fluent query schema", async () => {
    const targetDir = join(tempDir, "zod-app");
    await scaffoldProject({
      projectName: "zod-app",
      targetDir,
      validator: "zod",
      skipInstall: true,
    });

    const indexRoute = readFileSync(join(targetDir, "src", "routes", "index.get.ts"), "utf-8");
    expect(indexRoute).toContain('import { z } from "zod"');
    expect(indexRoute).toContain(".query(z.object");
  });

  it("scaffolds with database addon (drizzle) and logger addon (pino) bound to context.ts", async () => {
    const targetDir = join(tempDir, "db-logger-app");
    await scaffoldProject({
      projectName: "db-logger-app",
      targetDir,
      db: "drizzle",
      driver: "sqlite",
      logger: "pino",
      skipInstall: true,
    });

    const contextTs = readFileSync(join(targetDir, "src", "context.ts"), "utf-8");
    expect(contextTs).toContain('import { createDb } from "./db/index.js"');
    expect(contextTs).toContain('import { createLogger } from "./logger.js"');
    expect(contextTs).toContain("db: createDb()");
    expect(contextTs).toContain("logger: createLogger()");

    expect(existsSync(join(targetDir, "src", "db", "schema.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "db", "index.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "drizzle.config.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "logger.ts"))).toBe(true);
  });

  it("returns dependencies and devDependencies in ScaffoldResult", async () => {
    const result = await scaffoldProject({
      projectName: "deps-result-app",
      targetDir: join(tempDir, "deps-result-app"),
      validator: "zod",
      db: "drizzle",
      driver: "sqlite",
      skipInstall: true,
    });

    expect(result.dependencies).toEqual(
      expect.arrayContaining(["@taserjs/router", "@taserjs/runtime", "zod", "drizzle-orm"]),
    );
    expect(result.devDependencies).toEqual(
      expect.arrayContaining([
        "@taserjs/cli",
        "@taserjs/plugin",
        "vite",
        "typescript",
        "drizzle-kit",
      ]),
    );
  });

  it("executes the CLI runner via run() with argv and --yes flag", async () => {
    const targetDir = join(tempDir, "cli-app");
    await run([
      targetDir,
      "--framework",
      "none",
      "--preset",
      "node-server",
      "--validator",
      "valibot",
      "--yes",
      "--skip-install",
      "--no-skill",
    ]);

    expect(existsSync(join(targetDir, "package.json"))).toBe(true);
    expect(existsSync(join(targetDir, "nitro.config.ts"))).toBe(true);
    expect(readJson(join(targetDir, "package.json")).name).toBe("cli-app");
    const indexRoute = readFileSync(join(targetDir, "src", "routes", "index.get.ts"), "utf-8");
    expect(indexRoute).toContain("valibot");
  });

  it("defaults installSkill to true when not specified in headless mode", async () => {
    const targetDir = join(tempDir, "default-skill-app");
    let installedInDir: string | undefined;

    await runCreateCommand({
      projectName: "default-skill-app",
      targetDir,
      framework: "none",
      preset: "node-server",
      skipInstall: true,
      interactive: false,
      skillInstaller: async (dir) => {
        installedInDir = dir;
      },
    });

    expect(installedInDir).toBe(targetDir);
  });

  it("invokes skillInstaller when installSkill is true", async () => {
    const targetDir = join(tempDir, "skill-app");
    let installedInDir: string | undefined;

    await runCreateCommand({
      projectName: "skill-app",
      targetDir,
      framework: "none",
      preset: "node-server",
      skipInstall: true,
      interactive: false,
      installSkill: true,
      skillInstaller: async (dir) => {
        installedInDir = dir;
      },
    });

    expect(installedInDir).toBe(targetDir);
  });

  it("does not invoke skillInstaller when installSkill is false", async () => {
    const targetDir = join(tempDir, "no-skill-app");
    let called = false;

    await runCreateCommand({
      projectName: "no-skill-app",
      targetDir,
      framework: "none",
      preset: "node-server",
      skipInstall: true,
      interactive: false,
      installSkill: false,
      skillInstaller: async () => {
        called = true;
      },
    });

    expect(called).toBe(false);
  });

  it("invokes skillInstaller in interactive mode when installSkill is true", async () => {
    const targetDir = join(tempDir, "interactive-skill-app");
    let installedInDir: string | undefined;

    await runCreateCommand({
      projectName: "interactive-skill-app",
      targetDir,
      framework: "none",
      preset: "node-server",
      host: "none",
      validator: "none",
      db: "none",
      logger: "none",
      skipInstall: true,
      interactive: true,
      installSkill: true,
      skillInstaller: async (dir) => {
        installedInDir = dir;
      },
    });

    expect(installedInDir).toBe(targetDir);
  });

  it("does not invoke skillInstaller in interactive mode when installSkill is false", async () => {
    const targetDir = join(tempDir, "interactive-no-skill-app");
    let called = false;

    await runCreateCommand({
      projectName: "interactive-no-skill-app",
      targetDir,
      framework: "none",
      preset: "node-server",
      host: "none",
      validator: "none",
      db: "none",
      logger: "none",
      skipInstall: true,
      interactive: true,
      installSkill: false,
      skillInstaller: async () => {
        called = true;
      },
    });

    expect(called).toBe(false);
  });

  it("warns and continues when the headless skill install fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      await expect(
        runCreateCommand({
          projectName: "failed-skill-app",
          targetDir: join(tempDir, "failed-skill-app"),
          framework: "none",
          preset: "node-server",
          skipInstall: true,
          interactive: false,
          skillInstaller: async () => {
            throw new Error("boom");
          },
        }),
      ).resolves.toBeDefined();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("boom"));
    } finally {
      warn.mockRestore();
    }
  });

  it("warns and continues when the interactive skill install fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      await expect(
        runCreateCommand({
          projectName: "interactive-failed-skill-app",
          targetDir: join(tempDir, "interactive-failed-skill-app"),
          framework: "none",
          preset: "node-server",
          host: "none",
          validator: "none",
          db: "none",
          logger: "none",
          skipInstall: true,
          interactive: true,
          installSkill: true,
          skillInstaller: async () => {
            throw new Error("boom");
          },
        }),
      ).resolves.toBeDefined();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("boom"));
    } finally {
      warn.mockRestore();
    }
  });

  it("rejects the removed --runtime flag", async () => {
    await expect(
      run([join(tempDir, "runtime-app"), "--runtime", "bun", "--yes", "--skip-install"]),
    ).rejects.toThrow();
  });
});
