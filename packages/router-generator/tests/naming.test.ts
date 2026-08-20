import { describe, expect, it } from "vitest";

import { layoutIdFromPath, layoutImportName } from "../src/support/naming.js";

describe("layoutIdFromPath", () => {
  it("maps root directory layout splat to /$", () => {
    expect(layoutIdFromPath("$")).toBe("/$");
  });

  it("passes through segment layouts unchanged", () => {
    expect(layoutIdFromPath("index")).toBe("index");
    expect(layoutIdFromPath("account")).toBe("account");
    expect(layoutIdFromPath("todo/index")).toBe("todo/index");
  });
});

describe("layoutImportName", () => {
  it("names root directory layout splat import", () => {
    expect(layoutImportName("/$")).toBe("RootSplatLayoutImport");
  });

  it("names nested directory layout splat import", () => {
    expect(layoutImportName("account/$")).toBe("AccountSplatLayoutImport");
  });
});
