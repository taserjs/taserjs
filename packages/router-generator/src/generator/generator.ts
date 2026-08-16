import { relative } from "node:path";

import { emitFormattedRouteManifestSource } from "../codegen/emit-route-manifest.js";
import { FormatCache } from "../codegen/format-cache.js";
import { toEmitManifestOptions, toScanOptions } from "../config/emit-options.js";
import { resolveGeneratorConfig } from "../config/resolve.js";
import type { GeneratorRunOptions, ResolvedGeneratorConfig } from "../config/schema.js";
import { FileIndex } from "../fs/file-index.js";
import { createManifestFingerprint, PersistentCache } from "../fs/persistent-cache.js";
import { writeManifestIfChanged } from "../fs/write-manifest.js";
import { IncrementalRouteModel } from "../model/incremental.js";
import { createLogger, type Logger } from "../support/logger.js";

export type GeneratorEventType = "add" | "change" | "unlink" | "rerun";

export type GeneratorEvent = {
  type: GeneratorEventType;
  filePath?: string;
};

export type GeneratorRunResult = {
  written: boolean;
  skipped: boolean;
  skippedWork: boolean;
};

export class Generator {
  private readonly config: ResolvedGeneratorConfig;
  private readonly logger: Logger;
  private readonly persistentCache: PersistentCache;
  private readonly formatCache = new FormatCache();
  private readonly force: boolean;

  private fileIndex: FileIndex | null = null;
  private routeModel: IncrementalRouteModel | null = null;
  private lastManifestHash: string | null = null;

  private watchMode = false;

  private eventQueue: GeneratorEvent[] = [];
  private runPromise: Promise<GeneratorRunResult> | null = null;

  constructor(options: GeneratorRunOptions) {
    this.config = resolveGeneratorConfig(options);
    this.logger = createLogger(this.config.quiet);
    this.persistentCache = new PersistentCache(this.config.configDir);
    this.force = options.force ?? false;
  }

  enableWatchMode(): void {
    this.watchMode = true;
  }

  enqueue(event: GeneratorEvent): Promise<GeneratorRunResult> {
    this.eventQueue.push(event);
    return this.run();
  }

  run(): Promise<GeneratorRunResult> {
    if (this.runPromise) {
      return this.runPromise;
    }

    this.runPromise = this.runInternal().finally(() => {
      this.runPromise = null;
      if (this.eventQueue.length > 0) {
        return this.run();
      }
    });

    return this.runPromise;
  }

  private async runInternal(): Promise<GeneratorRunResult> {
    const events = this.eventQueue.splice(0);
    const config = this.config;
    const scanOptions = toScanOptions(config);

    if (!this.watchMode && this.fileIndex === null && !this.force) {
      const cacheHit = await this.tryPersistentCacheSkip();
      if (cacheHit) {
        return { written: false, skipped: true, skippedWork: true };
      }
    }

    if (this.force) {
      this.fileIndex = null;
      this.routeModel = null;
      this.lastManifestHash = null;
      this.formatCache.clear();
    }

    let rebuildScope: "none" | "partial" | "full" = "full";

    if (this.fileIndex === null) {
      this.fileIndex = await FileIndex.fromDirectory(config.routesDir, config);
      rebuildScope = "full";
    } else {
      rebuildScope = await this.applyEvents(events);
    }

    if (rebuildScope === "none") {
      return { written: false, skipped: true, skippedWork: true };
    }

    if (rebuildScope === "full" || this.routeModel === null) {
      this.routeModel = await IncrementalRouteModel.fromColdScan(
        config.routesDir,
        config.outputFile,
        this.fileIndex.getAbsolutePaths(),
        scanOptions,
      );
    }

    const model = this.routeModel.toGeneratedModel();
    const emitOptions = toEmitManifestOptions(config);
    const source = await emitFormattedRouteManifestSource(model, emitOptions, this.formatCache);

    if (!this.force && this.lastManifestHash === createManifestFingerprint(source)) {
      return { written: false, skipped: true, skippedWork: false };
    }

    const writeResult = await writeManifestIfChanged(config.outputFile, source, {
      force: this.force,
    });
    this.lastManifestHash = createManifestFingerprint(source);

    if (writeResult === "written") {
      this.logger.info(`Generated ${relative(process.cwd(), config.outputFile)}`);
    }

    await this.persistentCache.save({
      version: 1,
      routesDir: config.routesDir,
      outputFile: config.outputFile,
      files: this.fileIndex.toMtimeRecord(),
      manifestHash: this.lastManifestHash,
    });

    return {
      written: writeResult === "written",
      skipped: writeResult === "skipped",
      skippedWork: false,
    };
  }

  private async applyEvents(events: GeneratorEvent[]): Promise<"none" | "partial" | "full"> {
    if (events.length === 0) {
      return "none";
    }

    const config = this.config;
    const scanOptions = toScanOptions(config);
    let scope: "none" | "partial" | "full" = "none";

    for (const event of events) {
      if (event.type === "rerun") {
        return "full";
      }

      if (!event.filePath) {
        continue;
      }

      if (event.type === "unlink") {
        const removed = this.fileIndex!.removeByAbsolutePath(event.filePath, config.routesDir);
        if (removed && this.routeModel) {
          const removalScope = this.routeModel.applyFileRemoval(removed);
          scope = maxScope(scope, removalScope);
        }
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop
      const upsertResult = await this.fileIndex!.upsert(event.filePath, config.routesDir, config);
      if (upsertResult === "unchanged") {
        continue;
      }

      if (upsertResult === "ignored") {
        const removed = this.fileIndex!.removeByAbsolutePath(event.filePath, config.routesDir);
        if (removed && this.routeModel) {
          const removalScope = this.routeModel.applyFileRemoval(removed);
          scope = maxScope(scope, removalScope);
        }
        continue;
      }

      if (this.routeModel) {
        // oxlint-disable-next-line no-await-in-loop
        const updateScope = await this.routeModel.applyFileUpsert(
          config.routesDir,
          config.outputFile,
          event.filePath,
          scanOptions,
        );
        scope = maxScope(scope, updateScope);
      } else {
        scope = "full";
      }
    }

    return scope;
  }

  private async tryPersistentCacheSkip(): Promise<boolean> {
    const config = this.config;
    const cache = await this.persistentCache.load();
    if (!cache) {
      return false;
    }

    const index = await FileIndex.fromDirectory(config.routesDir, config);
    if (
      !PersistentCache.matchesFileIndex(
        cache,
        config.routesDir,
        config.outputFile,
        index.toMtimeRecord(),
      )
    ) {
      return false;
    }

    if (!cache.manifestHash) {
      return false;
    }

    this.fileIndex = index;
    this.lastManifestHash = cache.manifestHash;
    this.logger.info(
      `Skipped generation; route files unchanged (${relative(process.cwd(), config.outputFile)})`,
    );
    return true;
  }
}

function maxScope(
  left: "none" | "partial" | "full",
  right: "none" | "partial" | "full",
): "none" | "partial" | "full" {
  if (left === "full" || right === "full") {
    return "full";
  }
  if (left === "partial" || right === "partial") {
    return "partial";
  }
  return "none";
}

export async function generateRouteTree(options: GeneratorRunOptions): Promise<GeneratorRunResult> {
  const generator = new Generator(options);
  return generator.run();
}

export type WatchRouteTreeHandle = {
  close: () => Promise<void>;
};

export async function watchRouteTree(options: GeneratorRunOptions): Promise<WatchRouteTreeHandle> {
  const { watchRouteTreeInternal } = await import("../watch/watch.js");
  return watchRouteTreeInternal(options);
}
