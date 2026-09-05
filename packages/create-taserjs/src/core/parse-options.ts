import {
  DB_DRIVERS,
  DB_ODMS,
  DEFAULT_DB_DRIVER,
  FRAMEWORKS,
  LOGGERS,
  RUNTIMES,
  VALIDATORS,
  type DbDriver,
  type DbOdm,
  type DeployTarget,
  type Framework,
  type LoggerId,
  type Runtime,
  type ScaffoldContext,
  type ValidatorId,
} from "./types.js";
import {
  DEFAULT_DEPLOY,
  isCuratedDeploy,
  resolveDeployEntry,
  validateCombination,
} from "./targets.js";

export type ParsedCreateArgs = {
  projectName?: string;
  framework?: Framework;
  /** Deployment target — a Nitro preset id. */
  preset?: string;
  runtime?: Runtime;
  db?: DbOdm;
  driver?: DbDriver;
  logger?: LoggerId;
  validator?: ValidatorId;
  yes: boolean;
  noInstall: boolean;
  json: boolean;
};

function isFramework(value: string): value is Framework {
  return (FRAMEWORKS as readonly string[]).includes(value);
}

function isRuntime(value: string): value is Runtime {
  return (RUNTIMES as readonly string[]).includes(value);
}

function isDbOdm(value: string): value is DbOdm {
  return (DB_ODMS as readonly string[]).includes(value);
}

function isDbDriver(value: string): value is DbDriver {
  return (DB_DRIVERS as readonly string[]).includes(value);
}

function isLoggerId(value: string): value is LoggerId {
  return (LOGGERS as readonly string[]).includes(value);
}

function isValidatorId(value: string): value is ValidatorId {
  return (VALIDATORS as readonly string[]).includes(value);
}

export function parseDbFlag(value: string): { db: DbOdm; driver: DbDriver } {
  const [odm, driver] = value.split(":");
  if (!odm || !isDbOdm(odm)) {
    throw new Error(
      `Invalid --db value "${value}". Use drizzle, prisma, or kysely (optionally with :postgres, :sqlite, or :mysql).`,
    );
  }

  if (driver === undefined || driver === "") {
    return { db: odm, driver: DEFAULT_DB_DRIVER };
  }

  if (!isDbDriver(driver)) {
    throw new Error(`Invalid database driver "${driver}". Use postgres, sqlite, or mysql.`);
  }

  return { db: odm, driver };
}

export function parseFrameworkFlag(value: string): Framework {
  if (!isFramework(value)) {
    throw new Error(`Invalid --framework "${value}". Use ${FRAMEWORKS.join(", ")}.`);
  }
  return value;
}

/**
 * Accepts curated deploy targets verbatim; unknown ids pass through to Nitro.
 * Returns a warning for passthrough ids so callers can surface it.
 */
export function parsePresetFlag(value: string): { preset: string; warning?: string } {
  if (!isCuratedDeploy(value)) {
    if (!/^[a-z0-9][a-z0-9-_]*$/i.test(value)) {
      throw new Error(`Invalid --preset "${value}".`);
    }
    return {
      preset: value,
      warning: `"${value}" is not a curated Taser.js deploy target; passing it through to Nitro as-is.`,
    };
  }
  return { preset: value };
}

export function parseRuntimeFlag(value: string): Runtime {
  if (!isRuntime(value)) {
    throw new Error(`Invalid --runtime "${value}". Use node, bun, or deno.`);
  }
  return value;
}

export function parseLoggerFlag(value: string): LoggerId {
  if (!isLoggerId(value)) {
    throw new Error(`Invalid --logger "${value}". Use pino or winston.`);
  }
  return value;
}

export function parseValidatorFlag(value: string): ValidatorId {
  if (!isValidatorId(value)) {
    throw new Error(`Invalid --validator "${value}". Use zod, arktype, or valibot.`);
  }
  return value;
}

export function resolveScaffoldDefaults(args: ParsedCreateArgs): ScaffoldContext {
  const framework: Framework = args.framework ?? "none";
  const preset = args.preset ?? DEFAULT_DEPLOY;

  if (!args.projectName) {
    throw new Error("Project name is required");
  }

  // Throws with a precise reason when runtime × framework × deploy clash.
  const combination = validateCombination(args.runtime, framework, preset);
  if (!combination.ok) {
    throw new Error(combination.reason);
  }

  const result: ScaffoldContext = {
    projectName: args.projectName.trim(),
    targetDir: "",
    framework,
    preset: preset as DeployTarget,
    ...(args.runtime !== undefined ? { runtime: args.runtime } : {}),
  };

  if (args.db) {
    result.db = args.db;
    result.driver = args.driver ?? DEFAULT_DB_DRIVER;
  }

  if (args.logger) {
    result.logger = args.logger;
  }

  if (args.validator) {
    result.validator = args.validator;
  }

  return result;
}

/** Re-exported for CLI layers that need to warn about passthrough presets. */
export { resolveDeployEntry };
