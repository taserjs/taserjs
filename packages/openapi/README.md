# @taserjs/openapi

OpenAPI Specification (v3.1) generator for [Taser](https://taserjs.dev) REST APIs with **automatic TypeScript return type inference**.

## Features

- 🚀 **Zero-Config Return Type Inference**: Infers OpenAPI response schemas directly from TypeScript return types and `reply.json()` signatures without requiring explicit `.returns()` declarations.
- 📦 **Standard Schema First**: Converts `query`, `params`, `body`, and `headers` schemas (Zod, Valibot, ArkType, TypeBox) into OpenAPI JSON schemas.
- 🧠 **Generator-Aligned Defaults**: Infers tags from layout chains, operation IDs from route paths, and humanized summaries — using the same naming rules as the Taser route generator.
- 📝 **Docs Live in Route Files**: Declare documentation with a type-safe `export const OpenAPI = openapi({...})` or plain JSDoc comments above your Route export. No runtime wrapping required.
- 💻 **CLI Executable**: Includes `taser-openapi` CLI tool to emit `openapi.yaml` or `openapi.json`. Also available as `taser openapi` via `@taserjs/router-cli`.
- 🎨 **Scalar API Reference UI**: Built-in `renderScalarUi` helper to serve interactive API documentation endpoints.

## Installation

```bash
pnpm add -D @taserjs/openapi
```

## Programmatic Usage

```ts
import { generateOpenApi } from "@taserjs/openapi";
import { routeManifest } from "./routeManifest.gen.js";

// Generate OpenAPI Spec Document
const spec = generateOpenApi(routeManifest, {
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
  .get("/users/:id")
  .params(UserParamsSchema)
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
npx taser-openapi --out ./openapi.yaml --format yaml

# Generate openapi.json
npx taser-openapi --out ./public/openapi.json --format json

# Or via the taser CLI (proxies to taser-openapi when @taserjs/openapi is installed)
npx taser openapi --out ./openapi.yaml
```

## Serving Scalar API Documentation UI

```ts
import { renderScalarUi } from "@taserjs/openapi/ui";

app.get("/docs", () => {
  return new Response(renderScalarUi({ specUrl: "/openapi.json" }), {
    headers: { "content-type": "text/html" },
  });
});
```

## License

[ISC](LICENSE)
