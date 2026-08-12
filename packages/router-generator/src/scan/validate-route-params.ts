const VALID_PARAM_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/

type ExtractedParam = {
  paramName: string
  isValid: boolean
}

function extractParamsFromSegment(segment: string): ExtractedParam[] {
  const params: ExtractedParam[] = []

  if (!segment || !segment.includes('$')) {
    return params
  }

  if (segment === '$' || segment === '{$}') {
    return params
  }

  if (segment.startsWith('$') && !segment.includes('{')) {
    const paramName = segment.slice(1)
    if (paramName) {
      params.push({
        paramName,
        isValid: VALID_PARAM_NAME_REGEX.test(paramName),
      })
    }
    return params
  }

  const bracePattern = /\{(-?\$)([^}]*)\}/g
  let match: RegExpExecArray | null

  while ((match = bracePattern.exec(segment)) !== null) {
    const paramName = match[2]!
    if (!paramName) {
      continue
    }

    params.push({
      paramName,
      isValid: VALID_PARAM_NAME_REGEX.test(paramName),
    })
  }

  return params
}

/**
 * Extract `$param` names from a route **filename** (e.g. `todo/$id.get.ts`).
 * Emitted URL paths use Hono syntax (`:id` / `*`) and are not used for validation.
 */
function extractParamsFromFilename(filePath: string): ExtractedParam[] {
  if (!filePath || !filePath.includes('$')) {
    return []
  }

  const allParams: ExtractedParam[] = []
  for (const segment of filePath.replace(/\\/g, '/').split('/')) {
    // Strip verb + extension from last segment: `$id.get.ts` → `$id`
    const basename = segment.replace(/\.(get|post|put|patch|delete|options|head|any|all)\.ts$/i, '')
    allParams.push(...extractParamsFromSegment(basename))
  }

  return allParams
}

export function collectInvalidRouteParams(
  filePath: string,
): Array<{ paramName: string, filePath: string }> {
  const invalid: Array<{ paramName: string, filePath: string }> = []

  for (const param of extractParamsFromFilename(filePath)) {
    if (!param.isValid) {
      invalid.push({ paramName: param.paramName, filePath })
    }
  }

  return invalid
}

export function formatInvalidParamMessage(
  paramName: string,
  filePath: string,
): string {
  return `Invalid param name "${paramName}" in route file "${filePath}". `
    + 'Param names must be valid JavaScript identifiers (match /[a-zA-Z_$][a-zA-Z0-9_$]*/).'
}
