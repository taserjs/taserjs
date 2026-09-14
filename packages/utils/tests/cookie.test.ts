import { describe, it, expect } from "vitest";
import { mergeResponseCookies } from "../src/index.js";

describe("mergeResponseCookies", () => {
  it("merges cookies from context and response", () => {
    const cHeaders = new Headers();
    cHeaders.append("set-cookie", "from_c=1; Path=/");
    const mockContext = {
      res: new Response("c", { headers: cHeaders }),
    };

    const resHeaders = new Headers();
    resHeaders.append("set-cookie", "from_res=2; Path=/");
    const incomingRes = new Response("ok", { headers: resHeaders });

    const merged = mergeResponseCookies(mockContext, incomingRes);
    const cookies = merged.headers.getSetCookie();

    expect(cookies).toHaveLength(2);
    expect(cookies).toContain("from_c=1; Path=/");
    expect(cookies).toContain("from_res=2; Path=/");
    expect(mockContext.res).toBe(merged);
  });

  it("deduplicates identical cookies", () => {
    const cHeaders = new Headers();
    cHeaders.append("set-cookie", "theme=dark; Path=/");
    const mockContext = {
      res: new Response("c", { headers: cHeaders }),
    };

    const resHeaders = new Headers();
    resHeaders.append("set-cookie", "theme=dark; Path=/");
    const incomingRes = new Response("ok", { headers: resHeaders });

    const merged = mergeResponseCookies(mockContext, incomingRes);
    const cookies = merged.headers.getSetCookie();

    expect(cookies).toHaveLength(1);
    expect(cookies).toEqual(["theme=dark; Path=/"]);
  });

  it("handles empty cookies gracefully", () => {
    const mockContext = {
      res: undefined,
    };
    const incomingRes = new Response("ok");

    const merged = mergeResponseCookies(mockContext, incomingRes);
    expect(merged.headers.getSetCookie()).toHaveLength(0);
    expect(mockContext.res).toBe(merged);
  });

  it("short-circuits when c.res is already the incoming response", () => {
    const existingRes = new Response("ok", {
      headers: { "set-cookie": "session=123; Path=/" },
    });
    const mockContext = {
      res: existingRes,
    };

    const merged = mergeResponseCookies(mockContext, existingRes);
    expect(merged).toBe(existingRes);
  });
});
