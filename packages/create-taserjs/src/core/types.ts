import type { Agent } from "package-manager-detector";

export type FrameworkId =
  | "none"
  | "tanstack-router"
  | "tanstack-start"
  | "nextjs"
  | "vite"
  | "nuxt"
  | "sveltekit"
  | "react-router";

/** What the project is: just an API, a Vite SPA served next to the API, or a framework that owns the server. */
export type FrameworkGroup = "api" | "spa" | "fullstack";

/** A Nitro preset name such as `node-server`. */
export type DeployPreset = string;

/** An existing server framework that runs next to Taser.js and receives requests no route matches. */
export type HostId = "none" | "express" | "fastify" | "hono" | "elysia";

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
  framework?: FrameworkId | undefined;
  /** The generator template for frameworks that offer several, such as `react` for Vite. */
  template?: string | undefined;
  preset?: DeployPreset | undefined;
  host?: HostId | undefined;
  db?: DbOdm | undefined;
  driver?: DbDriver | undefined;
  logger?: LoggerId | undefined;
  validator?: ValidatorId | undefined;
  packageVersions?: Record<string, string> | undefined;
}

/** Runs a framework's official generator; replaceable so tests never touch the network. */
export type GeneratorRunner = (command: {
  command: string;
  args: string[];
  cwd: string;
}) => Promise<void>;

export interface ScaffoldOptions extends ScaffoldContext {
  skipInstall?: boolean | undefined;
  agent?: Agent | undefined;
  generator?: GeneratorRunner | undefined;
}

/** A scaffold request after the framework, preset and server directory have been decided. */
export interface ResolvedScaffold extends ScaffoldContext {
  framework: FrameworkId;
  /** Absent when the framework has a single generator. */
  template: string | undefined;
  /** Absent when the framework deploys through its own adapter, so no Nitro is installed. */
  preset: DeployPreset | undefined;
  host: HostId;
  /** Project-relative directory that holds `taser.ts`, `routes/`, and add-on files. */
  serverDir: string;
}

export interface ScaffoldResult extends ScaffoldOptions {
  files: string[];
  /** Config files the codemods could not patch, with the lines to add by hand. */
  manualSteps: string[];
  dependencies?: string[] | undefined;
  devDependencies?: string[] | undefined;
}
