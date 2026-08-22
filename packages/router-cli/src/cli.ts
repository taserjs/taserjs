#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { ALL_CLI_OPTIONS } from "@taserjs/router-generator";
import { runGenerate } from "./commands/generate.js";
import { runInit } from "./commands/init.js";
import { runOpenApi } from "./commands/openapi.js";
import { runScaffold } from "./commands/scaffold.js";
import { runWatch } from "./commands/watch.js";

export { buildOptions } from "./options.js";
export { resolveConfigFile } from "./support/resolve-config-file.js";

function registerOptions(builder: ReturnType<typeof yargs>): void {
  for (const option of ALL_CLI_OPTIONS) {
    const optionConfig: Record<string, unknown> = {
      type: option.type,
      describe: option.describe,
    };
    if (option.alias) {
      optionConfig.alias = option.alias;
    }
    if ("choices" in option && option.choices) {
      optionConfig.choices = option.choices;
    }
    if (option.name === "watch") {
      optionConfig.default = false;
    }
    if (option.name === "force") {
      optionConfig.default = false;
    }
    if (option.name === "quiet") {
      optionConfig.default = false;
    }
    builder.option(option.name, optionConfig);
  }
}

async function main(): Promise<void> {
  const rawArgs = hideBin(process.argv);

  // `taser openapi` proxies to @taserjs/openapi's CLI with full arg passthrough;
  // handled before yargs so generator options (e.g. -o) don't collide.
  if (rawArgs[0] === "openapi") {
    await runOpenApi(rawArgs.slice(1));
    return;
  }

  const builder = yargs(rawArgs)
    .scriptName("taser")
    .command("generate", "Generate route manifest once", (yargsBuilder) => yargsBuilder)
    .command("watch", "Watch route files and regenerate on change", (yargsBuilder) => yargsBuilder)
    .command(
      "openapi",
      "Generate an OpenAPI spec (requires @taserjs/openapi)",
      (yargsBuilder) => yargsBuilder,
    )
    .command("init", "Create a default taser.config.json", (yargsBuilder) => {
      return yargsBuilder.option("dir", {
        type: "string",
        describe: "Directory or file path for taser.config.json",
      });
    })
    .command("scaffold <path>", "Scaffold a route or layout file", (yargsBuilder) => {
      return yargsBuilder.positional("path", {
        type: "string",
        describe: "Relative path under routes directory",
        demandOption: true,
      });
    });

  registerOptions(builder);
  const argv = await builder.help().parse();

  const command = argv._[0];

  if (command === "init") {
    await runInit(argv);
    return;
  }

  if (command === "scaffold") {
    await runScaffold(argv);
    return;
  }

  if (command === "watch" || argv.watch) {
    await runWatch(argv);
    return;
  }

  await runGenerate(argv);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
