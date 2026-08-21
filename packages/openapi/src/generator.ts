import { dirname, resolve } from "node:path";
import yaml from "js-yaml";
import ts from "typescript";

import type {
  GenerateOpenApiOptions,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiRequestBody,
  OpenApiResponse,
  OpenApiRouteDoc,
  OpenApiSecurityRequirement,
  OpenApiSecurityScheme,
  RouteManifestShape,
} from "./types.js";
import { formatOpenApiPath } from "./path.js";
import { standardSchemaToJsonSchema, standardSchemaToJsonSchemaAsync } from "./schema/index.js";
import { SchemaRegistry } from "./schema/registry.js";
import { detectMiddlewaresSecurity } from "./security/index.js";
import { extractRouteTypesFromProgram, type InferredResponse } from "./ts-compiler.js";

export class OpenApiSpec {
  constructor(public readonly document: OpenApiDocument) {}

  toJson(space = 2): string {
    return JSON.stringify(this.document, null, space);
  }

  toYaml(): string {
    return yaml.dump(this.document, { indent: 2 });
  }

  toObject(): OpenApiDocument {
    return this.document;
  }
}

/**
 * Generates an OpenAPI v3.1 specification document synchronously.
 */
export function generateOpenApi(
  manifest: RouteManifestShape,
  options: GenerateOpenApiOptions = {},
): OpenApiSpec {
  const extracted = loadTypeScriptProgramData(options.tsconfigPath);
  const routeTypesMap = extracted.responses;
  const routeDocsMap = extracted.docs;

  const registry = new SchemaRegistry();
  const globalSecuritySchemes: Record<string, OpenApiSecurityScheme> = {
    ...options.securitySchemes,
  };
  const globalSecurity: OpenApiSecurityRequirement[] = [...(options.security ?? [])];

  const openApiPaths: Record<string, Record<string, OpenApiOperation>> = {};

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

      const layoutChain = Array.isArray((routeEntry as any).layoutChain)
        ? ((routeEntry as any).layoutChain as string[])
        : [];
      const doc = resolveRouteDoc(taserPath, method, layoutChain, routeDocsMap);

      if (doc.hidden && !options.includeHiddenRoutes) {
        continue;
      }

      // Middlewares security detection
      const allMiddlewares = [
        ...(Array.isArray((routeEntry as any).middlewares) ? (routeEntry as any).middlewares : []),
        ...(Array.isArray(route.middlewares) ? route.middlewares : []),
        ...(Array.isArray(route.handlerMiddlewares) ? route.handlerMiddlewares : []),
      ];
      const securityInfo = detectMiddlewaresSecurity(allMiddlewares);
      Object.assign(globalSecuritySchemes, securityInfo.schemes);

      // Path & Query & Header & Cookie Parameters
      const parameters: OpenApiParameter[] = buildRouteParameters(
        taserPath,
        pathParamNames,
        route,
        (s) => standardSchemaToJsonSchema(s, options),
      );

      if (doc.parameters) {
        parameters.push(...doc.parameters);
      }

      // Request Body
      let requestBody: OpenApiRequestBody | undefined;
      if (route.body) {
        const bodySchema = standardSchemaToJsonSchema(route.body, options);
        requestBody = buildRequestBody(bodySchema);
      }
      if (doc.requestBody) {
        requestBody = mergeRequestBody(requestBody, doc.requestBody);
      }

      // Responses
      const responses = buildResponses(
        route,
        doc,
        routeTypesMap.get(`${taserPath}:${method.toUpperCase()}`),
        options,
        (s) => standardSchemaToJsonSchema(s, options),
      );

      const operation: OpenApiOperation = {
        summary: doc.summary ?? inferSummary(taserPath, method),
        responses,
        ...(doc.description ? { description: doc.description } : {}),
        ...(doc.tags ? { tags: doc.tags } : {}),
        ...(doc.operationId ? { operationId: doc.operationId } : { operationId: inferOperationId(taserPath, method) }),
        ...(doc.deprecated !== undefined ? { deprecated: doc.deprecated } : {}),
        ...(parameters.length > 0 ? { parameters } : {}),
        ...(requestBody ? { requestBody } : {}),
        ...(doc.security !== undefined
          ? { security: doc.security }
          : securityInfo.requirements.length > 0
            ? { security: securityInfo.requirements }
            : {}),
        ...(doc.externalDocs ? { externalDocs: doc.externalDocs } : {}),
        ...(doc.servers ? { servers: doc.servers } : {}),
      };

      openApiPaths[openApiPath][method.toLowerCase()] = operation;
    }
  }

  const document: OpenApiDocument = buildDocument(
    options,
    openApiPaths,
    globalSecurity,
    globalSecuritySchemes,
    registry,
  );

  return new OpenApiSpec(document);
}

