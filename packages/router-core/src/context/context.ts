import { isPromise } from "@taserjs/router-utils";
import type { CookieDefaults } from "../cookies/taser-cookies.js";
import { createTaserCookieJar, type TaserCookieJar } from "../cookies/taser-cookies.js";
import { createTaserHeaders, type TaserHeaders } from "../headers/taser-headers.js";
import type { ContextFactory, HttpMethod, PipelineContext } from "../types.js";

function parseQuery(url: URL): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams.entries()) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
      continue;
    }
    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }
    query[key] = [existing, value];
  }
  return query;
}

export const COOKIE_JAR_KEY = Symbol.for("taser.context.cookies");

export class TaserPipelineContext implements PipelineContext {
  state: Record<string, unknown>;
  params: Record<string, unknown>;
  body: unknown = undefined;
  method: string;
  path: string;
  request: Request;
  var: Record<string, unknown>;

  private _url: URL | undefined;
  private _query: Record<string, string | string[]> | undefined;
  private _headers: TaserHeaders | undefined;
  private _cookies: TaserCookieJar | undefined;
  private readonly _cookieSecret: string | BufferSource | undefined;
  private readonly _cookieDefaults: CookieDefaults | undefined;
  [key: string]: unknown;

  constructor(
    request: Request,
    params: Record<string, unknown>,
    path: string,
    method: string,
    userContext: Record<string, unknown>,
    cookieSecret?: string | BufferSource,
    cookieDefaults?: CookieDefaults,
  ) {
    for (const key in userContext) {
      if (
        key !== "headers" &&
        key !== "cookies" &&
        key !== "url" &&
        key !== "request" &&
        key !== "method" &&
        key !== "path" &&
        key !== "params" &&
        key !== "state" &&
        key !== "body" &&
        key !== "var"
      ) {
        this[key] = userContext[key];
      }
    }
    this.state = {};
    this.params = params;
    this.path = path;
    this.method = method;
    this.request = request;
    this.var = {};
    this._cookieSecret = cookieSecret;
    this._cookieDefaults = cookieDefaults;
  }

  get query(): Record<string, string | string[]> {
    if (this._query === undefined) {
      const urlStr = this.request.url;
      if (urlStr.indexOf("?") === -1) {
        this._query = {};
      } else {
        this._query = parseQuery((this._url ??= new URL(urlStr)));
      }
    }
    return this._query;
  }

  set query(value: Record<string, string | string[]>) {
    this._query = value;
  }

  get headers(): TaserHeaders {
    if (this._headers === undefined) {
      this._headers = createTaserHeaders(this.request.headers);
    }
    return this._headers;
  }

  get cookies(): TaserCookieJar {
    if (this._cookies === undefined) {
      this._cookies = createTaserCookieJar(
        this.request.headers.get("cookie") ?? null,
        this._cookieSecret,
        this._cookieDefaults ?? {},
      );
    }
    return this._cookies;
  }

  get url(): URL {
    if (this._url === undefined) {
      this._url = new URL(this.request.url);
    }
    return this._url;
  }

  [COOKIE_JAR_KEY](): TaserCookieJar | undefined {
    return this._cookies;
  }
}

export function getCookiesFromContext(
  ctx: PipelineContext | undefined,
): TaserCookieJar | undefined {
  if (!ctx) return undefined;
  if (ctx instanceof TaserPipelineContext) {
    return ctx[COOKIE_JAR_KEY]();
  }
  const fn = (ctx as Record<symbol, unknown>)[COOKIE_JAR_KEY];
  return typeof fn === "function" ? (fn as () => TaserCookieJar | undefined).call(ctx) : undefined;
}

export function createBaseContext(
  request: Request,
  params: Record<string, unknown>,
  path: string,
  method: string,
  userContext: Record<string, unknown>,
  cookieSecret?: string | BufferSource,
  cookieDefaults?: CookieDefaults,
): PipelineContext {
  return new TaserPipelineContext(
    request,
    params,
    path,
    method,
    userContext,
    cookieSecret,
    cookieDefaults,
  );
}

function resolveUserContext(
  createContext: ContextFactory,
  request: Request,
): Promise<Record<string, unknown>> | Record<string, unknown> {
  const result = createContext(request);
  if (isPromise(result)) {
    return result as Promise<Record<string, unknown>>;
  }
  return (result ?? {}) as Record<string, unknown>;
}

export function buildPipelineContext(
  request: Request,
  params: Record<string, unknown>,
  path: string,
  method: HttpMethod,
  createContext: ContextFactory,
  cookieSecret?: string | BufferSource,
  cookieDefaults?: import("../cookies/taser-cookies.js").CookieDefaults,
): Promise<PipelineContext> | PipelineContext {
  const rawContext = resolveUserContext(createContext, request);

  if (isPromise(rawContext)) {
    return rawContext.then((userContext) =>
      createBaseContext(request, params, path, method, userContext, cookieSecret, cookieDefaults),
    );
  }

  return createBaseContext(request, params, path, method, rawContext, cookieSecret, cookieDefaults);
}

export function buildNotFoundContext(
  request: Request,
  path: string,
  method: string,
  createContext: ContextFactory,
  cookieSecret?: string | BufferSource,
  cookieDefaults?: import("../cookies/taser-cookies.js").CookieDefaults,
): Promise<PipelineContext> | PipelineContext {
  const rawContext = resolveUserContext(createContext, request);

  if (isPromise(rawContext)) {
    return rawContext.then((userContext) =>
      createBaseContext(request, {}, path, method, userContext, cookieSecret, cookieDefaults),
    );
  }

  return createBaseContext(request, {}, path, method, rawContext, cookieSecret, cookieDefaults);
}
