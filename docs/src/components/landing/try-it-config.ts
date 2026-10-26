export interface Option<T extends string> {
  id: T;
  label: string;
}

export type FrameworkId =
  | "none"
  | "tanstack-router"
  | "tanstack-start"
  | "nextjs"
  | "nuxt"
  | "sveltekit"
  | "react-router"
  | "vite";
export type TemplateId = "react" | "vue" | "svelte" | "solid" | "preact";
export type HostId = "none" | "express" | "fastify" | "hono" | "elysia";
export type PresetId = "node-server" | "cloudflare-module" | "vercel" | "netlify" | "aws-lambda";
export type Database = "drizzle" | "prisma" | "kysely" | "none";
export type Driver = "sqlite" | "postgres" | "mysql";
export type Validator = "zod" | "arktype" | "valibot";
export type Logger = "pino" | "winston" | "none";
export type PackageManager = "pnpm" | "npm" | "bun" | "yarn";

interface FrameworkOption extends Option<FrameworkId> {
  /** Deploys through its own adapter, so the CLI skips the deployment question. */
  ownsDeployment: boolean;
  /** Can run next to an existing Express, Fastify, Hono or Elysia server. */
  supportsHost: boolean;
  /** Runs create-vite, so the CLI asks which template to use. */
  hasTemplates?: boolean;
}

export const FRAMEWORKS: FrameworkOption[] = [
  {
    id: "none",
    label: "API only",
    ownsDeployment: false,

    supportsHost: true,
  },
  {
    id: "tanstack-router",
    label: "TanStack Router",
    ownsDeployment: false,

    supportsHost: true,
  },
  {
    id: "react-router",
    label: "React Router",
    ownsDeployment: true,

    supportsHost: false,
  },
  {
    id: "tanstack-start",
    label: "TanStack Start",
    ownsDeployment: false,

    supportsHost: false,
  },
  {
    id: "nextjs",
    label: "Next.js",
    ownsDeployment: true,

    supportsHost: false,
  },
  { id: "nuxt", label: "Nuxt", ownsDeployment: true, supportsHost: false },
  {
    id: "sveltekit",
    label: "SvelteKit",
    ownsDeployment: true,

    supportsHost: false,
  },
  { id: "vite", label: "Vite", ownsDeployment: false, supportsHost: true, hasTemplates: true },
];

export const TEMPLATES: Option<TemplateId>[] = [
  { id: "react", label: "React" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
  { id: "solid", label: "Solid" },
  { id: "preact", label: "Preact" },
];

export const HOSTS: (Option<HostId> & { needsNode: boolean })[] = [
  { id: "none", label: "None", needsNode: false },
  { id: "express", label: "Express", needsNode: true },
  { id: "fastify", label: "Fastify", needsNode: true },
  { id: "hono", label: "Hono", needsNode: false },
  { id: "elysia", label: "Elysia", needsNode: false },
];

export const PRESETS: Option<PresetId>[] = [
  { id: "node-server", label: "None" },
  { id: "cloudflare-module", label: "Cloudflare Workers" },
  { id: "vercel", label: "Vercel" },
  { id: "netlify", label: "Netlify" },
  { id: "aws-lambda", label: "AWS Lambda" },
];

export const DATABASES: Option<Database>[] = [
  { id: "drizzle", label: "Drizzle" },
  { id: "prisma", label: "Prisma" },
  { id: "kysely", label: "Kysely" },
  { id: "none", label: "None" },
];

export const DRIVERS: Option<Driver>[] = [
  { id: "postgres", label: "PostgreSQL" },
  { id: "sqlite", label: "SQLite" },
  { id: "mysql", label: "MySQL" },
];

export const VALIDATORS: Option<Validator>[] = [
  { id: "zod", label: "Zod" },
  { id: "arktype", label: "ArkType" },
  { id: "valibot", label: "Valibot" },
];

export const LOGGERS: Option<Logger>[] = [
  { id: "pino", label: "Pino" },
  { id: "winston", label: "Winston" },
  { id: "none", label: "None" },
];

export const PACKAGE_MANAGERS: { id: PackageManager; prefix: string }[] = [
  { id: "pnpm", prefix: "pnpm create taserjs@latest" },
  { id: "npm", prefix: "npm create taserjs@latest" },
  { id: "bun", prefix: "bun create taserjs@latest" },
  { id: "yarn", prefix: "yarn create taserjs" },
];

const PROJECT_NAME = "my-app";

export interface StarterChoices {
  framework: FrameworkId;
  template: TemplateId;
  host: HostId;
  preset: PresetId;
  db: Database;
  driver: Driver;
  validator: Validator;
  logger: Logger;
  packageManager: PackageManager;
}

export interface ResolvedStarter {
  framework: FrameworkOption;
  /** Absent when the framework has a single generator. */
  template: TemplateId | undefined;
  /** Absent when the framework deploys through its own adapter. */
  preset: PresetId | undefined;
  /** Absent when the framework owns its server or no host is chosen. */
  host: HostId | undefined;
}

const byId = <T extends string, O extends Option<T>>(options: O[], id: T): O =>
  options.find((option) => option.id === id) ?? options[0]!;

/** Mirrors the CLI's rules so the shown command never fails validation. */
export function resolveStarter(choices: StarterChoices): ResolvedStarter {
  const framework = byId(FRAMEWORKS, choices.framework);
  const preset = framework.ownsDeployment ? undefined : choices.preset;

  const requestedHost = byId(HOSTS, choices.host);
  const hostFitsRuntime = !(requestedHost.needsNode && preset?.startsWith("cloudflare"));
  const host =
    framework.supportsHost && requestedHost.id !== "none" && hostFitsRuntime
      ? requestedHost.id
      : undefined;

  const template = framework.hasTemplates ? choices.template : undefined;

  return { framework, template, preset, host };
}

export function buildCommand(choices: StarterChoices): string {
  const { framework, template, preset, host } = resolveStarter(choices);
  const { prefix } =
    PACKAGE_MANAGERS.find((manager) => manager.id === choices.packageManager) ??
    PACKAGE_MANAGERS[0]!;
  const parts = [prefix, PROJECT_NAME, `--framework ${framework.id}`];

  if (template) parts.push(`--template ${template}`);
  if (host) parts.push(`--host ${host}`);
  if (preset) parts.push(`--preset ${preset}`);
  if (choices.db !== "none") parts.push(`--db ${choices.db}`, `--driver ${choices.driver}`);
  if (choices.logger !== "none") parts.push(`--logger ${choices.logger}`);
  parts.push(`--validator ${choices.validator}`, "-y");

  return parts.join(" ");
}