/**
 * Generates an OpenAPI v3.1 specification document asynchronously,
 * supporting asynchronous schema transformers (such as xsschema).
 */
export async function generateOpenApiAsync(
  manifest: RouteManifestShape,
  options: GenerateOpenApiOptions = {},
): Promise<OpenApiSpec> {
  const extracted = loadTypeScriptProgramData(options.tsconfigPath);
  const routeTypesMap = extracted.responses;
  const routeDocsMap = extracted.docs;

  const registry = new SchemaRegistry();
  const globalSecuritySchemes: Record<string, OpenApiSecurityScheme> = {
    ...options.securitySchemes,
  };
  const globalSecurity: OpenApiSecurityRequirement[] = [...(options.security ?? [])];

  const openApiPaths: Record<string, Record<string, OpenApiOperation>> = {};

  type RouteJob = {
    taserPath: string;
    openApiPath: string;
    pathParamNames: string[];
    method: string;
    route: any;
    layoutChain: string[];
    allMiddlewares: any[];
    doc: OpenApiRouteDoc;
  };

  const jobs: RouteJob[] = [];

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

      const layoutChain = Array.isArray((routeEntry as any).layoutChain)
        ? ((routeEntry as any).layoutChain as string[])
        : [];
      const doc = resolveRouteDoc(taserPath, method, layoutChain, routeDocsMap);

      if (doc.hidden && !options.includeHiddenRoutes) {
        continue;
      }

      const allMiddlewares = [
        ...(Array.isArray((routeEntry as any).middlewares) ? (routeEntry as any).middlewares : []),
        ...(Array.isArray(route.middlewares) ? route.middlewares : []),
        ...(Array.isArray(route.handlerMiddlewares) ? route.handlerMiddlewares : []),
      ];

      jobs.push({
        taserPath,
        openApiPath,
        pathParamNames,
        method,
        route,
        layoutChain,
        allMiddlewares,
        doc,
      });
    }
  }

  // Process all route jobs in parallel
  await Promise.all(
    jobs.map(async (job) => {
      const { taserPath, openApiPath, pathParamNames, method, route, allMiddlewares, doc } = job;

      const securityInfo = detectMiddlewaresSecurity(allMiddlewares);
      Object.assign(globalSecuritySchemes, securityInfo.schemes);

      // Async schema conversions
      const [pathParamsSchema, querySchema, bodySchema, returnsSchemas] = await Promise.all([
        route.params ? standardSchemaToJsonSchemaAsync(route.params, options) : Promise.resolve(undefined),
        route.query ? standardSchemaToJsonSchemaAsync(route.query, options) : Promise.resolve(undefined),
        route.body ? standardSchemaToJsonSchemaAsync(route.body, options) : Promise.resolve(undefined),
        route.returns && typeof route.returns === "object"
          ? Promise.all(
              Object.entries(route.returns).map(async ([status, schema]) => ({
                status: String(status),
                schema: await standardSchemaToJsonSchemaAsync(schema, options),
              })),
            )
          : Promise.resolve([]),
      ]);

      const parameters: OpenApiParameter[] = [];

      for (const paramName of pathParamNames) {
        const propsMap = pathParamsSchema?.properties as Record<string, unknown> | undefined;
        const propSchema = propsMap?.[paramName] as Record<string, unknown> | undefined;
        parameters.push({
          name: paramName,
          in: "path",
          required: true,
          schema: propSchema ?? { type: "string" },
          ...(propSchema?.description ? { description: String(propSchema.description) } : {}),
        });
      }

      if (querySchema?.properties && typeof querySchema.properties === "object") {
        for (const [name, schema] of Object.entries(
          querySchema.properties as Record<string, unknown>,
        )) {
          const isReq = Array.isArray(querySchema.required) && querySchema.required.includes(name);
          parameters.push({
            name,
            in: "query",
            required: isReq,
            schema: schema as Record<string, unknown>,
            ...((schema as any)?.description
              ? { description: String((schema as any).description) }
              : {}),
          });
        }
      }

      if (doc.parameters) {
        parameters.push(...doc.parameters);
      }

      let requestBody: OpenApiRequestBody | undefined;
      if (bodySchema) {
        requestBody = buildRequestBody(bodySchema);
      }
      if (doc.requestBody) {
        requestBody = mergeRequestBody(requestBody, doc.requestBody);
      }

      // Responses
      const responses: Record<string, OpenApiResponse> = {};

      for (const item of returnsSchemas) {
        responses[item.status] = {
          description: defaultStatusDescription(Number(item.status)),
          content: {
            "application/json": { schema: item.schema },
          },
        };
      }

      const inferredMap = routeTypesMap.get(`${taserPath}:${method.toUpperCase()}`);
      if (inferredMap) {
        for (const [statusCode, inferred] of Object.entries(inferredMap)) {
          if (!responses[String(statusCode)]) {
            const inf = inferred as InferredResponse;
            responses[String(statusCode)] = {
              description: inf.description ?? defaultStatusDescription(Number(statusCode)),
              ...(inf.content !== undefined ? { content: inf.content } : {}),
            };
          }
        }
      }

      const has2xx = Object.keys(responses).some((status) => status.startsWith("2"));
      if (!has2xx) {
        responses["200"] = {
          description: "Successful response",
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        };
      }

      const auto422 = options.autoValidationErrorResponses !== false;
      if (auto422 && hasInputValidation(route) && !responses["422"]) {
        responses["422"] = defaultValidationErrorResponse();
      }

      if (doc.responses) {
        applyDocResponses(responses, doc.responses);
      }

      const operation: OpenApiOperation = {
        summary: doc.summary ?? inferSummary(taserPath, method),
        responses,
        ...(doc.description ? { description: doc.description } : {}),
        ...(doc.tags ? { tags: doc.tags } : {}),
        ...(doc.operationId ? { operationId: doc.operationId } : { operationId: inferOperationId(taserPath, method) }),
        ...(doc.deprecated !== undefined ? { deprecated: doc.deprecated } : {}),
        ...(parameters.length > 0 ? { parameters } : {}),
        ...(requestBody ? { requestBody } : {}),
        ...(doc.security !== undefined
          ? { security: doc.security }
          : securityInfo.requirements.length > 0
            ? { security: securityInfo.requirements }
            : {}),
        ...(doc.externalDocs ? { externalDocs: doc.externalDocs } : {}),
        ...(doc.servers ? { servers: doc.servers } : {}),
      };

      if (!openApiPaths[openApiPath]) {
        openApiPaths[openApiPath] = {};
      }
      openApiPaths[openApiPath]![method.toLowerCase()] = operation;
    }),
  );

  const document: OpenApiDocument = buildDocument(
    options,
    openApiPaths,
    globalSecurity,
    globalSecuritySchemes,
    registry,
  );

  return new OpenApiSpec(document);
}

