import { join } from "pathe";
import { describe, expect, it } from "vitest";

import { shouldInvalidateOnWatchChange } from "../src/core/invalidation.js";
import type { TaserVirtualContext } from "../src/core/types.js";
import { DEFAULT_FORMATTING } from "@taserjs/router-generator";

function mockContext(overrides: Partial<TaserVirtualContext> = {}): TaserVirtualContext {
  const rootDir = overrides.rootDir ?? "/project";
  const routesDir = overrides.routesDir ?? join(rootDir, "src/routes");
  return {
    rootDir,
    serverDir: overrides.serverDir ?? join(rootDir, "src"),
    routesDir,
    serverEntryPath: overrides.serverEntryPath,
    taserEntryPath: overrides.taserEntryPath,
    basePath: overrides.basePath,
    ignore: overrides.ignore ?? [],
    entry: overrides.entry ?? "#taserjs/router",
    formatting: overrides.formatting ?? DEFAULT_FORMATTING,
    options: overrides.options ?? ({} as TaserVirtualContext["options"]),
    analysisCache: overrides.analysisCache ?? ({} as TaserVirtualContext["analysisCache"]),
    writeTypes: overrides.writeTypes ?? (async () => false),
    getManifestCode: overrides.getManifestCode ?? (async () => ""),
    getEntryCode: overrides.getEntryCode ?? (async () => ""),
    getModel:
      overrides.getModel ??
      (async () => {
        throw new Error("not implemented");
      }),
    invalidate: overrides.invalidate ?? (() => {}),
  };
}

describe("shouldInvalidateOnWatchChange", () => {
  const rootDir = "/project";
  const routesDir = join(rootDir, "src/routes");
  const serverEntryPath = join(rootDir, "src/server.ts");
  const taserEntryPath = join(rootDir, "src/taser.ts");

  it("returns true for route files under routesDir", () => {
    const ctx = mockContext({ routesDir, serverEntryPath, taserEntryPath });
    expect(shouldInvalidateOnWatchChange(join(routesDir, "index.get.ts"), ctx)).toBe(true);
  });

  it("returns false for unrelated project files", () => {
    const ctx = mockContext({ routesDir, serverEntryPath, taserEntryPath });
    expect(shouldInvalidateOnWatchChange(join(rootDir, "src/components/Foo.tsx"), ctx)).toBe(false);
  });

  it("returns false for node_modules paths", () => {
    const ctx = mockContext({ routesDir });
    expect(shouldInvalidateOnWatchChange(join(rootDir, "node_modules/react/index.js"), ctx)).toBe(
      false,
    );
  });

  it("returns false for virtual module ids", () => {
    const ctx = mockContext({ routesDir });
    expect(shouldInvalidateOnWatchChange("\0#taserjs/virtual/manifest", ctx)).toBe(false);
  });

  it("returns true when server entry changes", () => {
    const ctx = mockContext({ routesDir, serverEntryPath });
    expect(shouldInvalidateOnWatchChange(serverEntryPath, ctx)).toBe(true);
  });

  it("returns true when taser entry changes", () => {
    const ctx = mockContext({ routesDir, taserEntryPath });
    expect(shouldInvalidateOnWatchChange(taserEntryPath, ctx)).toBe(true);
  });

  it("returns false for paths outside rootDir", () => {
    const ctx = mockContext({ rootDir, routesDir });
    expect(shouldInvalidateOnWatchChange("/other/project/routes/index.get.ts", ctx)).toBe(false);
  });
});
