import { relative } from 'node:path'

import type { ResolvedGeneratorConfig } from '../config/schema.js'
import { statFileMtimeMs, walkRouteFiles } from './walk.js'
import { shouldIgnoreRouteFile } from '../scan/filter.js'
import { classifyRouteFile } from '../scan/classify.js'
import { toPosixPath } from '../support/paths.js'

export type FileEntryKind = 'route' | 'layout'

export type FileEntry = {
  relativePath: string
  absolutePath: string
  mtimeMs: number
  kind: FileEntryKind
}

export class FileIndex {
  private readonly entries = new Map<string, FileEntry>()

  static async fromDirectory(
    routesDir: string,
    config: Pick<ResolvedGeneratorConfig, 'ignorePrefix' | 'ignorePattern'>,
  ): Promise<FileIndex> {
    const index = new FileIndex()
    const absoluteFiles = await walkRouteFiles(routesDir, config)

    await Promise.all(
      absoluteFiles.map(async (absolutePath) => {
        await index.upsert(absolutePath, routesDir, config)
      }),
    )

    return index
  }

  get size(): number {
    return this.entries.size
  }

  has(relativePath: string): boolean {
    return this.entries.has(relativePath)
  }

  get(relativePath: string): FileEntry | undefined {
    return this.entries.get(relativePath)
  }

  getMtimeMs(relativePath: string): number | undefined {
    return this.entries.get(relativePath)?.mtimeMs
  }

  values(): IterableIterator<FileEntry> {
    return this.entries.values()
  }

  getAbsolutePaths(): string[] {
    return [...this.entries.values()].map(entry => entry.absolutePath)
  }

  toMtimeRecord(): Record<string, number> {
    const record: Record<string, number> = {}
    for (const [relativePath, entry] of this.entries) {
      record[relativePath] = entry.mtimeMs
    }
    return record
  }

  async upsert(
    absolutePath: string,
    routesDir: string,
    config: Pick<ResolvedGeneratorConfig, 'ignorePrefix' | 'ignorePattern'>,
  ): Promise<'added' | 'updated' | 'unchanged' | 'ignored'> {
    const fileName = absolutePath.slice(absolutePath.replace(/\\/g, '/').lastIndexOf('/') + 1)
    if (shouldIgnoreRouteFile(fileName, config)) {
      return 'ignored'
    }

    const relativePath = toPosixPath(relative(routesDir, absolutePath))
    const mtimeMs = await statFileMtimeMs(absolutePath)
    const existing = this.entries.get(relativePath)

    if (existing && existing.mtimeMs === mtimeMs) {
      return 'unchanged'
    }

    const kind = classifyRouteFile(relativePath)
    if (!kind) {
      this.entries.delete(relativePath)
      return 'ignored'
    }

    const entry: FileEntry = {
      relativePath,
      absolutePath,
      mtimeMs,
      kind,
    }

    this.entries.set(relativePath, entry)
    return existing ? 'updated' : 'added'
  }

  remove(relativePath: string): FileEntry | undefined {
    const existing = this.entries.get(relativePath)
    if (existing) {
      this.entries.delete(relativePath)
    }
    return existing
  }

  removeByAbsolutePath(absolutePath: string, routesDir: string): FileEntry | undefined {
    const relativePath = toPosixPath(relative(routesDir, absolutePath))
    return this.remove(relativePath)
  }
}
