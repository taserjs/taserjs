import type { PipelineContext } from "../types.js";
import { parseRequestBody } from "./parse-body.js";

const bodyParsedKey = Symbol("taserBodyParsed");

/**
 * Parse request body once and cache on context.
 * Safe to call multiple times; no-op after first parse.
 */
export async function ensureBody(ctx: PipelineContext): Promise<void> {
  const record = ctx as PipelineContext & { [bodyParsedKey]?: boolean };
  if (record[bodyParsedKey]) {
    return;
  }

  const req = ctx.request;
  if (!req) {
    ctx.body = undefined;
    record[bodyParsedKey] = true;
    return;
  }

  ctx.body = await parseRequestBody(req);
  record[bodyParsedKey] = true;
}
