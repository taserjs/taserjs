import type { CookieOptions, CookiePrefixOptions } from "hono/utils/cookie";
import { parse, parseSigned, serialize, serializeSigned } from "hono/utils/cookie";

export type TaserCookieOptions = CookieOptions;

/** Default serialize options from `createTaserApp({ cookies })` (excludes signing secret). */
export type CookieDefaults = Pick<
  CookieOptions,
  "path" | "httpOnly" | "sameSite" | "secure" | "domain" | "maxAge" | "expires"
>;

const BUILTIN_COOKIE_DEFAULTS: CookieDefaults = {
  path: "/",
  httpOnly: true,
  sameSite: "Lax",
};

export type TaserCookieJar = {
  get(name: string, prefix?: CookiePrefixOptions): string | undefined;
  getAll(): Record<string, string>;
  getSigned(
    name: string,
    secret?: string | BufferSource,
    prefix?: CookiePrefixOptions,
  ): Promise<string | false | undefined>;
  set(name: string, value: string, options?: TaserCookieOptions): void;
  setSigned(
    name: string,
    value: string,
    secret?: string | BufferSource,
    options?: TaserCookieOptions,
  ): Promise<void>;
  delete(name: string, options?: TaserCookieOptions): string | undefined;
  /** Apply accumulated Set-Cookie headers onto a response. */
  applyTo(response: Response): Response;
};

function resolveCookieName(name: string, prefix?: CookiePrefixOptions): string {
  if (prefix === "secure") {
    return `__Secure-${name}`;
  }
  if (prefix === "host") {
    return `__Host-${name}`;
  }
  return name;
}

function requireSecret(
  secret: string | BufferSource | undefined,
  method: string,
): string | BufferSource {
  if (secret === undefined) {
    throw new Error(
      `cookies.${method} requires a secret. Pass one as an argument or set createTaserApp({ cookies: { secret } }).`,
    );
  }
  return secret;
}

function buildSerializeOptions(
  options: TaserCookieOptions = {},
  appDefaults: CookieDefaults = {},
): CookieOptions {
  const baseline: CookieOptions = { ...BUILTIN_COOKIE_DEFAULTS, ...appDefaults };
  const { prefix, domain, ...callRest } = options;

  if (prefix === "host") {
    return { ...baseline, ...callRest, path: "/", secure: true };
  }
  if (prefix === "secure") {
    return {
      ...baseline,
      ...callRest,
      path: "/",
      secure: true,
      ...(domain !== undefined ? { domain } : {}),
    };
  }
  return { ...baseline, ...options };
}

export type CookieRuntimeConfig = {
  secret?: string | BufferSource;
  path?: string;
  httpOnly?: boolean;
  sameSite?: CookieOptions["sameSite"];
  secure?: boolean;
  domain?: string;
  maxAge?: number;
  expires?: Date;
};

export function splitCookieRuntimeConfig(config?: CookieRuntimeConfig): {
  secret?: string | BufferSource;
  defaults: CookieDefaults;
} {
  if (!config) {
    return { defaults: {} };
  }
  const { secret, ...defaults } = config;
  return { ...(secret !== undefined ? { secret } : {}), defaults: defaults as CookieDefaults };
}

export function createTaserCookieJar(
  cookieHeader: string | null,
  defaultSecret?: string | BufferSource,
  cookieDefaults: CookieDefaults = {},
): TaserCookieJar {
  const pending: string[] = [];
  const parsed = cookieHeader ? parse(cookieHeader) : {};

  return {
    get(name, prefix) {
      const key = resolveCookieName(name, prefix);
      return parsed[key];
    },
    getAll() {
      return { ...parsed };
    },
    async getSigned(name, secret, prefix) {
      if (!cookieHeader) {
        return undefined;
      }
      const key = resolveCookieName(name, prefix);
      const resolved = requireSecret(secret ?? defaultSecret, "getSigned");
      const signed = await parseSigned(cookieHeader, resolved, key);
      return signed[key];
    },
    set(name, value, options = {}) {
      const finalName = resolveCookieName(name, options.prefix);
      pending.push(serialize(finalName, value, buildSerializeOptions(options, cookieDefaults)));
    },
    async setSigned(name, value, secret, options = {}) {
      const resolved = requireSecret(secret ?? defaultSecret, "setSigned");
      const finalName = resolveCookieName(name, options.prefix);
      pending.push(
        await serializeSigned(
          finalName,
          value,
          resolved,
          buildSerializeOptions(options, cookieDefaults),
        ),
      );
    },
    delete(name, options = {}) {
      const key = resolveCookieName(name, options.prefix);
      const previous = parsed[key];
      this.set(name, "", { ...options, maxAge: 0 });
      return previous;
    },
    applyTo(response) {
      if (pending.length === 0) {
        return response;
      }
      const headers = new Headers(response.headers);
      for (const cookie of pending) {
        headers.append("Set-Cookie", cookie);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
  };
}
