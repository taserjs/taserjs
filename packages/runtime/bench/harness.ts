/**
 * Stable benchmark harness for the built runtime.
 *
 * Why not vitest bench: it runs variants one after another, so GC state and JIT warmth leak from
 * one variant into the next, and it constructs requests inside the timed loop. This harness
 *   - imports `dist` (the shipped code),
 *   - alternates the Taser/Hono order every round,
 *   - reports the median of paired per-round ratios,
 *   - verifies both variants return the expected status before timing.
 *
 * Usage (Node >= 22.18 for built-in type stripping):
 *   node --expose-gc bench/harness.ts [--filter text] [--rounds n] [--json out.json]
 *   node --expose-gc bench/harness.ts --check            # fail on regression vs bench/baseline.json
 *   node --expose-gc bench/harness.ts --update-baseline --rounds 15  # rewrite bench/baseline.json
 */
/* oxlint-disable no-await-in-loop -- sequential awaits are the point: samples must never overlap. */
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { loadBuiltCreateTaserApp } from "./load-runtime.ts";
import { createBenchCases, type BenchCase } from "./scenarios.ts";

const DEFAULT_ROUNDS = 7;
const WARMUP_MS = 500;
const ROUND_MS = 250;
const CLOCK_CHECK_INTERVAL = 16;
const MICROS_PER_SECOND = 1_000_000;
const NOISY_SPREAD_THRESHOLD = 0.1;
/**
 * The guard compares the Taser/Hono ratio, not absolute time, so it tolerates a faster or slower
 * machine. Back-to-back runs on a busy developer laptop moved individual ratios by up to ~20%, so
 * 25% is the tightest value that does not flake. Tighten it on a quiet dedicated runner.
 */
const REGRESSION_TOLERANCE = 0.25;
const RECHECK_ROUND_MULTIPLIER = 2;
const BASELINE_URL = new URL("./baseline.json", import.meta.url);

interface CaseResult {
  id: string;
  taserMicros: number;
  honoMicros: number;
  ratio: number;
  ratioSpread: number;
}

interface BaselineCase {
  ratio: number;
  taserMicros: number;
  honoMicros: number;
  taserRequestsPerSecond: number;
  honoRequestsPerSecond: number;
}

interface Baseline {
  nodeVersion: string;
  rounds: number;
  cases: Record<string, BaselineCase>;
}

const { values: options } = parseArgs({
  options: {
    filter: { type: "string" },
    rounds: { type: "string", default: String(DEFAULT_ROUNDS) },
    json: { type: "string" },
    check: { type: "boolean", default: false },
    "update-baseline": { type: "boolean", default: false },
    tolerance: { type: "string", default: String(REGRESSION_TOLERANCE) },
  },
});

const rounds = Number(options.rounds);
const tolerance = Number(options.tolerance);

function caseId(benchCase: BenchCase): string {
  return `${benchCase.group} :: ${benchCase.name}`;
}

/**
 * Sequential, in-process operations per second (the inverse of latency). It is not server
 * capacity: there is no network and no concurrency.
 */
