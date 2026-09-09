import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { build } from "vite";
import { runCreateCommand, scaffoldProject } from "create-taserjs";
import { taser } from "../src/vite.js";
import { applyTaserNitro } from "../src/nitro.js";

describe("E2E Scaffolding Engine, Nitro Plugin, Build, and Request Serving", { timeout: 30000 }, () => {
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

    const srvxTarget = resolve(monorepoRoot, "packages/plugin/node_modules/srvx");
    if (existsSync(srvxTarget)) {
      const srvxLink = join(projectDir, "node_modules", "srvx");
      if (!existsSync(srvxLink)) {
        symlinkSync(srvxTarget, srvxLink, "dir");
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

  it("scaffolds a complete project structure, runs Vite build, and serves requests cleanly", async () => {
    const projectDir = join(tempDir, "sample-app");

    // 1. Scaffold project via runCreateCommand
    await runCreateCommand({
      targetDir: projectDir,
      projectName: "sample-app",
      skipInstall: true,
      interactive: false,
    });

    setupLocalWorkspaceLinks(projectDir);

    // 2. Verify all expected files were generated
    expect(existsSync(join(projectDir, "taserjs.config.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "vite.config.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "server.ts"))).toBe(false);
    expect(existsSync(join(projectDir, "src", "routes", "index.get.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "routes", "$.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "taser.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "src", "context.ts"))).toBe(true);
    expect(existsSync(join(projectDir, ".gitignore"))).toBe(true);

    const gitignore = readFileSync(join(projectDir, ".gitignore"), "utf-8");
    expect(gitignore).toContain(".taserjs/");

    const viteConfig = readFileSync(join(projectDir, "vite.config.ts"), "utf-8");
    expect(viteConfig).toContain("@taserjs/plugin/vite");

    // 3. Run Vite build on the scaffolded project (pure plugin-driven SSR build)
    await build({
      root: projectDir,
      configFile: false,
      plugins: [taser({ cwd: projectDir })],
      logLevel: "silent",
    });

    // 4. Verify generated manifest and compiled output
    const manifestPath = join(projectDir, "src", ".taserjs", "routes.gen.ts");
    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(join(projectDir, "dist", "serve.mjs"))).toBe(true);

    // 5. Import compiled serve bundle or routes manifest and verify request dispatch
    const routesModule = await import(join(projectDir, "src", ".taserjs", "routes.gen.ts"));
    const app = routesModule.app ?? routesModule.default;
    expect(app).toBeDefined();

    const response = await app.request("http://localhost/");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ message: "Welcome to Taser.js!" });
  });

  it("scaffolded project can run pnpm build and serve requests", async () => {
    const projectDir = join(tempDir, "pnpm-build-app");

    await scaffoldProject({
      targetDir: projectDir,
      projectName: "pnpm-build-app",
      skipInstall: true,
    });

    setupLocalWorkspaceLinks(projectDir);

    // pnpm requires dependencies to be declared in package.json to link them or run scripts
    const pkgJsonPath = join(projectDir, "package.json");
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    pkg.dependencies = {
      "@taserjs/router": "workspace:*",
      "@taserjs/runtime": "workspace:*",
    };
    pkg.devDependencies = {
      "@taserjs/cli": "workspace:*",
      "@taserjs/plugin": "workspace:*",
      typescript: "^5.9.3",
      vite: "^8.2.2",
    };
    writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2));

    execSync("pnpm run build", {
      cwd: projectDir,
      stdio: "pipe",
    });

    expect(existsSync(join(projectDir, "dist", "serve.mjs"))).toBe(true);

    const routesModule = await import(join(projectDir, "src", ".taserjs", "routes.gen.ts"));
    const app = routesModule.app ?? routesModule.default;
    expect(app).toBeDefined();

    const response = await app.request("http://localhost/");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Welcome to Taser.js!" });
  });

  it("scaffolded project can run pnpm install and pnpm build cleanly", async () => {
    const projectDir = join(tempDir, "pnpm-install-app");

    await scaffoldProject({
      targetDir: projectDir,
      projectName: "pnpm-install-app",
      packageVersions: {
        "@taserjs/cli": `link:${resolve(monorepoRoot, "packages/cli")}`,
        "@taserjs/plugin": `link:${resolve(monorepoRoot, "packages/plugin")}`,
        "@taserjs/router": `link:${resolve(monorepoRoot, "packages/router")}`,
        "@taserjs/runtime": `link:${resolve(monorepoRoot, "packages/runtime")}`,
      },
      skipInstall: true,
    });

    setupLocalWorkspaceLinks(projectDir);

    const pkgJsonPath = join(projectDir, "package.json");
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    pkg.dependencies = {
      "@taserjs/router": `link:${resolve(monorepoRoot, "packages/router")}`,
      "@taserjs/runtime": `link:${resolve(monorepoRoot, "packages/runtime")}`,
    };
    pkg.devDependencies = {
      "@taserjs/cli": `link:${resolve(monorepoRoot, "packages/cli")}`,
      "@taserjs/plugin": `link:${resolve(monorepoRoot, "packages/plugin")}`,
      typescript: "^5.9.3",
      vite: "^8.2.2",
    };
    writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2));

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

    expect(existsSync(join(projectDir, "dist", "serve.mjs"))).toBe(true);

    const routesModule = await import(join(projectDir, "src", ".taserjs", "routes.gen.ts"));
    const app = routesModule.app ?? routesModule.default;
    expect(app).toBeDefined();

    const response = await app.request("http://localhost/");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Welcome to Taser.js!" });
  });

  it("tests Nitro module hooks in both standalone and middleware modes", async () => {
    const projectDir = join(tempDir, "nitro-test-app");

    await scaffoldProject({
      targetDir: projectDir,
      projectName: "nitro-test-app",
      preset: "node-server",
      skipInstall: true,
    });

    // 1. Standalone Nitro Mode
    const standaloneNitro: any = {
      options: {
        rootDir: projectDir,
        virtual: {},
        handlers: [],
      },
      hooks: {
        hookOnce: (_name: string, fn: any) => fn(),
        hook: () => {},
      },
    };

    await applyTaserNitro(standaloneNitro, { standalone: true, cwd: projectDir });

    expect(typeof standaloneNitro.options.virtual["#nitro/virtual/app"]).toBe("function");
    expect(typeof standaloneNitro.options.virtual["#nitro/virtual/routing"]).toBe("function");

    const standaloneAppCode = standaloneNitro.options.virtual["#nitro/virtual/app"]();
    expect(standaloneAppCode).toContain("createNitroApp");
    expect(standaloneAppCode).toContain("FastResponse");
    expect(standaloneAppCode).toContain("srvx");

    const routingCode = standaloneNitro.options.virtual["#nitro/virtual/routing"]();
    expect(routingCode).toContain("findRoute");

    // 2. Middleware / Hosted Nitro Mode (standalone: false)
    const middlewareNitro: any = {
      options: {
        rootDir: projectDir,
        virtual: {},
        handlers: [],
      },
      hooks: {
        hookOnce: (_name: string, fn: any) => fn(),
        hook: () => {},
      },
    };

    await applyTaserNitro(middlewareNitro, { standalone: false, cwd: projectDir });

    expect(middlewareNitro.options.handlers.length).toBeGreaterThan(0);
    expect(middlewareNitro.options.handlers[0].route).toBe("/**");
    const virtualHandlerCode = middlewareNitro.options.virtual["#taserjs/virtual/nitro-handler"]();
    expect(virtualHandlerCode).toContain("defineEventHandler");
    expect(virtualHandlerCode).toContain("toWebRequest");
    expect(virtualHandlerCode).toContain("taserApp.fetch(toWebRequest(event))");
  });
});
