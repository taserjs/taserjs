import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fsp } from "node:fs";
import { join } from "pathe";
import { tmpdir } from "node:os";
import {
  createTaserVirtualContext,
  getComposedAppCode,
  SERVER_ENTRY_ALIAS_ID,
} from "../src/index.js";

/**
 * Hygiene invariant (issue 06 / H3): emitted artifacts must never embed
 * absolute filesystem paths — bundler aliases only.
 */
function absoluteImportSpecs(code: string): string[] {
  const specs: string[] = [];
  for (const match of code.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)) {
    const spec = match[1] ?? "";
    if (spec.startsWith("/") || /^[A-Za-z]:\//.test(spec)) {
      specs.push(spec);
    }
  }
  return specs;
}

describe("emitted artifact hygiene", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fsp.mkdtemp(join(tmpdir(), "taser-artifacts-test-"));
    const routesDir = join(testDir, "routes");
    await fsp.mkdir(routesDir, { recursive: true });
    await fsp.writeFile(
      join(testDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";
export const t = createTaserApp();
`,
    );
    await fsp.writeFile(
      join(routesDir, "index.get.ts"),
      `import { t } from "../taser.js";
export const Route = t.get("/").handler(() => undefined);
`,
    );
  });

  afterEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  it("virtual manifest uses alias specifiers, never absolute paths", async () => {
    const ctx = createTaserVirtualContext({ rootDir: testDir });
    const manifest = await ctx.getManifestCode();
    expect(manifest).toContain("#taserjs/routes/index.get");
    expect(absoluteImportSpecs(manifest)).toEqual([]);
  });

  it("virtual entry imports taser via alias, never an absolute path", async () => {
    const ctx = createTaserVirtualContext({ rootDir: testDir });
    const entry = await ctx.getEntryCode();
    expect(entry).toContain(`from "#taserjs/router"`);
    expect(absoluteImportSpecs(entry)).toEqual([]);
  });

  it("composed app imports the host server via alias, never an absolute path", () => {
    const app = getComposedAppCode({ serverEntrySpecifier: SERVER_ENTRY_ALIAS_ID, scope: "/" });
    expect(app).toContain(`from "#taserjs/server-entry"`);
    expect(app).not.toContain(testDir);
    expect(absoluteImportSpecs(app)).toEqual([]);
  });

  it("ambient d.ts rebases import specifiers onto typesDir-relative paths and emits virtual.d.ts", async () => {
    const ctx = createTaserVirtualContext({ rootDir: testDir });
    await ctx.writeTypes();
    const routesDts = await fsp.readFile(join(testDir, ".taser/types/routes.d.ts"), "utf8");
    expect(routesDts).toContain('from "../../routes/index.get');
    expect(routesDts).not.toContain("#taserjs/routes");
    expect(routesDts).not.toContain(testDir);

    const virtualDts = await fsp.readFile(join(testDir, ".taser/types/virtual.d.ts"), "utf8");
    expect(virtualDts).toContain('declare module "#taserjs/virtual/manifest"');
    expect(virtualDts).toContain('declare module "#taserjs/virtual/entry"');
  });
});
