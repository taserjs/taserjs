import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const CACHE_VERSION = 1;

export type PersistentCacheFile = {
  version: number;
  routesDir: string;
  outputFile: string;
  files: Record<string, number>;
  manifestHash?: string;
};

export function resolveDevCachePath(configDir: string): string {
  return join(configDir, "node_modules", ".cache", "taser.json");
}

export class PersistentCache {
  private readonly cachePath: string;

  constructor(configDir: string) {
    this.cachePath = resolveDevCachePath(configDir);
  }

  async load(): Promise<PersistentCacheFile | null> {
    try {
      const raw = await readFile(this.cachePath, "utf8");
      const parsed = JSON.parse(raw) as PersistentCacheFile;
      if (parsed.version !== CACHE_VERSION) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async save(cache: PersistentCacheFile): Promise<void> {
    await mkdir(dirname(this.cachePath), { recursive: true });
    await writeFile(this.cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  }

  static hashContent(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  static matchesFileIndex(
    cache: PersistentCacheFile,
    routesDir: string,
    outputFile: string,
    files: Record<string, number>,
  ): boolean {
    if (cache.routesDir !== routesDir || cache.outputFile !== outputFile) {
      return false;
    }

    const cacheKeys = Object.keys(cache.files);
    const fileKeys = Object.keys(files);
    if (cacheKeys.length !== fileKeys.length) {
      return false;
    }

    for (const key of fileKeys) {
      if (cache.files[key] !== files[key]) {
        return false;
      }
    }

    return true;
  }
}

export function createManifestFingerprint(content: string): string {
  return PersistentCache.hashContent(content);
}
