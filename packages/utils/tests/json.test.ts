import { describe, it, expect } from "vitest";
import { json } from "../src/index.js";

describe("json helper", () => {
  it("serializes data to a JSON Response with status 200 by default", async () => {
    const res = json({ message: "hello world" });
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ message: "hello world" });
  });

  it("supports numeric status code as second argument", async () => {
    const res = json({ created: true }, 201);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ created: true });
  });

  it("supports ResponseInit object with custom headers and status", async () => {
    const res = json(
      { error: "not found" },
      {
        status: 404,
        headers: {
          "x-custom-header": "test-val",
        },
      },
    );
    expect(res.status).toBe(404);
    expect(res.headers.get("x-custom-header")).toBe("test-val");
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ error: "not found" });
  });
});
