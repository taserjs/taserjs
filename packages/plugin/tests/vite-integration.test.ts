import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { taser } from "../src/vite.js";

describe("vite dev server integration with @taserjs/plugin/vite", () => {
  let tempDir: string;
  let server: ViteDevServer | null = null;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-vite-int-"));
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });
  });

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("loads config from taserjs.config.ts and generates manifest on vite dev server startup", async () => {
    // Write custom taserjs.config.ts
    const configContent = `
export default {
  serverDir: "src",
  routesDir: "routes",
  outputDir: ".taserjs",
  formatting: { quotes: "single" },
};
`;
    writeFileSync(join(tempDir, "taserjs.config.ts"), configContent, "utf-8");

    // Write initial route
    const routeContent = `
import { t } from "@taserjs/router";
export default t.get("/health").handler(() => Response.json({ status: "ok" }));
`;
    writeFileSync(join(tempDir, "src", "routes", "health.get.ts"), routeContent, "utf-8");

    // Start Vite dev server
    server = await createServer({
      root: tempDir,
      server: {
        port: 0,
      },
      plugins: [taser({ cwd: tempDir })],
      logLevel: "silent",
    });

    await server.listen();

    const manifestPath = join(tempDir, "src", ".taserjs", "routes.ts");
    const dtsPath = join(tempDir, "src", ".taserjs", "routes.d.ts");

    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(dtsPath)).toBe(true);

    const manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).toContain("'/health'");
  });

  it("regenerates manifest when route files are added and removed in watcher", async () => {
    const route1 = join(tempDir, "src", "routes", "one.get.ts");
    writeFileSync(
      route1,
      'import { t } from "@taserjs/router";\nexport default t.get("/one").handler(() => Response.json(1));',
      "utf-8",
    );

    server = await createServer({
      root: tempDir,
      server: {
        port: 0,
      },
      plugins: [taser({ cwd: tempDir })],
      logLevel: "silent",
    });

    await server.listen();

    const manifestPath = join(tempDir, "src", ".taserjs", "routes.ts");
    expect(existsSync(manifestPath)).toBe(true);
    let manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).toContain('"/one"');
    expect(manifestCode).not.toContain('"/two"');

    // Simulate file addition by writing file and emitting watcher event
    const route2 = join(tempDir, "src", "routes", "two.get.ts");
    writeFileSync(
      route2,
      'import { t } from "@taserjs/router";\nexport default t.get("/two").handler(() => Response.json(2));',
      "utf-8",
    );

    // Emit event on Vite server watcher
    server.watcher.emit("add", route2);

    // Allow debounce and processing
    await new Promise((resolve) => setTimeout(resolve, 150));

    manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).toContain('"/two"');

    // Remove route 1
    unlinkSync(route1);
    server.watcher.emit("unlink", route1);

    await new Promise((resolve) => setTimeout(resolve, 150));

    manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).not.toContain('"/one"');
    expect(manifestCode).toContain('"/two"');
  });

  it("handles file renames within routes directory", async () => {
    const oldPath = join(tempDir, "src", "routes", "initial.get.ts");
    const newPath = join(tempDir, "src", "routes", "renamed.get.ts");

    writeFileSync(
      oldPath,
      'import { t } from "@taserjs/router";\nexport default t.get("/initial").handler(() => Response.json("init"));',
      "utf-8",
    );

    server = await createServer({
      root: tempDir,
      server: {
        port: 0,
      },
      plugins: [taser({ cwd: tempDir })],
      logLevel: "silent",
    });

    await server.listen();

    const manifestPath = join(tempDir, "src", ".taserjs", "routes.ts");
    expect(existsSync(manifestPath)).toBe(true);
    let manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).toContain('"/initial"');
    expect(manifestCode).not.toContain('"/renamed"');

    // Simulate rename: unlink old, write new, add new
    unlinkSync(oldPath);
    writeFileSync(
      newPath,
      'import { t } from "@taserjs/router";\nexport default t.get("/renamed").handler(() => Response.json("renamed"));',
      "utf-8",
    );
    server.watcher.emit("unlink", oldPath);
    server.watcher.emit("add", newPath);

    await new Promise((resolve) => setTimeout(resolve, 150));

    manifestCode = readFileSync(manifestPath, "utf-8");
    expect(manifestCode).not.toContain('"/initial"');
    expect(manifestCode).toContain('"/renamed"');
  });

  it("ignores file events inside .taserjs directory to prevent endless rebuild loops", async () => {
    const route = join(tempDir, "src", "routes", "test.get.ts");
    writeFileSync(
      route,
      'import { t } from "@taserjs/router";\nexport default t.get("/test").handler(() => Response.json("ok"));',
      "utf-8",
    );

    server = await createServer({
      root: tempDir,
      server: {
        port: 0,
      },
      plugins: [taser({ cwd: tempDir })],
      logLevel: "silent",
    });

    await server.listen();

    const manifestPath = join(tempDir, "src", ".taserjs", "routes.ts");
    expect(existsSync(manifestPath)).toBe(true);

    // Emitting change event on .taserjs/routes.ts should not throw or alter contents
    expect(() => {
      server!.watcher.emit("change", manifestPath);
    }).not.toThrow();
  });
});
