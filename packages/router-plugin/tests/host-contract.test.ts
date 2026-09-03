import { describe, expect, it } from "vitest";

import { getComposedAppCode } from "../src/index.js";

describe("getComposedAppCode host contract", () => {
  it("emits no host code without a server entry", () => {
    const code = getComposedAppCode({ scope: "/" });
    expect(code).not.toContain("hostServer");
    expect(code).toContain('import { createComposedHandler } from "@taserjs/router-plugin/runtime"');
  });

  it("installs srvx FastResponse in standalone mode", () => {
    const code = getComposedAppCode({ scope: "/" });
    expect(code).toContain('import { FastResponse } from "srvx"');
    expect(code).toContain("globalThis.Response = FastResponse");
  });

  it("keeps native Response in hosted mode", () => {
    const code = getComposedAppCode({ scope: "/", composeStyle: "hosted" });
    expect(code).not.toContain("FastResponse");
    expect(code).not.toContain("globalThis.Response");
  });

  it("delegates to createComposedHandler with hostServer when serverEntrySpecifier is given", () => {
    const code = getComposedAppCode({ serverEntrySpecifier: "#taserjs/server-entry" });
    expect(code).toContain('import * as hostServer from "#taserjs/server-entry"');
    expect(code).toContain('import { createComposedHandler } from "@taserjs/router-plugin/runtime"');
    expect(code).toContain("hostServer,");
  });
});
