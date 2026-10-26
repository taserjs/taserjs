#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { runCreateCommand, type RunCreateCommandOptions } from "./commands/create.js";
import type {
  DbDriver,
  DbOdm,
  DeployPreset,
  FrameworkId,
  HostId,
  LoggerId,
  ValidatorId,
} from "./core/types.js";
import { FRAMEWORK_IDS } from "./frameworks/registry.js";
import { HOST_IDS } from "./hosts/registry.js";

export async function run(argv: string[] = hideBin(process.argv)): Promise<void> {
  const parser = yargs(argv)
    .scriptName("create-taserjs")
    .usage("$0 [dir] [options]")
    .command(
      "$0 [dir]",
      "Scaffold a new Taser.js application",
      (y: any) =>
        y
          .positional("dir", {
            type: "string",
            description: "Directory or project name",
          })
          .option("framework", {
            alias: "f",
            type: "string",
            choices: FRAMEWORK_IDS,
            description: "UI or fullstack framework (none = API only)",
          })
          .option("template", {
            alias: "t",
            type: "string",
            description:
              "Template for frameworks that offer several (Vite: react, vue, svelte, solid, preact)",
          })
          .option("preset", {
            alias: "p",
            type: "string",
            description: "Nitro preset to deploy with, such as node-server or cloudflare-module",
          })
          .option("host", {
            type: "string",
            choices: HOST_IDS,
            description:
              "Existing server framework to run next to Taser.js (API only and Vite apps)",
          })
          .option("validator", {
            alias: "v",
            type: "string",
            choices: ["zod", "valibot", "arktype", "none"],
            description: "Standard Schema validator",
          })
          .option("db", {
            type: "string",
            choices: ["drizzle", "prisma", "kysely", "none"],
            description: "Database ORM / Query builder",
          })
          .option("driver", {
            type: "string",
            choices: ["sqlite", "postgres", "mysql"],
            description: "Database driver",
          })
          .option("logger", {
            alias: "l",
            type: "string",
            choices: ["pino", "winston", "none"],
            description: "Logger addon",
          })
          .option("skip-install", {
            type: "boolean",
            description: "Skip dependency installation (does not skip the agent skill)",
            default: false,
          })
          .option("skill", {
            alias: "install-skill",
            type: "boolean",
            description:
              "Install the Taser.js agent skill via the skills CLI (default: true; --no-skill to skip)",
            defaultDescription: "true",
          })
          .option("yes", {
            alias: "y",
            type: "boolean",
            description: "Skip prompts and use defaults",
            default: false,
          }),
      async (args: any) => {
        const createOpts: RunCreateCommandOptions = {
          targetDir: args.dir as string | undefined,
          projectName: args.dir as string | undefined,
          framework: args.framework as FrameworkId | undefined,
          template: args.template as string | undefined,
          preset: args.preset as DeployPreset | undefined,
          host: args.host as HostId | undefined,
          validator: args.validator as ValidatorId | "none" | undefined,
          db: args.db as DbOdm | "none" | undefined,
          driver: args.driver as DbDriver | undefined,
          logger: args.logger as LoggerId | "none" | undefined,
          skipInstall: Boolean(args.skipInstall),
          installSkill: args.skill as boolean | undefined,
          interactive: !args.yes,
        };
        await runCreateCommand(createOpts);
      },
    )
    .help()
    .alias("help", "h")
    .version()
    .alias("version", "V")
    .strict()
    .exitProcess(false);

  await parser.parse();
}

if (process.argv[1] && process.argv[1].endsWith("cli.js")) {
  run().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
