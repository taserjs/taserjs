import { bench, describe } from "vitest";

import { loadBuiltCreateTaserApp } from "./load-runtime.ts";
import { createBenchCases } from "./scenarios.ts";

/**
 * Convenience view with vitest's side-by-side table. It runs variants sequentially, so results
 * carry ordering and GC noise. Use `pnpm bench:node` for numbers that are compared across commits.
 */
const BENCH_OPTIONS = {
  warmupIterations: 10,
  warmupTime: 500,
  time: 1000,
};

const cases = createBenchCases(await loadBuiltCreateTaserApp());

const casesByGroup = new Map<string, typeof cases>();
for (const benchCase of cases) {
  const groupCases = casesByGroup.get(benchCase.group) ?? [];
  groupCases.push(benchCase);
  casesByGroup.set(benchCase.group, groupCases);
}

for (const [group, groupCases] of casesByGroup) {
  describe(group, () => {
    for (const { name, taser, hono } of groupCases) {
      bench(`Taser: ${name}`, async () => void (await taser()), BENCH_OPTIONS);
      bench(`Hono: ${name}`, async () => void (await hono()), BENCH_OPTIONS);
    }
  });
}
