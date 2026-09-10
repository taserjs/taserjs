import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEPLOY_TARGETS, run, runCreateCommand, scaffoldProject } from "../src/index.js";

describe("create-taserjs unit and integration tests", () => {
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

  it("scaffolds a default project (preset: none) cleanly", async () => {
    const targetDir = join(tempDir, "default-app");
    const result = await scaffoldProject({
      projectName: "default-app",
      targetDir,
      preset: "none",
      skipInstall: true,
    });

    expect(result.files).toContain("package.json");
    expect(result.files).toContain("tsconfig.json");
    expect(result.files).toContain("taserjs.config.ts");
    expect(result.files).toContain("vite.config.ts");
    expect(result.files).toContain("src/context.ts");
    expect(result.files).toContain("src/taser.ts");
    expect(result.files).not.toContain("src/server.ts");
    expect(result.files).toContain("src/routes/index.get.ts");
    expect(result.files).toContain("src/routes/$.ts");
    expect(result.files).toContain("src/.taserjs/routes.gen.ts");

    const taserTs = readFileSync(join(targetDir, "src", "taser.ts"), "utf-8");
    expect(taserTs).toContain('import { context } from "./context.js"');
    expect(taserTs).toContain("defineTaser().context(context)");

    const contextTs = readFileSync(join(targetDir, "src", "context.ts"), "utf-8");
    expect(contextTs).toContain("export const context = createContext");

    const indexRoute = readFileSync(join(targetDir, "src", "routes", "index.get.ts"), "utf-8");
    expect(indexRoute).toContain('t.get("/").handler');
  });

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

  it("supports all 10 presets and generates appropriate nitro configs and platform files", async () => {
    await Promise.all(
      DEPLOY_TARGETS.map(async (preset) => {
        const targetDir = join(tempDir, `preset-${preset}`);
        await scaffoldProject({
          projectName: `preset-${preset}`,
          targetDir,
          preset,
          skipInstall: true,
        });

        expect(existsSync(join(targetDir, "package.json"))).toBe(true);
        expect(existsSync(join(targetDir, "vite.config.ts"))).toBe(true);

        if (preset !== "none") {
          expect(existsSync(join(targetDir, "nitro.config.ts"))).toBe(true);
          const nitroConfig = readFileSync(join(targetDir, "nitro.config.ts"), "utf-8");
          expect(nitroConfig).toContain(`preset: "${preset}"`);
          expect(nitroConfig).toContain("standalone: true");
        }

        if (preset === "cloudflare-module") {
          expect(existsSync(join(targetDir, "wrangler.jsonc"))).toBe(true);
        }
      }),
    );
  });

  it("executes CLI command runner via run() with argv and --yes flag", async () => {
    const targetDir = join(tempDir, "cli-app");
    await run([
      targetDir,
      "--preset",
      "node-server",
      "--validator",
      "valibot",
      "--yes",
      "--skip-install",
    ]);

    expect(existsSync(join(targetDir, "package.json"))).toBe(true);
    expect(existsSync(join(targetDir, "nitro.config.ts"))).toBe(true);
    const indexRoute = readFileSync(join(targetDir, "src", "routes", "index.get.ts"), "utf-8");
    expect(indexRoute).toContain("valibot");
  });
});
