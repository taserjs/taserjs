import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { run, runGenerate } from "../src/cli.js";

const routeSource = (path: string) =>
  `import { t } from "@taserjs/router";\nexport default t.get("${path}").handler(() => new Response("ok"));`;

describe("cli commands", () => {
  let tempDir: string;
  let routesDir: string;
  let manifestFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-cli-cmd-test-"));
    routesDir = join(tempDir, "src", "routes");
    manifestFile = join(tempDir, "src", ".taserjs", "routes.gen.ts");
    mkdirSync(routesDir, { recursive: true });
    writeFileSync(join(routesDir, "index.get.ts"), routeSource("/"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("runGenerate writes the manifest using defaults", async () => {
    await runGenerate({ cwd: tempDir });

    expect(readFileSync(manifestFile, "utf-8")).toContain('"/"');
  });

  it("run(['generate', '--config', file]) honors the custom config file", async () => {
    const configPath = join(tempDir, "custom.config.ts");
    writeFileSync(configPath, 'export default { outputDir: "custom-out" };', "utf-8");

    const cwd = vi.spyOn(process, "cwd").mockReturnValue(tempDir);
    await run(["generate", "--config", configPath]);
    cwd.mockRestore();

    expect(existsSync(join(tempDir, "src", "custom-out", "routes.gen.ts"))).toBe(true);
  });

  it("rejects unknown commands", async () => {
    await expect(run(["deploy"])).rejects.toThrow(/valid command/);
  });

  it("prints help and version without generating", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await run(["--help"]);
    await run(["--version"]);

    expect(log).toHaveBeenCalledTimes(2);
    expect(String(log.mock.calls[0]?.[0])).toContain("taser generate");
    expect(existsSync(manifestFile)).toBe(false);
  });

  it("watch mode regenerates the manifest when a route is added", async () => {
    const watcher = await runGenerate({ cwd: tempDir, watch: true });
    if (!watcher) throw new Error("expected a watcher");

    try {
      await new Promise<void>((resolve) => watcher.once("ready", () => resolve()));
      writeFileSync(join(routesDir, "added.get.ts"), routeSource("/added"));
      await vi.waitFor(() => expect(readFileSync(manifestFile, "utf-8")).toContain('"/added"'), {
        timeout: 5000,
        interval: 50,
      });
    } finally {
      await watcher.close();
    }
  });
});
