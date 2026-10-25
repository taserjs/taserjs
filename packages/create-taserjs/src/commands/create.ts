import path from "node:path";

import * as p from "@clack/prompts";
import pc from "picocolors";

import {
  addPackageCommands,
  installPackages,
  resolveUserAgent,
  runScript,
} from "../core/package-manager.js";
import {
  BARE_CHOICE,
  DEFAULT_NITRO_PRESET,
  isNodeRuntimePreset,
  PRESET_CHOICES,
} from "../core/presets.js";
import { scaffoldProject } from "../core/scaffold-engine.js";
import {
  BARE_PRESET,
  type DbDriver,
  type DbOdm,
  type DeployPreset,
  type FrameworkGroup,
  type FrameworkId,
  type GeneratorRunner,
  type HostId,
  type LoggerId,
  type ScaffoldOptions,
  type ScaffoldResult,
  type ValidatorId,
} from "../core/types.js";
import { FRAMEWORKS, getFramework } from "../frameworks/registry.js";
import { HOSTS } from "../hosts/registry.js";

const DEFAULT_PROJECT_NAME = "my-taser-app";

const GROUP_LABELS: Record<FrameworkGroup, { label: string; hint: string }> = {
  api: { label: "API only", hint: "no UI" },
  spa: { label: "Web app on Vite", hint: "a UI served together with your API" },
  fullstack: { label: "Fullstack framework", hint: "the framework owns the server" },
};

export interface RunCreateCommandOptions {
  projectName?: string | undefined;
  framework?: FrameworkId | undefined;
  preset?: DeployPreset | undefined;
  host?: HostId | undefined;
  db?: DbOdm | undefined;
  driver?: DbDriver | undefined;
  logger?: LoggerId | undefined;
  validator?: ValidatorId | undefined;
  skipInstall?: boolean | undefined;
  interactive?: boolean | undefined;
  targetDir?: string | undefined;
  packageVersions?: Record<string, string> | undefined;
  generator?: GeneratorRunner | undefined;
}

/** Unwraps a prompt answer, exiting cleanly when the user cancels. */
function answer<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }
  return value as T;
}

const NONE = "none";

async function selectOptional<T extends string>(
  message: string,
  preset: T | undefined,
  options: { value: T; label: string }[],
): Promise<T | undefined> {
  if (preset !== undefined) return preset;
  const choice = answer(
    await p.select<string>({
      message,
      options: [{ value: NONE, label: "None", hint: "default" }, ...options],
      initialValue: NONE,
    }),
  );
  return choice === NONE ? undefined : (choice as T);
}

async function promptFramework(preset: FrameworkId | undefined): Promise<FrameworkId> {
  if (preset) return preset;

  const group = answer(
    await p.select<FrameworkGroup>({
      message: "What are you building?",
      options: (Object.keys(GROUP_LABELS) as FrameworkGroup[]).map((value) => ({
        value,
        label: GROUP_LABELS[value].label,
        hint: GROUP_LABELS[value].hint,
      })),
      initialValue: "api",
    }),
  );
  if (group === "api") return "none";

  return answer(
    await p.select<FrameworkId>({
      message: "Framework",
      options: Object.values(FRAMEWORKS)
        .filter((framework) => framework.group === group)
        .map((framework) => ({ value: framework.id, label: framework.label })),
    }),
  );
}

async function promptPreset(
  framework: FrameworkId,
  preset: DeployPreset | undefined,
): Promise<DeployPreset | undefined> {
  const definition = getFramework(framework);
  if (definition.ownsDeployment || preset !== undefined) return preset;

  return answer(
    await p.select<DeployPreset>({
      message: "Deployment",
      options: [...(definition.requiresNitro ? [] : [BARE_CHOICE]), ...PRESET_CHOICES],
      initialValue: definition.requiresNitro ? DEFAULT_NITRO_PRESET : BARE_PRESET,
    }),
  );
}

/** Only API and Vite projects load a host; fullstack frameworks mount Taser.js directly. */
async function promptHost(
  framework: FrameworkId,
  preset: DeployPreset | undefined,
  host: HostId | undefined,
): Promise<HostId | undefined> {
  if (host !== undefined || getFramework(framework).group === "fullstack") return host;

  const runsOnNode = isNodeRuntimePreset(preset ?? BARE_PRESET);
  const choice = answer(
    await p.select<HostId>({
      message: "Run alongside an existing server framework?",
      options: [
        { value: "none", label: "None", hint: "Taser.js only" },
        ...Object.values(HOSTS)
          .filter((definition) => runsOnNode || definition.runtime === "fetch")
          .map((definition) => ({ value: definition.id, label: definition.label })),
      ],
      initialValue: "none",
    }),
  );
  return choice === "none" ? undefined : choice;
}

