import { isPromise } from "@taserjs/router-utils";
import { createTaserCookieJar, type TaserCookieJar } from "../cookies/taser-cookies.js";
import { createTaserHeaders } from "../headers/taser-headers.js";
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

export function getCookiesFromContext(
  ctx: PipelineContext | undefined,
): TaserCookieJar | undefined {
  return ctx
    ? (
        (ctx as Record<symbol, unknown>)[COOKIE_JAR_KEY] as
          | (() => TaserCookieJar | undefined)
          | undefined
      )?.()
    : undefined;
}

export function createBaseContext(
  request: Request,
  params: Record<string, unknown>,
  path: string,
  method: string,
  userContext: Record<string, unknown>,
  cookieSecret?: string | BufferSource,
  cookieDefaults?: import("../cookies/taser-cookies.js").CookieDefaults,
): PipelineContext {
  let _url: URL | undefined;
  let _query: Record<string, string | string[]> | undefined;
  let _headers: import("../headers/taser-headers.js").TaserHeaders | undefined;
  let _cookies: TaserCookieJar | undefined;

  const ctx: PipelineContext = {
    ...userContext,
    state: {},
    get query() {
      if (_query === undefined) {
        _query = parseQuery((_url ??= new URL(request.url)));
      }
      return _query;
    },
    set query(value: Record<string, string | string[]>) {
      _query = value;
    },
    params,
    body: undefined,
    get headers() {
      if (_headers === undefined) {
        _headers = createTaserHeaders(request.headers);
      }
      return _headers;
    },
    get cookies() {
      if (_cookies === undefined) {
        _cookies = createTaserCookieJar(
          request.headers.get("cookie") ?? null,
          cookieSecret,
          cookieDefaults ?? {},
        );
      }
      return _cookies;
    },
    method,
    path,
    get url() {
      if (_url === undefined) {
        _url = new URL(request.url);
      }
      return _url;
    },
    request,
    var: {},
    [COOKIE_JAR_KEY]: () => _cookies,
  };

  return ctx;
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
