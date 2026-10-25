import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock("node:child_process", () => ({ spawn: spawnMock }));

import {
  addPackageCommands,
  installPackages,
  packageManagerName,
  resolveGeneratorCommand,
} from "../src/core/package-manager.js";

const WORKING_DIR = "/fake/project";

function createFakeChild() {
  const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
  child.stderr = new EventEmitter();
  return child;
}

function stubSpawn(behavior: (child: ReturnType<typeof createFakeChild>) => void): void {
  spawnMock.mockImplementation(() => {
    const child = createFakeChild();
    queueMicrotask(() => behavior(child));
    return child;
  });
}

describe("installPackages", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("resolves when the package manager exits with code 0", async () => {
    stubSpawn((child) => child.emit("close", 0));

    await expect(
      installPackages("npm", WORKING_DIR, { dependencies: ["zod"], devDependencies: [] }),
    ).resolves.toBeUndefined();

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0]?.[2]).toMatchObject({ cwd: WORKING_DIR });
  });

  it("rejects with the captured stderr when the child process exits with a non-zero code", async () => {
    stubSpawn((child) => {
      child.stderr.emit("data", Buffer.from("404 Not Found - package does not exist"));
      child.emit("close", 1);
    });

    await expect(
      installPackages("npm", WORKING_DIR, {
        dependencies: ["__non_existent_package_12345_xyz__"],
        devDependencies: [],
      }),
    ).rejects.toThrow(/exit code 1[\s\S]*404 Not Found/);
  });

  it("rejects when the package manager binary cannot be spawned", async () => {
    stubSpawn((child) => child.emit("error", new Error("spawn npm ENOENT")));

    await expect(
      installPackages("npm", WORKING_DIR, { dependencies: ["zod"], devDependencies: [] }),
    ).rejects.toThrow("spawn npm ENOENT");
  });

  it("skips dev dependency installation when the dependency install fails", async () => {
    stubSpawn((child) => child.emit("close", 1));

    await expect(
      installPackages("npm", WORKING_DIR, { dependencies: ["zod"], devDependencies: ["vite"] }),
    ).rejects.toThrow();

    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});

describe("resolveGeneratorCommand", () => {
  const generator = { pkg: "create-vue@latest", args: ["my-app", "--ts"] };

  it("runs generators through dlx for pnpm", () => {
    expect(resolveGeneratorCommand("pnpm", generator)).toEqual({
      command: "pnpm",
      args: ["dlx", "create-vue@latest", "my-app", "--ts"],
    });
  });

  it("skips npx's install confirmation", () => {
    const { command, args } = resolveGeneratorCommand("npm", generator);

    expect(command).toBe("npx");
    expect(args).toEqual(["--yes", "create-vue@latest", "my-app", "--ts"]);
  });

  it("strips version flavours from the manager name", () => {
    expect(packageManagerName("yarn@berry")).toBe("yarn");
    expect(packageManagerName("pnpm")).toBe("pnpm");
  });
});

describe("addPackageCommands", () => {
  it("adds dependencies and dev dependencies with separate commands", () => {
    const commands = addPackageCommands("pnpm", {
      dependencies: ["zod"],
      devDependencies: ["vite"],
    });

    expect(commands.map(({ args }) => args)).toEqual([
      ["add", "zod"],
      ["add", "-D", "vite"],
    ]);
  });

  it("returns nothing when there is nothing to add", () => {
    expect(addPackageCommands("npm", { dependencies: [], devDependencies: [] })).toEqual([]);
  });
});
