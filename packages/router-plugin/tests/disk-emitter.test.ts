import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";

import { createTaserVirtualContext } from "../src/core/context.js";
import { writeDiskArtifacts, DISK_ARTIFACT_DIR } from "../src/core/emitter.js";

async function setupFixture(): Promise<string> {
  const testDir = await fsp.mkdtemp(join(tmpdir(), "taser-disk-emitter-"));
  const routesDir = join(testDir, "routes");
  await fsp.mkdir(routesDir, { recursive: true });

  await fsp.writeFile(
    join(testDir, "taser.ts"),
    `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp();
`,
  );
  await fsp.writeFile(
    join(routesDir, "$.ts"),
    `import { t } from "../taser.js";
export const Middleware = t.middleware("$").use((ctx, next) => next());
`,
  );
  await fsp.writeFile(
    join(routesDir, "index.get.ts"),
    `import { t } from "../taser.js";
export const Route = t.get("/").handler(() => undefined);
`,
  );
  return testDir;
}

describe("writeDiskArtifacts", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await setupFixture();
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  it("writes manifest, entry, and app artifacts to .taser", async () => {
    const ctx = createTaserVirtualContext({ rootDir: testDir });
    const result = await writeDiskArtifacts(ctx);

    expect(result.outDir).toBe(join(testDir, DISK_ARTIFACT_DIR));
    expect(result.files).toHaveLength(3);

    await Promise.all(
      ["manifest.ts", "entry.ts", "app.ts"].map((file) =>
        expect(fsp.access(join(result.outDir, file))).resolves.toBeUndefined(),
      ),
    );
  });

  it("rewrites virtual route specifiers to extensionless relative imports", async () => {
    const ctx = createTaserVirtualContext({ rootDir: testDir });
    await writeDiskArtifacts(ctx);

    const manifest = await fsp.readFile(join(testDir, ".taser", "manifest.ts"), "utf8");
    expect(manifest).not.toContain("#taserjs/routes");
    expect(manifest).toContain('"../routes/index.get"');
    expect(manifest).toContain('"../routes/$"');
    expect(manifest).not.toMatch(/#taserjs\/[a-z/-]+/);
  });

  it("rewrites the entry artifact to import taser.ts and ./manifest relatively", async () => {
    const ctx = createTaserVirtualContext({ rootDir: testDir });
    await writeDiskArtifacts(ctx);

    const entry = await fsp.readFile(join(testDir, ".taser", "entry.ts"), "utf8");
    expect(entry).toContain('from "../taser"');
    expect(entry).toContain('from "./manifest"');
    expect(entry).not.toContain("#taserjs");
  });

  it("emits a hosted-style app without global Response override or Nitro interop", async () => {
    const ctx = createTaserVirtualContext({ rootDir: testDir });
    await writeDiskArtifacts(ctx);

    const app = await fsp.readFile(join(testDir, ".taser", "app.ts"), "utf8");
    expect(app).not.toContain("globalThis.Response");
    expect(app).not.toContain("FastResponse");
    expect(app).not.toContain("createNitroApp");
    expect(app).toContain('from "./entry"');
    expect(app).toContain("export const taserApp = { fetch: handler }");
    expect(app).toContain("export const app = taserApp");
    expect(app).toContain("export default taserApp");
  });

  it("threads an explicit scope into the composed app", async () => {
    const ctx = createTaserVirtualContext({ rootDir: testDir });
    await writeDiskArtifacts(ctx, { scope: "/base" });

    const app = await fsp.readFile(join(testDir, ".taser", "app.ts"), "utf8");
    expect(app).toContain('/base"');
  });
});
