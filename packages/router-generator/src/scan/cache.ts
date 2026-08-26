import { readFile, stat } from "node:fs/promises";

import type { HttpVerb, RouteFileMethod } from "../types.js";
import type { ScanError } from "../support/errors.js";
import { analyzeLayoutFileSourceAsync, analyzeRouteFileSourceAsync } from "./scan.js";

export type RouteAnalysis = {
  errors: ScanError[];
  methods?: HttpVerb[];
};

export type LayoutAnalysis = {
  errors: ScanError[];
};

type CacheEntry = {
  mtimeMs: number;
  route?: RouteAnalysis;
  routeMethod?: RouteFileMethod;
  layout?: LayoutAnalysis;
};

export type AnalysisCacheStats = {
  hits: number;
  misses: number;
};

export class AnalysisCache {
  private readonly entries = new Map<string, CacheEntry>();
  private stats: AnalysisCacheStats = { hits: 0, misses: 0 };

  getStats(): AnalysisCacheStats {
    return { ...this.stats };
  }

  clear(): void {
    this.entries.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  delete(absolutePath: string): void {
    this.entries.delete(absolutePath);
  }

  async analyzeRoute(
    absolutePath: string,
    rawRel: string,
    method: RouteFileMethod,
  ): Promise<RouteAnalysis | undefined> {
    const entry = await this.entryFor(absolutePath);
    const cached = entry.route;

    if (cached && entry.routeMethod === method) {
      return cached;
    }

    const source = await this.readOrUndefined(absolutePath);
    if (source === undefined) {
      return undefined;
    }

    const analysis = await analyzeRouteFileSourceAsync(source, rawRel, method);
    entry.route = analysis;
    entry.routeMethod = method;
    return analysis;
  }

  async analyzeLayout(absolutePath: string, rawRel: string): Promise<LayoutAnalysis | undefined> {
    const entry = await this.entryFor(absolutePath);
    if (entry.layout) {
      return entry.layout;
    }

    const source = await this.readOrUndefined(absolutePath);
    if (source === undefined) {
      return undefined;
    }

    const analysis = await analyzeLayoutFileSourceAsync(source, rawRel);
    entry.layout = analysis;
    return analysis;
  }

  private async entryFor(absolutePath: string): Promise<CacheEntry> {
    let mtimeMs: number;
    try {
      mtimeMs = (await stat(absolutePath)).mtimeMs;
    } catch {
      this.stats.misses++;
      return { mtimeMs: Number.NaN };
    }

    const existing = this.entries.get(absolutePath);
    if (existing && existing.mtimeMs === mtimeMs) {
      this.stats.hits++;
      existing.mtimeMs = mtimeMs;
      return existing;
    }

    this.stats.misses++;
    const fresh: CacheEntry = { mtimeMs };
    this.entries.set(absolutePath, fresh);
    return fresh;
  }

  private async readOrUndefined(absolutePath: string): Promise<string | undefined> {
    try {
      return await readFile(absolutePath, "utf8");
    } catch {
      return undefined;
    }
  }
}
