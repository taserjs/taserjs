# @taserjs/openapi

OpenAPI Specification (v3.1) generator for [Taser](https://taserjs.dev) REST APIs with **automatic TypeScript return type inference**.

## Features

- 🚀 **Zero-Config Return Type Inference**: Infers OpenAPI response schemas directly from TypeScript return types and `reply.json()` signatures without requiring explicit `.returns()` declarations.
- 📦 **Standard Schema First**: Converts `query`, `params`, `body`, and `headers` schemas (Zod, Valibot, ArkType, TypeBox) into OpenAPI JSON schemas.
- 🧠 **Generator-Aligned Defaults**: Infers tags from layout chains, operation IDs from route paths, and humanized summaries — using the same naming rules as the Taser route generator.
- 📝 **Docs Live in Route Files**: Declare documentation with a type-safe `export const OpenAPI = openapi({...})` or plain JSDoc comments above your Route export. No runtime wrapping required.
- 💻 **CLI Executable**: Run `npx @taserjs/openapi` to emit `openapi.yaml` or `openapi.json`. Also available as `taser openapi` via `@taserjs/router-cli`.
- 🎨 **Built-in Documentation UI**: `createOpenApiHandler` serves Scalar, Swagger UI, Redoc, or Stoplight Elements with the spec inlined — no extra routes required.

## Installation

```bash
pnpm add -D @taserjs/openapi
```

## Programmatic Usage

```ts
import { generateOpenApi } from "@taserjs/openapi";
import { routeManifest } from "./routeManifest.gen.js";

// Generate OpenAPI Spec Document
const spec = await generateOpenApi(routeManifest, {
  info: {
    title: "My Taser Service API",
    version: "1.0.0",
    description: "Production API specification",
  },
  servers: [{ url: "https://api.example.com/v1" }],
  tsconfigPath: "./tsconfig.json",
});

// Export as YAML or JSON
console.log(spec.toYaml());
console.log(spec.toJson());
```

## Documenting Routes

### Option 1: Type-safe `OpenAPI` export (preferred)

Add an `OpenAPI` export next to your `Route` export in any route file:

```ts
import { openapi } from "@taserjs/openapi";

export const OpenAPI = openapi({
  summary: "Get User By ID",
  description: "Fetches user details from database",
  tags: ["Users"],
  operationId: "getUserById",
});

export const Route = t
  .get("/users/:id", {
    params: UserParamsSchema,
  })
  .handler(async (ctx) => {
    const user = await db.users.find(ctx.params.id);
    return reply.json(user, { status: 200 });
  });
```

Supported fields: `summary`, `description`, `tags`, `operationId`, `deprecated`, `externalDocs`.

### Option 2: JSDoc comments on the Route export

```ts
/**
 * Get User By ID
 *
 * Fetches user details from database.
 * @tag Users
 * @deprecated
 */
export const Route = t.get("/users/:id").handler(/* ... */);
```

Supported JSDoc tags: `@summary`, `@description`, `@tag` (repeatable), `@operationId`, `@deprecated`, `@externalDocs <url>`.

If both are present, the `OpenAPI` export wins.

### Inferred defaults

When no explicit docs exist, defaults are inferred from the generated route manifest:

- **tags** — PascalCased layout chain segments (`layoutChain: ["users"]` → `["Users"]`)
- **operationId** — method + PascalCased path (`GET /users/:id` → `getUsersId`)
- **summary** — humanized method + path (`GET /users/:id` → `Get users by id`)

Explicit docs always override inferred defaults.

## CLI Usage

```bash
# Generate openapi.yaml (manifest path resolved from taser.config.json)
npx @taserjs/openapi --out ./openapi.yaml --format yaml

# Generate openapi.json
npx @taserjs/openapi --out ./public/openapi.json --format json

# Or via a package.json script using the unified taser CLI
# (proxies to this package's CLI when installed as a dependency):
#   "scripts": { "openapi:generate": "taser openapi --out ./openapi.yaml" }
pnpm openapi:generate
```

## Serving API Documentation

`createOpenApiHandler` accepts `GenerateOpenApiOptions` plus a `provider` key and returns an async handler that turns a spec into a `Response`. It is path-agnostic — mount it on your host framework app next to the Taser router:

> [!WARNING]
> Do not serve docs from a Taser route file. Route files are imported by the generated
> route manifest, so importing `routeManifest` back into a route file creates a cyclic
> reference. Mount the handler on your host framework app instead — there, using
> `fromManifest` for live docs is safe.

```ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createOpenApiHandler, OpenApiSpec } from "@taserjs/openapi";
import { routeManifest } from "./routeManifest.gen.js";
import { t } from "#src/taser.js";

const router = t.create(routeManifest);
const handler = createOpenApiHandler({
  provider: "scalar",
  info: { title: "My Taser Service API", version: "1.0.0" },
});
const spec = OpenApiSpec.fromManifest(routeManifest); // lazy definition; the handler resolves it

const app = new Hono();
app.get("/docs", () => handler(spec)); // Interactive UI (default)
app.get("/openapi.json", (c) => handler(spec, "json"));
app.get("/openapi.yaml", (c) => handler(spec, "yaml"));
app.all("/taser/*", (c) => router.fetch(c.req.raw));

serve({ fetch: app.fetch, port: 3001 });
```

Prefer static docs? Generate the spec file at build time and load it:

```bash
npx taser-openapi --out ./openapi.yaml
```

```ts
const spec = OpenApiSpec.fromFile("./openapi.yaml");
```

Specs can also be parsed from strings:

```ts
const spec = OpenApiSpec.fromFile("./openapi.yaml");
const spec = OpenApiSpec.fromURL("https://api.example.com/openapi.json");
const spec = OpenApiSpec.fromJson(jsonString);
const spec = OpenApiSpec.fromYaml(yamlString);
```

Providers: `"scalar"` (default), `"swagger"`, `"redoc"`, `"elements"`.

## License

[ISC](LICENSE)
