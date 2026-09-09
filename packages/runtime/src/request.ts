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
  const rawQueries = c.req.queries();
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

  return {
    params: c.req.param() ?? {},
    query,
    headers: createTaserHeaders(c),
    method: c.req.method,
    url: c.req.url,
    raw: c.req.raw,
  };
}
