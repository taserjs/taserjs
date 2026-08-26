import { describe, expect, it } from "vitest";

import { getComposedAppCode } from "../src/index.js";

describe("getComposedAppCode host contract", () => {
  it("emits no host code or srvx imports without a server entry", () => {
    const code = getComposedAppCode({ scope: "/" });
    expect(code).not.toContain("hostServer");
    expect(code).not.toContain("srvx/node");
  });

  it("loads the node bridge via dynamic import, never a static one", () => {
    const code = getComposedAppCode({ serverEntrySpecifier: "#taserjs/server-entry" });
    // Fetch-native hosts (hono) must not require srvx at install time. The
    // standalone FastResponse import from "srvx" is unrelated to hosts.
    expect(code).not.toMatch(/from\s+"srvx\/node"/);
    expect(code).toContain('import("srvx/node")');
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
    expect(code).toContain("await __toFetchHandler(__hostExport)");
    expect(code).toContain("__hostExport.length >= 2");
  });

  it("bridges bare Node-style callables like Fastify's exported routing", () => {
    const code = getComposedAppCode({ serverEntrySpecifier: "#taserjs/server-entry" });
    expect(code).toContain("__hostExport.length >= 2");
    expect(code).toContain("await __toFetchHandler(__hostExport)");
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
