import { describe, expectTypeOf, it } from "vitest";
import type { Client150, PreGenClient150 } from "./fixtures/manifest-150.js";
import type { InferRequestType, InferResponseType } from "../src/types.js";

describe("150 routes client benchmark", () => {
  it("resolves types for 150-route fallback client", () => {
    expectTypeOf<Client150>().toHaveProperty("r001");
    expectTypeOf<Client150["r001"]>().toHaveProperty("$get");
    expectTypeOf<Client150["r001"]>().toHaveProperty("$post");
    expectTypeOf<Client150>().toHaveProperty("r150");
    expectTypeOf<Client150["r150"]>().toHaveProperty("$get");

    type R001GetReq = InferRequestType<Client150["r001"]["$get"]>;
    expectTypeOf<R001GetReq>().toHaveProperty("query");

    type R001GetRes = InferResponseType<Client150["r001"]["$get"]>;
    expectTypeOf<R001GetRes>().toEqualTypeOf<{ id: 1; name: string }>();

    type R150PostRes = InferResponseType<Client150["r150"]["$post"]>;
    expectTypeOf<R150PostRes>().toEqualTypeOf<{ created: true; id: 150 }>();
  });

  it("resolves types for 150-route pre-generated chain", () => {
    expectTypeOf<PreGenClient150>().toHaveProperty("r001");
    expectTypeOf<PreGenClient150["r001"]>().toHaveProperty("$get");
    expectTypeOf<PreGenClient150["r001"]>().toHaveProperty("$post");
    expectTypeOf<PreGenClient150>().toHaveProperty("r150");
    expectTypeOf<PreGenClient150["r150"]>().toHaveProperty("$get");

    type R001GetReq = InferRequestType<PreGenClient150["r001"]["$get"]>;
    expectTypeOf<R001GetReq>().toHaveProperty("query");

    type R001GetRes = InferResponseType<PreGenClient150["r001"]["$get"]>;
    expectTypeOf<R001GetRes>().toEqualTypeOf<{ id: 1; name: string }>();

    type R150PostRes = InferResponseType<PreGenClient150["r150"]["$post"]>;
    expectTypeOf<R150PostRes>().toEqualTypeOf<{ created: true; id: 150 }>();
  });
});
