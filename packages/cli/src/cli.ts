import { parseArgs, styleText } from "node:util";

import type { FSWatcher } from "chokidar";

import { version } from "../package.json" with { type: "json" };
import { loadConfig, resolvePaths } from "./config.js";
import { executeGenerate } from "./generator.js";
import { watchRoutes } from "./watch.js";

const HELP = `Usage: taser generate [options]

Scan routes and generate the static route manifest.

Options:
  -c, --config <path>  Path to taserjs.config.ts
  -w, --watch          Watch routes and regenerate on change
  -h, --help           Show help
  -v, --version        Show version`;

export async function runGenerate(options: {
  cwd?: string | undefined;
  config?: string | undefined;
  watch?: boolean | undefined;
}): Promise<FSWatcher | undefined> {
  const cwd = options.cwd ?? process.cwd();
  const config = await loadConfig(cwd, options.config);

  const generate = () => {
    const startTime = Date.now();
    try {
      const result = executeGenerate({ cwd, config, scaffold: options.watch });
      if (!result) return;

      const elapsed = Date.now() - startTime;
      const { routes, layouts } = result.scanResult;
      console.log(
        result.generateResult.manifestWritten
          ? `${styleText("green", "✔")} Manifest generated in ${styleText("cyan", `${elapsed}ms`)} ` +
              styleText("dim", `(${routes.length} routes, ${layouts.length} layouts)`)
          : styleText("dim", `Manifest up to date (${elapsed}ms)`),
      );
    } catch (err) {
      console.error(styleText("red", "✖ Generation failed:"));
      console.error((err as Error).message);
      if (!options.watch) process.exitCode = 1;
    }
  };

  generate();
  if (!options.watch) return undefined;

  console.log(
    styleText("cyan", `\nWatching for route changes in ${resolvePaths(config, cwd).routesDir}...`),
  );
  const watcher = watchRoutes(config, cwd, (changedPath) => {
    console.log(styleText("dim", `Change detected in ${changedPath}, regenerating...`));
    generate();
  });
  watcher.on("error", (err) => {
    console.error(
      styleText("red", "Watcher error:"),
      err instanceof Error ? err.message : String(err),
    );
  });
  return watcher;
}

export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      config: { type: "string", short: "c" },
      watch: { type: "boolean", short: "w" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.version) return console.log(version);
  if (values.help) return console.log(HELP);
  if (positionals[0] !== "generate") {
    throw new Error(`You must provide a valid command.\n\n${HELP}`);
  }

  await runGenerate({ watch: values.watch, config: values.config });
}
