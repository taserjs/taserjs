import { describe, it, expect } from "vitest";
import { normalizeRoutePath } from "../src/index.js";

describe("normalizeRoutePath", () => {
  it("ensures path starts with a leading slash", () => {
    expect(normalizeRoutePath("hello")).toBe("/hello");
    expect(normalizeRoutePath("")).toBe("/");
    expect(normalizeRoutePath("/")).toBe("/");
  });

  it("removes trailing slashes except for root", () => {
    expect(normalizeRoutePath("/users/")).toBe("/users");
    expect(normalizeRoutePath("/users/profile/")).toBe("/users/profile");
  });

  it("collapses duplicate slashes", () => {
    expect(normalizeRoutePath("//users///profile")).toBe("/users/profile");
  });

  it("converts $param to :param", () => {
    expect(normalizeRoutePath("/users/$id")).toBe("/users/:id");
    expect(normalizeRoutePath("/users/$userId/posts/$postId")).toBe("/users/:userId/posts/:postId");
  });

  it("preserves :param Hono syntax", () => {
    expect(normalizeRoutePath("/users/:id")).toBe("/users/:id");
  });

  it("converts catch-all [...slug] or $ to wildcard *", () => {
    expect(normalizeRoutePath("/files/[...slug]")).toBe("/files/*");
    expect(normalizeRoutePath("/files/$")).toBe("/files/*");
    expect(normalizeRoutePath("/files/*")).toBe("/files/*");
  });
});
