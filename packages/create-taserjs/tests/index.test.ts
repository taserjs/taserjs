import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run, runCreate, runCreateCommand, scaffoldProject } from "../src/index.js";

describe("create-taserjs", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "create-taser-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("exports run, runCreate, runCreateCommand, and scaffoldProject", () => {
    expect(typeof run).toBe("function");
    expect(typeof runCreate).toBe("function");
    expect(typeof runCreateCommand).toBe("function");
    expect(typeof scaffoldProject).toBe("function");
  });

  it("scaffolds a project when run() is called with argv", async () => {
    const targetDir = join(tempDir, "scaffolded-via-bin");
    await run([targetDir, "--template", "ts"]);

    expect(existsSync(join(targetDir, "package.json"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "server.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "routes", "index.get.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", "routes", "$.ts"))).toBe(true);
    expect(existsSync(join(targetDir, "src", ".taserjs", "routes.gen.ts"))).toBe(true);
  });
});
