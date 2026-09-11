import { describe, expect, it } from "vitest";
import { t } from "../src/index.js";
import { cors } from "../src/middleware/cors.js";
import { jwt, sign } from "../src/middleware/jwt.js";
import { jwk } from "../src/middleware/jwk.js";
import { secureHeaders } from "../src/middleware/secure-headers.js";
import { bodyLimit } from "../src/middleware/body-limit.js";
import { csrf } from "../src/middleware/csrf.js";
import { etag } from "../src/middleware/etag.js";
import { timing, startTime, endTime } from "../src/middleware/timing.js";
import { compress } from "../src/middleware/compress.js";
import type { TaserRequest } from "../src/index.js";

function createDummyRequest(url = "http://localhost/test", init: RequestInit = {}): TaserRequest {
  const raw = new Request(url, init);
  return {
    params: {},
    query: {},
    headers: raw.headers as any,
    method: raw.method,
    url: raw.url,
    path: new URL(url).pathname,
    raw,
  };
}

function createNext(fn: (state?: any) => Promise<any> | any): any {
  const next = async (state?: any) => fn(state);
  next.provide = async (_services: any, state?: any) => fn(state);
  return next;
}

describe("First-Party Typed Middlewares Suite", () => {
  describe("@taserjs/router/cors", () => {
    it("handles OPTIONS preflight requests with 204 No Content", async () => {
      const mw = cors({
        origin: "https://app.taserjs.dev",
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
      });

      const req = createDummyRequest("http://localhost/api/data", {
        method: "OPTIONS",
        headers: {
          Origin: "https://app.taserjs.dev",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type",
        },
      });

      let nextCalled = false;
      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          nextCalled = true;
          return new Response("ok");
        }),
      );

      expect(nextCalled).toBe(false);
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.taserjs.dev");
      expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
      expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
    });

    it("appends CORS headers on regular GET requests", async () => {
      const mw = cors({ origin: "*" });
      const req = createDummyRequest("http://localhost/api/data");

      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          return new Response("hello world");
        }),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("@taserjs/router/jwt", () => {
    const secret = "super-secret-hmac-key";

    it("verifies HMAC token and injects typed claims into state.jwtPayload", async () => {
      interface UserClaims {
        sub: string;
        role: string;
      }

      const token = await sign({ sub: "user_42", role: "admin" }, secret, "HS256");
      const mw = jwt<UserClaims>({ secret, alg: "HS256" });

      const req = createDummyRequest("http://localhost/api/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let capturedState: any;
      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async (state) => {
          capturedState = state;
          return new Response(`Welcome ${state?.jwtPayload?.sub}`);
        }),
      );

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Welcome user_42");
      expect(capturedState?.jwtPayload).toEqual({
        sub: "user_42",
        role: "admin",
      });
    });

    it("returns 401 Unauthorized with WWW-Authenticate header when token is missing", async () => {
      const mw = jwt({ secret });
      const req = createDummyRequest("http://localhost/api/me");

      let nextCalled = false;
      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          nextCalled = true;
          return new Response("ok");
        }),
      );

      expect(nextCalled).toBe(false);
      expect(res.status).toBe(401);
      expect(res.headers.get("WWW-Authenticate")).toContain("Bearer");
    });

    it("returns 401 Unauthorized when token is invalid or expired", async () => {
      const mw = jwt({ secret });
      const req = createDummyRequest("http://localhost/api/me", {
        headers: {
          Authorization: "Bearer invalid.jwt.token",
        },
      });

      let nextCalled = false;
      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          nextCalled = true;
          return new Response("ok");
        }),
      );

      expect(nextCalled).toBe(false);
      expect(res.status).toBe(401);
    });
  });

  describe("@taserjs/router/jwk", () => {
    it("verifies remote/local JWKS token and injects typed claims into state.jwtPayload", async () => {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"],
      );

      const publicJwk: any = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
      publicJwk.alg = "RS256";
      publicJwk.use = "sig";
      publicJwk.kid = "test-key-1";

      const privateJwk: any = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
      privateJwk.alg = "RS256";
      privateJwk.kid = "test-key-1";

      const token = await sign(
        { sub: "jwk_user", email: "user@taserjs.dev" },
        privateJwk,
        "RS256",
      );

      const mw = jwk<{ sub: string; email: string }>({
        keys: [publicJwk],
        alg: ["RS256"],
      });

      const req = createDummyRequest("http://localhost/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let capturedState: any;
      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async (state) => {
          capturedState = state;
          return new Response("ok");
        }),
      );

      expect(res.status).toBe(200);
      expect(capturedState?.jwtPayload?.sub).toBe("jwk_user");
      expect(capturedState?.jwtPayload?.email).toBe("user@taserjs.dev");
    });

    it("returns 401 when token is missing in JWK middleware", async () => {
      const mw = jwk({
        keys: [],
        alg: ["RS256"],
      });

      const req = createDummyRequest("http://localhost/api/profile");
      const res = await mw.handler({ req, ctx: {} }, createNext(async () => new Response("ok")));

      expect(res.status).toBe(401);
    });
  });

  describe("@taserjs/router/secure-headers", () => {
    it("applies standard security headers to outgoing responses", async () => {
      const mw = secureHeaders();
      const req = createDummyRequest();

      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          return new Response("content");
        }),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
      expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    });
  });

  describe("@taserjs/router/body-limit", () => {
    it("allows requests below the maxSize limit", async () => {
      const mw = bodyLimit({ maxSize: 1024 });
      const req = createDummyRequest("http://localhost/upload", {
        method: "POST",
        headers: {
          "Content-Length": "10",
          "Content-Type": "text/plain",
        },
        body: "1234567890",
      });

      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          return new Response("uploaded");
        }),
      );

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("uploaded");
    });

    it("defaults error response to HTTP 413 payloadTooLarge JSON when exceeding limit", async () => {
      const mw = bodyLimit({ maxSize: 10 });
      const req = createDummyRequest("http://localhost/upload", {
        method: "POST",
        headers: {
          "Content-Length": "25",
          "Content-Type": "text/plain",
        },
        body: "this is larger than 10 bytes",
      });

      let nextCalled = false;
      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          nextCalled = true;
          return new Response("ok");
        }),
      );

      expect(nextCalled).toBe(false);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json).toEqual({ message: "Payload Too Large" });
    });

    it("supports customizable onError response formatter", async () => {
      const mw = bodyLimit({
        maxSize: 10,
        onError: () => new Response("file too large", { status: 413 }),
      });

      const req = createDummyRequest("http://localhost/upload", {
        method: "POST",
        headers: {
          "Content-Length": "20",
        },
        body: "12345678901234567890",
      });

      const res = await mw.handler({ req, ctx: {} }, createNext(async () => new Response("ok")));

      expect(res.status).toBe(413);
      expect(await res.text()).toBe("file too large");
    });
  });

  describe("@taserjs/router/csrf", () => {
    it("allows same-origin requests to pass through", async () => {
      const mw = csrf({ origin: "http://localhost" });
      const req = createDummyRequest("http://localhost/submit", {
        method: "POST",
        headers: {
          Origin: "http://localhost",
          "Sec-Fetch-Site": "same-origin",
        },
      });

      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          return new Response("passed");
        }),
      );

      expect(res.status).toBe(200);
      expect(await res.text()).toBe("passed");
    });

    it("blocks cross-origin requests with 403 Forbidden", async () => {
      const mw = csrf({ origin: "http://trusted.com" });
      const req = createDummyRequest("http://localhost/submit", {
        method: "POST",
        headers: {
          Origin: "http://malicious.com",
          "Sec-Fetch-Site": "cross-site",
        },
      });

      let nextCalled = false;
      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          nextCalled = true;
          return new Response("ok");
        }),
      );

      expect(nextCalled).toBe(false);
      expect(res.status).toBe(403);
    });
  });

  describe("@taserjs/router/etag", () => {
    it("adds ETag header to response on GET requests", async () => {
      const mw = etag();
      const req = createDummyRequest("http://localhost/resource");

      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          return new Response("static content payload");
        }),
      );

      expect(res.status).toBe(200);
      const etagHeader = res.headers.get("ETag");
      expect(etagHeader).toBeTruthy();
    });

    it("returns 304 Not Modified when If-None-Match matches generated ETag", async () => {
      const mw = etag();

      // First request to get the ETag
      const initialReq = createDummyRequest("http://localhost/resource");
      const initialRes = await mw.handler(
        { req: initialReq, ctx: {} },
        createNext(async () => {
          return new Response("version-1");
        }),
      );
      const generatedETag = initialRes.headers.get("ETag")!;
      expect(generatedETag).toBeTruthy();

      // Second request with If-None-Match matching generated ETag
      const matchReq = createDummyRequest("http://localhost/resource", {
        headers: {
          "If-None-Match": generatedETag,
        },
      });

      const matchRes = await mw.handler(
        { req: matchReq, ctx: {} },
        createNext(async () => {
          return new Response("version-1");
        }),
      );

      expect(matchRes.status).toBe(304);
      expect(matchRes.headers.get("ETag")).toBe(generatedETag);
      expect(await matchRes.text()).toBe("");
    });
  });

  describe("@taserjs/router/timing", () => {
    it("adds Server-Timing header measuring execution time", async () => {
      const mw = timing();
      const req = createDummyRequest();
      const ctx: any = {};

      const res = await mw.handler(
        { req, ctx },
        createNext(async () => {
          startTime(ctx.context, "db-query");
          await new Promise((resolve) => setTimeout(resolve, 5));
          endTime(ctx.context, "db-query");
          return new Response("timed");
        }),
      );

      expect(res.status).toBe(200);
      const serverTiming = res.headers.get("Server-Timing");
      expect(serverTiming).toContain("total");
      expect(serverTiming).toContain("db-query");
    });
  });

  describe("@taserjs/router/compress", () => {
    it("compresses compressible text responses when Accept-Encoding gzip is supported", async () => {
      const mw = compress({ threshold: 10 });
      const req = createDummyRequest("http://localhost/large-data", {
        headers: {
          "Accept-Encoding": "gzip",
        },
      });

      const largePayload = "A".repeat(500);
      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          return new Response(largePayload, {
            headers: {
              "Content-Type": "text/plain",
              "Content-Length": "500",
            },
          });
        }),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Encoding")).toBe("gzip");
    });

    it("does not compress payloads smaller than threshold", async () => {
      const mw = compress({ threshold: 1024 });
      const req = createDummyRequest("http://localhost/small-data", {
        headers: {
          "Accept-Encoding": "gzip",
        },
      });

      const res = await mw.handler(
        { req, ctx: {} },
        createNext(async () => {
          return new Response("tiny", {
            headers: {
              "Content-Type": "text/plain",
              "Content-Length": "4",
            },
          });
        }),
      );

      expect(res.status).toBe(200);
      expect(res.headers.has("Content-Encoding")).toBe(false);
    });
  });

  describe("Cascading Layout and Route Pipeline Integration", () => {
    it("composes csrf, etag, and compress in cascading pipeline", async () => {
      const rootCsrf = csrf({ origin: "http://localhost" });
      const routeEtag = etag();
      const routeCompress = compress({ threshold: 10 });

      const route = t
        .post("/api/echo")
        .use(routeEtag)
        .use(routeCompress)
        .handler(async () => {
          return new Response("A".repeat(200), {
            headers: {
              "Content-Type": "text/plain",
              "Content-Length": "200",
            },
          });
        });

      const req = createDummyRequest("http://localhost/api/echo", {
        method: "POST",
        headers: {
          Origin: "http://localhost",
          "Sec-Fetch-Site": "same-origin",
          "Accept-Encoding": "gzip",
        },
      });

      const ctx = {};
      const res = await rootCsrf.handler(
        { req, ctx },
        createNext(async () => {
          return await routeEtag.handler(
            { req, ctx },
            createNext(async () => {
              return await routeCompress.handler(
                { req, ctx },
                createNext(async () => {
                  return await route.handler({ req, ctx, state: {} });
                }),
              );
            }),
          );
        }),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Encoding")).toBe("gzip");
    });

    it("composes cors, secure-headers, jwt, timing, and body-limit in cascading layout chain", async () => {
      const secret = "shared-secret";
      const token = await sign({ sub: "user-789", role: "developer" }, secret, "HS256");

      // Root layout with cors and secure-headers
      const rootCors = cors({ origin: "https://taserjs.dev" });
      const rootSecure = secureHeaders();

      // Protected sub-layout with jwt auth
      const authJwt = jwt<{ sub: string; role: string }>({ secret, alg: "HS256" });

      // Route with timing and body-limit
      const routeTiming = timing();
      const routeBodyLimit = bodyLimit({ maxSize: 1000 });

      const route = t
        .post("/api/projects")
        .use(routeTiming)
        .use(routeBodyLimit)
        .handler(async ({ state, req }) => {
          const payload = (state as any).jwtPayload;
          return new Response(
            JSON.stringify({
              user: payload?.sub,
              role: payload?.role,
              method: req.method,
            }),
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        });

      // Chain through root layout middlewares -> auth layout -> route middlewares -> handler
      const req = createDummyRequest("http://localhost/api/projects", {
        method: "POST",
        headers: {
          Origin: "https://taserjs.dev",
          Authorization: `Bearer ${token}`,
          "Content-Length": "20",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Demo" }),
      });

      const ctx = {};

      // Execute in nested onion order:
      // rootCors -> rootSecure -> authJwt -> routeTiming -> routeBodyLimit -> handler
      const res = await rootCors.handler(
        { req, ctx },
        createNext(async () => {
          return await rootSecure.handler(
            { req, ctx },
            createNext(async () => {
              return await authJwt.handler(
                { req, ctx },
                createNext(async (authState) => {
                  return await routeTiming.handler(
                    { req, ctx },
                    createNext(async () => {
                      return await routeBodyLimit.handler(
                        { req, ctx },
                        createNext(async () => {
                          return await route.handler({
                            req,
                            ctx,
                            state: authState as any,
                          });
                        }),
                      );
                    }),
                  );
                }),
              );
            }),
          );
        }),
      );

      expect(res.status).toBe(200);

      // Verify CORS header from root layout
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://taserjs.dev");

      // Verify Secure Headers from root layout
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");

      // Verify Server-Timing header from route middleware
      expect(res.headers.get("Server-Timing")).toContain("total");

      // Verify payload and state from handler
      const data = await res.json();
      expect(data).toEqual({
        user: "user-789",
        role: "developer",
        method: "POST",
      });
    });
  });
});
