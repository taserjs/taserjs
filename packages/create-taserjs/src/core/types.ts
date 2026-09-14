import type { Agent } from "package-manager-detector";

export type Runtime = "node" | "bun" | "deno";
export const RUNTIMES: readonly Runtime[] = ["node", "bun", "deno"];

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

export interface ScaffoldContext {
  projectName: string;
  targetDir: string;
  preset?: DeployTarget | undefined;
  runtime?: Runtime | undefined;
  db?: DbOdm | undefined;
  driver?: DbDriver | undefined;
  logger?: LoggerId | undefined;
  validator?: ValidatorId | undefined;
  packageVersions?: Record<string, string> | undefined;
}

export interface ScaffoldOptions extends ScaffoldContext {
  skipInstall?: boolean | undefined;
  agent?: Agent | undefined;
}

export interface ScaffoldResult extends ScaffoldContext {
  files: string[];
}
