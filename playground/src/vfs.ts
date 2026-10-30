export type VfsOrigin = "editor" | "ui" | "hydrate" | "codegen";

export interface VfsEvent {
  type: "add" | "change" | "unlink";
  path: string;
  origin?: VfsOrigin | undefined;
}

type Listener = (event: VfsEvent) => void;

/** Absolute POSIX-style path rules, shared by the editor and the file tree UI. */
export function pathError(path: string): string | null {
  if (!path.startsWith("/")) return "Path must start with /";
  const segments = path.slice(1).split("/");
  if (segments.some((segment) => segment === "")) return "No empty segments allowed";
  if (segments.some((segment) => segment === "." || segment === "..")) return "No . or .. segments";
  return null;
}

export class Vfs {
  private files = new Map<string, string>();
  private listeners = new Set<Listener>();
  /** Bumped on every event; serves as the useSyncExternalStore snapshot. */
  private rev = 0;

  get version(): number {
    return this.rev;
  }

  /** Alias of {@link subscribe} with the watcher vocabulary used across consumers. */
  watch(listener: Listener): () => void {
    return this.subscribe(listener);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: VfsEvent): void {
    this.rev += 1;
    for (const listener of this.listeners) listener(event);
  }

  read(path: string): string | undefined {
    return this.files.get(path);
  }

  has(path: string): boolean {
    return this.files.has(path);
  }

  list(): string[] {
    return [...this.files.keys()].sort();
  }

  write(path: string, content: string, origin?: VfsOrigin): boolean {
    const error = pathError(path);
    if (error) throw new Error(`Invalid path "${path}": ${error}`);
    if (this.files.get(path) === content) return false;
    const exists = this.files.has(path);
    this.files.set(path, content);
    this.emit({ type: exists ? "change" : "add", path, origin });
    return true;
  }

  remove(path: string, origin?: VfsOrigin): boolean {
    if (!this.files.has(path)) return false;
    this.files.delete(path);
    this.emit({ type: "unlink", path, origin });
    return true;
  }

  /** Remove + write under the hood, preserving the content. */
  rename(from: string, to: string, origin?: VfsOrigin): void {
    const error = pathError(to) ?? (to === from ? "Rename target must differ" : null);
    if (error) throw new Error(`Cannot rename to "${to}": ${error}`);
    if (this.files.has(to)) throw new Error(`A file already exists at "${to}"`);
    this.write(to, this.read(from) ?? "", origin);
    this.remove(from, origin);
  }

  snapshot(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [path, content] of this.files) out[path] = content;
    return out;
  }

  /** Applies a diff so watcher-driven consumers (models, rebuilds) stay live across hash swaps. */
  hydrate(next: Record<string, string>, origin: VfsOrigin = "hydrate"): void {
    for (const path of this.list()) if (!(path in next)) this.remove(path, origin);
    for (const [path, content] of Object.entries(next)) this.write(path, content, origin);
  }
}

export const vfs = new Vfs();
