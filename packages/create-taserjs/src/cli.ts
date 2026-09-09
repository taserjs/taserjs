#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runCreateCommand, type RunCreateCommandOptions } from "./commands/create.js";
import type { DbDriver, DbOdm, DeployTarget, LoggerId, Runtime, ValidatorId } from "./core/types.js";

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
          .option("preset", {
            alias: "p",
            type: "string",
            description: "Deployment preset",
          })
          .option("runtime", {
            type: "string",
            description: "Runtime override (node, bun, deno)",
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
            description: "Skip dependency installation",
            default: false,
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
          preset: args.preset as DeployTarget | undefined,
          runtime: args.runtime as Runtime | undefined,
          validator: (args.validator === "none" ? undefined : args.validator) as ValidatorId | undefined,
          db: (args.db === "none" ? undefined : args.db) as DbOdm | undefined,
          driver: args.driver as DbDriver | undefined,
          logger: (args.logger === "none" ? undefined : args.logger) as LoggerId | undefined,
          skipInstall: Boolean(args.skipInstall),
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
