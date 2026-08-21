export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD" | "TRACE";

export type OpenApiParameterIn = "query" | "header" | "path" | "cookie";

export type OpenApiParameter = {
  name: string;
  in: OpenApiParameterIn;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  schema?: Record<string, unknown>;
  example?: unknown;
  examples?: Record<string, { summary?: string; description?: string; value?: unknown }>;
};

export type OpenApiMediaType = {
  schema?: Record<string, unknown>;
  example?: unknown;
  examples?: Record<string, { summary?: string; description?: string; value?: unknown }>;
  encoding?: Record<string, unknown>;
};

export type OpenApiRequestBody = {
  description?: string;
  content: Record<string, OpenApiMediaType>;
  required?: boolean;
};

export type OpenApiHeader = {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: Record<string, unknown>;
  example?: unknown;
};

export type OpenApiResponse = {
  description?: string;
  headers?: Record<string, OpenApiHeader>;
  content?: Record<
    string,
    { schema: Record<string, unknown>; example?: unknown; examples?: Record<string, unknown> }
  >;
  links?: Record<string, unknown>;
};

export type OpenApiSecurityRequirement = Record<string, string[]>;

export type OpenApiExternalDocs = {
  description?: string;
  url: string;
};

export type OpenApiTag = {
  name: string;
  description?: string;
  externalDocs?: OpenApiExternalDocs;
};

export type OpenApiServer = {
  url: string;
  description?: string;
  variables?: Record<string, { default: string; enum?: string[]; description?: string }>;
};

export type OpenApiInfo = {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
    identifier?: string;
  };
};

export type OpenApiSecurityScheme = {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect" | "mutualTLS";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
  openIdConnectUrl?: string;
};

export type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: OpenApiExternalDocs;
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  deprecated?: boolean;
  security?: OpenApiSecurityRequirement[];
  servers?: OpenApiServer[];
};

export type OpenApiComponents = {
  schemas?: Record<string, Record<string, unknown>>;
  responses?: Record<string, OpenApiResponse>;
  parameters?: Record<string, OpenApiParameter>;
  requestBodies?: Record<string, OpenApiRequestBody>;
  securitySchemes?: Record<string, OpenApiSecurityScheme>;
  headers?: Record<string, unknown>;
};

export type OpenApiDocument = {
  openapi: "3.1.0" | "3.0.3" | "3.0.0";
  info: OpenApiInfo;
  servers?: OpenApiServer[];
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: OpenApiComponents;
  security?: OpenApiSecurityRequirement[];
  tags?: OpenApiTag[];
  externalDocs?: OpenApiExternalDocs;
};

export type OpenApiRouteDoc = {
  /** Short summary of what the route does */
  summary?: string;
  /** Detailed description of the route behavior */
  description?: string;
  /** Tags for logical grouping of endpoints */
  tags?: string[];
  /** Unique operation identifier */
  operationId?: string;
  /** Mark route as deprecated */
  deprecated?: boolean;
  /** External documentation link */
  externalDocs?: OpenApiExternalDocs;
  /** Security requirements for this specific route (overrides global) */
  security?: OpenApiSecurityRequirement[];
  /** Custom request body specification or override */
  requestBody?: Partial<OpenApiRequestBody>;
  /** Custom responses or schema overrides per status code */
  responses?: Record<number | string, Partial<OpenApiResponse> | Record<string, unknown>>;
  /** Additional parameter definitions or overrides */
  parameters?: OpenApiParameter[];
  /** Servers specific to this operation */
  servers?: OpenApiServer[];
  /** Hide this route from the generated OpenAPI specification */
  hidden?: boolean;
};

export type SchemaTransformer = (
  schema: unknown,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export type RouteManifestShape = {
  layouts?: Record<string, any>;
  routes: Record<string, Record<string, any>>;
};

export type GenerateOpenApiOptions = {
  /** OpenAPI Specification Info block */
  info?: Partial<OpenApiInfo>;
  /** Target OpenAPI version (defaults to '3.1.0') */
  openapiVersion?: "3.1.0" | "3.0.3";
  /** Server list */
  servers?: OpenApiServer[];
  /** Top-level tags metadata */
  tags?: OpenApiTag[];
  /** Global security requirements */
  security?: OpenApiSecurityRequirement[];
  /** Security scheme definitions in components */
  securitySchemes?: Record<string, OpenApiSecurityScheme>;
  /** Pre-defined component schemas */
  components?: Partial<OpenApiComponents>;
  /** External documentation */
  externalDocs?: OpenApiExternalDocs;
  /** Path to tsconfig.json for static TypeScript return type inference */
  tsconfigPath?: string;
  /** Custom schema transformer hook (e.g. For xsschema or custom converters) */
  transformSchema?: SchemaTransformer;
  /** Automatically include 422 validation error responses when input schemas are present (defaults to true) */
  autoValidationErrorResponses?: boolean;
  /** Include routes marked as hidden: true (defaults to false) */
  includeHiddenRoutes?: boolean;
};
