export interface ResponseContext {
  res?: Response | undefined;
}

export function mergeResponseCookies(c: ResponseContext, res: Response): Response {
  if (c.res === res) {
    return res;
  }
  // Accessing c.res forces materialization of Hono's prepared headers into #res
  void c.res;
  const cCookies =
    typeof c.res?.headers?.getSetCookie === "function" ? c.res.headers.getSetCookie() : [];
  const resCookies =
    typeof res.headers?.getSetCookie === "function" ? res.headers.getSetCookie() : [];

  if (cCookies.length === 0 && resCookies.length === 0) {
    c.res = res;
    return res;
  }

  c.res = res;

  if (resCookies.length === 0) {
    for (let i = 0; i < cCookies.length; i++) {
      res.headers.append("set-cookie", cCookies[i]!);
    }
    return res;
  }

  if (cCookies.length === 0) {
    return res;
  }

  // Both sources have cookies: deduplicate and re-append
  const allCookies = Array.from(new Set([...cCookies, ...resCookies]));
  c.res.headers.delete("set-cookie");
  for (let i = 0; i < allCookies.length; i++) {
    c.res.headers.append("set-cookie", allCookies[i]!);
  }

  return c.res;
}
