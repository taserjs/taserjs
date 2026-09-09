import { Context } from "hono";
import { deleteCookie, getCookie, getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";
import type { Cookie, CookieOptions, CookiePrefixOptions, SignedCookie } from "hono/utils/cookie";
import { mergeResponseCookies } from "@taserjs/utils";
import { middleware } from "./builder.js";
import type { MiddlewareDefinition } from "./types.js";

export type { Cookie, CookieOptions, CookiePrefixOptions, SignedCookie };

export type CookieJarOptions = CookieOptions & {
  secret?: string | BufferSource | undefined;
};

export class TaserCookieJar {
  readonly #c: Context;
  readonly #defaultOptions: CookieJarOptions;

  constructor(c: Context, defaultOptions?: CookieJarOptions) {
    this.#c = c;
    this.#defaultOptions = defaultOptions ?? {};
  }

  get(name: string, prefixOptions?: CookiePrefixOptions): string | undefined;
  get(): Cookie;
  get(name?: string, prefixOptions?: CookiePrefixOptions): string | Cookie | undefined {
    if (typeof name === "string") {
      return getCookie(this.#c, name, prefixOptions);
    }
    return getCookie(this.#c);
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
      return await getSignedCookie(this.#c, secret, nameOrSecret, prefixOptions);
    }

    const secret =
      (nameOrSecret as string | BufferSource | undefined) ?? this.#defaultOptions.secret;
    if (!secret) {
      throw new Error("Secret is required to read signed cookies");
    }
    return await getSignedCookie(this.#c, secret);
  }

  set(name: string, value: string, opt?: CookieOptions): this {
    const mergedOpt = { ...this.#defaultOptions, ...opt };
    setCookie(this.#c, name, value, mergedOpt);
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
    await setSignedCookie(this.#c, name, value, secret, mergedOpt);
    return this;
  }

  delete(name: string, opt?: CookieOptions): string | undefined {
    const mergedOpt = { ...this.#defaultOptions, ...opt };
    return deleteCookie(this.#c, name, mergedOpt);
  }

  getSetCookieHeaders(): string[] {
    void this.#c.res;
    return typeof this.#c.res?.headers?.getSetCookie === "function"
      ? this.#c.res.headers.getSetCookie()
      : [];
  }

  flush(res: Response): Response {
    return mergeResponseCookies(this.#c, res);
  }
}

export function cookie(options?: CookieJarOptions): MiddlewareDefinition {
  return middleware(async ({ req, ctx }, next) => {
    let c = ctx.context as Context | undefined;
    if (!c) {
      c = new Context(req.raw);
      (ctx as Record<string, unknown>).context = c;
    }
    const jar = new TaserCookieJar(c, options);
    const res = await next.provide({ cookies: jar });
    return jar.flush(res);
  });
}
