import type { Context } from "hono";
import type { HeaderKey, TaserHeaders, TaserRequest } from "./types.js";

export function createTaserHeaders(c: Context): TaserHeaders {
  const rawHeaders = c.req.raw.headers;
  return new Proxy(rawHeaders as unknown as TaserHeaders, {
    get(target, prop, receiver) {
      if (prop === "get") {
        return (name: HeaderKey) => c.req.header(name) ?? null;
      }
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === "function") {
        return val.bind(target);
      }
      return val;
    },
  });
}

export function createTaserRequest(c: Context): TaserRequest {
  let rawQueries: Record<string, string[]> | undefined;
  try {
    rawQueries = c.req.queries();
  } catch {
    rawQueries = undefined;
  }
  const query: Record<string, string | string[]> = {};

  if (rawQueries) {
    for (const [key, values] of Object.entries(rawQueries)) {
      if (values.length === 1) {
        query[key] = values[0]!;
      } else if (values.length > 1) {
        query[key] = values;
      }
    }
  }

  let params: Record<string, string> = {};
  try {
    params = { ...c.req.param() };
  } catch {
    params = {};
  }

  let routePath: string | undefined;
  try {
    routePath = c.req.routePath;
  } catch {
    routePath = undefined;
  }
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

  return {
    params,
    query,
    headers: createTaserHeaders(c),
    method: c.req.method,
    url: c.req.url,
    path: c.req.path,
    raw: c.req.raw,
  };
}
