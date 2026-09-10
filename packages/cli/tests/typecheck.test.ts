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
  const runtimeDir = resolve(__dirname, "../../runtime/src");
  const utilsDir = resolve(__dirname, "../../utils/src");

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
            "@taserjs/runtime": [runtimeDir + "/index.ts"],
            "@taserjs/runtime/*": [runtimeDir + "/*.ts"],
            "@taserjs/utils": [utilsDir + "/index.ts"],
            "@taserjs/utils/*": [utilsDir + "/*.ts"],
          },
        },
        include: ["src/**/*", "src/.taserjs/**/*"],
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

    // 1. src/taser.ts with defineTaser and context
    writeFileSync(
      join(tempDir, "src", "taser.ts"),
      `import { createContext, defineTaser } from "@taserjs/router";
export default defineTaser().context(createContext({
  boot: async () => ({ db: { findUser: (id: string) => ({ id, name: "Alice" }) } }),
  request: (req) => ({ requestId: "req-123" }),
}));
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

    const config = { ...DEFAULT_CONFIG };
    const scan = scanRoutes({ routesDir, cwd: tempDir });
    expect(scan.diagnostics).toHaveLength(0);

    const gen = generateManifest(scan, config, tempDir);
    expect(gen.manifestWritten).toBe(true);

    const result = runTsc(tempDir);
    if (!result.success) {
      console.error("TSC FAIL:", result.output);
    }
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

    const config = { ...DEFAULT_CONFIG };
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

    const config = { ...DEFAULT_CONFIG };
    const scan = scanRoutes({ routesDir, cwd: tempDir });
    generateManifest(scan, config, tempDir);

    // Base configuration compiles cleanly
    const baseResult = runTsc(tempDir);
    if (!baseResult.success) {
      console.error("BASE RESULT FAILED:", baseResult.output);
    }
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

    const config = { ...DEFAULT_CONFIG };
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

  it("verifies downstream state and schema inheritance from parent layouts and compile error on undeclared state", () => {
    setupTsConfig(tempDir);

    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(join(routesDir, "_auth", "items", "$id"), { recursive: true });

    // Mock schema helper
    writeFileSync(
      join(tempDir, "src", "schema.ts"),
      `export const numSchema = {
  "~standard": {
    version: 1 as const,
    vendor: "test",
    validate: (v: unknown) => ({ value: { id: Number((v as any)?.id) } }),
    types: { input: { id: "123" }, output: { id: 123 } },
  },
};
export const querySchema = {
  "~standard": {
    version: 1 as const,
    vendor: "test",
    validate: (v: unknown) => ({ value: { filter: String((v as any)?.filter ?? "") } }),
    types: { input: { filter: "active" }, output: { filter: "active" } },
  },
};
`,
    );

    // 1. Root layout with state: src/routes/$.ts
    writeFileSync(
      join(routesDir, "$.ts"),
      `import { t } from "@taserjs/router";
export default t.layout("/*").use(async (_args, next) => {
  return await next({ appEnv: "production" });
});
`,
    );

    // 2. Auth layout inheriting root and adding token state and query schema: src/routes/_auth.ts
    writeFileSync(
      join(routesDir, "_auth.ts"),
      `import { t } from "@taserjs/router";
import { querySchema } from "../schema.js";
export default t.layout("/_auth/*")
  .query(querySchema)
  .use(async ({ state, req }, next) => {
    const env: string = state.appEnv;
    const filter: string = req.query.filter;
    return await next({ token: "token-abc" });
  });
`,
    );

    // 3. Child layout with params schema: src/routes/_auth/items/$id.ts
    writeFileSync(
      join(routesDir, "_auth", "items", "$id.ts"),
      `import { t } from "@taserjs/router";
import { numSchema } from "../../../schema.js";
export default t.layout("/_auth/items/:id/*")
  .params(numSchema)
  .use(async ({ req, state }, next) => {
    const id: number = req.params.id;
    const token: string = state.token;
    const filter: string = req.query.filter;
    return await next({ itemId: id });
  });
`,
    );

    // 4. Downstream route inheriting params, query, and cascading state: src/routes/_auth/items/$id/index.get.ts
    writeFileSync(
      join(routesDir, "_auth", "items", "$id", "index.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/items/:id").handler(async ({ req, state }) => {
  const id: number = req.params.id;
  const filter: string = req.query.filter;
  const token: string = state.token;
  const env: string = state.appEnv;
  const itemId: number = state.itemId;
  return new Response(\`\${id}-\${filter}-\${token}-\${env}-\${itemId}\`);
});
`,
    );

    const config = { ...DEFAULT_CONFIG };
    const scan = scanRoutes({ routesDir, cwd: tempDir });
    generateManifest(scan, config, tempDir);

    const validResult = runTsc(tempDir);
    if (!validResult.success) {
      console.error("FAIL ON VALID:", validResult.output);
    }
    expect(validResult.success).toBe(true);

    // 5. Undeclared state property fails compile
    writeFileSync(
      join(routesDir, "_auth", "items", "$id", "index.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/items/:id").handler(async ({ state }) => {
  // @ts-expect-error undeclared property
  const invalid = state.nonExistent;
  return new Response("ok");
});
`,
    );

    const step5Result = runTsc(tempDir);
    if (!step5Result.success) {
      console.error("FAIL ON STEP 5:", step5Result.output);
    }
    // Should compile because of @ts-expect-error
    expect(step5Result.success).toBe(true);

    // Remove @ts-expect-error -> must fail compile
    writeFileSync(
      join(routesDir, "_auth", "items", "$id", "index.get.ts"),
      `import { t } from "@taserjs/router";
export default t.get("/items/:id").handler(async ({ state }) => {
  const invalid = state.nonExistent;
  return new Response("ok");
});
`,
    );

    const errorResult = runTsc(tempDir);
    expect(errorResult.success).toBe(false);
    expect(errorResult.output).toMatch(/Property 'nonExistent' does not exist/);
  });

  it("enforces that tsc rejects chaining .use() after route schema validations", () => {
    setupTsConfig(tempDir);

    const routesDir = join(tempDir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(tempDir, "src", "schema.ts"),
      `export const schema = {
  "~standard": {
    version: 1 as const,
    vendor: "test",
    validate: (v: unknown) => ({ value: v }),
    types: { input: {}, output: {} },
  },
};
`,
    );

    // 1. Valid: .use() before .params()
    writeFileSync(
      join(routesDir, "valid.get.ts"),
      `import { t } from "@taserjs/router";
import { schema } from "../schema.js";
export default t
  .get("/valid")
  .use(async (_args, next) => next())
  .params(schema)
  .handler(() => new Response("ok"));
`,
    );

    const config = { ...DEFAULT_CONFIG };
    const scan = scanRoutes({ routesDir, cwd: tempDir });
    generateManifest(scan, config, tempDir);

    const validResult = runTsc(tempDir);
    expect(validResult.success).toBe(true);

    // 2. Invalid: .use() after .params()
    writeFileSync(
      join(routesDir, "invalid.get.ts"),
      `import { t } from "@taserjs/router";
import { schema } from "../schema.js";
export default t
  .get("/invalid")
  .params(schema)
  .use(async (_args, next) => next())
  .handler(() => new Response("ok"));
`,
    );
    const scanInvalid = scanRoutes({ routesDir, cwd: tempDir });
    generateManifest(scanInvalid, config, tempDir);

    const paramsError = runTsc(tempDir);
    expect(paramsError.success).toBe(false);
    expect(paramsError.output).toMatch(
      /Property 'use' does not exist on type 'RouteValidationBuilder/,
    );

    // 3. Invalid: .use() after .body()
    writeFileSync(
      join(routesDir, "invalid.get.ts"),
      `import { t } from "@taserjs/router";
import { schema } from "../schema.js";
export default t
  .get("/invalid")
  .body(schema)
  .use(async (_args, next) => next())
  .handler(() => new Response("ok"));
`,
    );
    const bodyError = runTsc(tempDir);
    expect(bodyError.success).toBe(false);
    expect(bodyError.output).toMatch(
      /Property 'use' does not exist on type 'RouteValidationBuilder/,
    );

    // 4. Invalid: .use() after .query()
    writeFileSync(
      join(routesDir, "invalid.get.ts"),
      `import { t } from "@taserjs/router";
import { schema } from "../schema.js";
export default t
  .get("/invalid")
  .query(schema)
  .use(async (_args, next) => next())
  .handler(() => new Response("ok"));
`,
    );
    const queryError = runTsc(tempDir);
    expect(queryError.success).toBe(false);
    expect(queryError.output).toMatch(
      /Property 'use' does not exist on type 'RouteValidationBuilder/,
    );

    // 5. Invalid: .use() after .returns()
    writeFileSync(
      join(routesDir, "invalid.get.ts"),
      `import { t } from "@taserjs/router";
import { schema } from "../schema.js";
export default t
  .get("/invalid")
  .returns({ 200: schema })
  .use(async (_args, next) => next())
  .handler(() => new Response("ok"));
`,
    );
    const returnsError = runTsc(tempDir);
    expect(returnsError.success).toBe(false);
    expect(returnsError.output).toMatch(
      /Property 'use' does not exist on type 'RouteValidationBuilder/,
    );
  });
});
