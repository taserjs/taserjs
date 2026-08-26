import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { HTTP_VERBS, ROUTE_VERB_PATTERN } from "@taserjs/router-generator";
import type { HttpMethod } from "@taserjs/router-utils/http";
import { METHOD_MAP } from "@taserjs/router-client";

type Expect<T extends boolean> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type GeneratorVerbsMatchUtils = Expect<Equal<(typeof HTTP_VERBS)[number], HttpMethod>>;

describe("HTTP verb vocabulary consistency", () => {
  it("generator verbs are exactly the shared HttpMethod union", () => {
    const verbs: HttpMethod[] = [...HTTP_VERBS];
    expect(verbs).toHaveLength(HTTP_VERBS.length);
  });

  it("client method map covers exactly the shared verbs", () => {
    expect(Object.keys(METHOD_MAP).sort()).toEqual([...HTTP_VERBS].sort());
    expect(Object.values(METHOD_MAP)).toHaveLength(HTTP_VERBS.length);
  });

  it("route filename pattern accepts every verb plus any/all aliases", () => {
    const patternSource = ROUTE_VERB_PATTERN.source;
    for (const verb of HTTP_VERBS) {
      expect(patternSource).toContain(verb.toLowerCase());
    }
    expect(patternSource).toContain("any");
    expect(patternSource).toContain("all");
  });

  it("maintains zero dependency on server runtime (@taserjs/router-core)", async () => {
    const pkgJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
    expect(deps).not.toHaveProperty("@taserjs/router-core");
    expect(deps).not.toHaveProperty("hono");
  });
});
