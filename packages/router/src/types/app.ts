import type { RouteManifestShape } from "@taserjs/router-core";
import type { ResponseValidationFailureHandler } from "@taserjs/router-utils";

import type { TaserApp } from "../builder/app.js";
import type { ReturnsMap } from "./returns.js";
import type { Schema } from "./schema.js";

export type CreateTaserAppOptions = {
  basePath?: string;
  passThroughOnMiss?: boolean;
  response?: {
    /** Validate handler replies against returns maps. Default true. */
    validate?: boolean;
    onValidationFailure?: ResponseValidationFailureHandler;
  };
  /** Global cookie defaults and signing secret. Per-call `ctx.cookies.set` options override defaults. */
  cookies?: {
    secret?: string | BufferSource;
    path?: string;
    httpOnly?: boolean;
    sameSite?: "Strict" | "Lax" | "None" | "strict" | "lax" | "none";
    secure?: boolean;
    domain?: string;
    maxAge?: number;
    expires?: Date;
  };
};

export type ContextDefinition<
  TBoot extends Record<string, unknown> = Record<string, never>,
  TReq extends Record<string, unknown> = Record<string, never>,
> = {
  boot?: () => TBoot | Promise<TBoot>;
  request?: (req: Request) => TReq | Promise<TReq>;
};

export type InferAppContext<
  T extends ContextDefinition<Record<string, unknown>, Record<string, unknown>>,
> = T extends ContextDefinition<infer TBoot, infer TReq> ? TBoot & TReq : Record<string, never>;

export type OnErrorOptions<TResponses extends ReturnsMap = ReturnsMap> = {
  responses?: TResponses;
  handle: (error: unknown, ctx?: unknown) => Response | Promise<Response>;
};

export type InferAppManifest<TApp> =
  TApp extends TaserApp<infer TManifest>
    ? TManifest
    : TApp extends { manifest: infer TManifest }
      ? TManifest
      : TApp extends RouteManifestShape
        ? TApp
        : never;

export type { RouteManifestShape } from "@taserjs/router-core";

export type { Schema };

export type { TaserApp } from "../builder/app.js";
