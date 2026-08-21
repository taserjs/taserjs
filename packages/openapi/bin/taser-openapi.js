#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createJiti } from "jiti";
import { generateOpenApi } from "../dist/index.js";

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName("taser-openapi")
    .option("manifest", {
      type: "string",
      alias: "m",
      default: "./src/route-manifest.ts",
      describe: "Path to generated route-manifest.ts file",
    })
    .option("out", {
      type: "string",
      alias: "o",
      default: "./openapi.yaml",
      describe: "Output path for generated OpenAPI spec file",
    })
    .option("format", {
      type: "string",
      choices: ["yaml", "json"],
      default: "yaml",
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

  const manifestPath = resolve(process.cwd(), argv.manifest);
  const jiti = createJiti(import.meta.url);
  const manifestModule = await jiti.import(manifestPath);
  const routeManifest = manifestModule.routeManifest ?? manifestModule.default;

  if (!routeManifest) {
    console.error(`Error: Could not find routeManifest exported from ${manifestPath}`);
    process.exit(1);
  }

  const spec = generateOpenApi(routeManifest, {
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

main().catch((err) => {
  console.error("Failed to generate OpenAPI spec:", err);
  process.exit(1);
});
