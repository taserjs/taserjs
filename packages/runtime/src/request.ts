import type { Context } from "hono";
import type { TaserRequest } from "./types.js";

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
    headers: c.req.raw.headers,
    method: c.req.method,
    url: c.req.url,
    raw: c.req.raw,
  };
}
