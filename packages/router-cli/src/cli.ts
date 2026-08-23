#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { runGenerate } from "./commands/generate.js";
import { runDev } from "./commands/dev.js";
import { runBuild } from "./commands/build.js";

async function main(): Promise<void> {
  const builder = yargs(hideBin(process.argv))
    .scriptName("taser")
    .command("generate", "Generate ambient type declarations and project types", (yargsBuilder) => {
      return yargsBuilder
        .option("dir", {
          type: "string",
          describe: "Project root directory",
        })
        .option("routesDir", {
          type: "string",
          alias: "routes",
          describe: "Routes directory",
        });
    })
    .command("dev", "Start Taser development server with Nitro", (yargsBuilder) => {
      return yargsBuilder
        .option("dir", {
          type: "string",
          describe: "Project root directory",
        })
        .option("routesDir", {
          type: "string",
          alias: "routes",
          describe: "Routes directory",
        });
    })
    .command("build", "Build Taser server for production with Nitro", (yargsBuilder) => {
      return yargsBuilder
        .option("dir", {
          type: "string",
          describe: "Project root directory",
        })
        .option("routesDir", {
          type: "string",
          alias: "routes",
          describe: "Routes directory",
        });
    })
    .demandCommand(1, "You must provide a valid command: generate, dev, or build")
    .strict()
    .help();

  const argv = await builder.parse();
  const command = argv._[0];

  if (command === "generate") {
    await runGenerate(argv);
    return;
  }

  if (command === "dev") {
    await runDev(argv);
    return;
  }

  if (command === "build") {
    await runBuild(argv);
    return;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
