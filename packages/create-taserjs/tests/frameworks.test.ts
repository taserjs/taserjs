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
    ["vite", "create-vite@latest"],
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

    it("accepts another Nitro preset", async () => {
      const { read } = await scaffold(framework, { preset: "cloudflare-module" });

      expect(read("nitro.config.ts")).toContain('preset: "cloudflare-module"');
      expect(JSON.parse(read("package.json")).scripts.start).toBeUndefined();
    });
  });

  describe("vite templates", () => {
    it.each(["react", "vue", "svelte", "solid", "preact"])(
      "runs create-vite non-interactively with the %s TypeScript template",
      async (template) => {
        const { calls } = await scaffold("vite", { template });

        expect(calls[0]?.args).toEqual(
          expect.arrayContaining([
            "create-vite@latest",
            "--template",
            `${template}-ts`,
            "--no-interactive",
            "--no-immediate",
          ]),
        );
      },
    );

    it("defaults to the React template", async () => {
      const { result, calls } = await scaffold("vite");

      expect(result.template).toBe("react");
      expect(calls[0]?.args).toContain("react-ts");
    });

    it("rejects unknown templates and templates for frameworks without any", async () => {
      await expect(scaffold("vite", { template: "qwik" })).rejects.toThrow(
        /Unknown Vite template "qwik"/,
      );
      await expect(scaffold("nextjs", { template: "react" })).rejects.toThrow(/has no templates/);
    });
  });

  describe("tanstack-start", () => {
    it("deploys through the Node.js Nitro preset and mounts the API through a splat route", async () => {
      const { result, read, targetDir } = await scaffold("tanstack-start");

      expect(result.preset).toBe("node-server");
      expect(read("vite.config.ts")).toContain("taser()");
      expect(read("vite.config.ts")).toContain("nitro()");
      expect(existsSync(join(targetDir, "nitro.config.ts"))).toBe(true);
      expect(result.devDependencies).toContain("nitro");
      expect(JSON.parse(read("package.json")).scripts.start).toBe("node .output/server/index.mjs");

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
      expect(result.preset).toBeUndefined();
      expect(result.devDependencies).not.toContain("nitro");

      await expect(scaffold("nextjs", { preset: "vercel" })).rejects.toThrow(/own adapter/);
    });
  });

  describe("sveltekit", () => {
    it("runs sv, mounts the API as a fallback route, and keeps the generator's adapter", async () => {
      const { calls, read, result } = await scaffold("sveltekit");

      expect(calls[0]?.args).toEqual(
        expect.arrayContaining(["dlx", "sv@latest", "create", "--no-install", "--no-add-ons"]),
      );
      expect(result.preset).toBeUndefined();
      expect(read("vite.config.ts")).toMatch(/plugins: \[\s*taser\(\),\s*sveltekit\(/);
      expect(read("src/routes/api/[...path]/+server.ts")).toContain(
        "export const fallback: RequestHandler",
      );
      expect(read("src/routes/api/[...path]/+server.ts")).toContain(
        'from "../../../server/.taserjs/routes.gen"',
      );
      expect(read("src/api.ts")).toContain('baseUrl: "/api"');
      expect(read("taserjs.config.ts")).toContain('serverDir: "src/server"');
      expect(result.devDependencies).not.toContain("nitro");
      expect(JSON.parse(read("package.json")).scripts.start).toBeUndefined();
    });

    it("skips the deploy question and rejects presets and hosts", async () => {
      await expect(scaffold("sveltekit", { preset: "vercel" })).rejects.toThrow(/own adapter/);
      await expect(scaffold("sveltekit", { host: "hono" })).rejects.toThrow(/owns its server/);
    });
  });

  describe("react-router", () => {
    it("runs create-react-router, registers a resource route, and keeps the generator's server", async () => {
      const { calls, read, result } = await scaffold("react-router");

      expect(calls[0]?.args).toEqual(
        expect.arrayContaining(["create-react-router@latest", "--no-install", "--yes"]),
      );
      expect(result.preset).toBeUndefined();
      expect(read("vite.config.ts")).toMatch(
        /plugins: \[taser\(\), tailwindcss\(\), reactRouter\(\)\]/,
      );
      expect(read("app/routes.ts")).toContain('route("api/*", "routes/api.ts")');
      expect(read("app/routes/api.ts")).toContain("export const action = handle;");
      expect(read("app/routes/api.ts")).toContain('from "../server/.taserjs/routes.gen"');
      expect(read("taserjs.config.ts")).toContain('serverDir: "app/server"');
      expect(read("app/api.ts")).toContain(
        'import type { AppManifest } from "./server/.taserjs/routes.gen"',
      );
      expect(result.devDependencies).not.toContain("nitro");
      expect(JSON.parse(read("package.json")).scripts.start).toContain("react-router-serve");
    });

    it("skips the deploy question and rejects presets and hosts", async () => {
      await expect(scaffold("react-router", { preset: "vercel" })).rejects.toThrow(/own adapter/);
      await expect(scaffold("react-router", { host: "hono" })).rejects.toThrow(/owns its server/);
    });
  });

  describe("nuxt", () => {
    it("runs create-nuxt, mounts the API as a server route, and keeps Taser out of scanned folders", async () => {
      const { calls, read, result, targetDir } = await scaffold("nuxt");

      expect(calls[0]?.args).toEqual(
        expect.arrayContaining(["dlx", "create-nuxt@latest", "--no-install", "--no-modules"]),
      );
      expect(result.preset).toBeUndefined();
      expect(read("nuxt.config.ts")).toMatch(/plugins: \[taser\(\{\s*cwd: process\.cwd\(\)/);
      expect(read("server/api/[...slug].ts")).toContain("app.fetch(toWebRequest(event))");
      expect(read("server/api/index.ts")).toContain('from "./[...slug]"');
      expect(read("server/api/[...slug].ts")).toContain('from "../../api/.taserjs/routes.gen"');
      expect(read("taserjs.config.ts")).toContain('serverDir: "api"');
      expect(existsSync(join(targetDir, "api/routes/index.get.ts"))).toBe(true);
      expect(existsSync(join(targetDir, "server/routes"))).toBe(false);
      expect(result.devDependencies).not.toContain("nitro");
    });

    it("writes the typed client into the app directory with an absolute base URL", async () => {
      const { read } = await scaffold("nuxt");

      expect(read("app/api.ts")).toContain(
        'import type { AppManifest } from "../api/.taserjs/routes.gen"',
      );
      expect(read("app/api.ts")).toContain('baseUrl: "http://localhost:3000/api"');
    });

    it("skips the deploy question and rejects presets and hosts", async () => {
      await expect(scaffold("nuxt", { preset: "vercel" })).rejects.toThrow(/own adapter/);
      await expect(scaffold("nuxt", { host: "express" })).rejects.toThrow(/owns its server/);
    });
  });

  it("puts database, logger and validator files under the server directory", async () => {
    const { read, targetDir } = await scaffold("vite", {
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
    const { result } = await scaffold("vite", {
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
