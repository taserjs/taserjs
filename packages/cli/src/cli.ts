#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import * as p from "@clack/prompts";
import { watch, type FSWatcher } from "chokidar";
import pc from "picocolors";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadConfig, resolveAppFile, resolveRoutesDir } from "./config.js";
import { generateManifest } from "./generator.js";
import {
  scaffoldProject,
  type PackageVersions,
  type ScaffoldResult,
  type TemplateVariant,
} from "./scaffold.js";
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
        extensions: config.extensions,
      });

      const generateResult = generateManifest(scanResult, config, cwd);
      const elapsed = Date.now() - startTime;

      if (generateResult.manifestWritten || generateResult.typesWritten) {
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

export interface RunCreateOptions {
  dir?: string | undefined;
  name?: string | undefined;
  template?: TemplateVariant | undefined;
  force?: boolean | undefined;
  interactive?: boolean | undefined;
  packageVersions?: PackageVersions | undefined;
}

export async function runCreate(options: RunCreateOptions = {}): Promise<ScaffoldResult | void> {
  const isInteractive =
    options.interactive ?? (Boolean(process.stdout.isTTY) && process.env.NODE_ENV !== "test");

  if (isInteractive) {
    p.intro(pc.bgCyan(pc.black(" create-taserjs ")));
  }

  let targetDir = options.dir;
  if (!targetDir) {
    if (isInteractive) {
      const dirPrompt = await p.text({
        message: "Where should we create your new project?",
        placeholder: "./my-taser-app",
        defaultValue: "my-taser-app",
      });
      if (p.isCancel(dirPrompt)) {
        p.cancel("Operation cancelled.");
        return;
      }
      targetDir = String(dirPrompt);
    } else {
      targetDir = "my-taser-app";
    }
  }

  const resolvedDir = resolve(targetDir);
  const projectName = options.name ?? basename(resolvedDir);

  let template = options.template;
  if (!template) {
    if (isInteractive) {
      const templatePrompt = await p.select({
        message: "Select a route language / format:",
        options: [
          { value: "ts", label: "TypeScript (.ts)" },
          { value: "tsx", label: "TypeScript JSX (.tsx)" },
        ],
        initialValue: "ts",
      });
      if (p.isCancel(templatePrompt)) {
        p.cancel("Operation cancelled.");
        return;
      }
      template = templatePrompt as TemplateVariant;
    } else {
      template = "ts";
    }
  }

  if (existsSync(resolvedDir)) {
    const existingFiles = readdirSync(resolvedDir).filter((file) => file !== ".git");
    if (existingFiles.length > 0 && !options.force) {
      if (isInteractive) {
        const overwritePrompt = await p.confirm({
          message: `Target directory "${targetDir}" is not empty. Overwrite existing files?`,
          initialValue: false,
        });
        if (p.isCancel(overwritePrompt) || !overwritePrompt) {
          p.cancel("Operation cancelled.");
          return;
        }
      } else {
        throw new Error(`Target directory "${targetDir}" is not empty. Use --force to overwrite.`);
      }
    }
  }

  const result = scaffoldProject({
    targetDir: resolvedDir,
    projectName,
    template,
    packageVersions: options.packageVersions,
  });

  if (isInteractive) {
    p.outro(pc.green(`Project "${projectName}" created successfully!`));
    console.log(`\nNext steps:\n  cd ${targetDir}\n  pnpm install\n  pnpm dev\n`);
  } else {
    console.log(pc.green(`✔ Project "${projectName}" created successfully in ${targetDir}`));
  }

  return result;
}

export async function runCreateCommand(
  argv: string[] = hideBin(process.argv),
): Promise<ScaffoldResult | void> {
  let createdResult: ScaffoldResult | void = undefined;

  const parser = yargs(argv)
    .scriptName("create-taserjs")
    .usage("$0 [dir] [options]")
    .command(
      "$0 [dir]",
      "Scaffold a new Taser.js application",
      (y) =>
        y
          .positional("dir", {
            type: "string",
            description: "Directory to create the project in",
          })
          .option("template", {
            alias: "t",
            type: "string",
            choices: ["ts", "tsx"],
            description: "Template to use (ts or tsx)",
          })
          .option("name", {
            alias: "n",
            type: "string",
            description: "Project name",
          })
          .option("force", {
            alias: "f",
            type: "boolean",
            description: "Overwrite target directory if not empty",
            default: false,
          }),
      async (args) => {
        createdResult = await runCreate({
          dir: args.dir as string | undefined,
          template: args.template as TemplateVariant | undefined,
          name: args.name as string | undefined,
          force: Boolean(args.force),
        });
      },
    )
    .help()
    .alias("help", "h")
    .version()
    .alias("version", "v")
    .strict()
    .exitProcess(false);

  await parser.parse();
  return createdResult;
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
    .command(
      "create [dir]",
      "Scaffold a new Taser.js application",
      (y) =>
        y
          .positional("dir", {
            type: "string",
            description: "Directory to create the project in",
          })
          .option("template", {
            alias: "t",
            type: "string",
            choices: ["ts", "tsx"],
            description: "Template to use (ts or tsx)",
          })
          .option("name", {
            alias: "n",
            type: "string",
            description: "Project name",
          })
          .option("force", {
            alias: "f",
            type: "boolean",
            description: "Overwrite target directory if not empty",
            default: false,
          }),
      async (args) => {
        await runCreate({
          dir: args.dir as string | undefined,
          template: args.template as TemplateVariant | undefined,
          name: args.name as string | undefined,
          force: Boolean(args.force),
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
  run();
}
