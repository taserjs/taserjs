import type { Agent } from "package-manager-detector";

export type Preset =
  | "node"
  | "express"
  | "fastify"
  | "hono"
  | "bun"
  | "deno"
  | "aws-lambda"
  | "cloudflare-workers"
  | "netlify"
  | "vercel"
  | "azure-functions"
  | "google-cloud-run";

export const PRESETS: readonly Preset[] = [
  "node",
  "express",
  "fastify",
  "hono",
  "bun",
  "deno",
  "aws-lambda",
  "cloudflare-workers",
  "netlify",
  "vercel",
  "azure-functions",
  "google-cloud-run",
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
  preset: Preset;
  db?: DbOdm;
  driver?: DbDriver;
  logger?: LoggerId;
  validator?: ValidatorId;
  bare?: boolean;
};

export type ScaffoldOptions = ScaffoldContext & {
  skipInstall?: boolean;
  agent?: Agent;
};

export type ScaffoldResult = ScaffoldContext;

export type CapabilitiesCatalog = {
  presets: Preset[];
  db: {
    odms: DbOdm[];
    drivers: DbDriver[];
    defaultDriver: DbDriver;
  };
  loggers: LoggerId[];
  validators: ValidatorId[];
};
