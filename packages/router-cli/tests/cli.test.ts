import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import { runGenerate } from "../src/commands/generate.js";

describe("runGenerate", () => {
  it("generates ambient types from routes directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-test-"));
    const srcDir = join(dir, "src");
    const routesDir = join(srcDir, "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(srcDir, "taser.ts"),
      `import { createTaserApp } from "@taserjs/router";\nexport const t = createTaserApp();\n`,
    );

    writeFileSync(
      join(routesDir, "index.get.ts"),
      `import { t } from "../taser.js";\nconst GET = t.get("/");\nexport const Route = GET.handler(() => ({ ok: true }));\n`,
    );

    await runGenerate({ dir });

    const typesPath = join(dir, ".taser", "types", "routes.d.ts");
    expect(existsSync(typesPath)).toBe(true);
  });

  it("maintains zero dependency on bundler plugin suite (@taserjs/router-plugin)", async () => {
    const pkgJson = JSON.parse(
      await import("node:fs/promises").then((f) =>
        f.readFile(new URL("../package.json", import.meta.url), "utf8"),
      ),
    );
    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
    expect(deps).not.toHaveProperty("@taserjs/router-plugin");
    expect(deps).not.toHaveProperty("@taserjs/router-core");
  });
});