function loadTypeScriptProgramData(tsconfigPath?: string) {
  const absoluteTsconfig = tsconfigPath
    ? resolve(process.cwd(), tsconfigPath)
    : resolve(process.cwd(), "./tsconfig.json");
  const configDir = dirname(absoluteTsconfig);
  try {
    const configFile = ts.readConfigFile(absoluteTsconfig, ts.sys.readFile);
    if (!configFile.error) {
      const parsedCmd = ts.parseJsonConfigFileContent(configFile.config, ts.sys, configDir);
      const program = ts.createProgram(parsedCmd.fileNames, parsedCmd.options);
      return extractRouteTypesFromProgram(program);
    }
  } catch {
    // Graceful fallback
  }
  return { responses: new Map(), docs: new Map() };
}

function isMultipartSchema(schema: Record<string, unknown>): boolean {
  if (schema.format === "binary") return true;
  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
    for (const prop of Object.values(schema.properties as Record<string, unknown>)) {
      if (prop && typeof prop === "object") {
        if ((prop as any).format === "binary") return true;
        if ((prop as any).type === "array" && (prop as any).items?.format === "binary") return true;
      }
    }
  }
  return false;
}

function buildRequestBody(bodySchema: Record<string, unknown>): OpenApiRequestBody {
  if (bodySchema["x-content-type"] === "application/x-www-form-urlencoded") {
    return {
      required: true,
      content: {
        "application/x-www-form-urlencoded": { schema: bodySchema },
      },
    };
  }

  const isMultipart = isMultipartSchema(bodySchema);
  if (isMultipart) {
    if (bodySchema.format === "binary") {
      return {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                file: bodySchema,
              },
              required: ["file"],
            },
          },
          "application/octet-stream": {
            schema: bodySchema,
          },
        },
      };
    }
    return {
      required: true,
      content: {
        "multipart/form-data": {
          schema: bodySchema,
        },
      },
    };
  }

  return {
    required: true,
    content: {
      "application/json": { schema: bodySchema },
    },
  };
}

