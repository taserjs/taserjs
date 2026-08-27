import type { Agent } from "package-manager-detector";

/** Host framework layered on top of pure Taser pass-through dispatch. */
export type Framework = "none" | "hono" | "express" | "fastify";

export const FRAMEWORKS: readonly Framework[] = ["none", "hono", "express", "fastify"];

export type Runtime = "node" | "bun" | "deno";

export const RUNTIMES: readonly Runtime[] = ["node", "bun", "deno"];

/**
 * Deployment target. Values are Nitro preset ids (see `nitro/config`
 * PresetNameInput) so `--preset` passes straight through to Nitro.
 */
export type DeployTarget =
  | "none"
  | "node-server"
  | "node-cluster"
  | "bun"
  | "deno-server"
  | "deno-deploy"
  | "cloudflare-module"
  | "vercel"
  | "aws-lambda"
  | "netlify";

export const DEPLOY_TARGETS: readonly DeployTarget[] = [
  "none",
  "node-server",
  "node-cluster",
  "bun",
  "deno-server",
  "deno-deploy",
  "cloudflare-module",
  "vercel",
  "aws-lambda",
  "netlify",
];

export type DbOdm = "drizzle" | "prisma" | "kysely";

export const DB_ODMS: readonly DbOdm[] = ["drizzle", "prisma", "kysely"];

export type DbDriver = "postgres" | "sqlite" | "mysql";

export const DB_DRIVERS: readonly DbDriver[] = ["postgres", "sqlite", "mysql"];

export const DEFAULT_DB_DRIVER: DbDriver = "sqlite";

export type LoggerId = "pino" | "winston";

export const LOGGERS: readonly LoggerId[] = ["pino", "winston"];

export type ValidatorId = "zod" | "arktype" | "valibot";

export const VALIDATORS: readonly ValidatorId[] = ["zod", "arktype", "valibot"];

export type PackageGroups = {
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
};

export type ScaffoldContext = {
  projectName: string;
  targetDir: string;
  /** Host framework; "none" is pure Taser pass-through dispatch. Defaults to "none". */
  framework?: Framework;
  /** Deployment target — a Nitro preset id. Defaults to "node-server". */
  preset?: DeployTarget;
  /** Set only when explicitly overriding the runtime implied by the preset. */
  runtime?: Runtime;
  db?: DbOdm;
  driver?: DbDriver;
  logger?: LoggerId;
  validator?: ValidatorId;
};

export type ScaffoldOptions = ScaffoldContext & {
  skipInstall?: boolean;
  agent?: Agent;
};

export type ScaffoldResult = ScaffoldContext;

export type CapabilitiesCatalog = {
  frameworks: Framework[];
  deployTargets: DeployTarget[];
  runtimes: Runtime[];
  db: {
    odms: DbOdm[];
    drivers: DbDriver[];
    defaultDriver: DbDriver;
  };
  loggers: LoggerId[];
  validators: ValidatorId[];
};
