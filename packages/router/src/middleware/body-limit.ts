import { bodyLimit as honoBodyLimit } from "hono/body-limit";
import type { Context } from "hono";
import { payloadTooLarge } from "@taserjs/utils";
import { hono } from "../hono.js";
import type { MiddlewareDefinition } from "../types.js";

export type OnError = (c: Context) => Response | Promise<Response>;

export interface BodyLimitOptions {
  maxSize: number;
  onError?: OnError;
}

export function bodyLimit(options: BodyLimitOptions): MiddlewareDefinition {
  const onError = options.onError ?? (() => payloadTooLarge({ message: "Payload Too Large" }));
  const honoMw = honoBodyLimit({
    maxSize: options.maxSize,
    onError,
  });

  return hono(honoMw);
}