function mergeRequestBody(
  base: OpenApiRequestBody | undefined,
  override: Partial<OpenApiRequestBody>,
): OpenApiRequestBody {
  const content = {
    ...(base?.content),
    ...(override.content),
  };
  return {
    ...base,
    ...override,
    content,
  } as OpenApiRequestBody;
}

function buildResponses(
  route: any,
  doc: OpenApiRouteDoc,
  inferredMap: Record<number, InferredResponse> | undefined,
  options: GenerateOpenApiOptions,
  toSchema: (schema: unknown) => Record<string, unknown>,
): Record<string, OpenApiResponse> {
  const responses: Record<string, OpenApiResponse> = {};

  // 1. Explicit .returns()
  if (route.returns && typeof route.returns === "object") {
    for (const [statusCode, schema] of Object.entries(route.returns)) {
      const respSchema = toSchema(schema);
      responses[String(statusCode)] = {
        description: defaultStatusDescription(Number(statusCode)),
        content: {
          "application/json": { schema: respSchema },
        },
      };
    }
  }

  // 2. Inferred responses
  if (inferredMap) {
    for (const [statusCode, inferred] of Object.entries(inferredMap)) {
      if (!responses[String(statusCode)]) {
        const inf = inferred as InferredResponse;
        responses[String(statusCode)] = {
          description: inf.description ?? defaultStatusDescription(Number(statusCode)),
          ...(inf.content !== undefined ? { content: inf.content } : {}),
        };
      }
    }
  }

  // 3. Guaranteed 2xx response
  const has2xx = Object.keys(responses).some((status) => status.startsWith("2"));
  if (!has2xx) {
    responses["200"] = {
      description: "Successful response",
      content: {
        "application/json": {
          schema: { type: "object" },
        },
      },
    };
  }

  // 4. Auto 422
  const auto422 = options.autoValidationErrorResponses !== false;
  if (auto422 && hasInputValidation(route) && !responses["422"]) {
    responses["422"] = defaultValidationErrorResponse();
  }

  // 5. Doc overrides
  if (doc.responses) {
    applyDocResponses(responses, doc.responses);
  }

  return responses;
}

function applyDocResponses(
  responses: Record<string, OpenApiResponse>,
  docResponses: Record<string | number, unknown>,
) {
  for (const [status, resp] of Object.entries(docResponses)) {
    if (resp && typeof resp === "object") {
      if ("content" in resp || "description" in resp) {
        responses[String(status)] = {
          description: (resp as any).description ?? defaultStatusDescription(Number(status)),
          ...(resp as any),
        };
      } else {
        responses[String(status)] = {
          description: defaultStatusDescription(Number(status)),
          content: {
            "application/json": { schema: resp as Record<string, unknown> },
          },
        };
      }
    }
  }
}

