/**
 * Converts manifest wildcard routes to Hono RegExpRouter capturing format.
 * `/*` -> `/:_splat{.+}` and `/files/*` -> `/files/:_splat{.+}`, preserving the
 * `{ _splat }` param contract of the generated router/client types.
 */
export function toHonoRoutePath(manifestPath: string): string {
  if (manifestPath === "/*") {
    return "/:_splat{.+}";
  }
  if (manifestPath.endsWith("/*")) {
    return `${manifestPath.slice(0, -2)}/:_splat{.+}`;
  }
  return manifestPath;
}
