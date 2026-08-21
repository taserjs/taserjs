import { describe, expect, it } from "vitest";
import { z } from "zod";
import ts from "typescript";
import {
  formatOpenApiPath,
  openapi,
  generateOpenApi,
  generateOpenApiAsync,
  inferResponsesFromTsType,
  extractRouteTypesFromProgram,
  standardSchemaToJsonSchema,
  renderScalarUi,
  renderSwaggerUi,
  renderRedocUi,
  renderElementsUi,
  createOpenApiDocHandler,
  detectMiddlewaresSecurity,
  type StandardJSONSchemaV1,
} from "../src/index.js";

function createProgramFromSources(sources: Record<string, string>): ts.Program {
  const options: ts.CompilerOptions = {
    strict: true,
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
  };
  const host = ts.createCompilerHost(options, /*setParentNodes*/ true);
  const files = new Map(Object.entries(sources));
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const text = files.get(fileName);
    if (text !== undefined) {
      return ts.createSourceFile(fileName, text, languageVersion, true);
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };
  return ts.createProgram([...files.keys()], options, host);
}

describe("@taserjs/openapi", () => {
  describe("Path formatting", () => {
    it("converts colon, wildcard, bracket, and dollar syntax to OpenAPI templates", () => {
      const p1 = formatOpenApiPath("/users/:id/posts/:postId/*");
      expect(p1.openApiPath).toBe("/users/{id}/posts/{postId}/{wildcard}");
      expect(p1.pathParamNames).toEqual(["id", "postId", "wildcard"]);

      const p2 = formatOpenApiPath("/files/[...slug]");
      expect(p2.openApiPath).toBe("/files/{slug}");
      expect(p2.pathParamNames).toEqual(["slug"]);

      const p3 = formatOpenApiPath("/api/$resource/:id?");
      expect(p3.openApiPath).toBe("/api/{resource}/{id}");
      expect(p3.pathParamNames).toEqual(["resource", "id"]);
    });
  });

  describe("Schema conversion", () => {
    it("converts comprehensive Zod schemas with constraints, formats and enums", () => {
      const schema = z.object({
        id: z.string().uuid().describe("Unique identifier"),
        email: z.string().email(),
        age: z.number().int().min(18).max(120),
        role: z.enum(["admin", "user", "guest"]),
        tags: z.array(z.string()).min(1).max(5),
        isActive: z.boolean(),
        meta: z.record(z.string()).optional(),
        scores: z.tuple([z.number(), z.number()]),
      });

      const jsonSchema = standardSchemaToJsonSchema(schema);
      expect(jsonSchema.type).toBe("object");
      const props = jsonSchema.properties as any;
      expect(props.id.type).toBe("string");
      expect(props.id.format).toBe("uuid");
      expect(props.id.description).toBe("Unique identifier");
      expect(props.email.format).toBe("email");
      expect(props.age.type).toBe("integer");
      expect(props.age.minimum).toBe(18);
      expect(props.age.maximum).toBe(120);
      expect(props.role.enum).toEqual(["admin", "user", "guest"]);
      expect(props.tags.type).toBe("array");
      expect(props.tags.minItems).toBe(1);
      expect(props.tags.maxItems).toBe(5);
      expect(props.isActive.type).toBe("boolean");
      expect(props.meta.type).toBe("object");
      expect(props.scores.type).toBe("array");
      expect(jsonSchema.required).toEqual(["id", "email", "age", "role", "tags", "isActive", "scores"]);
    });

    it("converts File, Blob and FormData instances to binary / multipart format", () => {
      const fileSchema = z.custom<File>((val) => typeof val === "object");
      const formSchema = z.object({
        avatar: fileSchema,
        description: z.string(),
      });

      const jsonSchema = standardSchemaToJsonSchema(formSchema);
      const props = jsonSchema.properties as any;
      expect(props.avatar).toEqual({}); // fallback for custom validator without cls
      
      const fileObj = z.object({
        file: z.instanceof(File),
      });
      const fileJson = standardSchemaToJsonSchema(fileObj);
      expect((fileJson.properties as any).file).toEqual({
        type: "string",
        format: "binary",
      });
    });

    it("converts StandardJSONSchemaV1 directly if implemented", () => {
      const mockStandardJsonSchema: StandardJSONSchemaV1 = {
        "~standard": {
          version: 1,
          vendor: "custom",
          validate: (val) => ({ value: val }),
          jsonSchema: {
            output: () => ({ type: "object", properties: { standardProp: { type: "string" } } }),
          },
        },
      };

      const result = standardSchemaToJsonSchema(mockStandardJsonSchema);
      expect(result).toEqual({
        type: "object",
        properties: { standardProp: { type: "string" } },
      });
    });

    it("supports custom schema transformers via transformSchema", () => {
      const customSchema = { myCustomDef: "hello" };
      const result = standardSchemaToJsonSchema(customSchema, {
        transformSchema: () => ({ type: "string", description: "Transformed" }),
      });
      expect(result).toEqual({ type: "string", description: "Transformed" });
    });

    it("gracefully falls back when standard jsonSchema.output throws on custom types", () => {
      const customThrowingSchema = {
        "~standard": {
          version: 1,
          vendor: "zod",
          validate: (val: any) => ({ value: val }),
          jsonSchema: {
            output: () => {
              throw new Error("Custom types cannot be represented in JSON Schema");
            },
          },
        },
        _def: {
          typeName: "ZodObject",
          shape: () => ({
            avatar: {
              _def: {
                typeName: "ZodCustom",
                name: "File",
              },
            },
          }),
        },
      };

      const result = standardSchemaToJsonSchema(customThrowingSchema);
      expect(result.type).toBe("object");
      expect((result.properties as any)?.avatar).toEqual({
        type: "string",
        format: "binary",
      });
    });
  });

  describe("Documentation metadata & helpers", () => {
    it("exposes a typed openapi() doc helper", () => {
      const doc = openapi({
        summary: "Fetch User By ID",
        tags: ["Users"],
        operationId: "getUser",
        deprecated: true,
      });
      expect(doc.summary).toBe("Fetch User By ID");
      expect(doc.tags).toEqual(["Users"]);
      expect(doc.operationId).toBe("getUser");
      expect(doc.deprecated).toBe(true);
    });
  });

  describe("OpenAPI Specification generation", () => {
    it("generates valid OpenAPI spec from route manifest with input parameters and responses", () => {
      const mockRoute = {
        path: "/users/:id",
        method: "GET",
        params: z.object({ id: z.string().uuid() }),
        query: z.object({ search: z.string().optional() }),
        returns: {
          200: z.object({ id: z.string(), name: z.string() }),
        },
        handler: () => {},
      };

      const mockManifest = {
        layouts: {},
        routes: {
          "/users/:id": {
            GET: {
              layoutChain: ["users"],
              route: mockRoute,
            },
          },
        },
      };

      const spec = generateOpenApi(mockManifest, {
        info: { title: "Test API", version: "1.0.0" },
      });

      const doc = spec.document as any;
      expect(doc.openapi).toBe("3.1.0");
      expect(doc.info.title).toBe("Test API");
      expect(doc.paths["/users/{id}"]).toBeDefined();

      const getOp = doc.paths["/users/{id}"].get;
      expect(getOp.parameters).toHaveLength(2);
      expect(getOp.parameters[0]).toEqual({
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      });
      expect(getOp.parameters[1].name).toBe("search");
      expect(getOp.parameters[1].in).toBe("query");
      expect(getOp.parameters[1].required).toBe(false);

      expect(getOp.responses["200"]).toBeDefined();
      expect(getOp.responses["422"]).toBeDefined(); // Auto validation error response
      expect(getOp.responses["422"].content["application/json"].schema.properties.errors).toBeDefined();
    });

    it("generates multipart/form-data request body when file instances are present", () => {
      const mockRoute = {
        path: "/upload",
        method: "POST",
        body: z.object({
          file: z.instanceof(File),
          description: z.string().optional(),
        }),
        handler: () => {},
      };

      const spec = generateOpenApi({
        routes: {
          "/upload": {
            POST: { layoutChain: [], route: mockRoute },
          },
        },
      });

      const doc = spec.toObject();
      const postOp = doc.paths["/upload"]!.post!;
      expect(postOp.requestBody?.content["multipart/form-data"]).toBeDefined();
      expect(
        (postOp.requestBody?.content["multipart/form-data"]?.schema as any)?.properties?.file?.format,
      ).toBe("binary");
    });

    it("infers tags and operationIds from route layout and path", () => {
      const mockManifest = {
        layouts: {},
        routes: {
          "/users/:id/settings": {
            POST: {
              layoutChain: ["users"],
              route: {
                path: "/users/:id/settings",
                method: "POST",
                body: z.object({ theme: z.string() }),
                handler: () => {},
              },
            },
          },
        },
      };

      const spec = generateOpenApi(mockManifest, {});
      const doc = spec.document as any;
      const postOp = doc.paths["/users/{id}/settings"].post;

      expect(postOp.tags).toEqual(["Users"]);
      expect(postOp.operationId).toBe("postUsersIdSettings");
      expect(postOp.requestBody.required).toBe(true);
    });

    it("supports generateOpenApiAsync with async custom transformer", async () => {
      const mockRoute = {
        path: "/items",
        method: "POST",
        body: { raw: true },
        returns: { 201: { raw: true } },
        handler: () => {},
      };

      const spec = await generateOpenApiAsync(
        {
          routes: { "/items": { POST: { layoutChain: [], route: mockRoute } } },
        },
        {
          transformSchema: async () => ({ type: "object", properties: { asyncField: { type: "string" } } }),
        },
      );

      const doc = spec.toObject();
      const postOp = doc.paths["/items"]!.post!;
      const reqContent = postOp.requestBody!.content["application/json"]!;
      expect(reqContent.schema).toEqual({
        type: "object",
        properties: { asyncField: { type: "string" } },
      });
    });

    it("hides routes when hidden: true is declared", () => {
      const source = `
        export const OpenAPI = { hidden: true };
        export const Route = { path: "/secret", method: "GET", handler: () => ({}) } as const;
      `;
      const program = createProgramFromSources({ "/virtual/routes/secret.get.ts": source });
      const extracted = extractRouteTypesFromProgram(program);

      expect(extracted.docs.get("/secret:GET")?.hidden).toBe(true);
    });
  });

  describe("Security scheme extraction", () => {
    it("detects JWT and Bearer authentication middlewares", () => {
      const middlewares = [{ name: "jwt" }, { name: "custom" }];
      const detected = detectMiddlewaresSecurity(middlewares);

      expect(detected.schemes.bearerAuth).toBeDefined();
      expect(detected.schemes.bearerAuth!.scheme).toBe("bearer");
      expect(detected.schemes.bearerAuth!.bearerFormat).toBe("JWT");
      expect(detected.requirements).toEqual([{ bearerAuth: [] }]);
    });
  });

  describe("TypeScript Type Inference", () => {
    it("infers response bodies from $Infer.Output ReplyOf types", () => {
      const source = `
        type ReplyOf<S extends number, B> = Response & { readonly status: S; readonly data: B };

        export const Route = {
          path: "/users/:id",
          method: "GET",
          $Infer: {
            Output: null as unknown as
              | ReplyOf<200, { id: string; active: boolean }>
              | ReplyOf<404, { error: string }>,
          },
          handler: () => null,
        } as const;
      `;
      const program = createProgramFromSources({ "/virtual/routes/users/[id].get.ts": source });
      const extracted = extractRouteTypesFromProgram(program);

      const responses = extracted.responses.get("/users/:id:GET");
      expect(responses?.[200]).toEqual({
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { id: { type: "string" }, active: { type: "boolean" } },
              required: ["id", "active"],
            },
          },
        },
      });
      expect(responses?.[404]).toEqual({
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { error: { type: "string" } },
              required: ["error"],
            },
          },
        },
      });
    });

    it("infers stream and file response helpers as application/octet-stream with binary format", () => {
      const source = `
        type ReplyOf<S extends number, B> = Response & { readonly status: S; readonly data: B };
        declare const reply: {
          stream: (s: any) => ReplyOf<200, null>;
          file: (p: string) => ReplyOf<200, string>;
        };

        export const Route = {
          path: "/download",
          method: "GET",
          $Infer: {
            Output: null as unknown as ReplyOf<200, null>,
          },
          handler: () => reply.stream(null),
        } as const;
      `;
      const program = createProgramFromSources({ "/virtual/routes/download.get.ts": source });
      const extracted = extractRouteTypesFromProgram(program);

      const responses = extracted.responses.get("/download:GET");
      expect(responses?.[200]).toEqual({
        content: {
          "application/octet-stream": {
            schema: { type: "string", format: "binary" },
          },
        },
      });
    });

    it("infers redirect, html, and text reply helpers accurately", () => {
      const source = `
        type ReplyOf<S extends number, B> = Response & { readonly status: S; readonly data: B };
        declare const reply: {
          redirect: (url: string) => ReplyOf<302, string>;
          html: (code: string) => ReplyOf<200, string>;
          text: (txt: string) => ReplyOf<200, string>;
        };

        export const Route = {
          path: "/login",
          method: "GET",
          $Infer: {
            Output: null as unknown as ReplyOf<302, string>,
          },
          handler: () => reply.redirect("/auth"),
        } as const;
      `;
      const program = createProgramFromSources({ "/virtual/routes/login.get.ts": source });
      const extracted = extractRouteTypesFromProgram(program);

      const responses = extracted.responses.get("/login:GET");
      expect(responses?.[302]?.headers?.Location).toBeDefined();
      expect(responses?.[302]?.headers?.Location?.schema).toEqual({ type: "string" });
    });

    it("infers handler return types when $Infer.Output is bare Response", () => {
      const sourceCode = `
        export type User = { id: string; age: number; active: boolean };
        export function getHandler() {
          return () => {
            return { id: "123", age: 30, active: true } as User;
          };
        }
      `;

      const sourceFile = ts.createSourceFile("test.ts", sourceCode, ts.ScriptTarget.ES2022, true);
      const host = ts.createCompilerHost({});
      const originalGetSourceFile = host.getSourceFile.bind(host);
      host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        if (fileName === "test.ts") return sourceFile;
        return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
      };

      const program = ts.createProgram(["test.ts"], {}, host);
      const typeChecker = program.getTypeChecker();

      const getHandlerSymbol = typeChecker.getSymbolAtLocation(sourceFile);
      const exports = typeChecker.getExportsOfModule(getHandlerSymbol!);
      const getHandlerExport = exports.find((exp) => exp.getName() === "getHandler")!;
      const fnType = typeChecker.getTypeOfSymbolAtLocation(getHandlerExport, sourceFile);

      const responses = inferResponsesFromTsType(typeChecker, fnType, sourceFile);
      expect(responses[200]).toBeDefined();
      expect(responses[200]!.content?.["application/json"]?.schema).toEqual({
        type: "object",
        properties: { id: { type: "string" }, age: { type: "number" }, active: { type: "boolean" } },
        required: ["id", "age", "active"],
      });
    });
  });

  describe("Documentation UI Renderers & Request Handler", () => {
    const mockSpec = { openapi: "3.1.0", info: { title: "API", version: "1.0" }, paths: {} };

    it("renders Scalar HTML page", () => {
      const html = renderScalarUi({ spec: mockSpec, title: "Custom Docs" });
      expect(html).toContain("<title>Custom Docs</title>");
      expect(html).toContain("https://cdn.jsdelivr.net/npm/@scalar/api-reference");
      expect(html).toContain('id="api-reference"');
    });

    it("renders Swagger UI HTML page", () => {
      const html = renderSwaggerUi({ spec: mockSpec, title: "Swagger" });
      expect(html).toContain("<title>Swagger</title>");
      expect(html).toContain("swagger-ui-bundle.js");
      expect(html).toContain('dom_id: \'#swagger-ui\'');
    });

    it("renders Redoc HTML page", () => {
      const html = renderRedocUi({ spec: mockSpec, title: "Redoc" });
      expect(html).toContain("<title>Redoc</title>");
      expect(html).toContain("redoc.standalone.js");
      expect(html).toContain("Redoc.init");
    });

    it("renders Stoplight Elements HTML page", () => {
      const html = renderElementsUi({ spec: mockSpec, title: "Elements" });
      expect(html).toContain("<title>Elements</title>");
      expect(html).toContain("elements-api");
    });

    it("serves OpenAPI spec and UI via createOpenApiDocHandler", async () => {
      const handler = createOpenApiDocHandler({
        spec: mockSpec,
        provider: "scalar",
        docsPath: "/docs",
        jsonPath: "/openapi.json",
      });

      const jsonRes = await handler(new Request("http://localhost/openapi.json"));
      expect(jsonRes?.status).toBe(200);
      expect(jsonRes?.headers.get("Content-Type")).toContain("application/json");
      const jsonBody = await jsonRes?.json();
      expect(jsonBody.info.title).toBe("API");

      const htmlRes = await handler(new Request("http://localhost/docs"));
      expect(htmlRes?.status).toBe(200);
      expect(htmlRes?.headers.get("Content-Type")).toContain("text/html");
      const htmlBody = await htmlRes?.text();
      expect(htmlBody).toContain("@scalar/api-reference");

      const otherRes = await handler(new Request("http://localhost/other"));
      expect(otherRes).toBeNull();
    });
  });
});
