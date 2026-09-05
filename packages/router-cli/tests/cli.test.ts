import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import { runGenerate } from "../src/commands/generate.js";
import { resolveAppConfig } from "../src/commands/resolve-app-config.js";

describe("runGenerate", () => {
  it("resolves config and generates types with --config pointing to next.config.ts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-next-test-"));
    const serverDir = join(dir, "src", "server");
    const routesDir = join(serverDir, "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(serverDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";\nexport default createTaserApp();\n`,
    );

    writeFileSync(
      join(routesDir, "users.get.ts"),
      `import { t } from "@taserjs/router";\nexport default t.get("/users").handler(() => ({ ok: true }));\n`,
    );

    const configPath = join(dir, "next.config.ts");
    writeFileSync(
      configPath,
      `export default {
        __taserRouterPlugin: true,
        __taserOptions: {
          serverDir: "src/server",
          basePath: "/api"
        }
      };\n`,
    );

    const config = await resolveAppConfig(configPath);
    expect(config.source).toBe("next");
    expect(config.taser.serverDir).toBe("src/server");
    expect(config.basePath).toBe("/api");

    await runGenerate({ config: configPath });

    const typesPath = join(dir, ".taser", "types", "routes.d.ts");
    expect(existsSync(typesPath)).toBe(true);
    const content = readFileSync(typesPath, "utf8");
    expect(content).toContain("users.get");
    expect(content).toContain("AppContextGen");
    expect(content).toContain("AppContext: AppContextGen");
  });

  it("throws when configuration is missing or cannot be found", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-empty-"));
    const nonExistent = join(dir, "vite.config.ts");
    await expect(resolveAppConfig(nonExistent)).rejects.toThrow(
      /Could not detect valid Taser configuration/,
    );
  });

  it("maintains zero dependency on bundler plugin suite (@taserjs/router-plugin)", async () => {
    const pkgJson = JSON.parse(
      await import("node:fs/promises").then((f) =>
        f.readFile(new URL("../package.json", import.meta.url), "utf8"),
      ),
    );
    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
    expect(deps).not.toHaveProperty("@taserjs/router-plugin");
    expect(deps).not.toHaveProperty("@taserjs/router-core");
  });
});

describe("resolveAppConfig", () => {
  it("resolves function-based next.config.ts via --config", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-next-fn-"));
    const configPath = join(dir, "next.config.ts");
    writeFileSync(
      configPath,
      `export default (_phase, _ctx) => ({
        __taserRouterPlugin: true,
        __taserOptions: {
          serverDir: "server",
          basePath: "/v1",
          ignore: ["**/internal/**"]
        }
      });\n`,
    );

    const config = await resolveAppConfig(configPath);
    expect(config.source).toBe("next");
    expect(config.taser.serverDir).toBe("server");
    expect(config.basePath).toBe("/v1");
    expect(config.ignore).toContain("**/internal/**");
  });

  it("resolves next.config when __taserOptions is attached to webpack plugin", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-next-webpack-"));
    const configPath = join(dir, "next.config.ts");
    writeFileSync(
      configPath,
      `const fn = (cfg) => cfg;
      fn.__taserOptions = { serverDir: "custom-server", basePath: "/api" };
      export default {
        webpack: fn
      };\n`,
    );

    const config = await resolveAppConfig(configPath);
    expect(config.source).toBe("next");
    expect(config.taser.serverDir).toBe("custom-server");
    expect(config.basePath).toBe("/api");
  });

  it("resolves function-based vite.config.ts via --config", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-vite-fn-"));
    const configPath = join(dir, "vite.config.ts");
    writeFileSync(
      configPath,
      `export default () => ({
        plugins: [
          {
            name: "taser",
            __taserOptions: {
              serverDir: "src/api",
              basePath: "/api"
            }
          }
        ]
      });\n`,
    );

    const config = await resolveAppConfig(configPath);
    expect(config.source).toBe("vite");
    expect(config.taser.serverDir).toBe("src/api");
    expect(config.basePath).toBe("/api");
  });

  it("resolves function-based nitro.config.ts via --config", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-nitro-fn-"));
    const configPath = join(dir, "nitro.config.ts");
    writeFileSync(
      configPath,
      `export default () => ({
        modules: [
          {
            name: "taser",
            __taserOptions: {
              serverDir: "src/backend",
              basePath: "/backend"
            }
          }
        ]
      });\n`,
    );

    const config = await resolveAppConfig(configPath);
    expect(config.source).toBe("nitro");
    expect(config.taser.serverDir).toBe("src/backend");
    expect(config.basePath).toBe("/backend");
  });

  it("searches current directory when configFile is omitted", async () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "taser-cli-cwd-search-")));
    writeFileSync(
      join(dir, "vite.config.ts"),
      `export default {
        plugins: [{ name: "taser", __taserOptions: { serverDir: "cwd-server" } }]
      };\n`,
    );

    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      const config = await resolveAppConfig();
      expect(config.source).toBe("vite");
      expect(config.taser.serverDir).toBe("cwd-server");
      expect(config.rootDir).toBe(dir);
    } finally {
      process.chdir(prevCwd);
    }
  });

  it("throws error when current directory has no taser configuration", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-no-config-"));
    const prevCwd = process.cwd();
    process.chdir(dir);
    try {
      await expect(resolveAppConfig()).rejects.toThrow(/No Taser configuration found in/);
    } finally {
      process.chdir(prevCwd);
    }
  });

  it("shortcircuits to specific provider when --config is passed", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-explicit-config-"));
    writeFileSync(
      join(dir, "vite.config.ts"),
      `export default {
        plugins: [{ name: "taser", __taserOptions: { serverDir: "vite-server" } }]
      };\n`,
    );
    const nextConfigPath = join(dir, "next.config.ts");
    writeFileSync(
      nextConfigPath,
      `export default {
        __taserRouterPlugin: true,
        __taserOptions: { serverDir: "next-server", basePath: "/from-next" }
      };\n`,
    );

    // Explicitly target next.config.ts despite vite.config.ts existing
    const config = await resolveAppConfig(nextConfigPath);
    expect(config.source).toBe("next");
    expect(config.taser.serverDir).toBe("next-server");
    expect(config.basePath).toBe("/from-next");

    const serverDir = join(dir, "next-server");
    const routesDir = join(serverDir, "routes");
    mkdirSync(routesDir, { recursive: true });
    writeFileSync(
      join(serverDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";\nexport default createTaserApp();\n`,
    );
    writeFileSync(
      join(routesDir, "hello.get.ts"),
      `import { t } from "@taserjs/router";\nexport default t.get("/hello").handler(() => ({ ok: true }));\n`,
    );

    await runGenerate({ config: nextConfigPath });
    const typesPath = join(dir, ".taser", "types", "routes.d.ts");
    expect(existsSync(typesPath)).toBe(true);
    const content = readFileSync(typesPath, "utf8");
    expect(content).toContain("hello.get");
  });
});
