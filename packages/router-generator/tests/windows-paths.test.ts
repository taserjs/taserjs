import { describe, expect, it } from "vitest";

import { emitVirtualEntrySource, toPosixPath } from "../src/index.js";

describe("windows path normalization in router-generator", () => {
  it("toPosixPath unconditionally converts backslashes to forward slashes", () => {
    expect(toPosixPath("C:\\Users\\alice\\project\\src\\taser.ts")).toBe(
      "C:/Users/alice/project/src/taser.ts",
    );
    expect(toPosixPath("relative\\path\\to\\file.ts")).toBe("relative/path/to/file.ts");
    expect(toPosixPath("/already/posix/path")).toBe("/already/posix/path");
  });

  it("emitVirtualEntrySource converts Windows backslash paths to POSIX paths in import specifiers", () => {
    const code = emitVirtualEntrySource({
      taserAppImportPath: "C:\\Users\\alice\\projects\\myapp\\src\\taser.ts",
      manifestImportPath: "C:\\Users\\alice\\projects\\myapp\\.taser\\manifest.ts",
      basePath: "/api",
    });

    // Must use forward slashes in import statements
    expect(code).toContain('import taser from "C:/Users/alice/projects/myapp/src/taser.ts";');
    expect(code).toContain(
      'import { routeManifest } from "C:/Users/alice/projects/myapp/.taser/manifest.ts";',
    );
    expect(code).toContain('export const app = taser.create(routeManifest, { basePath: "/api" });');
    // Must not have unescaped backslashes in imports
    expect(code).not.toContain("C:\\Users");
  });

  it("emitVirtualEntrySource does not create escape sequence issues with folders starting with u or t", () => {
    const code = emitVirtualEntrySource({
      taserAppImportPath: "C:\\users\\bob\\test\\to\\taser.ts",
    });

    expect(code).toContain('import taser from "C:/users/bob/test/to/taser.ts";');
    // Ensures \u and \t are not emitted as raw backslashes
    expect(code).not.toContain("\\users");
    expect(code).not.toContain("\\test");
    expect(code).not.toContain("\\to");
    expect(code).not.toContain("\\taser.ts");
  });
});
