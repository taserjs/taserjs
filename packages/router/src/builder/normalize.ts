import type { MiddlewareDefinition } from "../types/units.js";

export function normalizeMiddlewareDefinition(
  definition: MiddlewareDefinition | ((ctx: any, next: any) => any),
): MiddlewareDefinition {
  if (typeof definition === "function") {
    return { handler: definition as any };
  }
  if (typeof (definition as any)?.toUnit === "function") {
    return (definition as any).toUnit();
  }
  return definition;
}
