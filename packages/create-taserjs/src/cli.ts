#!/usr/bin/env node
import { runCreateCommand } from "@taserjs/cli";

export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  await runCreateCommand(argv);
}

if (process.argv[1] && process.argv[1].endsWith("cli.js")) {
  run().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
