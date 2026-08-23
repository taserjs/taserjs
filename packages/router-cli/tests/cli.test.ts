import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import { runGenerate } from "../src/commands/generate.js";

describe("runGenerate", () => {
  it("generates ambient types from routes directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "taser-cli-test-"));
    const routesDir = join(dir, "src", "routes");
    mkdirSync(routesDir, { recursive: true });

    writeFileSync(
      join(routesDir, "index.get.ts"),
      `import { t } from "#src/taser.js";\nconst GET = t.get("/");\nexport const Route = GET.handler(() => ({ ok: true }));\n`,
    );

    await runGenerate({ dir });

    const typesPath = join(dir, ".taser", "types", "routes.d.ts");
    expect(existsSync(typesPath)).toBe(true);
  });
});
