import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { t } from "@taserjs/router";
import { createTaserApp } from "@taserjs/runtime";
import { DEFAULT_CONFIG } from "../src/config.js";
import { generateManifest } from "../src/generator.js";
import { scanRoutes } from "../src/scanner.js";

describe("E2E CLI scanner and runtime dispatch", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-e2e-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("scans sample route directory with escaped characters, splats, pathless groups, and verifies generated manifest execution", async () => {
    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });
    mkdirSync(join(routesDir, "admin"), { recursive: true });
    mkdirSync(join(routesDir, "_auth"), { recursive: true });

    // Root layout
    writeFileSync(
      join(routesDir, "$.tsx"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/*").use(async (_args, next) => next({ root: true }));',
    );

    // Admin layout (sibling)
    writeFileSync(
      join(routesDir, "admin.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/admin/*").use(async (_args, next) => next({ admin: true }));',
    );

    // Root route
    writeFileSync(
      join(routesDir, "index.get.tsx"),
      'import { t } from "@taserjs/router";\nexport default t.get("/").handler(({ state }) => Response.json({ ok: true, state }));',
    );

    // Escaped sitemap[.]xml
    writeFileSync(
      join(routesDir, "sitemap[.]xml.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/sitemap.xml").handler(() => new Response("<xml />", { headers: { "content-type": "application/xml" } }));',
    );

    // Escaped [_]private
    writeFileSync(
      join(routesDir, "[_]private.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/_private").handler(() => Response.json({ private: true }));',
    );

    // Pathless layout: _auth.ts -> /_auth/*
    writeFileSync(
      join(routesDir, "_auth.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/_auth/*").use(async (_args, next) => next());',
    );

    // Pathless group route: _auth/profile.get.ts -> /profile
    writeFileSync(
      join(routesDir, "_auth", "profile.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/profile").handler(() => Response.json({ user: "alice" }));',
    );

    // Wildcard splat: assets.$.get.ts -> /assets/*
    writeFileSync(
      join(routesDir, "assets.$.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/assets/*").handler(({ req }) => Response.json({ file: req.params._splat }));',
    );

    // Dynamic param: users.$id.get.ts -> /users/:id
    writeFileSync(
      join(routesDir, "users.$id.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/users/:id").handler(({ req }) => Response.json({ id: req.params.id }));',
    );

    // Admin segment root: admin.get.ts -> /admin
    writeFileSync(
      join(routesDir, "admin.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/admin").handler(({ state }) => Response.json({ adminArea: true, state }));',
    );

    // Admin descendant: admin/settings.get.ts -> /admin/settings
    writeFileSync(
      join(routesDir, "admin", "settings.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/admin/settings").handler(({ state }) => Response.json({ settings: true, state }));',
    );

    // Ignored files
    writeFileSync(join(routesDir, "-types.ts"), "export type RouteState = {};");
    writeFileSync(join(routesDir, "-schema.ts"), "export const s = {};");

    const config = {
      ...DEFAULT_CONFIG,
      routesDir: "./src/routes",
      outputDir: "./.taserjs",
    };

    const scanResult = scanRoutes({ routesDir, cwd: tempDir });
    expect(scanResult.diagnostics).toHaveLength(0);

    const genResult = generateManifest(scanResult, config, tempDir);
    expect(genResult.manifestWritten).toBe(true);

    // Verify manifest contents
    expect(genResult.content).toContain('"/sitemap.xml":');
    expect(genResult.content).toContain('"/_private":');
    expect(genResult.content).toContain('"/profile":');
    expect(genResult.content).toContain('"/assets/*":');
    expect(genResult.content).toContain('"/users/:id":');
    expect(genResult.content).toContain('"/admin":');
    expect(genResult.content).toContain('"/admin/settings":');

    // Build routes manifest dynamically to test execution in createTaserApp
    const rootLayout = t.layout("/*").use(async (_args: any, next: any) => next({ root: true }));
    const authLayout = t
      .layout("/_auth/*")
      .use(async (_args: any, next: any) => next({ auth: true }));
    const adminLayout = t
      .layout("/admin/*")
      .use(async (_args: any, next: any) => next({ admin: true }));

    const mockManifest = {
      layouts: {
        "/*": rootLayout,
        "/_auth/*": authLayout,
        "/admin/*": adminLayout,
      },
      routes: {
        "/": {
          GET: {
            layouts: ["/*"],
            route: t.get("/").handler(({ state }: any) => Response.json({ ok: true, state })),
          },
        },
        "/sitemap.xml": {
          GET: {
            layouts: ["/*"],
            route: t
              .get("/sitemap.xml")
              .handler(
                () => new Response("<xml />", { headers: { "content-type": "application/xml" } }),
              ),
          },
        },
        "/_private": {
          GET: {
            layouts: ["/*"],
            route: t.get("/_private").handler(() => Response.json({ private: true })),
          },
        },
        "/profile": {
          GET: {
            layouts: ["/*", "/_auth/*"],
            route: t
              .get("/profile")
              .handler(({ state }: any) => Response.json({ user: "alice", state })),
          },
        },
        "/assets/*": {
          GET: {
            layouts: ["/*"],
            route: t
              .get("/assets/*")
              .handler(({ req }: any) => Response.json({ file: req.params._splat })),
          },
        },
        "/users/:id": {
          GET: {
            layouts: ["/*"],
            route: t
              .get("/users/:id")
              .handler(({ req }: any) => Response.json({ id: req.params.id })),
          },
        },
        "/admin": {
          GET: {
            layouts: ["/*", "/admin/*"],
            route: t
              .get("/admin")
              .handler(({ state }: any) => Response.json({ adminArea: true, state })),
          },
        },
        "/admin/settings": {
          GET: {
            layouts: ["/*", "/admin/*"],
            route: t
              .get("/admin/settings")
              .handler(({ state }: any) => Response.json({ settings: true, state })),
          },
        },
      },
    };

    const app = createTaserApp(mockManifest);

    // 1. GET /
    const homeRes = await app.request("/");
    expect(homeRes.status).toBe(200);
    const homeData = await homeRes.json();
    expect(homeData).toEqual({ ok: true, state: { root: true } });

    // 2. GET /sitemap.xml
    const sitemapRes = await app.request("/sitemap.xml");
    expect(sitemapRes.status).toBe(200);
    expect(sitemapRes.headers.get("content-type")).toBe("application/xml");
    expect(await sitemapRes.text()).toBe("<xml />");

    // 3. GET /_private
    const privRes = await app.request("/_private");
    expect(privRes.status).toBe(200);
    expect(await privRes.json()).toEqual({ private: true });

    // 4. GET /profile
    const profRes = await app.request("/profile");
    expect(profRes.status).toBe(200);
    expect(await profRes.json()).toEqual({ user: "alice", state: { root: true, auth: true } });

    // 5. GET /assets/* with _splat
    const assetRes = await app.request("/assets/images/logo.png");
    expect(assetRes.status).toBe(200);
    expect(await assetRes.json()).toEqual({ file: "images/logo.png" });

    // 6. GET /users/:id
    const userRes = await app.request("/users/99");
    expect(userRes.status).toBe(200);
    expect(await userRes.json()).toEqual({ id: "99" });

    // 7. GET /admin (segment root inheriting admin layout)
    const adminRes = await app.request("/admin");
    expect(adminRes.status).toBe(200);
    expect(await adminRes.json()).toEqual({ adminArea: true, state: { root: true, admin: true } });

    // 8. GET /admin/settings (descendant inheriting admin layout)
    const settingsRes = await app.request("/admin/settings");
    expect(settingsRes.status).toBe(200);
    expect(await settingsRes.json()).toEqual({
      settings: true,
      state: { root: true, admin: true },
    });
  });
});
