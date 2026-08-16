import {
  DB_DRIVERS,
  DB_ODMS,
  DEFAULT_DB_DRIVER,
  FRAMEWORKS,
  LOGGERS,
  VALIDATORS,
  type DbDriver,
  type DbOdm,
  type Framework,
  type LoggerId,
  type ScaffoldContext,
  type ValidatorId,
} from "./types.js";

export type ParsedCreateArgs = {
  projectName?: string;
  framework?: Framework;
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

export function resolveScaffoldDefaults(args: ParsedCreateArgs): ScaffoldContext {
  const framework = args.framework ?? "node";
  const db = args.db;
  const logger = args.logger;
  const validator = args.validator;

  if (!args.projectName) {
    throw new Error("Project name is required");
  }

  const result: ScaffoldContext = {
    projectName: args.projectName.trim(),
    targetDir: "",
    framework,
  };

  if (db) {
    result.db = db;
    result.driver = args.driver ?? DEFAULT_DB_DRIVER;
  }

  if (logger) {
    result.logger = logger;
  }

  if (validator) {
    result.validator = validator;
  }

  return result;
}

export function parseFrameworkFlag(value: string): Framework {
  if (!isFramework(value)) {
    throw new Error(`Invalid --framework "${value}". Use node, express, hono, or fastify.`);
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
