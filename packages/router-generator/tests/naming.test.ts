import { describe, expect, it } from "vitest";

import { layoutIdFromPath, layoutImportName } from "../src/index.js";

describe("layoutIdFromPath", () => {
  it("maps root directory layout splat to /*", () => {
    expect(layoutIdFromPath("$")).toBe("/*");
  });

  it("normalizes layout paths with leading slash and param/splat conversions", () => {
    expect(layoutIdFromPath("index")).toBe("/index");
    expect(layoutIdFromPath("account")).toBe("/account");
    expect(layoutIdFromPath("todo/index")).toBe("/todo/index");
    expect(layoutIdFromPath("account/$")).toBe("/account/*");
    expect(layoutIdFromPath("items/$id")).toBe("/items/:id");
    expect(layoutIdFromPath("items.$id")).toBe("/items/:id");
  });
});

describe("layoutImportName", () => {
  it("names root directory layout splat import", () => {
    expect(layoutImportName("/*")).toBe("RootSplatLayoutImport");
  });

  it("names nested directory layout splat import", () => {
    expect(layoutImportName("/account/*")).toBe("AccountSplatLayoutImport");
    expect(layoutImportName("/items/:id")).toBe("ItemsIdLayoutImport");
  });
});