function requestsPerSecond(micros: number): number {
  return MICROS_PER_SECOND / micros;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

function collectGarbage(): void {
  (globalThis as { gc?: () => void }).gc?.();
}

async function measureMicrosPerOp(run: BenchCase["taser"], durationMs: number): Promise<number> {
  collectGarbage();
  const startedAt = performance.now();
  const deadline = startedAt + durationMs;
  let iterations = 0;
  let now = startedAt;
  while (now < deadline) {
    for (let i = 0; i < CLOCK_CHECK_INTERVAL; i++) {
      await run();
    }
    iterations += CLOCK_CHECK_INTERVAL;
    now = performance.now();
  }
  return ((now - startedAt) * 1000) / iterations;
}

async function assertExpectedStatus(benchCase: BenchCase): Promise<void> {
  for (const variant of ["taser", "hono"] as const) {
    const response = await benchCase[variant]();
    if (response.status !== benchCase.expectedStatus) {
      throw new Error(
        `${caseId(benchCase)} (${variant}) returned ${response.status}, expected ${benchCase.expectedStatus}`,
      );
    }
  }
}

async function measureCase(benchCase: BenchCase, roundCount: number): Promise<CaseResult> {
  await assertExpectedStatus(benchCase);
  await measureMicrosPerOp(benchCase.taser, WARMUP_MS);
  await measureMicrosPerOp(benchCase.hono, WARMUP_MS);

  const taserSamples: number[] = [];
  const honoSamples: number[] = [];
  for (let round = 0; round < roundCount; round++) {
    const taserFirst = round % 2 === 0;
    const first = taserFirst ? benchCase.taser : benchCase.hono;
    const second = taserFirst ? benchCase.hono : benchCase.taser;
    const firstMicros = await measureMicrosPerOp(first, ROUND_MS);
    const secondMicros = await measureMicrosPerOp(second, ROUND_MS);
    taserSamples.push(taserFirst ? firstMicros : secondMicros);
    honoSamples.push(taserFirst ? secondMicros : firstMicros);
  }

  const ratios = taserSamples.map((micros, index) => micros / honoSamples[index]!);
  const ratio = median(ratios);
  return {
    id: caseId(benchCase),
    taserMicros: median(taserSamples),
    honoMicros: median(honoSamples),
    ratio,
    ratioSpread: median(ratios.map((value) => Math.abs(value - ratio))) / ratio,
  };
}

function formatRps(micros: number): string {
  return `${Math.round(requestsPerSecond(micros)).toLocaleString("en-US").padStart(7)} rps`;
}

function formatResult(result: CaseResult): string {
  const noisy = result.ratioSpread > NOISY_SPREAD_THRESHOLD ? "  noisy" : "";
  return [
    result.id.padEnd(95),
    `taser ${result.taserMicros.toFixed(2).padStart(7)} us ${formatRps(result.taserMicros)}`,
    `hono ${result.honoMicros.toFixed(2).padStart(7)} us ${formatRps(result.honoMicros)}`,
    `ratio ${result.ratio.toFixed(2)}x`,
    `+-${(result.ratioSpread * 100).toFixed(0)}%${noisy}`,
  ].join("  ");
}

async function readBaseline(): Promise<Baseline> {
  try {
    return JSON.parse(await readFile(BASELINE_URL, "utf8")) as Baseline;
  } catch (error) {
    throw new Error("Missing bench/baseline.json. Run with --update-baseline first.", {
      cause: error,
    });
  }
}

function toBaseline(results: CaseResult[]): Baseline {
  return {
    nodeVersion: process.version,
    rounds,
    cases: Object.fromEntries(
      results.map(({ id, ratio, taserMicros, honoMicros }) => [
        id,
        {
          ratio: Number(ratio.toFixed(3)),
          taserMicros: Number(taserMicros.toFixed(2)),
          honoMicros: Number(honoMicros.toFixed(2)),
          taserRequestsPerSecond: Math.round(requestsPerSecond(taserMicros)),
          honoRequestsPerSecond: Math.round(requestsPerSecond(honoMicros)),
        } satisfies BaselineCase,
      ]),
    ),
  };
}

/**
 * A suspected regression is re-measured with more rounds and judged on the better of the two
 * runs, so a single noisy window cannot fail the guard.
 */
async function findRegressions(
  results: CaseResult[],
  cases: BenchCase[],
  baseline: Baseline,
): Promise<string[]> {
  const regressions: string[] = [];
  for (const result of results) {
    const expected = baseline.cases[result.id];
    if (!expected) {
      regressions.push(`${result.id}: not present in baseline (run --update-baseline)`);
      continue;
    }
    const limit = expected.ratio * (1 + tolerance);
    if (result.ratio <= limit) continue;

    const benchCase = cases.find((candidate) => caseId(candidate) === result.id)!;
    const recheck = await measureCase(benchCase, rounds * RECHECK_ROUND_MULTIPLIER);
    const bestRatio = Math.min(result.ratio, recheck.ratio);
    if (bestRatio > limit) {
      regressions.push(
        `${result.id}: ratio ${bestRatio.toFixed(2)}x exceeds ${limit.toFixed(2)}x (baseline ${expected.ratio.toFixed(2)}x + ${tolerance * 100}%)`,
      );
    }
  }
  return regressions;
}

async function main(): Promise<void> {
  const allCases = createBenchCases(await loadBuiltCreateTaserApp());
  const filter = options.filter?.toLowerCase();
  const cases = filter
    ? allCases.filter((benchCase) => caseId(benchCase).toLowerCase().includes(filter))
    : allCases;
  if (cases.length === 0) {
    throw new Error(`No benchmark case matches --filter ${options.filter}`);
  }

  console.log(`node ${process.version}, ${rounds} rounds x ${ROUND_MS} ms, warmup ${WARMUP_MS} ms`);
  if (typeof (globalThis as { gc?: unknown }).gc !== "function") {
    console.warn("Run with --expose-gc for lower variance.");
  }

  const results: CaseResult[] = [];
  for (const benchCase of cases) {
    const result = await measureCase(benchCase, rounds);
    results.push(result);
    console.log(formatResult(result));
  }

  if (options.json) {
    await writeFile(options.json, `${JSON.stringify(toBaseline(results), null, 2)}\n`);
  }

  if (options["update-baseline"]) {
    if (filter) throw new Error("--update-baseline cannot be combined with --filter");
    await writeFile(BASELINE_URL, `${JSON.stringify(toBaseline(results), null, 2)}\n`);
    console.log("Wrote bench/baseline.json");
  }

  if (options.check) {
    const regressions = await findRegressions(results, cases, await readBaseline());
    if (regressions.length > 0) {
      console.error(`\n${regressions.length} regression(s):\n${regressions.join("\n")}`);
      process.exitCode = 1;
    } else {
      console.log("\nNo regressions against bench/baseline.json");
    }
  }
}

await main();
