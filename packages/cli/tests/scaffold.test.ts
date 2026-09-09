import { existsSync, readFileSync, rmSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scaffoldProject } from "../src/scaffold.js";

describe("Project Scaffolding Engine (scaffoldProject)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-scaffold-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("scaffolds a complete TypeScript project structure by default", () => {
    const targetDir = join(tempDir, "my-app");
    const result = scaffoldProject({
      targetDir,
      projectName: "my-app",
      template: "ts",
    });

    expect(result.projectName).toBe("my-app");
    expect(result.template).toBe("ts");
    expect(result.targetDir).toBe(targetDir);

    // Verify key files exist
    expect(existsSync(join(targetDir, "package.json"))).toBe(true);
    expect(existsSync(join(targetDir, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(targetDir, "taserjs.config.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "vite.config.ts"))).toBe(true);
    expect(existsSync(join(targetDir, ".gitignore"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "taser.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "server.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "routes", "index.get.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "routes", "$.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", ".taserjs", "routes.gen.ts"))).toBe(true);

    // Verify .gitignore includes .taserjs/
    const gitignore = readFileSync(join(targetDir, ".gitignore"), "utf-8");
    expect(gitignore).toContain(".taserjs/");

    // Verify vite.config.ts uses @taserjs/plugin/vite
    const viteConfig = readFileSync(join(targetDir, "vite.config.ts"), "utf-8");
    expect(viteConfig).toContain("@taserjs/plugin/vite");

    // Verify taserjs.config.ts imports defineConfig
    const taserConfig = readFileSync(join(targetDir, "taserjs.config.ts"), "utf-8");
    expect(taserConfig).toContain("defineConfig");

    // Verify src/server.ts imports routeManifest and mounts createTaserApp
    const serverFile = readFileSync(join(targetDir, "src", "server.ts"), "utf-8");
    expect(serverFile).toContain("routeManifest");
    expect(serverFile).toContain("createTaserApp");

    // Verify package.json contains scripts and dependencies
    const pkg = JSON.parse(readFileSync(join(targetDir, "package.json"), "utf-8"));
    expect(pkg.name).toBe("my-app");
    expect(pkg.type).toBe("module");
    expect(pkg.scripts.build).toBe("vite build");
    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.dependencies["@taserjs/runtime"]).toBeDefined();
    expect(pkg.dependencies["@taserjs/router"]).toBeDefined();
    expect(pkg.devDependencies["@taserjs/cli"]).toBeDefined();
    expect(pkg.devDependencies["@taserjs/plugin"]).toBeDefined();
  });

  it("scaffolds a TSX project with .tsx sample routes and JSX compiler options", () => {
    const targetDir = join(tempDir, "my-tsx-app");
    const result = scaffoldProject({
      targetDir,
      projectName: "my-tsx-app",
      template: "tsx",
    });

    expect(result.template).toBe("tsx");
    expect(existsSync(join(targetDir, "src", "routes", "index.get.tsx"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "routes", "$.tsx"))).toBe(true);
    expect(existsSync(join(targetDir, "src", ".taserjs", "routes.gen.ts"))).toBe(true);

    const tsconfig = JSON.parse(readFileSync(join(targetDir, "tsconfig.json"), "utf-8"));
    expect(tsconfig.compilerOptions.jsx).toBe("react-jsx");
  });

  it("infers project name from directory name if not explicitly provided", () => {
    const targetDir = join(tempDir, "inferred-proj");
    const result = scaffoldProject({
      targetDir,
    });

    expect(result.projectName).toBe("inferred-proj");
    const pkg = JSON.parse(readFileSync(join(targetDir, "package.json"), "utf-8"));
    expect(pkg.name).toBe("inferred-proj");
  });
});
