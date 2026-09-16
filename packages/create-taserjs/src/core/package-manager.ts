import { spawn } from "node:child_process";
import { getUserAgent, resolveCommand, type Agent } from "package-manager-detector";

export function resolveUserAgent(): Agent {
  const detected = getUserAgent();
  return (detected as Agent) || "pnpm";
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

export async function installPackages(
  agent: Agent,
  cwd: string,
  packages: {
    dependencies: string[];
    devDependencies: string[];
  },
): Promise<void> {
  if (packages.dependencies.length > 0) {
    const cmd = resolveCommand(agent, "add", packages.dependencies);
    if (cmd) {
      await runCommandAsync(cmd.command, cmd.args, cwd);
    }
  }

  if (packages.devDependencies.length > 0) {
    const cmd = resolveCommand(agent, "add", [
      ...(agent === "npm" ? ["--save-dev"] : ["-D"]),
      ...packages.devDependencies,
    ]);
    if (cmd) {
      await runCommandAsync(cmd.command, cmd.args, cwd);
    }
  }
}
