import { describe, expect, it } from "vitest";

import type { LayoutFile } from "../src/types.js";
import { layoutAppliesToRoute, layoutParentId, routeLayoutChain } from "../src/index.js";

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

  it("handles breakout routes skipping segment layouts", () => {
    const customLayouts: LayoutFile[] = [
      { id: "/$", importName: "RootLayout", importPath: "./$" },
      { id: "tasks", importName: "TasksLayout", importPath: "./tasks" },
      { id: "tasks/$id", importName: "TasksIdLayout", importPath: "./tasks/$id" },
      { id: "posts", importName: "PostsLayout", importPath: "./posts" },
    ];

    // Standard nested route inherits both tasks and tasks/$id
    expect(routeLayoutChain("tasks/$id/complete", customLayouts)).toEqual([
      "/$",
      "tasks",
      "tasks/$id",
    ]);

    // Breakout on $id_ skips tasks/$id layout
    expect(routeLayoutChain("tasks/$id_/complete", customLayouts)).toEqual(["/$", "tasks"]);

    // Breakout on posts_ skips posts layout
    expect(routeLayoutChain("posts_/$id/edit", customLayouts)).toEqual(["/$"]);
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

  it("parents root index layout to root splat", () => {
    const withIndex = new Set(["/$", "index"]);
    expect(layoutParentId("index", withIndex)).toBe("/$");
  });

  it("parents nested index layout to its directory layout", () => {
    const withAdminIndex = new Set(["/$", "admin", "admin/index"]);
    expect(layoutParentId("admin/index", withAdminIndex)).toBe("admin");
  });
});

describe("index layout matching and ordering", () => {
  const indexLayouts: LayoutFile[] = [
    { id: "index", importName: "RootIndexLayout", importPath: "./index" },
    { id: "/$", importName: "RootSplatLayout", importPath: "./$" },
    { id: "admin", importName: "AdminLayout", importPath: "./admin" },
    { id: "admin/index", importName: "AdminIndexLayout", importPath: "./admin/index" },
  ];

  it("applies root index layout ONLY to root index route", () => {
    expect(layoutAppliesToRoute("index", "index")).toBe(true);
    expect(layoutAppliesToRoute("index", "users")).toBe(false);
    expect(layoutAppliesToRoute("index", "admin/overview")).toBe(false);
  });

  it("applies nested index layout ONLY to nested index route", () => {
    expect(layoutAppliesToRoute("admin/index", "admin/index")).toBe(true);
    expect(layoutAppliesToRoute("admin/index", "admin/users")).toBe(false);
  });

  it("orders root splat before index layout in layout chain", () => {
    expect(routeLayoutChain("index", indexLayouts)).toEqual(["/$", "index"]);
    expect(routeLayoutChain("admin/index", indexLayouts)).toEqual(["/$", "admin", "admin/index"]);
    expect(routeLayoutChain("admin/users", indexLayouts)).toEqual(["/$", "admin"]);
  });
});
