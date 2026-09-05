#!/usr/bin/env node
import yargs from "yargs";
import { runGenerate } from "./commands/generate.js";
import { hideBin } from "yargs/helpers";

async function main(): Promise<void> {
  const builder = yargs(hideBin(process.argv))
    .scriptName("taser")
    .usage("$0 generate [options]")
    .command(
      "generate",
      "Generate route types by reading the app's taser config (vite.config, nitro.config, or next.config)",
      (yargsBuilder) => {
        return yargsBuilder.option("config", {
          type: "string",
          alias: "c",
          describe:
            "Path to config file (vite.config, nitro.config, or next.config). When omitted, searches current directory.",
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
      "Configuration is required via vite.config, nitro.config, or next.config (or via --config).",
    );

  await builder.parse();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
