import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { generateManifest } from "../src/generator.js";
import { scanRoutes } from "../src/scanner.js";

describe("TypeScript ambient types and route context inference (tsc)", { timeout: 30000 }, () => {
  let tempDir: string;
  const routerDir = resolve(__dirname, "../../router/src");

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "taser-tsc-test-"));
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  function setupTsConfig(dir: string): void {
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          strict: true,
          noEmit: true,
          baseUrl: ".",
          paths: {
            "@taserjs/router": [routerDir + "/index.ts"],
            "@taserjs/router/cookie": [routerDir + "/cookie.ts"],
            "@taserjs/router/*": [routerDir + "/*.ts"],
          },
        },
        include: [".taserjs/**/*", "src/**/*"],
      }),
    );
  }

  function runTsc(dir: string): { success: boolean; output: string } {
    try {
      const output = execSync("pnpm exec tsc -p " + dir, {
        encoding: "utf-8",
        stdio: "pipe",
      });
      return { success: true, output };
    } catch (err: any) {
      const output = (err.stdout?.toString() ?? "") + (err.stderr?.toString() ?? "");
      return { success: false, output };
    }
  }

  it("validates that tsc compiles valid routes, infers AppContext, path params, and provided cookies", () => {
    setupTsConfig(tempDir);

    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(join(routesDir, "admin"), { recursive: true });

    // 1. src/context.ts
    writeFileSync(
      join(tempDir, "src", "context.ts"),
      `import { createContext } from "@taserjs/router";
export const context = createContext({
  boot: async () => ({ db: { findUser: (id: string) => ({ id, name: "Alice" }) } }),
  request: (req) => ({ requestId: "req-123" }),
});
export type AppContext = {
  db: { findUser: (id: string) => { id: string; name: string } };
  requestId: string;
};
`,
    );

    // 2. Root layout with cookie(): src/routes/$.ts
    writeFileSync(
      join(routesDir, "$.ts"),
      `import { t } from "@taserjs/router";
import { cookie } from "@taserjs/router/cookie";
export default t.layout("/*").use(cookie());
`,
    );

    // 3. Valid route: src/routes/admin/users.$id.get.ts
    writeFileSync(
      join(routesDir, "admin", "users.$id.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/admin/users/:id").handler(async ({ req, ctx, state, cookies }) => {
  const userId: string = req.params.id;
  const user = ctx.db.findUser(userId);
  const cookieVal = cookies.get("session");
  const reqId: string = ctx.requestId;
  return new Response(user.name + (cookieVal ?? "") + reqId);
});
`,
    );

    const config = { ...DEFAULT_CONFIG, routesDir: "./src/routes", outputDir: "./.taserjs" };
    const scan = scanRoutes({ routesDir, cwd: tempDir });
    expect(scan.diagnostics).toHaveLength(0);

    const gen = generateManifest(scan, config, tempDir);
    expect(gen.typesWritten).toBe(true);

    const result = runTsc(tempDir);
    expect(result.success).toBe(true);
  });

  it("ensures tsc rejects unknown or misspelled route path strings", () => {
    setupTsConfig(tempDir);

    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "valid.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/valid").handler(() => new Response("ok"));
`,
    );

    const config = { ...DEFAULT_CONFIG, routesDir: "./src/routes", outputDir: "./.taserjs" };
    const scan = scanRoutes({ routesDir, cwd: tempDir });
    generateManifest(scan, config, tempDir);

    // Add a file with an invalid/misspelled route path
    writeFileSync(
      join(tempDir, "src", "bad-route.ts"),
      `import { t } from "@taserjs/router";
t.get("/invalid/misspelled");
`,
    );

    const result = runTsc(tempDir);
    expect(result.success).toBe(false);
    expect(result.output).toMatch(/not assignable to parameter of type/);
  });

  it("ensures destructuring { cookies } produces a compile-time type error unless cookie middleware is mounted upstream", () => {
    setupTsConfig(tempDir);

    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(join(routesDir, "admin"), { recursive: true });
    mkdirSync(join(routesDir, "public"), { recursive: true });

    // Scoped admin layout with cookie(): src/routes/admin.ts
    writeFileSync(
      join(routesDir, "admin.ts"),
      `import { t } from "@taserjs/router";
import { cookie } from "@taserjs/router/cookie";
export default t.layout("/admin/*").use(cookie());
`,
    );

    // Admin route inheriting cookies: src/routes/admin/dashboard.get.ts
    writeFileSync(
      join(routesDir, "admin", "dashboard.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/admin/dashboard").handler(async ({ cookies }) => {
  const session = cookies.get("admin_session");
  return new Response(session ?? "");
});
`,
    );

    // Public route WITHOUT upstream cookie middleware: src/routes/public/about.get.ts
    writeFileSync(
      join(routesDir, "public", "about.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/public/about").handler(async ({ req, ctx, state }) => {
  return new Response("about");
});
`,
    );

    const config = { ...DEFAULT_CONFIG, routesDir: "./src/routes", outputDir: "./.taserjs" };
    const scan = scanRoutes({ routesDir, cwd: tempDir });
    generateManifest(scan, config, tempDir);

    // Base configuration compiles cleanly
    const baseResult = runTsc(tempDir);
    expect(baseResult.success).toBe(true);

    // Now update public route to illegally destructure { cookies }
    writeFileSync(
      join(routesDir, "public", "about.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/public/about").handler(async ({ req, cookies }) => {
  return new Response("about");
});
`,
    );

    const errorResult = runTsc(tempDir);
    expect(errorResult.success).toBe(false);
    expect(errorResult.output).toContain("cookies");
    expect(errorResult.output).toMatch(/Property 'cookies' does not exist on type/);
  });

  it("infers default string route params and rejects type mismatches", () => {
    setupTsConfig(tempDir);

    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(join(routesDir, "items"), { recursive: true });

    writeFileSync(
      join(routesDir, "items", "$id.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/items/:id").handler(async ({ req }) => {
  const idStr: string = req.params.id;
  return new Response(idStr);
});
`,
    );

    const config = { ...DEFAULT_CONFIG, routesDir: "./src/routes", outputDir: "./.taserjs" };
    const scan = scanRoutes({ routesDir, cwd: tempDir });
    generateManifest(scan, config, tempDir);

    // Correct string param compiles cleanly
    expect(runTsc(tempDir).success).toBe(true);

    // Treating string param as number fails compile
    writeFileSync(
      join(routesDir, "items", "$id.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/items/:id").handler(async ({ req }) => {
  const idNum: number = req.params.id;
  return new Response(String(idNum));
});
`,
    );

    const mismatchResult = runTsc(tempDir);
    expect(mismatchResult.success).toBe(false);
    expect(mismatchResult.output).toMatch(/Type 'string' is not assignable to type 'number'/);
  });
});
