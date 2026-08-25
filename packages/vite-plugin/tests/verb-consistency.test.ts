import { describe, expect, it } from "vitest";
import { HTTP_VERBS, ROUTE_VERB_PATTERN } from "@taserjs/router-generator";
import type { HttpMethod } from "@taserjs/router-core";
import { METHOD_MAP } from "@taserjs/router-client";

/**
 * Issue 06 / H8: the HTTP verb vocabulary is defined per-package until a shared
 * dependency edge exists. These guards fail loudly on drift.
 */

type Expect<T extends boolean> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

export type GeneratorVerbsMatchCore = Expect<Equal<(typeof HTTP_VERBS)[number], HttpMethod>>;

describe("HTTP verb vocabulary consistency", () => {
  it("generator verbs are exactly the core HttpMethod union", () => {
    const coreVerbs: HttpMethod[] = [...HTTP_VERBS];
    expect(coreVerbs).toHaveLength(HTTP_VERBS.length);
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
});
