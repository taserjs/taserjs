import { cp } from "node:fs/promises";
import { join } from "node:path";

import type { FrameworkId, GeneratorRunner } from "../src/core/types.js";

export interface GeneratorCall {
  command: string;
  args: string[];
}

/** Stands in for a framework's official generator by copying real generator output into place. */
export function fixtureGenerator(
  framework: Exclude<FrameworkId, "none">,
  destination: string,
  calls: GeneratorCall[] = [],
): GeneratorRunner {
  return async ({ command, args }) => {
    calls.push({ command, args });
    await cp(join(import.meta.dirname, "fixtures", framework), destination, { recursive: true });
  };
}