function defaultValidationErrorResponse(): OpenApiResponse {
  return {
    description: "Unprocessable Entity",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  path: { type: "array", items: { type: "string" } },
                },
                required: ["message"],
              },
            },
          },
          required: ["errors"],
        },
      },
    },
  };
}

function buildDocument(
  options: GenerateOpenApiOptions,
  paths: Record<string, Record<string, OpenApiOperation>>,
  globalSecurity: OpenApiSecurityRequirement[],
  globalSecuritySchemes: Record<string, OpenApiSecurityScheme>,
  registry: SchemaRegistry,
): OpenApiDocument {
  const registeredSchemas = registry.toComponents();
  const hasSecuritySchemes = Object.keys(globalSecuritySchemes).length > 0;
  const hasSchemas = Object.keys(registeredSchemas).length > 0;

  const components: OpenApiDocument["components"] = {
    ...options.components,
    ...(hasSecuritySchemes ? { securitySchemes: globalSecuritySchemes } : {}),
    ...(hasSchemas
      ? { schemas: { ...options.components?.schemas, ...registeredSchemas } }
      : {}),
  };

  return {
    openapi: options.openapiVersion ?? "3.1.0",
    info: {
      title: options.info?.title ?? "Taser REST API",
      version: options.info?.version ?? "1.0.0",
      description: options.info?.description ?? "API generated with @taserjs/openapi",
      ...(options.info?.termsOfService ? { termsOfService: options.info.termsOfService } : {}),
      ...(options.info?.contact ? { contact: options.info.contact } : {}),
      ...(options.info?.license ? { license: options.info.license } : {}),
    },
    servers: options.servers ?? [{ url: "/" }],
    paths,
    ...(options.tags ? { tags: options.tags } : {}),
    ...(globalSecurity.length > 0 ? { security: globalSecurity } : {}),
    ...(options.externalDocs ? { externalDocs: options.externalDocs } : {}),
    ...(Object.keys(components).length > 0 ? { components } : { components: {} }),
  };
}

function buildRouteParameters(
  taserPath: string,
  pathParamNames: string[],
  route: any,
  toSchema: (schema: unknown) => Record<string, unknown>,
): OpenApiParameter[] {
  const parameters: OpenApiParameter[] = [];

  const pathParamsSchema = route.params ? toSchema(route.params) : undefined;

  for (const paramName of pathParamNames) {
    const propsMap = pathParamsSchema?.properties as Record<string, unknown> | undefined;
    const propSchema = propsMap?.[paramName] as Record<string, unknown> | undefined;
    parameters.push({
      name: paramName,
      in: "path",
      required: true,
      schema: propSchema ?? { type: "string" },
      ...(propSchema?.description ? { description: String(propSchema.description) } : {}),
    });
  }

  if (route.query) {
    const querySchema = toSchema(route.query);
    if (querySchema.properties && typeof querySchema.properties === "object") {
      for (const [name, schema] of Object.entries(
        querySchema.properties as Record<string, unknown>,
      )) {
        const isReq = Array.isArray(querySchema.required) && querySchema.required.includes(name);
        parameters.push({
          name,
          in: "query",
          required: isReq,
          schema: schema as Record<string, unknown>,
          ...((schema as any)?.description
            ? { description: String((schema as any).description) }
            : {}),
        });
      }
    }
  }

  return parameters;
}

function hasInputValidation(route: any): boolean {
  return Boolean(
    route.query ||
      route.params ||
      route.body ||
      route.handlerQuery ||
      route.handlerParams ||
      route.handlerBody,
  );
}

