import { reply } from "@taserjs/router-utils";
import { describe, expect, it } from "vitest";

import { createTaserRuntime, toResponse, toWireResponse } from "../src/index.js";

/**
 * Mimics @hono/node-server serve(): it replaces global.Response with a subclass.
 * ReplyResult still extends the *original* Response, so `instanceof Response` fails.
 */
function installHonoStyleResponseOverride(): () => void {
  const OriginalResponse = globalThis.Response;
  class LightweightResponse extends OriginalResponse {}
  Object.defineProperty(globalThis, "Response", { value: LightweightResponse, configurable: true });
  return () => {
    Object.defineProperty(globalThis, "Response", { value: OriginalResponse, configurable: true });
  };
}

describe("toResponse with global.Response override", () => {
  it("does not JSON-envelope ReplyResult when instanceof Response fails", async () => {
    const restore = installHonoStyleResponseOverride();
    try {
      const result = reply.text("Hello, world!");
      expect(result instanceof Response).toBe(false);

      const coerced = toResponse(result);
      const wire = toWireResponse(coerced);
      expect(await wire.text()).toBe("Hello, world!");
      expect(wire.headers.get("content-type")).toMatch(/text\/plain/);
    } finally {
      restore();
    }
  });

  it("runtime returns plain text after Response override", async () => {
    const restore = installHonoStyleResponseOverride();
    try {
      const route = {
        path: "/account/plain",
        method: "GET" as const,
        middlewares: [] as const,
        handlerMiddlewares: [] as const,
        handler: () => reply.text("Hello, world!"),
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

      expect(response.headers.get("content-type")).toMatch(/text\/plain/);
      expect(await response.text()).toBe("Hello, world!");
    } finally {
      restore();
    }
  });
});
