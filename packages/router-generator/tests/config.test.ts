import { describe, expect, it } from "vitest";

import { taserConfigSchema } from "../src/config.js";

describe("taserConfigSchema option aliases", () => {
  it("accepts entryPath as an alias for entry", () => {
    const resolved = taserConfigSchema.parse({ entryPath: "src/custom-taser.ts" });
    expect(resolved.entry).toBe("src/custom-taser.ts");
  });

  it("accepts serverEntryPath as an alias for serverEntry", () => {
    const resolved = taserConfigSchema.parse({ serverEntryPath: "src/custom-server.ts" });
    expect(resolved.serverEntry).toBe("src/custom-server.ts");
  });
});