function defaultStatusDescription(status: number): string {
  switch (status) {
    case 200:
      return "OK";
    case 201:
      return "Created";
    case 202:
      return "Accepted";
    case 204:
      return "No Content";
    case 301:
      return "Moved Permanently";
    case 302:
      return "Found";
    case 307:
      return "Temporary Redirect";
    case 308:
      return "Permanent Redirect";
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 409:
      return "Conflict";
    case 413:
      return "Payload Too Large";
    case 415:
      return "Unsupported Media Type";
    case 422:
      return "Unprocessable Entity";
    case 429:
      return "Too Many Requests";
    case 500:
      return "Internal Server Error";
    case 501:
      return "Not Implemented";
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    case 504:
      return "Gateway Timeout";
    default:
      return `Response for status ${status}`;
  }
}

function segmentToPascal(segment: string): string {
  const clean = segment.replace(/\[(.*?)\]/g, "$1");
  if (clean === "index") {
    return "Index";
  }
  if (clean.startsWith("_")) {
    return clean.slice(1).charAt(0).toUpperCase() + clean.slice(2);
  }
  if (clean.startsWith("$")) {
    const paramName = clean.slice(1);
    if (paramName === "") {
      return "Splat";
    }
    return paramName.charAt(0).toUpperCase() + paramName.slice(1);
  }
  if (clean.endsWith("_")) {
    const base = clean.slice(0, -1);
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  const sanitized = clean.replace(/[^a-zA-Z0-9_]/g, "");
  return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
}

function inferTags(taserPath: string, layoutChain: string[]): string[] | undefined {
  const source =
    layoutChain.length > 0 ? layoutChain : taserPath.split("/").filter(Boolean).slice(0, 1);
  const tags = source
    .flatMap((segment) => segment.split("/"))
    .filter((segment) => segment.length > 0)
    .map(segmentToPascal);
  return tags.length > 0 ? tags : undefined;
}

function inferOperationId(taserPath: string, method: string): string {
  const segments = taserPath
    .split("/")
    .filter((segment) => segment.length > 0 && !segment.startsWith("*"))
    .map((segment) => segment.replace(/^:/, "$"));
  const pathName = segments.map(segmentToPascal).join("");
  const methodPart = method.charAt(0).toLowerCase() + method.slice(1).toLowerCase();
  return `${methodPart}${pathName}`;
}

function inferSummary(taserPath: string, method: string): string {
  const parts: string[] = [];
  for (const segment of taserPath.split("/")) {
    if (segment.length === 0) continue;
    if (segment.startsWith("*")) continue;
    if (segment.startsWith(":")) {
      parts.push(`by ${segment.slice(1)}`);
    } else {
      parts.push(segment);
    }
  }
  const methodTitle = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  return [methodTitle, ...parts].join(" ");
}

function resolveRouteDoc(
  taserPath: string,
  method: string,
  layoutChain: string[],
  routeDocsMap: Map<string, OpenApiRouteDoc>,
): OpenApiRouteDoc {
  const explicit = routeDocsMap.get(`${taserPath}:${method.toUpperCase()}`);
  const doc: OpenApiRouteDoc = {
    summary: explicit?.summary ?? inferSummary(taserPath, method),
    operationId: explicit?.operationId ?? inferOperationId(taserPath, method),
    deprecated: explicit?.deprecated ?? false,
    hidden: explicit?.hidden ?? false,
  };
  const tags = explicit?.tags ?? inferTags(taserPath, layoutChain);
  if (tags !== undefined) {
    doc.tags = tags;
  }
  if (explicit?.description !== undefined) {
    doc.description = explicit.description;
  }
  if (explicit?.externalDocs !== undefined) {
    doc.externalDocs = explicit.externalDocs;
  }
  if (explicit?.security !== undefined) {
    doc.security = explicit.security;
  }
  if (explicit?.requestBody !== undefined) {
    doc.requestBody = explicit.requestBody;
  }
  if (explicit?.responses !== undefined) {
    doc.responses = explicit.responses;
  }
  if (explicit?.parameters !== undefined) {
    doc.parameters = explicit.parameters;
  }
  if (explicit?.servers !== undefined) {
    doc.servers = explicit.servers;
  }
  return doc;
}
