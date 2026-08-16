/**
 * Hono's `/*` wildcard matches but does not capture into `param()`.
 * Register splat routes as `/:_splat{.+}` so the remainder is available.
 */
export function toHonoRegisterPath(manifestPath: string): string {
  if (manifestPath === "/*") {
    return "/:_splat{.+}";
  }
  if (manifestPath.endsWith("/*")) {
    return `${manifestPath.slice(0, -2)}/:_splat{.+}`;
  }
  return manifestPath;
}
