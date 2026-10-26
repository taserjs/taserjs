import { EventEmitter } from "node:events";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock("node:child_process", () => ({ spawn: spawnMock }));

import {
  addPackageCommands,
  installPackages,
  packageManagerName,
  resolveAgentSkillCommand,
  resolveGeneratorCommand,
  runAgentSkill,
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
  const generator = { pkg: "create-vite@latest", args: ["my-app", "--template", "react-ts"] };

  it("runs generators through dlx for pnpm", () => {
    expect(resolveGeneratorCommand("pnpm", generator)).toEqual({
      command: "pnpm",
      args: ["dlx", "create-vite@latest", "my-app", "--template", "react-ts"],
    });
  });

  it("skips npx's install confirmation", () => {
    const { command, args } = resolveGeneratorCommand("npm", generator);

    expect(command).toBe("npx");
    expect(args).toEqual(["--yes", "create-vite@latest", "my-app", "--template", "react-ts"]);
  });

  it("strips version flavours from the manager name", () => {
    expect(packageManagerName("yarn@berry")).toBe("yarn");
    expect(packageManagerName("pnpm")).toBe("pnpm");
  });
});

describe("resolveAgentSkillCommand", () => {
  it("pins the skill and skips prompts in headless mode for npm", () => {
    expect(resolveAgentSkillCommand("npm", { interactive: false })).toEqual({
      command: "npx",
      args: ["--yes", "skills", "add", "taserjs/taserjs", "--skill", "taserjs", "--yes"],
    });
  });

  it("runs through dlx for pnpm", () => {
    expect(resolveAgentSkillCommand("pnpm", { interactive: false })).toEqual({
      command: "pnpm",
      args: ["dlx", "skills", "add", "taserjs/taserjs", "--skill", "taserjs", "--yes"],
    });
  });

  it("runs through bun x for bun", () => {
    expect(resolveAgentSkillCommand("bun", { interactive: false })).toEqual({
      command: "bun",
      args: ["x", "skills", "add", "taserjs/taserjs", "--skill", "taserjs", "--yes"],
    });
  });

  it("omits the skill selection and --yes when interactive", () => {
    expect(resolveAgentSkillCommand("npm", { interactive: true })).toEqual({
      command: "npx",
      args: ["--yes", "skills", "add", "taserjs/taserjs"],
    });
  });
});

describe("runAgentSkill (headless)", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("runs the skills CLI non-interactively and pipes stderr", async () => {
    stubSpawn((child) => child.emit("close", 0));

    await expect(runAgentSkill("npm", WORKING_DIR, false)).resolves.toBeUndefined();

    expect(spawnMock.mock.calls[0]?.[0]).toBe("npx");
    expect(spawnMock.mock.calls[0]?.[1]).toEqual([
      "--yes",
      "skills",
      "add",
      "taserjs/taserjs",
      "--skill",
      "taserjs",
      "--yes",
    ]);
    expect(spawnMock.mock.calls[0]?.[2]).toMatchObject({
      cwd: WORKING_DIR,
      stdio: ["ignore", "ignore", "pipe"],
    });
  });

  it("rejects with the captured stderr when it fails", async () => {
    stubSpawn((child) => {
      child.stderr.emit("data", Buffer.from("network unavailable"));
      child.emit("close", 1);
    });

    await expect(runAgentSkill("npm", WORKING_DIR, false)).rejects.toThrow(
      /exit code 1[\s\S]*network unavailable/,
    );
  });
});

describe("runAgentSkill (interactive)", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("inherits stdio so the skills CLI can prompt", async () => {
    stubSpawn((child) => child.emit("close", 0));

    await expect(runAgentSkill("npm", WORKING_DIR, true)).resolves.toBeUndefined();

    expect(spawnMock.mock.calls[0]?.[2]).toMatchObject({ cwd: WORKING_DIR, stdio: "inherit" });
  });

  it("treats a SIGINT cancellation as success", async () => {
    stubSpawn((child) => child.emit("close", 130));

    await expect(runAgentSkill("npm", WORKING_DIR, true)).resolves.toBeUndefined();
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
