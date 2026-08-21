import type { GenerateOpenApiOptions } from "../types.js";
import type { OpenApiSpec } from "../generator.js";
import yaml from "js-yaml";
import { renderScalarUi } from "./scalar.js";
import { renderSwaggerUi } from "./swagger.js";
import { renderRedocUi } from "./redoc.js";
import { renderElementsUi } from "./stoplight.js";

export type DocUiProvider = "scalar" | "swagger" | "redoc" | "elements";

export type OpenApiResponseFormat = "ui" | "json" | "yaml";

export type CreateOpenApiHandlerOptions = GenerateOpenApiOptions & {
  /** Documentation UI provider (defaults to 'scalar') */
  provider?: DocUiProvider;
};

/**
 * Creates an async handler that renders an {@link OpenApiSpec} into a Response.
 *
 * The handler is path-agnostic: mount it at any route in your framework and
 * decide per-request whether to serve the UI, JSON, or YAML representation.
 * It resolves the spec definition itself — generating from a manifest or
 * reading from a file as needed (results are cached after the first call).
 *
 * ```ts
 * const options = { provider: "scalar", info: { title: "My API" } };
 * const handler = createOpenApiHandler(options);
 *
 * // Serve the interactive UI
 * handler(Spec.fromManifest(manifest, options));
 *
 * // Or serve raw representations conditionally
 * handler(spec, "json");
 * handler(spec, "yaml");
 * ```
 */
export function createOpenApiHandler(options: CreateOpenApiHandlerOptions = {}) {
  const provider = options.provider ?? "scalar";

  return async function handleOpenApiSpec(
    spec: OpenApiSpec,
    format: OpenApiResponseFormat = "ui",
  ): Promise<Response> {
    const document = await spec.resolve();

    if (format === "json") {
      return new Response(JSON.stringify(document, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (format === "yaml") {
      return new Response(yaml.dump(document, { indent: 2 }), {
        status: 200,
        headers: {
          "Content-Type": "application/yaml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    let html: string;

    switch (provider) {
      case "swagger":
        html = renderSwaggerUi({ spec: document });
        break;
      case "redoc":
        html = renderRedocUi({ spec: document });
        break;
      case "elements":
        html = renderElementsUi({ spec: document });
        break;
      case "scalar":
      default:
        html = renderScalarUi({ spec: document });
        break;
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  };
}
