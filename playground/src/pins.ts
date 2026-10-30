/**
 * Bare imports allowed in user code, pinned to exact versions on esm.sh.
 * Unknown bare imports are rejected at bundle time by design.
 */
const VERSIONS = {
  "@taserjs/runtime": "0.3.0",
  "@taserjs/router": "0.3.0",
  "@taserjs/client": "0.3.0",
  "@taserjs/utils": "0.3.0",
  zod: "4.6.7",
} as const;

const ESM_SH = "https://esm.sh";

/** Resolves a bare specifier to its pinned esm.sh URL, or null when unpinned. */
export function resolvePin(specifier: string): string | null {
  if (specifier in VERSIONS) return `${ESM_SH}/${specifier}@${VERSIONS[specifier as keyof typeof VERSIONS]}`;
  for (const base of Object.keys(VERSIONS)) {
    if (specifier.startsWith(`${base}/`)) {
      const subpath = specifier.slice(base.length + 1);
      return `${ESM_SH}/${base}@${VERSIONS[base as keyof typeof VERSIONS]}/${subpath}`;
    }
  }
  return null;
}

export const PIN_NAMES = Object.keys(VERSIONS);
