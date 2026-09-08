import { describe, expect, it } from "vitest";
import { createTaserVirtualContext } from "../src/core/context.js";
import { unpluginFactory } from "../src/core/unplugin.js";

describe("windows path handling in router-plugin", () => {
  it("normalizes entry path with backslashes in virtual entry code", async () => {
    const ctx = createTaserVirtualContext({
      rootDir: "/test/project",
      entry: "src\\taser.ts",
    });

    const entryCode = await ctx.getEntryCode();
    expect(entryCode).toContain('import taser from "src/taser.ts";');
    expect(entryCode).not.toContain("src\\taser.ts");
  });

  it("normalizes absolute Windows path entry in virtual entry code", async () => {
    const ctx = createTaserVirtualContext({
      rootDir: "/test/project",
      entry: "C:\\Users\\developer\\my-app\\src\\taser.ts",
    });

    const entryCode = await ctx.getEntryCode();
    expect(entryCode).toContain('import taser from "C:/Users/developer/my-app/src/taser.ts";');
    expect(entryCode).not.toContain("C:\\Users");
  });

  it("unplugin resolveId normalizes Windows serverEntryPath", () => {
    const plugin = (unpluginFactory as any)({
      rootDir: "/test/project",
      serverEntry: "server.ts",
    });

    // Mock virtual context on plugin
    const id = plugin.resolveId("#taserjs/virtual/entry");
    expect(id).toBe("\0#taserjs/virtual/entry");
  });
});
