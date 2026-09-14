import { execSync } from "node:child_process";
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
      execSync(`${cmd.command} ${cmd.args.join(" ")}`, {
        cwd,
        stdio: "ignore",
      });
    }
  }

  if (packages.devDependencies.length > 0) {
    const cmd = resolveCommand(agent, "add", [
      ...(agent === "npm" ? ["--save-dev"] : ["-D"]),
      ...packages.devDependencies,
    ]);
    if (cmd) {
      execSync(`${cmd.command} ${cmd.args.join(" ")}`, {
        cwd,
        stdio: "ignore",
      });
    }
  }
}
