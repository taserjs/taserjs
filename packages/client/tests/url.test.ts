import { describe, expect, it } from "vitest";
import {
  applyPathParams,
  buildSearchParams,
  clientMethodToHttp,
  decodeClientSegment,
  isClientMethod,
  joinUrl,
  resolveHeaders,
} from "../src/url.js";

describe("url utils", () => {
  it("determines client methods and maps them to HTTP verbs", () => {
    expect(isClientMethod("$get")).toBe(true);
    expect(isClientMethod("$post")).toBe(true);
    expect(isClientMethod("$delete")).toBe(true);
    expect(isClientMethod("get")).toBe(false);
    expect(isClientMethod("users")).toBe(false);

    expect(clientMethodToHttp("$get")).toBe("GET");
    expect(clientMethodToHttp("$post")).toBe("POST");
    expect(clientMethodToHttp("$put")).toBe("PUT");
    expect(clientMethodToHttp("$patch")).toBe("PATCH");
    expect(clientMethodToHttp("$delete")).toBe("DELETE");
    expect(clientMethodToHttp("$options")).toBe("OPTIONS");
    expect(clientMethodToHttp("$head")).toBe("HEAD");
    expect(clientMethodToHttp("$query")).toBe("QUERY");
  });

  it("decodes client segments", () => {
    expect(decodeClientSegment("_id")).toBe("_id");
    expect(decodeClientSegment(":id")).toBe(":id");
    expect(decodeClientSegment("_splat")).toBe("_splat");
    expect(decodeClientSegment("*")).toBe("*");
    expect(decodeClientSegment("$well_known")).toBe(".well-known");
    expect(decodeClientSegment("user_profiles")).toBe("user-profiles");
    expect(decodeClientSegment("users")).toBe("users");
  });

  it("joins base url and segments cleanly", () => {
    expect(joinUrl("http://localhost:3000/api", [])).toBe("http://localhost:3000/api/");
    expect(joinUrl("http://localhost:3000/api/", [])).toBe("http://localhost:3000/api/");
    expect(joinUrl("http://localhost:3000/api", ["users"])).toBe("http://localhost:3000/api/users");
    expect(joinUrl("http://localhost:3000/api/", ["users"])).toBe(
      "http://localhost:3000/api/users",
    );
    expect(joinUrl("http://localhost:3000/api", ["users", "123"])).toBe(
      "http://localhost:3000/api/users/123",
    );
    expect(joinUrl("http://localhost:3000/api", [".well-known", "jwks"])).toBe(
      "http://localhost:3000/api/.well-known/jwks",
    );
    expect(joinUrl("http://localhost:3000/api", ["user-profiles", "active-users"])).toBe(
      "http://localhost:3000/api/user-profiles/active-users",
    );
    expect(joinUrl("", ["users", "123"])).toBe("/users/123");
    expect(joinUrl("", [])).toBe("/");
    expect(joinUrl("/api", ["/users/:id"])).toBe("/api/users/:id");
  });

  it("substitutes path parameters with URL encoding", () => {
    expect(applyPathParams(["users", "_id"], { id: "123" })).toEqual(["users", "123"]);
    expect(applyPathParams(["users", ":id"], { id: "456" })).toEqual(["users", "456"]);
    expect(applyPathParams(["users", "_id"], { id: "a/b" })).toEqual(["users", "a%2Fb"]);
    expect(applyPathParams(["files", "_splat"], { _splat: "images/cat.png" })).toEqual([
      "files",
      "images%2Fcat.png",
    ]);
    expect(applyPathParams(["files", "*"], { "*": "file.txt" })).toEqual(["files", "file.txt"]);
    expect(applyPathParams(["/users/:id"], { id: "999" })).toEqual(["users", "999"]);
    expect(applyPathParams(["$well_known", "jwks"], undefined)).toEqual([".well-known", "jwks"]);
    expect(applyPathParams(["user_profiles", "active_users"], undefined)).toEqual([
      "user-profiles",
      "active-users",
    ]);
  });

  it("throws descriptive error when required path params are missing", () => {
    expect(() => applyPathParams(["users", "_id"], {})).toThrow('Missing path param "id"');
    expect(() => applyPathParams(["users", ":id"], {})).toThrow('Missing path param "id"');
    expect(() => applyPathParams(["files", "_splat"], {})).toThrow('Missing path param "_splat"');
    expect(() => applyPathParams(["files", "*"], {})).toThrow('Missing path param "_splat"');
  });

  it("builds query strings properly", () => {
    expect(buildSearchParams(undefined)).toBe("");
    expect(buildSearchParams({})).toBe("");
    expect(buildSearchParams({ search: "hello world" })).toBe("?search=hello+world");
    expect(buildSearchParams({ page: 2, active: true })).toBe("?page=2&active=true");
    expect(buildSearchParams({ tags: ["a", "b"] })).toBe("?tags=a&tags=b");
    expect(buildSearchParams({ empty: null, undef: undefined, keep: 1 })).toBe("?keep=1");
  });

  it("resolves static and async headers", async () => {
    const syncResult = resolveHeaders({ "X-Static": "1" }, { "X-Another": "2" });
    expect(syncResult).toEqual({ "X-Static": "1", "X-Another": "2" });

    const asyncResult = await resolveHeaders(
      { "X-Static": "1" },
      async () => ({ Authorization: "Bearer token-123" }),
      undefined,
      { "X-Per-Request": "true" },
    );
    expect(asyncResult).toEqual({
      "X-Static": "1",
      Authorization: "Bearer token-123",
      "X-Per-Request": "true",
    });
  });
});
