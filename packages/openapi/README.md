# @taserjs/openapi

OpenAPI Specification (v3.1) generator for [Taser](https://taserjs.dev) REST APIs with **automatic TypeScript return type inference**.

## Features

- 🚀 **Zero-Config Return Type Inference**: Infers OpenAPI response schemas directly from TypeScript return types and `reply.json()` signatures without requiring explicit `.returns()` declarations.
- 📦 **Standard Schema First**: Converts `query`, `params`, `body`, and `headers` schemas (Zod, Valibot, ArkType, TypeBox) into OpenAPI JSON schemas.
- 🛠️ **Standalone & Optional**: Zero modifications required to `@taserjs/router` core. Provides a `withDoc()` helper to attach summaries, tags, descriptions, and operation IDs.
- 💻 **CLI Executable**: Includes `taser-openapi` CLI tool to emit `openapi.yaml` or `openapi.json`.
- 🎨 **Scalar API Reference UI**: Built-in `renderScalarUi` helper to serve interactive API documentation endpoints.

## Installation

```bash
pnpm add -D @taserjs/openapi
```

## Programmatic Usage

```ts
import { generateOpenApi, withDoc } from "@taserjs/openapi";
import { routeManifest } from "./route-manifest.js";

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

## Attaching Route Documentation (`withDoc`)

```ts
import { withDoc } from "@taserjs/openapi";

export const Route = withDoc(
  {
    summary: "Get User By ID",
    description: "Fetches user details from database",
    tags: ["Users"],
    operationId: "getUserById",
  },
  t.get("/users/:id")
    .params(UserParamsSchema)
    .handler(async (ctx) => {
      const user = await db.users.find(ctx.params.id);
      return reply.json(user, { status: 200 });
    })
);
```

## CLI Usage

```bash
# Generate openapi.yaml
npx taser-openapi --manifest ./src/route-manifest.ts --out ./openapi.yaml --format yaml

# Generate openapi.json
npx taser-openapi --manifest ./src/route-manifest.ts --out ./public/openapi.json --format json
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
