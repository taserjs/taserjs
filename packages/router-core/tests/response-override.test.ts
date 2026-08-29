import { text } from "@taserjs/router-utils/reply";
import { describe, expect, it } from "vitest";

import { createTaserRuntime } from "../src/index.js";

/**
 * Mimics @hono/node-server serve(): it replaces global.Response with a subclass.
 */
function installHonoStyleResponseOverride(): {
  OriginalResponse: typeof Response;
  restore: () => void;
} {
  const OriginalResponse = globalThis.Response;
  class LightweightResponse extends OriginalResponse {}
  Object.defineProperty(globalThis, "Response", { value: LightweightResponse, configurable: true });
  return {
    OriginalResponse,
    restore: () => {
      Object.defineProperty(globalThis, "Response", {
        value: OriginalResponse,
        configurable: true,
      });
    },
  };
}

describe("runtime with global.Response override", () => {
  it("runtime returns plain text after Response override", async () => {
    const { restore } = installHonoStyleResponseOverride();
    try {
      const route = {
        path: "/account/plain",
        method: "GET" as const,
        middlewares: [] as const,
        handler: () => text("Hello, world!"),
      };
      const manifest = {
        layouts: {
          root: { middlewares: { layout: "root", middlewares: [] as const } },
        },
        routes: {
          "/account/plain": {
            GET: { layoutChain: ["root"], route },
          },
        },
      };

      const response = await createTaserRuntime(manifest, () => ({})).fetch(
        new Request("http://localhost/account/plain"),
      );

      expect(response!.headers.get("content-type")).toMatch(/text\/plain/);
      expect(await response!.text()).toBe("Hello, world!");
    } finally {
      restore();
    }
  });
});
