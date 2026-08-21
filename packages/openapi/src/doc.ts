import type { OpenApiRouteDoc } from "./types.js";

/**
 * Declares OpenAPI documentation metadata for a route file.
 * Use alongside the Route export in a route file:
 *
 * ```ts
 * import { openapi } from "@taserjs/openapi";
 *
 * export const OpenAPI = openapi({
 *   summary: "Fetch user profile",
 *   description: "Returns the authenticated user details",
 *   tags: ["Users"],
 *   operationId: "getUserProfile",
 * });
 *
 * export const Route = t.get("/users/:id").handler(...);
 * ```
 */
export function openapi<const T extends OpenApiRouteDoc>(doc: T): T {
  return doc;
}
