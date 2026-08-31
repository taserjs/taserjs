import { describe, expect, it, vi } from "vitest";

import { resolveInstallCommand } from "../src/core/package-manager.js";

vi.mock("package-manager-detector/commands", async (importOriginal) => {
  const actual = await importOriginal<typeof import("package-manager-detector/commands")>();
  return {
    ...actual,
    resolveCommand: vi.fn((agent, command, args) => {
      if (agent === ("unknown" as any)) {
        return undefined;
      }
      return actual.resolveCommand(agent, command, args);
    }),
  };
});

describe("resolveInstallCommand", () => {
  it("resolves production install command for npm", () => {
    const result = resolveInstallCommand("npm", ["express", "dotenv"], false);
    expect(result.command).toBe("npm");
    expect(result.args).toEqual(["i", "express", "dotenv"]);
  });

  it("resolves dev dependency install command for npm with -D flag", () => {
    const result = resolveInstallCommand("npm", ["typescript", "vitest"], true);
    expect(result.command).toBe("npm");
    expect(result.args).toEqual(["i", "-D", "typescript", "vitest"]);
  });

  it("resolves production install command for pnpm", () => {
    const result = resolveInstallCommand("pnpm", ["express"], false);
    expect(result.command).toBe("pnpm");
    expect(result.args).toEqual(["add", "express"]);
  });

  it("resolves dev dependency install command for pnpm with -D flag", () => {
    const result = resolveInstallCommand("pnpm", ["typescript"], true);
    expect(result.command).toBe("pnpm");
    expect(result.args).toEqual(["add", "-D", "typescript"]);
  });

  it("resolves production install command for yarn", () => {
    const result = resolveInstallCommand("yarn", ["react"], false);
    expect(result.command).toBe("yarn");
    expect(result.args).toEqual(["add", "react"]);
  });

  it("resolves dev dependency install command for yarn with -D flag", () => {
    const result = resolveInstallCommand("yarn", ["typescript"], true);
    expect(result.command).toBe("yarn");
    expect(result.args).toEqual(["add", "-D", "typescript"]);
  });

  it("resolves production install command for bun", () => {
    const result = resolveInstallCommand("bun", ["hono"], false);
    expect(result.command).toBe("bun");
    expect(result.args).toEqual(["add", "hono"]);
  });

  it("resolves dev dependency install command for bun with -D flag", () => {
    const result = resolveInstallCommand("bun", ["typescript"], true);
    expect(result.command).toBe("bun");
    expect(result.args).toEqual(["add", "-D", "typescript"]);
  });

  it("handles empty package list for production and dev", () => {
    const prodResult = resolveInstallCommand("npm", [], false);
    expect(prodResult.command).toBe("npm");
    expect(prodResult.args).toEqual(["i"]);

    const devResult = resolveInstallCommand("npm", [], true);
    expect(devResult.command).toBe("npm");
    expect(devResult.args).toEqual(["i", "-D"]);
  });

  it("falls back to npm install when resolveCommand returns null/undefined", () => {
    const prodResult = resolveInstallCommand("unknown" as any, ["pkg-a"], false);
    expect(prodResult).toEqual({
      command: "npm",
      args: ["install", "pkg-a"],
    });

    const devResult = resolveInstallCommand("unknown" as any, ["pkg-b"], true);
    expect(devResult).toEqual({
      command: "npm",
      args: ["install", "-D", "pkg-b"],
    });
  });
});
