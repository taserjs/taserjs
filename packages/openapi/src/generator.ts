import yaml from "js-yaml";
import ts from "typescript";

import { getRouteDoc } from "./doc.js";
import { formatOpenApiPath } from "./path.js";
import { standardSchemaToJsonSchema } from "./schema.js";
import { extractRouteTypesFromProgram } from "./ts-compiler.js";

export type RouteManifestShape = {
  layouts?: Record<string, any>;
  routes: Record<string, Record<string, any>>;
};

export type GenerateOpenApiOptions = {
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  tsconfigPath?: string;
};

export class OpenApiSpec {
  constructor(public readonly document: Record<string, unknown>) {}

  toJson(space = 2): string {
    return JSON.stringify(this.document, null, space);
  }

  toYaml(): string {
    return yaml.dump(this.document, { indent: 2 });
  }
}

export function generateOpenApi(
  manifest: RouteManifestShape,
  options: GenerateOpenApiOptions = {},
): OpenApiSpec {
  const tsconfig = options.tsconfigPath ?? "./tsconfig.json";
  let routeTypesMap = new Map<string, Record<number, Record<string, unknown>>>();

  try {
    const configFile = ts.readConfigFile(tsconfig, ts.sys.readFile);
    if (!configFile.error) {
      const parsedCmd = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./");
      const program = ts.createProgram(parsedCmd.fileNames, parsedCmd.options);
      routeTypesMap = extractRouteTypesFromProgram(program);
    }
  } catch {
    // Graceful fallback if tsconfig is not accessible or incomplete
  }

  const openApiPaths: Record<string, any> = {};

  for (const [taserPath, methods] of Object.entries(manifest.routes)) {
    const { openApiPath, pathParamNames } = formatOpenApiPath(taserPath);
    if (!openApiPaths[openApiPath]) {
      openApiPaths[openApiPath] = {};
    }

    if (!methods || typeof methods !== "object") continue;

    for (const [method, routeEntry] of Object.entries(methods)) {
      if (!routeEntry || typeof routeEntry !== "object") continue;
      const route = (routeEntry as any).route as any;
      if (!route) continue;

      const doc = getRouteDoc(route);

      const parameters: any[] = [];

      for (const paramName of pathParamNames) {
        parameters.push({
          name: paramName,
          in: "path",
          required: true,
          schema: { type: "string" },
        });
      }

      if (route.query) {
        const querySchema = standardSchemaToJsonSchema(route.query);
        if (querySchema.properties && typeof querySchema.properties === "object") {
          for (const [name, schema] of Object.entries(querySchema.properties as Record<string, unknown>)) {
            parameters.push({
              name,
              in: "query",
              required: Array.isArray(querySchema.required) && querySchema.required.includes(name),
              schema,
            });
          }
        }
      }

      let requestBody: any = undefined;
      if (route.body) {
        requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: standardSchemaToJsonSchema(route.body),
            },
          },
        };
      }

      const responses: Record<string, any> = {};

      // 1. Check explicit .returns()
      if (route.returns) {
        for (const [statusCode, schema] of Object.entries(route.returns)) {
          responses[statusCode] = {
            description: `Response for status ${statusCode}`,
            content: {
              "application/json": {
                schema: standardSchemaToJsonSchema(schema),
              },
            },
          };
        }
      }

      // 2. Infer via TS Compiler routeTypesMap if .returns() was omitted
      if (Object.keys(responses).length === 0) {
        const routeKey = `${taserPath}:${method.toUpperCase()}`;
        if (routeTypesMap.has(routeKey)) {
          const inferredMap = routeTypesMap.get(routeKey)!;
          for (const [statusCode, schema] of Object.entries(inferredMap)) {
            responses[statusCode] = {
              description: `Response for status ${statusCode}`,
              content: {
                "application/json": {
                  schema,
                },
              },
            };
          }
        }
      }

      // 3. Fallback response
      if (Object.keys(responses).length === 0) {
        responses["200"] = {
          description: "Successful response",
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        };
      }

      openApiPaths[openApiPath][method.toLowerCase()] = {
        summary: doc?.summary ?? `${method} ${taserPath}`,
        description: doc?.description,
        tags: doc?.tags ?? [],
        operationId: doc?.operationId,
        deprecated: doc?.deprecated ?? false,
        parameters: parameters.length > 0 ? parameters : undefined,
        requestBody,
        responses,
      };
    }
  }

  const document = {
    openapi: "3.1.0",
    info: {
      title: options.info?.title ?? "Taser REST API",
      version: options.info?.version ?? "1.0.0",
      description: options.info?.description ?? "API generated with @taserjs/openapi",
    },
    servers: options.servers ?? [{ url: "/" }],
    paths: openApiPaths,
  };

  return new OpenApiSpec(document);
}
