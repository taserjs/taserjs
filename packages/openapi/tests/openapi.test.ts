import { describe, expect, it } from "vitest";
import { z } from "zod";
import ts from "typescript";
import { formatOpenApiPath, withDoc, generateOpenApi, inferResponsesFromTsType } from "../src/index.js";

describe("@taserjs/openapi", () => {
  it("converts Taser path syntax to OpenAPI path syntax", () => {
    const { openApiPath, pathParamNames } = formatOpenApiPath("/users/:id/posts/:postId/*");
    expect(openApiPath).toBe("/users/{id}/posts/{postId}/{wildcard}");
    expect(pathParamNames).toEqual(["id", "postId", "wildcard"]);
  });

  it("attaches documentation metadata to route via withDoc without modifying core router", () => {
    const mockRoute = { path: "/users", method: "GET" };
    const docMeta = {
      summary: "Get Users",
      description: "List all active users",
      tags: ["Users"],
    };

    const docRoute = withDoc(docMeta, mockRoute);
    expect(docRoute.path).toBe("/users");
  });

  it("generates valid OpenAPI spec from route manifest with Standard Schema inputs", () => {
    const mockRoute = withDoc(
      { summary: "Fetch User By ID", tags: ["Users"] },
      {
        path: "/users/:id",
        method: "GET",
        query: z.object({ search: z.string().optional() }),
        returns: {
          200: z.object({ id: z.string(), name: z.string() }),
        },
        handler: () => {},
      }
    );

    const mockManifest = {
      layouts: {},
      routes: {
        "/users/:id": {
          GET: {
            layoutChain: [],
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
    expect(getOp.summary).toBe("Fetch User By ID");
    expect(getOp.tags).toEqual(["Users"]);
    expect(getOp.responses["200"]).toBeDefined();
  });

  it("infers return type schema using TypeScript Compiler API without explicit .returns()", () => {
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
    expect(responses[200].type).toBe("object");
  });
});
