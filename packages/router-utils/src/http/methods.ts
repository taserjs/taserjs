export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
  "HEAD",
  "QUERY",
] as const;

export const HTTP_VERBS = HTTP_METHODS;

export type HttpMethod = (typeof HTTP_METHODS)[number];
export type HttpVerb = HttpMethod;
export type HttpMethodLower = Lowercase<HttpMethod>;

export const HTTP_METHOD_SET = new Set<string>(HTTP_METHODS);

export function isHttpMethod(method: string): method is HttpMethod {
  return HTTP_METHOD_SET.has(method.toUpperCase());
}

export const CLIENT_METHOD_MAP = {
  GET: "$get",
  POST: "$post",
  PUT: "$put",
  PATCH: "$patch",
  DELETE: "$delete",
  OPTIONS: "$options",
  HEAD: "$head",
  QUERY: "$query",
} as const;

export type ClientMethodKey = (typeof CLIENT_METHOD_MAP)[HttpMethod];
