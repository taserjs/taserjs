import path from "node:path";

import * as p from "@clack/prompts";
import color from "picocolors";

import { getCapabilitiesCatalog } from "../addons/registry.js";
import {
  printCapabilitiesCatalog,
  printJsonError,
  printScaffoldResult,
} from "../core/json-output.js";
import {
  parseDbFlag,
  parseFrameworkFlag,
  parseLoggerFlag,
  parsePresetFlag,
  parseRuntimeFlag,
  parseValidatorFlag,
  type ParsedCreateArgs,
  resolveScaffoldDefaults,
} from "../core/parse-options.js";
import { scaffoldProject } from "../core/scaffold-engine.js";
import { allowedRuntimeOverrides } from "../core/targets.js";
import type {
  DbDriver,
  DbOdm,
  DeployTarget,
  LoggerId,
  ScaffoldResult,
  ValidatorId,
} from "../core/types.js";
import { DB_DRIVERS, DB_ODMS, DEPLOY_TARGETS, LOGGERS, VALIDATORS } from "../core/types.js";
import { validateProjectName } from "../core/validate-project-name.js";
import { resolveUserAgent, runScript } from "../core/package-manager.js";

function isDeployTarget(value: unknown): value is DeployTarget {
  return typeof value === "string" && (DEPLOY_TARGETS as readonly string[]).includes(value);
}

function isDbOdm(value: unknown): value is DbOdm {
  return typeof value === "string" && (DB_ODMS as readonly string[]).includes(value);
}

function isDbDriver(value: unknown): value is DbDriver {
  return typeof value === "string" && (DB_DRIVERS as readonly string[]).includes(value);
}

function isLoggerId(value: unknown): value is LoggerId {
  return typeof value === "string" && (LOGGERS as readonly string[]).includes(value);
}

function isValidatorId(value: unknown): value is ValidatorId {
  return typeof value === "string" && (VALIDATORS as readonly string[]).includes(value);
}

