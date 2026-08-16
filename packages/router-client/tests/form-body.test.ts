import { describe, expect, it } from "vitest";

import { formBody } from "../src/form-body.js";

describe("formBody", () => {
  it("serializes fields into FormData", () => {
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const body = formBody({ name: "Ada", file });

    expect(body).toBeInstanceOf(FormData);
    expect(body.get("name")).toBe("Ada");
    expect(body.get("file")).toBe(file);
  });
});
