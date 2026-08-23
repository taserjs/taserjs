// oxlint-disable no-await-in-loop
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

import { json } from "@taserjs/router-utils/reply";
import { timing } from "hono/timing";
import { z } from "zod";

import { createTaserCompatHandler, createTaserRuntime } from "../dist/esm/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, "results");

const WARMUP_ITERATIONS = 500;
const MEASURE_ITERATIONS = 10_000;

function percentile(sorted, p) {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function measureScenario(name, run) {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await run();
  }

  const samples = [];
  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    const start = performance.now();
    const response = await run();
    if (!response.ok && response.status !== 404) {
      throw new Error(`Scenario "${name}" failed with status ${response.status}`);
    }
    samples.push(performance.now() - start);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const total = samples.reduce((sum, value) => sum + value, 0);
  const meanMs = total / samples.length;

  return {
    name,
    iterations: MEASURE_ITERATIONS,
    meanMs,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    opsPerSec: 1000 / meanMs,
  };
}

function buildManifests() {
  const layoutMiddleware = {
    handler: async (_ctx, next) => next(),
  };

  const routeMiddleware = {
    handler: async (_ctx, next) => next(),
  };

  const honoTimingMiddleware = {
    handler: createTaserCompatHandler(timing()),
  };

  const bodySchema = z.object({ name: z.string() });

  const mw1 = { handler: async (_ctx, next) => next() };
  const mw2 = { handler: async (_ctx, next) => next() };
  const mw3 = { handler: async (_ctx, next) => next() };

  return {
    "get-simple": {
      layouts: {},
      routes: {
        "/hello": {
          GET: {
            layoutChain: [],
            route: {
              path: "/hello",
              method: "GET",
              middlewares: [],
              handlerMiddlewares: [],
              handler: () => json({ ok: true }),
            },
          },
        },
      },
    },
    "get-1mw": {
      layouts: {},
      routes: {
        "/hello": {
          GET: {
            layoutChain: [],
            route: {
              path: "/hello",
              method: "GET",
              middlewares: [mw1],
              handlerMiddlewares: [],
              handler: () => json({ ok: true }),
            },
          },
        },
      },
    },
    "get-3mw": {
      layouts: {},
      routes: {
        "/hello": {
          GET: {
            layoutChain: [],
            route: {
              path: "/hello",
              method: "GET",
              middlewares: [mw1, mw2, mw3],
              handlerMiddlewares: [],
              handler: () => json({ ok: true }),
            },
          },
        },
      },
    },
    "get-with-layout": {
      layouts: {
        root: { middlewares: { middlewares: [layoutMiddleware] } },
      },
      routes: {
        "/hello": {
          GET: {
            layoutChain: ["root"],
            route: {
              path: "/hello",
              method: "GET",
              middlewares: [routeMiddleware],
              handlerMiddlewares: [],
              handler: () => json({ ok: true }),
            },
          },
        },
      },
    },
    "post-no-body-schema": {
      layouts: {},
      routes: {
        "/items": {
          POST: {
            layoutChain: [],
            route: {
              path: "/items",
              method: "POST",
              middlewares: [],
              handlerMiddlewares: [],
              handler: () => json({ ok: true }),
            },
          },
        },
      },
    },
    "post-with-body-schema": {
      layouts: {},
      routes: {
        "/items": {
          POST: {
            layoutChain: [],
            route: {
              path: "/items",
              method: "POST",
              middlewares: [],
              handlerMiddlewares: [],
              body: bodySchema,
              handler: (ctx) => json({ name: ctx.body.name }),
            },
          },
        },
      },
    },
    "post-form": {
      layouts: {},
      routes: {
        "/form": {
          POST: {
            layoutChain: [],
            route: {
              path: "/form",
              method: "POST",
              bodyMode: "form",
              middlewares: [],
              handlerMiddlewares: [],
              handler: (ctx) => json({ received: true }),
            },
          },
        },
      },
    },
    "hono-mw-1": {
      layouts: {
        root: { middlewares: { middlewares: [honoTimingMiddleware] } },
      },
      routes: {
        "/hello": {
          GET: {
            layoutChain: ["root"],
            route: {
              path: "/hello",
              method: "GET",
              middlewares: [],
              handlerMiddlewares: [],
              handler: () => json({ ok: true }),
            },
          },
        },
      },
    },
  };
}

