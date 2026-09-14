/**
 * Shared environment and runtime detection helpers.
 */

declare const process: { env?: Record<string, string | undefined> } | undefined;

/**
 * Checks whether the current runtime environment is production.
 * Safe across Node.js, WinterCG (Cloudflare Workers, Deno, Bun), and browser runtimes.
 */
export function isProduction(): boolean {
  if (typeof process !== "undefined" && process?.env?.NODE_ENV === "production") {
    return true;
  }
  return false;
}
