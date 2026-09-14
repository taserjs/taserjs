import { describe, it, expect } from "vitest";
import { t } from "@taserjs/router";
import { cookie } from "@taserjs/router/middleware/cookie";
import { cors } from "hono/cors";
import { setCookie } from "hono/cookie";
import { json } from "@taserjs/utils";
import { createTaserApp } from "../src/index.js";

describe("Dynamic Services, Cookie Middleware, and t.hono Adapter Integration", () => {
  it("injects services via next.provide across layout hierarchy and accesses them as top-level destructured siblings", async () => {
    // Upstream layout provides a database service and auth service
    const rootLayout = t.layout("/*").use(async (_args, next) => {
      const dbService = {
        findUser: (id: string) => ({ id, name: "Alice", role: "admin" }),
      };
      return next.provide({ db: dbService }, { appVersion: "1.0.0" });
    });

    // Sub-layout provides an audit service
    const adminLayout = t.layout("/admin/*").use(async ({ db }: any, next) => {
      expect(db).toBeDefined();
      const auditLog: string[] = [];
      const auditService = {
        log: (action: string) => auditLog.push(action),
        getLogs: () => [...auditLog],
      };
      return next.provide({ audit: auditService });
    });

    const route = t.get("/admin/users/:id").handler(async ({ req, state, db, audit }: any) => {
      const user = db.findUser(req.params.id);
      audit.log(`viewed user ${req.params.id}`);
      return json({
        user,
        logs: audit.getLogs(),
        version: state.appVersion,
      });
    });

    const app = createTaserApp({
      layouts: {
        "/*": rootLayout,
        "/admin/*": adminLayout,
      },
      routes: {
        "/admin/users/:id": {
          GET: {
            layouts: ["/*", "/admin/*"],
            route,
          },
        },
      },
    });

    const res = await app.request("/admin/users/42");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      user: { id: "42", name: "Alice", role: "admin" },
      logs: ["viewed user 42"],
      version: "1.0.0",
    });
  });

  it("cookie middleware buffers set and delete operations and emits Set-Cookie headers on response", async () => {
    const rootLayout = t.layout("/*").use(cookie());

    const loginRoute = t.post("/auth/login").handler(async ({ cookies }: any) => {
      const incomingSession = cookies.get("old_session");
      cookies.set("session_id", "secret_token_123", {
        httpOnly: true,
        secure: true,
        path: "/",
        sameSite: "Lax",
      });
      cookies.set("theme", "dark", { path: "/" });

      return json({
        ok: true,
        previousSession: incomingSession ?? null,
      });
    });

    const logoutRoute = t.post("/auth/logout").handler(async ({ cookies }: any) => {
      cookies.delete("session_id", { path: "/" });
      return json({ ok: true });
    });

    const app = createTaserApp({
      layouts: { "/*": rootLayout },
      routes: {
        "/auth/login": { POST: { layouts: ["/*"], route: loginRoute } },
        "/auth/logout": { POST: { layouts: ["/*"], route: logoutRoute } },
      },
    });

    // Test login with incoming cookie reading and outgoing Set-Cookie emission
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: {
        Cookie: "old_session=expired-token-999",
      },
    });

    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.previousSession).toBe("expired-token-999");

    const loginCookies = loginRes.headers.getSetCookie();
    expect(loginCookies.length).toBe(2);
    expect(
      loginCookies.some(
        (c) =>
          c.includes("session_id=secret_token_123") &&
          c.includes("HttpOnly") &&
          c.includes("Secure"),
      ),
    ).toBe(true);
    expect(loginCookies.some((c) => c.includes("theme=dark"))).toBe(true);

    // Test logout with cookie deletion
    const logoutRes = await app.request("/auth/logout", {
      method: "POST",
      headers: {
        Cookie: "session_id=secret_token_123",
      },
    });

    expect(logoutRes.status).toBe(200);
    const logoutCookies = logoutRes.headers.getSetCookie();
    expect(logoutCookies.length).toBe(1);
    expect(logoutCookies[0]).toContain("session_id=");
    expect(logoutCookies[0]).toContain("Max-Age=0");
  });

  it("t.hono fluent adapter handles early returns, header mutation, and integrates with hono/cors", async () => {
    const corsMw = t.hono(
      cors({
        origin: "https://taser.dev",
        allowMethods: ["GET", "POST"],
        allowHeaders: ["Content-Type", "Authorization"],
      }),
    );

    const authHonoMw = t.hono(async (c, next) => {
      if (!c.req.header("Authorization")) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      c.header("X-Custom-Hono", "active");
      await next();
      c.header("X-Hono-Finished", "true");
    });

    const layout = t.layout("/*").use(corsMw).use(authHonoMw);

    const route = t.get("/api/data").handler(async () => {
      return json({ message: "hello from taser" });
    });

    const app = createTaserApp({
      layouts: { "/*": layout },
      routes: {
        "/api/data": {
          GET: { layouts: ["/*"], route },
        },
      },
    });

    // 1. Unauthenticated request short-circuits via Hono middleware early return
    const unauthRes = await app.request("/api/data", {
      method: "GET",
      headers: { Origin: "https://taser.dev" },
    });

    expect(unauthRes.status).toBe(401);
    expect(await unauthRes.json()).toEqual({ error: "Unauthorized" });
    // CORS headers applied even on early return
    expect(unauthRes.headers.get("Access-Control-Allow-Origin")).toBe("https://taser.dev");

    // 2. Authenticated GET request runs through pipeline and sets all headers
    const authRes = await app.request("/api/data", {
      method: "GET",
      headers: {
        Origin: "https://taser.dev",
        Authorization: "Bearer valid-token",
      },
    });

    expect(authRes.status).toBe(200);
    expect(authRes.headers.get("Access-Control-Allow-Origin")).toBe("https://taser.dev");
    expect(authRes.headers.get("Vary")).toContain("Origin");
    expect(authRes.headers.get("X-Custom-Hono")).toBe("active");
    expect(authRes.headers.get("X-Hono-Finished")).toBe("true");

    const body = await authRes.json();
    expect(body).toEqual({ message: "hello from taser" });
  });

  it("merges cookies and headers when cookie middleware and Hono middlewares run together", async () => {
    const rootLayout = t
      .layout("/*")
      .use(t.hono(cors({ origin: "https://app.example.com" })))
      .use(
        t.hono(async (c, next) => {
          setCookie(c, "hono_cookie", "from_hono_mw", { path: "/" });
          await next();
        }),
      )
      .use(cookie());

    const route = t.get("/session").handler(async ({ cookies }: any) => {
      cookies.set("taser_cookie", "from_taser_jar", { path: "/" });
      return json({ authenticated: true });
    });

    const app = createTaserApp({
      layouts: { "/*": rootLayout },
      routes: {
        "/session": {
          GET: { layouts: ["/*"], route },
        },
      },
    });

    const res = await app.request("/session", {
      method: "GET",
      headers: { Origin: "https://app.example.com" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com");

    const cookies = res.headers.getSetCookie();
    expect(cookies.length).toBe(2);
    expect(cookies.some((c) => c.includes("hono_cookie=from_hono_mw"))).toBe(true);
    expect(cookies.some((c) => c.includes("taser_cookie=from_taser_jar"))).toBe(true);
  });

  it("isolates cookie management to the subtree where cookie middleware is mounted without polluting siblings", async () => {
    const authLayout = t.layout("/auth/*").use(cookie());

    const authLoginRoute = t.post("/auth/login").handler(async ({ cookies }: any) => {
      cookies.set("token", "auth_token_xyz", { path: "/auth" });
      return json({ loggedIn: true });
    });

    const apiRoute = t.get("/api/data").handler(async () => {
      return json(
        { data: 123 },
        {
          headers: { "X-Custom-Api": "true" },
        },
      );
    });

    const app = createTaserApp({
      layouts: {
        "/auth/*": authLayout,
      },
      routes: {
        "/auth/login": {
          POST: { layouts: ["/auth/*"], route: authLoginRoute },
        },
        "/api/data": {
          GET: { route: apiRoute },
        },
      },
    });

    const authRes = await app.request("/auth/login", { method: "POST" });
    expect(authRes.status).toBe(200);
    expect(authRes.headers.getSetCookie()).toEqual(["token=auth_token_xyz; Path=/auth"]);

    const apiRes = await app.request("/api/data");
    expect(apiRes.status).toBe(200);
    expect(apiRes.headers.getSetCookie()).toEqual([]);
    expect(apiRes.headers.get("X-Custom-Api")).toBe("true");
    expect(await apiRes.json()).toEqual({ data: 123 });
  });

  it("integrates t.hono(mw, refine) seamlessly into createTaserApp pipeline and handlers", async () => {
    // 1. Root layout with bare t.hono middleware (e.g. CORS)
    // 2. Sub-layout with t.hono(mw, refine) simulating JWT / auth middleware setting c.set("user")
    const authMw = t.hono(
      async (c, next) => {
        const authHeader = c.req.header("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return c.json({ error: "missing_token" }, 401);
        }
        const token = authHeader.slice(7);
        c.set("jwtUser", { id: "user_42", username: "kazi", token });
        c.set("permissions", ["read", "write"]);
        await next();
        c.res.headers.set("X-Auth-Processed", "v1");
      },
      (c, next) => {
        const user = c.get("jwtUser");
        const permissions = c.get("permissions");
        const authService = {
          hasPermission: (perm: string) => permissions.includes(perm),
        };
        return next.provide({ authService }, { user });
      },
    );

    const protectedLayout = t.layout("/protected/*").use(authMw);

    const profileRoute = t
      .get("/protected/profile")
      .handler(async ({ state, authService }: any) => {
        return json({
          user: state.user,
          canWrite: authService.hasPermission("write"),
        });
      });

    const app = createTaserApp({
      layouts: {
        "/protected/*": protectedLayout,
      },
      routes: {
        "/protected/profile": {
          GET: { layouts: ["/protected/*"], route: profileRoute },
        },
      },
    });

    // Request without token gets 401
    const unauthRes = await app.request("/protected/profile", { method: "GET" });
    expect(unauthRes.status).toBe(401);
    expect(await unauthRes.json()).toEqual({ error: "missing_token" });

    // Request with token succeeds, access state.user and injected authService
    const authRes = await app.request("/protected/profile", {
      method: "GET",
      headers: {
        Authorization: "Bearer secret-jwt-token",
      },
    });
    expect(authRes.status).toBe(200);
    expect(authRes.headers.get("X-Auth-Processed")).toBe("v1");
    const body = await authRes.json();
    expect(body).toEqual({
      user: { id: "user_42", username: "kazi", token: "secret-jwt-token" },
      canWrite: true,
    });
  });
});
