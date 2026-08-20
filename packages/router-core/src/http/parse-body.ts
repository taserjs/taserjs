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

function formDataToRecord(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }
  return result;
}

/**
 * Parse request body from standard Web Request.
 * JSON for application/json; FormData for multipart / urlencoded; otherwise undefined.
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

export { parseMediaType, isJsonMediaType, isFormMediaType };
