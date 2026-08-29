import { describe, expect, it } from "vitest";

import { getComposedAppCode } from "../src/index.js";

describe("getComposedAppCode host contract", () => {
  it("emits no host code or srvx imports without a server entry", () => {
    const code = getComposedAppCode({ scope: "/" });
    expect(code).not.toContain("hostServer");
    expect(code).not.toContain("srvx/node");
  });

  it("installs srvx FastResponse in standalone mode", () => {
    const code = getComposedAppCode({ scope: "/" });
    expect(code).toContain('import { FastResponse } from "srvx"');
    expect(code).toContain("globalThis.Response = FastResponse");
    expect(code).toContain('new Response("Not Found"');
  });

  it("keeps native Response in hosted mode", () => {
    const code = getComposedAppCode({ scope: "/", composeStyle: "hosted" });
    expect(code).not.toContain("FastResponse");
    expect(code).not.toContain("globalThis.Response");
    expect(code).toContain('new Response("Not Found"');
  });

  it("loads the node bridge via dynamic import inside getHostFetch, never at top-level", () => {
    const code = getComposedAppCode({ serverEntrySpecifier: "#taserjs/server-entry" });
    expect(code).not.toMatch(/from\s+"srvx\/node"/);
    expect(code).toContain('import("srvx/node")');
    // Ensure top-level module scope contains no top-level await
    const outsideAsync = code
      .replace(/async\s+function[^{]*\{[\s\S]*?\n\}/g, "")
      .replace(/async\s*\(req\)\s*=>\s*\{[\s\S]*?\n\};/g, "");
    expect(outsideAsync).not.toContain("await ");
  });

  it("resolves fetch-native hosts via their .fetch method", () => {
    const code = getComposedAppCode({ serverEntrySpecifier: "#taserjs/server-entry" });
    expect(code).toContain('import * as hostServer from "#taserjs/server-entry"');
    expect(code).toContain("__hostExport.fetch.bind(__hostExport)");
  });

  it("honors the optional explicit { node } contract", () => {
    const code = getComposedAppCode({ serverEntrySpecifier: "#taserjs/server-entry" });
    expect(code).toContain("__hostExport.node");
  });

  it("auto-wraps bare Node-style callables with toFetchHandler", () => {
    const code = getComposedAppCode({ serverEntrySpecifier: "#taserjs/server-entry" });
    expect(code).toContain("toFetchHandler(__hostExport)");
    expect(code).toContain("__hostExport.length >= 2");
  });

  it("does not special-case unrecognized host objects", () => {
    const code = getComposedAppCode({ serverEntrySpecifier: "#taserjs/server-entry" });
    expect(code).not.toContain(".routing");
    expect(code).not.toContain(".ready");
  });

  it("dispatches taser before the host and 404s on double miss", () => {
    const code = getComposedAppCode({ serverEntrySpecifier: "#taserjs/server-entry" });
    const taserIdx = code.indexOf("await taserRoutesApp.fetch(req)");
    const hostIdx = code.indexOf("await hostFetch(req)");
    const notFoundIdx = code.indexOf('"Not Found"');
    expect(taserIdx).toBeGreaterThan(-1);
    expect(hostIdx).toBeGreaterThan(taserIdx);
    expect(notFoundIdx).toBeGreaterThan(hostIdx);
  });
});
