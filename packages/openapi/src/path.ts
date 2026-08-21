export type PathConversionResult = {
  openApiPath: string;
  pathParamNames: string[];
};

/**
 * Converts a Taser URL path (e.g. `/users/:id/posts/:postId/*`)
 * to an OpenAPI v3 path template (e.g. `/users/{id}/posts/{postId}/{wildcard}`).
 */
export function formatOpenApiPath(taserPath: string): PathConversionResult {
  const pathParamNames: string[] = [];

  const openApiPath = taserPath
    .replace(/:([a-zA-Z0-9_]+)/g, (_, paramName: string) => {
      pathParamNames.push(paramName);
      return `{${paramName}}`;
    })
    .replace(/\/\*/g, () => {
      pathParamNames.push("wildcard");
      return "/{wildcard}";
    });

  return { openApiPath, pathParamNames };
}
