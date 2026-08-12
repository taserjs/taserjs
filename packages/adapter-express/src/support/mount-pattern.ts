/**
 * Normalize Express-specific mount syntax to the universal pattern consumed by router-utils.
 *
 * Express accepts variants like `/{*splat}`, `/api/{*splat}`, and `/*splat` that are not
 * valid universal patterns. Other adapters pass `/*` or `/prefix/*` directly to
 * `resolveMountBase` without this step.
 *
 * Invalid patterns are still rejected by `resolveMountBase` in router-utils after normalization.
 */
export function toUniversalMountPattern(expressPattern: string): string {
  return expressPattern
    .replace(/\{\/\*(\w*)\}/, '/*')
    .replace(/\/\{\*[^}]+\}$/, '/*')
    .replace(/\/\*(\w+)$/, '/*')
}
