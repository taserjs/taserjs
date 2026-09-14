import { secureHeaders as honoSecureHeaders, NONCE } from "hono/secure-headers";
import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type SecureHeadersOptions = Parameters<typeof honoSecureHeaders>[0];

export function secureHeaders(options?: SecureHeadersOptions): MiddlewareDefinition {
  return hono(honoSecureHeaders(options));
}

export { NONCE };
