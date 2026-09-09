import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { build } from "vite";
import { runCreate, scaffoldProject } from "@taserjs/cli";
import { taser } from "../src/vite.js";

describe("E2E Scaffolding Engine, Build, and Request Serving", { timeout: 30000 }, () => {
  let tempDir: string;
  const monorepoRoot = resolve(__dirname, "../../..");

  beforeEach(() => {
    const scratchDir = join(monorepoRoot, ".scratch");
    if (!existsSync(scratchDir)) {
      mkdirSync(scratchDir, { recursive: true });
    }
    tempDir = mkdtempSync(join(scratchDir, "scaffold-e2e-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  function setupLocalWorkspaceLinks(projectDir: string): void {
    const taserDir = join(projectDir, "node_modules", "@taserjs");
    mkdirSync(taserDir, { recursive: true });

    const pkgs = ["cli", "plugin", "router", "runtime", "utils"];
    for (const pkg of pkgs) {
      const target = resolve(monorepoRoot, "packages", pkg);
      const linkPath = join(taserDir, pkg);
      if (!existsSync(linkPath)) {
        symlinkSync(target, linkPath, "dir");
      }
    }

    const honoServerTarget = resolve(monorepoRoot, "node_modules/@hono/node-server");
    if (existsSync(honoServerTarget)) {
      const honoDir = join(projectDir, "node_modules", "@hono");
      mkdirSync(honoDir, { recursive: true });
      const linkPath = join(honoDir, "node-server");
      if (!existsSync(linkPath)) {
        symlinkSync(honoServerTarget, linkPath, "dir");
      }
    }

    const viteTarget = resolve(monorepoRoot, "packages/plugin/node_modules/vite");
    if (existsSync(viteTarget)) {
      const viteLink = join(projectDir, "node_modules", "vite");
      if (!existsSync(viteLink)) {
        symlinkSync(viteTarget, viteLink, "dir");
      }
    }

    const binTarget = resolve(monorepoRoot, "packages/plugin/node_modules/.bin");
    if (existsSync(binTarget)) {
      const binLink = join(projectDir, "node_modules", ".bin");
      if (!existsSync(binLink)) {
        symlinkSync(binTarget, binLink, "dir");
      }
    }
  }

  it("scaffolded project can run pnpm build and serve requests", async () => {
    const projectDir = join(tempDir, "pnpm-build-app");

    scaffoldProject({
      targetDir: projectDir,
      projectName: "pnpm-build-app",
      template: "ts",
    });

    setupLocalWorkspaceLinks(projectDir);

    execSync("pnpm run build", {
      cwd: projectDir,
      stdio: "pipe",
    });

    expect(existsSync(join(projectDir, "dist", "server.js"))).toBe(true);

    const serverModule = await import(join(projectDir, "dist", "server.js"));
    const app = serverModule.app ?? serverModule.default;
    expect(app).toBeDefined();

    const response = await app.request("http://localhost/");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Welcome to Taser.js!" });
  });

  it("scaffolded project can run pnpm install and pnpm build cleanly", async () => {
    const projectDir = join(tempDir, "pnpm-install-app");

    scaffoldProject({
      targetDir: projectDir,
      projectName: "pnpm-install-app",
      template: "ts",
      packageVersions: {
        cli: `link:${resolve(monorepoRoot, "packages/cli")}`,
        plugin: `link:${resolve(monorepoRoot, "packages/plugin")}`,
        router: `link:${resolve(monorepoRoot, "packages/router")}`,
        runtime: `link:${resolve(monorepoRoot, "packages/runtime")}`,
      },
    });

    setupLocalWorkspaceLinks(projectDir);

    // Verify pnpm install runs cleanly
    execSync("pnpm install --offline", {
      cwd: projectDir,
      stdio: "pipe",
    });

    // Run build via pnpm run build
    execSync("pnpm run build", {
      cwd: projectDir,
      stdio: "pipe",
    });

    expect(existsSync(join(projectDir, "dist", "server.js"))).toBe(true);

    const serverModule = await import(join(projectDir, "dist", "server.js"));
    const app = serverModule.app ?? serverModule.default;
    expect(app).toBeDefined();

    const response = await app.request("http://localhost/");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Welcome to Taser.js!" });
  });

  it("scaffolds a complete project structure, runs Vite build, and serves requests cleanly", async () => {
    const projectDir = join(tempDir, "sample-app");

    // 1. Scaffold project via runCreate
    await runCreate({
      dir: projectDir,
      template: "ts",
      name: "sample-app",
      force: true,
      interactive: false,
    });

    setupLocalWorkspaceLinks(projectDir);

    // 2. Verify all expected files were generated
    expect(existsSync(join(projectDir, "taserjs.config.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "vite.config.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "server.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "routes", "index.get.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "routes", "$.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "taser.ts"))).toBe(true);
    expect(existsSync(join(projectDir, ".gitignore"))).toBe(true);

    const gitignore = readFileSync(join(projectDir, ".gitignore"), "utf-8");
    expect(gitignore).toContain(".taserjs/");

    const viteConfig = readFileSync(join(projectDir, "vite.config.ts"), "utf-8");
    expect(viteConfig).toContain("@taserjs/plugin/vite");

    const serverCode = readFileSync(join(projectDir, "src", "server.ts"), "utf-8");
    expect(serverCode).toContain("routeManifest");
    expect(serverCode).toContain("createTaserApp");

    // 3. Run Vite build on the scaffolded project
    await build({
      root: projectDir,
      configFile: false,
      plugins: [taser({ cwd: projectDir })],
      build: {
        ssr: "src/server.ts",
        outDir: "dist",
      },
      logLevel: "silent",
    });

    // 4. Verify generated manifest and compiled output
    const manifestPath = join(projectDir, "src", ".taserjs", "routes.gen.ts");
    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(join(projectDir, "dist", "server.js"))).toBe(true);

    // 5. Import compiled server bundle and verify request dispatch
    const serverModule = await import(join(projectDir, "dist", "server.js"));
    const app = serverModule.app ?? serverModule.default;
    expect(app).toBeDefined();

    const response = await app.request("http://localhost/");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ message: "Welcome to Taser.js!" });
  });

  it("scaffolds a TSX project, runs Vite build, and serves TSX responses cleanly", async () => {
    const projectDir = join(tempDir, "sample-tsx-app");

    // 1. Scaffold TSX project
    scaffoldProject({
      targetDir: projectDir,
      projectName: "sample-tsx-app",
      template: "tsx",
    });

    setupLocalWorkspaceLinks(projectDir);

    // 2. Verify TSX routes
    expect(existsSync(join(projectDir, "src", "routes", "index.get.tsx"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "routes", "$.tsx"))).toBe(true);

    // 3. Run Vite build
    await build({
      root: projectDir,
      configFile: false,
      plugins: [taser({ cwd: projectDir })],
      build: {
        ssr: "src/server.ts",
        outDir: "dist",
      },
      logLevel: "silent",
    });

    expect(existsSync(join(projectDir, "dist", "server.js"))).toBe(true);

    // 4. Import compiled server bundle and verify HTML response
    const serverModule = await import(join(projectDir, "dist", "server.js"));
    const app = serverModule.app ?? serverModule.default;
    expect(app).toBeDefined();

    const response = await app.request("http://localhost/");
    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).toContain("<h1>Welcome to Taser.js!</h1>");
  });
});
