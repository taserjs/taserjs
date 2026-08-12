import { basename } from 'node:path'

import type { ResolvedGeneratorConfig } from '../config/schema.js'
import { ScanError } from '../support/errors.js'

const VIRTUAL_CONFIG_PATTERN = /^__virtual\.[mc]?[jt]s$/
const MAX_IGNORE_PATTERN_LENGTH = 200

export function compileRouteFileIgnorePattern(pattern: string): RegExp {
  if (pattern.length > MAX_IGNORE_PATTERN_LENGTH) {
    throw new ScanError(
      `ignorePattern exceeds maximum length of ${MAX_IGNORE_PATTERN_LENGTH} characters`,
    )
  }

  try {
    return new RegExp(`^(?:${pattern})$`)
  }
  catch {
    throw new ScanError('Invalid ignorePattern regular expression')
  }
}

export function shouldIgnoreRouteFile(
  fileName: string,
  config: Pick<ResolvedGeneratorConfig, 'ignorePrefix' | 'ignorePattern'>,
): boolean {
  if (fileName.startsWith('.')) {
    return true
  }

  if (VIRTUAL_CONFIG_PATTERN.test(fileName)) {
    return true
  }

  if (config.ignorePrefix && fileName.startsWith(config.ignorePrefix)) {
    return true
  }

  if (config.ignorePattern) {
    const pattern = compileRouteFileIgnorePattern(config.ignorePattern)
    if (pattern.test(fileName)) {
      return true
    }
  }

  return false
}

export function assertPhysicalRouteFile(rawRel: string): void {
  const fileName = basename(rawRel)
  if (VIRTUAL_CONFIG_PATTERN.test(fileName)) {
    throw new ScanError(
      'Virtual route config files are not supported. Taser uses filesystem routes only.',
      rawRel,
    )
  }
}
