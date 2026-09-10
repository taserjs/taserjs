import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { resolveUserAgent, runScript } from "../core/package-manager.js";
import { scaffoldProject } from "../core/scaffold-engine.js";
import { allowedRuntimeOverrides, DEFAULT_DEPLOY } from "../core/targets.js";
import type {
  DbDriver,
  DbOdm,
  DeployTarget,
  LoggerId,
  Runtime,
  ScaffoldOptions,
  ScaffoldResult,
  ValidatorId,
} from "../core/types.js";
import { DEPLOY_TARGETS } from "../core/types.js";

const DEPLOY_LABELS: Record<DeployTarget, string> = {
  none: "None (Standalone Vite SSR)",
  "node-server": "Node.js server (Nitro)",
  "node-cluster": "Node.js cluster (Nitro)",
  bun: "Bun (Nitro)",
  "deno-server": "Deno (Nitro)",
  "deno-deploy": "Deno Deploy (Nitro)",
  "cloudflare-module": "Cloudflare Workers (Nitro)",
  vercel: "Vercel (Nitro)",
  "aws-lambda": "AWS Lambda (Nitro)",
  netlify: "Netlify (Nitro)",
};

export interface RunCreateCommandOptions {
  projectName?: string | undefined;
  preset?: DeployTarget | undefined;
  runtime?: Runtime | undefined;
  db?: DbOdm | undefined;
  driver?: DbDriver | undefined;
  logger?: LoggerId | undefined;
  validator?: ValidatorId | undefined;
  skipInstall?: boolean | undefined;
  interactive?: boolean | undefined;
  targetDir?: string | undefined;
  packageVersions?: Record<string, string> | undefined;
}

export async function promptInteractiveOptions(
  defaults: RunCreateCommandOptions,
): Promise<RunCreateCommandOptions> {
  const projectName =
    defaults.projectName ??
    (await p.text({
      message: "Project name",
      placeholder: "my-taser-app",
      defaultValue: "my-taser-app",
      validate(value) {
        if (!value || value.trim().length === 0) return "Project name cannot be empty";
        if (/[^a-zA-Z0-9_-]/.test(value)) return "Project name contains invalid characters";
        return undefined;
      },
    }));

  if (p.isCancel(projectName)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }

  const preset =
    defaults.preset ??
    (await p.select({
      message: "Deployment target",
      options: DEPLOY_TARGETS.map((id) => ({
        value: id,
        label: DEPLOY_LABELS[id],
      })),
      initialValue: "none",
    }));

  if (p.isCancel(preset)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }

  let runtime: Runtime | undefined;
  const runtimeOverrides = allowedRuntimeOverrides(preset as DeployTarget);
  if (runtimeOverrides.length > 0) {
    const runtimeChoice =
      defaults.runtime ??
      (await p.select({
        message: "Runtime override",
        options: [
          ...runtimeOverrides.map((rt) => ({ value: rt, label: rt })),
          { value: "default", label: "Preset default", hint: "no override" },
        ],
        initialValue: "default",
      }));

    if (p.isCancel(runtimeChoice)) {
      p.cancel("Scaffold cancelled.");
      process.exit(0);
    }
    runtime = runtimeChoice === "default" ? undefined : (runtimeChoice as Runtime);
  }

  const validatorChoice =
    defaults.validator ??
    (await p.select({
      message: "Standard Schema Validator",
      options: [
        { value: "none", label: "None", hint: "default" },
        { value: "zod", label: "Zod" },
        { value: "valibot", label: "Valibot" },
        { value: "arktype", label: "Arktype" },
      ],
      initialValue: "none",
    }));

  if (p.isCancel(validatorChoice)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }

  const validator = validatorChoice === "none" ? undefined : (validatorChoice as ValidatorId);

  const dbChoice =
    defaults.db ??
    (await p.select({
      message: "Database ORM / Query Builder",
      options: [
        { value: "none", label: "None", hint: "default" },
        { value: "drizzle", label: "Drizzle" },
        { value: "prisma", label: "Prisma" },
        { value: "kysely", label: "Kysely" },
      ],
      initialValue: "none",
    }));

  if (p.isCancel(dbChoice)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }

  let db: DbOdm | undefined;
  let driver: DbDriver | undefined;

  if (dbChoice !== "none") {
    db = dbChoice as DbOdm;
    const driverChoice =
      defaults.driver ??
      (await p.select({
        message: "Database driver",
        options: [
          { value: "sqlite", label: "SQLite", hint: "default" },
          { value: "postgres", label: "PostgreSQL" },
          { value: "mysql", label: "MySQL" },
        ],
        initialValue: "sqlite",
      }));

    if (p.isCancel(driverChoice)) {
      p.cancel("Scaffold cancelled.");
      process.exit(0);
    }
    driver = driverChoice as DbDriver;
  }

  const loggerChoice =
    defaults.logger ??
    (await p.select({
      message: "Logger",
      options: [
        { value: "none", label: "None", hint: "default" },
        { value: "pino", label: "Pino" },
        { value: "winston", label: "Winston" },
      ],
      initialValue: "none",
    }));

  if (p.isCancel(loggerChoice)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }

  const logger = loggerChoice === "none" ? undefined : (loggerChoice as LoggerId);

  return {
    projectName: String(projectName).trim(),
    preset: preset as DeployTarget,
    ...(runtime ? { runtime } : {}),
    ...(validator ? { validator } : {}),
    ...(db ? { db, driver } : {}),
    ...(logger ? { logger } : {}),
    skipInstall: defaults.skipInstall,
  };
}

export async function runCreateCommand(
  args: RunCreateCommandOptions = {},
): Promise<ScaffoldResult> {
  const isInteractive =
    args.interactive ?? (Boolean(process.stdout.isTTY) && process.env.NODE_ENV !== "test");

  const resolved = isInteractive
    ? await promptInteractiveOptions(args)
    : {
        ...args,
        projectName: args.projectName ?? "my-taser-app",
        preset: args.preset ?? DEFAULT_DEPLOY,
      };

  const cwd = process.cwd();
  const projectName = resolved.projectName || "my-taser-app";
  const targetDir = args.targetDir
    ? path.resolve(cwd, args.targetDir)
    : path.resolve(cwd, projectName);

  const scaffoldOpts: ScaffoldOptions = {
    projectName,
    targetDir,
    ...(resolved.preset !== undefined ? { preset: resolved.preset } : {}),
    ...(resolved.runtime !== undefined ? { runtime: resolved.runtime } : {}),
    ...(resolved.validator !== undefined ? { validator: resolved.validator } : {}),
    ...(resolved.db !== undefined ? { db: resolved.db } : {}),
    ...(resolved.driver !== undefined ? { driver: resolved.driver } : {}),
    ...(resolved.logger !== undefined ? { logger: resolved.logger } : {}),
    ...(args.packageVersions !== undefined ? { packageVersions: args.packageVersions } : {}),
    skipInstall: resolved.skipInstall ?? process.env.NODE_ENV === "test",
  };

  if (isInteractive) {
    const s = p.spinner();
    s.start("Scaffolding project");
    const result = await scaffoldProject(scaffoldOpts);
    s.stop("Project created");

    const agent = resolveUserAgent();
    p.outro(pc.green("Done!"));
    console.log(`\nNext steps:`);
    console.log(`  cd ${path.relative(cwd, targetDir) || "."}`);
    if (scaffoldOpts.skipInstall) {
      console.log(`  ${runScript(agent, "install")}`);
    }
    console.log(`  ${runScript(agent, "dev")}\n`);
    return result;
  }

  return await scaffoldProject(scaffoldOpts);
}
