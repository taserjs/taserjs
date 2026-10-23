import type { Context } from "hono";
import { generateCookie, generateSignedCookie } from "hono/cookie";
import { parse, parseSigned } from "hono/utils/cookie";
import type { Cookie, CookieOptions, CookiePrefixOptions, SignedCookie } from "hono/utils/cookie";

import type { MiddlewareResponse } from "../types.js";

type CookieSecret = string | BufferSource;

export type CookieJarOptions = CookieOptions & {
  secret?: CookieSecret | undefined;
};

/** The cookie jar handed to route handlers and middleware below `cookie()`. */
export interface TaserCookieJar {
  get(name: string, prefixOptions?: CookiePrefixOptions): string | undefined;
  get(): Cookie;
  getSigned(
    name: string,
    secret?: CookieSecret,
    prefixOptions?: CookiePrefixOptions,
  ): Promise<string | undefined | false>;
  getSigned(secret?: CookieSecret): Promise<SignedCookie>;
  set(name: string, value: string, opt?: CookieOptions): TaserCookieJar;
  setSigned(
    name: string,
    value: string,
    secretOrOpt?: CookieSecret | CookieOptions,
    opt?: CookieOptions,
  ): Promise<TaserCookieJar>;
  delete(name: string, opt?: CookieOptions): string | undefined;
}

/**
 * Per-mount configuration, resolved once when `cookie()` is called so the per-request jar does
 * not re-split options on every request.
 */
export interface CookieJarConfig {
  readonly secret: CookieSecret | undefined;
  readonly writeDefaults: CookieOptions;
}

export function resolveCookieJarConfig(options: CookieJarOptions = {}): CookieJarConfig {
  const { secret, ...writeDefaults } = options;
  return { secret, writeDefaults };
}

const COOKIE_NAME_PREFIXES = { secure: "__Secure-", host: "__Host-" } as const;
const NO_REQUEST_COOKIES: Cookie = Object.freeze(Object.create(null));
/** Immutable-header responses are rebuilt, and these non-standard fields must survive that. */
const RESPONSE_EXPANDO_KEYS = ["_data", "_status"] as const;

function prefixedName(name: string, prefix: CookiePrefixOptions | undefined): string {
  return prefix ? COOKIE_NAME_PREFIXES[prefix] + name : name;
}

function isBufferSource(value: CookieSecret | CookieOptions): value is BufferSource {
  return typeof value === "object" && "byteLength" in value;
}

function appendSetCookies(res: Response, cookies: readonly string[]): Response {
  const append = (target: Response) => {
    for (const cookie of cookies) {
      target.headers.append("set-cookie", cookie);
    }
  };

  try {
    append(res);
    return res;
  } catch (error) {
    // `Response.redirect()` and `fetch()` results have immutable headers. The guard throws on the
    // first append, so nothing has been written yet when we get here.
    if (!(error instanceof TypeError)) throw error;
    const rebuilt = new Response(res.body, res);
    for (const key of RESPONSE_EXPANDO_KEYS) {
      if (key in res) {
        (rebuilt as unknown as Record<string, unknown>)[key] = (
          res as unknown as Record<string, unknown>
        )[key];
      }
    }
    append(rebuilt);
    return rebuilt;
  }
}

/**
 * Reads cookies from the request headers and queues `Set-Cookie` values in a private list that is
 * appended to the outgoing response exactly once. It deliberately never touches a Hono `Context`:
 * reading `c.res` or assigning it forces Hono to build and clone a `Response`.
 */
export class CookieJar implements TaserCookieJar {
  readonly #requestHeaders: Headers;
  readonly #config: CookieJarConfig;
  #requestCookies: Cookie | undefined;
  #pending: string[] = [];

  constructor(requestHeaders: Headers, config: CookieJarConfig) {
    this.#requestHeaders = requestHeaders;
    this.#config = config;
  }

