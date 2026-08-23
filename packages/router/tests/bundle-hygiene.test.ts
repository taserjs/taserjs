import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Bundle hygiene — dependency policy:
 *
 * hono is the platform library (router engine, middleware ecosystem, utils)
 * and may be imported freely across the runtime.
 *
 * Forbidden anywhere in the runtime graph:
 * - `rou3` directly (hono owns routing; avoids the duplicate-matcher chunk)
 * - `h3` / srvx (nitro's stack stays at the boundary — never imported by us)
 */
const FORBIDDEN = ["rou3", "h3", "srvx"];

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith(".js") || full.endsWith(".cjs")) {
      files.push(full);
    }
  }
  return files;
}

function importsAny(file: string, pkgs: string[]): string | undefined {
  const content = readFileSync(file, "utf8");
  for (const pkg of pkgs) {
    if (
      new RegExp(`from\\s*["']${pkg}`).test(content) ||
      new RegExp(`require\\(["']${pkg}["']\\)`).test(content) ||
      new RegExp(`import\\(["']${pkg}`).test(content)
    ) {
      return pkg;
    }
  }
  return undefined;
}

describe("bundle hygiene", () => {
  const routerDist = join(__dirname, "../../dist/esm");
  const coreDist = join(__dirname, "../../../router-core/dist/esm");
  const utilsDist = join(__dirname, "../../../router-utils/dist/esm");

  it("runtime dists contain zero rou3/h3/srvx imports", () => {
    for (const dist of [coreDist, utilsDist, routerDist]) {
      if (!existsSync(dist)) {
        continue; // dist not built yet; build-packages runs first in CI
      }
      const offenders = walk(dist)
        .map((file) => ({ file, pkg: importsAny(file, FORBIDDEN) }))
        .filter((entry) => entry.pkg !== undefined);
      expect(offenders.map((o) => `${relative(dist, o.file)} -> ${o.pkg}`)).toEqual([]);
    }
  });

  it("reply subpath contains zero node builtins", () => {
    const replyDist = join(__dirname, "../../dist/esm/reply.js");
    if (!existsSync(replyDist)) {
      return;
    }
    const content = readFileSync(replyDist, "utf8");
    expect(content).not.toMatch(/from\s*["']node:/);
    expect(content).not.toMatch(/require\(["']node:/);
  });
});
