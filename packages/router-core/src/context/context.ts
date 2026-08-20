import { createTaserCookieJar, type TaserCookieJar } from "../cookies/taser-cookies.js";
import { createTaserHeaders } from "../headers/taser-headers.js";
import type { ContextFactory, HttpMethod, PipelineContext } from "../types.js";
import { requestScope } from "./request-scope.js";

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

export async function buildPipelineContext(
  request: Request,
  params: Record<string, unknown>,
  path: string,
  method: HttpMethod,
  createContext: ContextFactory,
  cookieSecret?: string | BufferSource,
  cookieDefaults?: import("../cookies/taser-cookies.js").CookieDefaults,
): Promise<{ ctx: PipelineContext; cookies: TaserCookieJar }> {
  const scope = requestScope.getStore();
  const native = scope?.native;
  const hono = scope?.hono;
  const userContext = await createContext({ native });
  const cookies = createTaserCookieJar(
    request.headers.get("cookie") ?? null,
    cookieSecret,
    cookieDefaults ?? {},
  );

  let _url: URL | undefined;
  let _query: Record<string, string | string[]> | undefined;

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
    params: { ...params },
    body: undefined,
    headers: createTaserHeaders(request.headers),
    cookies,
    method,
    path,
    get url() {
      if (_url === undefined) {
        _url = new URL(request.url);
      }
      return _url;
    },
    request,
    native,
    hono,
    var: {},
  };

  return { ctx, cookies };
}

export async function buildNotFoundContext(
  request: Request,
  path: string,
  method: string,
  createContext: ContextFactory,
  cookies: TaserCookieJar,
): Promise<PipelineContext> {
  const scope = requestScope.getStore();
  const native = scope?.native;
  const hono = scope?.hono;
  const userContext = await createContext({ native });

  let _url: URL | undefined;
  let _query: Record<string, string | string[]> | undefined;

  return {
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
    params: {},
    body: undefined,
    headers: createTaserHeaders(request.headers),
    cookies,
    method,
    path,
    get url() {
      if (_url === undefined) {
        _url = new URL(request.url);
      }
      return _url;
    },
    request,
    native,
    hono,
    var: {},
  };
}
