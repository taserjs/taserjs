import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { HostId } from "../src/core/types.js";
import { run, scaffoldProject } from "../src/index.js";
import { fixtureGenerator } from "./helpers.js";

type RealHost = Exclude<HostId, "none">;

describe("create-taserjs host frameworks", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "create-taser-host-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const scaffold = (options: Partial<Parameters<typeof scaffoldProject>[0]> = {}) => {
    const targetDir = join(tempDir, "host-app");
    return scaffoldProject({
      projectName: "host-app",
      targetDir,
      agent: "pnpm",
      skipInstall: true,
      ...options,
    }).then((result) => ({
      result,
      targetDir,
      read: (file: string) => readFileSync(join(targetDir, file), "utf-8"),
      exists: (file: string) => existsSync(join(targetDir, file)),
    }));
  };

  it("writes no host entry by default", async () => {
    const { exists, result } = await scaffold();

    expect(result.host).toBe("none");
    expect(exists("src/server.ts")).toBe(false);
    expect(exists("src/server.node.ts")).toBe(false);
  });

  describe.each<[RealHost, string, string, string[], string[]]>([
    ["express", "server.node.ts", "export default app;", ["express"], ["@types/express"]],
    ["fastify", "server.node.ts", "export default app.routing;", ["fastify"], []],
    ["hono", "server.ts", "export default app;", ["hono"], []],
    ["elysia", "server.ts", "export default app;", ["elysia"], []],
  ])("%s", (host, fileName, defaultExport, dependencies, devDependencies) => {
    it(`writes ${fileName} that Taser.js detects, and adds its packages`, async () => {
      const { read, exists, result } = await scaffold({ host });

      expect(result.host).toBe(host);
      expect(read(`src/${fileName}`)).toContain(defaultExport);
      expect(read(`src/${fileName}`)).toContain("/host-info");
      expect(exists(`src/${fileName === "server.ts" ? "server.node.ts" : "server.ts"}`)).toBe(
        false,
      );
      expect(result.dependencies).toEqual(expect.arrayContaining(dependencies));
      expect(result.devDependencies).toEqual(expect.arrayContaining(devDependencies));
    });
  });

  it("awaits Fastify readiness before exporting its router", async () => {
    const { read } = await scaffold({ host: "fastify" });

    expect(read("src/server.node.ts")).toMatch(/await app\.ready\(\);[\s\S]*app\.routing/);
  });

  it("places the host entry in the server directory of a Vite SPA", async () => {
    const targetDir = join(tempDir, "host-app");
    const { read, result } = await scaffold({
      framework: "vite",
      host: "hono",
      generator: fixtureGenerator("vite", targetDir, []),
    });

    expect(read("src/server/server.ts")).toContain("new Hono()");
    expect(result.dependencies).toContain("hono");
  });

  it("rejects a host for frameworks that own the server", async () => {
    await expect(
      scaffold({
        framework: "nextjs",
        host: "hono",
        generator: fixtureGenerator("nextjs", join(tempDir, "host-app"), []),
      }),
    ).rejects.toThrow(/owns its server/);
  });

  it("rejects Node hosts on Cloudflare Workers but allows fetch hosts", async () => {
    await expect(scaffold({ host: "express", preset: "cloudflare-module" })).rejects.toThrow(
      /cannot run on the "cloudflare-module" preset/,
    );

    const { result } = await scaffold({ host: "hono", preset: "cloudflare-module" });
    expect(result.host).toBe("hono");
  });

  it("rejects an unknown host at the CLI", async () => {
    await expect(
      run([join(tempDir, "cli-app"), "--host", "koa", "--yes", "--skip-install"]),
    ).rejects.toThrow();
  });

  it("accepts --host at the CLI", async () => {
    const targetDir = join(tempDir, "cli-app");
    await run([targetDir, "--host", "fastify", "--yes", "--skip-install"]);

    expect(existsSync(join(targetDir, "src/server.node.ts"))).toBe(true);
  });
});
