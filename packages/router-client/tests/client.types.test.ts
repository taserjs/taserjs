import { describe, expectTypeOf, it } from "vitest";

import { createClient } from "../src/client.js";
import type {
  Client,
  InferRequestType,
  InferResponseType,
  OpenQuery,
  QueryWithOpen,
} from "../src/types.js";
import {
  formBody,
  type FormBody,
  type FormBodyField,
  type FormBodyInput,
} from "../src/form-body.js";
import type { Schema, TaserApp } from "@taserjs/router";
import type { ReplyOf } from "@taserjs/router/reply";

type FormDataSchema = Schema<FormData>;
type MessageSchema = Schema<{ message: string }>;
type ErrorSchema = Schema<{ error: string }>;
type SchemaOkBody = Schema<{ fromSchema: true }>;

type HelloHandler = (ctx: unknown) => unknown;

type TestManifest = {
  layouts: {
    "/$": {
      middlewares: readonly [];
    };
  };
  routes: {
    "/": {
      POST: {
        layouts: readonly ["/$"];
        route: {
          path: "/";
          method: "POST";
          middlewares: readonly [];
          $Infer: {
            Input: {
              query: { page?: number; name: string };
              body: { name: string; file: File };
            };
            Output: ReplyOf<
              200,
              { query: { page: number; name: string }; body: { name: string; file: File } }
            >;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/hello": {
      GET: {
        layouts: readonly ["/$"];
        route: {
          path: "/hello";
          method: "GET";
          middlewares: readonly [];
          returns: {
            200: MessageSchema;
            404: ErrorSchema;
          };
          $Infer: {
            Input: {};
            Output: ReplyOf<200, { message: string }>;
          };
          handler: HelloHandler;
        };
      };
    };
    "/posts/:id": {
      GET: {
        layouts: readonly ["/$"];
        route: {
          path: "/posts/:id";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: { params: { id: string } };
            Output: ReplyOf<200, { id: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/upload": {
      POST: {
        layouts: readonly ["/$"];
        route: {
          path: "/upload";
          method: "POST";
          middlewares: readonly [];
          body: FormDataSchema;
          $Infer: {
            Input: { body: FormData };
            Output: ReplyOf<200, unknown>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/inferred": {
      GET: {
        layouts: readonly ["/$"];
        route: {
          path: "/inferred";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: {};
            Output:
              | ReplyOf<200, { ok: true }>
              | ReplyOf<201, { created: true }>
              | ReplyOf<404, { error: string }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/schema-wins": {
      GET: {
        layouts: readonly ["/$"];
        route: {
          path: "/schema-wins";
          method: "GET";
          middlewares: readonly [];
          returns: {
            200: SchemaOkBody;
          };
          $Infer: {
            Input: {};
            Output: ReplyOf<200, { fromHandler: true }>;
          };
          handler: (ctx: unknown) => unknown;
        };
      };
    };
    "/index": {
      GET: {
        layouts: readonly ["/$"];
        route: {
          path: "/index";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: {};
            Output: ReplyOf<200, { isLiteralIndex: true }>;
          };
          handler: HelloHandler;
        };
      };
    };
    "/.well-known/jwks": {
      GET: {
        layouts: readonly ["/$"];
        route: {
          path: "/.well-known/jwks";
          method: "GET";
          middlewares: readonly [];
          $Infer: {
            Input: {};
            Output: ReplyOf<200, { keys: string[] }>;
          };
          handler: HelloHandler;
        };
      };
    };
  };
};

type TestApp = TaserApp<TestManifest>;
type TestClient = Client<TestApp>;
type DirectManifestClient = Client<TestManifest>;

describe("client types", () => {
  it("maps root route / methods directly to client root", () => {
    expectTypeOf<TestClient>().toHaveProperty("$post");
    expectTypeOf<DirectManifestClient>().toHaveProperty("$post");
  });

  it("maps literal /index to .index without colliding with root /", () => {
    expectTypeOf<TestClient>().toHaveProperty("index");
    expectTypeOf<TestClient["index"]>().toHaveProperty("$get");
    type IndexJson = InferResponseType<TestClient["index"]["$get"]>;
    expectTypeOf<IndexJson>().toEqualTypeOf<{ isLiteralIndex: true }>();
  });

  it("maps leading-dot routes to $ prefix (e.g. $well_known)", () => {
    expectTypeOf<TestClient>().toHaveProperty("$well_known");
    expectTypeOf<TestClient["$well_known"]>().toHaveProperty("jwks");
    expectTypeOf<TestClient["$well_known"]["jwks"]>().toHaveProperty("$get");
    type JwksJson = InferResponseType<TestClient["$well_known"]["jwks"]["$get"]>;
    expectTypeOf<JwksJson>().toEqualTypeOf<{ keys: string[] }>();
  });

  it("maps path segments to _id properties", () => {
    expectTypeOf<TestClient>().toHaveProperty("hello");
    expectTypeOf<TestClient["hello"]>().toHaveProperty("$get");
    expectTypeOf<TestClient>().toHaveProperty("posts");
    expectTypeOf<TestClient["posts"]>().toHaveProperty("_id");
    expectTypeOf<TestClient["posts"]["_id"]>().toHaveProperty("$get");
  });

  it("works directly with RouteManifest type without TaserApp wrapper", () => {
    expectTypeOf<DirectManifestClient>().toHaveProperty("hello");
    expectTypeOf<DirectManifestClient["hello"]>().toHaveProperty("$get");
    expectTypeOf<DirectManifestClient["posts"]["_id"]>().toHaveProperty("$get");
  });

  it("requires path params and optional open query when no query schema", () => {
    type GetPostArgs = InferRequestType<TestClient["posts"]["_id"]["$get"]>;
    expectTypeOf<GetPostArgs>().toEqualTypeOf<{
      param: { id: string };
      query?: OpenQuery;
    }>();
  });

  it("accepts FormData or formBody when body schema is FormData", () => {
    type UploadArgs = InferRequestType<TestClient["upload"]["$post"]>;
    expectTypeOf<UploadArgs>().toEqualTypeOf<{
      query?: OpenQuery;
      body: FormData | FormBody<Record<string, FormBodyField>>;
    }>();
  });

  it("accepts formBody for object body schemas with files", () => {
    type PostArgs = InferRequestType<TestClient["$post"]>;
    type PostBody = PostArgs["body"];
    expectTypeOf<PostBody>().toEqualTypeOf<FormBodyInput<{ name: string; file: File }>>();
    expectTypeOf(formBody({ name: "x", file: new File([], "a.txt") })).toMatchTypeOf<PostBody>();
  });

  it("types json() from returns[200] only", () => {
    type HelloJson = InferResponseType<TestClient["hello"]["$get"]>;
    expectTypeOf<HelloJson>().toEqualTypeOf<{ message: string }>();
    expectTypeOf<HelloJson>().not.toEqualTypeOf<{ message: string; error: string }>();
  });

  it("infers json() from success ReplyOf when returns is absent", () => {
    type InferredJson = InferResponseType<TestClient["inferred"]["$get"]>;
    expectTypeOf<InferredJson>().toEqualTypeOf<{ ok: true } | { created: true }>();
    expectTypeOf<InferredJson>().not.toEqualTypeOf<{ error: string }>();
  });

  it("prefers returns[200] schema over $Infer.Output", () => {
    type SchemaWins = InferResponseType<TestClient["schema_wins"]["$get"]>;
    expectTypeOf<SchemaWins>().toEqualTypeOf<{ fromSchema: true }>();
    expectTypeOf<SchemaWins>().not.toEqualTypeOf<{ fromHandler: true }>();
  });

  it("requires query and body when Input facets define required fields", () => {
    type PostArgs = InferRequestType<TestClient["$post"]>;
    expectTypeOf<PostArgs>().toEqualTypeOf<{
      query: QueryWithOpen<{ page?: number; name: string }>;
      body: FormBodyInput<{ name: string; file: File }>;
    }>();
  });

  it("allows extra open query keys when a query schema is defined", () => {
    type PostCall = TestClient["$post"];
    expectTypeOf<PostCall>().toBeCallableWith({
      query: { name: "x", extra: "open" },
      body: formBody({ name: "x", file: new File([], "a.txt") }),
    });
  });

  it("allows zero-arg $get when Input has no required fields", () => {
    type HelloCall = TestClient["hello"]["$get"];
    expectTypeOf<HelloCall>().toBeCallableWith();
    expectTypeOf<HelloCall>().toBeCallableWith({ query: { name: "x" } });
  });

  it("creates type-safe client with explicit TaserApp or RouteManifest type", () => {
    const client = createClient<TestApp>({ baseUrl: "http://localhost:3000" });
    expectTypeOf(client).toHaveProperty("hello");
    expectTypeOf(client.hello).toHaveProperty("$get");

    const manifestClient = createClient<TestManifest>({ baseUrl: "http://localhost:3000" });
    expectTypeOf(manifestClient).toHaveProperty("hello");
    expectTypeOf(manifestClient.hello).toHaveProperty("$get");
  });
});
