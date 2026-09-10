import type { Context } from "hono";
import type { TaserHeaders, TaserRequest } from "./types.js";

export function createTaserHeaders(c: Context): TaserHeaders {
  return c.req.raw.headers as unknown as TaserHeaders;
}

const EMPTY_PARAMS: Record<string, string> = Object.freeze({});
const EMPTY_QUERY: Record<string, string | string[]> = Object.freeze({});

function parseQuery(c: Context): Record<string, string | string[]> {
  const url = c.req.url;
  if (!url || !url.includes("?")) {
    return EMPTY_QUERY;
  }
  let rawQueries: Record<string, string[]> | undefined;
  // Hono can throw when queries() is called on unmatched or synthetic requests (e.g. notFound)
  try {
    rawQueries = c.req.queries();
  } catch {
    rawQueries = undefined;
  }

  if (!rawQueries) {
    return EMPTY_QUERY;
  }

  const query: Record<string, string | string[]> = {};

  for (const [key, values] of Object.entries(rawQueries)) {
    if (values.length === 1) {
      query[key] = values[0]!;
    } else if (values.length > 1) {
      query[key] = values;
    }
  }
  return query;
}

class TaserRequestImpl implements TaserRequest {
  #c: Context;
  #parsedQuery: Record<string, string | string[]> | undefined;
  #headersCache: TaserHeaders | undefined;
  params: Record<string, string>;
  body?: unknown;

  constructor(c: Context, params: Record<string, string>) {
    this.#c = c;
    this.params = params;
  }

  get query(): Record<string, string | string[]> {
    if (this.#parsedQuery === undefined) {
      this.#parsedQuery = parseQuery(this.#c);
    }
    return this.#parsedQuery;
  }

  set query(val: Record<string, string | string[]>) {
    this.#parsedQuery = val;
  }

  get headers(): TaserHeaders {
    if (this.#headersCache === undefined) {
      this.#headersCache = createTaserHeaders(this.#c);
    }
    return this.#headersCache;
  }

  get method(): string {
    return this.#c.req.method;
  }

  get url(): string {
    return this.#c.req.url;
  }

  get path(): string {
    return this.#c.req.path;
  }

  get raw(): Request {
    return this.#c.req.raw;
  }
}

export function createTaserRequest(
  c: Context,
  targetPath?: string,
  isStatic?: boolean,
): TaserRequest {
  if (isStatic || (targetPath && !targetPath.includes(":") && !targetPath.includes("*"))) {
    return new TaserRequestImpl(c, EMPTY_PARAMS);
  }

  let params: Record<string, string>;
  try {
    params = { ...c.req.param() };
  } catch {
    params = {};
  }

  const routePath =
    targetPath ??
    (() => {
      try {
        return c.req.routePath;
      } catch {
        return undefined;
      }
    })();

  if (routePath && routePath.includes("*")) {
    const starIdx = routePath.indexOf("*");
    const prefix = routePath.slice(0, starIdx);
    let resolvedPrefix = prefix;
    for (const [key, val] of Object.entries(params)) {
      resolvedPrefix = resolvedPrefix.replace(`:${key}`, val);
    }
    const currentPath = c.req.path;
    params._splat = currentPath.startsWith(resolvedPrefix)
      ? currentPath.slice(resolvedPrefix.length)
      : "";
  }

  return new TaserRequestImpl(c, params);
}
