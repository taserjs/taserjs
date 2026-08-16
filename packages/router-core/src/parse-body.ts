import type { HonoRequest } from "hono";

type ParsedMediaType = {
  type: string;
  subtype: string;
};

function parseMediaType(contentType: string): ParsedMediaType | null {
  const semicolon = contentType.indexOf(";");
  const media = (semicolon === -1 ? contentType : contentType.slice(0, semicolon))
    .trim()
    .toLowerCase();
  const slash = media.indexOf("/");
  if (slash === -1) {
    return null;
  }
  const type = media.slice(0, slash);
  const subtype = media.slice(slash + 1);
  if (!type || !subtype) {
    return null;
  }
  return { type, subtype };
}

function isJsonMediaType(type: string, subtype: string): boolean {
  return type === "application" && (subtype === "json" || subtype.endsWith("+json"));
}

function isFormMediaType(type: string, subtype: string): boolean {
  return (
    (type === "multipart" && subtype === "form-data") ||
    (type === "application" && subtype === "x-www-form-urlencoded")
  );
}

/**
 * Parse request body using Hono's cached body helpers.
 * JSON for application/json; FormData for multipart / urlencoded; otherwise undefined.
 */
export async function parseRequestBody(req: HonoRequest): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  const contentType = req.header("content-type") ?? "";
  const media = parseMediaType(contentType);
  if (!media) {
    return undefined;
  }

  if (isJsonMediaType(media.type, media.subtype)) {
    return await req.json();
  }

  if (isFormMediaType(media.type, media.subtype)) {
    return req.parseBody({ all: true });
  }

  return undefined;
}

export { parseMediaType, isJsonMediaType, isFormMediaType };
