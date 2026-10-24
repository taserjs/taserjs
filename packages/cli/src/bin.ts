#!/usr/bin/env node
import { run } from "./cli.js";

run().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
