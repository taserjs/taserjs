import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

import { isHiddenPath, vfs } from "./vfs";

const STATE_VERSION = 1;
const SOFT_LIMIT = 8_000;
const HARD_LIMIT = 32_000;
const MIRROR_KEY = "taser-playground-mirror";

export interface PersistedState {
  files: Record<string, string>;
  active: string | null;
}

/** Filled in by App so the hash snapshot includes the current active file. */
let activePathProvider: () => string | null = () => null;

export function setActivePathProvider(provider: () => string | null): void {
  activePathProvider = provider;
}

function serialize(files: Record<string, string>, active: string | null): unknown {
  return { v: STATE_VERSION, files, active };
}

export function encodeState(files: Record<string, string>, active: string | null): string {
  return compressToEncodedURIComponent(JSON.stringify(serialize(files, active)));
}

export function decode(encoded: string): PersistedState | null {
  if (!encoded) return null;
  let data: unknown;
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const state = data as { v?: unknown; files?: unknown; active?: unknown };
  if (state.v !== STATE_VERSION || !state.files || typeof state.files !== "object") return null;

  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(state.files)) {
    if (typeof content !== "string") return null;
    if (!isHiddenPath(path)) files[path] = content;
  }

  const active =
    typeof state.active === "string" &&
    !isHiddenPath(state.active) &&
    files[state.active] !== undefined
      ? state.active
      : null;

  return { files, active: active ?? Object.keys(files).sort()[0] ?? null };
}

/** True when the last write exceeded the ~8 KB share warning (non-blocking). */
let oversized = false;
const oversizedListeners = new Set<(value: boolean) => void>();

function setOversized(next: boolean): void {
  if (oversized === next) return;
  oversized = next;
  for (const listener of oversizedListeners) listener(oversized);
}

export function isOversized(): boolean {
  return oversized;
}

export function subscribeOversized(listener: (value: boolean) => void): () => void {
  oversizedListeners.add(listener);
  return () => {
    oversizedListeners.delete(listener);
  };
}

let lastHash = "";

/** Debounced by the caller. replaceState (no history entries, no hashchange noise). */
export function writeHash(): void {
  const active = activePathProvider();
  const safeActive = active && !isHiddenPath(active) ? active : null;
  const encoded = encodeState(vfs.userSnapshot(), safeActive);
  if (encoded.length > HARD_LIMIT) {
    setOversized(true);
    return; // stop writing; mirror keeps the state readable
  }
  setOversized(encoded.length > SOFT_LIMIT);
  const target = `#${encoded}`;
  if (location.hash === target) return;
  lastHash = target;
  history.replaceState(null, "", target);
}

/** Simple localStorage mirror: a fallback restore path for oversized states. */
export function writeMirror(): void {
  try {
    const active = activePathProvider();
    const safeActive = active && !isHiddenPath(active) ? active : null;
    const json = JSON.stringify(serialize(vfs.userSnapshot(), safeActive));
    if (json.length <= 100_000) localStorage.setItem(MIRROR_KEY, json);
  } catch {
    // storage full / blocked: the hash remains the primary source
  }
}

function decodeMirror(): PersistedState | null {
  try {
    const json = localStorage.getItem(MIRROR_KEY);
    if (!json) return null;
    const state = JSON.parse(json) as { v?: unknown; files?: unknown; active?: unknown };
    if (state.v !== STATE_VERSION || !state.files || typeof state.files !== "object") return null;
    return decode(
      encodeState(state.files as Record<string, string>, state.active as string | null),
    );
  } catch {
    return null;
  }
}

/** Initial state: hash, then localStorage mirror, then the starter project. */
export function loadInitial(): PersistedState {
  return (
    decode(location.hash.slice(1)) ??
    decodeMirror() ?? {
      files: {},
      active: null,
    }
  );
}

/**
 * Hash-driven rehydration. `null` means the hash is corrupt/foreign: the app
 * treats it as "keep the current project and rewrite the hash" (see App).
 */
export function onExternalHash(callback: (state: PersistedState | null) => void): () => void {
  const listener = (): void => {
    if (location.hash === lastHash) return;
    callback(decode(location.hash.slice(1)));
  };
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
