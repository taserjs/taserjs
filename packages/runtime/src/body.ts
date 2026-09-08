import type { Context } from "hono";
import type { BodyMode } from "@taserjs/utils";
import { UnsupportedMediaTypeError } from "@taserjs/utils";

export interface ParsedMediaType {
  type: string;
  subtype: string;
}

export function parseMediaType(contentType: string | null | undefined): ParsedMediaType | null {
  if (!contentType) {
    return null;
  }
  const semicolon = contentType.indexOf(";");
  const media = (semicolon === -1 ? contentType : contentType.slice(0, semicolon))
    .trim()
    .toLowerCase();
  const slash = media.indexOf("/");
  if (slash === -1) {
    return null;
  }
  return {
    type: media.slice(0, slash),
    subtype: media.slice(slash + 1),
  };
}

export function isJsonMediaType(media: ParsedMediaType | null): boolean {
  if (!media) return false;
  return media.type === "application" && (media.subtype === "json" || media.subtype.endsWith("+json"));
}

export function isMultipartMediaType(media: ParsedMediaType | null): boolean {
  if (!media) return false;
  return media.type === "multipart" && media.subtype === "form-data";
}

export function isUrlencodedMediaType(media: ParsedMediaType | null): boolean {
  if (!media) return false;
  return media.type === "application" && media.subtype === "x-www-form-urlencoded";
}

export function isFormMediaType(media: ParsedMediaType | null): boolean {
  return isMultipartMediaType(media) || isUrlencodedMediaType(media);
}

export function isTextMediaType(media: ParsedMediaType | null): boolean {
  if (!media) return false;
  return media.type === "text";
}

export function matchMediaType(mode: BodyMode, media: ParsedMediaType | null): boolean {
  switch (mode) {
    case "json":
      return isJsonMediaType(media);
    case "form":
      return isFormMediaType(media);
    case "urlencoded":
      return isUrlencodedMediaType(media);
    case "text":
      return isTextMediaType(media);
    case "raw":
      return true;
    default:
      return false;
  }
}

export async function extractBody(c: Context, mode?: BodyMode): Promise<unknown> {
  if (c.req.method === "GET" || c.req.method === "HEAD") {
    return undefined;
  }

  const rawContentType = c.req.header("content-type");
  const media = parseMediaType(rawContentType);

  if (mode !== undefined) {
    if (!matchMediaType(mode, media)) {
      throw new UnsupportedMediaTypeError(
        `Unsupported Media Type: expected ${mode} payload, received ${rawContentType || "none"}`,
      );
    }

    switch (mode) {
      case "json":
        return await c.req.json();
      case "form":
        return await c.req.parseBody({ all: true });
      case "urlencoded":
        return await c.req.parseBody({ all: true });
      case "text":
        return await c.req.text();
      case "raw":
        return c.req.raw;
    }
  }

  // If no explicit mode declared, detect from Content-Type header
  if (isJsonMediaType(media)) {
    return await c.req.json();
  }
  if (isFormMediaType(media)) {
    return await c.req.parseBody({ all: true });
  }
  if (isTextMediaType(media)) {
    return await c.req.text();
  }

  return undefined;
}
