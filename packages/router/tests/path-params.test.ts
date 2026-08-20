import { describe, it } from "vitest";

import type { PathParams } from "../src/types/index.js";
import type { AssertTrue, ExpectEqual } from "./helpers.js";

describe("PathParams", () => {
  it("parses dynamic segments", () => {
    type Params = PathParams<"/todo/:id">;
    const _check: AssertTrue<ExpectEqual<Params, { id: string }>> = true;
    void _check;
  });

  it("parses splat segments", () => {
    type Params = PathParams<"/files/*">;
    const _check: AssertTrue<ExpectEqual<Params, { _splat: string }>> = true;
    void _check;
  });

  it("overrides inferred string param with validated schema param type", () => {
    type BaseParams = PathParams<"/tasks/:id">;
    type ValidatedParams = { id: number };
    type Resolved = import("../src/types/index.js").ResolveParams<BaseParams, ValidatedParams>;
    const _check: AssertTrue<ExpectEqual<Resolved, { id: number }>> = true;
    void _check;
  });

  it("preserves unvalidated path params alongside validated ones", () => {
    type BaseParams = PathParams<"/orgs/:orgId/tasks/:id">;
    type ValidatedParams = { id: number };
    type Resolved = import("../src/types/index.js").ResolveParams<BaseParams, ValidatedParams>;
    const _check: AssertTrue<ExpectEqual<Resolved, { orgId: string; id: number }>> = true;
    void _check;
  });
});
