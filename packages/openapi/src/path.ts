export type PathConversionResult = {
  openApiPath: string;
  pathParamNames: string[];
};

/**
 * Converts a Taser URL path (e.g. `/users/:id/posts/:postId/*` or `/files/$file` or `/docs/[...slug]`)
 * to an OpenAPI v3.1 path template (e.g. `/users/{id}/posts/{postId}/{wildcard}`).
 * Preserves exact left-to-right parameter ordering.
 */
export function formatOpenApiPath(taserPath: string): PathConversionResult {
  const pathParamNames: string[] = [];

  const segments = taserPath.split("/");
  const converted = segments.map((segment) => {
    if (!segment) return "";
    if (segment === "*" || segment === "**") {
      pathParamNames.push("wildcard");
      return "{wildcard}";
    }
    if (segment.startsWith(":")) {
      const name = segment.slice(1).replace(/\?$/, "");
      if (name) {
        pathParamNames.push(name);
        return `{${name}}`;
      }
      return segment;
    }
    if (segment.startsWith("$")) {
      const name = segment.slice(1);
      if (name) {
        pathParamNames.push(name);
        return `{${name}}`;
      }
      return segment;
    }
    const bracketMatch = /^\[(?:\.\.\.)?([a-zA-Z0-9_]+)\]$/.exec(segment);
    if (bracketMatch && bracketMatch[1]) {
      pathParamNames.push(bracketMatch[1]);
      return `{${bracketMatch[1]}}`;
    }
    return segment;
  });

  return { openApiPath: converted.join("/"), pathParamNames };
}
