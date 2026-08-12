import { resolve, sep } from 'node:path'

function isInsideRoot(resolvedPath: string, rootPath: string): boolean {
  const root = resolve(rootPath)
  const resolved = resolve(resolvedPath)
  return resolved === root || resolved.startsWith(root + sep)
}

function isAbsolutePath(filePath: string): boolean {
  return filePath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(filePath)
}

/**
 * Resolve a file path for `reply.file()`, rejecting traversal outside `root`.
 * Relative paths require `root`; absolute paths are returned as-is when no root is set.
 */
export function resolveSafeFilePath(filePath: string, root?: string): string {
  if (filePath.includes('\0') || filePath.includes('..')) {
    throw new Error('Invalid file path')
  }

  if (!isAbsolutePath(filePath)) {
    if (!root) {
      throw new Error('reply.file() requires init.root for relative paths')
    }
    const resolved = resolve(root, filePath)
    if (!isInsideRoot(resolved, root)) {
      throw new Error('File path escapes root directory')
    }
    return resolved
  }

  return filePath
}
