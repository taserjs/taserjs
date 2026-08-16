import { describe, expect, it } from "vitest";

import type { LayoutFile } from "../src/types/index.js";
import {
  layoutAppliesToRoute,
  layoutParentId,
  routeLayoutChain,
} from "../src/model/layout-tree.js";

const layouts: LayoutFile[] = [
  { id: "_public", importName: "PublicLayoutImport", importPath: "./_public" },
  { id: "posts_", importName: "PostsLayoutImport", importPath: "./posts_" },
  { id: "account", importName: "AccountLayoutImport", importPath: "./account" },
  { id: "account/$", importName: "AccountSplatLayoutImport", importPath: "./account/$" },
  { id: "settings", importName: "SettingsLayoutImport", importPath: "./settings" },
];

const layoutsWithRoot: LayoutFile[] = [
  { id: "/$", importName: "RootSplatLayoutImport", importPath: "./$" },
  ...layouts,
];

describe("layoutAppliesToRoute", () => {
  it("matches flat pathless layouts", () => {
    expect(layoutAppliesToRoute("_public", "_public/health")).toBe(true);
  });

  it("matches segment pathless break layouts", () => {
    expect(layoutAppliesToRoute("posts_", "posts/$id/edit")).toBe(true);
  });

  it("matches directory layouts", () => {
    expect(layoutAppliesToRoute("settings", "settings/profile")).toBe(true);
    expect(layoutAppliesToRoute("account", "account/overview")).toBe(true);
  });

  it("matches root directory layout splat for all routes", () => {
    expect(layoutAppliesToRoute("/$", "index")).toBe(true);
    expect(layoutAppliesToRoute("/$", "account/overview")).toBe(true);
  });

  it("matches nested directory layout splat", () => {
    expect(layoutAppliesToRoute("account/$", "account/overview")).toBe(true);
    expect(layoutAppliesToRoute("account/$", "account")).toBe(false);
  });
});

describe("routeLayoutChain", () => {
  it("orders layouts shallow to deep", () => {
    expect(routeLayoutChain("_public/health", layouts)).toEqual(["_public"]);
    expect(routeLayoutChain("posts/$id/edit", layouts)).toEqual(["posts_"]);
    expect(routeLayoutChain("settings/profile", layouts)).toEqual(["settings"]);
    expect(routeLayoutChain("account/overview", layouts)).toEqual(["account", "account/$"]);
  });

  it("includes root splat as outermost layout", () => {
    expect(routeLayoutChain("account/overview", layoutsWithRoot)).toEqual([
      "/$",
      "account",
      "account/$",
    ]);
  });
});

describe("layoutParentId", () => {
  const layoutIdSet = new Set(layoutsWithRoot.map((layout) => layout.id));

  it("returns null for root directory layout splat", () => {
    expect(layoutParentId("/$", layoutIdSet)).toBe(null);
  });

  it("parents nested directory layout splat to segment layout", () => {
    expect(layoutParentId("account/$", layoutIdSet)).toBe("account");
  });

  it("parents top-level layouts to root splat when present", () => {
    expect(layoutParentId("account", layoutIdSet)).toBe("/$");
  });
});
