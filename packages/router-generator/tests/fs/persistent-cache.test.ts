import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { resolveDevCachePath } from "../../src/fs/persistent-cache.js";

describe("resolveDevCachePath", () => {
  it("stores cache under node_modules/.cache/taser.json", () => {
    const configDirectory = mkdtempSync(join(tmpdir(), "taser-cache-path-"));
    expect(resolveDevCachePath(configDirectory)).toBe(
      join(configDirectory, "node_modules", ".cache", "taser.json"),
    );
  });
});
