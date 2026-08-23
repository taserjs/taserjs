import { basename } from "node:path";
import picomatch from "picomatch";
import { DEFAULT_IGNORE } from "../constants.js";
import { ScanError } from "../support/errors.js";
import { toPosixPath } from "../support/paths.js";

const VIRTUAL_CONFIG_PATTERN = /^__virtual\.[mc]?[jt]s$/;

const matcherCache = new Map<string, (test: string) => boolean>();

function getMatcher(patterns: readonly string[]): (test: string) => boolean {
  const key = patterns.join("::");
  let matcher = matcherCache.get(key);
  if (!matcher) {
    matcher = picomatch(patterns as string[], { dot: true });
    matcherCache.set(key, matcher);
  }
  return matcher;
}

export function shouldIgnoreRoutePath(
  relPath: string,
  ignorePatterns?: readonly string[],
): boolean {
  const normalized = toPosixPath(relPath).replace(/^\/+/, "");
  const segments = normalized.split("/");

  for (const segment of segments) {
    if (!segment) continue;
    if (segment.startsWith(".")) return true;
    if (VIRTUAL_CONFIG_PATTERN.test(segment)) return true;
  }

  const patterns = ignorePatterns && ignorePatterns.length > 0 ? ignorePatterns : DEFAULT_IGNORE;
  const isMatch = getMatcher(patterns);

  if (isMatch(normalized)) {
    return true;
  }

  // Also check individual segments and subpaths
  let currentPath = "";
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (isMatch(segment) || isMatch(currentPath)) {
      return true;
    }
  }

  return false;
}

export function assertPhysicalRouteFile(rawRel: string): void {
  const fileName = basename(rawRel);
  if (VIRTUAL_CONFIG_PATTERN.test(fileName)) {
    throw new ScanError(
      "Virtual route config files are not supported. Taser uses filesystem routes only.",
      rawRel,
    );
  }
}
