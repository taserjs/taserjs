import type { OpenApiRouteDoc } from "./types.js";

/**
 * Declares OpenAPI documentation metadata for a route or middleware.
 * Use inside `.meta({ openapi: doc({ ... }) })`:
 *
 * ```ts
 * import { doc } from "@taserjs/openapi";
 *
 * export const Route = t
 *   .get("/users/:id")
 *   .meta({
 *     openapi: doc({
 *       summary: "Fetch user profile",
 *       description: "Returns the authenticated user details",
 *       tags: ["Users"],
 *       operationId: "getUserProfile",
 *     }),
 *   })
 *   .handler(...);
 * ```
 */
export function doc<const T extends OpenApiRouteDoc>(docData: T): T {
  return docData;
}

export const openapi = doc;