function createScenarios() {
  const manifests = buildManifests();
  const postBody = JSON.stringify({ name: "bench" });
  const formBody = "name=bench&email=bench%40example.com";

  const getSimpleRuntime = createTaserRuntime(manifests["get-simple"], () => ({}));
  const get1mwRuntime = createTaserRuntime(manifests["get-1mw"], () => ({}));
  const get3mwRuntime = createTaserRuntime(manifests["get-3mw"], () => ({}));
  const getLayoutRuntime = createTaserRuntime(manifests["get-with-layout"], () => ({}));
  const postNoBodyRuntime = createTaserRuntime(manifests["post-no-body-schema"], () => ({}));
  const postBodyRuntime = createTaserRuntime(manifests["post-with-body-schema"], () => ({}));
  const postFormRuntime = createTaserRuntime(manifests["post-form"], () => ({}));
  const honoMwRuntime = createTaserRuntime(manifests["hono-mw-1"], () => ({}));

  return [
    {
      name: "get-simple",
      run: () => getSimpleRuntime.fetch(new Request("http://localhost/hello")),
    },
    {
      name: "get-1mw",
      run: () => get1mwRuntime.fetch(new Request("http://localhost/hello")),
    },
    {
      name: "get-3mw",
      run: () => get3mwRuntime.fetch(new Request("http://localhost/hello")),
    },
    {
      name: "get-with-layout",
      run: () => getLayoutRuntime.fetch(new Request("http://localhost/hello")),
    },
    {
      name: "post-no-body-schema",
      run: () =>
        postNoBodyRuntime.fetch(
          new Request("http://localhost/items", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: postBody,
          }),
        ),
    },
    {
      name: "post-with-body-schema",
      run: () =>
        postBodyRuntime.fetch(
          new Request("http://localhost/items", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: postBody,
          }),
        ),
    },
    {
      name: "post-form",
      run: () =>
        postFormRuntime.fetch(
          new Request("http://localhost/form", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: formBody,
          }),
        ),
    },
    {
      name: "hono-mw-1",
      run: () => honoMwRuntime.fetch(new Request("http://localhost/hello")),
    },
  ];
}

async function runBenchmark(label) {
  const scenarios = createScenarios();
  const results = [];

  console.log(`Running runtime hot-path benchmark (${label})`);
  console.log(`Warmup: ${WARMUP_ITERATIONS}, measure: ${MEASURE_ITERATIONS}`);

  for (const scenario of scenarios) {
    const result = await measureScenario(scenario.name, scenario.run);
    results.push(result);
    console.log(
      `${result.name}: mean=${result.meanMs.toFixed(4)}ms p50=${result.p50Ms.toFixed(4)}ms p95=${result.p95Ms.toFixed(4)}ms ops=${result.opsPerSec.toFixed(0)}`,
    );
  }

  return {
    label,
    nodeVersion: process.version,
    date: new Date().toISOString(),
    warmupIterations: WARMUP_ITERATIONS,
    measureIterations: MEASURE_ITERATIONS,
    scenarios: results,
  };
}

async function saveReport(label, report) {
  await mkdir(RESULTS_DIR, { recursive: true });
  const path = join(RESULTS_DIR, `${label}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return path;
}

function compareReports(before, after) {
  console.log(`Comparing ${before.label} -> ${after.label}`);
  for (const beforeScenario of before.scenarios) {
    const afterScenario = after.scenarios.find((s) => s.name === beforeScenario.name);
    if (!afterScenario) {
      console.log(`${beforeScenario.name}: missing in after report`);
      continue;
    }
    const deltaPct = ((afterScenario.meanMs - beforeScenario.meanMs) / beforeScenario.meanMs) * 100;
    const sign = deltaPct <= 0 ? "" : "+";
    console.log(
      `${beforeScenario.name}: mean ${beforeScenario.meanMs.toFixed(4)}ms -> ${afterScenario.meanMs.toFixed(4)}ms (${sign}${deltaPct.toFixed(1)}%)`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const labelIndex = args.indexOf("--label");
  const compareIndex = args.indexOf("--compare");

  if (compareIndex !== -1) {
    const beforeLabel = args[compareIndex + 1];
    const afterLabel = args[compareIndex + 2];
    if (!beforeLabel || !afterLabel) {
      throw new Error("Usage: benchmark:runtime -- --compare <before> <after>");
    }
    const before = JSON.parse(await readFile(join(RESULTS_DIR, `${beforeLabel}.json`), "utf8"));
    const after = JSON.parse(await readFile(join(RESULTS_DIR, `${afterLabel}.json`), "utf8"));
    compareReports(before, after);
    return;
  }

  const label = labelIndex !== -1 ? args[labelIndex + 1] : "run";
  if (!label) {
    throw new Error("Usage: benchmark:runtime -- --label <name>");
  }

  const report = await runBenchmark(label);
  const path = await saveReport(label, report);
  console.log(`Saved ${path}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
