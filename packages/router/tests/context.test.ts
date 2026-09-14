import { describe, it, expect } from "vitest";
import { createContext } from "../src/index.js";

describe("createContext in @taserjs/router", () => {
  it("creates a context definition with boot and request functions", () => {
    const bootFn = async () => ({ db: "mock_db" });
    const requestFn = (_req: any) => ({ requestId: "123" });

    const ctxDef = createContext({
      boot: bootFn,
      request: requestFn,
    });

    expect(ctxDef.kind).toBe("context");
    expect(ctxDef.boot).toBe(bootFn);
    expect(ctxDef.request).toBe(requestFn);
  });
});
