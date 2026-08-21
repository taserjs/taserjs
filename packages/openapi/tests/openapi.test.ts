// oxlint-disable no-await-in-loop
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import * as v from "valibot";
import { type } from "arktype";
import ts from "typescript";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openapi, generateOpenApi, createOpenApiHandler, OpenApiSpec } from "../src/index.js";
import { standardSchemaToJsonSchema } from "../src/schema/index.js";
import type { StandardJSONSchemaV1 } from "../src/schema/types.js";
import { formatOpenApiPath } from "../src/path.js";
import { inferResponsesFromTsType, extractRouteTypesFromProgram } from "../src/ts-compiler.js";

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
        meta: z.record(z.string(), z.string()).optional(),
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
      expect(jsonSchema.required).toEqual([
        "id",
        "email",
        "age",
        "role",
        "tags",
        "isActive",
        "scores",
      ]);
    });

    it("converts z.file() to binary format for multipart uploads", () => {
      const formSchema = z.object({
        avatar: z.file(),
        description: z.string(),
      });

      const jsonSchema = standardSchemaToJsonSchema(formSchema);
      const props = jsonSchema.properties as any;
      expect(props.avatar.type).toBe("string");
      expect(props.avatar.format).toBe("binary");
      expect(props.description.type).toBe("string");
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

    it("warns and falls back to a generic object schema when JSON Schema cannot be derived", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const unsupportedSchema = {
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
      };

      const result = standardSchemaToJsonSchema(unsupportedSchema);
      expect(result).toEqual({ type: "object" });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Could not derive JSON Schema"));
      warnSpy.mockRestore();
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
    it("generates valid OpenAPI spec from route manifest with input parameters and responses", async () => {
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

      const spec = await generateOpenApi(mockManifest, {
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
        schema: expect.objectContaining({ type: "string", format: "uuid" }),
      });
      expect(getOp.parameters[1].name).toBe("search");
      expect(getOp.parameters[1].in).toBe("query");
      expect(getOp.parameters[1].required).toBe(false);

      expect(getOp.responses["200"]).toBeDefined();
      expect(getOp.responses["422"]).toBeDefined(); // Auto validation error response
      expect(
        getOp.responses["422"].content["application/json"].schema.properties.errors,
      ).toBeDefined();
    });

    it("generates multipart/form-data request body when file instances are present", async () => {
      const mockRoute = {
        path: "/upload",
        method: "POST",
        body: z.object({
          file: z.file(),
          description: z.string().optional(),
        }),
        handler: () => {},
      };

      const spec = await generateOpenApi({
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
        (postOp.requestBody?.content["multipart/form-data"]?.schema as any)?.properties?.file
          ?.format,
      ).toBe("binary");
    });

    it("infers tags and operationIds from route layout and path", async () => {
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

      const spec = await generateOpenApi(mockManifest, {});
      const doc = spec.document as any;
      const postOp = doc.paths["/users/{id}/settings"].post;

      expect(postOp.tags).toEqual(["Users"]);
      expect(postOp.operationId).toBe("postUsersIdSettings");
      expect(postOp.requestBody.required).toBe(true);
    });

    it("supports async custom transformers", async () => {
      const mockRoute = {
        path: "/items",
        method: "POST",
        body: { raw: true },
        returns: { 201: { raw: true } },
        handler: () => {},
      };

      const spec = await generateOpenApi(
        {
          routes: { "/items": { POST: { layoutChain: [], route: mockRoute } } },
        },
        {
          transformSchema: async () => ({
            type: "object",
            properties: { asyncField: { type: "string" } },
          }),
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

    it("replaces the fallback body with an explicit requestBody declaration when the schema cannot be converted", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const mockRoute = {
        path: "/upload",
        method: "POST",
        body: z.object({
          // z.instanceof(File) throws during JSON Schema conversion
          image: z.instanceof(File),
        }),
        handler: () => {},
      };
      const manifestDoc = {
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { image: { type: "string", format: "binary" } },
              },
            },
          },
        },
      };

      const spec = await generateOpenApi({
        routes: {
          "/upload": {
            POST: { layoutChain: [], route: mockRoute, doc: manifestDoc },
          },
        },
      });

      const postOp = spec.toObject().paths["/upload"]!.post!;
      const content = postOp.requestBody?.content ?? {};
      expect(content["multipart/form-data"]).toBeDefined();
      expect(content["application/json"]).toBeUndefined();
      warnSpy.mockRestore();
    });

    it("generates request bodies from valibot schemas without zod-specific code", async () => {
      const mockRoute = {
        path: "/posts",
        method: "POST",
        body: v.object({ title: v.string(), views: v.number() }),
        handler: () => {},
      };

      const spec = await generateOpenApi({
        routes: { "/posts": { POST: { layoutChain: [], route: mockRoute } } },
      });

      const doc = spec.toObject();
      const postOp = doc.paths["/posts"]!.post!;
      expect(postOp.requestBody?.content["application/json"]).toBeDefined();
      const schema = postOp.requestBody!.content["application/json"]!.schema as any;
      expect(schema.properties.title.type).toBe("string");
      expect(schema.properties.views.type).toBe("number");
    });

    it("generates request bodies from arktype schemas without zod-specific code", async () => {
      const mockRoute = {
        path: "/posts",
        method: "POST",
        body: type({ title: "string", published: "boolean" }),
        handler: () => {},
      };

      const spec = await generateOpenApi({
        routes: { "/posts": { POST: { layoutChain: [], route: mockRoute } } },
      });

      const doc = spec.toObject();
      const postOp = doc.paths["/posts"]!.post!;
      expect(postOp.requestBody?.content["application/json"]).toBeDefined();
      const schema = postOp.requestBody!.content["application/json"]!.schema as any;
      expect(schema.properties.title.type).toBe("string");
      expect(schema.properties.published.type).toBe("boolean");
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
        properties: {
          id: { type: "string" },
          age: { type: "number" },
          active: { type: "boolean" },
        },
        required: ["id", "age", "active"],
      });
    });
  });

  describe("Documentation Handler & Spec factories", () => {
    const mockDocument = {
      openapi: "3.1.0" as const,
      info: { title: "API", version: "1.0" },
      paths: {},
    };

    it("renders provider UI HTML with the spec inlined by default", async () => {
      const markers: Record<string, string> = {
        scalar: "api-reference",
        swagger: "swagger-ui-bundle.js",
        redoc: "Redoc.init",
        elements: "elements-api",
      };
      for (const provider of Object.keys(markers)) {
        const handler = createOpenApiHandler({ provider: provider as any });
        const res = await handler(OpenApiSpec.fromDocument(mockDocument));
        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toContain("text/html");
        const html = await res.text();
        expect(html).toContain(markers[provider]!);
        expect(html).toContain('"title":"API"'); // spec is inlined, no spec URL
      }
    });

    it("serves raw json and yaml representations on demand", async () => {
      const handler = createOpenApiHandler({ provider: "scalar" });
      const spec = OpenApiSpec.fromDocument(mockDocument);

      const jsonRes = await handler(spec, "json");
      expect(jsonRes.headers.get("Content-Type")).toContain("application/json");
      expect(await jsonRes.text()).toContain('"openapi": "3.1.0"');

      const yamlRes = await handler(spec, "yaml");
      expect(yamlRes.headers.get("Content-Type")).toContain("application/yaml");
      expect(await yamlRes.text()).toContain("openapi: 3.1.0");
    });

    it("creates a lazily-resolved spec definition via Spec.fromManifest", async () => {
      const mockRoute = {
        path: "/users/:id",
        method: "GET",
        params: z.object({ id: z.string() }),
        handler: () => {},
      };
      const spec = OpenApiSpec.fromManifest({
        routes: { "/users/:id": { GET: { layoutChain: [], route: mockRoute } } },
      });
      const document = await spec.resolve();

      expect(document.paths["/users/{id}"]?.get).toBeDefined();
    });

    it("parses specs from JSON and YAML strings via fromJson / fromYaml", () => {
      const fromJson = OpenApiSpec.fromJson(JSON.stringify(mockDocument));
      expect(fromJson.document.info.title).toBe("API");

      const fromYaml = OpenApiSpec.fromYaml(
        'openapi: 3.1.0\ninfo:\n  title: API\n  version: "1.0"\npaths: {}\n',
      );
      expect(fromYaml.document.info.title).toBe("API");
    });

    it("fetches JSON or YAML specs via Spec.fromURL", async () => {
      const yamlSpec = 'openapi: 3.1.0\ninfo:\n  title: API\n  version: "1.0"\npaths: {}\n';
      const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        const body = /\.ya?ml$/i.test(url) ? yamlSpec : JSON.stringify(mockDocument);
        return new Response(body, { status: 200 });
      });
      try {
        expect(
          (await OpenApiSpec.fromURL("https://example.com/spec.json").resolve()).info.title,
        ).toBe("API");
        expect(
          (await OpenApiSpec.fromURL("https://example.com/spec.yaml").resolve()).info.title,
        ).toBe("API");
        expect((await OpenApiSpec.fromURL("https://example.com/spec").resolve()).info.title).toBe(
          "API",
        );
        expect(fetchMock).toHaveBeenCalledTimes(3);
      } finally {
        fetchMock.mockRestore();
      }
    });

    it("loads JSON and YAML specs from disk via Spec.fromFile", async () => {
      const dir = await mkdtemp(join(tmpdir(), "taser-openapi-"));
      try {
        const jsonPath = join(dir, "spec.json");
        const yamlPath = join(dir, "spec.yaml");

        await writeFile(jsonPath, JSON.stringify(mockDocument), "utf-8");
        await writeFile(
          yamlPath,
          'openapi: 3.1.0\ninfo:\n  title: API\n  version: "1.0"\npaths: {}\n',
          "utf-8",
        );

        expect((await OpenApiSpec.fromFile(jsonPath).resolve()).info.title).toBe("API");
        expect((await OpenApiSpec.fromFile(yamlPath).resolve()).info.title).toBe("API");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  });

  describe("Metadata and BodyMode integration", () => {
    it("reads route.metadata.openapi and middleware metadata", async () => {
      const manifest: any = {
        layouts: {
          "/$": {
            middlewares: [
              {
                metadata: {
                  openapi: {
                    security: [{ bearerAuth: [] }],
                  },
                },
                handler: (_ctx: any, next: any) => next(),
              },
            ],
          },
        },
        routes: {
          "/items": {
            POST: {
              layoutChain: ["/$"],
              route: {
                method: "POST",
                path: "/items",
                bodyMode: "form",
                body: z.object({ file: z.string() }),
                metadata: {
                  openapi: {
                    summary: "Upload item file",
                    tags: ["Items"],
                  },
                },
              },
            },
            PUT: {
              layoutChain: [],
              route: {
                method: "PUT",
                path: "/items",
                bodyMode: "urlencoded",
                body: z.object({ title: z.string() }),
                metadata: {
                  openapi: {
                    summary: "Update item urlencoded",
                  },
                },
              },
            },
          },
        },
      };

      const spec = (await generateOpenApi(manifest)).toObject();
      const postOp = spec.paths?.["/items"]?.post;
      expect(postOp?.summary).toBe("Upload item file");
      expect(postOp?.tags).toEqual(["Items"]);
      expect(postOp?.security).toEqual([{ bearerAuth: [] }]);
      expect(postOp?.requestBody?.content["multipart/form-data"]).toBeDefined();

      const putOp = spec.paths?.["/items"]?.put;
      expect(putOp?.summary).toBe("Update item urlencoded");
      expect(putOp?.requestBody?.content["application/x-www-form-urlencoded"]).toBeDefined();
    });
  });
});