  get(name: string, prefixOptions?: CookiePrefixOptions): string | undefined;
  get(): Cookie;
  get(name?: string, prefixOptions?: CookiePrefixOptions): string | Cookie | undefined {
    const requestCookies = this.#parseRequestCookies();
    if (typeof name === "string") {
      return requestCookies[prefixedName(name, prefixOptions)];
    }
    return Object.assign(Object.create(null), requestCookies) as Cookie;
  }

  async getSigned(
    name: string,
    secret?: CookieSecret,
    prefixOptions?: CookiePrefixOptions,
  ): Promise<string | undefined | false>;
  async getSigned(secret?: CookieSecret): Promise<SignedCookie>;
  async getSigned(
    nameOrSecret?: string | CookieSecret,
    maybeSecret?: CookieSecret,
    prefixOptions?: CookiePrefixOptions,
  ): Promise<string | SignedCookie | undefined | false> {
    const requestCookieHeader = this.#requestHeaders.get("cookie");

    const readsOneCookie =
      typeof nameOrSecret === "string" &&
      (maybeSecret !== undefined || this.#config.secret !== undefined);
    if (readsOneCookie) {
      if (!requestCookieHeader) return undefined;
      const secret = maybeSecret ?? this.#config.secret!;
      const key = prefixedName(nameOrSecret, prefixOptions);
      return (await parseSigned(requestCookieHeader, secret, key))[key];
    }

    const secret = (nameOrSecret as CookieSecret | undefined) ?? this.#config.secret;
    if (!secret) {
      throw new Error("Secret is required to read signed cookies");
    }
    return requestCookieHeader ? await parseSigned(requestCookieHeader, secret) : {};
  }

  set(name: string, value: string, opt?: CookieOptions): this {
    this.#pending.push(generateCookie(name, value, this.#withWriteDefaults(opt)));
    return this;
  }

  async setSigned(
    name: string,
    value: string,
    secretOrOpt?: CookieSecret | CookieOptions,
    opt?: CookieOptions,
  ): Promise<this> {
    let secret: CookieSecret | undefined;
    let options: CookieOptions | undefined;

    if (typeof secretOrOpt === "string" || (secretOrOpt && isBufferSource(secretOrOpt))) {
      secret = secretOrOpt;
      options = opt;
    } else {
      secret = this.#config.secret;
      options = secretOrOpt;
    }

    if (!secret) {
      throw new Error("Secret is required to set signed cookies");
    }

    this.#pending.push(
      await generateSignedCookie(name, value, secret, this.#withWriteDefaults(options)),
    );
    return this;
  }

  delete(name: string, opt?: CookieOptions): string | undefined {
    const options = this.#withWriteDefaults(opt);
    const previousValue = this.get(name, options.prefix);
    this.#pending.push(generateCookie(name, "", { ...options, maxAge: 0 }));
    return previousValue;
  }

  /** Appends queued cookies to `res`. Queued cookies are consumed, so a second flush is a no-op. */
  flush<TRes extends Response | MiddlewareResponse<any, any>>(res: TRes): TRes {
    if (this.#pending.length === 0) return res;
    return appendSetCookies(res as Response, this.#drainPending()) as unknown as TRes;
  }

  /**
   * For thrown (non-`Response`) errors: Hono's default `onError` builds its response from the
   * context, so queued cookies are handed to it there. Only runs on the error path.
   */
  queueOn(honoContext: Context): void {
    for (const cookie of this.#drainPending()) {
      honoContext.header("Set-Cookie", cookie, { append: true });
    }
  }

  #drainPending(): string[] {
    const cookies = this.#pending;
    this.#pending = [];
    return cookies;
  }

  #parseRequestCookies(): Cookie {
    if (this.#requestCookies === undefined) {
      const header = this.#requestHeaders.get("cookie");
      this.#requestCookies = header ? parse(header) : NO_REQUEST_COOKIES;
    }
    return this.#requestCookies;
  }

  #withWriteDefaults(opt: CookieOptions | undefined): CookieOptions {
    return opt ? { ...this.#config.writeDefaults, ...opt } : this.#config.writeDefaults;
  }
}
