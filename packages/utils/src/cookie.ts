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
  const allCookies = Array.from(new Set([...cCookies, ...resCookies]));

  c.res = res;

  if (allCookies.length > 0) {
    c.res.headers.delete("set-cookie");
    for (const cookieStr of allCookies) {
      c.res.headers.append("set-cookie", cookieStr);
    }
  }

  return c.res;
}
