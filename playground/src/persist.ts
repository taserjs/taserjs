import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";

import { vfs } from "./vfs";

const STATE_VERSION = 1;
const SOFT_LIMIT = 8_000;
const HARD_LIMIT = 32_000;
const MIRROR_KEY = "taser-playground-mirror";

/** Filled in by App so the hash snapshot includes the current active file. */
let activePathProvider: () => string | null = () => null;

export function setActivePathProvider(provider: () => string | null): void {
  activePathProvider = provider;
}

function serialize(files: Record<string, string>, active: string | null): unknown {
  return { v: STATE_VERSION, files, active };
}

function encode(files: Record<string, string>, active: string | null): string {
  return compressToEncodedURIComponent(JSON.stringify(serialize(files, active)));
}

export function decode(
  encoded: string,
): { files: Record<string, string>; active: string | null } | null {
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
    files[path] = content;
  }
  const active =
    typeof state.active === "string" && files[state.active] !== undefined ? state.active : null;
  return { files, active: active ?? Object.keys(files).sort()[0] ?? null };
}

/** True when the last write exceeded the ~8 KB share warning (non-blocking). */
let oversized = false;

export function isOversized(): boolean {
  return oversized;
}

let lastHash = "";

/** Debounced by the caller. replaceState (no history entries, no hashchange noise). */
export function writeHash(): void {
  const encoded = encode(vfs.snapshot(), activePathProvider());
  if (encoded.length > HARD_LIMIT) return; // stop writing; mirror keeps the state readable
  oversized = encoded.length > SOFT_LIMIT;
  const target = `#${encoded}`;
  if (location.hash === target) return;
  lastHash = target;
  history.replaceState(null, "", target);
}

/** Simple localStorage mirror: a fallback restore path for oversized states. */
export function writeMirror(): void {
  try {
    const json = JSON.stringify(serialize(vfs.snapshot(), activePathProvider()));
    if (json.length <= 100_000) localStorage.setItem(MIRROR_KEY, json);
  } catch {
    // storage full / blocked: the hash remains the primary source
  }
}

function decodeMirror(): { files: Record<string, string>; active: string | null } | null {
  try {
    const json = localStorage.getItem(MIRROR_KEY);
    if (!json) return null;
    const state = JSON.parse(json) as { v?: unknown; files?: unknown; active?: unknown };
    if (state.v !== STATE_VERSION || !state.files || typeof state.files !== "object") return null;
    return decode(encode(state.files as Record<string, string>, state.active as string | null));
  } catch {
    return null;
  }
}

/** Initial state: hash, then localStorage mirror, then the starter project. */
export function loadInitial(): { files: Record<string, string>; active: string | null } {
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
export function onExternalHash(
  callback: (state: { files: Record<string, string>; active: string | null } | null) => void,
): () => void {
  const listener = (): void => {
    if (location.hash === lastHash) return;
    callback(decode(location.hash.slice(1)));
  };
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
