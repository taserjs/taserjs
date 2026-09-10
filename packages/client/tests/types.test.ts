import { describe, expectTypeOf, it } from "vitest";
import { t } from "@taserjs/router";
import { json } from "@taserjs/router/reply";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { createClient, type InferRequestType, type InferResponseType } from "../src/index.js";

// Helper mock standard schema
function createMockSchema<TInput, TOutput = TInput>(
  output: TOutput,
): StandardSchemaV1<TInput, TOutput> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({ value: output }),
      types: {
        input: undefined as unknown as TInput,
        output: undefined as unknown as TOutput,
      },
    },
  };
}

describe("client type inference tests", () => {
  const userSchema = createMockSchema<
    { name: string; age?: number },
    { name: string; age: number }
  >({
    name: "Alice",
    age: 30,
  });

  const querySchema = createMockSchema<{ page?: string }, { page: number }>({
    page: 1,
  });

  const paramSchema = createMockSchema<{ id: string }, { id: number }>({
    id: 123,
  });

  const returnSchema = createMockSchema<{ success: boolean; user: { name: string } }>({
    success: true,
    user: { name: "Alice" },
  });

  // Define test routes
  const getUsersRoute = t
    .get("/users")
    .query(querySchema)
    .handler(async () => json({ users: [{ id: 1, name: "Alice" }] }));

  const getUserByIdRoute = t
    .get("/users/:id")
    .params(paramSchema)
    .returns({ 200: returnSchema })
    .handler(async () => json({ success: true, user: { name: "Alice" } }));

  const createUserRoute = t
    .post("/users")
    .body(userSchema)
    .handler(async ({ req }) => json({ created: true, name: req.body?.name ?? "" }));

  const rootRoute = t.get("/").handler(async () => json({ version: "1.0.0" }));

  const manifest = {
    layouts: {},
    routes: {
      "/": {
        GET: {
          layouts: [],
          route: rootRoute,
        },
      },
      "/users": {
        GET: {
          layouts: [],
          route: getUsersRoute,
        },
        POST: {
          layouts: [],
          route: createUserRoute,
        },
      },
      "/users/:id": {
        GET: {
          layouts: [],
          route: getUserByIdRoute,
        },
      },
    },
  } as const;

  it("verifies compile-time type validation of client methods", () => {
    const api = createClient<typeof manifest>({ baseUrl: "http://localhost:3000" });

    // 1. Root route inference
    expectTypeOf(api.$get).toBeFunction();
    type RootReturn = InferResponseType<typeof api.$get>;
    expectTypeOf<RootReturn>().toEqualTypeOf<{ version: string }>();

    // 2. /users GET route with query and json() return inference
    type GetUsersReturn = InferResponseType<typeof api.users.$get>;
    expectTypeOf<GetUsersReturn>().toEqualTypeOf<{ users: { id: number; name: string }[] }>();

    type GetUsersArgs = InferRequestType<typeof api.users.$get>;
    expectTypeOf<{ page?: string }>().toMatchTypeOf<NonNullable<GetUsersArgs>["query"]>();

    // 3. /users POST route with typed body input
    type CreateUserArgs = InferRequestType<typeof api.users.$post>;
    expectTypeOf<{ name: string; age?: number }>().toMatchTypeOf<
      NonNullable<CreateUserArgs>["body"]
    >();

    type CreateUserReturn = InferResponseType<typeof api.users.$post>;
    expectTypeOf<CreateUserReturn>().toEqualTypeOf<{ created: boolean; name: string }>();

    // 4. /users/:id GET route with .returns({ 200 }) schema override
    type GetUserByIdReturn = InferResponseType<typeof api.users._id.$get>;
    expectTypeOf<GetUserByIdReturn>().toEqualTypeOf<{ success: boolean; user: { name: string } }>();

    type GetUserByIdArgs = InferRequestType<typeof api.users._id.$get>;
    expectTypeOf<{ id: string }>().toMatchTypeOf<GetUserByIdArgs["param"]>();

    // 5. Direct path indexing
    expectTypeOf(api["/users"].$get).toBeFunction();
    expectTypeOf(api["/users/:id"].$get).toBeFunction();
  });
});