async function promptInteractiveOptions(args: ParsedCreateArgs): Promise<ParsedCreateArgs> {
  const projectName =
    args.projectName ??
    (await p.text({
      message: "Project name",
      placeholder: "my-taser-app",
      defaultValue: "my-taser-app",
      validate(value) {
        return validateProjectName(value);
      },
    }));

  if (p.isCancel(projectName)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }

  const framework =
    args.framework ??
    (await p.select({
      message: "Host framework",
      options: [
        { value: "none", label: "None", hint: "Taser.js Fetch (default)" },
        { value: "hono", label: "Hono" },
        { value: "express", label: "Express" },
        { value: "fastify", label: "Fastify" },
      ],
      initialValue: "none",
    }));

  if (p.isCancel(framework)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }

  const DEPLOY_LABELS: Record<DeployTarget, string> = {
    none: "None (Standalone Vite)",
    "node-server": "Node.js server",
    "node-cluster": "Node.js cluster",
    bun: "Bun",
    "deno-server": "Deno",
    "deno-deploy": "Deno Deploy",
    "cloudflare-module": "Cloudflare Workers",
    vercel: "Vercel",
    "aws-lambda": "AWS Lambda",
    netlify: "Netlify",
  };

  const DEPLOY_HINTS: Partial<Record<DeployTarget, string>> = {
    none: "standalone Vite, no Nitro",
  };

  const preset =
    args.preset ??
    (await p.select({
      message: "Deployment target",
      // oxlint-disable-next-line oxc/no-map-spread
      options: DEPLOY_TARGETS.map((id) => ({
        value: id,
        label: DEPLOY_LABELS[id],
        ...(DEPLOY_HINTS[id] ? { hint: DEPLOY_HINTS[id] } : {}),
      })),
      initialValue: "node-server",
    }));

  if (p.isCancel(preset) || !isDeployTarget(preset)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }

  let runtime: import("../core/types.js").Runtime | undefined;
  const runtimeOverrides = allowedRuntimeOverrides(preset);
  if (runtimeOverrides.length > 0) {
    const runtimeChoice =
      args.runtime ??
      (await p.select({
        message: "Runtime",
        options: [
          ...runtimeOverrides.map((rt) => ({ value: rt, label: rt })),
          { value: "default", label: `Preset default`, hint: "no override" },
        ],
        initialValue: "default",
      }));

    if (p.isCancel(runtimeChoice)) {
      p.cancel("Scaffold cancelled.");
      process.exit(0);
    }

    runtime = runtimeChoice === "default" ? undefined : runtimeChoice;
  }

  const dbChoice =
    args.db ??
    (await p.select({
      message: "Database",
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

  if (dbChoice !== "none" && isDbOdm(dbChoice)) {
    db = dbChoice;
    const driverChoice =
      args.driver ??
      (await p.select({
        message: "Database driver",
        options: [
          { value: "sqlite", label: "SQLite", hint: "default" },
          { value: "postgres", label: "PostgreSQL" },
          { value: "mysql", label: "MySQL" },
        ],
        initialValue: "sqlite",
      }));

    if (p.isCancel(driverChoice) || !isDbDriver(driverChoice)) {
      p.cancel("Scaffold cancelled.");
      process.exit(0);
    }
    driver = driverChoice;
  }

  const loggerChoice =
    args.logger ??
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

  const logger =
    loggerChoice === "none" ? undefined : isLoggerId(loggerChoice) ? loggerChoice : undefined;

  const validatorChoice =
    args.validator ??
    (await p.select({
      message: "Validator",
      options: [
        { value: "none", label: "None", hint: "default" },
        { value: "zod", label: "Zod" },
        { value: "arktype", label: "Arktype" },
        { value: "valibot", label: "Valibot" },
      ],
      initialValue: "none",
    }));

  if (p.isCancel(validatorChoice)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }

  const validator =
    validatorChoice === "none"
      ? undefined
      : isValidatorId(validatorChoice)
        ? validatorChoice
        : undefined;

  return {
    projectName: String(projectName).trim(),
    framework,
    preset,
    ...(runtime !== undefined ? { runtime } : {}),
    yes: args.yes,
    noInstall: args.noInstall,
    json: args.json,
    ...(db ? { db, driver: driver! } : {}),
    ...(logger ? { logger } : {}),
    ...(validator ? { validator } : {}),
  };
}

export async function runCreateCommand(
  args: ParsedCreateArgs,
): Promise<ScaffoldResult | undefined> {
  if (args.json && !args.projectName) {
    printCapabilitiesCatalog(getCapabilitiesCatalog());
    return undefined;
  }

  const cwd = process.cwd();
  const interactive = !args.yes;
  const resolved = interactive
    ? await promptInteractiveOptions(args)
    : {
        ...args,
        projectName: args.projectName?.trim(),
        preset: args.preset ?? "node-server",
      };

  if (!resolved.projectName) {
    const message = "Project name is required";
    if (args.json) {
      printJsonError(message);
      process.exit(1);
    }
    throw new Error(message);
  }

  const nameError = validateProjectName(resolved.projectName, cwd);
  if (nameError) {
    if (args.json) {
      printJsonError(nameError);
      process.exit(1);
    }
    throw new Error(nameError);
  }

  const targetDir = path.resolve(cwd, resolved.projectName);
  const scaffoldCtx = resolveScaffoldDefaults({
    ...resolved,
    projectName: resolved.projectName,
  });
  scaffoldCtx.targetDir = targetDir;

  if (!args.json) {
    const spinner = p.spinner();
    spinner.start("Scaffolding project");
    try {
      const result = await scaffoldProject({
        ...scaffoldCtx,
        targetDir,
        skipInstall: args.noInstall,
        agent: resolveUserAgent(),
      });
      spinner.stop("Project created");
      const cdPath = path.relative(cwd, targetDir) || ".";
      p.note([`cd ${cdPath}`, runScript(resolveUserAgent(), "dev")].join("\n"), "Next steps");
      p.outro(color.green("Done."));
      return result;
    } catch (error) {
      spinner.stop("Scaffold failed");
      throw error;
    }
  }

  const result = await scaffoldProject({
    ...scaffoldCtx,
    targetDir,
    skipInstall: args.noInstall,
    agent: resolveUserAgent(),
  });
  printScaffoldResult(result);
  return result;
}

export function buildParsedArgsFromCli(
  values: {
    preset?: string;
    framework?: string;
    runtime?: string;
    db?: string;
    logger?: string;
    validator?: string;
    y?: boolean;
    noInstall?: boolean;
    json?: boolean;
  },
  positionals: string[],
): ParsedCreateArgs {
  const args: ParsedCreateArgs = {
    yes: values.y ?? false,
    noInstall: values.noInstall ?? false,
    json: values.json ?? false,
  };

  if (positionals[0]) {
    args.projectName = positionals[0];
  }

  if (values.preset) {
    const parsed = parsePresetFlag(values.preset);
    args.preset = parsed.preset;
    if (parsed.warning && !args.json) {
      console.warn(`warning: ${parsed.warning}`);
    }
  }

  if (values.framework) {
    args.framework = parseFrameworkFlag(values.framework);
  }

  if (values.runtime) {
    args.runtime = parseRuntimeFlag(values.runtime);
  }

  if (values.db) {
    const parsed = parseDbFlag(values.db);
    args.db = parsed.db;
    args.driver = parsed.driver;
  }

  if (values.logger) {
    args.logger = parseLoggerFlag(values.logger);
  }

  if (values.validator) {
    args.validator = parseValidatorFlag(values.validator);
  }

  return args;
}
