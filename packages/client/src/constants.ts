export const METHOD_MAP = {
  GET: "$get",
  POST: "$post",
  PUT: "$put",
  PATCH: "$patch",
  DELETE: "$delete",
  OPTIONS: "$options",
  QUERY: "$query",
} as const;

export type HttpMethodName = keyof typeof METHOD_MAP;
export type ClientMethodKey = (typeof METHOD_MAP)[HttpMethodName];

export const CLIENT_METHODS = new Set<string>(Object.values(METHOD_MAP));

export const CLIENT_TO_HTTP: Record<ClientMethodKey, string> = Object.fromEntries(
  Object.entries(METHOD_MAP).map(([http, client]) => [client, http]),
) as Record<ClientMethodKey, string>;
