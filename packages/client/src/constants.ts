export const METHOD_MAP = {
  GET: "$get",
  POST: "$post",
  PUT: "$put",
  PATCH: "$patch",
  DELETE: "$delete",
  OPTIONS: "$options",
  HEAD: "$head",
  QUERY: "$query",
} as const;

export type HttpMethodName = keyof typeof METHOD_MAP;
export type ClientMethodKey = (typeof METHOD_MAP)[HttpMethodName];

export const CLIENT_METHODS = new Set<string>(Object.values(METHOD_MAP));

export const CLIENT_TO_HTTP: Record<ClientMethodKey, string> = {
  $get: "GET",
  $post: "POST",
  $put: "PUT",
  $patch: "PATCH",
  $delete: "DELETE",
  $options: "OPTIONS",
  $head: "HEAD",
  $query: "QUERY",
};
