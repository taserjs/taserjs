import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { toScanOptions } from "../../src/config/emit-options.js";
import { resolveTestConfig } from "../helpers/test-config.js";
import { FileIndex } from "../../src/fs/file-index.js";
import { IncrementalRouteModel } from "../../src/model/incremental.js";

describe("FileIndex and IncrementalRouteModel", () => {
  it("updates a single route without full rescan", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-index-"));
    const outputFile = join(routesDir, "..", "routeManifest.gen.ts");
    const config = resolveTestConfig({ routes: routesDir, output: outputFile });

    writeFileSync(join(routesDir, "index.get.ts"), "export const Route = null;\n");

    const index = await FileIndex.fromDirectory(routesDir, config);
    expect(index.size).toBe(1);

    const scanOptions = toScanOptions(config);
    const model = await IncrementalRouteModel.fromColdScan(
      routesDir,
      outputFile,
      index.getAbsolutePaths(),
      scanOptions,
    );
    expect(model.toGeneratedModel().routes).toHaveLength(1);

    writeFileSync(join(routesDir, "posts.get.ts"), "export const Route = null;\n");
    await index.upsert(join(routesDir, "posts.get.ts"), routesDir, config);
    await model.applyFileUpsert(
      routesDir,
      outputFile,
      join(routesDir, "posts.get.ts"),
      scanOptions,
    );

    const updated = model.toGeneratedModel();
    expect(updated.routes).toHaveLength(2);
    expect(updated.routePaths).toContain("/posts");
  });

  it("recomputes layout chains for routes under a changed layout", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-layout-"));
    const outputFile = join(routesDir, "..", "routeManifest.gen.ts");
    const config = resolveTestConfig({ routes: routesDir, output: outputFile });

    writeFileSync(join(routesDir, "$.ts"), "export const Middleware = null;\n");
    mkdirSync(join(routesDir, "account"));
    writeFileSync(join(routesDir, "account", "overview.get.ts"), "export const Route = null;\n");

    const index = await FileIndex.fromDirectory(routesDir, config);
    const scanOptions = toScanOptions(config);
    const model = await IncrementalRouteModel.fromColdScan(
      routesDir,
      outputFile,
      index.getAbsolutePaths(),
      scanOptions,
    );

    writeFileSync(join(routesDir, "account.ts"), "export const Middleware = null;\n");
    await index.upsert(join(routesDir, "account.ts"), routesDir, config);
    await model.applyFileUpsert(routesDir, outputFile, join(routesDir, "account.ts"), scanOptions);

    const overview = model
      .toGeneratedModel()
      .routes.find((route) => route.urlPath === "/account/overview");
    expect(overview?.layoutChain).toContain("account");
  });

  it("removes unlinked route files from the model", async () => {
    const routesDir = mkdtempSync(join(tmpdir(), "taser-unlink-"));
    const outputFile = join(routesDir, "..", "routeManifest.gen.ts");
    const config = resolveTestConfig({ routes: routesDir, output: outputFile });

    writeFileSync(join(routesDir, "keep.get.ts"), "export const Route = null;\n");
    writeFileSync(join(routesDir, "drop.get.ts"), "export const Route = null;\n");

    const index = await FileIndex.fromDirectory(routesDir, config);
    const scanOptions = toScanOptions(config);
    const model = await IncrementalRouteModel.fromColdScan(
      routesDir,
      outputFile,
      index.getAbsolutePaths(),
      scanOptions,
    );
    expect(model.toGeneratedModel().routes).toHaveLength(2);

    const removed = index.remove("drop.get.ts");
    expect(removed).toBeDefined();
    model.applyFileRemoval(removed!);

    expect(model.toGeneratedModel().routes).toHaveLength(1);
    expect(model.toGeneratedModel().routePaths).toEqual(["/keep"]);
  });
});
