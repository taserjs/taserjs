import type { CapabilitiesCatalog, ScaffoldResult } from './types.js'

export function printCapabilitiesCatalog(catalog: CapabilitiesCatalog): void {
  console.log(JSON.stringify(catalog, null, 2))
}

export function printScaffoldResult(result: ScaffoldResult): void {
  console.log(JSON.stringify(result, null, 2))
}

export function printJsonError(message: string): void {
  console.error(JSON.stringify({ error: message }))
}
