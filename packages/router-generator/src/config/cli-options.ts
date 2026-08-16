import type { GeneratorConfigFile } from "./schema.js";

export type CliOptionType = "string" | "boolean";

export type CliOptionDefinition = {
  /** Config key this flag maps to (undefined = CLI-only). */
  configKey?: keyof GeneratorConfigFile;
  name: string;
  alias?: string;
  type: CliOptionType;
  describe: string;
  /** For string options with fixed choices. */
  choices?: readonly string[];
};

/** CLI-only flags (not persisted in taser.config.json). */
export const CLI_ONLY_OPTIONS = [
  {
    name: "config",
    alias: "c",
    type: "string" as const,
    describe: "Path to taser.config.json",
  },
  {
    name: "force",
    alias: "f",
    type: "boolean" as const,
    describe: "Skip cache and force full manifest regeneration",
  },
  {
    name: "watch",
    alias: "w",
    type: "boolean" as const,
    describe: "Watch route files and regenerate on change",
  },
] satisfies CliOptionDefinition[];

/** Config-backed CLI flags — names match taser.config.json keys. */
export const CONFIG_CLI_OPTIONS = [
  {
    configKey: "routes",
    name: "routes",
    alias: "r",
    type: "string",
    describe: "Directory containing route files",
  },
  {
    configKey: "output",
    name: "output",
    alias: "o",
    type: "string",
    describe: "Output path for routeManifest.gen.ts",
  },
  {
    configKey: "entry",
    name: "entry",
    type: "string",
    describe: "Module specifier for the taser router instance (scaffold imports)",
  },
  {
    configKey: "extension",
    name: "extension",
    type: "string",
    describe: "Import extension: true, false, or a string like .js",
  },
  {
    configKey: "ignorePrefix",
    name: "ignorePrefix",
    type: "string",
    describe: "Ignore route files whose names start with this prefix",
  },
  {
    configKey: "ignorePattern",
    name: "ignorePattern",
    type: "string",
    describe: "Ignore route files matching this regular expression",
  },
  {
    configKey: "quiet",
    name: "quiet",
    type: "boolean",
    describe: "Disable info logging (errors still print)",
  },
  {
    configKey: "quotes",
    name: "quotes",
    type: "string",
    choices: ["single", "double"],
    describe: "Quote style for generated manifest",
  },
  {
    configKey: "semi",
    name: "semi",
    type: "boolean",
    describe: "Use semicolons in generated manifest",
  },
  {
    configKey: "format",
    name: "format",
    type: "boolean",
    describe: "Format generated manifest with oxfmt",
  },
  {
    configKey: "validate",
    name: "validate",
    type: "boolean",
    describe: "Validate route and layout file exports during scan",
  },
] satisfies CliOptionDefinition[];

export const ALL_CLI_OPTIONS = [...CLI_ONLY_OPTIONS, ...CONFIG_CLI_OPTIONS];
