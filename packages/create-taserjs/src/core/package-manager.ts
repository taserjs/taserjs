import { spawn } from "node:child_process";

import { getUserAgent, resolveCommand, type Agent } from "package-manager-detector";

import type { GeneratorCommand } from "../frameworks/types.js";
import type { GeneratorRunner } from "./types.js";

export function resolveUserAgent(): Agent {
  const detected = getUserAgent();
  return (detected as Agent) || "pnpm";
}

/** `yarn@berry` and `pnpm@6` are version flavours; generators only know the bare manager name. */
export function packageManagerName(agent: Agent): string {
  return agent.split("@")[0] ?? agent;
}

export function runScript(agent: Agent, script: string): string {
  switch (agent) {
    case "npm":
      return `npm run ${script}`;
    case "yarn":
      return `yarn ${script}`;
    case "bun":
      return `bun run ${script}`;
    case "pnpm":
    default:
      return `pnpm ${script}`;
  }
}

function runCommandAsync(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "ignore", "pipe"],
      env: process.env,
    });

    let stderr = "";
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const errorMsg = stderr.trim()
          ? `Command failed with exit code ${code}: ${command} ${args.join(" ")}\n${stderr.trim()}`
          : `Command failed with exit code ${code}: ${command} ${args.join(" ")}`;
        reject(new Error(errorMsg));
      }
    });
  });
}

/** Runs a framework's official generator through the package manager's `dlx`/`npx` equivalent. */
export const runGenerator: GeneratorRunner = ({ command, args, cwd }) =>
  runCommandAsync(command, args, cwd);

export function resolveGeneratorCommand(
  agent: Agent,
  { pkg, args }: GeneratorCommand,
): { command: string; args: string[] } {
  // npx would otherwise ask for confirmation before downloading the generator.
  const confirmFlag = packageManagerName(agent) === "npm" ? ["--yes"] : [];
  const resolved = resolveCommand(agent, "execute", [...confirmFlag, pkg, ...args]);
  if (!resolved) throw new Error(`${agent} cannot execute packages.`);
  return resolved;
}

export interface PackagesToAdd {
  dependencies: string[];
  devDependencies: string[];
}

/** The `add` commands that install the scaffold's dependencies, in the order they run. */
export function addPackageCommands(
  agent: Agent,
  packages: PackagesToAdd,
): { command: string; args: string[] }[] {
  const groups = [
    { names: packages.dependencies, flags: [] as string[] },
    { names: packages.devDependencies, flags: [agent === "npm" ? "--save-dev" : "-D"] },
  ];

  return groups
    .filter(({ names }) => names.length > 0)
    .flatMap(({ names, flags }) => resolveCommand(agent, "add", [...flags, ...names]) ?? []);
}

export async function installPackages(
  agent: Agent,
  cwd: string,
  packages: PackagesToAdd,
): Promise<void> {
  // Sequential on purpose: dev dependencies are skipped when the first install fails.
  await addPackageCommands(agent, packages).reduce(
    (previous, { command, args }) => previous.then(() => runCommandAsync(command, args, cwd)),
    Promise.resolve(),
  );
}
