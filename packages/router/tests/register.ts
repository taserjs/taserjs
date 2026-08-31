import type {} from "../src/index.js";

import type { IndexLayout } from "./fixtures/index-layout.js";

declare module "@taserjs/router" {
  interface RouterRegister {
    RoutePath:
      | "/"
      | "/hello"
      | "/reports"
      | "/search"
      | "/file"
      | "/pipe"
      | "/buffer"
      | "/blob"
      | "/check-ctx"
      | "/users/:id"
      | "/r01"
      | "/r02"
      | "/r03"
      | "/r04"
      | "/r05"
      | "/r06"
      | "/r07"
      | "/r08"
      | "/r09"
      | "/r10"
      | "/r11"
      | "/r12"
      | "/r13"
      | "/r14"
      | "/r15"
      | "/r16"
      | "/r17"
      | "/r18"
      | "/r19"
      | "/r20"
      | "/r21"
      | "/r22"
      | "/r23"
      | "/r24"
      | "/r25"
      | "/r26"
      | "/r27"
      | "/r28"
      | "/r29"
      | "/r30"
      | "/r31"
      | "/r32"
      | "/r33"
      | "/r34"
      | "/r35"
      | "/r36"
      | "/r37"
      | "/r38"
      | "/r39"
      | "/r40"
      | "/r41"
      | "/r42"
      | "/r43"
      | "/r44"
      | "/r45"
      | "/r46"
      | "/r47"
      | "/r48"
      | "/r49"
      | "/r50";
    LayoutId: "index" | "admin" | "root" | "nested" | "deep";
    LayoutTree: {
      index: { parent: null };
      admin: { parent: null };
      root: { parent: null };
      nested: { parent: "root" };
      deep: { parent: "nested" };
    };
  }
  interface RouterMiddlewaresRegister {
    LayoutMiddlewares: {
      index: typeof IndexLayout;
      admin: typeof IndexLayout;
      root: typeof IndexLayout;
      nested: typeof IndexLayout;
      deep: typeof IndexLayout;
    };
  }
  interface RouterRoutesRegister {
    RouteByPathMethod: {
      "/": {
        POST: { layouts: readonly ["index"]; route: unknown };
      };
      "/hello": {
        GET: { layouts: readonly []; route: unknown };
      };
      "/reports": {
        GET: { layouts: readonly []; route: unknown };
      };
      "/search": {
        GET: { layouts: readonly []; route: unknown };
      };
      "/file": {
        GET: { layouts: readonly []; route: unknown };
      };
      "/pipe": {
        GET: { layouts: readonly []; route: unknown };
      };
      "/buffer": {
        GET: { layouts: readonly []; route: unknown };
      };
      "/blob": {
        GET: { layouts: readonly []; route: unknown };
      };
      "/check-ctx": {
        GET: { layouts: readonly ["admin"]; route: unknown };
      };
      "/users/:id": {
        POST: { layouts: readonly []; route: unknown };
      };
      "/r01": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r02": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r03": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r04": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r05": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r06": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r07": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r08": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r09": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r10": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r11": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r12": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r13": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r14": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r15": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r16": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r17": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r18": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r19": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r20": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r21": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r22": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r23": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r24": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r25": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r26": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r27": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r28": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r29": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r30": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r31": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r32": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r33": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r34": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r35": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r36": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r37": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r38": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r39": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r40": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r41": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r42": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r43": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r44": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r45": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r46": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r47": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r48": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r49": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r50": { POST: { layouts: readonly ["root", "nested", "deep"]; route: unknown } };
    };
  }
}

export {};
