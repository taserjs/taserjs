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
    LayoutParents: {
      index: null;
      admin: null;
      root: null;
      nested: "root";
      deep: "nested";
    };
    LayoutTree: {
      index: { middlewares: typeof IndexLayout; parent: null };
      admin: { middlewares: typeof IndexLayout; parent: null };
      root: { middlewares: typeof IndexLayout; parent: null };
      nested: { middlewares: typeof IndexLayout; parent: "root" };
      deep: { middlewares: typeof IndexLayout; parent: "nested" };
    };
    RouteByPathMethod: {
      "/": {
        POST: { layoutChain: readonly ["index"]; route: unknown };
      };
      "/hello": {
        GET: { layoutChain: readonly []; route: unknown };
      };
      "/reports": {
        GET: { layoutChain: readonly []; route: unknown };
      };
      "/search": {
        GET: { layoutChain: readonly []; route: unknown };
      };
      "/file": {
        GET: { layoutChain: readonly []; route: unknown };
      };
      "/pipe": {
        GET: { layoutChain: readonly []; route: unknown };
      };
      "/buffer": {
        GET: { layoutChain: readonly []; route: unknown };
      };
      "/blob": {
        GET: { layoutChain: readonly []; route: unknown };
      };
      "/check-ctx": {
        GET: { layoutChain: readonly ["admin"]; route: unknown };
      };
      "/users/:id": {
        POST: { layoutChain: readonly []; route: unknown };
      };
      "/r01": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r02": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r03": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r04": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r05": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r06": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r07": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r08": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r09": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r10": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r11": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r12": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r13": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r14": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r15": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r16": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r17": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r18": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r19": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r20": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r21": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r22": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r23": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r24": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r25": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r26": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r27": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r28": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r29": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r30": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r31": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r32": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r33": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r34": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r35": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r36": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r37": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r38": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r39": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r40": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r41": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r42": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r43": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r44": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r45": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r46": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r47": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r48": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r49": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
      "/r50": { POST: { layoutChain: readonly ["root", "nested", "deep"]; route: unknown } };
    };
  }
}

export {};
