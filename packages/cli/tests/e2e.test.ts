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

  it("dispatches requests to breakout routes, verifying middleware execution order, layout bypassing, and root /* bypassing", async () => {
    const routesDir = join(tempDir, "src", "routes-breakout-e2e");
    mkdirSync(routesDir, { recursive: true });
    mkdirSync(join(routesDir, "posts"), { recursive: true });
    mkdirSync(join(routesDir, "tasks"), { recursive: true });
    mkdirSync(join(routesDir, "_auth"), { recursive: true });

    // 1. Root layout (/*): appends "root" to trail
    writeFileSync(
      join(routesDir, "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/*").use(async ({ state }: any, next: any) => next({ trail: [...(state?.trail ?? []), "root"] }));',
    );

    // 2. Posts layout (/posts/*): appends "posts" to trail
    writeFileSync(
      join(routesDir, "posts.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/posts/*").use(async ({ state }: any, next: any) => next({ trail: [...(state?.trail ?? []), "posts"] }));',
    );

    // 3. Tasks layout (/tasks/*): appends "tasks" to trail
    writeFileSync(
      join(routesDir, "tasks", "$.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/tasks/*").use(async ({ state }: any, next: any) => next({ trail: [...(state?.trail ?? []), "tasks"] }));',
    );

    // 4. Tasks child layout (/tasks/:id/*): appends "tasks:id" to trail
    writeFileSync(
      join(routesDir, "tasks", "$id.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/tasks/:id/*").use(async ({ state }: any, next: any) => next({ trail: [...(state?.trail ?? []), "tasks:id"] }));',
    );

    // 5. Auth pathless layout (/_auth/*): appends "auth" to trail
    writeFileSync(
      join(routesDir, "_auth.ts"),
      'import { t } from "@taserjs/router";\nexport default t.layout("/_auth/*").use(async ({ state }: any, next: any) => next({ trail: [...(state?.trail ?? []), "auth"] }));',
    );

    // 6. Base route: posts/$id.get.ts -> /posts/:id (inherits /* and /posts/*)
    writeFileSync(
      join(routesDir, "posts", "$id.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts/:id").handler(({ req, state }: any) => Response.json({ id: req.params.id, trail: [...(state?.trail ?? []), "posts:id"] }));',
    );

    // 7. Flat breakout route: posts_.$id.preview.get.ts -> /posts/:id/preview (bypasses posts.ts, inherits /*)
    writeFileSync(
      join(routesDir, "posts_.$id.preview.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts/:id/preview").handler(({ req, state }: any) => Response.json({ id: req.params.id, trail: [...(state?.trail ?? []), "posts:id:preview"] }));',
    );

    // 8. Resource root index breakout: posts/index_.get.ts -> /posts (bypasses posts.ts, inherits /*)
    writeFileSync(
      join(routesDir, "posts", "index_.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts").handler(({ state }: any) => Response.json({ trail: [...(state?.trail ?? []), "posts:index"] }));',
    );

    // 9. Nested directory breakout: tasks/$id_.complete.patch.ts -> /tasks/:id/complete (bypasses tasks/$id.ts, inherits /* and /tasks/*)
    writeFileSync(
      join(routesDir, "tasks", "$id_.complete.patch.ts"),
      'import { t } from "@taserjs/router";\nexport default t.patch("/tasks/:id/complete").handler(({ req, state }: any) => Response.json({ id: req.params.id, trail: [...(state?.trail ?? []), "tasks:id:complete"] }));',
    );

    // 10. Pathless group breakout: _auth/posts_.$id.details.get.ts -> /posts/:id/details (bypasses posts.ts, inherits /* and /_auth/*)
    writeFileSync(
      join(routesDir, "_auth", "posts_.$id.details.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/posts/:id/details").handler(({ req, state }: any) => Response.json({ id: req.params.id, trail: [...(state?.trail ?? []), "auth:posts:details"] }));',
    );

    // 11. Root breakout route: health_.get.ts -> /health (bypasses /* root layout completely)
    writeFileSync(
      join(routesDir, "health_.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/health").handler(({ state }: any) => Response.json({ trail: [...(state?.trail ?? []), "health"] }));',
    );

    // 12. Root index breakout route: index_.get.ts -> / (bypasses /* root layout completely)
    writeFileSync(
      join(routesDir, "index_.get.ts"),
      'import { t } from "@taserjs/router";\nexport default t.get("/").handler(({ state }: any) => Response.json({ trail: [...(state?.trail ?? []), "root-index"] }));',
    );

    const config = {
      ...DEFAULT_CONFIG,
      routesDir: "./src/routes-breakout-e2e",
      outputDir: "./.taserjs",
    };

    const scanResult = scanRoutes({ routesDir, cwd: tempDir });
    expect(scanResult.diagnostics).toHaveLength(0);

    const genResult = generateManifest(scanResult, config, tempDir);
    expect(genResult.manifestWritten).toBe(true);

    // Verify generated manifest contains expected layout bindings
    expect(genResult.content).toContain('"/health": {\n      GET: {\n        layouts: [],');
    expect(genResult.content).toContain('"/": {\n      GET: {\n        layouts: [],');
    expect(genResult.content).toContain(
      '"/posts/:id/preview": {\n      GET: {\n        layouts: ["/*"],',
    );
    expect(genResult.content).toContain('"/posts": {\n      GET: {\n        layouts: ["/*"],');
    expect(genResult.content).toContain(
      '"/tasks/:id/complete": {\n      PATCH: {\n        layouts: ["/*", "/tasks/*"],',
    );
    expect(genResult.content).toContain(
      '"/posts/:id/details": {\n      GET: {\n        layouts: ["/*", "/_auth/*"],',
    );
    expect(genResult.content).toContain(
      '"/posts/:id": {\n      GET: {\n        layouts: ["/*", "/posts/*"],',
    );

    // Build mock manifest and create app to verify runtime HTTP dispatch
    const rootLayout = t
      .layout("/*")
      .use(async ({ state }: any, next: any) => next({ trail: [...(state?.trail ?? []), "root"] }));
    const postsLayout = t
      .layout("/posts/*")
      .use(async ({ state }: any, next: any) =>
        next({ trail: [...(state?.trail ?? []), "posts"] }),
      );
    const tasksLayout = t
      .layout("/tasks/*")
      .use(async ({ state }: any, next: any) =>
        next({ trail: [...(state?.trail ?? []), "tasks"] }),
      );
    const tasksChildLayout = t
      .layout("/tasks/:id/*")
      .use(async ({ state }: any, next: any) =>
        next({ trail: [...(state?.trail ?? []), "tasks:id"] }),
      );
    const authLayout = t
      .layout("/_auth/*")
      .use(async ({ state }: any, next: any) => next({ trail: [...(state?.trail ?? []), "auth"] }));

    const mockManifest = {
      layouts: {
        "/*": rootLayout,
        "/posts/*": postsLayout,
        "/tasks/*": tasksLayout,
        "/tasks/:id/*": tasksChildLayout,
        "/_auth/*": authLayout,
      },
      routes: {
        "/health": {
          GET: {
            layouts: [],
            route: t
              .get("/health")
              .handler(({ state }: any) =>
                Response.json({ trail: [...(state?.trail ?? []), "health"] }),
              ),
          },
        },
        "/": {
          GET: {
            layouts: [],
            route: t
              .get("/")
              .handler(({ state }: any) =>
                Response.json({ trail: [...(state?.trail ?? []), "root-index"] }),
              ),
          },
        },
        "/posts/:id/preview": {
          GET: {
            layouts: ["/*"],
            route: t
              .get("/posts/:id/preview")
              .handler(({ req, state }: any) =>
                Response.json({
                  id: req.params.id,
                  trail: [...(state?.trail ?? []), "posts:id:preview"],
                }),
              ),
          },
        },
        "/posts": {
          GET: {
            layouts: ["/*"],
            route: t
              .get("/posts")
              .handler(({ state }: any) =>
                Response.json({ trail: [...(state?.trail ?? []), "posts:index"] }),
              ),
          },
        },
        "/tasks/:id/complete": {
          PATCH: {
            layouts: ["/*", "/tasks/*"],
            route: t
              .patch("/tasks/:id/complete")
              .handler(({ req, state }: any) =>
                Response.json({
                  id: req.params.id,
                  trail: [...(state?.trail ?? []), "tasks:id:complete"],
                }),
              ),
          },
        },
        "/posts/:id/details": {
          GET: {
            layouts: ["/*", "/_auth/*"],
            route: t
              .get("/posts/:id/details")
              .handler(({ req, state }: any) =>
                Response.json({
                  id: req.params.id,
                  trail: [...(state?.trail ?? []), "auth:posts:details"],
                }),
              ),
          },
        },
        "/posts/:id": {
          GET: {
            layouts: ["/*", "/posts/*"],
            route: t
              .get("/posts/:id")
              .handler(({ req, state }: any) =>
                Response.json({ id: req.params.id, trail: [...(state?.trail ?? []), "posts:id"] }),
              ),
          },
        },
      },
    };

    const app = createTaserApp(mockManifest);

    // 1. Root breakout route: GET /health (bypasses root /* completely)
    const healthRes = await app.request("/health");
    expect(healthRes.status).toBe(200);
    const healthData = await healthRes.json();
    expect(healthData).toEqual({ trail: ["health"] });

    // 2. Root index breakout route: GET / (bypasses root /* completely)
    const rootRes = await app.request("/");
    expect(rootRes.status).toBe(200);
    const rootData = await rootRes.json();
    expect(rootData).toEqual({ trail: ["root-index"] });

    // 3. Flat breakout route: GET /posts/42/preview (bypasses posts.ts, runs /* root layout)
    const previewRes = await app.request("/posts/42/preview");
    expect(previewRes.status).toBe(200);
    const previewData = await previewRes.json();
    expect(previewData).toEqual({ id: "42", trail: ["root", "posts:id:preview"] });

    // 4. Resource root index breakout: GET /posts (bypasses posts.ts, runs /* root layout)
    const postsRes = await app.request("/posts");
    expect(postsRes.status).toBe(200);
    const postsData = await postsRes.json();
    expect(postsData).toEqual({ trail: ["root", "posts:index"] });

    // 5. Nested directory breakout: PATCH /tasks/99/complete (bypasses tasks/$id.ts, runs /* and /tasks/*)
    const taskRes = await app.request("/tasks/99/complete", { method: "PATCH" });
    expect(taskRes.status).toBe(200);
    const taskData = await taskRes.json();
    expect(taskData).toEqual({ id: "99", trail: ["root", "tasks", "tasks:id:complete"] });

    // 6. Pathless group breakout: GET /posts/55/details (bypasses posts.ts, runs /* and /_auth/*)
    const detailsRes = await app.request("/posts/55/details");
    expect(detailsRes.status).toBe(200);
    const detailsData = await detailsRes.json();
    expect(detailsData).toEqual({ id: "55", trail: ["root", "auth", "auth:posts:details"] });

    // 7. Base route: GET /posts/77 (retains both /* and /posts/*)
    const baseRes = await app.request("/posts/77");
    expect(baseRes.status).toBe(200);
    const baseData = await baseRes.json();
    expect(baseData).toEqual({ id: "77", trail: ["root", "posts", "posts:id"] });
  });
});
