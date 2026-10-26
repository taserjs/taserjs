import { spawn, type StdioOptions } from "node:child_process";

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

interface RunCommandOptions {
  stdio?: StdioOptions;
  allowInterrupt?: boolean;
  shell?: boolean;
}

function runCommandAsync(
  command: string,
  args: string[],
  cwd: string,
  options: RunCommandOptions = {},
): Promise<void> {
  const { stdio = ["ignore", "ignore", "pipe"], allowInterrupt = false, shell = false } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio,
      shell,
      env: process.env,
    });

    let stderr = "";
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code, signal) => {
      if (code === 0 || (allowInterrupt && (code === 130 || signal === "SIGINT"))) {
        resolve();
      } else {
        const status = code === null ? `signal ${signal}` : `exit code ${code}`;
        const errorMsg = stderr.trim()
          ? `Command failed with ${status}: ${command} ${args.join(" ")}\n${stderr.trim()}`
          : `Command failed with ${status}: ${command} ${args.join(" ")}`;
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

/** The `skills add` command for the Taser.js skill, run through the detected package manager. */
export function resolveAgentSkillCommand(
  agent: Agent,
  { interactive }: { interactive: boolean },
): { command: string; args: string[] } {
  const args = ["add", "taserjs/taserjs"];
  if (!interactive) args.push("--skill", "taserjs", "--yes");
  return resolveGeneratorCommand(agent, { pkg: "skills", args });
}

export async function runAgentSkill(
  agent: Agent,
  cwd: string,
  interactive: boolean,
): Promise<void> {
  const { command, args } = resolveAgentSkillCommand(agent, { interactive });
  await runCommandAsync(command, args, cwd, {
    stdio: interactive ? "inherit" : ["ignore", "ignore", "pipe"],
    allowInterrupt: interactive,
    shell: process.platform === "win32",
  });
}
