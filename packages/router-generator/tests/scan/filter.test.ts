import { shouldIgnoreRoutePath } from "../../src/scan/filter.js";

describe("shouldIgnoreRoutePath", () => {
  it("ignores files starting with '-' by default", () => {
    expect(shouldIgnoreRoutePath("-filename.ts")).toBe(true);
    expect(shouldIgnoreRoutePath("valid.get.ts")).toBe(false);
  });

  it("ignores files in folders starting with '-' by default", () => {
    expect(shouldIgnoreRoutePath("-folder/filename.ts")).toBe(true);
    expect(shouldIgnoreRoutePath("nested/-folder/filename.ts")).toBe(true);
    expect(shouldIgnoreRoutePath("admin/-components/button.ts")).toBe(true);
    expect(shouldIgnoreRoutePath("valid/nested/route.get.ts")).toBe(false);
  });

  it("ignores dotfiles and dotfolders", () => {
    expect(shouldIgnoreRoutePath(".hidden.ts")).toBe(true);
    expect(shouldIgnoreRoutePath(".git/config")).toBe(true);
  });

  it("respects custom glob ignore patterns", () => {
    const ignore = ["**/*.draft.ts", "**/internal/**", "**/_*"];
    expect(shouldIgnoreRoutePath("post.draft.ts", ignore)).toBe(true);
    expect(shouldIgnoreRoutePath("internal/secret.get.ts", ignore)).toBe(true);
    expect(shouldIgnoreRoutePath("_utils.ts", ignore)).toBe(true);
    expect(shouldIgnoreRoutePath("post.get.ts", ignore)).toBe(false);
  });
});
