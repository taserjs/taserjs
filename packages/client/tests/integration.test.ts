import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { t } from "@taserjs/router";
import { createTaserApp } from "@taserjs/runtime";
import { json } from "@taserjs/utils";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { createClient } from "../src/index.js";

// Minimal Standard Schema mock
function createSchema<T>(
  validateFn: (val: unknown) => { value: T } | { issues: readonly [{ message: string }] },
): StandardSchemaV1<unknown, T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (input) => validateFn(input),
      types: {
        input: undefined as unknown,
        output: undefined as unknown as T,
      },
    },
  };
}

describe("@taserjs/client integration with running Hono server", () => {
  let server: ServerType;
  let port: number;
  let baseUrl: string;

  const usersDatabase: Array<{ id: string; name: string; email: string }> = [
    { id: "1", name: "Alice", email: "alice@example.com" },
    { id: "2", name: "Bob", email: "bob@example.com" },
  ];

  // Schemas
  const idParamSchema = createSchema<{ id: string }>((val) => {
    if (typeof val === "object" && val !== null && "id" in val && typeof val.id === "string") {
      return { value: { id: val.id } };
    }
    return { issues: [{ message: "Invalid id param" }] };
  });

  const querySchema = createSchema<{ limit?: string }>((val) => {
    return { value: (val as { limit?: string }) ?? {} };
  });

  const createUserSchema = createSchema<{ name: string; email: string }>((val) => {
    if (
      typeof val === "object" &&
      val !== null &&
      "name" in val &&
      "email" in val &&
      typeof (val as any).name === "string" &&
      typeof (val as any).email === "string"
    ) {
      return { value: val as { name: string; email: string } };
    }
    return { issues: [{ message: "Invalid user body" }] };
  });

  const returnUserSchema = createSchema<{ user: { id: string; name: string; email: string } }>(
    (val) => ({ value: val as any }),
  );

  // Routes
  const rootRoute = t.get("/").handler(async () => json({ status: "healthy", version: "1.0.0" }));

  const listUsersRoute = t
    .get("/users")
    .query(querySchema)
    .handler(async ({ req }) => {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : usersDatabase.length;
      return json({ users: usersDatabase.slice(0, limit) });
    });

  const getUserRoute = t
    .get("/users/:id")
    .params(idParamSchema)
    .returns({ 200: returnUserSchema })
    .handler(async ({ req }) => {
      const user = usersDatabase.find((u) => u.id === req.params.id);
      if (!user) {
        return json({ error: "User not found" }, { status: 404 });
      }
      return json({ user });
    });

  const createUserRoute = t
    .post("/users")
    .body(createUserSchema)
    .handler(async ({ req }) => {
      const newUser = {
        id: String(usersDatabase.length + 1),
        name: req.body?.name ?? "",
        email: req.body?.email ?? "",
      };
      usersDatabase.push(newUser);
      return json({ user: newUser }, { status: 201 });
    });

  const updateUserSchema = createSchema<{ name?: string }>((val) => ({
    value: (val as { name?: string }) ?? {},
  }));

  const updateUserRoute = t
    .put("/users/:id")
    .params(idParamSchema)
    .body(updateUserSchema)
    .handler(async ({ req }) => {
      const user = usersDatabase.find((u) => u.id === req.params.id);
      if (!user) return json({ error: "Not found" }, { status: 404 });
      if (req.body?.name) user.name = req.body.name;
      return json({ updated: true, user });
    });

  const deleteUserRoute = t
    .delete("/users/:id")
    .params(idParamSchema)
    .handler(async ({ req }) => {
      const idx = usersDatabase.findIndex((u) => u.id === req.params.id);
      if (idx === -1) return json({ error: "Not found" }, { status: 404 });
      usersDatabase.splice(idx, 1);
      return json({ deleted: true });
    });

  const protectedRoute = t.get("/protected").handler(async ({ req }) => {
    const auth = req.headers.get("authorization");
    if (auth !== "Bearer secret-token") {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    return json({ authorized: true });
  });

  const routeManifest = {
    layouts: {},
    routes: {
      "/": {
        GET: { layouts: [], route: rootRoute },
      },
      "/users": {
        GET: { layouts: [], route: listUsersRoute },
        POST: { layouts: [], route: createUserRoute },
      },
      "/users/:id": {
        GET: { layouts: [], route: getUserRoute },
        PUT: { layouts: [], route: updateUserRoute },
        DELETE: { layouts: [], route: deleteUserRoute },
      },
      "/protected": {
        GET: { layouts: [], route: protectedRoute },
      },
    },
  } as const;

  beforeAll(async () => {
    const app = createTaserApp(routeManifest);

    await new Promise<void>((resolve) => {
      server = serve(
        {
          fetch: app.fetch,
          port: 0,
        },
        (info) => {
          port = info.port;
          baseUrl = `http://localhost:${port}`;
          resolve();
        },
      );
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("calls root endpoint $get()", async () => {
    const client = createClient<typeof routeManifest>({ baseUrl });
    const res = await client.$get();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ status: "healthy", version: "1.0.0" });
  });

  it("calls /users with query parameters", async () => {
    const client = createClient<typeof routeManifest>({ baseUrl });
    const res = await client.users.$get({ query: { limit: "1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.users).toHaveLength(1);
    expect(data.users[0]?.id).toBe("1");
  });

  it("calls /users/:id with path parameter substitution", async () => {
    const client = createClient<typeof routeManifest>({ baseUrl });
    const res = await client.users._id.$get({ param: { id: "1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toEqual({ id: "1", name: "Alice", email: "alice@example.com" });
  });

  it("returns 404 for nonexistent user ID", async () => {
    const client = createClient<typeof routeManifest>({ baseUrl });
    const res = await client.users._id.$get({ param: { id: "999" } });
    expect(res.status).toBe(404);
  });

  it("posts new user with JSON body payload", async () => {
    const client = createClient<typeof routeManifest>({ baseUrl });
    const res = await client.users.$post({
      body: { name: "Charlie", email: "charlie@example.com" },
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.user.name).toBe("Charlie");
    expect(data.user.email).toBe("charlie@example.com");
  });

  it("updates user with PUT", async () => {
    const client = createClient<typeof routeManifest>({ baseUrl });
    const res = await client.users._id.$put({
      param: { id: "1" },
      body: { name: "Alice Updated" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.name).toBe("Alice Updated");
  });

  it("deletes user with DELETE", async () => {
    const client = createClient<typeof routeManifest>({ baseUrl });
    const res = await client.users._id.$delete({ param: { id: "2" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted).toBe(true);

    // Verify deleted
    const verifyRes = await client.users._id.$get({ param: { id: "2" } });
    expect(verifyRes.status).toBe(404);
  });

  it("passes global Authorization header using async resolver", async () => {
    let token = "secret-token";
    const client = createClient<typeof routeManifest>({
      baseUrl,
      headers: async () => ({ Authorization: `Bearer ${token}` }),
    });

    const res = await client.protected.$get();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authorized).toBe(true);

    // Change token to invalid
    token = "wrong-token";
    const failRes = await client.protected.$get();
    expect(failRes.status).toBe(401);
  });

  it("returns 422 when body schema validation fails", async () => {
    const client = createClient<typeof routeManifest>({ baseUrl });
    const res = await client.users.$post({
      body: { invalid: true } as any,
    });
    expect(res.status).toBe(422);
    const errorData = await res.json();
    expect(errorData).toHaveProperty("errors");
  });
});
