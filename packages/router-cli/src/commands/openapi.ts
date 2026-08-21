import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

export async function runOpenApi(args: string[]): Promise<void> {
  // Resolve from the user's project so workspace-local installs are picked up.
  const require = createRequire(join(process.cwd(), "package.json"));

  let packageJsonPath: string;
  try {
    packageJsonPath = require.resolve("@taserjs/openapi/package.json");
  } catch {
    console.error("@taserjs/openapi is not installed in this project.");
    console.error("Install it to generate OpenAPI specs:");
    console.error("");
    console.error("  pnpm add -D @taserjs/openapi");
    process.exit(1);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    bin?: Record<string, string> | string;
  };
  const binEntry =
    typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.["taser-openapi"];
  if (!binEntry) {
    console.error("Could not locate the taser-openapi binary inside @taserjs/openapi.");
    process.exit(1);
  }

  const binPath = resolve(dirname(packageJsonPath), binEntry);
  const child = spawn(process.execPath, [binPath, ...args], {
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error("Failed to launch taser-openapi:", error);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}
