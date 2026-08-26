import { describe, expect, it } from "vitest";

import { buildUrlPath } from "../src/index.js";

describe("buildUrlPath", () => {
  it("builds index routes", () => {
    expect(buildUrlPath("index.get.ts")).toBe("/");
    expect(buildUrlPath("todo/index.get.ts")).toBe("/todo");
    expect(buildUrlPath("todo.index.get.ts")).toBe("/todo");
    expect(buildUrlPath("posts/$id.index.get.ts")).toBe("/posts/:id");
    expect(buildUrlPath("posts.$id.index.get.ts")).toBe("/posts/:id");
  });

  it("skips pathless segments", () => {
    expect(buildUrlPath("_public/health.get.ts")).toBe("/health");
    expect(buildUrlPath("_public.health.get.ts")).toBe("/health");
    expect(buildUrlPath("todo/_auth/$id.patch.ts")).toBe("/todo/:id");
    expect(buildUrlPath("_auth.login.post.ts")).toBe("/login");
    expect(buildUrlPath("_app._dashboard.metrics.get.ts")).toBe("/metrics");
  });

  it("builds splat routes", () => {
    expect(buildUrlPath("$.get.ts")).toBe("/*");
    expect(buildUrlPath("files/$.get.ts")).toBe("/files/*");
    expect(buildUrlPath("files.$.get.ts")).toBe("/files/*");
  });

  it("handles flat dot nested segments and mixed paths", () => {
    expect(buildUrlPath("tasks/$id.complete.patch.ts")).toBe("/tasks/:id/complete");
    expect(buildUrlPath("tasks.$id.complete.patch.ts")).toBe("/tasks/:id/complete");
    expect(buildUrlPath("posts.$postId.edit.get.ts")).toBe("/posts/:postId/edit");
  });

  it("handles layout breakout segments", () => {
    expect(buildUrlPath("posts/$id/edit.get.ts")).toBe("/posts/:id/edit");
    expect(buildUrlPath("posts_.$id.get.ts")).toBe("/posts/:id");
    expect(buildUrlPath("tasks/$id_.complete.patch.ts")).toBe("/tasks/:id/complete");
  });

  it("handles bracket escaping for dots, underscores, and literal index", () => {
    expect(buildUrlPath("sitemap[.]xml.get.ts")).toBe("/sitemap.xml");
    expect(buildUrlPath("docs/v1[.]0/api.get.ts")).toBe("/docs/v1.0/api");
    expect(buildUrlPath("[_]private.get.ts")).toBe("/_private");
    expect(buildUrlPath("tasks/task[_].get.ts")).toBe("/tasks/task_");
    expect(buildUrlPath("items/[index].get.ts")).toBe("/items/index");
  });
});
