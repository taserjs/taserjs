import { describe, expect, it } from "vitest";
import {
  HTTP_METHODS,
  HTTP_VERBS,
  isHttpMethod,
  CLIENT_METHOD_MAP,
  STATUS_OK,
  STATUS_NOT_FOUND,
  STATUS_INTERNAL_SERVER_ERROR,
  APPLICATION_JSON,
  TEXT_PLAIN,
} from "../src/http.js";

describe("router-utils /http subpath", () => {
  it("exports canonical HTTP methods and verbs", () => {
    expect(HTTP_METHODS).toEqual([
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
      "HEAD",
      "QUERY",
    ]);
    expect(HTTP_VERBS).toBe(HTTP_METHODS);
  });

  it("validates methods correctly with isHttpMethod", () => {
    expect(isHttpMethod("get")).toBe(true);
    expect(isHttpMethod("GET")).toBe(true);
    expect(isHttpMethod("post")).toBe(true);
    expect(isHttpMethod("POST")).toBe(true);
    expect(isHttpMethod("DELETE")).toBe(true);
    expect(isHttpMethod("query")).toBe(true);
    expect(isHttpMethod("QUERY")).toBe(true);
    expect(isHttpMethod("PURGE")).toBe(false);
    expect(isHttpMethod("")).toBe(false);
  });

  it("exports client method map with all verbs", () => {
    expect(CLIENT_METHOD_MAP.GET).toBe("$get");
    expect(CLIENT_METHOD_MAP.POST).toBe("$post");
    expect(CLIENT_METHOD_MAP.PUT).toBe("$put");
    expect(CLIENT_METHOD_MAP.PATCH).toBe("$patch");
    expect(CLIENT_METHOD_MAP.DELETE).toBe("$delete");
    expect(CLIENT_METHOD_MAP.OPTIONS).toBe("$options");
    expect(CLIENT_METHOD_MAP.HEAD).toBe("$head");
    expect(CLIENT_METHOD_MAP.QUERY).toBe("$query");
  });

  it("exports status codes and content type constants", () => {
    expect(STATUS_OK).toBe(200);
    expect(STATUS_NOT_FOUND).toBe(404);
    expect(STATUS_INTERNAL_SERVER_ERROR).toBe(500);
    expect(APPLICATION_JSON).toBe("application/json; charset=utf-8");
    expect(TEXT_PLAIN).toBe("text/plain; charset=utf-8");
  });
});
