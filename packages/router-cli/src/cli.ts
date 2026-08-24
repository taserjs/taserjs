#!/usr/bin/env node
import yargs from "yargs";
import { runGenerate } from "./commands/generate.js";
import { hideBin } from "yargs/helpers";

async function main(): Promise<void> {
  const builder = yargs(hideBin(process.argv))
    .scriptName("taser")
    .usage("$0 generate")
    .command(
      "generate",
      "Generate route types by reading the app's taser config (vite.config, nitro.config, or defaults)",
      (yargsBuilder) => {
        return yargsBuilder
          .option("dir", {
            type: "string",
            describe: "Project root directory",
          })
          .option("routesDir", {
            type: "string",
            alias: "routes",
            describe: "Routes directory (overrides detected config)",
          });
      },
      async (argv) => {
        await runGenerate(argv);
      },
    )
    .demandCommand(1, "You must provide a valid command: generate")
    .strict()
    .help()
    .epilogue(
      "Development and production serving is handled by Vite:\n" +
        "  vite dev / vite build\n" +
        "with the taser() plugin — alone, or chained with nitro() from nitro/vite.",
    );

  await builder.parse();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
