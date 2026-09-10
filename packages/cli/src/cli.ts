#!/usr/bin/env node
import { existsSync } from "node:fs";
import { watch, type FSWatcher } from "chokidar";
import pc from "picocolors";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadConfig, resolveAppFile, resolveRoutesDir } from "./config.js";
import { generateManifest } from "./generator.js";
import { scanRoutes } from "./scanner.js";

const DEFAULT_WATCH_DEBOUNCE_MS = 100;

export async function runGenerate(options: {
  cwd?: string | undefined;
  config?: string | undefined;
  watch?: boolean | undefined;
}): Promise<FSWatcher | void> {
  const cwd = options.cwd ?? process.cwd();
  const config = await loadConfig(cwd, options.config);

  const executeGeneration = () => {
    const startTime = Date.now();
    try {
      const routesDir = resolveRoutesDir(config, cwd);
      const scanResult = scanRoutes({
        routesDir,
        cwd,
      });

      const generateResult = generateManifest(scanResult, config, cwd);
      const elapsed = Date.now() - startTime;

      if (generateResult.manifestWritten) {
        console.log(
          pc.green("✔") +
            ` Manifest generated in ${pc.cyan(`${elapsed}ms`)} ` +
            pc.dim(`(${scanResult.routes.length} routes, ${scanResult.layouts.length} layouts)`),
        );
      } else {
        console.log(pc.dim(`Manifest up to date (${elapsed}ms)`));
      }
    } catch (err: any) {
      console.error(pc.red("✖ Generation failed:"));
      console.error(err.message);
      if (!options.watch) {
        process.exitCode = 1;
      }
    }
  };

  executeGeneration();

  if (options.watch) {
    const fullRoutesDir = resolveRoutesDir(config, cwd);
    const fullAppFile = resolveAppFile(config, cwd);
    console.log(pc.cyan(`\nWatching for route changes in ${fullRoutesDir}...`));

    const watchTargets = [fullRoutesDir];
    if (existsSync(fullAppFile)) {
      watchTargets.push(fullAppFile);
    }

    const watcher = watch(watchTargets, {
      ignoreInitial: true,
      ignored: [/(^|[/\\])\../, /(^|[/\\])-/, /node_modules/, /\.taserjs/],
    });

    let timer: NodeJS.Timeout | null = null;
    const handleChange = (changedPath: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        console.log(pc.dim(`Change detected in ${changedPath}, regenerating...`));
        executeGeneration();
      }, DEFAULT_WATCH_DEBOUNCE_MS);
    };

    watcher.on("add", handleChange);
    watcher.on("change", handleChange);
    watcher.on("unlink", handleChange);
    watcher.on("unlinkDir", handleChange);
    watcher.on("error", (err: unknown) => {
      console.error(pc.red("Watcher error:"), err instanceof Error ? err.message : String(err));
    });

    return watcher;
  }
}

export function createCli(argv: string[] = hideBin(process.argv)) {
  return yargs(argv)
    .scriptName("taser")
    .usage("$0 <command> [options]")
    .command(
      "generate",
      "Scan routes and generate static route manifest",
      (y) =>
        y
          .option("watch", {
            alias: "w",
            type: "boolean",
            description: "Watch routes directory for changes",
            default: false,
          })
          .option("config", {
            alias: "c",
            type: "string",
            description: "Path to taserjs.config.ts",
          }),
      async (args) => {
        await runGenerate({
          watch: args.watch,
          config: args.config,
        });
      },
    )
    .demandCommand(1, "You must provide a valid command.")
    .version()
    .alias("version", "v")
    .help()
    .alias("help", "h")
    .strict()
    .exitProcess(false);
}

export async function run(argv: string[] = hideBin(process.argv)): Promise<void> {
  await createCli(argv).parse();
}

if (process.argv[1] && process.argv[1].endsWith("cli.js")) {
  run().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
