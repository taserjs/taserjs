#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createJiti } from "jiti";

import { resolveGeneratorConfig } from "@taserjs/router-generator";
import { generateOpenApi } from "./index.js";

function loadTsconfigAliases(tsconfigPath: string): Record<string, string> | undefined {
  try {
    const absoluteTsconfig = resolve(process.cwd(), tsconfigPath);
    const configDir = dirname(absoluteTsconfig);
    const configFile = ts.readConfigFile(absoluteTsconfig, ts.sys.readFile);
    if (configFile.error) {
      return undefined;
    }
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, configDir);
    const paths = parsed.options.paths;
    if (!paths) {
      return undefined;
    }
    const alias: Record<string, string> = {};
    for (const [pattern, targets] of Object.entries(paths)) {
      const target = targets?.[0];
      if (target) {
        alias[pattern] = resolve(configDir, target);
      }
    }
    return Object.keys(alias).length > 0 ? alias : undefined;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("taser-openapi")
    .option("config", {
      type: "string",
      alias: "c",
      describe: "Path to taser.config.json (defaults to nearest config)",
    })
    .option("manifest", {
      type: "string",
      alias: "m",
      describe: "Path to generated route manifest file (defaults to output from taser.config.json)",
    })
    .option("out", {
      type: "string",
      alias: "o",
      default: "./openapi.yaml",
      describe: "Output path for generated OpenAPI spec file",
    })
    .option("format", {
      type: "string",
      choices: ["yaml", "json"] as const,
      default: "yaml" as const,
      describe: "Output format (yaml or json)",
    })
    .option("title", {
      type: "string",
      default: "Taser REST API",
      describe: "API Title",
    })
    .option("tsconfig", {
      type: "string",
      default: "./tsconfig.json",
      describe: "Path to tsconfig.json for TypeScript return type inference",
    })
    .help()
    .parse();

  let manifestPath = argv.manifest ? resolve(process.cwd(), argv.manifest) : undefined;
  if (!manifestPath) {
    try {
      const config = resolveGeneratorConfig(argv.config ? { configFile: argv.config } : {});
      manifestPath = config.outputFile;
    } catch {
      manifestPath = resolve(process.cwd(), "./src/routeManifest.gen.ts");
    }
  }

  const alias = loadTsconfigAliases(argv.tsconfig);
  const jiti = createJiti(manifestPath, {
    ...(alias ? { alias } : {}),
    tsconfigPaths: resolve(process.cwd(), argv.tsconfig),
  });
  const manifestModule = (await jiti.import(manifestPath)) as {
    routeManifest?: unknown;
    default?: unknown;
  };
  const routeManifest = manifestModule.routeManifest ?? manifestModule.default;

  if (!routeManifest) {
    console.error(`Error: Could not find routeManifest exported from ${manifestPath}`);
    process.exit(1);
  }

  const spec = generateOpenApi(routeManifest as never, {
    info: {
      title: argv.title,
    },
    tsconfigPath: argv.tsconfig,
  });

  const content = argv.format === "json" ? spec.toJson() : spec.toYaml();
  const outputPath = resolve(process.cwd(), argv.out);

  writeFileSync(outputPath, content, "utf-8");
  console.log(`Successfully generated OpenAPI spec at ${outputPath}`);
}

main().catch((err: unknown) => {
  console.error("Failed to generate OpenAPI spec:", err);
  process.exit(1);
});
