import type { Context } from "hono";
import type { Cookie, CookieOptions, CookiePrefixOptions, SignedCookie } from "hono/utils/cookie";

import { middleware } from "../builder.js";
import type { MiddlewareDefinition } from "../types.js";
import {
  CookieJar,
  resolveCookieJarConfig,
  type CookieJarOptions,
  type TaserCookieJar,
} from "./cookie-jar.js";

export type {
  Cookie,
  CookieJarOptions,
  CookieOptions,
  CookiePrefixOptions,
  SignedCookie,
  TaserCookieJar,
};

/**
 * Provides `{ cookies }` to everything below it. Cookies set through the jar are written to the
 * response when the middleware unwinds, including a thrown `Response`. For a thrown `Error` they
 * are handed to Hono's default `onError`; a custom `onError` owns its own cookies.
 */
export function cookie(
  options?: CookieJarOptions,
): MiddlewareDefinition<{ cookies: TaserCookieJar }> {
  const config = resolveCookieJarConfig(options);

  return middleware(async ({ req, ctx }, next) => {
    const jar = new CookieJar(req.raw.headers, config);
    const response = await next
      .provide({ cookies: jar })
      .catch((error: unknown) => rethrowWithCookies(jar, error, ctx as Record<string, unknown>));
    return jar.flush(response);
  });
}

function rethrowWithCookies(jar: CookieJar, error: unknown, ctx: Record<string, unknown>): never {
  if (error instanceof Response) {
    throw jar.flush(error);
  }
  const honoContext = ctx.context as Context | undefined;
  if (honoContext) {
    jar.queueOn(honoContext);
  }
  throw error;
}