export async function promptInteractiveOptions(
  defaults: RunCreateCommandOptions,
): Promise<RunCreateCommandOptions> {
  const projectName =
    defaults.projectName ??
    answer(
      await p.text({
        message: "Project name",
        placeholder: DEFAULT_PROJECT_NAME,
        defaultValue: DEFAULT_PROJECT_NAME,
        validate(value) {
          if (!value || value.trim().length === 0) return "Project name cannot be empty";
          if (/[^a-zA-Z0-9_-]/.test(value)) return "Project name contains invalid characters";
          return undefined;
        },
      }),
    );

  const framework = await promptFramework(defaults.framework);
  const preset = await promptPreset(framework, defaults.preset);
  const host = await promptHost(framework, preset, defaults.host);

  const validator = await selectOptional<ValidatorId>(
    "Standard Schema Validator",
    defaults.validator,
    [
      { value: "zod", label: "Zod" },
      { value: "valibot", label: "Valibot" },
      { value: "arktype", label: "Arktype" },
    ],
  );

  const db = await selectOptional<DbOdm>("Database ORM / Query Builder", defaults.db, [
    { value: "drizzle", label: "Drizzle" },
    { value: "prisma", label: "Prisma" },
    { value: "kysely", label: "Kysely" },
  ]);

  const driver = db
    ? (defaults.driver ??
      answer(
        await p.select<DbDriver>({
          message: "Database driver",
          options: [
            { value: "sqlite", label: "SQLite", hint: "default" },
            { value: "postgres", label: "PostgreSQL" },
            { value: "mysql", label: "MySQL" },
          ],
          initialValue: "sqlite",
        }),
      ))
    : undefined;

  const logger = await selectOptional<LoggerId>("Logger", defaults.logger, [
    { value: "pino", label: "Pino" },
    { value: "winston", label: "Winston" },
  ]);

  const shouldInstall =
    defaults.skipInstall !== undefined
      ? !defaults.skipInstall
      : answer(await p.confirm({ message: "Install dependencies?", initialValue: true }));

  return {
    projectName: String(projectName).trim(),
    framework,
    ...(preset ? { preset } : {}),
    ...(host ? { host } : {}),
    ...(validator ? { validator } : {}),
    ...(db ? { db, driver } : {}),
    ...(logger ? { logger } : {}),
    skipInstall: !shouldInstall,
  };
}

function toScaffoldOptions(
  args: RunCreateCommandOptions,
  resolved: RunCreateCommandOptions,
): ScaffoldOptions {
  const cwd = process.cwd();
  const targetDir = path.resolve(
    cwd,
    args.targetDir ?? resolved.projectName ?? DEFAULT_PROJECT_NAME,
  );

  return {
    projectName: path.basename(targetDir),
    targetDir,
    ...(resolved.framework !== undefined ? { framework: resolved.framework } : {}),
    ...(resolved.preset !== undefined ? { preset: resolved.preset } : {}),
    ...(resolved.host !== undefined ? { host: resolved.host } : {}),
    ...(resolved.validator !== undefined ? { validator: resolved.validator } : {}),
    ...(resolved.db !== undefined ? { db: resolved.db } : {}),
    ...(resolved.driver !== undefined ? { driver: resolved.driver } : {}),
    ...(resolved.logger !== undefined ? { logger: resolved.logger } : {}),
    ...(args.packageVersions !== undefined ? { packageVersions: args.packageVersions } : {}),
    ...(args.generator !== undefined ? { generator: args.generator } : {}),
    skipInstall: resolved.skipInstall ?? process.env.NODE_ENV === "test",
  };
}

async function installDependencies(
  agent: ReturnType<typeof resolveUserAgent>,
  targetDir: string,
  result: ScaffoldResult,
): Promise<void> {
  await installPackages(agent, targetDir, {
    dependencies: result.dependencies ?? [],
    devDependencies: result.devDependencies ?? [],
  });
}

export async function runCreateCommand(
  args: RunCreateCommandOptions = {},
): Promise<ScaffoldResult> {
  const isInteractive =
    args.interactive ?? (Boolean(process.stdout.isTTY) && process.env.NODE_ENV !== "test");

  const resolved = isInteractive
    ? await promptInteractiveOptions(args)
    : { ...args, projectName: args.projectName ?? DEFAULT_PROJECT_NAME };

  const cwd = process.cwd();
  const scaffoldOpts = toScaffoldOptions(args, resolved);
  const { targetDir } = scaffoldOpts;
  const agent = resolveUserAgent();

  if (!isInteractive) {
    const result = await scaffoldProject(scaffoldOpts);
    if (!scaffoldOpts.skipInstall) await installDependencies(agent, targetDir, result);
    return result;
  }

  const spinner = p.spinner();
  spinner.start("Scaffolding project");
  const result = await scaffoldProject(scaffoldOpts);
  spinner.stop("Project scaffolded");

  if (!scaffoldOpts.skipInstall) {
    spinner.start(`Installing dependencies with ${agent}`);
    try {
      await installDependencies(agent, targetDir, result);
      spinner.stop("Dependencies installed");
    } catch (err) {
      spinner.stop(pc.yellow("Failed to install dependencies"));
      console.warn(pc.dim(err instanceof Error ? err.message : String(err)));
    }
  }

  p.outro(pc.green("Done!"));

  for (const step of result.manualSteps) {
    console.log(pc.yellow(`\nManual step: ${step}`));
  }

  console.log(`\nNext steps:`);
  console.log(`  cd ${path.relative(cwd, targetDir) || "."}`);
  if (scaffoldOpts.skipInstall) {
    const addCommands = addPackageCommands(agent, {
      dependencies: result.dependencies ?? [],
      devDependencies: result.devDependencies ?? [],
    });
    for (const { command, args } of addCommands) console.log(`  ${command} ${args.join(" ")}`);
  }
  console.log(`  ${runScript(agent, "dev")}\n`);
  return result;
}
