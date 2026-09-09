import type { Context } from "hono";
import {
  generateCookie,
  generateSignedCookie,
  getCookie,
  getSignedCookie,
} from "hono/cookie";
import type { CookieOptions, CookiePrefixOptions, Cookie, SignedCookie } from "hono/utils/cookie";
import { middleware } from "./builder.js";
import type { MiddlewareDefinition, TaserHeaders, TaserRequest } from "./types.js";

export type { CookieOptions, CookiePrefixOptions, Cookie, SignedCookie };

export type CookieJarOptions = CookieOptions & {
  secret?: string | BufferSource | undefined;
};

export function attachSetCookies(res: Response, cookies: readonly string[]): Response {
  if (cookies.length === 0) return res;

  try {
    for (const cookie of cookies) {
      res.headers.append("set-cookie", cookie);
    }
    return res;
  } catch {
    const newHeaders = new Headers(res.headers);
    for (const cookie of cookies) {
      newHeaders.append("set-cookie", cookie);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  }
}

function toPrefixedKey(name: string, prefix?: CookiePrefixOptions): string {
  if (prefix === "secure") {
    return "__Secure-" + name;
  }
  if (prefix === "host") {
    return "__Host-" + name;
  }
  return name;
}

function extractCookieHeader(
  source?: Context | TaserRequest | Request | { headers: Headers | TaserHeaders },
): string | null {
  if (!source) return null;

  if ("req" in source && source.req?.raw?.headers?.get) {
    return source.req.raw.headers.get("cookie") ?? source.req.raw.headers.get("Cookie");
  }

  if ("headers" in source && typeof source.headers?.get === "function") {
    return source.headers.get("cookie") ?? source.headers.get("Cookie");
  }

  return null;
}

function toContextLike(
  source?: Context | TaserRequest | Request | { headers: Headers | TaserHeaders },
): Context {
  if (source && "req" in source && source.req?.raw?.headers) {
    return source as Context;
  }

  const cookieHeader = extractCookieHeader(source);
  return {
    req: {
      raw: {
        headers: {
          get(name: string) {
            if (name.toLowerCase() === "cookie") {
              return cookieHeader;
            }
            return null;
          },
        },
      },
    },
  } as unknown as Context;
}

export class TaserCookieJar {
  readonly #cookieSource: Context;
  readonly #defaultOptions: CookieJarOptions;
  readonly #buffer = new Map<string, string>();
  readonly #mutations = new Map<string, string | undefined>();

  constructor(
    source?: Context | TaserRequest | Request | { headers: Headers | TaserHeaders },
    defaultOptions?: CookieJarOptions,
  ) {
    this.#defaultOptions = defaultOptions ?? {};
    this.#cookieSource = toContextLike(source);
  }

  get(name: string, prefixOptions?: CookiePrefixOptions): string | undefined;
  get(): Cookie;
  get(name?: string, prefixOptions?: CookiePrefixOptions): string | Cookie | undefined {
    if (typeof name === "string") {
      const finalKey = toPrefixedKey(name, prefixOptions);

      if (this.#mutations.has(finalKey)) {
        return this.#mutations.get(finalKey);
      }

      return getCookie(this.#cookieSource, name, prefixOptions);
    }

    const original = getCookie(this.#cookieSource);
    const result: Cookie = { ...original };
    for (const [key, value] of this.#mutations.entries()) {
      if (value === undefined) {
        delete result[key];
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  async getSigned(
    name: string,
    secret?: string | BufferSource,
    prefixOptions?: CookiePrefixOptions,
  ): Promise<string | undefined | false>;
  async getSigned(secret?: string | BufferSource): Promise<SignedCookie>;
  async getSigned(
    nameOrSecret?: string | BufferSource,
    maybeSecret?: string | BufferSource,
    prefixOptions?: CookiePrefixOptions,
  ): Promise<string | SignedCookie | undefined | false> {
    if (
      typeof nameOrSecret === "string" &&
      (maybeSecret !== undefined || this.#defaultOptions.secret !== undefined)
    ) {
      const secret = maybeSecret ?? this.#defaultOptions.secret!;
      return await getSignedCookie(this.#cookieSource, secret, nameOrSecret, prefixOptions);
    }

    const secret =
      (nameOrSecret as string | BufferSource | undefined) ?? this.#defaultOptions.secret;
    if (!secret) {
      throw new Error("Secret is required to read signed cookies");
    }
    return await getSignedCookie(this.#cookieSource, secret);
  }

  set(name: string, value: string, opt?: CookieOptions): this {
    const mergedOpt = { ...this.#defaultOptions, ...opt };
    const serialized = generateCookie(name, value, mergedOpt);
    const finalKey = toPrefixedKey(name, mergedOpt.prefix);
    this.#mutations.set(finalKey, value);
    this.#buffer.set(finalKey, serialized);
    return this;
  }

  async setSigned(
    name: string,
    value: string,
    secretOrOpt?: string | BufferSource | CookieOptions,
    opt?: CookieOptions,
  ): Promise<this> {
    let secret: string | BufferSource;
    let options: CookieOptions | undefined;

    if (typeof secretOrOpt === "string" || (secretOrOpt && "byteLength" in secretOrOpt)) {
      secret = secretOrOpt;
      options = opt;
    } else {
      secret = this.#defaultOptions.secret!;
      options = secretOrOpt;
    }

    if (!secret) {
      throw new Error("Secret is required to set signed cookies");
    }

    const mergedOpt = { ...this.#defaultOptions, ...options };
    const serialized = await generateSignedCookie(name, value, secret, mergedOpt);
    const finalKey = toPrefixedKey(name, mergedOpt.prefix);
    this.#mutations.set(finalKey, value);
    this.#buffer.set(finalKey, serialized);
    return this;
  }

  delete(name: string, opt?: CookieOptions): this {
    const mergedOpt = { ...this.#defaultOptions, ...opt, maxAge: 0 };
    const serialized = generateCookie(name, "", mergedOpt);
    const finalKey = toPrefixedKey(name, mergedOpt.prefix);
    this.#mutations.set(finalKey, undefined);
    this.#buffer.set(finalKey, serialized);
    return this;
  }

  getSetCookieHeaders(): string[] {
    return Array.from(this.#buffer.values());
  }

  flush(res: Response): Response {
    if (this.#buffer.size === 0) return res;
    const cookies = Array.from(this.#buffer.values());
    this.#buffer.clear();
    return attachSetCookies(res, cookies);
  }
}

export function cookie(options?: CookieJarOptions): MiddlewareDefinition {
  return middleware(async ({ req, ctx }, next) => {
    const cookieSource = (ctx.context as Context | undefined) ?? req;
    const jar = new TaserCookieJar(cookieSource, options);
    const res = await next.provide({ cookies: jar });
    return jar.flush(res);
  });
}
