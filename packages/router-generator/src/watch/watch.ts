import { relative } from "node:path";

import chokidar from "chokidar";

import { resolveGeneratorConfig } from "../config/resolve.js";
import type { GeneratorRunOptions } from "../config/schema.js";
import {
  Generator,
  type GeneratorEventType,
  type WatchRouteTreeHandle,
} from "../generator/generator.js";
import { shouldIgnoreRoutePath } from "../scan/filter.js";
import { scaffoldRouteFile } from "../scaffold/scaffold-file.js";
import { createLogger } from "../support/logger.js";
import { toPosixPath } from "../support/paths.js";

export async function watchRouteTreeInternal(
  options: GeneratorRunOptions,
): Promise<WatchRouteTreeHandle> {
  const config = resolveGeneratorConfig(options);
  const logger = createLogger(config.quiet);
  const generator = new Generator(options);
  generator.enableWatchMode();

  await generator.run();

  const ignored = [config.outputFile, "**/node_modules/**", "**/*.gen.ts"];

  const watcher = chokidar.watch(config.routesDir, {
    ignoreInitial: true,
    persistent: true,
    ignored,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  watcher.on("all", (eventName, filePath) => {
    if (!filePath.endsWith(".ts")) {
      return;
    }

    const posixPath = toPosixPath(filePath);
    const relativePath = toPosixPath(relative(config.routesDir, posixPath));
    if (shouldIgnoreRoutePath(relativePath, config)) {
      return;
    }

    const eventType = chokidarEventToGeneratorEvent(eventName);
    if (!eventType) {
      return;
    }

    void handleWatchEvent(generator, config, eventType, posixPath, logger);
  });

  logger.info(`Watching ${relative(process.cwd(), config.routesDir)}`);

  return {
    close: async () => {
      await watcher.close();
    },
  };
}

async function handleWatchEvent(
  generator: Generator,
  config: ReturnType<typeof resolveGeneratorConfig>,
  eventType: GeneratorEventType,
  filePath: string,
  logger: Pick<ReturnType<typeof createLogger>, "error">,
): Promise<void> {
  try {
    const relativePath = toPosixPath(relative(config.routesDir, filePath));
    if (shouldIgnoreRoutePath(relativePath, config)) {
      return;
    }

    if (eventType === "add") {
      await scaffoldRouteFile(config.routesDir, filePath, {
        entry: config.entry,
        ignorePrefix: config.ignorePrefix,
        ignorePattern: config.ignorePattern,
      });
    }

    await generator.enqueue({ type: eventType, filePath });
  } catch (error: unknown) {
    logger.error(
      `Route tree generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function chokidarEventToGeneratorEvent(eventName: string): GeneratorEventType | null {
  switch (eventName) {
    case "add":
      return "add";
    case "change":
      return "change";
    case "unlink":
      return "unlink";
    default:
      return null;
  }
}
