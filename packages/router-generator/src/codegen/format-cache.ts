import { createManifestFingerprint } from "../fs/persistent-cache.js";

export class FormatCache {
  private lastKey: string | null = null;
  private lastFormatted: string | null = null;

  get(key: string): string | undefined {
    if (this.lastKey === key && this.lastFormatted !== null) {
      return this.lastFormatted;
    }
    return undefined;
  }

  set(key: string, formatted: string): void {
    this.lastKey = key;
    this.lastFormatted = formatted;
  }

  static createKey(source: string, quotes: "single" | "double", semi: boolean): string {
    return createManifestFingerprint(`${source}\0${quotes}\0${semi}`);
  }

  clear(): void {
    this.lastKey = null;
    this.lastFormatted = null;
  }
}
