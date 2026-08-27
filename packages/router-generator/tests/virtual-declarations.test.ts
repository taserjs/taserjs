import { describe, expect, it } from "vitest";

import {
  emitVirtualDeclarationsSource,
  VIRTUAL_ENTRY_ID,
  VIRTUAL_MANIFEST_ID,
} from "../src/index.js";

describe("emitVirtualDeclarationsSource", () => {
  it("emits ambient declarations for virtual manifest and entry using constants", () => {
    const code = emitVirtualDeclarationsSource();

    expect(code).toContain(`declare module "${VIRTUAL_MANIFEST_ID}"`);
    expect(code).toContain('export const routeManifest: import("./routes.js").RouteManifest;');
    expect(code).toContain("export default routeManifest;");
    expect(code).toContain('export type RouteManifest = import("./routes.js").RouteManifest;');

    expect(code).toContain(`declare module "${VIRTUAL_ENTRY_ID}"`);
    expect(code).toContain('import type { TaserApp } from "@taserjs/router";');
    expect(code).toContain('export const app: TaserApp<import("./routes.js").RouteManifest>;');
    expect(code).toContain("export default app;");
  });
});
