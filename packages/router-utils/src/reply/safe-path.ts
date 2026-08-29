import { resolve, sep } from "node:path";

function isInsideRoot(resolvedPath: string, rootPath: string): boolean {
  const root = resolve(rootPath);
  const resolved = resolve(resolvedPath);
  const prefix = root.endsWith(sep) ? root : root + sep;
  return resolved === root || resolved.startsWith(prefix);
}

function isAbsolutePath(filePath: string): boolean {
  return filePath.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(filePath);
}

/**
 * Resolve a file path for `reply.file()`, rejecting traversal outside `root`.
 * Relative paths require `root`; absolute paths are returned as-is when no root is set.
 */
export function resolveSafeFilePath(filePath: string, root?: string): string {
  if (filePath.includes("\0") || filePath.includes("..")) {
    throw new Error("Invalid file path");
  }

  if (!isAbsolutePath(filePath) && !root) {
    throw new Error("reply.file() requires init.root for relative paths");
  }

  const resolved = root ? resolve(root, filePath) : resolve(filePath);
  if (root && !isInsideRoot(resolved, root)) {
    throw new Error("File path escapes root directory");
  }

  return resolved;
}
