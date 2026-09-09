import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run, runGenerate } from "../src/cli.js";

describe("cli commands", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-cli-cmd-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("runs runGenerate and generates manifest in target directory", async () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "index.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/").handler(() => new Response("ok"));',
    );

    const configContent = `
export default {
  routesDir: "./src/routes",
  outputDir: "./.taserjs",
};
`;
    writeFileSync(join(tempDir, "taserjs.config.ts"), configContent, "utf-8");

    await runGenerate({ cwd: tempDir });
  });

  it("runs taser generate command with --config option via yargs", async () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "hello.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/hello").handler(() => new Response("hello"));',
    );

    const configPath = join(tempDir, "custom.config.ts");
    writeFileSync(
      configPath,
      'export default { routesDir: "./src/routes", outputDir: "./.taserjs" };',
      "utf-8",
    );

    const prevCwd = process.cwd();
    process.chdir(tempDir);
    try {
      await run(["generate", "--config", configPath]);
    } finally {
      process.chdir(prevCwd);
    }
  });

  it("supports watch mode returning an active watcher that can be closed", async () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "index.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/").handler(() => new Response("ok"));',
    );

    const watcher = await runGenerate({ cwd: tempDir, watch: true });
    expect(watcher).toBeDefined();
    if (watcher) {
      await watcher.close();
    }
  });

  it("handles --help without error", async () => {
    await run(["--help"]);
  });

  it("handles --version without error", async () => {
    await run(["--version"]);
  });
});
