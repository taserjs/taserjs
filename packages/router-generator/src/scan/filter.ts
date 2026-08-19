import { basename } from "node:path";

import { DEFAULT_ROUTE_FILE_IGNORE_PREFIX } from "../constants.js";
import { ScanError } from "../support/errors.js";

const VIRTUAL_CONFIG_PATTERN = /^__virtual\.[mc]?[jt]s$/;
const MAX_IGNORE_PATTERN_LENGTH = 200;

export function compileRouteFileIgnorePattern(pattern: string): RegExp {
  if (pattern.length > MAX_IGNORE_PATTERN_LENGTH) {
    throw new ScanError(
      `ignorePattern exceeds maximum length of ${MAX_IGNORE_PATTERN_LENGTH} characters`,
    );
  }

  try {
    return new RegExp(`^(?:${pattern})$`);
  } catch {
    throw new ScanError("Invalid ignorePattern regular expression");
  }
}

export type RouteIgnoreConfig = {
  ignorePrefix?: string | undefined;
  ignorePattern?: string | undefined;
};

export function shouldIgnoreRouteFile(fileName: string, config?: RouteIgnoreConfig): boolean {
  if (fileName.startsWith(".")) {
    return true;
  }

  if (VIRTUAL_CONFIG_PATTERN.test(fileName)) {
    return true;
  }

  const ignorePrefix = config
    ? (config.ignorePrefix ?? DEFAULT_ROUTE_FILE_IGNORE_PREFIX)
    : DEFAULT_ROUTE_FILE_IGNORE_PREFIX;
  if (ignorePrefix && fileName.startsWith(ignorePrefix)) {
    return true;
  }

  if (config?.ignorePattern) {
    const pattern = compileRouteFileIgnorePattern(config.ignorePattern);
    if (pattern.test(fileName)) {
      return true;
    }
  }

  return false;
}

export function shouldIgnoreRoutePath(relPath: string, config?: RouteIgnoreConfig): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  for (const segment of segments) {
    if (!segment) {
      continue;
    }
    if (shouldIgnoreRouteFile(segment, config)) {
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
