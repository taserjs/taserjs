import { renderScalarUi, type ScalarUiOptions } from "./scalar.js";
import { renderSwaggerUi, type SwaggerUiOptions } from "./swagger.js";
import { renderRedocUi, type RedocUiOptions } from "./redoc.js";
import { renderElementsUi, type StoplightElementsOptions } from "./stoplight.js";

export type DocUiProvider = "scalar" | "swagger" | "redoc" | "elements";

export type OpenApiDocHandlerOptions = {
  /** The OpenAPI specification document (or a getter / generator returning it) */
  spec: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
  /** Documentation UI Provider (defaults to 'scalar') */
  provider?: DocUiProvider;
  /** UI specific configuration options */
  uiOptions?: ScalarUiOptions | SwaggerUiOptions | RedocUiOptions | StoplightElementsOptions;
  /** Custom base path for docs (e.g. '/docs') */
  docsPath?: string;
  /** Custom path for OpenAPI json (e.g. '/openapi.json') */
  jsonPath?: string;
};

/**
 * Creates a standard Web Fetch handler (`(req: Request) => Promise<Response | null>`)
 * that serves OpenAPI JSON spec and Interactive Documentation UIs.
 */
export function createOpenApiDocHandler(options: OpenApiDocHandlerOptions) {
  const provider = options.provider ?? "scalar";
  const docsPath = options.docsPath ?? "/docs";
  const jsonPath = options.jsonPath ?? "/openapi.json";

  const getSpec = async (): Promise<Record<string, unknown>> => {
    if (typeof options.spec === "function") {
      return options.spec();
    }
    return options.spec;
  };

  return async function handleOpenApiRequest(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // 1. Serve OpenAPI JSON spec
    if (pathname === jsonPath || pathname === `${jsonPath}/`) {
      const spec = await getSpec();
      return new Response(JSON.stringify(spec, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 2. Serve Interactive Documentation UI
    if (pathname === docsPath || pathname === `${docsPath}/` || pathname.startsWith(`${docsPath}/`)) {
      const spec = await getSpec();
      let html = "";

      switch (provider) {
        case "swagger":
          html = renderSwaggerUi({
            spec,
            specUrl: jsonPath,
            ...(options.uiOptions as SwaggerUiOptions | undefined),
          });
          break;
        case "redoc":
          html = renderRedocUi({
            spec,
            specUrl: jsonPath,
            ...(options.uiOptions as RedocUiOptions | undefined),
          });
          break;
        case "elements":
          html = renderElementsUi({
            spec,
            specUrl: jsonPath,
            ...(options.uiOptions as StoplightElementsOptions | undefined),
          });
          break;
        case "scalar":
        default:
          html = renderScalarUi({
            spec,
            specUrl: jsonPath,
            ...(options.uiOptions as ScalarUiOptions | undefined),
          });
          break;
      }

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return null;
  };
}
