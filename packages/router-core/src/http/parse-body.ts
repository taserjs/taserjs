import { unsupportedMediaType } from "@taserjs/router-utils/reply";
import type { BodyMode } from "../types.js";

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

function isMultipartMediaType(type: string, subtype: string): boolean {
  return type === "multipart" && subtype === "form-data";
}

function isUrlencodedMediaType(type: string, subtype: string): boolean {
  return type === "application" && subtype === "x-www-form-urlencoded";
}

function isFormMediaType(type: string, subtype: string): boolean {
  return isMultipartMediaType(type, subtype) || isUrlencodedMediaType(type, subtype);
}

function formDataToRecord(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  });
  return result;
}

/**
 * Parse request body from standard Web Request.
 * If mode is provided ("json" | "form" | "urlencoded"), enforces Content-Type matching and throws 415 on mismatch.
 */
export async function parseRequestBody(
  req:
    | Request
    | {
        method: string;
        headers?: Headers;
        header?: (name: string) => string | undefined;
        json: () => Promise<unknown>;
        formData?: () => Promise<FormData>;
        parseBody?: (opt?: unknown) => Promise<unknown>;
      },
  mode?: BodyMode,
): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  const contentType =
    (req instanceof Request ? req.headers.get("content-type") : undefined) ??
    ("header" in req && typeof req.header === "function"
      ? req.header("content-type")
      : undefined) ??
    ("headers" in req && req.headers instanceof Headers
      ? req.headers.get("content-type")
      : undefined) ??
    "";

  const media = parseMediaType(contentType);

  if (mode === "json") {
    if (!media || !isJsonMediaType(media.type, media.subtype)) {
      throw unsupportedMediaType({
        message: "Unsupported Media Type: expected application/json",
      });
    }
    return await req.json();
  }

  if (mode === "form") {
    if (!media || !isMultipartMediaType(media.type, media.subtype)) {
      throw unsupportedMediaType({
        message: "Unsupported Media Type: expected multipart/form-data",
      });
    }
    if ("parseBody" in req && typeof req.parseBody === "function") {
      return req.parseBody({ all: true });
    }
    if ("formData" in req && typeof req.formData === "function") {
      const formData = await req.formData();
      return formDataToRecord(formData);
    }
    return undefined;
  }

  if (mode === "urlencoded") {
    if (!media || !isUrlencodedMediaType(media.type, media.subtype)) {
      throw unsupportedMediaType({
        message: "Unsupported Media Type: expected application/x-www-form-urlencoded",
      });
    }
    if ("parseBody" in req && typeof req.parseBody === "function") {
      return req.parseBody({ all: true });
    }
    if ("formData" in req && typeof req.formData === "function") {
      const formData = await req.formData();
      return formDataToRecord(formData);
    }
    return undefined;
  }

  if (!media) {
    return undefined;
  }

  if (isJsonMediaType(media.type, media.subtype)) {
    return await req.json();
  }

  if (isFormMediaType(media.type, media.subtype)) {
    if ("parseBody" in req && typeof req.parseBody === "function") {
      return req.parseBody({ all: true });
    }
    if ("formData" in req && typeof req.formData === "function") {
      const formData = await req.formData();
      return formDataToRecord(formData);
    }
  }

  return undefined;
}

export {
  parseMediaType,
  isJsonMediaType,
  isMultipartMediaType,
  isUrlencodedMediaType,
  isFormMediaType,
};
