import { describe, expect, it } from "vitest";

import {
  importPathFromLayoutId,
  importPathFromRouteRel,
  layoutImportPathFromRouteRel,
} from "../../src/scan/imports.js";

const prefix = "./routes";

describe("import paths", () => {
  it("emits .js extension for route files", () => {
    expect(importPathFromRouteRel("todo/_auth/$id.get.ts", prefix)).toBe(
      "./routes/todo/_auth/$id.get.js",
    );
  });

  it("emits .js for flat dot notation routes", () => {
    expect(importPathFromRouteRel("posts.$id.get.ts", prefix)).toBe("./routes/posts.$id.get.js");
  });

  it("omits extension when extension is false", () => {
    expect(importPathFromRouteRel("posts.$id.get.ts", prefix, false)).toBe(
      "./routes/posts.$id.get",
    );
  });

  it("emits .js for splat route files", () => {
    expect(importPathFromRouteRel("files/$.get.ts", prefix)).toBe("./routes/files/$.get.js");
  });

  it("emits .js for __root layout alias", () => {
    expect(importPathFromLayoutId("index", prefix, "__root.ts")).toBe("./routes/__root.js");
  });

  it("emits .js for root splat layout", () => {
    expect(layoutImportPathFromRouteRel("$.ts", prefix)).toBe("./routes/$.js");
  });

  it("emits .js for nested splat layout", () => {
    expect(layoutImportPathFromRouteRel("account/$.ts", prefix)).toBe("./routes/account/$.js");
  });

  it("emits .js for directory layout", () => {
    expect(layoutImportPathFromRouteRel("todo/_auth.ts", prefix)).toBe("./routes/todo/_auth.js");
  });
});
