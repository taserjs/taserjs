import { describe, expect, it } from "vitest";

import { normalizeRouteRel } from "../src/scan/normalize.js";

describe("normalizeRouteRel", () => {
  it("expands flat dot routes to directory paths", () => {
    expect(normalizeRouteRel("posts.$id.get.ts")).toBe("posts/$id.get.ts");
    expect(normalizeRouteRel("settings.profile.get.ts")).toBe("settings/profile.get.ts");
  });

  it("handles segment pathless break in flat files", () => {
    expect(normalizeRouteRel("posts_.$id.edit.get.ts")).toBe("posts/$id/edit.get.ts");
  });

  it("expands flat dot layouts to directory paths", () => {
    expect(normalizeRouteRel("account.$.ts")).toBe("account/$.ts");
  });

  it("passes through directory paths unchanged", () => {
    expect(normalizeRouteRel("todo/$id.get.ts")).toBe("todo/$id.get.ts");
  });
});
