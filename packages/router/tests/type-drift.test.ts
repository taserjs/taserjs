import { describe, expectTypeOf, it } from "vitest";
import type {
  CookieRuntimeConfig as CoreCookieRuntimeConfig,
  MiddlewareDefinition as CoreMiddlewareDefinition,
  HttpMethod as CoreHttpMethod,
} from "@taserjs/router-core";
import type {
  CreateTaserAppOptions,
  HttpMethod as RouterHttpMethod,
  MiddlewareDefinition as RouterMiddlewareDefinition,
  ReturnsMap,
  StatusCode,
} from "../src/index.js";
import type { StatusCode as UtilsStatusCode } from "@taserjs/router-utils";

describe("Type drift assertion suite", () => {
  it("ensures MiddlewareDefinition in router is assignable to/from router-core", () => {
    expectTypeOf<RouterMiddlewareDefinition>().toMatchTypeOf<CoreMiddlewareDefinition>();
    expectTypeOf<RouterMiddlewareDefinition>().toEqualTypeOf<
      CoreMiddlewareDefinition<ReturnsMap>
    >();
  });

  it("ensures Cookie configuration shapes match between router and router-core", () => {
    type AppCookies = NonNullable<CreateTaserAppOptions["cookies"]>;
    expectTypeOf<AppCookies>().toEqualTypeOf<CoreCookieRuntimeConfig>();
  });

  it("ensures StatusCode canonical vocabulary matches across router and router-utils", () => {
    expectTypeOf<StatusCode>().toEqualTypeOf<UtilsStatusCode>();
  });

  it("ensures HttpMethod types match across router and router-core", () => {
    expectTypeOf<RouterHttpMethod>().toEqualTypeOf<CoreHttpMethod>();
  });
});
